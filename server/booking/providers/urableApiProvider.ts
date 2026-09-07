/**
 * UrableApiBookingProvider — talks to the Urable REST API directly.
 *
 * As of 2026-09-06 (see docs/URABLE_INTEGRATION.md), createBooking creates a
 * real, calendar-visible Job — POST /v1/jobs, verified against the account's
 * live OpenAPI spec. That means this provider now genuinely reports
 * "confirmed" when the Job is created, not just "requires_review". Job
 * creation needs a synced vehicle (Item) and a package name + total amount
 * to resolve/create a Products & Services catalog entry for the line item;
 * if any of that is missing, or the Job request itself fails, this falls
 * back to the previous customer/vehicle-only sync ("requires_review")
 * rather than failing the booking.
 *
 * getAvailability, updateBooking, and cancelBooking still throw
 * NotSupportedError. There's no proven availability/free-busy endpoint, so
 * getAvailability stays unimplemented. Real PATCH/DELETE /v1/jobs/{id}
 * endpoints do exist per the OpenAPI spec and could back updateBooking /
 * cancelBooking in a follow-up — left out here because reschedule/cancel
 * sync wasn't part of this task and deserves its own verification pass
 * (e.g. how a cancellation should be reflected — `status: canceled` with
 * `canceledAt` — and whether that's what staff actually want to see).
 */
import type {
  BookingProvider,
  AvailabilityInput,
  AvailabilityResult,
  CreateBookingInput,
  CreateBookingResult,
  UpdateBookingInput,
  UpdateBookingResult,
  CancelBookingResult,
} from "../types";
import { NotSupportedError } from "../types";
import {
  syncBookingToUrable,
  findOrCreateUrableProductService,
  createUrableJob,
} from "../../urable";

export class UrableApiBookingProvider implements BookingProvider {
  async getAvailability(
    _input: AvailabilityInput
  ): Promise<AvailabilityResult> {
    throw new NotSupportedError("getAvailability", "urable-api");
  }

  async createBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
    const notesParts = [
      input.addOnNames?.length
        ? `Add-ons: ${input.addOnNames.join(", ")}`
        : null,
      input.conditionSummary ?? null,
      input.notes ?? null,
    ].filter(Boolean);

    const { urableCustomerId, urableVehicleId } = await syncBookingToUrable({
      firstName: input.customer.firstName,
      lastName: input.customer.lastName,
      email: input.customer.email,
      phone: input.customer.phone,
      city: input.serviceCity,
      state: input.serviceState,
      zip: input.serviceZip,
      vehicleYear: input.vehicle.year,
      vehicleMake: input.vehicle.make,
      vehicleModel: input.vehicle.model,
      vehicleColor: input.vehicle.color,
      vehiclePlate: input.vehicle.licensePlate,
      bookingNumber: input.bookingNumber,
      packageName: input.packageName,
      appointmentDate: new Date(input.appointmentDate),
      serviceAddress: input.serviceAddress,
      totalAmount: input.totalAmount,
      notes: notesParts.join("\n") || undefined,
    });

    if (!urableCustomerId) {
      return {
        status: "failed_sync",
        message:
          "We couldn't reach Urable to record your booking automatically. Your request has been saved and our team will follow up to confirm.",
      };
    }

    // Attempt a real Job so the appointment actually shows up on the
    // calendar. Needs a vehicle Item, a package name, and a total to price
    // the line item against — all three are usually present, but a booking
    // can legitimately lack a totalAmount (e.g. a custom-quote request).
    if (urableVehicleId && input.packageName && input.totalAmount) {
      const productServiceId = await findOrCreateUrableProductService({
        name: input.packageName,
        priceCents: Math.round(input.totalAmount * 100),
      });

      if (productServiceId) {
        const job = await createUrableJob({
          urableCustomerId,
          urableVehicleItemId: urableVehicleId,
          productServiceId,
          packageName: input.packageName,
          appointmentDate: new Date(input.appointmentDate),
          durationMinutes: input.durationMinutes,
          serviceAddress: input.serviceAddress,
          serviceCity: input.serviceCity,
          serviceState: input.serviceState,
          serviceZip: input.serviceZip,
          notes: notesParts.join("\n") || undefined,
        });

        if (job) {
          return {
            status: "confirmed",
            externalCustomerId: urableCustomerId,
            externalVehicleId: urableVehicleId,
            externalJobId: job.urableJobId,
            message: "Your appointment is on our calendar — see you then!",
          };
        }
      }
    }

    // Fallback: customer/vehicle synced, but no Job — either something
    // needed for a Job was missing, or the Job request itself failed.
    return {
      status: "requires_review",
      externalCustomerId: urableCustomerId,
      externalVehicleId: urableVehicleId,
      message:
        "Your booking details have been synced to our scheduling system. A team member will confirm your appointment time shortly.",
    };
  }

  async updateBooking(
    _externalId: string,
    _input: UpdateBookingInput
  ): Promise<UpdateBookingResult> {
    throw new NotSupportedError("updateBooking", "urable-api");
  }

  async cancelBooking(
    _externalId: string,
    _reason?: string
  ): Promise<CancelBookingResult> {
    throw new NotSupportedError("cancelBooking", "urable-api");
  }
}
