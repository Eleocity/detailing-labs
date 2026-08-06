import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";
import { authRouter } from "./routers/auth";
import { bookingsRouter } from "./routers/bookings";
import { crmRouter } from "./routers/crm";
import { employeesRouter } from "./routers/employees";
import { invoicesRouter } from "./routers/invoices";
import { paymentsRouter } from "./routers/payments";
import { urableRouter } from "./routers/urable";
import { mediaRouter } from "./routers/media";
import { contentRouter } from "./routers/content";
import { usersRouter } from "./routers/users";
import { invitationsRouter } from "./routers/invitations";
import { analyticsRouter } from "./routers/analytics";
import { blogRouter } from "./routers/blog";
import { loyaltyRouter } from "./routers/loyalty";
import { referralsRouter } from "./routers/referrals";
import { conditionReportsRouter } from "./routers/conditionReports";
import { giftCardsRouter } from "./routers/giftCards";
import { followUpRouter } from "./routers/followUp";
import { remindersRouter } from "./routers/reminders";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  bookings: bookingsRouter,
  crm: crmRouter,
  employees: employeesRouter,
  invoices: invoicesRouter,
  payments: paymentsRouter,
  urable: urableRouter,
  media: mediaRouter,
  content: contentRouter,
  users: usersRouter,
  invitations: invitationsRouter,
  analytics: analyticsRouter,
  blog: blogRouter,
  loyalty: loyaltyRouter,
  referrals: referralsRouter,
  conditionReports: conditionReportsRouter,
  giftCards: giftCardsRouter,
  followUp: followUpRouter,
  reminders: remindersRouter,
});

export type AppRouter = typeof appRouter;
