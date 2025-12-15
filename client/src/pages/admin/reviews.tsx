import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Star, Eye, EyeOff, Trash2 } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination, usePagination } from "@/components/pagination";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeader } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { ReviewWithUser, Service } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function AdminReviewsPage() {
  const { toast } = useToast();
  const [filterService, setFilterService] = useState<string>("all");

  const { data: reviews = [], isLoading } = useQuery<(ReviewWithUser & { service: Service })[]>({
    queryKey: ["/api/admin/reviews"],
    queryFn: async () => {
      const res = await fetch("/api/admin/reviews", { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to fetch reviews");
      return res.json();
    },
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/admin/services"],
    queryFn: async () => {
      const res = await fetch("/api/admin/services", { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to fetch services");
      return res.json();
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, isPublished }: { id: string; isPublished: boolean }) =>
      apiRequest("PATCH", `/api/admin/reviews/${id}`, { isPublished }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews"] });
      toast({ title: "Review updated" });
    },
    onError: (error: Error) => toast({ title: "Failed to update review", description: error.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/admin/reviews/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews"] });
      toast({ title: "Review deleted" });
    },
    onError: (error: Error) => toast({ title: "Failed to delete review", description: error.message, variant: "destructive" }),
  });

  const filteredReviews = filterService === "all" 
    ? reviews 
    : reviews.filter(r => r.serviceId === filterService);

  const pagination = usePagination(filteredReviews, 10);

  useEffect(() => {
    pagination.onPageChange(1);
  }, [filterService]);

  return (
    <DashboardLayout title="Reviews Management">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <Select value={filterService} onValueChange={setFilterService}>
            <SelectTrigger className="w-[200px]" data-testid="select-filter-service">
              <SelectValue placeholder="Filter by service" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Services</SelectItem>
              {services.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="secondary">{filteredReviews.length} reviews</Badge>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredReviews.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No reviews yet</p>
              <p className="text-sm">Reviews will appear here when customers submit them</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-4">
              {pagination.paginatedItems.map((review) => (
                <Card key={review.id} data-testid={`card-review-${review.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        {review.user.profilePhoto && (
                          <AvatarImage src={review.user.profilePhoto} alt={review.user.name} />
                        )}
                        <AvatarFallback>{getInitials(review.user.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{review.user.name}</p>
                        <p className="text-sm text-muted-foreground">{review.user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={review.isPublished ? "default" : "secondary"}>
                        {review.isPublished ? "Published" : "Hidden"}
                      </Badge>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => togglePublishMutation.mutate({ id: review.id, isPublished: !review.isPublished })}
                        data-testid={`button-toggle-publish-${review.id}`}
                      >
                        {review.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="icon" data-testid={`button-delete-review-${review.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Review</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this review? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMutation.mutate(review.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{review.service.name}</Badge>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${star <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  {review.title && <p className="font-medium">{review.title}</p>}
                  {review.body && <p className="text-muted-foreground">{review.body}</p>}
                </CardContent>
              </Card>
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
      </div>
    </DashboardLayout>
  );
}
