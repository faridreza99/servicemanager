import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Users, Briefcase, Calendar, MessageSquare, UserCheck, ClipboardList } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatCard } from "@/components/stat-card";
import { BookingCard } from "@/components/booking-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeader } from "@/lib/auth";
import type { User, Service, BookingWithDetails } from "@shared/schema";

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users", { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    queryFn: async () => {
      const res = await fetch("/api/services", { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to fetch services");
      return res.json();
    },
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/bookings"],
    queryFn: async () => {
      const res = await fetch("/api/bookings", { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to fetch bookings");
      return res.json();
    },
  });

  const pendingUsers = users.filter((u) => !u.approved);
  const activeBookings = bookings.filter((b) => b.status !== "completed" && b.status !== "cancelled");
  const openChats = bookings.filter((b) => b.chat?.isOpen).length;

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Pending Approvals" value={pendingUsers.length} icon={<UserCheck className="h-4 w-4" />} description="Users awaiting approval" />
          <StatCard title="Active Services" value={services.filter((s) => s.isActive).length} icon={<Briefcase className="h-4 w-4" />} description={`${services.length} total services`} />
          <StatCard title="Active Bookings" value={activeBookings.length} icon={<Calendar className="h-4 w-4" />} description={`${bookings.length} total`} />
          <StatCard title="Open Chats" value={openChats} icon={<MessageSquare className="h-4 w-4" />} description="Active conversations" />
        </div>

        {pendingUsers.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
              <div><CardTitle>Pending User Approvals</CardTitle><CardDescription>Users waiting for account approval</CardDescription></div>
              <Button variant="outline" onClick={() => setLocation("/admin/users")} data-testid="button-view-all-users">View All Users</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingUsers.slice(0, 5).map((user) => (
                  <div key={user.id} className="flex items-center justify-between gap-4 p-3 rounded-lg bg-accent/50">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10"><AvatarFallback>{getInitials(user.name)}</AvatarFallback></Avatar>
                      <div><p className="font-medium">{user.name}</p><p className="text-sm text-muted-foreground">{user.email}</p></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{user.role}</Badge>
                      <Badge variant="outline">Pending</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
            <div><CardTitle>Recent Bookings</CardTitle><CardDescription>Latest service requests</CardDescription></div>
            <Button variant="outline" onClick={() => setLocation("/admin/bookings")} data-testid="button-view-all-bookings">View All</Button>
          </CardHeader>
          <CardContent>
            {bookingsLoading ? (
              <div className="space-y-4">{[1, 2, 3].map((i) => (<Card key={i}><CardContent className="p-6 space-y-4"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-4 w-1/4" /></CardContent></Card>))}</div>
            ) : activeBookings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground"><Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" /><p className="text-lg font-medium">No active bookings</p></div>
            ) : (
              <div className="space-y-4">{activeBookings.slice(0, 5).map((booking) => (<BookingCard key={booking.id} booking={booking} showCustomer showAssignee onChat={() => setLocation(`/admin/chat/${booking.chat?.id}`)} onAssign={() => setLocation(`/admin/bookings?assign=${booking.id}`)} />))}</div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
