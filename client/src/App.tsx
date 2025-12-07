import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import CustomerDashboard from "@/pages/customer/dashboard";
import CustomerServicesPage from "@/pages/customer/services";
import BookServicePage from "@/pages/customer/book-service";
import CustomerBookingsPage from "@/pages/customer/bookings";
import CustomerChatPage from "@/pages/customer/chat";
import CustomerChatsPage from "@/pages/customer/chats";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminUsersPage from "@/pages/admin/users";
import AdminServicesPage from "@/pages/admin/services";
import AdminBookingsPage from "@/pages/admin/bookings";
import AdminChatPage from "@/pages/admin/chat";
import AdminChatsPage from "@/pages/admin/chats";
import AdminTasksPage from "@/pages/admin/tasks";
import StaffDashboard from "@/pages/staff/dashboard";
import StaffTasksPage from "@/pages/staff/tasks";
import StaffChatPage from "@/pages/staff/chat";
import StaffChatsPage from "@/pages/staff/chats";

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  if (roles && !roles.includes(user.role)) {
    if (user.role === "admin") {
      setLocation("/admin");
    } else if (user.role === "staff") {
      setLocation("/staff");
    } else {
      setLocation("/dashboard");
    }
    return null;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (user) {
    if (user.role === "admin") {
      setLocation("/admin");
    } else if (user.role === "staff") {
      setLocation("/staff");
    } else {
      setLocation("/dashboard");
    }
    return null;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/">
        <Redirect to="/login" />
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

      <Route path="/dashboard/chat/:id">
        <ProtectedRoute roles={["customer"]}>
          <CustomerChatPage />
        </ProtectedRoute>
      </Route>

      <Route path="/dashboard/chats">
        <ProtectedRoute roles={["customer"]}>
          <CustomerChatsPage />
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

      <Route path="/admin/chat/:id">
        <ProtectedRoute roles={["admin"]}>
          <AdminChatPage />
        </ProtectedRoute>
      </Route>

      <Route path="/admin/chats">
        <ProtectedRoute roles={["admin"]}>
          <AdminChatsPage />
        </ProtectedRoute>
      </Route>

      <Route path="/admin/tasks">
        <ProtectedRoute roles={["admin"]}>
          <AdminTasksPage />
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

      <Route path="/staff/chat/:id">
        <ProtectedRoute roles={["staff"]}>
          <StaffChatPage />
        </ProtectedRoute>
      </Route>

      <Route path="/staff/chats">
        <ProtectedRoute roles={["staff"]}>
          <StaffChatsPage />
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
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
