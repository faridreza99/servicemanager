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
import { MessageCircle, X, Send, Users, Loader2 } from "lucide-react";
import type { TeamMessageWithSender } from "@shared/schema";

export function InternalChatFloating() {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [hasUnread, setHasUnread] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const canUseTeamChat = user && (user.role === "staff" || user.role === "admin");

  const { data: messages = [], isLoading: messagesLoading } = useQuery<TeamMessageWithSender[]>({
    queryKey: ["/api/team-chat/messages"],
    enabled: !!canUseTeamChat && isOpen,
    refetchInterval: 30000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", "/api/team-chat/messages", { content });
      return res.json();
    },
    onSuccess: (newMessage: TeamMessageWithSender) => {
      queryClient.setQueryData<TeamMessageWithSender[]>(
        ["/api/team-chat/messages"],
        (old = []) => [...old, newMessage]
      );
      setMessageInput("");
    },
  });

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
    sendMessageMutation.mutate(messageInput);
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
                    className={`flex gap-2 ${
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
                      <div
                        className={`rounded-lg px-3 py-2 ${
                          msg.senderId === user?.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm break-words">{msg.content}</p>
                      </div>
                      <span className="text-xs text-muted-foreground mt-1">
                        {format(new Date(msg.createdAt), "HH:mm")}
                      </span>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          
          <div className="p-2 border-t flex gap-2">
            <Input
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Type a message..."
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
              className="flex-1"
              data-testid="input-team-message"
            />
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
