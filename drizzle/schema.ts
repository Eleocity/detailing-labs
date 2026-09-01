import {
  boolean,
  decimal,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── Users / Auth ─────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  // openId kept for backward compat but no longer required for email/password auth
  openId: varchar("openId", { length: 64 }).unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  phone: varchar("phone", { length: 32 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "employee"])
    .default("user")
    .notNull(),
  // Password reset
  resetToken: varchar("resetToken", { length: 128 }),
  resetTokenExpiresAt: timestamp("resetTokenExpiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── User Invitations ─────────────────────────────────────────────────────────
export const userInvitations = mysqlTable("userInvitations", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  role: mysqlEnum("role", ["user", "admin", "employee"])
    .default("user")
    .notNull(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  invitedBy: int("invitedBy").notNull(), // user id of admin who sent invite
  status: mysqlEnum("status", ["pending", "accepted", "expired"])
    .default("pending")
    .notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  acceptedAt: timestamp("acceptedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserInvitation = typeof userInvitations.$inferSelect;
export type InsertUserInvitation = typeof userInvitations.$inferInsert;

// ─── Customers ────────────────────────────────────────────────────────────────
export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zip: varchar("zip", { length: 20 }),
  notes: text("notes"),
  source: varchar("source", { length: 100 }),
  tags: text("tags"),
  referralCode: varchar("referralCode", { length: 8 }).unique(),
  crmStatus: mysqlEnum("crmStatus", [
    "new_lead",
    "contacted",
    "quote_sent",
    "booked",
    "active",
    "follow_up",
    "vip",
    "inactive",
  ]).default("new_lead"),
  reviewRequestStatus: mysqlEnum("reviewRequestStatus", [
    "not_sent",
    "sent",
    "reminded",
    "completed",
  ]).default("not_sent"),
  lifetimeValue: decimal("lifetimeValue", { precision: 10, scale: 2 }).default(
    "0.00"
  ),
  lastServiceDate: timestamp("lastServiceDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  urableId: varchar("urableId", { length: 100 }), // Urable customer ID for sync
  urableSyncedAt: timestamp("urableSyncedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

// ─── Vehicles ─────────────────────────────────────────────────────────────────
export const vehicles = mysqlTable("vehicles", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(),
  make: varchar("make", { length: 100 }).notNull(),
  model: varchar("model", { length: 100 }).notNull(),
  year: int("year"),
  color: varchar("color", { length: 50 }),
  vehicleType: mysqlEnum("vehicleType", [
    "sedan",
    "suv",
    "truck",
    "van",
    "coupe",
    "convertible",
    "wagon",
    "other",
  ]).default("sedan"),
  licensePlate: varchar("licensePlate", { length: 20 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = typeof vehicles.$inferInsert;

// ─── Services ─────────────────────────────────────────────────────────────────
export const services = mysqlTable("services", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  basePrice: decimal("basePrice", { precision: 10, scale: 2 }).notNull(),
  duration: int("duration").notNull(), // minutes
  isActive: boolean("isActive").default(true),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Service = typeof services.$inferSelect;
export type InsertService = typeof services.$inferInsert;

// ─── Packages ─────────────────────────────────────────────────────────────────
export const packages = mysqlTable("packages", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  // `price` is the flat/"starting" price — kept in sync with `priceSedan`
  // for any package that has vehicle-tiered pricing (see priceSedan below).
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  // Vehicle-size tier prices. NULL on all three means this package has no
  // tiered pricing (e.g. quote-only services) — callers fall back to the
  // flat `price`. See shared/services.ts's resolvePackagePrice().
  priceSedan: decimal("priceSedan", { precision: 10, scale: 2 }),
  priceSuv: decimal("priceSuv", { precision: 10, scale: 2 }),
  priceLarge: decimal("priceLarge", { precision: 10, scale: 2 }),
  duration: int("duration").notNull(), // minutes
  features: text("features"), // JSON array of feature strings
  isPopular: boolean("isPopular").default(false),
  isActive: boolean("isActive").default(true),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Package = typeof packages.$inferSelect;
export type InsertPackage = typeof packages.$inferInsert;

// ─── Add-ons ──────────────────────────────────────────────────────────────────
export const addOns = mysqlTable("addOns", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  duration: int("duration").default(0), // extra minutes
  isActive: boolean("isActive").default(true),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AddOn = typeof addOns.$inferSelect;
export type InsertAddOn = typeof addOns.$inferInsert;

// ─── Employees ────────────────────────────────────────────────────────────────
export const employees = mysqlTable("employees", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  role: mysqlEnum("role", ["admin", "manager", "detailer"])
    .default("detailer")
    .notNull(),
  status: mysqlEnum("status", ["active", "inactive", "on_leave"]).default(
    "active"
  ),
  skills: text("skills"), // JSON array of skill tags
  notes: text("notes"),
  hireDate: timestamp("hireDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;

// ─── Employee Availability ────────────────────────────────────────────────────
export const employeeAvailability = mysqlTable("employeeAvailability", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  dayOfWeek: int("dayOfWeek").notNull(), // 0=Sun, 6=Sat
  startTime: varchar("startTime", { length: 10 }).notNull(), // "09:00"
  endTime: varchar("endTime", { length: 10 }).notNull(), // "17:00"
  isAvailable: boolean("isAvailable").default(true),
});

export type EmployeeAvailability = typeof employeeAvailability.$inferSelect;

// ─── Bookings ─────────────────────────────────────────────────────────────────
export const bookings = mysqlTable("bookings", {
  id: int("id").autoincrement().primaryKey(),
  bookingNumber: varchar("bookingNumber", { length: 20 }).notNull().unique(),
  customerId: int("customerId"),
  vehicleId: int("vehicleId"),
  // Customer info snapshot (for guest bookings)
  customerFirstName: varchar("customerFirstName", { length: 100 }).notNull(),
  customerLastName: varchar("customerLastName", { length: 100 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }),
  customerPhone: varchar("customerPhone", { length: 32 }),
  // Vehicle snapshot
  vehicleMake: varchar("vehicleMake", { length: 100 }),
  vehicleModel: varchar("vehicleModel", { length: 100 }),
  vehicleYear: int("vehicleYear"),
  vehicleColor: varchar("vehicleColor", { length: 50 }),
  vehicleType: varchar("vehicleType", { length: 50 }),
  vehicleLicensePlate: varchar("vehicleLicensePlate", { length: 20 }),
  // Service details
  serviceId: int("serviceId"),
  packageId: int("packageId"),
  addOnIds: text("addOnIds"), // JSON array of add-on IDs
  serviceName: varchar("serviceName", { length: 200 }),
  packageName: varchar("packageName", { length: 200 }),
  // Scheduling
  appointmentDate: timestamp("appointmentDate").notNull(),
  appointmentEndTime: timestamp("appointmentEndTime"),
  duration: int("duration"), // minutes
  // Location
  serviceAddress: text("serviceAddress").notNull(),
  serviceCity: varchar("serviceCity", { length: 100 }),
  serviceState: varchar("serviceState", { length: 50 }),
  serviceZip: varchar("serviceZip", { length: 20 }),
  gateInstructions: text("gateInstructions"),
  // Pricing
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }),
  travelFee: decimal("travelFee", { precision: 10, scale: 2 }).default("0.00"),
  taxAmount: decimal("taxAmount", { precision: 10, scale: 2 }).default("0.00"),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }),
  // Status
  status: mysqlEnum("status", [
    "new",
    "confirmed",
    "assigned",
    "en_route",
    "in_progress",
    "completed",
    "cancelled",
    "no_show",
  ])
    .default("new")
    .notNull(),
  paymentStatus: mysqlEnum("paymentStatus", [
    "unpaid",
    "deposit_paid",
    "paid",
    "refunded",
  ]).default("unpaid"),
  // Meta
  source: varchar("source", { length: 100 }),
  notes: text("notes"),
  internalNotes: text("internalNotes"),
  howHeard: varchar("howHeard", { length: 100 }),
  reviewRequestSent: boolean("reviewRequestSent").default(false),
  urableJobId: varchar("urableJobId", { length: 100 }), // Urable job ID for sync
  urableSyncedAt: timestamp("urableSyncedAt"),
  // BookingProvider result (see server/booking/types.ts) — kept separate from
  // the operational `status` above so the customer-facing confirmation page
  // can show an honest sync/scheduling status without touching admin workflow.
  providerName: varchar("providerName", { length: 40 }), // "urable-api" | "urable-virtual-shop" | "request-only"
  providerStatus: varchar("providerStatus", { length: 40 }), // BookingSyncStatus
  providerMessage: text("providerMessage"),
  externalEventId: varchar("externalEventId", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = typeof bookings.$inferInsert;

// ─── Booking Assignments ──────────────────────────────────────────────────────
export const bookingAssignments = mysqlTable("bookingAssignments", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId").notNull(),
  employeeId: int("employeeId").notNull(),
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
  isPrimary: boolean("isPrimary").default(true),
});

export type BookingAssignment = typeof bookingAssignments.$inferSelect;

// ─── Booking Status History ───────────────────────────────────────────────────
export const bookingStatusHistory = mysqlTable("bookingStatusHistory", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId").notNull(),
  fromStatus: varchar("fromStatus", { length: 50 }),
  toStatus: varchar("toStatus", { length: 50 }).notNull(),
  changedBy: int("changedBy"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── CRM Notes ────────────────────────────────────────────────────────────────
export const crmNotes = mysqlTable("crmNotes", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(),
  bookingId: int("bookingId"),
  type: mysqlEnum("type", [
    "note",
    "call",
    "email",
    "sms",
    "task",
    "reminder",
  ]).default("note"),
  content: text("content").notNull(),
  isCompleted: boolean("isCompleted").default(false),
  dueDate: timestamp("dueDate"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CrmNote = typeof crmNotes.$inferSelect;
export type InsertCrmNote = typeof crmNotes.$inferInsert;

// ─── Invoices ─────────────────────────────────────────────────────────────────
export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  invoiceNumber: varchar("invoiceNumber", { length: 30 }).notNull().unique(),
  bookingId: int("bookingId").notNull(),
  customerId: int("customerId"),
  lineItems: text("lineItems").notNull(), // JSON array of {name, qty, price}
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  travelFee: decimal("travelFee", { precision: 10, scale: 2 }).default("0.00"),
  taxRate: decimal("taxRate", { precision: 5, scale: 4 }).default("0.0000"),
  taxAmount: decimal("taxAmount", { precision: 10, scale: 2 }).default("0.00"),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum("status", [
    "draft",
    "sent",
    "paid",
    "overdue",
    "cancelled",
  ]).default("draft"),
  notes: text("notes"),
  dueDate: timestamp("dueDate"),
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

// ─── Media / Photos ───────────────────────────────────────────────────────────
export const media = mysqlTable("media", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId"),
  bookingDraftId: int("bookingDraftId"), // set when uploaded during the booking wizard, before a booking exists
  customerId: int("customerId"),
  vehicleId: int("vehicleId"),
  uploadedBy: int("uploadedBy"),
  url: text("url").notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  fileName: varchar("fileName", { length: 255 }),
  mimeType: varchar("mimeType", { length: 100 }),
  fileSize: int("fileSize"),
  label: mysqlEnum("label", [
    "before",
    "after",
    "progress",
    "damage",
    "completed",
    "other",
  ]).default("other"),
  caption: text("caption"),
  isPublic: boolean("isPublic").default(false),
  galleryOrder: int("galleryOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Media = typeof media.$inferSelect;
export type InsertMedia = typeof media.$inferInsert;

// ─── Review Requests ──────────────────────────────────────────────────────────
export const reviewRequests = mysqlTable("reviewRequests", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId").notNull(),
  customerId: int("customerId"),
  channel: mysqlEnum("channel", ["email", "sms", "both"]).default("email"),
  status: mysqlEnum("status", [
    "pending",
    "sent",
    "reminded",
    "completed",
    "opted_out",
  ]).default("pending"),
  sentAt: timestamp("sentAt"),
  reminderSentAt: timestamp("reminderSentAt"),
  completedAt: timestamp("completedAt"),
  reviewLink: text("reviewLink"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ReviewRequest = typeof reviewRequests.$inferSelect;

// ─── Notifications ────────────────────────────────────────────────────────────
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  type: varchar("type", { length: 100 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  isRead: boolean("isRead").default(false),
  relatedId: int("relatedId"),
  relatedType: varchar("relatedType", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;

// ─── Business Settings ────────────────────────────────────────────────────────
export const businessSettings = mysqlTable("businessSettings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Site Content ───────────────────────────────────────────────────────────────
export const siteContent = mysqlTable("siteContent", {
  id: int("id").autoincrement().primaryKey(),
  section: varchar("section", { length: 100 }).notNull(), // e.g. 'hero', 'about', 'faq'
  key: varchar("key", { length: 100 }).notNull(), // e.g. 'headline', 'subtext'
  value: text("value"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SiteContent = typeof siteContent.$inferSelect;
export type InsertSiteContent = typeof siteContent.$inferInsert;

// ─── Service Areas ────────────────────────────────────────────────────────────
export const serviceAreas = mysqlTable("serviceAreas", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  zipCodes: text("zipCodes"), // JSON array
  travelFee: decimal("travelFee", { precision: 10, scale: 2 }).default("0.00"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Blog Posts ───────────────────────────────────────────────────────────────
export const blogPosts = mysqlTable("blogPosts", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 500 }).notNull(),
  excerpt: text("excerpt"),
  content: text("content"),
  authorId: int("authorId"),
  status: mysqlEnum("status", ["draft", "published", "archived"])
    .default("draft")
    .notNull(),
  featuredImage: text("featuredImage"),
  seoTitle: varchar("seoTitle", { length: 500 }),
  seoDescription: text("seoDescription"),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = typeof blogPosts.$inferInsert;

// ─── Loyalty Points ───────────────────────────────────────────────────────────
export const loyaltyPoints = mysqlTable("loyaltyPoints", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(),
  bookingId: int("bookingId"),
  points: int("points").notNull(),
  type: mysqlEnum("type", ["earned", "redeemed", "adjusted"])
    .default("earned")
    .notNull(),
  description: varchar("description", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LoyaltyPoint = typeof loyaltyPoints.$inferSelect;

// ─── Referrals ────────────────────────────────────────────────────────────────
export const referrals = mysqlTable("referrals", {
  id: int("id").autoincrement().primaryKey(),
  referrerId: int("referrerId").notNull(),
  referredCustomerId: int("referredCustomerId").notNull(),
  bookingId: int("bookingId"),
  status: mysqlEnum("status", ["pending", "qualified", "rewarded"])
    .default("pending")
    .notNull(),
  rewardAmount: decimal("rewardAmount", { precision: 10, scale: 2 }).default(
    "0.00"
  ),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Referral = typeof referrals.$inferSelect;

// ─── Condition Reports ────────────────────────────────────────────────────────
export const conditionReports = mysqlTable("conditionReports", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId").notNull(),
  customerId: int("customerId"),
  vehicleId: int("vehicleId"),
  checkedById: int("checkedById"),
  paintCondition: mysqlEnum("paintCondition", [
    "excellent",
    "good",
    "fair",
    "poor",
  ]).default("good"),
  interiorCondition: mysqlEnum("interiorCondition", [
    "excellent",
    "good",
    "fair",
    "poor",
  ]).default("good"),
  existingDamage: text("existingDamage"), // JSON array of {location, description, severity}
  notes: text("notes"),
  photos: text("photos"), // JSON array of S3 URLs
  customerSignature: boolean("customerSignature").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ConditionReport = typeof conditionReports.$inferSelect;

// ─── Gift Cards ───────────────────────────────────────────────────────────────
export const giftCards = mysqlTable("giftCards", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 12 }).notNull().unique(),
  purchaserName: varchar("purchaserName", { length: 200 }),
  purchaserEmail: varchar("purchaserEmail", { length: 320 }),
  recipientName: varchar("recipientName", { length: 200 }),
  recipientEmail: varchar("recipientEmail", { length: 320 }),
  initialBalance: decimal("initialBalance", {
    precision: 10,
    scale: 2,
  }).notNull(),
  currentBalance: decimal("currentBalance", {
    precision: 10,
    scale: 2,
  }).notNull(),
  status: mysqlEnum("status", ["active", "redeemed", "expired", "cancelled"])
    .default("active")
    .notNull(),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GiftCard = typeof giftCards.$inferSelect;

export const giftCardTransactions = mysqlTable("giftCardTransactions", {
  id: int("id").autoincrement().primaryKey(),
  giftCardId: int("giftCardId").notNull(),
  bookingId: int("bookingId"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  type: mysqlEnum("type", ["issue", "redeem", "refund", "adjustment"])
    .default("issue")
    .notNull(),
  note: varchar("note", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Follow-Up Queue ──────────────────────────────────────────────────────────
export const followUpQueue = mysqlTable("followUpQueue", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId").notNull(),
  customerId: int("customerId"),
  type: mysqlEnum("type", ["review_request", "follow_up", "rebook_offer"])
    .default("review_request")
    .notNull(),
  scheduledFor: timestamp("scheduledFor").notNull(),
  sentAt: timestamp("sentAt"),
  status: mysqlEnum("status", ["pending", "sent", "skipped"])
    .default("pending")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FollowUpQueueItem = typeof followUpQueue.$inferSelect;

// ─── Appointment Reminders ────────────────────────────────────────────────────
export const appointmentReminders = mysqlTable("appointmentReminders", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId").notNull(),
  type: mysqlEnum("type", ["24h", "2h"]).default("24h").notNull(),
  channel: mysqlEnum("channel", ["email", "sms"]).default("email").notNull(),
  scheduledFor: timestamp("scheduledFor").notNull(),
  sentAt: timestamp("sentAt"),
  status: mysqlEnum("status", ["pending", "sent", "failed", "disabled"])
    .default("pending")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AppointmentReminder = typeof appointmentReminders.$inferSelect;

// ─── Integration Mappings ─────────────────────────────────────────────────────
// Local <-> Urable ID mapping + sync bookkeeping, per entity. Urable remains
// the operational source of truth for customers/vehicles/jobs; this table
// only tracks the relationship and sync health so we never create duplicate
// Urable records for the same local entity.
export const integrationMappings = mysqlTable("integrationMappings", {
  id: int("id").autoincrement().primaryKey(),
  entityType: mysqlEnum("entityType", [
    "customer",
    "vehicle",
    "booking",
    "order",
  ]).notNull(),
  localId: int("localId").notNull(), // e.g. customers.id / vehicles.id / bookings.id
  externalCustomerId: varchar("externalCustomerId", { length: 100 }),
  externalVehicleId: varchar("externalVehicleId", { length: 100 }),
  externalJobId: varchar("externalJobId", { length: 100 }),
  externalEventId: varchar("externalEventId", { length: 100 }),
  externalOrderId: varchar("externalOrderId", { length: 100 }),
  syncStatus: mysqlEnum("syncStatus", ["pending", "synced", "failed"])
    .default("pending")
    .notNull(),
  lastSyncedAt: timestamp("lastSyncedAt"),
  lastError: text("lastError"),
  /** Prevents duplicate Urable records from a retried/duplicate submission. */
  idempotencyKey: varchar("idempotencyKey", { length: 100 }).unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type IntegrationMapping = typeof integrationMappings.$inferSelect;
export type InsertIntegrationMapping = typeof integrationMappings.$inferInsert;

// ─── Booking Drafts ───────────────────────────────────────────────────────────
// Multi-step booking wizard state, persisted so a customer can resume on
// another device/tab and so photo uploads have something to attach to
// before the booking is actually submitted. Never treated as a confirmed
// booking or a competing calendar — it's just wizard-in-progress state.
export const bookingDrafts = mysqlTable("bookingDrafts", {
  id: int("id").autoincrement().primaryKey(),
  token: varchar("token", { length: 40 }).notNull().unique(), // opaque client-facing reference
  customerId: int("customerId"),
  step: varchar("step", { length: 40 }).default("service_type"),
  serviceType: mysqlEnum("serviceType", ["mobile", "drop_off", "estimate"]),
  selections: json("selections"), // package/add-ons/vehicle/schedule selections so far
  conditionAnswers: json("conditionAnswers"), // structured Step 5 answers
  attribution: json("attribution"), // UTM/campaign params
  bookingId: int("bookingId"), // set once submitted
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BookingDraft = typeof bookingDrafts.$inferSelect;
export type InsertBookingDraft = typeof bookingDrafts.$inferInsert;

// ─── FormaOps: Governance Foundation ───────────────────────────────────────
// See docs/formaops/DATABASE.md. Additive only — nothing above this section
// is touched. `businessMemberships.role` is a separate concept from the
// existing `users.role` and does not replace any existing admin check.

export const businesses = mysqlTable("businesses", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Business = typeof businesses.$inferSelect;
export type InsertBusiness = typeof businesses.$inferInsert;

export const FORMAOPS_ROLES = [
  "OWNER",
  "OPERATIONS_MANAGER",
  "MANAGER",
  "EMPLOYEE",
  "AI_SYSTEM",
] as const;
export type FormaOpsRole = (typeof FORMAOPS_ROLES)[number];

export const businessMemberships = mysqlTable("businessMemberships", {
  id: int("id").autoincrement().primaryKey(),
  businessId: int("businessId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", FORMAOPS_ROLES).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BusinessMembership = typeof businessMemberships.$inferSelect;
export type InsertBusinessMembership = typeof businessMemberships.$inferInsert;

// Permission catalog — see docs/formaops/PERMISSIONS.md for the full list
// and default grants. Stored as data (not scattered string literals) so
// grants can be edited without a code deploy once an admin UI exists.
export const permissions = mysqlTable("permissions", {
  key: varchar("key", { length: 100 }).primaryKey(),
  description: text("description").notNull(),
});

export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = typeof permissions.$inferInsert;

export const rolePermissions = mysqlTable("rolePermissions", {
  id: int("id").autoincrement().primaryKey(),
  role: mysqlEnum("role", FORMAOPS_ROLES).notNull(),
  permissionKey: varchar("permissionKey", { length: 100 }).notNull(),
});

export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = typeof rolePermissions.$inferInsert;

export const CHANGE_REQUEST_CATEGORIES = [
  "pricing",
  "hours",
  "services",
  "promotions",
  "content",
  "business_profile",
  "other",
] as const;
export type ChangeRequestCategory = (typeof CHANGE_REQUEST_CATEGORIES)[number];

export const CHANGE_REQUEST_STATUSES = [
  "DRAFT",
  "AWAITING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "EXECUTING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
] as const;
export type ChangeRequestStatus = (typeof CHANGE_REQUEST_STATUSES)[number];

// The current, real ChangeRequest model. Deliberately a smaller status set
// and a single required-approval-role (not N-of-M) than the full spec
// describes — see docs/formaops/DECISIONS.md ADR-005 for why.
export const changeRequests = mysqlTable("changeRequests", {
  id: int("id").autoincrement().primaryKey(),
  businessId: int("businessId").notNull(),
  submittedByUserId: int("submittedByUserId").notNull(),
  source: varchar("source", { length: 40 }).notNull(), // e.g. "web_chat", "admin_dashboard"
  category: mysqlEnum("category", CHANGE_REQUEST_CATEGORIES).notNull(),
  riskLevel: mysqlEnum("riskLevel", ["GREEN", "YELLOW", "RED"]).notNull(),
  status: mysqlEnum("status", CHANGE_REQUEST_STATUSES)
    .default("AWAITING_APPROVAL")
    .notNull(),
  originalRequest: text("originalRequest").notNull(),
  proposedChange: json("proposedChange").notNull(),
  requiredApprovalRole: mysqlEnum("requiredApprovalRole", FORMAOPS_ROLES).notNull(),
  reasoningSummary: text("reasoningSummary"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChangeRequest = typeof changeRequests.$inferSelect;
export type InsertChangeRequest = typeof changeRequests.$inferInsert;

export const approvals = mysqlTable("approvals", {
  id: int("id").autoincrement().primaryKey(),
  changeRequestId: int("changeRequestId").notNull(),
  approvedByUserId: int("approvedByUserId").notNull(),
  decision: mysqlEnum("decision", ["APPROVED", "REJECTED"]).notNull(),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Approval = typeof approvals.$inferSelect;
export type InsertApproval = typeof approvals.$inferInsert;

// Append-only. Nothing in server/formaops/ ever updates or deletes a row here.
export const auditEvents = mysqlTable("auditEvents", {
  id: int("id").autoincrement().primaryKey(),
  businessId: int("businessId").notNull(),
  actorUserId: int("actorUserId"), // null only for genuinely system-initiated events
  actorType: mysqlEnum("actorType", ["HUMAN", "AI_SYSTEM"]).notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  targetType: varchar("targetType", { length: 60 }).notNull(),
  targetId: int("targetId"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditEvent = typeof auditEvents.$inferSelect;
export type InsertAuditEvent = typeof auditEvents.$inferInsert;
