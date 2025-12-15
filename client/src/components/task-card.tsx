import { Calendar, Clock, User, CheckCircle, Circle, PlayCircle, ClipboardList, Paperclip, FileText, Image } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { TaskWithDetails, TaskStatus } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface TaskCardProps {
  task: TaskWithDetails;
  onStart?: () => void;
  onComplete?: () => void;
  onViewBooking?: () => void;
}

function getStatusBadgeVariant(status: TaskStatus) {
  switch (status) {
    case "pending":
      return "secondary";
    case "in_progress":
      return "default";
    case "completed":
      return "outline";
    default:
      return "secondary";
  }
}

function getStatusIcon(status: TaskStatus) {
  switch (status) {
    case "pending":
      return <Circle className="h-4 w-4" />;
    case "in_progress":
      return <PlayCircle className="h-4 w-4" />;
    case "completed":
      return <CheckCircle className="h-4 w-4" />;
    default:
      return <Circle className="h-4 w-4" />;
  }
}

function getStatusLabel(status: TaskStatus) {
  return status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function TaskCard({ task, onStart, onComplete, onViewBooking }: TaskCardProps) {
  const isInternalTask = !task.booking;
  const taskTitle = task.title || (task.booking?.service?.name) || "Internal Task";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{taskTitle}</CardTitle>
              {isInternalTask && (
                <Badge variant="outline" className="text-xs">
                  <ClipboardList className="h-3 w-3 mr-1" />
                  Internal
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
            </div>
          </div>
          <Badge variant={getStatusBadgeVariant(task.status as TaskStatus)} className="flex items-center gap-1">
            {getStatusIcon(task.status as TaskStatus)}
            {getStatusLabel(task.status as TaskStatus)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{task.description}</p>

        {task.attachments && task.attachments.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Paperclip className="h-3 w-3" />
              <span>{task.attachments.length} attachment{task.attachments.length > 1 ? "s" : ""}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {task.attachments.map((url, index) => {
                const isPdf = url.toLowerCase().includes(".pdf") || url.includes("/raw/");
                return (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-primary hover:underline"
                    data-testid={`link-attachment-${task.id}-${index}`}
                  >
                    {isPdf ? <FileText className="h-4 w-4" /> : <Image className="h-4 w-4" />}
                    {isPdf ? "PDF" : "Image"} {index + 1}
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {task.booking?.customer && (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-secondary">
                {getInitials(task.booking.customer.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{task.booking.customer.name}</p>
              <p className="text-xs text-muted-foreground">Customer</p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {task.status === "pending" && onStart && (
            <Button 
              size="sm" 
              onClick={onStart}
              data-testid={`button-start-task-${task.id}`}
            >
              <PlayCircle className="mr-2 h-4 w-4" />
              Start Task
            </Button>
          )}
          {task.status === "in_progress" && onComplete && (
            <Button 
              size="sm" 
              onClick={onComplete}
              data-testid={`button-complete-task-${task.id}`}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Complete
            </Button>
          )}
          {task.booking && onViewBooking && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={onViewBooking}
              data-testid={`button-view-booking-${task.id}`}
            >
              <Calendar className="mr-2 h-4 w-4" />
              View Booking
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
