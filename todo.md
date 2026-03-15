# Detailing Labs — Project TODO

## Phase 1: Foundation
- [x] Project scaffold initialized (db, server, user)
- [x] Database schema designed (18 tables)
- [x] Seed data (services, packages, add-ons, settings)
- [x] Global dark theme (black/purple/white) applied
- [x] Branding & typography set up (Syne + Inter)
- [x] PWA manifest.json

## Phase 2: Marketing Website
- [x] Navigation header with logo and responsive mobile menu
- [x] Home page (hero, services, testimonials, CTA)
- [x] Services page (service cards with details)
- [x] Pricing page (packages + add-ons)
- [x] About page
- [x] Gallery page (before/after)
- [x] Contact page
- [x] FAQ page with accordion
- [x] Site footer

## Phase 3: Customer Booking System
- [x] Multi-step booking form (service → vehicle → location → datetime → contact → confirm)
- [x] Add-ons selection
- [x] Pricing calculation (subtotal, travel fee, tax)
- [x] Booking confirmation page with booking number
- [x] Booking status tracking (public lookup)
- [x] tRPC bookings router (create, list, update, assign, review)

## Phase 4: Admin Dashboard
- [x] Admin login / protected routes (Manus OAuth)
- [x] Dashboard overview (stats, today's schedule, revenue)
- [x] Booking management table (filter, search, status update)
- [x] Calendar view (daily/weekly/monthly)
- [x] Employee management (list + detail + availability)
- [x] CRM overview and customer detail
- [x] Route planning view with Google Maps
- [x] AdminLayout with collapsible sidebar

## Phase 5: CRM System
- [x] Customer profiles with full contact info
- [x] Vehicle history
- [x] Lead tracking with pipeline stages
- [x] Communication logs (notes, calls, emails, SMS, tasks)
- [x] Tags and notes
- [x] Lifetime value tracking
- [x] tRPC CRM router

## Phase 6: Employee Management
- [x] Employee profiles
- [x] Availability scheduling (day-of-week)
- [x] Role assignments (admin/manager/detailer)
- [x] Job assignment system
- [x] Status management (active/inactive/on_leave)
- [x] tRPC Employees router

## Phase 7: Customer Portal
- [x] Booking lookup by booking number (no auth required)
- [x] Booking status display with progress tracker
- [x] Quick actions (book, portal, invoice, review)

## Phase 8: Invoicing & Receipts
- [x] Invoice generation from booking
- [x] Line items (services, add-ons, travel fee, tax)
- [x] Payment status tracking (draft/sent/paid/overdue)
- [x] Print-friendly PDF-style layout
- [x] Invoice detail page for customers
- [x] tRPC Invoices router

## Phase 9: Photo Management
- [x] Before/after/progress/damage photo upload (S3)
- [x] Attach photos to bookings and customers
- [x] Label-based filtering
- [x] Lightbox gallery viewing
- [x] tRPC Media router

## Phase 10: Review Request Workflows
- [x] Manual review request trigger per booking
- [x] Bulk send to all pending completed bookings
- [x] Email/SMS channel selection
- [x] Status tracking (sent/pending)
- [x] Review stats dashboard

## Phase 11: PWA & Polish
- [x] PWA manifest.json
- [x] Mobile responsive design throughout
- [x] Dark theme consistent across all pages
- [x] All routes wired in App.tsx with lazy loading
- [x] TypeScript clean (0 errors)
- [x] Vitest tests (19 tests passing)
- [x] Custom scrollbar styling
- [x] Print styles for invoices

## Phase 12: Site Content Editor (Admin)
- [ ] site_content DB table (key/value store for all editable text)
- [ ] Packages table full CRUD support (name, description, price, duration, features, isPopular, isActive)
- [ ] Add-ons table full CRUD support (name, description, price, isActive)
- [ ] tRPC content router (getAll, upsert, packages CRUD, addons CRUD)
- [ ] AdminSiteEditor page with tabs: Pricing, Hero, Services, FAQs, Contact, Business Settings
- [ ] Public pages read content dynamically from DB
- [ ] Booking flow prices update from DB
- [ ] Wire "Site Editor" nav item in AdminLayout

## Phase 13: User Management Interface
- [x] Extended users router (getById, update, delete, stats)
- [x] AdminUsers full list with search, filter by role, sort
- [x] User detail/edit panel (name, email, phone, role)
- [x] Role assignment (admin/user toggle)
- [x] Account actions (reset password link, delete account)
- [x] User stats summary cards (total, admins, recent signups)

## Phase 14: Email, Invitations & Profile Settings
- [ ] Email provider integration (Resend API) with SMTP fallback
- [ ] Auto-email password reset links when admin generates them
- [ ] User invitations table (token, email, role, expiry)
- [ ] Invite User dialog in Admin → Users (email + role + send)
- [ ] Accept invite registration page (/invite?token=...)
- [ ] Profile Settings page (/profile/settings) with Change Password form
- [ ] Header user menu linking to profile settings
