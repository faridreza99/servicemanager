import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Calendar, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { BookingCard } from "@/components/booking-card";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAuthHeader } from "@/lib/auth";
import type { BookingWithDetails } from "@shared/schema";

export default function CustomerBookingsPage() {
  const [, setLocation] = useLocation();

  const { data: bookings = [], isLoading } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/bookings/my"],
    queryFn: async () => {
      const res = await fetch("/api/bookings/my", {
        headers: getAuthHeader(),
      });
      if (!res.ok) throw new Error("Failed to fetch bookings");
      return res.json();
    },
  });

  const activeBookings = bookings.filter((b) => b.status !== "completed" && b.status !== "cancelled");
  const completedBookings = bookings.filter((b) => b.status === "completed" || b.status === "cancelled");

  const renderBookingsList = (list: BookingWithDetails[]) => {
    if (list.length === 0) {
      return (
        <div className="text-center py-16 text-muted-foreground">
          <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No bookings found</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {list.map((booking) => (
          <BookingCard
            key={booking.id}
            booking={booking}
            onChat={() => setLocation(`/dashboard/chat/${booking.chat?.id}`)}
          />
        ))}
      </div>
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
              {renderBookingsList(activeBookings)}
            </TabsContent>

            <TabsContent value="completed">
              {renderBookingsList(completedBookings)}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
