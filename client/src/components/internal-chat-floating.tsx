import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { io, Socket } from "socket.io-client";
import { MessageCircle, X, Send, Users, Loader2, Mic, MicOff, Reply, CornerDownRight } from "lucide-react";
import type { TeamMessageWithSender } from "@shared/schema";

interface ReplyInfo {
  id: string;
  name: string;
  content: string;
}

export function InternalChatFloating() {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [hasUnread, setHasUnread] = useState(false);
  const [replyTo, setReplyTo] = useState<ReplyInfo | null>(null);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const canUseTeamChat = user && (user.role === "staff" || user.role === "admin");

  const { data: messages = [], isLoading: messagesLoading } = useQuery<TeamMessageWithSender[]>({
    queryKey: ["/api/team-chat/messages"],
    enabled: !!canUseTeamChat && isOpen,
    refetchInterval: 30000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { content: string; replyToId?: string; replyToName?: string; replyToContent?: string }) => {
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

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setMessageInput((prev) => prev + (prev ? " " : "") + transcript);
          setIsListening(false);
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

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
                        <p className="text-sm break-words">{msg.content}</p>
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
          
          <div className="p-2 border-t flex gap-2">
            <Input
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Type a message..."
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
              className="flex-1"
              data-testid="input-team-message"
            />
            {recognitionRef.current && (
              <Button
                size="icon"
                variant={isListening ? "destructive" : "outline"}
                onClick={toggleVoiceInput}
                data-testid="button-voice-input"
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            )}
            <Button
              size="icon"
              onClick={handleSendMessage}
              disabled={!messageInput.trim() || sendMessageMutation.isPending}
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

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}
