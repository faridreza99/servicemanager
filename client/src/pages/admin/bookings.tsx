import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Search, Calendar, Loader2, User, Download } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { BookingCard } from "@/components/booking-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeader } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { User as UserType, BookingWithDetails } from "@shared/schema";

export default function AdminBookingsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");

  const { data: bookings = [], isLoading } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/bookings"],
    queryFn: async () => {
      const res = await fetch("/api/bookings", { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to fetch bookings");
      return res.json();
    },
  });

  const { data: staffUsers = [] } = useQuery<UserType[]>({
    queryKey: ["/api/admin/users/staff"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users/staff", { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to fetch staff");
      return res.json();
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ bookingId, staffId }: { bookingId: string; staffId: string }) => apiRequest("POST", `/api/bookings/${bookingId}/assign`, { staffId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({ title: "Staff assigned", description: "A task has been created for the assigned staff." });
      setAssignDialogOpen(false);
      setSelectedBooking(null);
      setSelectedStaffId("");
    },
    onError: (error: Error) => toast({ title: "Failed to assign staff", description: error.message, variant: "destructive" }),
  });

  const handleAssign = (booking: BookingWithDetails) => {
    setSelectedBooking(booking);
    setAssignDialogOpen(true);
  };

  const handleExport = async () => {
    try {
      const res = await fetch("/api/bookings/export", { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to export bookings");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bookings-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ title: "Export complete", description: "Bookings exported successfully." });
    } catch (error) {
      toast({ title: "Export failed", description: "Could not export bookings.", variant: "destructive" });
    }
  };

  const activeBookings = bookings.filter((b) => b.status !== "completed" && b.status !== "cancelled");
  const completedBookings = bookings.filter((b) => b.status === "completed" || b.status === "cancelled");

  const filterBookings = (list: BookingWithDetails[]) => list.filter((b) => b.service.name.toLowerCase().includes(searchQuery.toLowerCase()) || b.customer.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const renderBookingsList = (list: BookingWithDetails[]) => {
    if (list.length === 0) {
      return (<div className="text-center py-16 text-muted-foreground"><Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" /><p className="text-lg font-medium">{searchQuery ? "No bookings found" : "No bookings"}</p></div>);
    }
    return (<div className="space-y-4">{list.map((booking) => (<BookingCard key={booking.id} booking={booking} showCustomer showAssignee onChat={() => setLocation(`/admin/chat/${booking.chat?.id}`)} onAssign={() => handleAssign(booking)} />))}</div>);
  };

  return (
    <DashboardLayout title="Bookings">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search bookings..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" data-testid="input-search-bookings" />
          </div>
          <Button variant="outline" onClick={handleExport} disabled={bookings.length === 0} data-testid="button-export-bookings">
            <Download className="mr-2 h-4 w-4" />Export CSV
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">{[1, 2, 3].map((i) => (<Card key={i}><CardContent className="p-6 space-y-4"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-4 w-1/4" /></CardContent></Card>))}</div>
        ) : (
          <Tabs defaultValue="active" className="space-y-6">
            <TabsList><TabsTrigger value="active" data-testid="tab-active-bookings">Active ({activeBookings.length})</TabsTrigger><TabsTrigger value="completed" data-testid="tab-completed-bookings">Completed ({completedBookings.length})</TabsTrigger></TabsList>
            <TabsContent value="active">{renderBookingsList(filterBookings(activeBookings))}</TabsContent>
            <TabsContent value="completed">{renderBookingsList(filterBookings(completedBookings))}</TabsContent>
          </Tabs>
        )}

        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Assign Staff</DialogTitle><DialogDescription>Select a staff member to handle this booking for {selectedBooking?.service.name}</DialogDescription></DialogHeader>
            <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
              <SelectTrigger data-testid="select-staff"><SelectValue placeholder="Select staff member" /></SelectTrigger>
              <SelectContent>{staffUsers.map((staff) => (<SelectItem key={staff.id} value={staff.id}>{staff.name} ({staff.email})</SelectItem>))}</SelectContent>
            </Select>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => selectedBooking && selectedStaffId && assignMutation.mutate({ bookingId: selectedBooking.id, staffId: selectedStaffId })} disabled={assignMutation.isPending || !selectedStaffId} data-testid="button-confirm-assign">
                {assignMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Assigning...</> : <><User className="mr-2 h-4 w-4" />Assign</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
