import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useSiteSettings } from "@/lib/site-settings";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Shield, Menu, User, LogOut, LayoutDashboard, ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

function NavLinks({ onClick }: { onClick?: () => void }) {
  const [location] = useLocation();
  
  return (
    <>
      {navLinks.map((link) => (
        <Link key={link.href} href={link.href}>
          <span
            onClick={onClick}
            className={`text-sm font-medium transition-colors cursor-pointer ${
              location === link.href
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid={`link-nav-${link.label.toLowerCase()}`}
          >
            {link.label}
          </span>
        </Link>
      ))}
    </>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  
  if (!user) return null;
  
  const dashboardPath = user.role === "admin" ? "/admin" : user.role === "staff" ? "/staff" : "/dashboard";
  const initials = user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2" data-testid="button-user-menu">
          <Avatar className="h-7 w-7">
            <AvatarImage src={user.profilePhoto || undefined} alt={user.name} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="hidden md:inline text-sm">{user.name}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => setLocation(dashboardPath)} data-testid="link-dashboard">
          <LayoutDashboard className="mr-2 h-4 w-4" />
          Dashboard
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} data-testid="button-logout">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Header() {
  const { user, isLoading } = useAuth();
  const { settings } = useSiteSettings();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer" data-testid="link-logo">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt={settings.siteName} className="h-8 w-auto" />
              ) : (
                <Shield className="h-8 w-8 text-primary" />
              )}
              <span className="font-bold text-lg hidden sm:inline">{settings.siteName}</span>
            </div>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            <NavLinks />
          </nav>
          
          <div className="flex items-center gap-2">
            <ThemeToggle />
            
            {!isLoading && (
              <>
                {user ? (
                  <UserMenu />
                ) : (
                  <div className="hidden md:flex items-center gap-2">
                    <Link href="/login">
                      <Button variant="ghost" data-testid="button-login">Login</Button>
                    </Link>
                    <Link href="/register">
                      <Button data-testid="button-register">Get Started</Button>
                    </Link>
                  </div>
                )}
              </>
            )}
            
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" data-testid="button-mobile-menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <nav className="flex flex-col gap-4 mt-8">
                  <NavLinks onClick={() => setMobileMenuOpen(false)} />
                  
                  {!isLoading && !user && (
                    <div className="flex flex-col gap-2 mt-4 pt-4 border-t">
                      <Link href="/login">
                        <Button variant="outline" className="w-full" onClick={() => setMobileMenuOpen(false)}>
                          Login
                        </Button>
                      </Link>
                      <Link href="/register">
                        <Button className="w-full" onClick={() => setMobileMenuOpen(false)}>
                          Get Started
                        </Button>
                      </Link>
                    </div>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  const { settings } = useSiteSettings();
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer mb-4">
                {settings.logoUrl ? (
                  <img src={settings.logoUrl} alt={settings.siteName} className="h-8 w-auto" />
                ) : (
                  <Shield className="h-8 w-8 text-primary" />
                )}
                <span className="font-bold text-lg">{settings.siteName}</span>
              </div>
            </Link>
            <p className="text-sm text-muted-foreground max-w-md">
              {settings.siteDescription}
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <span className="text-sm text-muted-foreground hover:text-foreground cursor-pointer">
                    {link.label}
                  </span>
                </Link>
              ))}
            </nav>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Account</h4>
            <nav className="flex flex-col gap-2">
              <Link href="/login">
                <span className="text-sm text-muted-foreground hover:text-foreground cursor-pointer">
                  Login
                </span>
              </Link>
              <Link href="/register">
                <span className="text-sm text-muted-foreground hover:text-foreground cursor-pointer">
                  Register
                </span>
              </Link>
            </nav>
          </div>
        </div>
        
        <div className="border-t mt-8 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {currentYear} {settings.siteName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
