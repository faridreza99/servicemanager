import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ClipboardList, CheckCircle, Clock, MapPin, Calendar, LogIn, LogOut, Loader2, AlertTriangle, Bell, Megaphone, FileText, Video, Image as ImageIcon, X } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatCard } from "@/components/stat-card";
import { TaskCard } from "@/components/task-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getAuthHeader } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import type { TaskWithDetails, Attendance, LeaveRequestWithDetails, Notification } from "@shared/schema";
import { useState, useEffect } from "react";

interface LeaveQuota {
  leaveDaysQuota: number;
  leaveDaysUsed: number;
  leaveDaysRemaining: number;
}

const leaveRequestSchema = z.object({
  leaveType: z.enum(["annual", "sick", "personal", "unpaid"]),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  reason: z.string().optional(),
});

type LeaveRequestForm = z.infer<typeof leaveRequestSchema>;

export default function StaffDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string>("");
  const [broadcastPopupOpen, setBroadcastPopupOpen] = useState(false);
  const [selectedBroadcast, setSelectedBroadcast] = useState<Notification | null>(null);

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<TaskWithDetails[]>({
    queryKey: ["/api/tasks"],
    queryFn: async () => {
      const res = await fetch("/api/tasks", { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
  });

  const { data: todayAttendance, isLoading: attendanceLoading } = useQuery<Attendance | null>({
    queryKey: ["/api/attendance/today"],
    queryFn: async () => {
      const res = await fetch("/api/attendance/today", { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to fetch attendance");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: leaveRequests = [], isLoading: leavesLoading } = useQuery<LeaveRequestWithDetails[]>({
    queryKey: ["/api/leave-requests/my"],
    queryFn: async () => {
      const res = await fetch("/api/leave-requests/my", { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to fetch leave requests");
      return res.json();
    },
  });

  const { data: leaveQuota, isLoading: quotaLoading, isError: quotaError } = useQuery<LeaveQuota>({
    queryKey: ["/api/leave-quota"],
    queryFn: async () => {
      const res = await fetch("/api/leave-quota", { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to fetch leave quota");
      return res.json();
    },
  });

  const { data: broadcasts = [], isLoading: broadcastsLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications/broadcasts"],
    queryFn: async () => {
      const res = await fetch("/api/notifications/broadcasts", { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to fetch broadcasts");
      return res.json();
    },
  });

  const { data: unreadBroadcasts = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications/unread-broadcasts"],
    queryFn: async () => {
      const res = await fetch("/api/notifications/unread-broadcasts", { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to fetch unread broadcasts");
      return res.json();
    },
  });

  useEffect(() => {
    if (unreadBroadcasts.length > 0 && !broadcastPopupOpen) {
      setSelectedBroadcast(unreadBroadcasts[0]);
      setBroadcastPopupOpen(true);
    }
  }, [unreadBroadcasts]);

  const markBroadcastReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return apiRequest("PATCH", `/api/notifications/${notificationId}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-broadcasts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/broadcasts"] });
    },
  });

  const handleCloseBroadcastPopup = () => {
    if (selectedBroadcast) {
      markBroadcastReadMutation.mutate(selectedBroadcast.id);
    }
    setBroadcastPopupOpen(false);
    setSelectedBroadcast(null);
  };

  const getAttachmentIcon = (url: string) => {
    const ext = url.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return <ImageIcon className="h-4 w-4" />;
    if (['mp4', 'webm', 'mov'].includes(ext || '')) return <Video className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => apiRequest("PATCH", `/api/tasks/${taskId}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task updated" });
    },
    onError: (error: Error) => toast({ title: "Failed to update task", description: error.message, variant: "destructive" }),
  });

  const clockInMutation = useMutation({
    mutationFn: async (locationData: { latitude?: number; longitude?: number; address?: string }) => {
      return apiRequest("POST", "/api/attendance/clock-in", locationData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
      toast({ title: "Clocked in successfully" });
      setLocationStatus("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to clock in", description: error.message, variant: "destructive" });
      setLocationStatus("");
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: async (locationData: { latitude?: number; longitude?: number; address?: string }) => {
      return apiRequest("POST", "/api/attendance/clock-out", locationData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
      toast({ title: "Clocked out successfully" });
      setLocationStatus("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to clock out", description: error.message, variant: "destructive" });
      setLocationStatus("");
    },
  });

  const leaveRequestForm = useForm<LeaveRequestForm>({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: {
      leaveType: "annual",
      startDate: "",
      endDate: "",
      reason: "",
    },
  });

  const createLeaveRequestMutation = useMutation({
    mutationFn: async (data: LeaveRequestForm) => apiRequest("POST", "/api/leave-requests", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leave-quota"] });
      toast({ title: "Leave request submitted" });
      setLeaveDialogOpen(false);
      leaveRequestForm.reset();
    },
    onError: (error: Error) => {
      let errorMessage = error.message;
      try {
        const jsonMatch = error.message.match(/\{.*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          errorMessage = parsed.message || error.message;
        }
      } catch {
        errorMessage = error.message;
      }
      toast({ title: "Failed to submit leave request", description: errorMessage, variant: "destructive" });
    },
  });

  const isQuotaExhausted = Boolean(leaveQuota && leaveQuota.leaveDaysRemaining <= 0);
  const isQuotaUnavailable = quotaLoading || quotaError || !leaveQuota;

  const handleClockAction = (action: "in" | "out") => {
    setLocationStatus("Fetching location...");
    if (!navigator.geolocation) {
      setLocationStatus("Location not supported");
      toast({ 
        title: "GPS Location Required", 
        description: "Your browser does not support location services. Please use a modern browser to clock in/out.",
        variant: "destructive"
      });
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const locationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setLocationStatus("Location captured");
        if (action === "in") {
          clockInMutation.mutate(locationData);
        } else {
          clockOutMutation.mutate(locationData);
        }
      },
      (error) => {
        setLocationStatus("Location denied");
        let errorMessage = "Please enable location services and try again.";
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = "Location permission denied. Please allow location access in your browser settings and refresh the page.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage = "Location unavailable. Please ensure GPS is enabled on your device.";
        } else if (error.code === error.TIMEOUT) {
          errorMessage = "Location request timed out. Please try again.";
        }
        toast({ 
          title: "GPS Location Required", 
          description: errorMessage,
          variant: "destructive"
        });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const pendingTasks = tasks.filter((t) => t.status === "pending");
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");
  const completedTasks = tasks.filter((t) => t.status === "completed");
  const activeTasks = [...pendingTasks, ...inProgressTasks];

  const pendingLeaves = leaveRequests.filter((l) => l.status === "pending");
  const approvedLeaves = leaveRequests.filter((l) => l.status === "approved");

  const isClockedIn = todayAttendance?.clockInTime && !todayAttendance?.clockOutTime;
  const isClockedOut = todayAttendance?.clockOutTime;

  const getLeaveStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" data-testid={`badge-leave-status-${status}`}>Pending</Badge>;
      case "approved":
        return <Badge variant="default" className="bg-green-600" data-testid={`badge-leave-status-${status}`}>Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive" data-testid={`badge-leave-status-${status}`}>Rejected</Badge>;
      default:
        return <Badge variant="outline" data-testid={`badge-leave-status-${status}`}>{status}</Badge>;
    }
  };

  return (
    <DashboardLayout title="Staff Dashboard">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <StatCard title="Pending Tasks" value={pendingTasks.length} icon={<Clock className="h-4 w-4" />} description="Awaiting start" />
          <StatCard title="In Progress" value={inProgressTasks.length} icon={<ClipboardList className="h-4 w-4" />} description="Currently working" />
          <StatCard title="Completed" value={completedTasks.length} icon={<CheckCircle className="h-4 w-4" />} description="All time" />
          <StatCard title="Leave Requests" value={pendingLeaves.length} icon={<Calendar className="h-4 w-4" />} description="Pending approval" />
          <StatCard 
            title="Leave Days" 
            value={quotaLoading ? "-" : (leaveQuota ? `${leaveQuota.leaveDaysRemaining}/${leaveQuota.leaveDaysQuota}` : "N/A")} 
            icon={<Calendar className="h-4 w-4" />} 
            description={isQuotaExhausted ? "Quota exhausted" : "Days remaining"} 
          />
        </div>
        
        {isQuotaExhausted && (
          <Alert variant="destructive" data-testid="leave-quota-exhausted-banner">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Leave Quota Exhausted</AlertTitle>
            <AlertDescription>
              You have used all your allocated leave days. Any additional leave requests will be unpaid.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Attendance
              </CardTitle>
              <CardDescription>Clock in and out for today</CardDescription>
            </CardHeader>
            <CardContent>
              {attendanceLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-md bg-muted/50">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Today's Status</p>
                      <div className="flex items-center gap-2">
                        {!todayAttendance ? (
                          <Badge variant="outline">Not Clocked In</Badge>
                        ) : isClockedOut ? (
                          <Badge variant="default" className="bg-green-600">Day Completed</Badge>
                        ) : isClockedIn ? (
                          <Badge variant="default">Currently Working</Badge>
                        ) : null}
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      {todayAttendance?.clockInTime && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">In:</span>{" "}
                          {format(new Date(todayAttendance.clockInTime), "h:mm a")}
                        </p>
                      )}
                      {todayAttendance?.clockOutTime && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Out:</span>{" "}
                          {format(new Date(todayAttendance.clockOutTime), "h:mm a")}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {locationStatus && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {locationStatus}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex gap-4">
              <Button
                onClick={() => handleClockAction("in")}
                disabled={!!todayAttendance || clockInMutation.isPending}
                className="flex-1"
                data-testid="button-clock-in"
              >
                {clockInMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <LogIn className="h-4 w-4 mr-2" />
                )}
                Clock In
              </Button>
              <Button
                onClick={() => handleClockAction("out")}
                disabled={!isClockedIn || clockOutMutation.isPending}
                variant="outline"
                className="flex-1"
                data-testid="button-clock-out"
              >
                {clockOutMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <LogOut className="h-4 w-4 mr-2" />
                )}
                Clock Out
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Leave Requests
                </CardTitle>
                <CardDescription>Your recent leave requests</CardDescription>
              </div>
              <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" disabled={isQuotaExhausted || isQuotaUnavailable} data-testid="button-new-leave-request">New Request</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Request Leave</DialogTitle>
                    <DialogDescription>Submit a new leave request for approval</DialogDescription>
                  </DialogHeader>
                  
                  {quotaLoading ? (
                    <Skeleton className="h-12 w-full" />
                  ) : leaveQuota ? (
                    <div className="p-3 rounded-md bg-muted/50 space-y-1" data-testid="leave-quota-display">
                      <p className="text-sm text-muted-foreground">Leave Quota</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {leaveQuota.leaveDaysRemaining} / {leaveQuota.leaveDaysQuota} days remaining
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({leaveQuota.leaveDaysUsed} used)
                        </span>
                      </div>
                    </div>
                  ) : null}
                  
                  {isQuotaExhausted && (
                    <Alert variant="destructive" data-testid="leave-quota-exhausted-alert">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Leave Quota Exhausted</AlertTitle>
                      <AlertDescription>
                        You have used all your allocated leave days. Any additional leave requests will be unpaid.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <Form {...leaveRequestForm}>
                    <form onSubmit={leaveRequestForm.handleSubmit((data) => createLeaveRequestMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={leaveRequestForm.control}
                        name="leaveType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Leave Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-leave-type">
                                  <SelectValue placeholder="Select leave type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="annual">Annual Leave</SelectItem>
                                <SelectItem value="sick">Sick Leave</SelectItem>
                                <SelectItem value="personal">Personal Leave</SelectItem>
                                <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={leaveRequestForm.control}
                          name="startDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Start Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} data-testid="input-leave-start-date" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={leaveRequestForm.control}
                          name="endDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>End Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} data-testid="input-leave-end-date" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={leaveRequestForm.control}
                        name="reason"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Reason (Optional)</FormLabel>
                            <FormControl>
                              <Textarea {...field} placeholder="Provide a reason for your leave request" data-testid="input-leave-reason" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={createLeaveRequestMutation.isPending} data-testid="button-submit-leave-request">
                        {createLeaveRequestMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        Submit Request
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {leavesLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (<Skeleton key={i} className="h-12 w-full" />))}
                </div>
              ) : leaveRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No leave requests yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {leaveRequests.slice(0, 4).map((leave) => (
                    <div key={leave.id} className="flex items-center justify-between p-3 rounded-md bg-muted/50" data-testid={`leave-request-${leave.id}`}>
                      <div className="space-y-1">
                        <p className="text-sm font-medium capitalize">{leave.leaveType} Leave</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(leave.startDate), "MMM d")} - {format(new Date(leave.endDate), "MMM d, yyyy")}
                        </p>
                      </div>
                      {getLeaveStatusBadge(leave.status)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
              <div><CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" />My Tasks</CardTitle><CardDescription>Tasks assigned to you</CardDescription></div>
              <Button variant="outline" onClick={() => setLocation("/staff/tasks")} data-testid="button-view-all-tasks">View All</Button>
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <div className="space-y-4">{[1, 2, 3].map((i) => (<Card key={i}><CardContent className="p-6 space-y-4"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-4 w-1/4" /></CardContent></Card>))}</div>
              ) : activeTasks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground"><ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" /><p className="text-lg font-medium">No active tasks</p><p className="text-sm">You're all caught up!</p></div>
              ) : (
                <div className="space-y-4">
                  {activeTasks.slice(0, 5).map((task) => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      onStart={() => updateTaskMutation.mutate({ taskId: task.id, status: "in_progress" })}
                      onComplete={() => updateTaskMutation.mutate({ taskId: task.id, status: "completed" })}
                      onViewBooking={() => setLocation(`/staff/chat/${task.booking.chat?.id}`)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5" />
                  Announcements
                </CardTitle>
                <CardDescription>Broadcast notifications from admin</CardDescription>
              </div>
              <Button variant="outline" onClick={() => setLocation("/staff/notifications")} data-testid="button-view-all-broadcasts">View All</Button>
            </CardHeader>
            <CardContent>
              {broadcastsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (<Skeleton key={i} className="h-16 w-full" />))}
                </div>
              ) : broadcasts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No announcements</p>
                  <p className="text-sm">Check back later for updates</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {broadcasts.slice(0, 4).map((broadcast) => (
                    <div 
                      key={broadcast.id} 
                      className="p-3 rounded-md bg-muted/50 space-y-2 hover-elevate cursor-pointer"
                      onClick={() => {
                        setSelectedBroadcast(broadcast);
                        setBroadcastPopupOpen(true);
                      }}
                      data-testid={`broadcast-item-${broadcast.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{broadcast.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">{broadcast.content}</p>
                        </div>
                        {!broadcast.read && (
                          <Badge variant="default" className="shrink-0">New</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{format(new Date(broadcast.createdAt), "MMM d, yyyy")}</span>
                        {broadcast.attachments && broadcast.attachments.length > 0 && (
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {broadcast.attachments.length} attachment{broadcast.attachments.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={broadcastPopupOpen} onOpenChange={(open) => {
        if (!open) handleCloseBroadcastPopup();
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              {selectedBroadcast?.title || "Announcement"}
            </DialogTitle>
            <DialogDescription>
              {selectedBroadcast && format(new Date(selectedBroadcast.createdAt), "MMMM d, yyyy 'at' h:mm a")}
            </DialogDescription>
          </DialogHeader>
          
          {selectedBroadcast && (
            <div className="space-y-4">
              <div className="text-sm whitespace-pre-wrap">{selectedBroadcast.content}</div>
              
              {selectedBroadcast.attachments && selectedBroadcast.attachments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Attachments</p>
                  <div className="grid grid-cols-1 gap-2">
                    {selectedBroadcast.attachments.map((url, idx) => {
                      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                      const isVideo = /\.(mp4|webm|mov)$/i.test(url);
                      
                      if (isImage) {
                        return (
                          <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block">
                            <img src={url} alt={`Attachment ${idx + 1}`} className="rounded-md max-h-48 object-cover" />
                          </a>
                        );
                      }
                      
                      if (isVideo) {
                        return (
                          <video key={idx} src={url} controls className="rounded-md max-h-48 w-full" />
                        );
                      }
                      
                      return (
                        <a 
                          key={idx} 
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 rounded-md bg-muted/50 hover-elevate text-sm"
                        >
                          {getAttachmentIcon(url)}
                          <span className="truncate">Attachment {idx + 1}</span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
              
              <Button onClick={handleCloseBroadcastPopup} className="w-full" data-testid="button-close-broadcast">
                Got It
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
