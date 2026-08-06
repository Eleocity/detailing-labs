/**
 * UrableVirtualShopBookingProvider — hands the customer off to Urable's
 * Virtual Shop to complete scheduling, rather than trying to reserve
 * capacity ourselves. This is the safest option when real-time availability
 * matters and no proven Urable scheduling API exists.
 *
 * We still sync the customer/vehicle record first (best-effort, non-fatal)
 * so Urable has the context when the customer lands in the Virtual Shop.
 * No sensitive customer data is placed in the handoff URL's query string —
 * only the local booking reference and coarse UTM attribution.
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

function buildHandoffUrl(
  bookingNumber: string,
  attribution?: Record<string, string | undefined>
): string | null {
  const base = process.env.URABLE_VIRTUAL_SHOP_URL;
  if (!base) return null;

  const url = new URL(base);
  url.searchParams.set("ref", bookingNumber);
  for (const [key, value] of Object.entries(attribution ?? {})) {
    if (value && /^utm_/.test(key)) url.searchParams.set(key, value);
  }
  return url.toString();
}

export class UrableVirtualShopBookingProvider implements BookingProvider {
  async getAvailability(
    _input: AvailabilityInput
  ): Promise<AvailabilityResult> {
    throw new NotSupportedError("getAvailability", "urable-virtual-shop");
  }

  async createBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
    const handoffUrl = buildHandoffUrl(input.bookingNumber, input.attribution);
    if (!handoffUrl) {
      return {
        status: "failed_sync",
        message:
          "Online scheduling handoff isn't configured yet (URABLE_VIRTUAL_SHOP_URL is unset). Your request has been saved — our team will reach out to schedule you.",
      };
    }

    // Best-effort pre-sync so Urable has context before the customer arrives.
    // Failures here must not block the handoff.
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
      notes: input.conditionSummary ?? undefined,
    }).catch(() => ({ urableCustomerId: null, urableVehicleId: null }));

    return {
      status: "awaiting_scheduling",
      externalCustomerId: urableCustomerId,
      externalVehicleId: urableVehicleId,
      handoffUrl,
      message:
        "You're almost done — finish picking your date and time in our secure scheduling portal.",
    };
  }

  async updateBooking(
    _externalId: string,
    _input: UpdateBookingInput
  ): Promise<UpdateBookingResult> {
    throw new NotSupportedError("updateBooking", "urable-virtual-shop");
  }

  async cancelBooking(
    _externalId: string,
    _reason?: string
  ): Promise<CancelBookingResult> {
    throw new NotSupportedError("cancelBooking", "urable-virtual-shop");
  }
}
