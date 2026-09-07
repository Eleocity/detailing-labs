/**
 * RequestOnlyBookingProvider — the default, safest provider.
 *
 * Submits a structured booking request: creates/updates the Urable customer
 * and vehicle (Items) if URABLE_API_KEY is configured, and appends the
 * booking details as a note on the customer record. Deliberately does NOT
 * create a Job — even though a real Jobs endpoint exists (see
 * server/urable.ts / UrableApiBookingProvider) — so this mode stays the
 * conservative fallback that never claims a confirmed appointment; the time
 * is requested, and staff confirm manually. Switch BOOKING_PROVIDER to
 * "urable-api" to get real Job creation.
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
import {
  syncBookingToUrable,
  appendBookingNoteToUrableCustomer,
} from "../../urable";

export class RequestOnlyBookingProvider implements BookingProvider {
  async getAvailability(
    _input: AvailabilityInput
  ): Promise<AvailabilityResult> {
    // Request-only mode never claims to know real-time availability — the
    // booking wizard should show a date/time *preference* picker instead of
    // an availability grid when this comes back unsupported.
    return {
      supported: false,
      slots: [],
      message:
        "Availability isn't checked automatically in request-only mode — we'll confirm your preferred time by phone or email.",
    };
  }

  async createBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
    const vehicleName = [
      input.vehicle.year,
      input.vehicle.make,
      input.vehicle.model,
    ]
      .filter(Boolean)
      .join(" ");
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

    const synced = Boolean(urableCustomerId);
    return {
      status: synced ? "requested" : "requires_review",
      externalCustomerId: urableCustomerId,
      externalVehicleId: urableVehicleId,
      message: synced
        ? "Your booking request has been submitted. We'll confirm your appointment time shortly — this is a request, not a confirmed appointment yet."
        : "Your booking request has been recorded. Our team will follow up to confirm details and scheduling.",
    };
  }

  async updateBooking(
    externalId: string,
    input: UpdateBookingInput
  ): Promise<UpdateBookingResult> {
    // No Jobs/Events object exists to update — best effort is appending a
    // note to the linked customer record so staff see the change request.
    if (input.notes || input.appointmentDate) {
      await appendBookingNoteToUrableCustomer({
        urableCustomerId: externalId,
        bookingNumber: "update",
        appointmentDate: input.appointmentDate
          ? new Date(input.appointmentDate)
          : new Date(),
        serviceAddress: "(see original booking)",
        existingNotes: input.notes ?? null,
      }).catch(() => {});
    }
    return {
      status: "requires_review",
      message:
        "Your change request has been recorded. A team member will confirm the update.",
    };
  }

  async cancelBooking(
    _externalId: string,
    reason?: string
  ): Promise<CancelBookingResult> {
    // Cancellation is handled locally (bookings.status) — there is no
    // external Job to cancel in Urable for a request-only booking.
    return {
      status: "cancelled",
      message: reason
        ? `Your booking has been cancelled: ${reason}`
        : "Your booking has been cancelled.",
    };
  }
}
