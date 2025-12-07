import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Download, User, Calendar, Clock, DollarSign } from "lucide-react";
import { io, Socket } from "socket.io-client";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ChatInterface } from "@/components/chat-interface";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeader } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { BookingWithDetails, MessageWithSender, User as UserType, BookingStatus } from "@shared/schema";
import { formatDistanceToNow, format } from "date-fns";

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

export default function AdminBookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");

  const { data: booking, isLoading: bookingLoading } = useQuery<BookingWithDetails>({
    queryKey: ["/api/bookings", id],
    queryFn: async () => {
      const res = await fetch(`/api/bookings/${id}`, { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to fetch booking");
      return res.json();
    },
  });

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

  const { data: staffUsers = [] } = useQuery<UserType[]>({
    queryKey: ["/api/admin/users/staff"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users/staff", { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to fetch staff");
      return res.json();
    },
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
    mutationFn: async ({ content, isPrivate, isQuotation, quotationAmount, attachmentUrl, attachmentType }: { content: string; isPrivate: boolean; isQuotation?: boolean; quotationAmount?: number; attachmentUrl?: string; attachmentType?: string }) => 
      apiRequest("POST", `/api/chats/${chatId}/messages`, { content, isPrivate, isQuotation: isQuotation || false, quotationAmount, attachmentUrl, attachmentType }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/chats", chatId, "messages"] }),
    onError: (error: Error) => toast({ title: "Failed to send message", description: error.message, variant: "destructive" }),
  });

  const closeChatMutation = useMutation({
    mutationFn: async () => apiRequest("POST", `/api/chats/${chatId}/close`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings", id] });
      toast({ title: "Work approved", description: "The booking has been marked as complete." });
    },
    onError: (error: Error) => toast({ title: "Failed to close chat", description: error.message, variant: "destructive" }),
  });

  const assignMutation = useMutation({
    mutationFn: async ({ staffId }: { staffId: string }) => 
      apiRequest("POST", `/api/bookings/${id}/assign`, { staffId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings", id] });
      toast({ title: "Staff assigned", description: "A task has been created for the assigned staff." });
      setAssignDialogOpen(false);
      setSelectedStaffId("");
    },
    onError: (error: Error) => toast({ title: "Failed to assign staff", description: error.message, variant: "destructive" }),
  });

  const handleSendMessage = useCallback((content: string, isPrivate: boolean, isQuotation?: boolean, quotationAmount?: number, attachmentUrl?: string, attachmentType?: string) => {
    sendMessageMutation.mutate({ content, isPrivate, isQuotation, quotationAmount, attachmentUrl, attachmentType });
  }, [sendMessageMutation]);

  const handleDownloadTranscript = useCallback(async () => {
    try {
      const response = await fetch(`/api/chats/${chatId}/transcript`, { headers: getAuthHeader() });
      if (!response.ok) throw new Error("Failed to download transcript");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `booking-${id}-transcript.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast({ title: "Transcript downloaded", description: "Chat transcript has been saved." });
    } catch (error) {
      toast({ title: "Download failed", description: "Could not download chat transcript.", variant: "destructive" });
    }
  }, [chatId, id, toast]);

  const isLoading = bookingLoading || messagesLoading;

  return (
    <DashboardLayout title="Booking Details">
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="flex items-center justify-between gap-4 p-4 border-b flex-wrap">
          <Button variant="ghost" onClick={() => setLocation("/admin/bookings")} data-testid="button-back">
            <ArrowLeft className="mr-2 h-4 w-4" />Back to Bookings
          </Button>
          <div className="flex items-center gap-2 flex-wrap">
            {booking?.chat && (
              <Button variant="outline" onClick={handleDownloadTranscript} data-testid="button-download-transcript">
                <Download className="mr-2 h-4 w-4" />Transcript
              </Button>
            )}
          </div>
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
              <Card>
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
                      <span>Created {formatDistanceToNow(new Date(booking.createdAt), { addSuffix: true })}</span>
                    </div>
                    {booking.service.description && (
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <DollarSign className="h-4 w-4 mt-0.5" />
                        <span className="text-xs">{booking.service.description}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t">
                    <p className="text-sm font-medium mb-2">Assigned Staff</p>
                    {booking.assignedStaff ? (
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          {booking.assignedStaff.profilePhoto && (
                            <AvatarImage src={booking.assignedStaff.profilePhoto} alt={booking.assignedStaff.name} />
                          )}
                          <AvatarFallback className="text-xs">{getInitials(booking.assignedStaff.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm">{booking.assignedStaff.name}</p>
                        </div>
                      </div>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setAssignDialogOpen(true)}
                        data-testid="button-assign-staff"
                      >
                        <User className="mr-2 h-4 w-4" />Assign Staff
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              {booking.chat ? (
                <ChatInterface 
                  messages={messages} 
                  onSendMessage={handleSendMessage} 
                  onClose={() => closeChatMutation.mutate()} 
                  isOpen={booking.chat.isOpen} 
                  isSending={sendMessageMutation.isPending} 
                  canSendPrivate 
                  canSendQuotation 
                  canClose 
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <p>No chat available for this booking</p>
                </div>
              )}
            </div>
          </div>
        )}

        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Staff</DialogTitle>
              <DialogDescription>
                Select a staff member to handle this booking
              </DialogDescription>
            </DialogHeader>
            <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
              <SelectTrigger data-testid="select-staff">
                <SelectValue placeholder="Select staff member" />
              </SelectTrigger>
              <SelectContent>
                {staffUsers.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id}>
                    {staff.name} ({staff.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={() => selectedStaffId && assignMutation.mutate({ staffId: selectedStaffId })} 
                disabled={assignMutation.isPending || !selectedStaffId}
                data-testid="button-confirm-assign"
              >
                {assignMutation.isPending ? "Assigning..." : "Assign"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
