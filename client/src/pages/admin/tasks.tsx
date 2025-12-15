import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ClipboardList, Search, Plus, Upload, X, FileText, Image, Check, ChevronsUpDown } from "lucide-react";
import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DashboardLayout } from "@/components/dashboard-layout";
import { TaskCard } from "@/components/task-card";
import { Pagination, usePagination } from "@/components/pagination";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeader } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { TaskWithDetails, User } from "@shared/schema";
import { cn } from "@/lib/utils";

const createTaskSchema = z.object({
  staffIds: z.array(z.string()).min(1, "Please select at least one staff member"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
});

type CreateTaskForm = z.infer<typeof createTaskSchema>;

interface UploadedFile {
  url: string;
  name: string;
  type: "image" | "pdf";
}

export default function AdminTasksPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const form = useForm<CreateTaskForm>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      staffIds: [],
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newFiles: UploadedFile[] = [];

    for (const file of Array.from(files)) {
      const isImage = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf";

      if (!isImage && !isPdf) {
        toast({
          title: "Invalid file type",
          description: "Only images and PDFs are allowed",
          variant: "destructive",
        });
        continue;
      }

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload/cloudinary", {
          method: "POST",
          headers: getAuthHeader(),
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        const result = await response.json();
        newFiles.push({
          url: result.url,
          name: file.name,
          type: isImage ? "image" : "pdf",
        });
      } catch {
        toast({
          title: "Upload failed",
          description: `Failed to upload ${file.name}`,
          variant: "destructive",
        });
      }
    }

    setUploadedFiles((prev) => [...prev, ...newFiles]);
    setIsUploading(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const createTaskMutation = useMutation({
    mutationFn: async (data: CreateTaskForm) => {
      const payload = {
        staffIds: data.staffIds,
        title: data.title,
        description: data.description,
        attachments: uploadedFiles.map((f) => f.url),
      };
      return apiRequest("POST", "/api/tasks", payload);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      const count = variables.staffIds.length;
      toast({ 
        title: count > 1 ? "Tasks created" : "Task created", 
        description: count > 1 
          ? `The task has been assigned to ${count} staff members.`
          : "The task has been assigned to the staff member."
      });
      setDialogOpen(false);
      form.reset();
      setUploadedFiles([]);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create task", variant: "destructive" });
    },
  });

  const onSubmit = (data: CreateTaskForm) => {
    createTaskMutation.mutate(data);
  };

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      form.reset();
      setUploadedFiles([]);
    }
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

  const filteredPending = filterTasks(pendingTasks);
  const filteredInProgress = filterTasks(inProgressTasks);
  const filteredCompleted = filterTasks(completedTasks);

  const pendingPagination = usePagination(filteredPending, 10);
  const inProgressPagination = usePagination(filteredInProgress, 10);
  const completedPagination = usePagination(filteredCompleted, 10);

  const renderTasksList = (list: TaskWithDetails[], pagination: ReturnType<typeof usePagination<TaskWithDetails>>) => {
    if (list.length === 0) {
      return (
        <div className="text-center py-16 text-muted-foreground">
          <ClipboardList className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">{searchQuery ? "No tasks found" : "No tasks"}</p>
        </div>
      );
    }
    return (
      <>
        <div className="space-y-4">
          {pagination.paginatedItems.map((task) => (
            <TaskCard key={task.id} task={task} onViewBooking={() => setLocation(`/admin/bookings`)} />
          ))}
        </div>
        {list.length > 10 && (
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            pageSize={pagination.pageSize}
            totalItems={pagination.totalItems}
            onPageChange={pagination.onPageChange}
            onPageSizeChange={pagination.onPageSizeChange}
          />
        )}
      </>
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
          <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-task">
                <Plus className="h-4 w-4 mr-2" />
                Create Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Internal Task</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="staffIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assign to Staff</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                  "w-full justify-between",
                                  !field.value.length && "text-muted-foreground"
                                )}
                                data-testid="select-staff"
                              >
                                {field.value.length > 0
                                  ? `${field.value.length} staff selected`
                                  : "Select staff members"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-2" align="start">
                            <div className="space-y-1 max-h-60 overflow-y-auto">
                              {staffUsers.map((staff) => {
                                const isSelected = field.value.includes(staff.id);
                                return (
                                  <div
                                    key={staff.id}
                                    className="flex items-center gap-2 p-2 rounded-md hover-elevate cursor-pointer"
                                    onClick={() => {
                                      const newValue = isSelected
                                        ? field.value.filter((id) => id !== staff.id)
                                        : [...field.value, staff.id];
                                      field.onChange(newValue);
                                    }}
                                    data-testid={`option-staff-${staff.id}`}
                                  >
                                    <Checkbox
                                      checked={isSelected}
                                      className="pointer-events-none"
                                    />
                                    <span className="text-sm">{staff.name}</span>
                                  </div>
                                );
                              })}
                              {staffUsers.length === 0 && (
                                <div className="text-sm text-muted-foreground p-2">No staff members found</div>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                        {field.value.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {field.value.map((staffId) => {
                              const staff = staffUsers.find((s) => s.id === staffId);
                              return (
                                <Badge
                                  key={staffId}
                                  variant="secondary"
                                  className="text-xs"
                                  data-testid={`badge-staff-${staffId}`}
                                >
                                  {staff?.name}
                                  <X
                                    className="ml-1 h-3 w-3 cursor-pointer"
                                    onClick={() => {
                                      field.onChange(field.value.filter((id) => id !== staffId));
                                    }}
                                  />
                                </Badge>
                              );
                            })}
                          </div>
                        )}
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

                  <div className="space-y-2">
                    <FormLabel>Attachments (Photos/PDFs)</FormLabel>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,.pdf"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                        data-testid="input-file-upload"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        data-testid="button-add-attachment"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {isUploading ? "Uploading..." : "Add Files"}
                      </Button>
                    </div>

                    {uploadedFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {uploadedFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-md text-sm"
                            data-testid={`attachment-${index}`}
                          >
                            {file.type === "image" ? (
                              <Image className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="max-w-[150px] truncate">{file.name}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => removeFile(index)}
                              data-testid={`button-remove-attachment-${index}`}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleDialogChange(false)}
                      data-testid="button-cancel-task"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createTaskMutation.isPending || isUploading}
                      data-testid="button-submit-task"
                    >
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
            <TabsContent value="pending">{renderTasksList(filteredPending, pendingPagination)}</TabsContent>
            <TabsContent value="in_progress">{renderTasksList(filteredInProgress, inProgressPagination)}</TabsContent>
            <TabsContent value="completed">{renderTasksList(filteredCompleted, completedPagination)}</TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
