import { useQuery } from "@tanstack/react-query";
import { BarChart3, Users, Calendar, ClipboardList, TrendingUp, Briefcase } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getAuthHeader } from "@/lib/auth";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface OverviewData {
  bookings: { total: number; completed: number; active: number; cancelled: number };
  users: { total: number; customers: number; staff: number; admins: number; pendingApprovals: number };
  tasks: { total: number; completed: number; pending: number; inProgress: number };
  services: { total: number; active: number };
}

interface BookingAnalytics {
  statusData: { name: string; value: number }[];
  categoryData: { name: string; value: number }[];
  trendData: { month: string; count: number }[];
}

interface StaffPerformance {
  id: string;
  name: string;
  email: string;
  totalTasks: number;
  completed: number;
  pending: number;
  inProgress: number;
  completionRate: number;
}

const CHART_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function AdminAnalyticsPage() {
  const { data: overview, isLoading: overviewLoading } = useQuery<OverviewData>({
    queryKey: ["/api/admin/analytics/overview"],
    queryFn: async () => {
      const res = await fetch("/api/admin/analytics/overview", { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to fetch analytics overview");
      return res.json();
    },
  });

  const { data: bookingAnalytics, isLoading: bookingsLoading } = useQuery<BookingAnalytics>({
    queryKey: ["/api/admin/analytics/bookings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/analytics/bookings", { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to fetch booking analytics");
      return res.json();
    },
  });

  const { data: staffPerformance = [], isLoading: staffLoading } = useQuery<StaffPerformance[]>({
    queryKey: ["/api/admin/analytics/staff"],
    queryFn: async () => {
      const res = await fetch("/api/admin/analytics/staff", { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to fetch staff performance");
      return res.json();
    },
  });

  const isLoading = overviewLoading || bookingsLoading || staffLoading;

  return (
    <DashboardLayout title="Analytics Dashboard">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-analytics-title">Analytics Dashboard</h1>
            <p className="text-muted-foreground">Business insights and performance metrics</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-6 w-24 mb-2" />
                    <Skeleton className="h-10 w-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm font-medium">Total Bookings</span>
                  </div>
                  <p className="text-3xl font-bold" data-testid="text-total-bookings">{overview?.bookings.total || 0}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary">{overview?.bookings.active || 0} Active</Badge>
                    <Badge variant="outline">{overview?.bookings.completed || 0} Completed</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Users className="h-4 w-4" />
                    <span className="text-sm font-medium">Total Users</span>
                  </div>
                  <p className="text-3xl font-bold" data-testid="text-total-users">{overview?.users.total || 0}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="secondary">{overview?.users.customers || 0} Customers</Badge>
                    <Badge variant="outline">{overview?.users.staff || 0} Staff</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <ClipboardList className="h-4 w-4" />
                    <span className="text-sm font-medium">Total Tasks</span>
                  </div>
                  <p className="text-3xl font-bold" data-testid="text-total-tasks">{overview?.tasks.total || 0}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary">{overview?.tasks.inProgress || 0} In Progress</Badge>
                    <Badge variant="outline">{overview?.tasks.completed || 0} Done</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Briefcase className="h-4 w-4" />
                    <span className="text-sm font-medium">Active Services</span>
                  </div>
                  <p className="text-3xl font-bold" data-testid="text-active-services">{overview?.services.active || 0}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline">{overview?.services.total || 0} Total</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Booking Trends
                  </CardTitle>
                  <CardDescription>Monthly booking volume</CardDescription>
                </CardHeader>
                <CardContent>
                  {bookingAnalytics?.trendData && bookingAnalytics.trendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={bookingAnalytics.trendData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="month" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No booking data available
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Bookings by Status</CardTitle>
                  <CardDescription>Distribution of booking statuses</CardDescription>
                </CardHeader>
                <CardContent>
                  {bookingAnalytics?.statusData && bookingAnalytics.statusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={bookingAnalytics.statusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {bookingAnalytics.statusData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No status data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Bookings by Service Category</CardTitle>
                <CardDescription>Service category distribution</CardDescription>
              </CardHeader>
              <CardContent>
                {bookingAnalytics?.categoryData && bookingAnalytics.categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={bookingAnalytics.categoryData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" className="text-xs" />
                      <YAxis dataKey="name" type="category" width={120} className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No category data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Staff Performance
                </CardTitle>
                <CardDescription>Task completion metrics by staff member</CardDescription>
              </CardHeader>
              <CardContent>
                {staffPerformance.length > 0 ? (
                  <div className="space-y-6">
                    {staffPerformance.map((staff) => (
                      <div key={staff.id} className="space-y-2" data-testid={`staff-performance-${staff.id}`}>
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-medium">{staff.name}</p>
                            <p className="text-sm text-muted-foreground">{staff.email}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{staff.totalTasks} Tasks</Badge>
                            <Badge variant="outline">{staff.completionRate}% Completed</Badge>
                          </div>
                        </div>
                        <Progress value={staff.completionRate} className="h-2" />
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>Completed: {staff.completed}</span>
                          <span>In Progress: {staff.inProgress}</span>
                          <span>Pending: {staff.pending}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No staff members found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
