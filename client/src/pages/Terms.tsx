import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import { BRAND } from "@shared/brand";

const EFFECTIVE_DATE = "September 4, 2026";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-display font-bold mb-3">{title}</h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  );
}

export default function Terms() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <SEO
        title="Terms of Service"
        description={`Terms of Service for ${BRAND.displayName}, a mobile auto detailing service serving ${BRAND.serviceArea.primaryRegionLabel}.`}
        canonical="/terms"
        jsonLd={breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Terms of Service", url: "/terms" },
        ])}
      />

      <section className="pt-24 pb-10 sm:pt-28">
        <div className="container max-w-2xl">
          <h1 className="text-3xl sm:text-4xl font-display font-bold mb-2">
            Terms of Service
          </h1>
          <p className="text-sm text-muted-foreground mb-10">
            Effective {EFFECTIVE_DATE}
          </p>

          <Section title="1. Who we are">
            <p>
              These Terms of Service ("Terms") govern your use of{" "}
              {BRAND.domain.live} (the "Site") and the mobile auto detailing
              services ("Services") offered by {BRAND.displayName} ("Forma,"
              "we," "us," or "our"), based in{" "}
              {BRAND.serviceArea.headquartersCity},{" "}
              {BRAND.serviceArea.headquartersState} and serving{" "}
              {BRAND.serviceArea.primaryRegionLabel}. By booking a Service or
              using the Site, you agree to these Terms.
            </p>
            {/* TODO(business-owner): confirm the exact registered legal
                entity name (e.g. "Forma Auto Spa LLC") if operating under a
                formal business structure, and insert it here. Not asserted
                above because it hasn't been confirmed. */}
          </Section>

          <Section title="2. Booking & scheduling">
            <p>
              Bookings can be made online through the Site or by phone. We'll
              confirm your appointment by email, and by text message if you've
              opted in to SMS (see Section 5 below). Please make sure your
              vehicle is accessible at the service address and time you provide.{" "}
              {BRAND.mobileRequirements.full}
            </p>
            <p>
              Pricing shown on the Site is based on vehicle size and the package
              or service selected. Services with unusual conditions (excessive
              soil, biohazards, aftermarket modifications, etc.) may require an
              adjusted quote, which we'll communicate before starting work.
            </p>
          </Section>

          <Section title="3. Cancellations & rescheduling">
            <p>
              We ask for at least 24 hours' notice to cancel or reschedule an
              appointment. Cancellations or no-shows with less notice may be
              subject to a fee, communicated to you at the time.
            </p>
          </Section>

          <Section title="4. Payment">
            <p>
              Standard detailing packages (e.g. Full Showroom Reset, The
              Signature Detail) do not require a deposit. Payment is collected
              on-site after the service is complete and you've inspected the
              work — we accept cash, Venmo, Zelle, and major credit/debit cards.
            </p>
            <p>
              Custom-quoted services (ceramic coating, paint correction, fleet
              work) may require a deposit to confirm scheduling; this will be
              disclosed as part of your quote. Invoices for these services are
              payable online via our payment processor (Square).
            </p>
          </Section>

          <Section title="5. Communications & SMS">
            <p>
              Text messaging is optional. If you voluntarily opt in — using the
              dedicated SMS consent checkbox shown when booking or contacting us
              — you may receive text messages from {BRAND.displayName} related
              to your appointment, including booking confirmations, appointment
              reminders, service updates, and follow-up messages. Message
              frequency varies, and message and data rates may apply.
            </p>
            <p>
              Reply STOP to any message to cancel SMS communications at any
              time, or reply HELP for assistance. You can also reach us directly
              at {BRAND.phone}.
            </p>
            <p>
              Consent to receive text messages is not a condition of purchasing
              any service. Opting out of SMS does not cancel an existing
              appointment or prevent you from using {BRAND.displayName}'s
              services — we'll simply reach you by phone or email instead.
            </p>
          </Section>

          <Section title="6. Satisfaction & re-dos">
            <p>
              If you're not satisfied with the result of a service, let us know
              before we leave or as soon as reasonably possible — we document
              every job with before-and-after photos and will work with you to
              make it right.
            </p>
          </Section>

          <Section title="7. Vehicle condition & liability">
            <p>
              You're responsible for disclosing known vehicle issues
              (aftermarket parts, existing damage, biohazards, prior paint work,
              etc.) before service begins. We use professional-grade, paint-safe
              products and equipment, but we are not responsible for
              pre-existing damage, mechanical issues, or aftermarket
              modifications not disclosed in advance.
            </p>
          </Section>

          <Section title="8. Intellectual property">
            <p>
              The Site's content, branding, and design are the property of{" "}
              {BRAND.displayName} and may not be reproduced without permission.
              Photos we take of your vehicle during service may be used for
              quality documentation and, unless you tell us otherwise, in our
              marketing (portfolio, gallery, social media).
            </p>
          </Section>

          <Section title="9. Changes to these Terms">
            <p>
              We may update these Terms from time to time. Continued use of the
              Site or our Services after a change means you accept the updated
              Terms.
            </p>
          </Section>

          <Section title="10. Contact">
            <p>
              Questions about these Terms? Reach us at{" "}
              <a
                href={`mailto:${BRAND.emailLive}`}
                className="text-primary hover:underline"
              >
                {BRAND.emailLive}
              </a>{" "}
              or{" "}
              <a
                href={BRAND.phoneHref}
                className="text-primary hover:underline"
              >
                {BRAND.phone}
              </a>
              .
            </p>
          </Section>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
