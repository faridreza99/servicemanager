"use client";
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
  CheckCircle,
  ArrowRight,
  Wrench,
  Shield,
  Zap,
  Sparkles,
  TrendingUp,
  Award,
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
    <section className="relative py-24 md:py-32 lg:py-40 overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(120,119,198,0.1),transparent_50%)]" />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          <div className="w-full lg:w-3/5 text-center lg:text-left space-y-8">
            {/* Badge with animation */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-sm font-medium text-foreground">
                Trusted by 10,000+ businesses
              </span>
            </div>

            {/* Main heading with text-balance */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] text-balance">
              {settings.siteName}
              <span className="block mt-2 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                Simplified
              </span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl text-pretty leading-relaxed">
              {settings.siteDescription ||
                "Professional IT services at your fingertips. Connect with expert technicians, get instant quotes, and solve your tech challenges faster than ever."}
            </p>

            {/* CTA buttons with improved styling */}
            <div className="flex flex-col sm:flex-row items-center sm:justify-start justify-center gap-4 pt-4">
              <Link href={user ? "/dashboard/services" : "/register"}>
                <Button
                  size="lg"
                  className="text-base px-8 py-6 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:scale-[1.02]"
                  aria-label={
                    user ? "Book a service" : "Get started with our services"
                  }
                >
                  {user ? "Book a Service" : "Get Started Free"}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>

              <Link href="/services">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-base px-8 py-6 border-2 hover:bg-accent/50 transition-all duration-300 bg-transparent"
                  aria-label="Explore all services"
                >
                  Explore Services
                </Button>
              </Link>
            </div>

            {/* Trust indicators with icons */}
            <div className="flex flex-wrap items-center gap-6 justify-center sm:justify-start pt-4">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <span className="font-medium">Verified Experts</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <span className="font-medium">2-Hour Response</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Award className="h-5 w-5 text-primary" />
                </div>
                <span className="font-medium">5-Star Rated</span>
              </div>
            </div>
          </div>

          {/* Enhanced hero card */}
          <div className="w-full lg:w-2/5 flex items-center justify-center">
            <Card className="w-full max-w-md border-2 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:-translate-y-2 bg-card/80 backdrop-blur-sm">
              <CardHeader className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <Badge variant="secondary" className="text-xs">
                    Available Now
                  </Badge>
                </div>
                <CardTitle className="text-2xl text-balance">
                  Need immediate help?
                </CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Connect with our expert technicians right away. Get a detailed
                  quote and timeline within hours.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Avg Response
                    </p>
                    <p className="text-2xl font-bold text-primary">2 hrs</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Success Rate
                    </p>
                    <p className="text-2xl font-bold text-primary">98%</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <Link href={user ? "/dashboard/services" : "/register"}>
                    <Button size="lg" className="w-full">
                      Get Started Now
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/contact">
                    <Button variant="ghost" size="lg" className="w-full">
                      Talk to Expert
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute -right-32 top-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute -left-32 bottom-20 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
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
    <section className="py-20 md:py-28 bg-gradient-to-b from-muted/30 to-background">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-16 space-y-4">
          <Badge variant="outline" className="mb-2">
            Our Services
          </Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-balance">
            Professional IT Solutions
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty leading-relaxed">
            From troubleshooting to complex implementations, our certified
            experts deliver excellence every time.
          </p>
        </div>

        {isError ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
              <Wrench className="h-8 w-8 text-destructive" />
            </div>
            <p className="text-muted-foreground mb-6 text-lg">
              Unable to load services right now.
            </p>
            <Button onClick={() => refetch()} size="lg">
              Try Again
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <Skeleton className="h-6 w-3/4 mb-3" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-4 w-1/2" />
                    </CardContent>
                  </Card>
                ))
              : services?.map((service) => (
                  <Card
                    key={service.id}
                    className="group hover:shadow-xl hover:-translate-y-2 transition-all duration-300 border-2 hover:border-primary/50 bg-card/50 backdrop-blur-sm"
                  >
                    <CardHeader className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2 flex-1">
                          <CardTitle className="text-xl group-hover:text-primary transition-colors">
                            {service.name}
                          </CardTitle>
                          <CardDescription className="line-clamp-2 text-sm leading-relaxed">
                            {service.description}
                          </CardDescription>
                        </div>
                        <Badge
                          variant="secondary"
                          className="shrink-0 font-medium"
                        >
                          {service.category}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <StarRating
                        rating={service.avgRating}
                        count={service.reviewCount}
                      />
                      <div className="flex items-center gap-2 pt-2">
                        <Link
                          href={
                            service.externalUrl ?? `/services/${service.id}`
                          }
                          className="flex-1"
                        >
                          <Button
                            size="sm"
                            className="w-full group-hover:shadow-lg transition-shadow"
                          >
                            Book Now
                            <ArrowRight className="ml-2 h-3 w-3 group-hover:translate-x-1 transition-transform" />
                          </Button>
                        </Link>
                        <Link href={`/services/${service.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`View details for ${service.name}`}
                          >
                            Details
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
          </div>
        )}

        <div className="text-center mt-12">
          <Link href="/services">
            <Button
              variant="outline"
              size="lg"
              className="text-base border-2 bg-transparent"
              data-testid="button-view-all-services"
            >
              View All Services
              <ArrowRight className="ml-2 h-5 w-5" />
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
      title: "Choose Your Service",
      description:
        "Browse our catalog of IT services and select what you need. Provide details about your requirements.",
    },
    {
      icon: MessageSquare,
      title: "Connect with Experts",
      description:
        "Chat directly with certified technicians. Discuss your needs and receive a transparent quote.",
    },
    {
      icon: CheckCircle,
      title: "Problem Solved",
      description:
        "Our team delivers quality work on time. Review and rate your experience when complete.",
    },
  ];

  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />

      <div className="container mx-auto px-4 md:px-6 relative">
        <div className="text-center mb-16 space-y-4">
          <Badge variant="outline" className="mb-2">
            Simple Process
          </Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-balance">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty leading-relaxed">
            Three simple steps from problem to solution. We've streamlined the
            entire process for your convenience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 max-w-5xl mx-auto">
          {steps.map((step, idx) => (
            <div key={idx} className="relative text-center space-y-6 group">
              {/* Connection line */}
              {idx < steps.length - 1 && (
                <div className="hidden md:block absolute top-16 left-[60%] w-full h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />
              )}

              <div className="relative">
                <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <step.icon className="h-9 w-9 text-primary" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shadow-lg">
                  {idx + 1}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-bold text-xl text-balance">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-pretty">
                  {step.description}
                </p>
              </div>
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
      title: "Certified Experts",
      description:
        "All our technicians are certified professionals with years of industry experience and proven track records.",
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description:
        "Average response time of 2 hours. We prioritize your time and understand the urgency of IT issues.",
    },
    {
      icon: TrendingUp,
      title: "98% Success Rate",
      description:
        "Industry-leading satisfaction scores. We stand behind our work with quality guarantees.",
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-gradient-to-b from-muted/30 to-background">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-16 space-y-4">
          <Badge variant="outline" className="mb-2">
            Why Choose Us
          </Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-balance">
            Excellence in Every Detail
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty leading-relaxed">
            We're not just another IT service provider. We're your trusted
            technology partner.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
          {features.map((feature, i) => (
            <Card
              key={i}
              className="group hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border-2 hover:border-primary/50 bg-card/50 backdrop-blur-sm"
            >
              <CardHeader className="space-y-6">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <feature.icon className="h-8 w-8 text-primary" />
                </div>
                <div className="space-y-3">
                  <CardTitle className="text-xl group-hover:text-primary transition-colors">
                    {feature.title}
                  </CardTitle>
                  <CardDescription className="leading-relaxed text-base">
                    {feature.description}
                  </CardDescription>
                </div>
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
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4 md:px-6">
        <Card className="relative overflow-hidden border-2 shadow-2xl">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/95 to-primary/80" />
          <div className="absolute inset-0 bg-grid-pattern opacity-10" />

          {/* Decorative blobs */}
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />

          <CardContent className="relative py-16 md:py-20 text-center space-y-8">
            <div className="space-y-4">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground text-balance">
                Ready to Transform Your IT Experience?
              </h2>
              <p className="text-lg md:text-xl text-primary-foreground/90 max-w-2xl mx-auto text-pretty leading-relaxed">
                Join thousands of satisfied customers who trust us with their
                technology needs. Get started today with no commitment.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href={user ? "/dashboard/services" : "/register"}>
                <Button
                  size="lg"
                  variant="secondary"
                  className="text-base px-8 py-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.05]"
                  data-testid="button-cta-get-started"
                >
                  {user ? "Book Your Service" : "Start Free Today"}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-base px-8 py-6 border-2 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:border-primary-foreground/50 transition-all duration-300 bg-transparent"
                >
                  Talk to an Expert
                </Button>
              </Link>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-8 pt-8 text-primary-foreground/80 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                <span>Cancel anytime</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                <span>24/7 support</span>
              </div>
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
