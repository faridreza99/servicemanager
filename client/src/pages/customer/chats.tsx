import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { MessageSquare, ArrowRight } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination, usePagination } from "@/components/pagination";
import { getAuthHeader } from "@/lib/auth";
import type { BookingWithDetails } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

export default function CustomerChatsPage() {
  const [, setLocation] = useLocation();

  const { data: bookings = [], isLoading } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/bookings"],
    queryFn: async () => {
      const res = await fetch("/api/bookings", {
        headers: getAuthHeader(),
      });
      if (!res.ok) throw new Error("Failed to fetch bookings");
      return res.json();
    },
  });

  const bookingsWithChats = bookings.filter((b) => b.chat);
  const openChats = bookingsWithChats.filter((b) => b.chat?.isOpen);
  const closedChats = bookingsWithChats.filter((b) => !b.chat?.isOpen);

  const openChatsPagination = usePagination(openChats, 10);
  const closedChatsPagination = usePagination(closedChats, 10);

  useEffect(() => {
    if (openChatsPagination.currentPage > openChatsPagination.totalPages && openChatsPagination.totalPages > 0) {
      openChatsPagination.onPageChange(openChatsPagination.totalPages);
    } else if (openChatsPagination.totalPages === 0) {
      openChatsPagination.onPageChange(1);
    }
  }, [openChats.length]);

  useEffect(() => {
    if (closedChatsPagination.currentPage > closedChatsPagination.totalPages && closedChatsPagination.totalPages > 0) {
      closedChatsPagination.onPageChange(closedChatsPagination.totalPages);
    } else if (closedChatsPagination.totalPages === 0) {
      closedChatsPagination.onPageChange(1);
    }
  }, [closedChats.length]);

  return (
    <DashboardLayout title="Messages">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">Open Conversations</h2>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-6 w-1/2 mb-2" />
                    <Skeleton className="h-4 w-1/4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : openChats.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No open conversations</p>
                <p className="text-sm">Book a service to start a conversation</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="space-y-4">
                {openChatsPagination.paginatedItems.map((booking) => (
                  <Card 
                    key={booking.id} 
                    className="hover-elevate cursor-pointer"
                    onClick={() => setLocation(`/dashboard/chat/${booking.chat?.id}`)}
                    data-testid={`chat-card-${booking.chat?.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <MessageSquare className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{booking.service.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Started {formatDistanceToNow(new Date(booking.chat?.createdAt || ""), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="default">Active</Badge>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {openChatsPagination.totalPages > 1 && (
                <Pagination
                  currentPage={openChatsPagination.currentPage}
                  totalPages={openChatsPagination.totalPages}
                  pageSize={openChatsPagination.pageSize}
                  totalItems={openChatsPagination.totalItems}
                  onPageChange={openChatsPagination.onPageChange}
                  onPageSizeChange={openChatsPagination.onPageSizeChange}
                />
              )}
            </>
          )}
        </div>

        {closedChats.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Closed Conversations</h2>
            <div className="space-y-4">
              {closedChatsPagination.paginatedItems.map((booking) => (
                <Card 
                  key={booking.id}
                  className="opacity-75"
                  data-testid={`chat-card-closed-${booking.chat?.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <MessageSquare className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{booking.service.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Closed {formatDistanceToNow(new Date(booking.chat?.closedAt || ""), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">Closed</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {closedChatsPagination.totalPages > 1 && (
              <Pagination
                currentPage={closedChatsPagination.currentPage}
                totalPages={closedChatsPagination.totalPages}
                pageSize={closedChatsPagination.pageSize}
                totalItems={closedChatsPagination.totalItems}
                onPageChange={closedChatsPagination.onPageChange}
                onPageSizeChange={closedChatsPagination.onPageSizeChange}
              />
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
