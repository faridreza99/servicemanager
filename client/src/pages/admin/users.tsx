import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Search, UserCheck, Users, Loader2, Pencil, Trash2 } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Pagination, usePagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeader } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function AdminUsersPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState<string>("customer");
  const [editApproved, setEditApproved] = useState(false);
  const [editLeaveQuota, setEditLeaveQuota] = useState(0);

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users", { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (userId: string) => apiRequest("POST", `/api/admin/users/${userId}/approve`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User approved", description: "The user can now log in." });
      setApproveDialogOpen(false);
    },
    onError: (error: Error) => toast({ title: "Failed to approve user", description: error.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: { name?: string; email?: string; phone?: string; role?: string; approved?: boolean; leaveDaysQuota?: number } }) => 
      apiRequest("PATCH", `/api/admin/users/${userId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User updated", description: "User details have been updated." });
      setEditDialogOpen(false);
    },
    onError: (error: Error) => toast({ title: "Failed to update user", description: error.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => apiRequest("DELETE", `/api/admin/users/${userId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User deleted", description: "The user has been removed." });
      setDeleteDialogOpen(false);
    },
    onError: (error: Error) => toast({ title: "Failed to delete user", description: error.message, variant: "destructive" }),
  });

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditPhone(user.phone || "");
    setEditRole(user.role);
    setEditApproved(user.approved);
    setEditLeaveQuota(user.leaveDaysQuota || 0);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedUser) return;
    updateMutation.mutate({
      userId: selectedUser.id,
      data: {
        name: editName,
        email: editEmail,
        phone: editPhone || undefined,
        role: editRole,
        approved: editApproved,
        leaveDaysQuota: editLeaveQuota,
      },
    });
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const pendingUsers = users.filter((u) => !u.approved);
  const approvedUsers = users.filter((u) => u.approved);
  const filteredPending = pendingUsers.filter((u) => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredApproved = approvedUsers.filter((u) => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()));

  const pendingPagination = usePagination(filteredPending, 10);
  const approvedPagination = usePagination(filteredApproved, 10);

  const renderUserList = (list: User[], showApproveButton: boolean, pagination: ReturnType<typeof usePagination<User>>) => {
    if (list.length === 0) {
      return (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">{searchQuery ? "No users found" : "No users"}</p>
        </div>
      );
    }
    return (
      <>
        <div className="space-y-3">
          {pagination.paginatedItems.map((user) => (
            <Card key={user.id} className="hover-elevate">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <p className="text-xs text-muted-foreground">Joined {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}</p>
                      {user.role === "staff" && (
                        <p className="text-xs text-muted-foreground">Leave: {user.leaveDaysUsed || 0}/{user.leaveDaysQuota || 0} days used</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={user.role === "admin" ? "default" : user.role === "staff" ? "secondary" : "outline"}>
                      {user.role}
                    </Badge>
                    {showApproveButton && (
                      <Button size="sm" onClick={() => { setSelectedUser(user); setApproveDialogOpen(true); }} data-testid={`button-approve-${user.id}`}>
                        <UserCheck className="mr-2 h-4 w-4" />Approve
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => handleEditUser(user)} data-testid={`button-edit-${user.id}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDeleteUser(user)} data-testid={`button-delete-${user.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
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
    <DashboardLayout title="User Management">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" data-testid="input-search-users" />
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-10 w-10 rounded-full mb-4" />
                  <Skeleton className="h-6 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Tabs defaultValue="pending" className="space-y-6">
            <TabsList>
              <TabsTrigger value="pending" data-testid="tab-pending-users">Pending ({pendingUsers.length})</TabsTrigger>
              <TabsTrigger value="approved" data-testid="tab-approved-users">Approved ({approvedUsers.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="pending">{renderUserList(filteredPending, true, pendingPagination)}</TabsContent>
            <TabsContent value="approved">{renderUserList(filteredApproved, false, approvedPagination)}</TabsContent>
          </Tabs>
        )}

        <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve User</DialogTitle>
              <DialogDescription>This will allow {selectedUser?.name} to log in and access the platform as a {selectedUser?.role}.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => selectedUser && approveMutation.mutate(selectedUser.id)} disabled={approveMutation.isPending} data-testid="button-confirm-approve">
                {approveMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Approving...</> : <><UserCheck className="mr-2 h-4 w-4" />Approve</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>Update user details and permissions.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} data-testid="input-edit-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input id="edit-email" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} data-testid="input-edit-email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input id="edit-phone" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} data-testid="input-edit-phone" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger data-testid="select-edit-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-approved">Status</Label>
                <Select value={editApproved ? "approved" : "pending"} onValueChange={(v) => setEditApproved(v === "approved")}>
                  <SelectTrigger data-testid="select-edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editRole === "staff" && (
                <div className="space-y-2">
                  <Label htmlFor="edit-leave-quota">Leave Days Quota</Label>
                  <Input id="edit-leave-quota" type="number" min="0" value={editLeaveQuota} onChange={(e) => setEditLeaveQuota(parseInt(e.target.value) || 0)} data-testid="input-edit-leave-quota" />
                  {selectedUser && selectedUser.role === "staff" && (
                    <p className="text-xs text-muted-foreground">Currently used: {selectedUser.leaveDaysUsed || 0} days</p>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={updateMutation.isPending} data-testid="button-save-edit">
                {updateMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete User</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {selectedUser?.name}? This action cannot be undone and will remove all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => selectedUser && deleteMutation.mutate(selectedUser.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="button-confirm-delete">
                {deleteMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</> : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
