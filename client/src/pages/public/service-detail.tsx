import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { PublicLayout } from "@/components/public-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Star, ArrowLeft, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import type { Service, ReviewWithUser } from "@shared/schema";

interface ServiceDetail extends Service {
  avgRating: number;
  reviewCount: number;
  reviews: ReviewWithUser[];
}

function StarRating({ rating, size = "default" }: { rating: number; size?: "default" | "lg" }) {
  const iconSize = size === "lg" ? "h-5 w-5" : "h-4 w-4";
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${iconSize} ${
            star <= Math.round(rating)
              ? "text-yellow-500 fill-yellow-500"
              : "text-muted-foreground"
          }`}
        />
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: ReviewWithUser }) {
  const initials = review.user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  
  return (
    <Card data-testid={`card-review-${review.id}`}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <Avatar>
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
              <div>
                <p className="font-medium">{review.user.name}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(review.createdAt), "MMM d, yyyy")}
                </div>
              </div>
              <StarRating rating={review.rating} />
            </div>
            {review.title && (
              <h4 className="font-medium mb-1">{review.title}</h4>
            )}
            {review.body && (
              <p className="text-muted-foreground text-sm">{review.body}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  
  const { data: service, isLoading, error } = useQuery<ServiceDetail>({
    queryKey: ["/api/public/services", id],
    queryFn: async () => {
      const res = await fetch(`/api/public/services/${id}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Service not found");
        throw new Error("Failed to fetch service");
      }
      return res.json();
    },
    enabled: !!id,
  });
  
  if (isLoading) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 md:px-6 py-12">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
            <div>
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }
  
  if (error || !service) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 md:px-6 py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Service Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The service you're looking for doesn't exist or is no longer available.
          </p>
          <Link href="/services">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Services
            </Button>
          </Link>
        </div>
      </PublicLayout>
    );
  }
  
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": service.name,
    "description": service.description,
    "category": service.category,
    "aggregateRating": service.reviewCount > 0 ? {
      "@type": "AggregateRating",
      "ratingValue": service.avgRating.toFixed(1),
      "reviewCount": service.reviewCount,
    } : undefined,
  };
  
  return (
    <PublicLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      
      <div className="container mx-auto px-4 md:px-6 py-12">
        <Link href="/services">
          <Button variant="ghost" className="mb-6" data-testid="button-back">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Services
          </Button>
        </Link>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div>
              <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                <h1 className="text-3xl md:text-4xl font-bold" data-testid="text-service-name">
                  {service.name}
                </h1>
                <Badge variant="outline" className="text-sm">
                  {service.category}
                </Badge>
              </div>
              
              <div className="flex items-center gap-4 mb-6">
                <StarRating rating={service.avgRating} size="lg" />
                <span className="text-muted-foreground">
                  {service.avgRating > 0 ? service.avgRating.toFixed(1) : "No ratings yet"}
                  {service.reviewCount > 0 && ` (${service.reviewCount} reviews)`}
                </span>
              </div>
              
              <p className="text-lg text-muted-foreground leading-relaxed">
                {service.description}
              </p>
            </div>
            
            <Separator />
            
            <div>
              <h2 className="text-2xl font-bold mb-6">
                Customer Reviews ({service.reviewCount})
              </h2>
              
              {service.reviews.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No reviews yet. Be the first to review!</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {service.reviews.map((review) => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Book This Service</CardTitle>
                <CardDescription>
                  Get started with professional IT support
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category</span>
                    <span className="font-medium">{service.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rating</span>
                    <span className="font-medium">
                      {service.avgRating > 0 ? `${service.avgRating.toFixed(1)}/5` : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reviews</span>
                    <span className="font-medium">{service.reviewCount}</span>
                  </div>
                </div>
                
                <Separator />
                
                <Link href={user ? `/dashboard/book/${service.id}` : "/login"}>
                  <Button className="w-full" size="lg" data-testid="button-book-service">
                    {user ? "Book Now" : "Login to Book"}
                  </Button>
                </Link>
                
                {!user && (
                  <p className="text-xs text-center text-muted-foreground">
                    Don't have an account?{" "}
                    <Link href="/register">
                      <span className="text-primary cursor-pointer hover:underline">
                        Register here
                      </span>
                    </Link>
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
