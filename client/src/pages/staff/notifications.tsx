import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Bell, Check, CheckCheck, Filter, Paperclip } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pagination, usePagination } from "@/components/pagination";
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

export default function StaffNotificationsPage() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<NotificationFilter>("all");

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

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

  useEffect(() => {
    if (pagination.currentPage > pagination.totalPages && pagination.totalPages > 0) {
      pagination.onPageChange(pagination.totalPages);
    }
  }, [filteredNotifications.length]);

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
                Stay updated with your task and message alerts
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
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
    </DashboardLayout>
  );
}
