import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Lock, DollarSign, CheckCircle, Paperclip, FileText, Image, Loader2, X, Mic, Square, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { MessageWithSender, UserRole } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { useAuth, getAuthHeader } from "@/lib/auth";

let currentlyPlayingAudio: HTMLAudioElement | null = null;

interface ChatInterfaceProps {
  messages: MessageWithSender[];
  onSendMessage: (content: string, isPrivate: boolean, isQuotation?: boolean, quotationAmount?: number, attachmentUrl?: string, attachmentType?: string) => void;
  onClose?: () => void;
  isOpen: boolean;
  isSending?: boolean;
  canSendPrivate?: boolean;
  canSendQuotation?: boolean;
  canClose?: boolean;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getRoleBadgeVariant(role: UserRole) {
  switch (role) {
    case "admin":
      return "default";
    case "staff":
      return "secondary";
    default:
      return "outline";
  }
}

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
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      className={`flex items-center gap-2 p-2 rounded-md min-w-[180px] ${isOwn ? "bg-primary-foreground/10" : "bg-background/50"}`}
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
        className="h-8 w-8 flex-shrink-0"
        data-testid={`button-play-voice-${messageId}`}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <div className="flex-1 min-w-0">
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}

export function ChatInterface({
  messages,
  onSendMessage,
  onClose,
  isOpen,
  isSending = false,
  canSendPrivate = false,
  canSendQuotation = false,
  canClose = false,
}: ChatInterfaceProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isQuotation, setIsQuotation] = useState(false);
  const [quotationAmount, setQuotationAmount] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentType, setAttachmentType] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const isMountedRef = useRef(true);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload/cloudinary", {
        method: "POST",
        headers: getAuthHeader(),
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to upload file");
      }

      const data = await response.json();
      setAttachmentUrl(data.url);
      setAttachmentType(file.type || "application/octet-stream");
      setAttachmentName(file.name);
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const clearAttachment = () => {
    setAttachmentUrl(null);
    setAttachmentType(null);
    setAttachmentName(null);
  };

  const streamRef = useRef<MediaStream | null>(null);

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
      onSendMessage('Voice message', isPrivate, false, undefined, data.url, 'audio/webm');
      clearVoiceMessage();
      setIsPrivate(false);
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

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!message.trim() && !isQuotation && !attachmentUrl) return;
    if (isQuotation && !quotationAmount) return;

    onSendMessage(
      message || (attachmentUrl ? "Shared a file" : ""), 
      isPrivate, 
      isQuotation, 
      isQuotation ? parseInt(quotationAmount) : undefined,
      attachmentUrl || undefined,
      attachmentType || undefined
    );
    setMessage("");
    setIsPrivate(false);
    setIsQuotation(false);
    setQuotationAmount("");
    clearAttachment();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-4 p-4 border-b">
        <div>
          <h3 className="font-semibold">Chat</h3>
          <p className="text-sm text-muted-foreground">{messages.length} messages</p>
        </div>
        {isOpen && canClose && onClose && (
          <Button 
            variant="default" 
            size="sm"
            onClick={onClose}
            data-testid="button-approve-work"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Approve Work
          </Button>
        )}
        {!isOpen && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Work Approved
          </Badge>
        )}
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>No messages yet</p>
              <p className="text-sm">Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isOwn = msg.senderId === user?.id;
              const showPrivate = msg.isPrivate && (user?.role === "admin" || msg.senderId === user?.id);

              if (msg.isPrivate && user?.role !== "admin" && msg.senderId !== user?.id) {
                return null;
              }

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}
                  data-testid={`message-${msg.id}`}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    {msg.sender.profilePhoto && (
                      <AvatarImage src={msg.sender.profilePhoto} alt={msg.sender.name} />
                    )}
                    <AvatarFallback 
                      className={`text-xs ${isOwn ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
                    >
                      {getInitials(msg.sender.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`flex flex-col max-w-[75%] ${isOwn ? "items-end" : "items-start"}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{msg.sender.name}</span>
                      <Badge variant={getRoleBadgeVariant(msg.sender.role as UserRole)} className="text-xs">
                        {msg.sender.role}
                      </Badge>
                      {msg.isPrivate && (
                        <Badge variant="outline" className="text-xs">
                          <Lock className="h-3 w-3 mr-1" />
                          Private
                        </Badge>
                      )}
                    </div>

                    {msg.isQuotation ? (
                      <Card className={`${isOwn ? "bg-primary/10" : "bg-accent"}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="h-4 w-4 text-primary" />
                            <span className="font-semibold text-lg">
                              ${msg.quotationAmount?.toLocaleString()}
                            </span>
                          </div>
                          {msg.content && (
                            <p className="text-sm">{msg.content}</p>
                          )}
                        </CardContent>
                      </Card>
                    ) : (
                      <div
                        className={`rounded-2xl px-4 py-2 ${
                          isOwn
                            ? "bg-primary text-primary-foreground"
                            : msg.isPrivate
                            ? "bg-accent/50 border border-dashed"
                            : "bg-accent"
                        }`}
                      >
                        {msg.attachmentUrl && (
                          <div className="mb-2">
                            {msg.attachmentType?.startsWith("image/") ? (
                              <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer">
                                <img 
                                  src={msg.attachmentUrl} 
                                  alt="Attachment" 
                                  className="max-w-full max-h-48 rounded-md cursor-pointer"
                                  data-testid={`attachment-image-${msg.id}`}
                                />
                              </a>
                            ) : msg.attachmentType?.startsWith("audio/") ? (
                              <VoiceMessagePlayer 
                                audioUrl={msg.attachmentUrl} 
                                isOwn={isOwn}
                                messageId={msg.id}
                              />
                            ) : (
                              <a 
                                href={msg.attachmentUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2 p-2 rounded-md ${isOwn ? "bg-primary-foreground/10" : "bg-background/50"}`}
                                data-testid={`attachment-file-${msg.id}`}
                              >
                                <FileText className="h-4 w-4" />
                                <span className="text-sm underline">View Attachment</span>
                              </a>
                            )}
                          </div>
                        )}
                        {msg.content && (!msg.attachmentUrl || (msg.content !== "Shared a file" && msg.content !== "Voice message")) && (
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>
                    )}

                    <span className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {isOpen ? (
      <div className="p-4 border-t space-y-3">
        {(canSendPrivate || canSendQuotation) && (
          <div className="flex flex-wrap gap-4">
            {canSendPrivate && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="private"
                  checked={isPrivate}
                  onCheckedChange={(checked) => setIsPrivate(!!checked)}
                  data-testid="checkbox-private"
                />
                <Label htmlFor="private" className="text-sm flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Private (Admin only)
                </Label>
              </div>
            )}
            {canSendQuotation && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="quotation"
                  checked={isQuotation}
                  onCheckedChange={(checked) => setIsQuotation(!!checked)}
                  data-testid="checkbox-quotation"
                />
                <Label htmlFor="quotation" className="text-sm flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  Quotation
                </Label>
              </div>
            )}
          </div>
        )}

        {isQuotation && (
          <Input
            type="number"
            placeholder="Enter amount"
            value={quotationAmount}
            onChange={(e) => setQuotationAmount(e.target.value)}
            className="max-w-xs"
            data-testid="input-quotation-amount"
          />
        )}

        {attachmentUrl && (
          <div className="flex items-center gap-2 px-3 py-2 bg-accent rounded-md">
            {attachmentType?.startsWith("image/") ? (
              <Image className="h-4 w-4 text-muted-foreground" />
            ) : (
              <FileText className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm flex-1 truncate">{attachmentName}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={clearAttachment}
              className="h-6 w-6"
              data-testid="button-clear-attachment"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {isRecording && (
          <div className="flex items-center gap-3 px-3 py-2 bg-destructive/10 rounded-md">
            <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
            <span className="text-sm font-medium text-destructive">Recording {formatDuration(recordingDuration)}</span>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={stopRecording}
              data-testid="button-stop-recording"
            >
              <Square className="h-3 w-3 mr-1" />
              Stop
            </Button>
          </div>
        )}

        {audioPreviewUrl && !isRecording && (
          <div className="flex items-center gap-2 px-3 py-2 bg-accent rounded-md">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={togglePreviewPlayback}
              className="h-8 w-8"
              data-testid="button-preview-play"
            >
              {isPlayingPreview ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Mic className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm flex-1">Voice message ({formatDuration(recordingDuration)})</span>
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
              size="sm"
              onClick={uploadVoiceMessage}
              disabled={isUploading}
              data-testid="button-send-voice"
            >
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        )}

        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept="image/*,.pdf,.doc,.docx,.txt"
            data-testid="input-file"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending || isUploading || isRecording || !!audioPreviewUrl}
            data-testid="button-attach-file"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Paperclip className="h-4 w-4" />
            )}
          </Button>
          <Button
            type="button"
            variant={isRecording ? "destructive" : "outline"}
            size="icon"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isSending || isUploading || !!attachmentUrl || !!audioPreviewUrl}
            data-testid="button-record-voice"
          >
            {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Input
            placeholder={isQuotation ? "Add a description (optional)" : "Type a message..."}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending || isUploading}
            className="flex-1"
            data-testid="input-message"
          />
          <Button 
            onClick={handleSend} 
            disabled={isSending || isUploading || (!message.trim() && !attachmentUrl && (!isQuotation || !quotationAmount))}
            data-testid="button-send-message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
      ) : (
      <div className="p-4 border-t text-center text-muted-foreground">
        <div className="flex items-center justify-center gap-2">
          <Lock className="h-4 w-4" />
          <span className="text-sm">This chat has been approved and is now read-only</span>
        </div>
      </div>
      )}
    </div>
  );
}
