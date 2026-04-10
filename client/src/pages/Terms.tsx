import { Link } from "wouter";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SEO from "@/components/SEO";

const EFFECTIVE_DATE = "April 10, 2026";
const COMPANY       = "Detailing Labs";
const EMAIL         = "hello@detailinglabswi.com";
const PHONE         = "(262) 260-9474";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-display font-bold text-foreground mb-3">{title}</h2>
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">{children}</div>
    </section>
  );
}

export default function Terms() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="Terms of Service | Detailing Labs"
        description="Terms of Service for Detailing Labs — mobile auto detailing in Southeast Wisconsin."
        canonical="/terms"
        noindex={false}
      />
      <SiteHeader />

      <div className="container max-w-3xl py-20 sm:py-28">
        <div className="mb-10">
          <p className="text-primary text-xs font-semibold tracking-widest uppercase mb-3">Legal</p>
          <h1 className="text-4xl font-display font-bold mb-3">Terms of Service</h1>
          <p className="text-muted-foreground text-sm">
            Effective Date: {EFFECTIVE_DATE} &nbsp;·&nbsp; Last Updated: {EFFECTIVE_DATE}
          </p>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed mb-8">
          These Terms of Service ("Terms") govern your use of the {COMPANY} website and detailing services.
          By booking a service or using our website, you agree to these Terms. Please read them carefully.
        </p>

        <div className="prose-none">
          <Section title="1. Services">
            <p>
              {COMPANY} provides professional mobile auto detailing services in Southeast Wisconsin.
              All services are performed at your specified location. We operate a fully self-contained
              mobile setup — we bring our own water, power, and equipment.
            </p>
            <p>
              Service availability is subject to weather conditions, geographic accessibility, and
              technician availability. We reserve the right to reschedule appointments due to unsafe
              weather conditions, and will notify you as early as possible if this occurs.
            </p>
          </Section>

          <Section title="2. Booking and Approval">
            <p>
              All bookings submitted through our website are treated as <strong className="text-foreground">requests</strong> and
              are subject to review and approval before they are confirmed. Submitting a booking request
              does not guarantee an appointment.
            </p>
            <p>
              Once we review and approve your request, you will receive a separate confirmation. Only upon
              receiving that confirmation is your appointment considered scheduled. We reserve the right to
              decline any booking request for any reason, and will notify you promptly if we cannot accommodate
              your request.
            </p>
          </Section>

          <Section title="3. Cancellation and Rescheduling">
            <p>
              <strong className="text-foreground">Customer cancellations:</strong> You may cancel or reschedule
              your appointment at no charge with at least 24 hours' notice. Cancellations with less than
              24 hours' notice may be subject to a cancellation fee of up to $50, at our discretion.
            </p>
            <p>
              <strong className="text-foreground">Our cancellations:</strong> We reserve the right to cancel or
              reschedule appointments due to unsafe weather, equipment failure, or other circumstances beyond
              our control. In such cases, we will provide as much advance notice as possible and work with
              you to find an alternative time.
            </p>
          </Section>

          <Section title="4. Payment">
            <p>
              Payment is due upon completion of service unless otherwise agreed in advance. We accept
              payment via Square (credit/debit cards) and other methods communicated at booking. Prices
              are as shown on our website and in your booking confirmation. Final pricing may vary if the
              vehicle's condition requires additional work beyond the scope of the selected package —
              we will notify you before proceeding.
            </p>
            <p>
              Invoices not paid within 30 days of the service date may be subject to a late fee of 1.5%
              per month on the outstanding balance.
            </p>
          </Section>

          <Section title="5. Vehicle Access and Condition">
            <p>
              You are responsible for ensuring that the vehicle is accessible at the service address at
              the scheduled time. If we are unable to access the vehicle at the agreed time and location,
              a trip fee may apply.
            </p>
            <p>
              You agree to disclose any known pre-existing damage, fragile materials, or special conditions
              affecting the vehicle prior to or at the time of service. We are not responsible for pre-existing
              damage, damage to vehicles with structural deficiencies, or issues arising from undisclosed
              conditions.
            </p>
          </Section>

          <Section title="6. Liability Limitation">
            <p>
              We carry general liability insurance and take care with all vehicles. However, {COMPANY}'s
              liability for any damage caused during a service appointment is limited to the direct cost
              of repair for damage we are proven to have caused, up to a maximum of the service fee paid
              for that appointment.
            </p>
            <p>
              We are not liable for: pre-existing damage; damage from products used on surfaces not intended
              for automotive detailing products; damage resulting from undisclosed vehicle conditions; or
              indirect, consequential, or incidental damages of any kind.
            </p>
            <p>
              If you believe we caused damage to your vehicle, you must notify us within 24 hours of
              service completion to be eligible for a claim review.
            </p>
          </Section>

          <Section title="7. Satisfaction Guarantee">
            <p>
              We stand behind our work. If you are not satisfied with the result, contact us within 24 hours
              of service completion and we will return to address any issues at no additional charge,
              at our discretion. This guarantee does not apply to damage claims or services affected by
              undisclosed vehicle conditions.
            </p>
          </Section>

          <Section title="8. SMS Communications">
            <p>
              By providing your phone number and consenting during booking, you agree to receive SMS
              messages from us related to your appointment. You may opt out at any time by replying
              STOP. Message and data rates may apply. See our{" "}
              <Link href="/privacy"><span className="text-primary hover:underline cursor-pointer">Privacy Policy</span></Link>{" "}
              for more information.
            </p>
          </Section>

          <Section title="9. Intellectual Property">
            <p>
              All content on this website — including text, images, logos, and design — is the property
              of {COMPANY} and may not be reproduced, distributed, or used without our written permission.
            </p>
          </Section>

          <Section title="10. Governing Law">
            <p>
              These Terms are governed by the laws of the State of Wisconsin, without regard to its conflict
              of law provisions. Any disputes arising from these Terms or our services shall be resolved in
              the courts of Racine County, Wisconsin.
            </p>
          </Section>

          <Section title="11. Changes to These Terms">
            <p>
              We may update these Terms from time to time. Continued use of our website or services after
              changes are posted constitutes your acceptance of the revised Terms.
            </p>
          </Section>

          <Section title="12. Contact">
            <p>Questions about these Terms?</p>
            <div className="mt-2 p-4 rounded-xl border border-border bg-card space-y-1">
              <p><strong className="text-foreground">{COMPANY}</strong></p>
              <p>Email: <a href={`mailto:${EMAIL}`} className="text-primary hover:underline">{EMAIL}</a></p>
              <p>Phone: <a href={`tel:${PHONE.replace(/\D/g,"")}`} className="text-primary hover:underline">{PHONE}</a></p>
            </div>
          </Section>
        </div>

        <div className="mt-10 pt-8 border-t border-border flex flex-wrap gap-4 text-xs text-muted-foreground">
          <Link href="/privacy"><span className="text-primary hover:underline cursor-pointer">Privacy Policy</span></Link>
          <Link href="/"><span className="hover:text-foreground cursor-pointer transition-colors">← Back to Home</span></Link>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
