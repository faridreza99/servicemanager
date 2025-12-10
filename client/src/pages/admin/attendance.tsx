import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAuthHeader } from "@/lib/auth";
import { format } from "date-fns";
import { MapPin, Clock, Users } from "lucide-react";
import type { AttendanceWithStaff } from "@shared/schema";
import { useState } from "react";

export default function AdminAttendance() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

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
            <CardTitle>Attendance Records</CardTitle>
            <CardDescription>View and filter staff attendance with location data</CardDescription>
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
