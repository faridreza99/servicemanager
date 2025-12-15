import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Calendar, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { BookingCard } from "@/components/booking-card";
import { Pagination, usePagination } from "@/components/pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAuthHeader } from "@/lib/auth";
import type { BookingWithDetails } from "@shared/schema";

export default function CustomerBookingsPage() {
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

  const activeBookings = bookings.filter((b) => b.status !== "completed" && b.status !== "cancelled");
  const completedBookings = bookings.filter((b) => b.status === "completed" || b.status === "cancelled");

  const activePagination = usePagination(activeBookings, 10);
  const completedPagination = usePagination(completedBookings, 10);

  const renderBookingsList = (list: BookingWithDetails[], pagination: ReturnType<typeof usePagination<BookingWithDetails>>) => {
    if (list.length === 0) {
      return (
        <div className="text-center py-16 text-muted-foreground">
          <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No bookings found</p>
        </div>
      );
    }

    return (
      <>
        <div className="space-y-4">
          {pagination.paginatedItems.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onViewDetails={() => setLocation(`/dashboard/bookings/${booking.id}`)}
            />
          ))}
        </div>
        {list.length > 10 && (
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            pageSize={pagination.pageSize}
            totalItems={pagination.totalItems}
            onPageChange={pagination.onPageChange}
            onPageSizeChange={pagination.onPageSizeChange}
          />
        )}
      </>
    );
  };

  return (
    <DashboardLayout title="My Bookings">
      <div className="max-w-4xl mx-auto p-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6 space-y-4">
                  <Skeleton className="h-6 w-1/2" />
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-8 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Tabs defaultValue="active" className="space-y-6">
            <TabsList>
              <TabsTrigger value="active" data-testid="tab-active-bookings">
                Active ({activeBookings.length})
              </TabsTrigger>
              <TabsTrigger value="completed" data-testid="tab-completed-bookings">
                Completed ({completedBookings.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              {renderBookingsList(activeBookings, activePagination)}
            </TabsContent>

            <TabsContent value="completed">
              {renderBookingsList(completedBookings, completedPagination)}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
