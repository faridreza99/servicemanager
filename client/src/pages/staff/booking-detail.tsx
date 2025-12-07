import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Calendar, CheckCircle, PlayCircle } from "lucide-react";
import { io, Socket } from "socket.io-client";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ChatInterface } from "@/components/chat-interface";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeader, useAuth } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { BookingWithDetails, MessageWithSender, BookingStatus, TaskWithDetails } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function getStatusBadgeVariant(status: BookingStatus) {
  switch (status) {
    case "pending": return "secondary";
    case "confirmed": return "default";
    case "in_progress": return "default";
    case "completed": return "outline";
    case "cancelled": return "destructive";
    default: return "secondary";
  }
}

function getStatusLabel(status: string) {
  return status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getTaskStatusBadgeVariant(status: string) {
  switch (status) {
    case "pending": return "secondary";
    case "in_progress": return "default";
    case "completed": return "outline";
    default: return "secondary";
  }
}

export default function StaffBookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [socket, setSocket] = useState<Socket | null>(null);

  const { data: booking, isLoading: bookingLoading } = useQuery<BookingWithDetails>({
    queryKey: ["/api/bookings", id],
    queryFn: async () => {
      const res = await fetch(`/api/bookings/${id}`, { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to fetch booking");
      return res.json();
    },
  });

  const { data: tasks = [] } = useQuery<TaskWithDetails[]>({
    queryKey: ["/api/tasks"],
    queryFn: async () => {
      const res = await fetch("/api/tasks", { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
  });

  const task = tasks.find((t) => t.bookingId === id);

  const chatId = booking?.chat?.id;

  const { data: messages = [], isLoading: messagesLoading } = useQuery<MessageWithSender[]>({
    queryKey: ["/api/chats", chatId, "messages"],
    queryFn: async () => {
      const res = await fetch(`/api/chats/${chatId}/messages`, { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: !!chatId,
    refetchInterval: socket ? false : 5000,
  });

  useEffect(() => {
    if (!chatId) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    const socketInstance = io({
      path: "/ws",
      auth: { token },
    });

    socketInstance.on("connect", () => {
      socketInstance.emit("join_chat", chatId);
    });

    socketInstance.on("new_message", () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats", chatId, "messages"] });
    });

    socketInstance.on("chat_closed", () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings", id] });
    });

    setSocket(socketInstance);
    return () => {
      socketInstance.emit("leave_chat", chatId);
      socketInstance.disconnect();
    };
  }, [chatId, id]);

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, isPrivate, attachmentUrl, attachmentType }: { content: string; isPrivate: boolean; attachmentUrl?: string; attachmentType?: string }) => 
      apiRequest("POST", `/api/chats/${chatId}/messages`, { content, isPrivate, isQuotation: false, attachmentUrl, attachmentType }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/chats", chatId, "messages"] }),
    onError: (error: Error) => toast({ title: "Failed to send message", description: error.message, variant: "destructive" }),
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => 
      apiRequest("PATCH", `/api/tasks/${taskId}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task updated" });
    },
    onError: (error: Error) => toast({ title: "Failed to update task", description: error.message, variant: "destructive" }),
  });

  const handleSendMessage = useCallback((content: string, isPrivate: boolean, isQuotation?: boolean, quotationAmount?: number, attachmentUrl?: string, attachmentType?: string) => {
    sendMessageMutation.mutate({ content, isPrivate, attachmentUrl, attachmentType });
  }, [sendMessageMutation]);

  const isLoading = bookingLoading || messagesLoading;

  return (
    <DashboardLayout title="Booking Details">
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="flex items-center gap-4 p-4 border-b">
          <Button variant="ghost" onClick={() => setLocation("/staff/tasks")} data-testid="button-back">
            <ArrowLeft className="mr-2 h-4 w-4" />Back to Tasks
          </Button>
        </div>

        {isLoading ? (
          <div className="flex-1 p-6">
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        ) : !booking ? (
          <div className="flex-1 flex items-center justify-center">
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-lg font-medium">Booking not found</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            <div className="lg:w-80 border-b lg:border-b-0 lg:border-r p-4 overflow-y-auto">
              <Card className="mb-4">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <CardTitle className="text-lg">{booking.service.name}</CardTitle>
                    <Badge variant={getStatusBadgeVariant(booking.status as BookingStatus)}>
                      {getStatusLabel(booking.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      {booking.customer.profilePhoto && (
                        <AvatarImage src={booking.customer.profilePhoto} alt={booking.customer.name} />
                      )}
                      <AvatarFallback>{getInitials(booking.customer.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{booking.customer.name}</p>
                      <p className="text-xs text-muted-foreground">{booking.customer.email}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Booked {formatDistanceToNow(new Date(booking.createdAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {task && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <CardTitle className="text-base">My Task</CardTitle>
                      <Badge variant={getTaskStatusBadgeVariant(task.status)} className="text-xs">
                        {getStatusLabel(task.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                    
                    <div className="flex gap-2 flex-wrap">
                      {task.status === "pending" && (
                        <Button 
                          size="sm" 
                          onClick={() => updateTaskMutation.mutate({ taskId: task.id, status: "in_progress" })}
                          disabled={updateTaskMutation.isPending}
                          data-testid="button-start-task"
                        >
                          <PlayCircle className="mr-2 h-4 w-4" />Start
                        </Button>
                      )}
                      {task.status === "in_progress" && (
                        <Button 
                          size="sm" 
                          onClick={() => updateTaskMutation.mutate({ taskId: task.id, status: "completed" })}
                          disabled={updateTaskMutation.isPending}
                          data-testid="button-complete-task"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />Complete
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              {booking.chat ? (
                <ChatInterface 
                  messages={messages} 
                  onSendMessage={handleSendMessage} 
                  isOpen={booking.chat.isOpen} 
                  isSending={sendMessageMutation.isPending}
                  canSendPrivate
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <p>No chat available for this booking</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
