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

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <SEO
        title="Privacy Policy"
        description={`Privacy Policy for ${BRAND.displayName} — how we collect, use, and protect your information.`}
        canonical="/privacy"
        jsonLd={breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Privacy Policy", url: "/privacy" },
        ])}
      />

      <section className="pt-24 pb-10 sm:pt-28">
        <div className="container max-w-2xl">
          <h1 className="text-3xl sm:text-4xl font-display font-bold mb-2">
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground mb-10">
            Effective {EFFECTIVE_DATE}
          </p>

          <Section title="1. Information we collect">
            <p>
              When you book a service, create an account, or contact us, we
              collect:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Name, email address, phone number, and service address</li>
              <li>
                Vehicle details (make/model/size, condition notes, photos you
                upload)
              </li>
              <li>Booking and payment history</li>
              <li>
                Messages you send us through the contact form or booking notes
              </li>
            </ul>
            <p>
              We also collect basic usage data (pages visited, device/browser
              type) via the analytics and advertising tools described below.
            </p>
          </Section>

          <Section title="2. How we use your information">
            <ul className="list-disc pl-5 space-y-1">
              <li>
                To schedule, confirm, and deliver your detailing appointment
              </li>
              <li>
                To send booking confirmations, reminders, invoices, and receipts
              </li>
              <li>
                To respond to inquiries submitted through our contact form
              </li>
              <li>
                To send occasional follow-up or re-booking emails, which you can
                opt out of
              </li>
              <li>To improve the Site and our services</li>
            </ul>
          </Section>

          <Section title="3. Service providers we use">
            <p>
              We share information with the following third parties only as
              needed to run our business:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong className="text-foreground">SendGrid</strong> — sends
                transactional emails (booking confirmations, invoices, password
                resets).
              </li>
              <li>
                <strong className="text-foreground">Twilio</strong> — sends SMS
                text messages (appointment confirmations, reminders, and service
                updates) to customers who have opted in to receive them.
              </li>
              <li>
                <strong className="text-foreground">Square</strong> — processes
                online payments for invoiced services (e.g. ceramic coating,
                paint correction). We do not store your full payment card
                details ourselves.
              </li>
              <li>
                <strong className="text-foreground">Meta Pixel</strong> — helps
                us measure the effectiveness of our Facebook/Instagram ads. See
                Meta's privacy policy for how it handles data.
              </li>
              <li>
                <strong className="text-foreground">Umami</strong> — a
                privacy-focused, self-hosted analytics tool we use to understand
                aggregate Site traffic. It does not use cross-site tracking
                cookies.
              </li>
              <li>
                <strong className="text-foreground">
                  Railway &amp; Cloudflare
                </strong>{" "}
                — host the Site and its database, and provide content delivery
                and security (DDoS protection, SSL).
              </li>
            </ul>
            <p>
              We do not sell your personal information, and we do not share it
              with third parties for their own independent marketing purposes.
            </p>
          </Section>

          <Section title="4. SMS and mobile information">
            <p>
              If you choose to provide your mobile phone number and opt in to
              text messaging — using the dedicated SMS consent checkbox shown
              when booking an appointment or submitting our contact form —{" "}
              {BRAND.displayName} may use that number to send appointment
              confirmations, reminders, service updates, customer-care messages,
              and follow-up communications related to our services.
            </p>
            <p>
              <strong className="text-foreground">
                Mobile information and SMS consent will not be sold, rented, or
                shared with third parties or affiliates for their marketing or
                promotional purposes.
              </strong>{" "}
              We only provide your phone number to the service provider that
              delivers these messages on our behalf (Twilio, listed above) —
              never for that provider's or anyone else's independent marketing.
            </p>
            <p>
              Message frequency varies. Message and data rates may apply. You
              may opt out of SMS communications at any time by replying STOP to
              any message. For assistance, reply HELP or contact us directly at{" "}
              <a
                href={BRAND.phoneHref}
                className="text-primary hover:underline"
              >
                {BRAND.phone}
              </a>
              . SMS consent is never required to book or receive service from
              us.
            </p>
          </Section>

          <Section title="5. Photos of your vehicle">
            <p>
              We photograph vehicles before and after service for quality
              documentation. Unless you ask us not to, we may also use these
              photos in our marketing — website gallery, social media, etc.
              Contact us at any time if you'd like a photo removed.
            </p>
          </Section>

          <Section title="6. Data retention">
            <p>
              We retain booking and account information for as long as needed to
              provide our services, comply with legal/tax obligations, and
              maintain business records. You can request deletion of your
              account data at any time by contacting us.
            </p>
          </Section>

          <Section title="7. Your choices">
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Reply STOP to any text message to stop receiving SMS messages,
                or HELP for assistance.
              </li>
              <li>
                Use the unsubscribe link in marketing emails, or contact us, to
                stop receiving follow-up emails.
              </li>
              <li>
                Contact us to access, correct, or delete your personal
                information.
              </li>
            </ul>
          </Section>

          <Section title="8. Children's privacy">
            <p>
              Our Services are intended for adults booking vehicle services and
              are not directed at children. We do not knowingly collect
              information from children.
            </p>
          </Section>

          <Section title="9. Changes to this policy">
            <p>
              We may update this Privacy Policy from time to time. Material
              changes will be reflected by an updated effective date above.
            </p>
          </Section>

          <Section title="10. Contact">
            <p>
              Questions about this policy or your data? Reach us at{" "}
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
