/**
 * UrableApiBookingProvider — talks to the Urable REST API directly.
 *
 * IMPORTANT: the public Urable API (as documented in server/urable.ts,
 * built against the live account) exposes Customers and Items only — there
 * is no confirmed Jobs/Events/Orders/Payments schema. That means this
 * provider CAN reliably create/update the customer and vehicle records, but
 * CANNOT reserve real schedule capacity. It reports "requires_review"
 * rather than "confirmed", and throws NotSupportedError for operations that
 * would require guessing at an unproven schema (availability, job update,
 * job cancellation) — per the project rule to never fabricate Urable
 * request shapes. See docs/URABLE_INTEGRATION.md.
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
import { syncBookingToUrable } from "../../urable";

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

    // Honest status: the customer/vehicle record is synced, but no schedule
    // capacity has actually been reserved (no Jobs API to reserve it with).
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
