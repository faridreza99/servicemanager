import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth, getAuthHeader } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { io, Socket } from "socket.io-client";
import { MessageCircle, X, Send, Users, Loader2, Mic, Square, Reply, CornerDownRight, Play, Pause, Paperclip, Image, FileText } from "lucide-react";
import type { TeamMessageWithSender } from "@shared/schema";

interface ReplyInfo {
  id: string;
  name: string;
  content: string;
}

let currentlyPlayingAudio: HTMLAudioElement | null = null;

function VoiceMessagePlayer({ audioUrl, isOwn, messageId }: { audioUrl: string; isOwn: boolean; messageId: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (currentlyPlayingAudio === audioRef.current) {
      currentlyPlayingAudio = null;
    }
  }, []);

  const handlePause = useCallback(() => {
    if (audioRef.current && !audioRef.current.ended) {
      setIsPlaying(false);
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (audio) {
        audio.pause();
        if (currentlyPlayingAudio === audio) {
          currentlyPlayingAudio = null;
        }
      }
    };
  }, []);

  const togglePlayback = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      currentlyPlayingAudio = null;
    } else {
      if (currentlyPlayingAudio && currentlyPlayingAudio !== audioRef.current) {
        currentlyPlayingAudio.pause();
      }
      currentlyPlayingAudio = audioRef.current;
      audioRef.current.play().catch(() => {
        setIsPlaying(false);
        currentlyPlayingAudio = null;
      });
      setIsPlaying(true);
    }
  };

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      className={`flex items-center gap-2 p-2 rounded-md min-w-[140px] ${isOwn ? "bg-primary-foreground/10" : "bg-background/50"}`}
      data-testid={`voice-message-${messageId}`}
    >
      <audio 
        ref={audioRef} 
        src={audioUrl} 
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onPause={handlePause}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={togglePlayback}
        className="h-7 w-7 flex-shrink-0"
        data-testid={`button-play-voice-${messageId}`}
      >
        {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
      </Button>
      <div className="flex-1 min-w-0">
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-foreground/50 transition-all duration-100" 
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}

