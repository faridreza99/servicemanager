import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ClipboardList, MessageSquare, CheckCircle, Clock } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatCard } from "@/components/stat-card";
import { TaskCard } from "@/components/task-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeader } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { TaskWithDetails } from "@shared/schema";

export default function StaffDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: tasks = [], isLoading } = useQuery<TaskWithDetails[]>({
    queryKey: ["/api/tasks"],
    queryFn: async () => {
      const res = await fetch("/api/tasks", { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => apiRequest("PATCH", `/api/tasks/${taskId}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task updated" });
    },
    onError: (error: Error) => toast({ title: "Failed to update task", description: error.message, variant: "destructive" }),
  });

  const pendingTasks = tasks.filter((t) => t.status === "pending");
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");
  const completedTasks = tasks.filter((t) => t.status === "completed");
  const activeTasks = [...pendingTasks, ...inProgressTasks];

  return (
    <DashboardLayout title="Staff Dashboard">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Pending Tasks" value={pendingTasks.length} icon={<Clock className="h-4 w-4" />} description="Awaiting start" />
          <StatCard title="In Progress" value={inProgressTasks.length} icon={<ClipboardList className="h-4 w-4" />} description="Currently working" />
          <StatCard title="Completed" value={completedTasks.length} icon={<CheckCircle className="h-4 w-4" />} description="All time" />
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
            <div><CardTitle>My Tasks</CardTitle><CardDescription>Tasks assigned to you</CardDescription></div>
            <Button variant="outline" onClick={() => setLocation("/staff/tasks")} data-testid="button-view-all-tasks">View All</Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
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
      </div>
    </DashboardLayout>
  );
}
