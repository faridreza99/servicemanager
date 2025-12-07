import { Calendar, MessageSquare, User, Clock, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { BookingWithDetails, BookingStatus } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface BookingCardProps {
  booking: BookingWithDetails;
  onChat?: () => void;
  onAssign?: () => void;
  onViewDetails?: () => void;
  showCustomer?: boolean;
  showAssignee?: boolean;
}

function getStatusBadgeVariant(status: BookingStatus) {
  switch (status) {
    case "pending":
      return "secondary";
    case "confirmed":
      return "default";
    case "in_progress":
      return "default";
    case "completed":
      return "outline";
    case "cancelled":
      return "destructive";
    default:
      return "secondary";
  }
}

function getStatusLabel(status: BookingStatus) {
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

function getStatusBorderColor(status: BookingStatus) {
  switch (status) {
    case "pending":
      return "border-l-yellow-500";
    case "confirmed":
      return "border-l-blue-500";
    case "in_progress":
      return "border-l-primary";
    case "completed":
      return "border-l-green-500";
    case "cancelled":
      return "border-l-destructive";
    default:
      return "border-l-muted";
  }
}

export function BookingCard({ 
  booking, 
  onChat, 
  onAssign, 
  onViewDetails,
  showCustomer = false,
  showAssignee = false,
}: BookingCardProps) {
  return (
    <Card className={`border-l-4 ${getStatusBorderColor(booking.status as BookingStatus)}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{booking.service.name}</CardTitle>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(booking.createdAt), { addSuffix: true })}
            </div>
          </div>
          <Badge variant={getStatusBadgeVariant(booking.status as BookingStatus)}>
            {getStatusLabel(booking.status as BookingStatus)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showCustomer && booking.customer && (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-secondary">
                {getInitials(booking.customer.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{booking.customer.name}</p>
              <p className="text-xs text-muted-foreground">{booking.customer.email}</p>
            </div>
          </div>
        )}

        {showAssignee && (
          <div className="flex items-center gap-3">
            {booking.assignedStaff ? (
              <>
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                    {getInitials(booking.assignedStaff.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{booking.assignedStaff.name}</p>
                  <p className="text-xs text-muted-foreground">Assigned Staff</p>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span className="text-sm">Not assigned</span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {booking.chat?.isOpen && onChat && (
            <Button 
              size="sm" 
              onClick={onChat}
              data-testid={`button-chat-${booking.id}`}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Open Chat
            </Button>
          )}
          {onAssign && !booking.assignedStaff && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={onAssign}
              data-testid={`button-assign-${booking.id}`}
            >
              <User className="mr-2 h-4 w-4" />
              Assign Staff
            </Button>
          )}
          {onViewDetails && (
            <Button 
              size="sm" 
              variant="ghost"
              onClick={onViewDetails}
              data-testid={`button-view-${booking.id}`}
            >
              View Details
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
