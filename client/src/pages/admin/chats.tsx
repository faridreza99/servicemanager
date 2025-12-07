import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { MessageSquare, ArrowRight } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeader } from "@/lib/auth";
import type { BookingWithDetails } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function AdminChatsPage() {
  const [, setLocation] = useLocation();

  const { data: bookings = [], isLoading } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/bookings"],
    queryFn: async () => {
      const res = await fetch("/api/bookings", { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to fetch bookings");
      return res.json();
    },
  });

  const bookingsWithChats = bookings.filter((b) => b.chat);
  const openChats = bookingsWithChats.filter((b) => b.chat?.isOpen);
  const closedChats = bookingsWithChats.filter((b) => !b.chat?.isOpen);

  return (
    <DashboardLayout title="All Chats">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">Open Conversations ({openChats.length})</h2>
          {isLoading ? (
            <div className="space-y-4">{[1, 2].map((i) => (<Card key={i}><CardContent className="p-6"><Skeleton className="h-6 w-1/2 mb-2" /><Skeleton className="h-4 w-1/4" /></CardContent></Card>))}</div>
          ) : openChats.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground"><MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" /><p className="text-lg font-medium">No open conversations</p></CardContent></Card>
          ) : (
            <div className="space-y-4">
              {openChats.map((booking) => (
                <Card key={booking.id} className="hover-elevate cursor-pointer" onClick={() => setLocation(`/admin/chat/${booking.chat?.id}`)} data-testid={`chat-card-${booking.chat?.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10"><AvatarFallback>{getInitials(booking.customer.name)}</AvatarFallback></Avatar>
                        <div><p className="font-medium">{booking.service.name}</p><p className="text-sm text-muted-foreground">{booking.customer.name} - {formatDistanceToNow(new Date(booking.chat?.createdAt || ""), { addSuffix: true })}</p></div>
                      </div>
                      <div className="flex items-center gap-2"><Badge variant="default">Active</Badge><ArrowRight className="h-4 w-4 text-muted-foreground" /></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {closedChats.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Closed Conversations ({closedChats.length})</h2>
            <div className="space-y-4">
              {closedChats.map((booking) => (
                <Card key={booking.id} className="opacity-75" data-testid={`chat-card-closed-${booking.chat?.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10"><AvatarFallback className="bg-muted">{getInitials(booking.customer.name)}</AvatarFallback></Avatar>
                        <div><p className="font-medium">{booking.service.name}</p><p className="text-sm text-muted-foreground">{booking.customer.name} - Closed {formatDistanceToNow(new Date(booking.chat?.closedAt || ""), { addSuffix: true })}</p></div>
                      </div>
                      <Badge variant="secondary">Closed</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
