import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAuthHeader } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Calendar, Check, X, Clock, Loader2 } from "lucide-react";
import type { LeaveRequestWithDetails } from "@shared/schema";
import { useState } from "react";

export default function AdminLeaveRequests() {
  const { toast } = useToast();
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequestWithDetails | null>(null);
  const [actionType, setActionType] = useState<"approved" | "rejected" | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const { data: requests = [], isLoading } = useQuery<LeaveRequestWithDetails[]>({
    queryKey: ["/api/admin/leave-requests"],
    queryFn: async () => {
      const res = await fetch("/api/admin/leave-requests", { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to fetch leave requests");
      return res.json();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, adminNotes }: { id: string; status: string; adminNotes?: string }) => {
      return apiRequest("PATCH", `/api/admin/leave-requests/${id}/status`, { status, adminNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leave-requests"] });
      toast({ title: `Leave request ${actionType}` });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update leave request", description: error.message, variant: "destructive" });
    },
  });

  const openActionDialog = (request: LeaveRequestWithDetails, action: "approved" | "rejected") => {
    setSelectedRequest(request);
    setActionType(action);
    setAdminNotes("");
  };

  const closeDialog = () => {
    setSelectedRequest(null);
    setActionType(null);
    setAdminNotes("");
  };

  const handleSubmit = () => {
    if (!selectedRequest || !actionType) return;
    updateStatusMutation.mutate({
      id: selectedRequest.id,
      status: actionType,
      adminNotes: adminNotes || undefined,
    });
  };

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const approvedRequests = requests.filter((r) => r.status === "approved");
  const rejectedRequests = requests.filter((r) => r.status === "rejected");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "approved":
        return <Badge variant="default" className="bg-green-600">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getLeaveTypeBadge = (type: string) => {
    return <Badge variant="outline" className="capitalize">{type}</Badge>;
  };

  const calculateDays = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return `${diff} day${diff > 1 ? "s" : ""}`;
  };

  return (
    <DashboardLayout title="Leave Requests">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{pendingRequests.length}</div>
              <p className="text-xs text-muted-foreground">Awaiting review</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <Check className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{approvedRequests.length}</div>
              <p className="text-xs text-muted-foreground">Total approved</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
              <X className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{rejectedRequests.length}</div>
              <p className="text-xs text-muted-foreground">Total rejected</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Leave Requests</CardTitle>
            <CardDescription>Manage staff leave requests</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No leave requests</p>
                <p className="text-sm">No requests have been submitted yet</p>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request.id} data-testid={`leave-request-row-${request.id}`}>
                        <TableCell className="font-medium">{request.staff?.name || "Unknown"}</TableCell>
                        <TableCell>{getLeaveTypeBadge(request.leaveType)}</TableCell>
                        <TableCell>{format(new Date(request.startDate), "MMM d, yyyy")}</TableCell>
                        <TableCell>{format(new Date(request.endDate), "MMM d, yyyy")}</TableCell>
                        <TableCell>{calculateDays(request.startDate, request.endDate)}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{request.reason || "-"}</TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>
                          {request.status === "pending" ? (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => openActionDialog(request, "approved")}
                                data-testid={`button-approve-${request.id}`}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => openActionDialog(request, "rejected")}
                                data-testid={`button-reject-${request.id}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              {request.approver?.name && `by ${request.approver.name}`}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!selectedRequest && !!actionType} onOpenChange={() => closeDialog()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === "approved" ? "Approve" : "Reject"} Leave Request
              </DialogTitle>
              <DialogDescription>
                {selectedRequest && (
                  <>
                    {selectedRequest.staff?.name}'s {selectedRequest.leaveType} leave request from{" "}
                    {format(new Date(selectedRequest.startDate), "MMM d")} to{" "}
                    {format(new Date(selectedRequest.endDate), "MMM d, yyyy")}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Admin Notes (Optional)</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add any notes for the staff member..."
                  data-testid="input-admin-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                variant={actionType === "rejected" ? "destructive" : "default"}
                disabled={updateStatusMutation.isPending}
                data-testid="button-confirm-action"
              >
                {updateStatusMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {actionType === "approved" ? "Approve" : "Reject"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
