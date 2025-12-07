import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useSiteSettings } from "@/lib/site-settings";
import { PublicLayout } from "@/components/public-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, MessageSquare, Users, CheckCircle, ArrowRight, Wrench, Shield, Zap } from "lucide-react";
import type { ServiceWithRating } from "@shared/schema";

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
      <span className="text-sm text-muted-foreground">({count})</span>
    </div>
  );
}

function HeroSection() {
  const { user } = useAuth();
  const { settings } = useSiteSettings();
  
  return (
    <section className="relative py-20 md:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
      <div className="container mx-auto px-4 md:px-6 relative">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <Badge variant="secondary" className="mb-4">Professional IT Services</Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
            {settings.siteName}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {settings.siteDescription || "Professional IT service management platform. Book services, communicate with experts, and get your issues resolved efficiently."}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/services">
              <Button size="lg" variant="outline" data-testid="button-view-services">
                View Services
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href={user ? "/dashboard/services" : "/login"}>
              <Button size="lg" data-testid="button-book-service">
                Book a Service
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturedServicesSection() {
  const { data: services, isLoading } = useQuery<ServiceWithRating[]>({
    queryKey: ["/api/public/services/featured"],
  });
  
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight mb-4">Our Services</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Explore our range of professional IT services designed to meet your needs
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))
          ) : (
            services?.map((service) => (
              <Card key={service.id} className="hover-elevate" data-testid={`card-service-${service.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">{service.name}</CardTitle>
                    <Badge variant="outline">{service.category}</Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {service.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between gap-4">
                    <StarRating rating={service.avgRating} count={service.reviewCount} />
                    <Link href={`/services/${service.id}`}>
                      <Button variant="ghost" size="sm">
                        View Details
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
        
        <div className="text-center mt-8">
          <Link href="/services">
            <Button variant="outline" size="lg" data-testid="button-view-all-services">
              View All Services
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      icon: Wrench,
      title: "1. Book a Service",
      description: "Browse our services and book the one that fits your needs. Provide details about your requirements.",
    },
    {
      icon: MessageSquare,
      title: "2. Chat with Experts",
      description: "Communicate directly with our team through real-time chat. Get quotes and clarify your needs.",
    },
    {
      icon: CheckCircle,
      title: "3. Get it Done",
      description: "Our skilled staff will be assigned to your task and complete it professionally.",
    },
  ];
  
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight mb-4">How It Works</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Getting professional IT help has never been easier
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {steps.map((step, index) => (
            <div key={index} className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <step.icon className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">{step.title}</h3>
              <p className="text-muted-foreground text-sm">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    {
      icon: Shield,
      title: "Trusted Experts",
      description: "Our team consists of certified professionals with years of experience.",
    },
    {
      icon: Zap,
      title: "Fast Response",
      description: "Quick turnaround times to minimize your downtime.",
    },
    {
      icon: Users,
      title: "Customer First",
      description: "Dedicated support and transparent communication throughout.",
    },
  ];
  
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight mb-4">Why Choose Us</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            We're committed to delivering exceptional IT services
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  const { user } = useAuth();
  
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="py-12 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
              Join us today and experience professional IT services tailored to your needs.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href={user ? "/dashboard/services" : "/register"}>
                <Button size="lg" variant="secondary" data-testid="button-cta-get-started">
                  {user ? "Book Now" : "Get Started Free"}
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10">
                  Contact Us
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <PublicLayout>
      <HeroSection />
      <FeaturedServicesSection />
      <HowItWorksSection />
      <FeaturesSection />
      <CTASection />
    </PublicLayout>
  );
}
