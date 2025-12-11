"use client";

import React from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useSiteSettings } from "@/lib/site-settings";
import { PublicLayout } from "@/components/public-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Star,
  MessageSquare,
  Users,
  CheckCircle,
  ArrowRight,
  Wrench,
  Shield,
  Zap,
} from "lucide-react";
import type { ServiceWithRating } from "@shared/schema";

function StarRating({ rating, count }: { rating: number; count: number }) {
  const rounded = Math.round(rating);
  return (
    <div
      className="flex items-center gap-2"
      aria-label={`Rating ${rating} out of 5 based on ${count} reviews`}
    >
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`h-4 w-4 transition-colors ${s <= rounded ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"}`}
            aria-hidden
          />
        ))}
      </div>
      <span className="text-sm text-muted-foreground">
        {rating.toFixed(1)} · <span className="sr-only">from</span>{" "}
        <span className="ml-1">({count})</span>
      </span>
    </div>
  );
}

function HeroSection() {
  const { user } = useAuth();
  const { settings } = useSiteSettings();

  return (
    <section className="relative py-20 md:py-32 overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/8 to-transparent pointer-events-none" />
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="flex flex-col-reverse lg:flex-row items-center gap-10">
          <div className="w-full lg:w-2/3 text-center lg:text-left">
            <Badge variant="secondary" className="mb-4">
              Professional IT Services
            </Badge>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
              {settings.siteName}
            </h1>
            <p className="mt-4 text-lg md:text-xl text-muted-foreground max-w-2xl">
              {settings.siteDescription ||
                "A modern IT service management platform — book services, talk to experts, and get work done fast."}
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center sm:justify-start justify-center gap-4">
              <Link href="/services">
                <Button
                  size="lg"
                  variant="outline"
                  className="shadow-sm"
                  aria-label="View services"
                >
                  View Services
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>

              <Link href={user ? "/dashboard/services" : "/login"}>
                <Button
                  size="lg"
                  className="flex items-center"
                  aria-label={
                    user ? "Book a service" : "Login to book a service"
                  }
                >
                  {user ? "Book a Service" : "Get Started"}
                </Button>
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap gap-3 justify-center sm:justify-start text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" /> <span>Trusted experts</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" /> <span>Fast turnaround</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />{" "}
                <span>Customer-first support</span>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-1/3 flex items-center justify-center">
            {/* Decorative card */}
            <Card className="w-full max-w-md transform hover:-translate-y-2 transition">
              <CardHeader>
                <CardTitle className="text-lg">Need help right now?</CardTitle>
                <CardDescription>
                  Describe your problem and our experts will reach out with a
                  quote.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Typical response
                    </p>
                    <p className="text-lg font-semibold">Within 2 hours</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Link href={user ? "/dashboard/services" : "/register"}>
                      <Button size="sm">Get Started</Button>
                    </Link>
                    <Link href="/contact">
                      <Button variant="ghost" size="sm">
                        Contact Us
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Subtle SVG blobs for depth */}
      <svg
        className="pointer-events-none absolute -right-24 top-4 opacity-10 w-96 h-96"
        viewBox="0 0 600 600"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g transform="translate(300,300)">
          <path
            d="M120,-156C154,-121,179,-80,190,-32C200,16,196,70,166,115C137,160,82,196,25,203C-32,210,-89,187,-135,151C-182,115,-216,66,-213,11C-210,-44,-169,-100,-124,-138C-79,-176,-39,-197,1,-198C41,-199,82,-181,120,-156Z"
            fill="#7c3aed"
          />
        </g>
      </svg>
    </section>
  );
}

function FeaturedServicesSection() {
  const {
    data: services,
    isLoading,
    isError,
    refetch,
  } = useQuery<ServiceWithRating[]>({
    queryKey: ["/api/public/services/featured"],
    queryFn: async () => {
      const res = await fetch("/api/public/services/featured");
      if (!res.ok) throw new Error("Failed to load services");
      return res.json();
    },
    staleTime: 1000 * 60 * 2,
  });

  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold tracking-tight mb-3">
            Our Services
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Explore a range of professional IT services designed to solve real
            problems.
          </p>
        </div>

        {isError ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Unable to load services right now.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button onClick={() => refetch()}>Try again</Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-full mt-2" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-4 w-1/2" />
                    </CardContent>
                  </Card>
                ))
              : services?.map((service) => (
                  <Card
                    key={service.id}
                    className="hover:shadow-lg hover:-translate-y-1 transition-transform"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-lg">
                            {service.name}
                          </CardTitle>
                          <CardDescription className="line-clamp-3 mt-1 text-sm text-muted-foreground">
                            {service.description}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="self-start">
                          {service.category}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between gap-4">
                        <StarRating
                          rating={service.avgRating}
                          count={service.reviewCount}
                        />
                        <div className="flex items-center gap-2">
                          <Link href={`/services/${service.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={`View details for ${service.name}`}
                            >
                              View Details
                              <ArrowRight className="ml-1 h-3 w-3" />
                            </Button>
                          </Link>
                          <Link
                            href={
                              service.externalUrl ?? `/services/${service.id}`
                            }
                          >
                            <Button size="sm">Book</Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
          </div>
        )}

        <div className="text-center mt-8">
          <Link href="/services">
            <Button
              variant="outline"
              size="lg"
              data-testid="button-view-all-services"
            >
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
      title: "Book a Service",
      description: "Browse services, pick a time and provide details.",
    },
    {
      icon: MessageSquare,
      title: "Chat with Experts",
      description: "Discuss requirements, get a quote and timeline.",
    },
    {
      icon: CheckCircle,
      title: "Get it Done",
      description: "Our team completes the work and verifies quality.",
    },
  ];

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight mb-4">
            How It Works
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            A simple 3-step flow designed to remove friction and get results
            fast.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {steps.map((step, idx) => (
            <div key={idx} className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <step.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">
                {idx + 1}. {step.title}
              </h3>
              <p className="text-muted-foreground text-sm">
                {step.description}
              </p>
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
      description: "Certified pros with proven track-records.",
    },
    {
      icon: Zap,
      title: "Fast Response",
      description: "We value your time and act quickly.",
    },
    {
      icon: Users,
      title: "Customer First",
      description: "Transparent communication every step.",
    },
  ];

  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight mb-4">
            Why Choose Us
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            We're committed to delivering exceptional IT services.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <Card key={i} className="hover:shadow-md transition">
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
            <p className="text-primary-foreground/90 mb-8 max-w-xl mx-auto">
              Join us today and experience professional IT services tailored to
              your needs.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href={user ? "/dashboard/services" : "/register"}>
                <Button
                  size="lg"
                  variant="secondary"
                  data-testid="button-cta-get-started"
                >
                  {user ? "Book Now" : "Get Started Free"}
                </Button>
              </Link>
              <Link href="/contact">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
                >
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
