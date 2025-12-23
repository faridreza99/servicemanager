import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { io, Socket } from "socket.io-client";
import { MessageCircle, X, ArrowLeft, Send, Plus, Users, Loader2 } from "lucide-react";
import type { InternalChatWithDetails, InternalMessageWithSender, User } from "@shared/schema";

export function InternalChatFloating() {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showUserList, setShowUserList] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const canUseInternalChat = user && (user.role === "staff" || user.role === "admin");

  const { data: chats = [], isLoading: chatsLoading } = useQuery<InternalChatWithDetails[]>({
    queryKey: ["/api/internal-chats"],
    enabled: !!canUseInternalChat && isOpen,
    refetchInterval: 30000,
  });

  const { data: availableUsers = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/internal-chats/users"],
    enabled: !!canUseInternalChat && isOpen && showUserList,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<InternalMessageWithSender[]>({
    queryKey: ["/api/internal-chats", selectedChatId, "messages"],
    enabled: !!canUseInternalChat && !!selectedChatId,
  });

  const createChatMutation = useMutation({
    mutationFn: async (participantId: string) => {
      const res = await apiRequest("POST", "/api/internal-chats", { participantId });
      return res.json();
    },
    onSuccess: (chat: InternalChatWithDetails) => {
      queryClient.invalidateQueries({ queryKey: ["/api/internal-chats"] });
      setSelectedChatId(chat.id);
      setShowUserList(false);
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ chatId, content }: { chatId: string; content: string }) => {
      const res = await apiRequest("POST", `/api/internal-chats/${chatId}/messages`, { content });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/internal-chats", selectedChatId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/internal-chats"] });
      setMessageInput("");
    },
  });

  useEffect(() => {
    if (!token || !canUseInternalChat) return;

    const socket = io({
      auth: { token },
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join", `user-${user?.id}`);
    });

    socket.on("internal-message", (message: InternalMessageWithSender) => {
      queryClient.invalidateQueries({ queryKey: ["/api/internal-chats"] });
      if (selectedChatId === message.chatId) {
        queryClient.invalidateQueries({ queryKey: ["/api/internal-chats", selectedChatId, "messages"] });
      }
    });

    socket.on("internal-chat-created", () => {
      queryClient.invalidateQueries({ queryKey: ["/api/internal-chats"] });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, canUseInternalChat, user?.id, selectedChatId, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!canUseInternalChat) {
    return null;
  }

  const totalUnreadCount = chats.reduce((sum: number, chat: InternalChatWithDetails) => sum + (chat.unreadCount || 0), 0);

  const getOtherParticipant = (chat: InternalChatWithDetails) => {
    return chat.participants.find(p => p.userId !== user?.id)?.user;
  };

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedChatId) return;
    sendMessageMutation.mutate({ chatId: selectedChatId, content: messageInput });
  };

  const selectedChat = chats.find((c: InternalChatWithDetails) => c.id === selectedChatId);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen && (
        <div className="mb-4 w-80 h-96 bg-background border rounded-lg shadow-lg flex flex-col overflow-hidden">
          {showUserList ? (
            <>
              <div className="flex items-center gap-2 p-3 border-b bg-muted/50">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setShowUserList(false)}
                  data-testid="button-back-from-users"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <span className="font-medium text-sm">Start New Chat</span>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {usersLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : availableUsers.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-3 text-center">
                      No other staff or admin users available
                    </p>
                  ) : (
                    availableUsers.map((u: User) => (
                      <Button
                        key={u.id}
                        variant="ghost"
                        onClick={() => createChatMutation.mutate(u.id)}
                        className="w-full justify-start gap-3 h-auto py-2"
                        disabled={createChatMutation.isPending}
                        data-testid={`button-start-chat-${u.id}`}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {u.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium">{u.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{u.role}</p>
                        </div>
                      </Button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </>
          ) : selectedChatId ? (
            <>
              <div className="flex items-center gap-2 p-3 border-b bg-muted/50">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setSelectedChatId(null)}
                  data-testid="button-back-to-chats"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                {selectedChat && (
                  <div className="flex items-center gap-2 flex-1">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-xs">
                        {getOtherParticipant(selectedChat)?.name.charAt(0).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm truncate">
                      {getOtherParticipant(selectedChat)?.name || "Chat"}
                    </span>
                  </div>
                )}
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
                    messages.map((msg: InternalMessageWithSender) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          msg.senderId === user?.id ? "items-end" : "items-start"
                        }`}
                        data-testid={`message-internal-${msg.id}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg px-3 py-2 ${
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
                  data-testid="input-internal-message"
                />
                <Button
                  size="icon"
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || sendMessageMutation.isPending}
                  data-testid="button-send-internal-message"
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between p-3 border-b bg-muted/50">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span className="font-medium text-sm">Team Chat</span>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setShowUserList(true)}
                  data-testid="button-new-internal-chat"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {chatsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : chats.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No conversations yet</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowUserList(true)}
                        className="text-primary mt-2"
                        data-testid="button-start-first-chat"
                      >
                        Start a new chat
                      </Button>
                    </div>
                  ) : (
                    chats.map((chat: InternalChatWithDetails) => {
                      const otherUser = getOtherParticipant(chat);
                      return (
                        <Button
                          key={chat.id}
                          variant="ghost"
                          onClick={() => setSelectedChatId(chat.id)}
                          className="w-full justify-start gap-3 h-auto py-2"
                          data-testid={`button-open-chat-${chat.id}`}
                        >
                          <Avatar className="h-9 w-9">
                            <AvatarFallback>
                              {otherUser?.name.charAt(0).toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 text-left min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <p className="text-sm font-medium truncate">
                                {otherUser?.name || "Unknown"}
                              </p>
                              {chat.unreadCount && chat.unreadCount > 0 && (
                                <Badge variant="default" className="text-xs">
                                  {chat.unreadCount}
                                </Badge>
                              )}
                            </div>
                            {chat.lastMessage && (
                              <p className="text-xs text-muted-foreground truncate">
                                {chat.lastMessage.content}
                              </p>
                            )}
                          </div>
                        </Button>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </div>
      )}
      
      <Button
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="h-12 w-12 rounded-full shadow-lg relative"
        data-testid="button-internal-chat-toggle"
      >
        {isOpen ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
        {!isOpen && totalUnreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 min-w-[20px] flex items-center justify-center text-xs p-0"
          >
            {totalUnreadCount > 9 ? "9+" : totalUnreadCount}
          </Badge>
        )}
      </Button>
    </div>
  );
}
