/**
 * BookingProvider abstraction — the seam between the booking wizard and
 * whichever scheduling backend is actually authoritative (Urable API,
 * Urable Virtual Shop handoff, or a request-only/manual-review flow).
 *
 * The website database is never a competing calendar: providers either
 * confirm through Urable, hand the customer off to Urable, or clearly mark
 * a submission as "requested" pending staff follow-up. See
 * docs/URABLE_INTEGRATION.md for what's actually proven against the real
 * Urable public API vs. what's deliberately left unimplemented.
 */

export type BookingSyncStatus =
  | "draft" // saved but not yet submitted
  | "confirmed" // Urable has reserved real schedule capacity
  | "awaiting_scheduling" // customer must finish scheduling elsewhere (Virtual Shop)
  | "awaiting_deposit"
  | "requested" // submitted, not yet confirmed by a human/Urable
  | "requires_review" // flagged for manual staff review before scheduling
  | "failed_sync" // Urable sync failed; booking still recorded locally
  | "cancelled";

export interface AvailabilityInput {
  /** ISO date (day granularity) the customer wants to check. */
  date: string;
  durationMinutes: number;
  zip?: string | null;
}

export interface AvailabilitySlot {
  /** ISO datetime */
  start: string;
  /** ISO datetime */
  end: string;
}

export interface AvailabilityResult {
  /** false when this provider cannot answer the question at all (e.g. no proven Urable availability endpoint). */
  supported: boolean;
  slots: AvailabilitySlot[];
  message?: string;
}

export interface BookingCustomerInput {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone: string;
}

export interface BookingVehicleInput {
  year?: number | null;
  make: string;
  model: string;
  color?: string | null;
  licensePlate?: string | null;
  vehicleType?: string | null;
}

export interface CreateBookingInput {
  /** Local booking reference (e.g. "FA-XXXX") — used as the idempotency key. */
  bookingNumber: string;
  customer: BookingCustomerInput;
  vehicle: BookingVehicleInput;
  packageName?: string | null;
  addOnNames?: string[];
  appointmentDate: string; // ISO datetime
  durationMinutes: number;
  serviceAddress: string;
  serviceCity?: string | null;
  serviceState?: string | null;
  serviceZip?: string | null;
  notes?: string | null;
  totalAmount?: number | null;
  /** Structured vehicle-condition answers, folded into notes for providers that only support free text. */
  conditionSummary?: string | null;
  /** UTM / campaign attribution, preserved through a Virtual Shop handoff. */
  attribution?: Record<string, string | undefined>;
}

export interface CreateBookingResult {
  status: BookingSyncStatus;
  /** Customer-safe explanation of what just happened — never claim "confirmed" unless it's true. */
  message: string;
  externalCustomerId?: string | null;
  externalVehicleId?: string | null;
  externalJobId?: string | null;
  externalEventId?: string | null;
  /** Present when the customer must be redirected to finish scheduling (Virtual Shop mode). */
  handoffUrl?: string | null;
}

export interface UpdateBookingInput {
  appointmentDate?: string;
  notes?: string;
}

export interface UpdateBookingResult {
  status: BookingSyncStatus;
  message: string;
}

export interface CancelBookingResult {
  status: "cancelled" | "failed_sync";
  message: string;
}

export interface BookingProvider {
  getAvailability(input: AvailabilityInput): Promise<AvailabilityResult>;
  createBooking(input: CreateBookingInput): Promise<CreateBookingResult>;
  updateBooking(
    externalId: string,
    input: UpdateBookingInput
  ): Promise<UpdateBookingResult>;
  cancelBooking(
    externalId: string,
    reason?: string
  ): Promise<CancelBookingResult>;
}

/**
 * Thrown by a provider method when the operation has no proven, documented
 * Urable API behavior to call. Callers must catch this and route the
 * customer to a supported path (Virtual Shop or request-only) rather than
 * guess at a request shape. Never silently swallow this into a generic
 * failure — it means "not implemented because unverified," not "broke."
 */
export class NotSupportedError extends Error {
  constructor(
    public readonly operation: string,
    public readonly provider: string
  ) {
    super(
      `${operation} is not supported by the "${provider}" booking provider. ` +
        `The public Urable API has no documented endpoint for this operation ` +
        `(see docs/URABLE_INTEGRATION.md) — route the customer to the Virtual ` +
        `Shop or request-only flow instead of guessing at a request shape.`
    );
    this.name = "NotSupportedError";
  }
}
