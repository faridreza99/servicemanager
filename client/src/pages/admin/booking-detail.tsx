import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Download, User, Calendar, Clock, DollarSign, X, ChevronsUpDown, UserPlus } from "lucide-react";
import { io, Socket } from "socket.io-client";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ChatInterface } from "@/components/chat-interface";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeader } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { BookingWithDetails, MessageWithSender, User as UserType, BookingStatus } from "@shared/schema";
import { formatDistanceToNow, format } from "date-fns";

interface AssignedStaff extends UserType {
  taskId: string;
  taskStatus: string;
}

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
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [staffSelectorOpen, setStaffSelectorOpen] = useState(false);

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

  const { data: assignedStaff = [], isLoading: assignedStaffLoading } = useQuery<AssignedStaff[]>({
    queryKey: ["/api/bookings", id, "assigned-staff"],
    queryFn: async () => {
      const res = await fetch(`/api/bookings/${id}/assigned-staff`, { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to fetch assigned staff");
      return res.json();
    },
    enabled: !!id,
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
    mutationFn: async ({ staffIds }: { staffIds: string[] }) => 
      apiRequest("POST", `/api/bookings/${id}/assign`, { staffIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings", id, "assigned-staff"] });
      toast({ title: "Staff assigned", description: "Tasks have been created for the assigned staff." });
      setAssignDialogOpen(false);
      setSelectedStaffIds([]);
    },
    onError: (error: Error) => toast({ title: "Failed to assign staff", description: error.message, variant: "destructive" }),
  });

  const removeStaffMutation = useMutation({
    mutationFn: async ({ staffId }: { staffId: string }) => 
      apiRequest("DELETE", `/api/bookings/${id}/staff/${staffId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings", id, "assigned-staff"] });
      toast({ title: "Staff removed", description: "The staff member has been removed from this booking." });
    },
    onError: (error: Error) => toast({ title: "Failed to remove staff", description: error.message, variant: "destructive" }),
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

  const handleStaffToggle = (staffId: string) => {
    setSelectedStaffIds(prev => 
      prev.includes(staffId) 
        ? prev.filter(id => id !== staffId)
        : [...prev, staffId]
    );
  };

  const assignedStaffIds = new Set(assignedStaff.map(s => s.id));
  const availableStaff = staffUsers.filter(s => !assignedStaffIds.has(s.id));

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
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-sm font-medium">Assigned Staff</p>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => setAssignDialogOpen(true)}
                        data-testid="button-add-staff"
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {assignedStaffLoading ? (
                      <Skeleton className="h-10 w-full" />
                    ) : assignedStaff.length > 0 ? (
                      <div className="space-y-2">
                        {assignedStaff.map((staff) => (
                          <div key={staff.id} className="flex items-center justify-between gap-2" data-testid={`assigned-staff-${staff.id}`}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                {staff.profilePhoto && (
                                  <AvatarImage src={staff.profilePhoto} alt={staff.name} />
                                )}
                                <AvatarFallback className="text-xs">{getInitials(staff.name)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm">{staff.name}</p>
                                <Badge variant="secondary" className="text-xs">
                                  {getStatusLabel(staff.taskStatus)}
                                </Badge>
                              </div>
                            </div>
                            <Button 
                              size="icon" 
                              variant="ghost"
                              onClick={() => removeStaffMutation.mutate({ staffId: staff.id })}
                              disabled={removeStaffMutation.isPending}
                              data-testid={`button-remove-staff-${staff.id}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
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
                Select one or more staff members to handle this booking
              </DialogDescription>
            </DialogHeader>
            
            <Popover open={staffSelectorOpen} onOpenChange={setStaffSelectorOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  data-testid="select-staff-trigger"
                >
                  {selectedStaffIds.length > 0 
                    ? `${selectedStaffIds.length} staff member(s) selected`
                    : "Select staff members"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <div className="max-h-60 overflow-y-auto p-2">
                  {availableStaff.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-2">No available staff to assign</p>
                  ) : (
                    availableStaff.map((staff) => (
                      <div
                        key={staff.id}
                        className="flex items-center gap-2 p-2 hover-elevate rounded-md cursor-pointer"
                        onClick={() => handleStaffToggle(staff.id)}
                        data-testid={`staff-option-${staff.id}`}
                      >
                        <Checkbox
                          checked={selectedStaffIds.includes(staff.id)}
                          onCheckedChange={() => handleStaffToggle(staff.id)}
                        />
                        <Avatar className="h-6 w-6">
                          {staff.profilePhoto && (
                            <AvatarImage src={staff.profilePhoto} alt={staff.name} />
                          )}
                          <AvatarFallback className="text-xs">{getInitials(staff.name)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{staff.name}</span>
                      </div>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {selectedStaffIds.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedStaffIds.map((staffId) => {
                  const staff = staffUsers.find(s => s.id === staffId);
                  if (!staff) return null;
                  return (
                    <Badge key={staffId} variant="secondary" className="gap-1">
                      {staff.name}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => handleStaffToggle(staffId)}
                      />
                    </Badge>
                  );
                })}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => { setAssignDialogOpen(false); setSelectedStaffIds([]); }}>
                Cancel
              </Button>
              <Button 
                onClick={() => assignMutation.mutate({ staffIds: selectedStaffIds })} 
                disabled={assignMutation.isPending || selectedStaffIds.length === 0}
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
