import { Link } from "wouter";
import { SMS_CONSENT_DISCLOSURE } from "@shared/smsConsent";

/**
 * Explicit SMS/text-message opt-in checkbox, deliberately separate from any
 * Terms/Privacy acceptance — Twilio Toll-Free Verification requires SMS
 * consent to be its own checkbox with its own disclosure, unchecked by
 * default, with Privacy Policy / Terms links visible right alongside it.
 * Used by both the booking flow and the contact form so the wording and
 * behavior stay identical everywhere a phone number is collected.
 */
export default function SmsConsentField({
  id,
  checked,
  onChange,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card cursor-pointer"
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-primary flex-shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          aria-describedby={`${id}-links`}
        />
        <span className="text-xs text-muted-foreground leading-relaxed">
          {SMS_CONSENT_DISCLOSURE}
        </span>
      </label>
      <div
        id={`${id}-links`}
        className="flex items-center gap-2 pl-1 text-[11px]"
      >
        <Link href="/privacy">
          <span className="text-primary hover:underline cursor-pointer font-medium">
            Privacy Policy
          </span>
        </Link>
        <span className="text-muted-foreground/40" aria-hidden="true">
          |
        </span>
        <Link href="/terms">
          <span className="text-primary hover:underline cursor-pointer font-medium">
            Terms &amp; Conditions
          </span>
        </Link>
      </div>
    </div>
  );
}
