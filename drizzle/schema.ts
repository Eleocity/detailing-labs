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
  role: mysqlEnum("role", ["user", "admin", "employee"]).default("user").notNull(),
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
  role: mysqlEnum("role", ["user", "admin", "employee"]).default("user").notNull(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  invitedBy: int("invitedBy").notNull(), // user id of admin who sent invite
  status: mysqlEnum("status", ["pending", "accepted", "expired"]).default("pending").notNull(),
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
  crmStatus: mysqlEnum("crmStatus", [
    "new_lead", "contacted", "quote_sent", "booked",
    "active", "follow_up", "vip", "inactive"
  ]).default("new_lead"),
  reviewRequestStatus: mysqlEnum("reviewRequestStatus", [
    "not_sent", "sent", "reminded", "completed"
  ]).default("not_sent"),
  lifetimeValue: decimal("lifetimeValue", { precision: 10, scale: 2 }).default("0.00"),
  lastServiceDate: timestamp("lastServiceDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  emailUnsubscribed: boolean("emailUnsubscribed").default(false),
  emailUnsubscribedAt: timestamp("emailUnsubscribedAt"),
  urableId: varchar("urableId", { length: 100 }),  // Urable customer ID for sync
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
    "sedan", "suv", "truck", "van", "coupe", "convertible", "wagon", "other"
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
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
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
  role: mysqlEnum("role", ["admin", "manager", "detailer"]).default("detailer").notNull(),
  status: mysqlEnum("status", ["active", "inactive", "on_leave"]).default("active"),
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
    "new", "confirmed", "assigned", "en_route",
    "in_progress", "completed", "cancelled", "no_show"
  ]).default("new").notNull(),
  paymentStatus: mysqlEnum("paymentStatus", [
    "unpaid", "deposit_paid", "paid", "refunded"
  ]).default("unpaid"),
  // Meta
  source: varchar("source", { length: 100 }),
  notes: text("notes"),
  internalNotes: text("internalNotes"),
  howHeard: varchar("howHeard", { length: 100 }),
  reviewRequestSent: boolean("reviewRequestSent").default(false),
  urableJobId: varchar("urableJobId", { length: 100 }),  // Urable job ID for sync
  urableSyncedAt: timestamp("urableSyncedAt"),
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
  type: mysqlEnum("type", ["note", "call", "email", "sms", "task", "reminder"]).default("note"),
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
  status: mysqlEnum("status", ["draft", "sent", "paid", "overdue", "cancelled"]).default("draft"),
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
  customerId: int("customerId"),
  vehicleId: int("vehicleId"),
  uploadedBy: int("uploadedBy"),
  url: text("url").notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  fileName: varchar("fileName", { length: 255 }),
  mimeType: varchar("mimeType", { length: 100 }),
  fileSize: int("fileSize"),
  label: mysqlEnum("label", ["before", "after", "progress", "damage", "completed", "other"]).default("other"),
  caption: text("caption"),
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
  status: mysqlEnum("status", ["pending", "sent", "reminded", "completed", "opted_out"]).default("pending"),
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
  key: varchar("key", { length: 100 }).notNull(),          // e.g. 'headline', 'subtext'
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

// ─── Email Unsubscribes ───────────────────────────────────────────────────────
// Stores unsubscribed emails regardless of whether they are customers.
// Checked before any marketing email is sent.
export const emailUnsubscribes = mysqlTable("emailUnsubscribes", {
  id:           int("id").autoincrement().primaryKey(),
  email:        varchar("email", { length: 320 }).notNull().unique(),
  unsubscribedAt: timestamp("unsubscribedAt").defaultNow().notNull(),
  source:       varchar("source", { length: 50 }).default("self"), // 'self' | 'admin'
});
export type EmailUnsubscribe = typeof emailUnsubscribes.$inferSelect;

// ─── Email Automation Log ─────────────────────────────────────────────────────
export const emailAutomationLog = mysqlTable("emailAutomationLog", {
  id:                 int("id").autoincrement().primaryKey(),
  automationType:     varchar("automationType", { length: 60 }).notNull(),
  customAutomationId: int("customAutomationId"),
  bookingId:          int("bookingId"),
  customerId:         int("customerId"),
  email:          varchar("email", { length: 320 }).notNull(),
  status:         varchar("status", { length: 20 }).notNull().default("sent"),
  sentAt:         timestamp("sentAt").defaultNow().notNull(),
  error:          text("error"),
});
export type EmailAutomationLog = typeof emailAutomationLog.$inferSelect;

// ─── Email Automation Settings ────────────────────────────────────────────────
export const emailAutomationSettings = mysqlTable("emailAutomationSettings", {
  id:        int("id").autoincrement().primaryKey(),
  type:      varchar("type", { length: 60 }).notNull().unique(),
  enabled:   boolean("enabled").notNull().default(true),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type EmailAutomationSettings = typeof emailAutomationSettings.$inferSelect;

// ─── Custom Email Automations ─────────────────────────────────────────────────
export const emailCustomAutomations = mysqlTable("emailCustomAutomations", {
  id:           int("id").autoincrement().primaryKey(),
  name:         varchar("name", { length: 200 }).notNull(),
  // Trigger types: days_after_booking_created | days_before_appointment
  //                days_after_completed       | days_since_last_booking
  triggerType:  varchar("triggerType",  { length: 60  }).notNull(),
  triggerValue: int("triggerValue").notNull().default(0),
  triggerUnit:  varchar("triggerUnit",  { length: 20  }).notNull().default("hours"),
  subject:      varchar("subject",      { length: 500 }).notNull(),
  body:         text("body").notNull(),
  enabled:      boolean("enabled").notNull().default(true),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
  updatedAt:    timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type EmailCustomAutomation = typeof emailCustomAutomations.$inferSelect;

