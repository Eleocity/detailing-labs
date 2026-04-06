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
import { automationsRouter, customAutomationsRouter } from "./routers/automations";
import { reviewsRouter } from "./routers/reviews";

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
  automations: automationsRouter,
  customAutomations: customAutomationsRouter,
  reviews: reviewsRouter,
});

export type AppRouter = typeof appRouter;
