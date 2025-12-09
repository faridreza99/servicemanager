import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Calendar, Clock, Star } from "lucide-react";
import { io, Socket } from "socket.io-client";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ChatInterface } from "@/components/chat-interface";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeader } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { BookingWithDetails, MessageWithSender, BookingStatus } from "@shared/schema";
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

export default function CustomerBookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [hasShownReviewPrompt, setHasShownReviewPrompt] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewBody, setReviewBody] = useState("");

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

  // Show review modal when booking is completed
  useEffect(() => {
    if (booking?.status === "completed" && !hasShownReviewPrompt) {
      const reviewedKey = `reviewed_booking_${id}`;
      const hasReviewed = localStorage.getItem(reviewedKey);
      if (!hasReviewed) {
        setShowReviewModal(true);
        setHasShownReviewPrompt(true);
      }
    }
  }, [booking?.status, hasShownReviewPrompt, id]);

  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      if (!booking) throw new Error("Booking not found");
      return apiRequest("POST", `/api/services/${booking.serviceId}/reviews`, {
        rating,
        title: reviewTitle || undefined,
        body: reviewBody || undefined,
      });
    },
    onSuccess: () => {
      localStorage.setItem(`reviewed_booking_${id}`, "true");
      setShowReviewModal(false);
      toast({ title: "Thank you!", description: "Your review has been submitted." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to submit review", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmitReview = () => {
    submitReviewMutation.mutate();
  };

  const handleSkipReview = () => {
    localStorage.setItem(`reviewed_booking_${id}`, "skipped");
    setShowReviewModal(false);
  };

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, isPrivate, attachmentUrl, attachmentType }: { content: string; isPrivate: boolean; attachmentUrl?: string; attachmentType?: string }) => 
      apiRequest("POST", `/api/chats/${chatId}/messages`, { content, isPrivate, isQuotation: false, attachmentUrl, attachmentType }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/chats", chatId, "messages"] }),
    onError: (error: Error) => toast({ title: "Failed to send message", description: error.message, variant: "destructive" }),
  });

  const handleSendMessage = useCallback((content: string, isPrivate: boolean, isQuotation?: boolean, quotationAmount?: number, attachmentUrl?: string, attachmentType?: string) => {
    sendMessageMutation.mutate({ content, isPrivate, attachmentUrl, attachmentType });
  }, [sendMessageMutation]);

  const isLoading = bookingLoading || messagesLoading;

  return (
    <DashboardLayout title="Booking Details">
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="flex items-center gap-4 p-4 border-b">
          <Button variant="ghost" onClick={() => setLocation("/dashboard/bookings")} data-testid="button-back">
            <ArrowLeft className="mr-2 h-4 w-4" />Back to Bookings
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
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Booked {formatDistanceToNow(new Date(booking.createdAt), { addSuffix: true })}</span>
                    </div>
                  </div>

                  {booking.assignedStaff && (
                    <div className="pt-2 border-t">
                      <p className="text-sm font-medium mb-2">Assigned Staff</p>
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
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              {booking.chat ? (
                <ChatInterface 
                  messages={messages} 
                  onSendMessage={handleSendMessage} 
                  isOpen={booking.chat.isOpen} 
                  isSending={sendMessageMutation.isPending}
                  canSendPrivate={true}
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

      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent data-testid="dialog-review">
          <DialogHeader>
            <DialogTitle>How was your experience?</DialogTitle>
            <DialogDescription>
              Your feedback helps us improve our services. Please take a moment to rate your experience.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rating</Label>
              <div className="flex gap-1" data-testid="rating-stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 hover-elevate rounded"
                    data-testid={`button-star-${star}`}
                  >
                    <Star
                      className={`h-6 w-6 ${
                        star <= rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="review-title">Title (optional)</Label>
              <Input
                id="review-title"
                placeholder="Summarize your experience"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                data-testid="input-review-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="review-body">Review (optional)</Label>
              <Textarea
                id="review-body"
                placeholder="Tell us more about your experience..."
                value={reviewBody}
                onChange={(e) => setReviewBody(e.target.value)}
                rows={4}
                data-testid="input-review-body"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleSkipReview} data-testid="button-skip-review">
              Skip
            </Button>
            <Button 
              onClick={handleSubmitReview} 
              disabled={submitReviewMutation.isPending}
              data-testid="button-submit-review"
            >
              {submitReviewMutation.isPending ? "Submitting..." : "Submit Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