export function InternalChatFloating() {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [hasUnread, setHasUnread] = useState(false);
  const [replyTo, setReplyTo] = useState<ReplyInfo | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isMountedRef = useRef(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canUseTeamChat = user && (user.role === "staff" || user.role === "admin");

  const { data: messages = [], isLoading: messagesLoading } = useQuery<TeamMessageWithSender[]>({
    queryKey: ["/api/team-chat/messages"],
    enabled: !!canUseTeamChat && isOpen,
    refetchInterval: 30000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { content: string; replyToId?: string; replyToName?: string; replyToContent?: string; attachmentUrl?: string; attachmentType?: string }) => {
      const res = await apiRequest("POST", "/api/team-chat/messages", data);
      return res.json();
    },
    onSuccess: (newMessage: TeamMessageWithSender) => {
      queryClient.setQueryData<TeamMessageWithSender[]>(
        ["/api/team-chat/messages"],
        (old = []) => [...old, newMessage]
      );
      setMessageInput("");
      setReplyTo(null);
    },
  });

  const startRecording = async () => {
    if (isRecording) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        
        if (isMountedRef.current) {
          setAudioBlob(blob);
          setAudioPreviewUrl(url);
        } else {
          URL.revokeObjectURL(url);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to record voice messages.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const clearVoiceMessage = () => {
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
    }
    setAudioBlob(null);
    setAudioPreviewUrl(null);
    setRecordingDuration(0);
    setIsPlayingPreview(false);
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
  };

  const togglePreviewPlayback = () => {
    if (!audioPreviewUrl) return;

    if (isPlayingPreview && previewAudioRef.current) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      if (!previewAudioRef.current) {
        previewAudioRef.current = new Audio(audioPreviewUrl);
        previewAudioRef.current.onended = () => setIsPlayingPreview(false);
      }
      previewAudioRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  const uploadVoiceMessage = async () => {
    if (!audioBlob || isUploading) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'voice-message.webm');

      const response = await fetch('/api/upload/cloudinary', {
        method: 'POST',
        headers: getAuthHeader(),
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload voice message');
      }

      const data = await response.json();
      
      const msgData: { content: string; attachmentUrl: string; attachmentType: string; replyToId?: string; replyToName?: string; replyToContent?: string } = {
        content: 'Voice message',
        attachmentUrl: data.url,
        attachmentType: 'audio/webm',
      };
      
      if (replyTo) {
        msgData.replyToId = replyTo.id;
        msgData.replyToName = replyTo.name;
        msgData.replyToContent = replyTo.content.substring(0, 100);
      }
      
      sendMessageMutation.mutate(msgData);
      clearVoiceMessage();
    } catch (error) {
      console.error('Voice message upload failed:', error);
      toast({
        title: "Upload failed",
        description: "Could not send voice message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setPendingFile(file);
    if (file.type.startsWith('image/')) {
      setFilePreviewUrl(URL.createObjectURL(file));
    }
  };

  const clearPendingFile = () => {
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setPendingFile(null);
    setFilePreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFileAndSend = async () => {
    if (!pendingFile || isUploading) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', pendingFile);

      const response = await fetch('/api/upload/cloudinary', {
        method: 'POST',
        headers: getAuthHeader(),
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload file');
      }

      const data = await response.json();
      
      const msgData: { content: string; attachmentUrl: string; attachmentType: string; replyToId?: string; replyToName?: string; replyToContent?: string } = {
        content: messageInput.trim() || pendingFile.name,
        attachmentUrl: data.url,
        attachmentType: pendingFile.type,
      };
      
      if (replyTo) {
        msgData.replyToId = replyTo.id;
        msgData.replyToName = replyTo.name;
        msgData.replyToContent = replyTo.content.substring(0, 100);
      }
      
      sendMessageMutation.mutate(msgData);
      clearPendingFile();
      setMessageInput("");
      setReplyTo(null);
    } catch (error) {
      console.error('File upload failed:', error);
      toast({
        title: "Upload failed",
        description: "Could not send file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
      }
    };
  }, []);

  useEffect(() => {
    if (!token || !canUseTeamChat) return;

    const socket = io({
      path: "/ws",
      auth: { token },
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to team chat socket");
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
    });

    socket.on("team-chat:new-message", (message: TeamMessageWithSender) => {
      console.log("Received team chat message:", message.id);
      queryClient.setQueryData<TeamMessageWithSender[]>(
        ["/api/team-chat/messages"],
        (old = []) => {
          const exists = old.some(m => m.id === message.id);
          if (exists) return old;
          return [...old, message];
        }
      );
      if (message.senderId !== user?.id) {
        setHasUnread(true);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, canUseTeamChat, user?.id, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!canUseTeamChat) {
    return null;
  }

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    
    const data: { content: string; replyToId?: string; replyToName?: string; replyToContent?: string } = {
      content: messageInput.trim(),
    };
    
    if (replyTo) {
      data.replyToId = replyTo.id;
      data.replyToName = replyTo.name;
      data.replyToContent = replyTo.content.substring(0, 100);
    }
    
    sendMessageMutation.mutate(data);
  };

  const handleReply = (msg: TeamMessageWithSender) => {
    setReplyTo({
      id: msg.id,
      name: msg.sender?.name || "Unknown",
      content: msg.content,
    });
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen && (
        <div className="mb-4 w-80 h-96 bg-background border rounded-lg shadow-lg flex flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-2 p-3 border-b bg-muted/50">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="font-medium text-sm">Team Chat</span>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsOpen(false)}
              data-testid="button-close-team-chat"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <ScrollArea className="flex-1 p-3">
            <div className="space-y-3">
              {messagesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No messages yet. Start the conversation!
                </p>
              ) : (
                messages.map((msg: TeamMessageWithSender) => (
                  <div
                    key={msg.id}
                    className={`group flex gap-2 ${
                      msg.senderId === user?.id ? "flex-row-reverse" : "flex-row"
                    }`}
                    data-testid={`message-team-${msg.id}`}
                  >
                    <Avatar className="h-7 w-7 shrink-0">
                      {msg.sender?.profilePhoto && (
                        <AvatarImage src={msg.sender.profilePhoto} alt={msg.sender.name || "User"} />
                      )}
                      <AvatarFallback className="text-xs">
                        {msg.sender?.name?.charAt(0).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`flex flex-col max-w-[75%] ${
                        msg.senderId === user?.id ? "items-end" : "items-start"
                      }`}
                    >
                      <span className="text-xs text-muted-foreground mb-1">
                        {msg.sender?.name || "Unknown"}
                      </span>
                      {msg.replyToId && msg.replyToName && (
                        <div className="flex items-start gap-1 text-xs text-muted-foreground mb-1 bg-muted/50 rounded px-2 py-1">
                          <CornerDownRight className="h-3 w-3 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <span className="font-medium">{msg.replyToName}</span>
                            <p className="truncate">{msg.replyToContent}</p>
                          </div>
                        </div>
                      )}
                      <div
                        className={`rounded-lg px-3 py-2 ${
                          msg.senderId === user?.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        {msg.attachmentType?.startsWith('audio/') && msg.attachmentUrl ? (
                          <VoiceMessagePlayer 
                            audioUrl={msg.attachmentUrl} 
                            isOwn={msg.senderId === user?.id}
                            messageId={msg.id}
                          />
                        ) : msg.attachmentType?.startsWith('image/') && msg.attachmentUrl ? (
                          <div className="space-y-1">
                            <img 
                              src={msg.attachmentUrl} 
                              alt="Attachment" 
                              className="max-w-full max-h-48 rounded-md cursor-pointer"
                              onClick={() => window.open(msg.attachmentUrl!, '_blank')}
                              data-testid={`image-attachment-${msg.id}`}
                            />
                            {msg.content && msg.content !== msg.attachmentUrl && (
                              <p className="text-sm break-words">{msg.content}</p>
                            )}
                          </div>
                        ) : msg.attachmentUrl ? (
                          <div className="space-y-1">
                            <a 
                              href={msg.attachmentUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm underline"
                              data-testid={`file-attachment-${msg.id}`}
                            >
                              <FileText className="h-4 w-4 shrink-0" />
                              <span className="truncate">{msg.content}</span>
                            </a>
                          </div>
                        ) : (
                          <p className="text-sm break-words">{msg.content}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(msg.createdAt), "HH:mm")}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleReply(msg)}
                          data-testid={`button-reply-${msg.id}`}
                        >
                          <Reply className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          
          {replyTo && (
            <div className="px-2 py-1 border-t bg-muted/30 flex items-center gap-2">
              <CornerDownRight className="h-3 w-3 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0 text-xs">
                <span className="font-medium">Replying to {replyTo.name}</span>
                <p className="text-muted-foreground truncate">{replyTo.content}</p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-5 w-5 shrink-0"
                onClick={() => setReplyTo(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {isRecording && (
            <div className="px-2 py-1 border-t bg-destructive/10 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
              <span className="text-xs text-destructive flex-1">Recording... {formatDuration(recordingDuration)}</span>
              <Button
                size="icon"
                variant="destructive"
                className="h-6 w-6"
                onClick={stopRecording}
                data-testid="button-stop-recording"
              >
                <Square className="h-3 w-3" />
              </Button>
            </div>
          )}

          {audioPreviewUrl && !isRecording && (
            <div className="px-2 py-1 border-t bg-accent/30 flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={togglePreviewPlayback}
                data-testid="button-preview-voice"
              >
                {isPlayingPreview ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              </Button>
              <Mic className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs flex-1">Voice ({formatDuration(recordingDuration)})</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={clearVoiceMessage}
                className="h-6 w-6"
                data-testid="button-clear-voice"
              >
                <X className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                size="icon"
                className="h-6 w-6"
                onClick={uploadVoiceMessage}
                disabled={isUploading}
                data-testid="button-send-voice"
              >
                {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              </Button>
            </div>
          )}

          {pendingFile && !isRecording && !audioPreviewUrl && (
            <div className="px-2 py-1 border-t bg-accent/30 flex items-center gap-2">
              {filePreviewUrl ? (
                <img src={filePreviewUrl} alt="Preview" className="h-10 w-10 object-cover rounded" />
              ) : (
                <div className="h-10 w-10 bg-muted rounded flex items-center justify-center">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{pendingFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(pendingFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={clearPendingFile}
                className="h-6 w-6 shrink-0"
                data-testid="button-clear-file"
              >
                <X className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={uploadFileAndSend}
                disabled={isUploading}
                data-testid="button-send-file"
              >
                {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              </Button>
            </div>
          )}
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx"
            data-testid="input-file-upload"
          />
          
          <div className="p-2 border-t flex gap-2">
            <Button
              size="icon"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isRecording || !!audioPreviewUrl || !!pendingFile}
              data-testid="button-attach-file"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant={isRecording ? "destructive" : "outline"}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isUploading || !!audioPreviewUrl || !!pendingFile}
              data-testid="button-record-voice"
            >
              {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Input
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Type a message..."
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
              className="flex-1"
              disabled={isRecording || !!audioPreviewUrl || !!pendingFile}
              data-testid="input-team-message"
            />
            <Button
              size="icon"
              onClick={handleSendMessage}
              disabled={!messageInput.trim() || sendMessageMutation.isPending || isRecording || !!audioPreviewUrl || !!pendingFile}
              data-testid="button-send-team-message"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}
      
      <Button
        size="icon"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setHasUnread(false);
        }}
        className="h-12 w-12 rounded-full shadow-lg relative"
        data-testid="button-team-chat-toggle"
      >
        {isOpen ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
        {hasUnread && !isOpen && (
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-blue-500 rounded-full border-2 border-background animate-pulse" />
        )}
      </Button>
    </div>
  );
}
