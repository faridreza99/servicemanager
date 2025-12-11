import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Search, Filter, Calendar, User, Clock, Shield, LogIn, LogOut, Megaphone, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeader } from "@/lib/auth";
import type { AuditLog } from "@shared/schema";

interface AuditLogsResponse {
  logs: AuditLog[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

const actionLabels: Record<string, { label: string; icon: typeof LogIn; color: string }> = {
  login: { label: "Login", icon: LogIn, color: "bg-green-500/10 text-green-600" },
  logout: { label: "Logout", icon: LogOut, color: "bg-gray-500/10 text-gray-600" },
  user_register: { label: "User Register", icon: User, color: "bg-blue-500/10 text-blue-600" },
  user_approve: { label: "User Approved", icon: CheckCircle, color: "bg-blue-500/10 text-blue-600" },
  user_reject: { label: "User Rejected", icon: XCircle, color: "bg-red-500/10 text-red-600" },
  user_update: { label: "User Updated", icon: User, color: "bg-blue-500/10 text-blue-600" },
  user_delete: { label: "User Deleted", icon: XCircle, color: "bg-red-500/10 text-red-600" },
  booking_create: { label: "Booking Created", icon: Calendar, color: "bg-purple-500/10 text-purple-600" },
  booking_update: { label: "Booking Updated", icon: Calendar, color: "bg-purple-500/10 text-purple-600" },
  booking_assign: { label: "Booking Assigned", icon: Calendar, color: "bg-purple-500/10 text-purple-600" },
  booking_delete: { label: "Booking Deleted", icon: XCircle, color: "bg-red-500/10 text-red-600" },
  task_create: { label: "Task Created", icon: FileText, color: "bg-orange-500/10 text-orange-600" },
  task_update: { label: "Task Updated", icon: FileText, color: "bg-orange-500/10 text-orange-600" },
  task_complete: { label: "Task Completed", icon: CheckCircle, color: "bg-green-500/10 text-green-600" },
  leave_request: { label: "Leave Requested", icon: Calendar, color: "bg-yellow-500/10 text-yellow-600" },
  leave_approve: { label: "Leave Approved", icon: CheckCircle, color: "bg-green-500/10 text-green-600" },
  leave_reject: { label: "Leave Rejected", icon: XCircle, color: "bg-red-500/10 text-red-600" },
  attendance_clock_in: { label: "Clock In", icon: Clock, color: "bg-green-500/10 text-green-600" },
  attendance_clock_out: { label: "Clock Out", icon: Clock, color: "bg-gray-500/10 text-gray-600" },
  service_create: { label: "Service Created", icon: FileText, color: "bg-indigo-500/10 text-indigo-600" },
  service_update: { label: "Service Updated", icon: FileText, color: "bg-indigo-500/10 text-indigo-600" },
  service_delete: { label: "Service Deleted", icon: XCircle, color: "bg-red-500/10 text-red-600" },
  notification_broadcast: { label: "Broadcast Sent", icon: Megaphone, color: "bg-cyan-500/10 text-cyan-600" },
  settings_update: { label: "Settings Updated", icon: Shield, color: "bg-gray-500/10 text-gray-600" },
  file_upload: { label: "File Uploaded", icon: FileText, color: "bg-blue-500/10 text-blue-600" },
};

const roleColors: Record<string, string> = {
  admin: "bg-red-500/10 text-red-600",
  staff: "bg-blue-500/10 text-blue-600",
  customer: "bg-green-500/10 text-green-600",
};

export default function AdminAuditLogsPage() {
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [page, setPage] = useState(0);
  const limit = 50;

  const { data, isLoading, refetch } = useQuery<AuditLogsResponse>({
    queryKey: ["/api/admin/audit-logs", actionFilter, roleFilter, startDate, endDate, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: (page * limit).toString(),
      });
      if (actionFilter !== "all") params.append("action", actionFilter);
      if (roleFilter !== "all") params.append("actorRole", roleFilter);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      
      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`, { 
        headers: getAuthHeader() 
      });
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      return res.json();
    },
  });

  const totalPages = data ? Math.ceil(data.pagination.total / limit) : 0;

  const getActionInfo = (action: string) => {
    return actionLabels[action] || { label: action.replace(/_/g, " "), icon: FileText, color: "bg-gray-500/10 text-gray-600" };
  };

  const handleClearFilters = () => {
    setActionFilter("all");
    setRoleFilter("all");
    setStartDate("");
    setEndDate("");
    setPage(0);
  };

  return (
    <DashboardLayout title="Audit Logs">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Audit Trail
            </CardTitle>
            <CardDescription>
              Track all user actions and system events
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Action Type</Label>
                <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
                  <SelectTrigger data-testid="select-action-filter">
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" data-testid="option-action-all">All Actions</SelectItem>
                    <SelectItem value="login" data-testid="option-action-login">Login</SelectItem>
                    <SelectItem value="logout" data-testid="option-action-logout">Logout</SelectItem>
                    <SelectItem value="user_register" data-testid="option-action-user-register">User Register</SelectItem>
                    <SelectItem value="user_approve" data-testid="option-action-user-approve">User Approved</SelectItem>
                    <SelectItem value="user_reject" data-testid="option-action-user-reject">User Rejected</SelectItem>
                    <SelectItem value="user_update" data-testid="option-action-user-update">User Updated</SelectItem>
                    <SelectItem value="booking_create" data-testid="option-action-booking-create">Booking Created</SelectItem>
                    <SelectItem value="booking_update" data-testid="option-action-booking-update">Booking Updated</SelectItem>
                    <SelectItem value="booking_assign" data-testid="option-action-booking-assign">Booking Assigned</SelectItem>
                    <SelectItem value="task_create" data-testid="option-action-task-create">Task Created</SelectItem>
                    <SelectItem value="task_update" data-testid="option-action-task-update">Task Updated</SelectItem>
                    <SelectItem value="task_complete" data-testid="option-action-task-complete">Task Completed</SelectItem>
                    <SelectItem value="leave_request" data-testid="option-action-leave-request">Leave Requested</SelectItem>
                    <SelectItem value="leave_approve" data-testid="option-action-leave-approve">Leave Approved</SelectItem>
                    <SelectItem value="leave_reject" data-testid="option-action-leave-reject">Leave Rejected</SelectItem>
                    <SelectItem value="attendance_clock_in" data-testid="option-action-clock-in">Clock In</SelectItem>
                    <SelectItem value="attendance_clock_out" data-testid="option-action-clock-out">Clock Out</SelectItem>
                    <SelectItem value="service_create" data-testid="option-action-service-create">Service Created</SelectItem>
                    <SelectItem value="service_update" data-testid="option-action-service-update">Service Updated</SelectItem>
                    <SelectItem value="notification_broadcast" data-testid="option-action-broadcast">Broadcast Sent</SelectItem>
                    <SelectItem value="settings_update" data-testid="option-action-settings-update">Settings Updated</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Actor Role</Label>
                <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(0); }}>
                  <SelectTrigger data-testid="select-role-filter">
                    <SelectValue placeholder="All roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" data-testid="option-role-all">All Roles</SelectItem>
                    <SelectItem value="admin" data-testid="option-role-admin">Admin</SelectItem>
                    <SelectItem value="staff" data-testid="option-role-staff">Staff</SelectItem>
                    <SelectItem value="customer" data-testid="option-role-customer">Customer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
                  data-testid="input-start-date"
                />
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <Input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
                  data-testid="input-end-date"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" onClick={handleClearFilters} data-testid="button-clear-filters">
                <Filter className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
              {data && (
                <span className="text-sm text-muted-foreground">
                  Showing {data.logs.length} of {data.pagination.total} entries
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !data || data.logs.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No audit logs found</p>
                <p className="text-sm">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="divide-y">
                {data.logs.map((log) => {
                  const actionInfo = getActionInfo(log.action);
                  const ActionIcon = actionInfo.icon;
                  
                  return (
                    <div key={log.id} className="p-4 flex items-start gap-4" data-testid={`audit-log-${log.id}`}>
                      <div className={`p-2 rounded-full shrink-0 ${actionInfo.color}`}>
                        <ActionIcon className="h-4 w-4" />
                      </div>
                      
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{actionInfo.label}</span>
                          {log.actorRole && (
                            <Badge variant="outline" className={roleColors[log.actorRole] || ""}>
                              {log.actorRole}
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">{log.actorEmail}</span>
                          {log.targetType && (
                            <span> on {log.targetType}</span>
                          )}
                        </p>
                        
                        {log.metadata && (
                          <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md font-mono">
                            {typeof log.metadata === 'string' 
                              ? log.metadata.substring(0, 200) + (log.metadata.length > 200 ? '...' : '')
                              : JSON.stringify(log.metadata).substring(0, 200)}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(log.createdAt), "MMM d, yyyy 'at' h:mm:ss a")}
                          </span>
                          {log.ipAddress && (
                            <span className="flex items-center gap-1">
                              IP: {log.ipAddress}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {data && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              data-testid="button-prev-page"
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              data-testid="button-next-page"
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
