import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Download } from "lucide-react";
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

export default function AdminChatPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [socket, setSocket] = useState<Socket | null>(null);

  const { data: chat, isLoading: chatLoading } = useQuery<Chat>({
    queryKey: ["/api/chats", id],
    queryFn: async () => {
      const res = await fetch(`/api/chats/${id}`, { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to fetch chat");
      return res.json();
    },
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<MessageWithSender[]>({
    queryKey: ["/api/chats", id, "messages"],
    queryFn: async () => {
      const res = await fetch(`/api/chats/${id}/messages`, { headers: getAuthHeader() });
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
    });

    setSocket(socketInstance);
    return () => {
      socketInstance.emit("leave_chat", id);
      socketInstance.disconnect();
    };
  }, [id]);

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, isPrivate, isQuotation, quotationAmount, attachmentUrl, attachmentType }: { content: string; isPrivate: boolean; isQuotation?: boolean; quotationAmount?: number; attachmentUrl?: string; attachmentType?: string }) => apiRequest("POST", `/api/chats/${id}/messages`, { content, isPrivate, isQuotation: isQuotation || false, quotationAmount, attachmentUrl, attachmentType }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/chats", id, "messages"] }),
    onError: (error: Error) => toast({ title: "Failed to send message", description: error.message, variant: "destructive" }),
  });

  const closeChatMutation = useMutation({
    mutationFn: async () => apiRequest("POST", `/api/chats/${id}/close`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats", id] });
      toast({ title: "Chat closed", description: "The customer has been notified." });
    },
    onError: (error: Error) => toast({ title: "Failed to close chat", description: error.message, variant: "destructive" }),
  });

  const handleSendMessage = useCallback((content: string, isPrivate: boolean, isQuotation?: boolean, quotationAmount?: number, attachmentUrl?: string, attachmentType?: string) => {
    sendMessageMutation.mutate({ content, isPrivate, isQuotation, quotationAmount, attachmentUrl, attachmentType });
  }, [sendMessageMutation]);

  const handleDownloadTranscript = useCallback(async () => {
    try {
      const response = await fetch(`/api/chats/${id}/transcript`, { headers: getAuthHeader() });
      if (!response.ok) throw new Error("Failed to download transcript");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      a.download = filenameMatch ? filenameMatch[1] : `chat-transcript-${id}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast({ title: "Transcript downloaded", description: "Chat transcript has been saved." });
    } catch (error) {
      toast({ title: "Download failed", description: "Could not download chat transcript.", variant: "destructive" });
    }
  }, [id, toast]);

  const isLoading = chatLoading || messagesLoading;

  return (
    <DashboardLayout title="Chat">
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="flex items-center justify-between gap-4 p-4 border-b">
          <Button variant="ghost" onClick={() => setLocation("/admin/bookings")} data-testid="button-back"><ArrowLeft className="mr-2 h-4 w-4" />Back to Bookings</Button>
          {chat && (
            <Button variant="outline" onClick={handleDownloadTranscript} data-testid="button-download-transcript"><Download className="mr-2 h-4 w-4" />Download Transcript</Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex-1 p-6"><div className="space-y-4">{[1, 2, 3].map((i) => (<div key={i} className="flex gap-3"><Skeleton className="h-8 w-8 rounded-full" /><div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-16 w-64 rounded-2xl" /></div></div>))}</div></div>
        ) : !chat ? (
          <div className="flex-1 flex items-center justify-center"><Card><CardContent className="p-8 text-center"><p className="text-lg font-medium">Chat not found</p></CardContent></Card></div>
        ) : (
          <ChatInterface messages={messages} onSendMessage={handleSendMessage} onClose={() => closeChatMutation.mutate()} isOpen={chat.isOpen} isSending={sendMessageMutation.isPending} canSendPrivate canSendQuotation canClose />
        )}
      </div>
    </DashboardLayout>
  );
}
