import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ClipboardList, Search } from "lucide-react";
import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { TaskCard } from "@/components/task-card";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAuthHeader } from "@/lib/auth";
import type { TaskWithDetails } from "@shared/schema";

export default function AdminTasksPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: tasks = [], isLoading } = useQuery<TaskWithDetails[]>({
    queryKey: ["/api/admin/tasks"],
    queryFn: async () => {
      const res = await fetch("/api/admin/tasks", { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
  });

  const pendingTasks = tasks.filter((t) => t.status === "pending");
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");
  const completedTasks = tasks.filter((t) => t.status === "completed");

  const filterTasks = (list: TaskWithDetails[]) => list.filter((t) => t.booking.service.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.staff.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const renderTasksList = (list: TaskWithDetails[]) => {
    if (list.length === 0) {
      return (<div className="text-center py-16 text-muted-foreground"><ClipboardList className="h-16 w-16 mx-auto mb-4 opacity-50" /><p className="text-lg font-medium">{searchQuery ? "No tasks found" : "No tasks"}</p></div>);
    }
    return (<div className="space-y-4">{list.map((task) => (<TaskCard key={task.id} task={task} onViewBooking={() => setLocation(`/admin/bookings`)} />))}</div>);
  };

  return (
    <DashboardLayout title="All Tasks">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search tasks..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" data-testid="input-search-tasks" />
        </div>

        {isLoading ? (
          <div className="space-y-4">{[1, 2, 3].map((i) => (<Card key={i}><CardContent className="p-6 space-y-4"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-4 w-1/4" /></CardContent></Card>))}</div>
        ) : (
          <Tabs defaultValue="pending" className="space-y-6">
            <TabsList>
              <TabsTrigger value="pending" data-testid="tab-pending-tasks">Pending ({pendingTasks.length})</TabsTrigger>
              <TabsTrigger value="in_progress" data-testid="tab-in-progress-tasks">In Progress ({inProgressTasks.length})</TabsTrigger>
              <TabsTrigger value="completed" data-testid="tab-completed-tasks">Completed ({completedTasks.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="pending">{renderTasksList(filterTasks(pendingTasks))}</TabsContent>
            <TabsContent value="in_progress">{renderTasksList(filterTasks(inProgressTasks))}</TabsContent>
            <TabsContent value="completed">{renderTasksList(filterTasks(completedTasks))}</TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
