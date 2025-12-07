import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { io, Socket } from "socket.io-client";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ChatInterface } from "@/components/chat-interface";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeader, useAuth } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Chat, MessageWithSender } from "@shared/schema";

export default function CustomerChatPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [socket, setSocket] = useState<Socket | null>(null);

  const { data: chat, isLoading: chatLoading } = useQuery<Chat>({
    queryKey: ["/api/chats", id],
    queryFn: async () => {
      const res = await fetch(`/api/chats/${id}`, {
        headers: getAuthHeader(),
      });
      if (!res.ok) throw new Error("Failed to fetch chat");
      return res.json();
    },
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<MessageWithSender[]>({
    queryKey: ["/api/chats", id, "messages"],
    queryFn: async () => {
      const res = await fetch(`/api/chats/${id}/messages`, {
        headers: getAuthHeader(),
      });
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    refetchInterval: socket ? false : 5000,
  });

  useEffect(() => {
    if (!id) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    const socketInstance = io({
      path: "/ws",
      auth: { token },
    });

    socketInstance.on("connect", () => {
      socketInstance.emit("join_chat", id);
    });

    socketInstance.on("new_message", () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats", id, "messages"] });
    });

    socketInstance.on("chat_closed", () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats", id] });
      toast({
        title: "Chat closed",
        description: "This chat has been closed by an admin.",
      });
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.emit("leave_chat", id);
      socketInstance.disconnect();
    };
  }, [id, toast]);

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, isPrivate, attachmentUrl, attachmentType }: { content: string; isPrivate: boolean; attachmentUrl?: string; attachmentType?: string }) => {
      return apiRequest("POST", `/api/chats/${id}/messages`, {
        content,
        isPrivate,
        isQuotation: false,
        attachmentUrl,
        attachmentType,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats", id, "messages"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = useCallback((content: string, isPrivate: boolean, _isQuotation?: boolean, _quotationAmount?: number, attachmentUrl?: string, attachmentType?: string) => {
    sendMessageMutation.mutate({ content, isPrivate, attachmentUrl, attachmentType });
  }, [sendMessageMutation]);

  const isLoading = chatLoading || messagesLoading;

  return (
    <DashboardLayout title="Chat">
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="p-4 border-b">
          <Button
            variant="ghost"
            onClick={() => setLocation("/dashboard/bookings")}
            data-testid="button-back"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Bookings
          </Button>
        </div>

        {isLoading ? (
          <div className="flex-1 p-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-16 w-64 rounded-2xl" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : !chat ? (
          <div className="flex-1 flex items-center justify-center">
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-lg font-medium">Chat not found</p>
                <p className="text-sm text-muted-foreground">This chat may no longer exist</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            isOpen={chat.isOpen}
            isSending={sendMessageMutation.isPending}
            canSendPrivate={false}
            canSendQuotation={false}
            canClose={false}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
