import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { Bell, Check, CheckCheck, Filter, Send, Upload, X, Loader2, FileText, Image as ImageIcon, Video, Paperclip } from "lucide-react";
import { Pagination, usePagination } from "@/components/pagination";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import type { Notification } from "@shared/schema";

type NotificationFilter = "all" | "unread" | "read";

const notificationTypeColors: Record<string, string> = {
  booking: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  message: "bg-green-500/10 text-green-600 dark:text-green-400",
  task: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  approval: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
};

interface AttachmentFile {
  url: string;
  name: string;
  type: string;
}

export default function AdminNotificationsPage() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [broadcastDialogOpen, setBroadcastDialogOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastContent, setBroadcastContent] = useState("");
  const [targetRole, setTargetRole] = useState<"customer" | "staff" | "all">("customer");
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  const broadcastMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/notifications/broadcast", {
        title: broadcastTitle,
        content: broadcastContent,
        targetRole,
        attachments: attachments.map(a => a.url),
      });
    },
    onSuccess: async (res) => {
      const data = await res.json();
      toast({ title: "Notification Sent", description: data.message });
      setBroadcastDialogOpen(false);
      setBroadcastTitle("");
      setBroadcastContent("");
      setAttachments([]);
      setTargetRole("customer");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send notification", variant: "destructive" });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        
        const token = localStorage.getItem("token");
        const res = await fetch("/api/upload/cloudinary", {
          method: "POST",
          headers: token ? { "Authorization": `Bearer ${token}` } : {},
          body: formData,
        });

        if (!res.ok) throw new Error("Upload failed");

        const data = await res.json();
        setAttachments(prev => [...prev, {
          url: data.url,
          name: file.name,
          type: file.type,
        }]);
      }
      toast({ title: "Files uploaded successfully" });
    } catch {
      toast({ title: "Failed to upload files", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="h-4 w-4" />;
    if (type.startsWith("video/")) return <Video className="h-4 w-4" />;
    if (type.includes("pdf")) return <FileText className="h-4 w-4" />;
    return <Paperclip className="h-4 w-4" />;
  };

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to mark notification as read", variant: "destructive" });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/notifications/mark-all-read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({ title: "Success", description: "All notifications marked as read" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to mark all as read", variant: "destructive" });
    },
  });

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "read") return n.read;
    return true;
  });

  const pagination = usePagination(filteredNotifications, 10);

  useEffect(() => {
    pagination.onPageChange(1);
  }, [filter]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <DashboardLayout title="Notifications">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {unreadCount} unread
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Stay updated with system notifications
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setBroadcastDialogOpen(true)}
                data-testid="button-broadcast-notification"
              >
                <Send className="h-4 w-4 mr-2" />
                Broadcast
              </Button>
              <Select value={filter} onValueChange={(v) => setFilter(v as NotificationFilter)}>
                <SelectTrigger className="w-[140px]" data-testid="select-notification-filter">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                </SelectContent>
              </Select>
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  onClick={() => markAllReadMutation.mutate()}
                  disabled={markAllReadMutation.isPending}
                  data-testid="button-mark-all-read"
                >
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Mark All Read
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start gap-4 p-4 rounded-lg border">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No notifications</p>
                <p className="text-sm">
                  {filter === "unread"
                    ? "You're all caught up!"
                    : filter === "read"
                    ? "No read notifications"
                    : "No notifications yet"}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {pagination.paginatedItems.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                      notification.read
                        ? "bg-background"
                        : "bg-accent/30 border-accent"
                    }`}
                    data-testid={`notification-item-${notification.id}`}
                  >
                    <div
                      className={`flex items-center justify-center h-10 w-10 rounded-full ${
                        notificationTypeColors[notification.type] || "bg-muted"
                      }`}
                    >
                      <Bell className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{notification.title}</p>
                        <Badge
                          variant="outline"
                          className={notificationTypeColors[notification.type]}
                        >
                          {notification.type}
                        </Badge>
                        {!notification.read && (
                          <Badge variant="secondary" className="text-xs">
                            New
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.content}
                      </p>
                      {notification.attachments && notification.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {notification.attachments.map((url, idx) => (
                            <a
                              key={idx}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-primary hover:underline"
                              data-testid={`link-attachment-${notification.id}-${idx}`}
                            >
                              <Paperclip className="h-3 w-3" />
                              Attachment {idx + 1}
                            </a>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    {!notification.read && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => markReadMutation.mutate(notification.id)}
                        disabled={markReadMutation.isPending}
                        data-testid={`button-mark-read-${notification.id}`}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                </div>
                {pagination.totalPages > 1 && (
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
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={broadcastDialogOpen} onOpenChange={setBroadcastDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Broadcast Notification</DialogTitle>
            <DialogDescription>
              Send a notification to multiple users with optional attachments
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="target">Send To</Label>
              <Select value={targetRole} onValueChange={(v) => setTargetRole(v as "customer" | "staff" | "all")}>
                <SelectTrigger data-testid="select-broadcast-target">
                  <SelectValue placeholder="Select recipients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">All Customers</SelectItem>
                  <SelectItem value="staff">All Staff</SelectItem>
                  <SelectItem value="all">Everyone (except admins)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Notification title..."
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                data-testid="input-broadcast-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Message</Label>
              <Textarea
                id="content"
                placeholder="Write your message here..."
                className="min-h-24"
                value={broadcastContent}
                onChange={(e) => setBroadcastContent(e.target.value)}
                data-testid="input-broadcast-content"
              />
            </div>
            <div className="space-y-2">
              <Label>Attachments</Label>
              {attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 rounded-md bg-muted"
                    >
                      <div className="flex items-center gap-2">
                        {getFileIcon(file.type)}
                        <span className="text-sm truncate max-w-[300px]">{file.name}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAttachment(index)}
                        data-testid={`button-remove-attachment-${index}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,.pdf,.doc,.docx"
                multiple
                className="hidden"
                onChange={handleFileUpload}
                data-testid="input-broadcast-attachments"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                data-testid="button-add-attachment"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Add Attachments
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                Supported: Images, videos, PDFs, and documents
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBroadcastDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => broadcastMutation.mutate()}
              disabled={!broadcastTitle || !broadcastContent || broadcastMutation.isPending}
              data-testid="button-send-broadcast"
            >
              {broadcastMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Notification
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
