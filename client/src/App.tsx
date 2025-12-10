import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import { SiteSettingsProvider } from "@/lib/site-settings";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import CustomerDashboard from "@/pages/customer/dashboard";
import CustomerServicesPage from "@/pages/customer/services";
import BookServicePage from "@/pages/customer/book-service";
import CustomerBookingsPage from "@/pages/customer/bookings";
import CustomerBookingDetailPage from "@/pages/customer/booking-detail";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminUsersPage from "@/pages/admin/users";
import AdminServicesPage from "@/pages/admin/services";
import AdminBookingsPage from "@/pages/admin/bookings";
import AdminBookingDetailPage from "@/pages/admin/booking-detail";
import AdminTasksPage from "@/pages/admin/tasks";
import AdminAnalyticsPage from "@/pages/admin/analytics";
import AdminNotificationsPage from "@/pages/admin/notifications";
import AdminSettingsPage from "@/pages/admin/settings";
import AdminPageContentPage from "@/pages/admin/page-content";
import AdminChatPage from "@/pages/admin/chat";
import AdminReviewsPage from "@/pages/admin/reviews";
import AdminAttendancePage from "@/pages/admin/attendance";
import AdminLeaveRequestsPage from "@/pages/admin/leave-requests";
import CustomerSettingsPage from "@/pages/customer/settings";
import StaffDashboard from "@/pages/staff/dashboard";
import StaffTasksPage from "@/pages/staff/tasks";
import StaffBookingDetailPage from "@/pages/staff/booking-detail";
import StaffNotificationsPage from "@/pages/staff/notifications";
import StaffSettingsPage from "@/pages/staff/settings";
import PublicHomePage from "@/pages/public/home";
import PublicServicesPage from "@/pages/public/services";
import PublicServiceDetailPage from "@/pages/public/service-detail";
import PublicAboutPage from "@/pages/public/about";
import PublicContactPage from "@/pages/public/contact";

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    
    if (!user) {
      setLocation("/login");
      return;
    }

    if (roles && !roles.includes(user.role)) {
      if (user.role === "admin") {
        setLocation("/admin");
      } else if (user.role === "staff") {
        setLocation("/staff");
      } else {
        setLocation("/dashboard");
      }
    }
  }, [user, isLoading, roles, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user || (roles && !roles.includes(user.role))) {
    return null;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    
    if (user) {
      if (user.role === "admin") {
        setLocation("/admin");
      } else if (user.role === "staff") {
        setLocation("/staff");
      } else {
        setLocation("/dashboard");
      }
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (user) {
    return null;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/">
        <PublicHomePage />
      </Route>

      <Route path="/services">
        <PublicServicesPage />
      </Route>

      <Route path="/services/:id">
        <PublicServiceDetailPage />
      </Route>

      <Route path="/about">
        <PublicAboutPage />
      </Route>

      <Route path="/contact">
        <PublicContactPage />
      </Route>

      <Route path="/login">
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      </Route>

      <Route path="/register">
        <PublicRoute>
          <RegisterPage />
        </PublicRoute>
      </Route>

      <Route path="/dashboard">
        <ProtectedRoute roles={["customer"]}>
          <CustomerDashboard />
        </ProtectedRoute>
      </Route>

      <Route path="/dashboard/services">
        <ProtectedRoute roles={["customer"]}>
          <CustomerServicesPage />
        </ProtectedRoute>
      </Route>

      <Route path="/dashboard/book/:id">
        <ProtectedRoute roles={["customer"]}>
          <BookServicePage />
        </ProtectedRoute>
      </Route>

      <Route path="/dashboard/bookings">
        <ProtectedRoute roles={["customer"]}>
          <CustomerBookingsPage />
        </ProtectedRoute>
      </Route>

      <Route path="/dashboard/bookings/:id">
        <ProtectedRoute roles={["customer"]}>
          <CustomerBookingDetailPage />
        </ProtectedRoute>
      </Route>

      <Route path="/dashboard/settings">
        <ProtectedRoute roles={["customer"]}>
          <CustomerSettingsPage />
        </ProtectedRoute>
      </Route>

      <Route path="/admin">
        <ProtectedRoute roles={["admin"]}>
          <AdminDashboard />
        </ProtectedRoute>
      </Route>

      <Route path="/admin/users">
        <ProtectedRoute roles={["admin"]}>
          <AdminUsersPage />
        </ProtectedRoute>
      </Route>

      <Route path="/admin/services">
        <ProtectedRoute roles={["admin"]}>
          <AdminServicesPage />
        </ProtectedRoute>
      </Route>

      <Route path="/admin/bookings">
        <ProtectedRoute roles={["admin"]}>
          <AdminBookingsPage />
        </ProtectedRoute>
      </Route>

      <Route path="/admin/bookings/:id">
        <ProtectedRoute roles={["admin"]}>
          <AdminBookingDetailPage />
        </ProtectedRoute>
      </Route>

      <Route path="/admin/tasks">
        <ProtectedRoute roles={["admin"]}>
          <AdminTasksPage />
        </ProtectedRoute>
      </Route>

      <Route path="/admin/analytics">
        <ProtectedRoute roles={["admin"]}>
          <AdminAnalyticsPage />
        </ProtectedRoute>
      </Route>

      <Route path="/admin/notifications">
        <ProtectedRoute roles={["admin"]}>
          <AdminNotificationsPage />
        </ProtectedRoute>
      </Route>

      <Route path="/admin/settings">
        <ProtectedRoute roles={["admin"]}>
          <AdminSettingsPage />
        </ProtectedRoute>
      </Route>

      <Route path="/admin/page-content">
        <ProtectedRoute roles={["admin"]}>
          <AdminPageContentPage />
        </ProtectedRoute>
      </Route>

      <Route path="/admin/chat/:id">
        <ProtectedRoute roles={["admin"]}>
          <AdminChatPage />
        </ProtectedRoute>
      </Route>

      <Route path="/admin/reviews">
        <ProtectedRoute roles={["admin"]}>
          <AdminReviewsPage />
        </ProtectedRoute>
      </Route>

      <Route path="/admin/attendance">
        <ProtectedRoute roles={["admin"]}>
          <AdminAttendancePage />
        </ProtectedRoute>
      </Route>

      <Route path="/admin/leave-requests">
        <ProtectedRoute roles={["admin"]}>
          <AdminLeaveRequestsPage />
        </ProtectedRoute>
      </Route>

      <Route path="/staff">
        <ProtectedRoute roles={["staff"]}>
          <StaffDashboard />
        </ProtectedRoute>
      </Route>

      <Route path="/staff/tasks">
        <ProtectedRoute roles={["staff"]}>
          <StaffTasksPage />
        </ProtectedRoute>
      </Route>

      <Route path="/staff/bookings/:id">
        <ProtectedRoute roles={["staff"]}>
          <StaffBookingDetailPage />
        </ProtectedRoute>
      </Route>

      <Route path="/staff/notifications">
        <ProtectedRoute roles={["staff"]}>
          <StaffNotificationsPage />
        </ProtectedRoute>
      </Route>

      <Route path="/staff/settings">
        <ProtectedRoute roles={["staff"]}>
          <StaffSettingsPage />
        </ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SiteSettingsProvider>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </AuthProvider>
        </SiteSettingsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
