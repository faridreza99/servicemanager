import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Briefcase, Calendar, MessageSquare, ArrowRight, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ServiceCard } from "@/components/service-card";
import { BookingCard } from "@/components/booking-card";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeader } from "@/lib/auth";
import type { Service, BookingWithDetails } from "@shared/schema";

export default function CustomerDashboard() {
  const [, setLocation] = useLocation();

  const { data: services = [], isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    queryFn: async () => {
      const res = await fetch("/api/services", {
        headers: getAuthHeader(),
      });
      if (!res.ok) throw new Error("Failed to fetch services");
      return res.json();
    },
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<BookingWithDetails[]>({
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
  const openChats = bookings.filter((b) => b.chat?.isOpen).length;

  return (
    <DashboardLayout title="Dashboard">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Total Bookings"
            value={bookings.length}
            icon={<Calendar className="h-4 w-4" />}
            description="All time"
          />
          <StatCard
            title="Active Bookings"
            value={activeBookings.length}
            icon={<Briefcase className="h-4 w-4" />}
            description="In progress"
          />
          <StatCard
            title="Open Chats"
            value={openChats}
            icon={<MessageSquare className="h-4 w-4" />}
            description="Active conversations"
          />
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle>Book a Service</CardTitle>
              <CardDescription>Choose from our available IT services</CardDescription>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setLocation("/dashboard/services")}
              data-testid="button-view-all-services"
            >
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {servicesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-6 space-y-4">
                      <Skeleton className="h-10 w-10 rounded-md" />
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-9 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : services.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No services available</p>
                <p className="text-sm">Check back later for new services</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.slice(0, 3).map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    onBook={() => setLocation(`/dashboard/book/${service.id}`)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle>My Bookings</CardTitle>
              <CardDescription>Your active service requests</CardDescription>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setLocation("/dashboard/bookings")}
              data-testid="button-view-all-bookings"
            >
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {bookingsLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-6 space-y-4">
                      <Skeleton className="h-6 w-1/2" />
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-8 w-32" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : activeBookings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No active bookings</p>
                <p className="text-sm">Book a service to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeBookings.slice(0, 3).map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    onChat={() => setLocation(`/dashboard/chat/${booking.chat?.id}`)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
