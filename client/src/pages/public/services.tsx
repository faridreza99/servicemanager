"use client";
import React, { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { PublicLayout } from "@/components/public-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search,
  Filter,
  ArrowRight,
  Shield,
  Server,
  Lock,
  Camera,
  Star,
  CheckCircle2
} from "lucide-react";
import { motion } from "framer-motion";
import type { ServiceWithRating } from "@shared/schema";

// --- Components ---

function ServiceCard({ service, index }: { service: ServiceWithRating; index: number }) {
  // Map categories to icons (consistent with Home)
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
      transition={{ delay: index * 0.05 }}
      className="group flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden hover:shadow-xl hover:border-blue-500/30 dark:hover:border-blue-500/30 transition-all duration-300"
    >
      <div className="h-48 bg-slate-50 dark:bg-slate-950 relative flex items-center justify-center p-6 group-hover:bg-blue-50/50 dark:group-hover:bg-blue-900/10 transition-colors">
        {/* Icon Container */}
        <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-center group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
          <Icon className="w-10 h-10 text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
        </div>

        {/* Rating Badge */}
        <div className="absolute top-4 right-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border border-slate-200 dark:border-slate-800 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 shadow-sm">
          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
          {service.avgRating > 0 ? service.avgRating.toFixed(1) : "New"}
        </div>
      </div>

      <div className="p-6 flex flex-col flex-1">
        <div className="mb-4">
          <div className="flex justify-between items-start mb-2">
            <Badge variant="outline" className="border-slate-200 dark:border-slate-700 text-slate-500 text-[10px] uppercase tracking-wider">
              {service.category}
            </Badge>
            {service.avgRating >= 4.5 && (
              <span className="text-[10px] font-bold text-green-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Popular
              </span>
            )}
          </div>

          <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
            {service.name}
          </h3>
        </div>

        <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-3 mb-6 flex-1 leading-relaxed">
          {service.description}
        </p>

        <div className="flex items-center gap-3 mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
          <Link href={`/services/${service.id}`} className="flex-1">
            <Button className="w-full bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-medium">
              Book Now
            </Button>
          </Link>
          <Link href={`/services/${service.id}`}>
            <Button variant="ghost" size="icon" className="text-slate-500 hover:text-blue-600">
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

export default function ServicesPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const { data, isLoading } = useQuery<{ services: ServiceWithRating[]; pagination: any }>({
    queryKey: ["/api/public/services"],
    queryFn: async () => {
      const res = await fetch("/api/public/services");
      if (!res.ok) throw new Error("Failed to load services");
      return res.json();
    },
  });

  const services = data?.services || [];

  // Filter Logic
  const filteredServices = services.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "all" || s.category.toLowerCase() === category.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(services.map(s => s.category) || [])).sort();

  return (
    <PublicLayout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">

        {/* Page Header */}
        <section className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl">
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
                Service Catalog
              </h1>
              <p className="text-xl text-slate-600 dark:text-slate-300 leading-relaxed">
                Explore our comprehensive range of professional IT and security solutions.
                From residential CCTV to enterprise network infrastructure.
              </p>
            </div>
          </div>
        </section>

        {/* Toolbar & Grid */}
        <section className="py-12">
          <div className="container mx-auto px-4">

            {/* Search & Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4 mb-10 items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm sticky top-20 z-30">
              <div className="relative flex-1 w-full md:max-w-md">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search for services..."
                  className="pl-10 h-10 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="flex gap-4 w-full md:w-auto">
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-[180px] h-10 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button variant="outline" className="border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                </Button>
              </div>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-[400px] bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 animate-pulse" />
                ))
              ) : filteredServices.length > 0 ? (
                filteredServices.map((service, index) => (
                  <ServiceCard key={service.id} service={service} index={index} />
                ))
              ) : (
                <div className="col-span-full py-20 text-center">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No services found</h3>
                  <p className="text-slate-500">Try adjusting your search terms or filters.</p>
                  <Button
                    variant="ghost"
                    className="text-blue-600 mt-2"
                    onClick={() => { setSearch(""); setCategory("all"); }}
                  >
                    Clear all filters
                  </Button>
                </div>
              )}
            </div>

          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
