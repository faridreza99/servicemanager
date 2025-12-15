import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { MessageSquare, ArrowRight } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination, usePagination } from "@/components/pagination";
import { getAuthHeader } from "@/lib/auth";
import type { TaskWithDetails } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function StaffChatsPage() {
  const [, setLocation] = useLocation();

  const { data: tasks = [], isLoading } = useQuery<TaskWithDetails[]>({
    queryKey: ["/api/tasks"],
    queryFn: async () => {
      const res = await fetch("/api/tasks", { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
  });

  const tasksWithChats = tasks.filter((t) => t.booking.chat);
  const openChats = tasksWithChats.filter((t) => t.booking.chat?.isOpen);
  const closedChats = tasksWithChats.filter((t) => !t.booking.chat?.isOpen);

  const openChatsPagination = usePagination(openChats, 10);
  const closedChatsPagination = usePagination(closedChats, 10);

  useEffect(() => {
    if (openChatsPagination.currentPage > openChatsPagination.totalPages && openChatsPagination.totalPages > 0) {
      openChatsPagination.onPageChange(openChatsPagination.totalPages);
    } else if (openChatsPagination.totalPages === 0) {
      openChatsPagination.onPageChange(1);
    }
  }, [openChats.length]);

  useEffect(() => {
    if (closedChatsPagination.currentPage > closedChatsPagination.totalPages && closedChatsPagination.totalPages > 0) {
      closedChatsPagination.onPageChange(closedChatsPagination.totalPages);
    } else if (closedChatsPagination.totalPages === 0) {
      closedChatsPagination.onPageChange(1);
    }
  }, [closedChats.length]);

  return (
    <DashboardLayout title="Chats">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">Open Conversations ({openChats.length})</h2>
          {isLoading ? (
            <div className="space-y-4">{[1, 2].map((i) => (<Card key={i}><CardContent className="p-6"><Skeleton className="h-6 w-1/2 mb-2" /><Skeleton className="h-4 w-1/4" /></CardContent></Card>))}</div>
          ) : openChats.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground"><MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" /><p className="text-lg font-medium">No open conversations</p><p className="text-sm">Chats will appear here when you're assigned to tasks</p></CardContent></Card>
          ) : (
            <>
              <div className="space-y-4">
                {openChatsPagination.paginatedItems.map((task) => (
                  <Card key={task.id} className="hover-elevate cursor-pointer" onClick={() => setLocation(`/staff/chat/${task.booking.chat?.id}`)} data-testid={`chat-card-${task.booking.chat?.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10"><AvatarFallback>{getInitials(task.booking.customer.name)}</AvatarFallback></Avatar>
                          <div><p className="font-medium">{task.booking.service.name}</p><p className="text-sm text-muted-foreground">{task.booking.customer.name} - {formatDistanceToNow(new Date(task.booking.chat?.createdAt || ""), { addSuffix: true })}</p></div>
                        </div>
                        <div className="flex items-center gap-2"><Badge variant="default">Active</Badge><ArrowRight className="h-4 w-4 text-muted-foreground" /></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {openChatsPagination.totalPages > 1 && (
                <Pagination
                  currentPage={openChatsPagination.currentPage}
                  totalPages={openChatsPagination.totalPages}
                  pageSize={openChatsPagination.pageSize}
                  totalItems={openChatsPagination.totalItems}
                  onPageChange={openChatsPagination.onPageChange}
                  onPageSizeChange={openChatsPagination.onPageSizeChange}
                />
              )}
            </>
          )}
        </div>

        {closedChats.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Closed Conversations ({closedChats.length})</h2>
            <div className="space-y-4">
              {closedChatsPagination.paginatedItems.map((task) => (
                <Card key={task.id} className="opacity-75" data-testid={`chat-card-closed-${task.booking.chat?.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10"><AvatarFallback className="bg-muted">{getInitials(task.booking.customer.name)}</AvatarFallback></Avatar>
                        <div><p className="font-medium">{task.booking.service.name}</p><p className="text-sm text-muted-foreground">{task.booking.customer.name}</p></div>
                      </div>
                      <Badge variant="secondary">Closed</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {closedChatsPagination.totalPages > 1 && (
              <Pagination
                currentPage={closedChatsPagination.currentPage}
                totalPages={closedChatsPagination.totalPages}
                pageSize={closedChatsPagination.pageSize}
                totalItems={closedChatsPagination.totalItems}
                onPageChange={closedChatsPagination.onPageChange}
                onPageSizeChange={closedChatsPagination.onPageSizeChange}
              />
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
