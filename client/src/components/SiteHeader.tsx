import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Menu,
  X,
  Phone,
  ChevronRight,
  ChevronDown,
  User,
  LogOut,
  Car,
  Calendar,
  LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { BRAND } from "@shared/brand";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Top-level links. "Services" expands into a dropdown on desktop (see
// SERVICES_SUBLINKS) and a flat section on mobile — every destination the
// nav is required to expose stays one tap away either way.
const navLinks = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Pricing" },
  { href: "/commercial", label: "Commercial" },
  { href: "/service-area", label: "Service Area" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

const SERVICES_SUBLINKS = [
  { href: "/services", label: "All Services" },
  { href: "/ceramic-coatings", label: "Ceramic Coatings" },
  { href: "/paint-correction", label: "Paint Correction" },
  { href: "/mobile-detailing", label: "Mobile Detailing" },
];

export default function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();

  const { data: contactContent } = trpc.content.getSiteContent.useQuery({
    section: "contact",
  });
  const phone =
    contactContent?.find(r => r.key === "phone")?.value || BRAND.phone;
  const phoneHref = `tel:${phone.replace(/\D/g, "")}`;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map(n => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[oklch(0.04_0_0/0.95)] backdrop-blur-md border-b border-[#262626]"
          : "bg-transparent"
      }`}
    >
      <div className="container">
        <div className="flex items-center justify-between h-20 sm:h-24 lg:h-28">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center cursor-pointer">
              <img
                src={BRAND.logo.wordmark}
                alt={BRAND.displayName}
                className="h-12 sm:h-14 lg:h-16 w-auto object-contain"
              />
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            <Link href="/">
              <span
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                  location === "/"
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Home
              </span>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                    location.startsWith("/services") ||
                    location.startsWith("/ceramic-coatings") ||
                    location.startsWith("/paint-correction") ||
                    location.startsWith("/mobile-detailing")
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Services <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-52 bg-card border-border"
              >
                {SERVICES_SUBLINKS.map(link => (
                  <DropdownMenuItem
                    key={link.href}
                    onClick={() => setLocation(link.href)}
                    className="cursor-pointer"
                  >
                    {link.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {navLinks.slice(1).map(link => (
              <Link key={link.href} href={link.href}>
                <span
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                    location === link.href
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {link.label}
                </span>
              </Link>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center gap-3">
            <a
              href={phoneHref}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Phone className="w-4 h-4" />
              {phone}
            </a>

            {user ? (
              // Logged-in user menu
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card hover:border-primary/40 transition-colors">
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                      {initials}
                    </div>
                    <span className="text-sm font-medium text-foreground max-w-[100px] truncate">
                      {user.name ?? "Account"}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-52 bg-card border-border"
                >
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-xs font-semibold text-foreground">
                      {user.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                  <DropdownMenuItem
                    onClick={() => setLocation("/portal")}
                    className="cursor-pointer gap-2"
                  >
                    <Calendar className="w-4 h-4" /> My Bookings
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setLocation("/portal/garage")}
                    className="cursor-pointer gap-2"
                  >
                    <Car className="w-4 h-4" /> My Garage
                  </DropdownMenuItem>
                  {user.role === "admin" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setLocation("/admin")}
                        className="cursor-pointer gap-2 text-primary"
                      >
                        <LayoutDashboard className="w-4 h-4" /> Admin Dashboard
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={logout}
                    className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              // Sign in button
              <Link href="/login?returnTo=/portal">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border text-foreground hover:border-primary/40 gap-2"
                >
                  <User className="w-4 h-4" /> Sign In
                </Button>
              </Link>
            )}

            <Link href={BRAND.booking.primaryPath}>
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5"
              >
                Book Now <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="lg:hidden p-2 text-muted-foreground hover:text-foreground"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="lg:hidden bg-[#0a0a0a] border-t border-border">
          <div className="container py-4 flex flex-col gap-1">
            {[navLinks[0], ...SERVICES_SUBLINKS, ...navLinks.slice(1)].map(
              link => (
                <Link key={link.href} href={link.href}>
                  <span
                    className={`block px-4 py-3 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                      location === link.href
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    {link.label}
                  </span>
                </Link>
              )
            )}
            <div className="pt-3 border-t border-border mt-2 flex flex-col gap-2">
              {user ? (
                <>
                  <div className="px-4 py-2 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                      {initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <Link href="/portal">
                    <span className="block px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground cursor-pointer">
                      My Bookings
                    </span>
                  </Link>
                  <Link href="/portal/garage">
                    <span className="block px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground cursor-pointer">
                      My Garage
                    </span>
                  </Link>
                  {user.role === "admin" && (
                    <Link href="/admin">
                      <span className="block px-4 py-2.5 text-sm text-primary cursor-pointer">
                        Admin Dashboard
                      </span>
                    </Link>
                  )}
                  <button
                    onClick={logout}
                    className="px-4 py-2.5 text-sm text-destructive text-left"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <Link href="/login?returnTo=/portal">
                  <Button
                    variant="outline"
                    className="w-full border-border gap-2"
                  >
                    <User className="w-4 h-4" /> Sign In
                  </Button>
                </Link>
              )}
              <Link href={BRAND.booking.primaryPath}>
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                  Book Now <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
