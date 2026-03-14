import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Loader2 } from "lucide-react";

// Marketing pages
const Home = lazy(() => import("./pages/Home"));
const Services = lazy(() => import("./pages/Services"));
const Pricing = lazy(() => import("./pages/Pricing"));
const About = lazy(() => import("./pages/About"));
const Gallery = lazy(() => import("./pages/Gallery"));
const Contact = lazy(() => import("./pages/Contact"));
const FAQ = lazy(() => import("./pages/FAQ"));

// Booking
const Booking = lazy(() => import("./pages/Booking"));
const BookingConfirmation = lazy(() => import("./pages/BookingConfirmation"));

// Customer portal
const CustomerPortal = lazy(() => import("./pages/CustomerPortal"));
const InvoiceDetail = lazy(() => import("./pages/InvoiceDetail"));

// Admin pages
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminBookings = lazy(() => import("./pages/admin/AdminBookings").then(m => ({ default: m.AdminBookingsList })));
const AdminBookingDetail = lazy(() => import("./pages/admin/AdminBookings").then(m => ({ default: m.AdminBookingDetail })));
const AdminSchedule = lazy(() => import("./pages/admin/AdminSchedule"));
const AdminCRMList = lazy(() => import("./pages/admin/AdminCRM").then(m => ({ default: m.AdminCRMList })));
const AdminCRMDetail = lazy(() => import("./pages/admin/AdminCRM").then(m => ({ default: m.AdminCRMDetail })));
const AdminEmployeesList = lazy(() => import("./pages/admin/AdminEmployees").then(m => ({ default: m.AdminEmployeesList })));
const AdminEmployeeDetail = lazy(() => import("./pages/admin/AdminEmployees").then(m => ({ default: m.AdminEmployeeDetail })));
const AdminInvoicesList = lazy(() => import("./pages/admin/AdminInvoices").then(m => ({ default: m.AdminInvoicesList })));
const AdminMedia = lazy(() => import("./pages/admin/AdminMedia"));
const AdminReviews = lazy(() => import("./pages/admin/AdminReviews"));
const AdminRoutePlanner = lazy(() => import("./pages/admin/AdminRoutePlanner"));

function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {/* Marketing */}
        <Route path="/" component={Home} />
        <Route path="/services" component={Services} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/about" component={About} />
        <Route path="/gallery" component={Gallery} />
        <Route path="/contact" component={Contact} />
        <Route path="/faq" component={FAQ} />

        {/* Booking */}
        <Route path="/booking" component={Booking} />
        <Route path="/booking/confirmation/:bookingNumber" component={BookingConfirmation} />

        {/* Customer Portal */}
        <Route path="/portal" component={CustomerPortal} />
        <Route path="/invoice/:id" component={InvoiceDetail} />

        {/* Admin */}
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/bookings" component={AdminBookings} />
        <Route path="/admin/bookings/:id" component={AdminBookingDetail} />
        <Route path="/admin/schedule" component={AdminSchedule} />
        <Route path="/admin/crm" component={AdminCRMList} />
        <Route path="/admin/crm/:id" component={AdminCRMDetail} />
        <Route path="/admin/employees" component={AdminEmployeesList} />
        <Route path="/admin/employees/:id" component={AdminEmployeeDetail} />
        <Route path="/admin/invoices" component={AdminInvoicesList} />
        <Route path="/admin/media" component={AdminMedia} />
        <Route path="/admin/reviews" component={AdminReviews} />
        <Route path="/admin/route-planner" component={AdminRoutePlanner} />

        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
