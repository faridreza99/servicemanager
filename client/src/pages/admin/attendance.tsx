import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAuthHeader } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { MapPin, Clock, Users, Plus, Pencil } from "lucide-react";
import type { AttendanceWithStaff, User } from "@shared/schema";

export default function AdminAttendance() {
  const { toast } = useToast();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceWithStaff | null>(null);

  const [formData, setFormData] = useState({
    staffId: "",
    date: new Date().toISOString().split("T")[0],
    clockInTime: "",
    clockOutTime: "",
    status: "present" as "present" | "absent" | "late" | "half_day",
  });

  const queryParams = new URLSearchParams();
  if (startDate) queryParams.set("startDate", startDate);
  if (endDate) queryParams.set("endDate", endDate);

  const { data: records = [], isLoading } = useQuery<AttendanceWithStaff[]>({
    queryKey: ["/api/admin/attendance", startDate, endDate],
    queryFn: async () => {
      const url = `/api/admin/attendance${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
      const res = await fetch(url, { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to fetch attendance records");
      return res.json();
    },
  });

  const { data: staffUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users", { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to fetch users");
      const users = await res.json();
      return users.filter((u: User) => u.role === "staff" && u.approved);
    },
  });

  const invalidateAttendanceQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/attendance"], exact: false });
  };

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/admin/attendance", data);
    },
    onSuccess: () => {
      invalidateAttendanceQueries();
      toast({ title: "Attendance record created successfully" });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to create attendance record", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      return apiRequest("PUT", `/api/admin/attendance/${id}`, data);
    },
    onSuccess: () => {
      invalidateAttendanceQueries();
      toast({ title: "Attendance record updated successfully" });
      setIsEditDialogOpen(false);
      setSelectedRecord(null);
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to update attendance record", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      staffId: "",
      date: new Date().toISOString().split("T")[0],
      clockInTime: "",
      clockOutTime: "",
      status: "present",
    });
  };

  const openEditDialog = (record: AttendanceWithStaff) => {
    setSelectedRecord(record);
    setFormData({
      staffId: record.staffId,
      date: record.date,
      clockInTime: record.clockInTime ? format(new Date(record.clockInTime), "yyyy-MM-dd'T'HH:mm") : "",
      clockOutTime: record.clockOutTime ? format(new Date(record.clockOutTime), "yyyy-MM-dd'T'HH:mm") : "",
      status: record.status as "present" | "absent" | "late" | "half_day",
    });
    setIsEditDialogOpen(true);
  };

  const handleSubmitAdd = () => {
    if (!formData.staffId || !formData.date) {
      toast({ title: "Please select a staff member and date", variant: "destructive" });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleSubmitEdit = () => {
    if (!selectedRecord) return;
    updateMutation.mutate({
      id: selectedRecord.id,
      data: {
        clockInTime: formData.clockInTime || undefined,
        clockOutTime: formData.clockOutTime || undefined,
        status: formData.status,
      },
    });
  };

  const formatTime = (time: string | Date | null) => {
    if (!time) return "-";
    return format(new Date(time), "h:mm a");
  };

  const formatLocation = (lat: number | null, lng: number | null) => {
    if (lat === null || lng === null) return null;
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  const calculateWorkHours = (clockIn: string | Date | null, clockOut: string | Date | null) => {
    if (!clockIn || !clockOut) return "-";
    const inTime = new Date(clockIn);
    const outTime = new Date(clockOut);
    const diff = outTime.getTime() - inTime.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const todayRecords = records.filter((r) => r.date === new Date().toISOString().split("T")[0]);
  const presentToday = todayRecords.filter((r) => r.clockInTime).length;

  return (
    <DashboardLayout title="Staff Attendance">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <CardTitle className="text-sm font-medium">Present Today</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{presentToday}</div>
              <p className="text-xs text-muted-foreground">Staff members clocked in</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <CardTitle className="text-sm font-medium">Total Records</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{records.length}</div>
              <p className="text-xs text-muted-foreground">In selected period</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <CardTitle className="text-sm font-medium">Location Captured</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{records.filter((r) => r.clockInLatitude !== null).length}</div>
              <p className="text-xs text-muted-foreground">With GPS coordinates</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle>Attendance Records</CardTitle>
                <CardDescription>View, add, and edit staff attendance</CardDescription>
              </div>
              <Button onClick={() => { resetForm(); setIsAddDialogOpen(true); }} data-testid="button-add-attendance">
                <Plus className="h-4 w-4 mr-2" />
                Add Attendance
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  data-testid="input-filter-start-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  data-testid="input-filter-end-date"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No attendance records</p>
                <p className="text-sm">No records found for the selected period</p>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Clock In</TableHead>
                      <TableHead>Clock Out</TableHead>
                      <TableHead>Work Hours</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Clock In Location</TableHead>
                      <TableHead>Clock Out Location</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={record.id} data-testid={`attendance-row-${record.id}`}>
                        <TableCell className="font-medium">{record.staff?.name || "Unknown"}</TableCell>
                        <TableCell>{format(new Date(record.date), "MMM d, yyyy")}</TableCell>
                        <TableCell>{formatTime(record.clockInTime)}</TableCell>
                        <TableCell>{formatTime(record.clockOutTime)}</TableCell>
                        <TableCell>{calculateWorkHours(record.clockInTime, record.clockOutTime)}</TableCell>
                        <TableCell>
                          <Badge variant={record.status === "present" ? "default" : "secondary"}>
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatLocation(record.clockInLatitude, record.clockInLongitude) ? (
                            <a
                              href={`https://www.google.com/maps?q=${record.clockInLatitude},${record.clockInLongitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1"
                              data-testid={`link-clock-in-location-${record.id}`}
                            >
                              <MapPin className="h-3 w-3" />
                              View Map
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatLocation(record.clockOutLatitude, record.clockOutLongitude) ? (
                            <a
                              href={`https://www.google.com/maps?q=${record.clockOutLatitude},${record.clockOutLongitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1"
                              data-testid={`link-clock-out-location-${record.id}`}
                            >
                              <MapPin className="h-3 w-3" />
                              View Map
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEditDialog(record)}
                            data-testid={`button-edit-attendance-${record.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Attendance Record</DialogTitle>
            <DialogDescription>Create a new attendance record for a staff member</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Staff Member</Label>
              <Select value={formData.staffId} onValueChange={(v) => setFormData({ ...formData, staffId: v })}>
                <SelectTrigger data-testid="select-staff">
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {staffUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id} data-testid={`option-staff-${user.id}`}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                data-testid="input-attendance-date"
              />
            </div>
            <div className="space-y-2">
              <Label>Clock In Time</Label>
              <Input
                type="datetime-local"
                value={formData.clockInTime}
                onChange={(e) => setFormData({ ...formData, clockInTime: e.target.value })}
                data-testid="input-clock-in-time"
              />
            </div>
            <div className="space-y-2">
              <Label>Clock Out Time</Label>
              <Input
                type="datetime-local"
                value={formData.clockOutTime}
                onChange={(e) => setFormData({ ...formData, clockOutTime: e.target.value })}
                data-testid="input-clock-out-time"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as typeof formData.status })}>
                <SelectTrigger data-testid="select-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present" data-testid="option-status-present">Present</SelectItem>
                  <SelectItem value="absent" data-testid="option-status-absent">Absent</SelectItem>
                  <SelectItem value="late" data-testid="option-status-late">Late</SelectItem>
                  <SelectItem value="half_day" data-testid="option-status-half-day">Half Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} data-testid="button-cancel-add">
              Cancel
            </Button>
            <Button onClick={handleSubmitAdd} disabled={createMutation.isPending} data-testid="button-submit-add">
              {createMutation.isPending ? "Creating..." : "Create Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Attendance Record</DialogTitle>
            <DialogDescription>
              Update attendance for {selectedRecord?.staff?.name} on {selectedRecord?.date ? format(new Date(selectedRecord.date), "MMM d, yyyy") : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Clock In Time</Label>
              <Input
                type="datetime-local"
                value={formData.clockInTime}
                onChange={(e) => setFormData({ ...formData, clockInTime: e.target.value })}
                data-testid="input-edit-clock-in-time"
              />
            </div>
            <div className="space-y-2">
              <Label>Clock Out Time</Label>
              <Input
                type="datetime-local"
                value={formData.clockOutTime}
                onChange={(e) => setFormData({ ...formData, clockOutTime: e.target.value })}
                data-testid="input-edit-clock-out-time"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as typeof formData.status })}>
                <SelectTrigger data-testid="select-edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present" data-testid="option-edit-status-present">Present</SelectItem>
                  <SelectItem value="absent" data-testid="option-edit-status-absent">Absent</SelectItem>
                  <SelectItem value="late" data-testid="option-edit-status-late">Late</SelectItem>
                  <SelectItem value="half_day" data-testid="option-edit-status-half-day">Half Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button onClick={handleSubmitEdit} disabled={updateMutation.isPending} data-testid="button-submit-edit">
              {updateMutation.isPending ? "Updating..." : "Update Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
