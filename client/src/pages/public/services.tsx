import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { PublicLayout } from "@/components/public-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, Search, ArrowRight, Filter } from "lucide-react";
import { SERVICE_CATEGORIES, type ServiceWithRating, type ServiceCategory } from "@shared/schema";

interface ServicesResponse {
  services: ServiceWithRating[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= Math.round(rating)
                ? "text-yellow-500 fill-yellow-500"
                : "text-muted-foreground"
            }`}
          />
        ))}
      </div>
      <span className="text-sm text-muted-foreground">
        {rating > 0 ? rating.toFixed(1) : "No ratings"} ({count})
      </span>
    </div>
  );
}

export default function ServicesPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [page, setPage] = useState(1);
  
  const queryParams = new URLSearchParams();
  queryParams.set("page", page.toString());
  queryParams.set("limit", "12");
  if (search) queryParams.set("search", search);
  if (category && category !== "all") queryParams.set("category", category);
  
  const { data, isLoading } = useQuery<ServicesResponse>({
    queryKey: ["/api/public/services", { search, category, page }],
    queryFn: async () => {
      const res = await fetch(`/api/public/services?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch services");
      return res.json();
    },
  });
  
  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };
  
  const handleCategoryChange = (value: string) => {
    setCategory(value);
    setPage(1);
  };
  
  return (
    <PublicLayout>
      <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Our Services</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Browse our comprehensive range of IT services designed to meet your business and personal needs
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search services..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
          <Select value={category} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-full sm:w-48" data-testid="select-category">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Categories" />
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
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full mt-2" />
                  <Skeleton className="h-4 w-2/3 mt-1" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : data?.services.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No services found matching your criteria.</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => { setSearch(""); setCategory("all"); }}
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data?.services.map((service) => (
                <Card key={service.id} className="hover-elevate flex flex-col" data-testid={`card-service-${service.id}`}>
                  <CardHeader className="flex-1">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <CardTitle className="text-lg">{service.name}</CardTitle>
                      <Badge variant="outline">{service.category}</Badge>
                    </div>
                    <CardDescription className="line-clamp-3">
                      {service.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <StarRating rating={service.avgRating} count={service.reviewCount} />
                    <div className="flex items-center gap-2 mt-4 flex-wrap">
                      <Link href={`/services/${service.id}`}>
                        <Button variant="outline" size="sm" data-testid={`button-view-${service.id}`}>
                          View Details
                        </Button>
                      </Link>
                      <Link href={user ? `/dashboard/book/${service.id}` : "/login"}>
                        <Button size="sm" data-testid={`button-book-${service.id}`}>
                          Book Now
                          <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {data?.pagination && data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  data-testid="button-prev-page"
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-4">
                  Page {page} of {data.pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={!data.pagination.hasMore}
                  onClick={() => setPage(p => p + 1)}
                  data-testid="button-next-page"
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </PublicLayout>
  );
}
