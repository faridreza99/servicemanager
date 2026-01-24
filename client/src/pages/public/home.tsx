"use client";
import React from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useSiteSettings } from "@/lib/site-settings";
import { PublicLayout } from "@/components/public-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  CheckCircle,
  Clock,
  Phone,
  Camera,
  Server,
  Lock,
  ArrowRight,
  Star,
  MapPin,
  Calendar
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ServiceWithRating } from "@shared/schema";

// --- Components ---

function ServiceCard({ service, index }: { service: ServiceWithRating; index: number }) {
  // Map categories to icons
  const getIcon = (cat: string) => {
    const c = cat.toLowerCase();
    if (c.includes("cctv") || c.includes("camera")) return Camera;
    if (c.includes("network") || c.includes("wifi")) return Server;
    if (c.includes("security")) return Lock;
    return Shield;
  };

  const Icon = getIcon(service.category);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col h-full"
    >
      <div className="h-48 bg-slate-100 dark:bg-slate-800 relative flex items-center justify-center overflow-hidden">
        {/* Placeholder for service image - using icon for now */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900" />
        <Icon className="w-16 h-16 text-slate-300 dark:text-slate-600 group-hover:scale-110 transition-transform duration-500" />
        <div className="absolute top-4 right-4 bg-white dark:bg-slate-900 px-3 py-1 rounded-full text-xs font-bold shadow-sm flex items-center gap-1">
          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
          {service.avgRating.toFixed(1)}
        </div>
      </div>

      <div className="p-6 flex flex-col flex-1">
        <div className="mb-4">
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            {service.category}
          </span>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1 group-hover:text-blue-600 transition-colors">
            {service.name}
          </h3>
        </div>

        <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-3 mb-6 flex-1">
          {service.description}
        </p>

        <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-slate-500">Starting from</span>
            <span className="font-bold text-slate-900 dark:text-white">$ --</span>
          </div>
          <Link href={`/services/${service.id}`}>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
              Book Now
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

function HeroSection() {
  const { user } = useAuth();
  const { settings } = useSiteSettings();

  return (
    <section className="relative bg-white dark:bg-slate-900 text-slate-900 dark:text-white overflow-hidden transition-colors duration-300">
      {/* Background Image Overlay */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/90 z-10" />
        {/* Abstract grid/server pattern */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-10 dark:opacity-20 mix-blend-overlay" />
      </div>

      <div className="container relative z-20 px-4 py-20 md:py-32 flex flex-col md:flex-row items-center gap-12">
        <div className="flex-1 space-y-8 text-center md:text-left">
          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border-blue-200 dark:border-blue-500/50 px-4 py-1.5 text-sm">
            <Shield className="w-3.5 h-3.5 mr-2" />
            Professional Security Solutions
          </Badge>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
            Secure Your Property.<br />
            <span className="text-blue-600 dark:text-blue-400">Manage Your Infrastructure.</span>
          </h1>

          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
            Leading provider of CCTV installation, network maintenance, and IT security services.
            Trusted by businesses for over 10 years.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
            <Link href={user ? "/dashboard/services" : "/register"}>
              <Button size="lg" className="h-14 px-8 text-lg bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/10">
                Book a Service
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
                <Phone className="w-5 h-5 mr-2" />
                Contact Sales
              </Button>
            </Link>
          </div>

          <div className="pt-8 flex items-center justify-center md:justify-start gap-8 text-slate-500 dark:text-slate-400 text-sm font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-500" />
              Licensed & Insured
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              24/7 Response
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustSection() {
  return (
    <section className="py-10 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
      <div className="container mx-auto px-4">
        <p className="text-center text-sm font-bold text-slate-400 uppercase tracking-widest mb-8">Trusted by industry leaders</p>
        <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-60 grayscale">
          {/* Placeholders for logos */}
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-8 w-32 bg-slate-300 dark:bg-slate-700 rounded" />
          ))}
        </div>
      </div>
    </section>
  )
}

function ServicesGrid() {
  const { data: services, isLoading } = useQuery<ServiceWithRating[]>({
    queryKey: ["/api/public/services/featured"],
    queryFn: async () => {
      const res = await fetch("/api/public/services/featured");
      if (!res.ok) throw new Error("Failed to load services");
      return res.json();
    },
  });

  return (
    <section className="py-24 bg-white dark:bg-slate-950">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Professional IT & Security Services
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            We offer end-to-end solutions for homes and businesses. Select a category to get started.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-96 bg-slate-100 dark:bg-slate-900 rounded-lg animate-pulse" />
            ))
          ) : (
            services?.map((service, index) => (
              <ServiceCard key={service.id} service={service} index={index} />
            ))
          )}
        </div>

        <div className="mt-16 text-center">
          <Link href="/services">
            <Button size="lg" variant="outline" className="border-slate-300 px-8">
              View All Services
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-24 bg-blue-600 text-white">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to secure your business?</h2>
        <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-10">
          Get a custom quote within 24 hours. Our certified team is ready to deploy.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/register">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 h-14 px-8 text-lg font-bold">
              Get Started Now
            </Button>
          </Link>
          <Link href="/contact">
            <Button size="lg" variant="outline" className="border-blue-400 text-white hover:bg-blue-700 h-14 px-8 text-lg">
              Talk to an Expert
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}

export default function HomePage() {
  return (
    <PublicLayout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <HeroSection />
        <TrustSection />
        <ServicesGrid />
        <CTASection />
      </div>
    </PublicLayout>
  );
}
