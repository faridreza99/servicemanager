import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ClipboardList, Search, Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DashboardLayout } from "@/components/dashboard-layout";
import { TaskCard } from "@/components/task-card";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeader } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { TaskWithDetails, User } from "@shared/schema";

const createTaskSchema = z.object({
  staffId: z.string().min(1, "Please select a staff member"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
});

type CreateTaskForm = z.infer<typeof createTaskSchema>;

export default function AdminTasksPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<CreateTaskForm>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      staffId: "",
      title: "",
      description: "",
    },
  });

  const { data: tasks = [], isLoading } = useQuery<TaskWithDetails[]>({
    queryKey: ["/api/tasks"],
    queryFn: async () => {
      const res = await fetch("/api/tasks", { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
  });

  const { data: staffUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users/staff"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users/staff", { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to fetch staff");
      return res.json();
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: CreateTaskForm) => {
      return apiRequest("POST", "/api/tasks", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task created", description: "The task has been assigned to the staff member." });
      setDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create task", variant: "destructive" });
    },
  });

  const onSubmit = (data: CreateTaskForm) => {
    createTaskMutation.mutate(data);
  };

  const pendingTasks = tasks.filter((t) => t.status === "pending");
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");
  const completedTasks = tasks.filter((t) => t.status === "completed");

  const filterTasks = (list: TaskWithDetails[]) =>
    list.filter((t) => {
      const serviceName = t.booking?.service?.name?.toLowerCase() || "";
      const taskTitle = t.title?.toLowerCase() || "";
      const staffName = t.staff?.name?.toLowerCase() || "";
      const query = searchQuery.toLowerCase();
      return serviceName.includes(query) || taskTitle.includes(query) || staffName.includes(query);
    });

  const renderTasksList = (list: TaskWithDetails[]) => {
    if (list.length === 0) {
      return (
        <div className="text-center py-16 text-muted-foreground">
          <ClipboardList className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">{searchQuery ? "No tasks found" : "No tasks"}</p>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        {list.map((task) => (
          <TaskCard key={task.id} task={task} onViewBooking={() => setLocation(`/admin/bookings`)} />
        ))}
      </div>
    );
  };

  return (
    <DashboardLayout title="All Tasks">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-tasks"
            />
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-task">
                <Plus className="h-4 w-4 mr-2" />
                Create Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Internal Task</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="staffId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assign to Staff</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-staff">
                              <SelectValue placeholder="Select a staff member" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {staffUsers.map((staff) => (
                              <SelectItem key={staff.id} value={staff.id} data-testid={`option-staff-${staff.id}`}>
                                {staff.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Task title" {...field} data-testid="input-task-title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the task..."
                            {...field}
                            data-testid="input-task-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                      data-testid="button-cancel-task"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createTaskMutation.isPending} data-testid="button-submit-task">
                      {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6 space-y-4">
                  <Skeleton className="h-6 w-1/2" />
                  <Skeleton className="h-4 w-1/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Tabs defaultValue="pending" className="space-y-6">
            <TabsList>
              <TabsTrigger value="pending" data-testid="tab-pending-tasks">
                Pending ({pendingTasks.length})
              </TabsTrigger>
              <TabsTrigger value="in_progress" data-testid="tab-in-progress-tasks">
                In Progress ({inProgressTasks.length})
              </TabsTrigger>
              <TabsTrigger value="completed" data-testid="tab-completed-tasks">
                Completed ({completedTasks.length})
              </TabsTrigger>
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
