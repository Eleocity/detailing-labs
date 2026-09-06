/**
 * Single source of truth for the SMS/text-message consent disclosure shown
 * wherever a customer can submit a phone number (booking flow, contact
 * form). Twilio Toll-Free Verification requires this consent to be its own
 * checkbox — never bundled with Terms/Privacy acceptance — with wording
 * that says what the customer will receive, that consent isn't required to
 * purchase, and includes STOP/HELP + rates language. Both the booking form
 * and the contact form render this exact string so there's one disclosure
 * to keep in sync with the Privacy Policy / Terms, not two drifting copies.
 */
import { BRAND } from "./brand";

export const SMS_CONSENT_DISCLOSURE = `I agree to receive SMS/text messages from ${BRAND.displayName} regarding my appointment and detailing services, including booking confirmations, appointment reminders, service updates, and follow-up messages. Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for help. Consent to receive text messages is not a condition of purchase.`;
