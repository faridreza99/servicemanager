import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Search, UserCheck, UserX, Users, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const [dialogOpen, setDialogOpen] = useState(false);

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
      setDialogOpen(false);
    },
    onError: (error: Error) => toast({ title: "Failed to approve user", description: error.message, variant: "destructive" }),
  });

  const pendingUsers = users.filter((u) => !u.approved);
  const approvedUsers = users.filter((u) => u.approved);
  const filteredPending = pendingUsers.filter((u) => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredApproved = approvedUsers.filter((u) => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()));

  const renderUserList = (list: User[], showApproveButton: boolean) => {
    if (list.length === 0) {
      return (<div className="text-center py-16 text-muted-foreground"><Users className="h-16 w-16 mx-auto mb-4 opacity-50" /><p className="text-lg font-medium">{searchQuery ? "No users found" : "No users"}</p></div>);
    }
    return (
      <div className="space-y-3">
        {list.map((user) => (
          <Card key={user.id} className="hover-elevate">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10"><AvatarFallback>{getInitials(user.name)}</AvatarFallback></Avatar>
                  <div><p className="font-medium">{user.name}</p><p className="text-sm text-muted-foreground">{user.email}</p><p className="text-xs text-muted-foreground">Joined {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}</p></div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={user.role === "admin" ? "default" : user.role === "staff" ? "secondary" : "outline"}>{user.role}</Badge>
                  {showApproveButton ? (
                    <Button size="sm" onClick={() => { setSelectedUser(user); setDialogOpen(true); }} data-testid={`button-approve-${user.id}`}><UserCheck className="mr-2 h-4 w-4" />Approve</Button>
                  ) : (
                    <Badge variant="outline" className="text-green-600 border-green-600">Approved</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
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
          <div className="space-y-4">{[1, 2, 3].map((i) => (<Card key={i}><CardContent className="p-6"><Skeleton className="h-10 w-10 rounded-full mb-4" /><Skeleton className="h-6 w-1/2" /></CardContent></Card>))}</div>
        ) : (
          <Tabs defaultValue="pending" className="space-y-6">
            <TabsList><TabsTrigger value="pending" data-testid="tab-pending-users">Pending ({pendingUsers.length})</TabsTrigger><TabsTrigger value="approved" data-testid="tab-approved-users">Approved ({approvedUsers.length})</TabsTrigger></TabsList>
            <TabsContent value="pending">{renderUserList(filteredPending, true)}</TabsContent>
            <TabsContent value="approved">{renderUserList(filteredApproved, false)}</TabsContent>
          </Tabs>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Approve User</DialogTitle><DialogDescription>This will allow {selectedUser?.name} to log in and access the platform as a {selectedUser?.role}.</DialogDescription></DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => selectedUser && approveMutation.mutate(selectedUser.id)} disabled={approveMutation.isPending} data-testid="button-confirm-approve">
                {approveMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Approving...</> : <><UserCheck className="mr-2 h-4 w-4" />Approve</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
