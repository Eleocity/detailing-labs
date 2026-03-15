import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { bookingsRouter } from "./routers/bookings";
import { crmRouter } from "./routers/crm";
import { employeesRouter } from "./routers/employees";
import { invoicesRouter } from "./routers/invoices";
import { mediaRouter } from "./routers/media";
import { contentRouter } from "./routers/content";
import { usersRouter } from "./routers/users";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  bookings: bookingsRouter,
  crm: crmRouter,
  employees: employeesRouter,
  invoices: invoicesRouter,
  media: mediaRouter,
  content: contentRouter,
  users: usersRouter,
});

export type AppRouter = typeof appRouter;
