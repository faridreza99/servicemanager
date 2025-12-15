import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Search, Briefcase, Filter, X } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ServiceCard } from "@/components/service-card";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pagination, usePagination } from "@/components/pagination";
import { getAuthHeader } from "@/lib/auth";
import { SERVICE_CATEGORIES, type Service, type ServiceCategory } from "@shared/schema";

export default function CustomerServicesPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | "all">("all");

  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services", selectedCategory, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory !== "all") {
        params.set("category", selectedCategory);
      }
      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim());
      }
      const url = params.toString() ? `/api/services?${params}` : "/api/services";
      const res = await fetch(url, {
        headers: getAuthHeader(),
      });
      if (!res.ok) throw new Error("Failed to fetch services");
      return res.json();
    },
  });

  const pagination = usePagination(services, 9);

  useEffect(() => {
    pagination.onPageChange(1);
  }, [selectedCategory, searchQuery]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
  };

  const hasFilters = searchQuery || selectedCategory !== "all";

  return (
    <DashboardLayout title="Services">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-services"
            />
          </div>
          
          <Select
            value={selectedCategory}
            onValueChange={(value) => setSelectedCategory(value as ServiceCategory | "all")}
          >
            <SelectTrigger className="w-[180px]" data-testid="select-category">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {SERVICE_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-filters">
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {selectedCategory !== "all" && (
          <div className="flex gap-2">
            <Badge variant="secondary" className="gap-1">
              {SERVICE_CATEGORIES.find((c) => c.value === selectedCategory)?.label}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => setSelectedCategory("all")}
              />
            </Badge>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardContent className="p-6 space-y-4">
                  <Skeleton className="h-10 w-10 rounded-md" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-9 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Briefcase className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">
              {hasFilters ? "No services found" : "No services available"}
            </p>
            <p className="text-sm">
              {hasFilters ? "Try different filters or search terms" : "Check back later for new services"}
            </p>
            {hasFilters && (
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pagination.paginatedItems.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  onBook={() => setLocation(`/dashboard/book/${service.id}`)}
                />
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
