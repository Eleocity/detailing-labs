import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { employees, employeeAvailability, bookingAssignments, bookings } from "../../drizzle/schema";

export const employeesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new Error("Unauthorized");
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    return db.select().from(employees).orderBy(employees.firstName);
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new Error("Unauthorized");
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const [employee] = await db.select().from(employees).where(eq(employees.id, input.id)).limit(1);
      if (!employee) throw new Error("Employee not found");

      const availability = await db.select().from(employeeAvailability).where(eq(employeeAvailability.employeeId, input.id));
      const assignments = await db
        .select({ assignment: bookingAssignments, booking: bookings })
        .from(bookingAssignments)
        .leftJoin(bookings, eq(bookingAssignments.bookingId, bookings.id))
        .where(eq(bookingAssignments.employeeId, input.id));

      return { employee, availability, assignments };
    }),

  create: protectedProcedure
    .input(z.object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      email: z.string().email().optional().or(z.literal("")),
      phone: z.string().optional(),
      role: z.enum(["admin","manager","detailer"]).default("detailer"),
      skills: z.array(z.string()).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new Error("Unauthorized");
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await db.insert(employees).values({
        ...input,
        email: input.email || null,
        skills: input.skills ? JSON.stringify(input.skills) : null,
      });
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number().int(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      role: z.enum(["admin","manager","detailer"]).optional(),
      status: z.enum(["active","inactive","on_leave"]).optional(),
      skills: z.array(z.string()).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new Error("Unauthorized");
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const { id, skills, ...rest } = input;
      const updateData: Record<string, any> = { ...rest };
      if (skills !== undefined) updateData.skills = JSON.stringify(skills);
      await db.update(employees).set(updateData).where(eq(employees.id, id));
      return { success: true };
    }),

  setAvailability: protectedProcedure
    .input(z.object({
      employeeId: z.number().int(),
      availability: z.array(z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        startTime: z.string(),
        endTime: z.string(),
        isAvailable: z.boolean(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new Error("Unauthorized");
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      // Delete existing
      await db.delete(employeeAvailability).where(eq(employeeAvailability.employeeId, input.employeeId));

      // Insert new
      if (input.availability.length > 0) {
        await db.insert(employeeAvailability).values(
          input.availability.map((a) => ({ ...a, employeeId: input.employeeId }))
        );
      }
      return { success: true };
    }),
});
