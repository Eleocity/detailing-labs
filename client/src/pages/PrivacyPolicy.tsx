import { Link } from "wouter";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SEO from "@/components/SEO";

const EFFECTIVE_DATE = "April 10, 2026";
const COMPANY       = "Detailing Labs";
const SITE_URL      = "https://detailinglabswi.com";
const EMAIL         = "hello@detailinglabswi.com";
const PHONE         = "(262) 260-9474";
const ADDRESS       = "Sturtevant, WI";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-display font-bold text-foreground mb-3">{title}</h2>
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">{children}</div>
    </section>
  );
}

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="Privacy Policy | Detailing Labs"
        description="Privacy Policy for Detailing Labs — how we collect, use, and protect your personal information."
        canonical="/privacy"
        noindex={false}
      />
      <SiteHeader />

      <div className="container max-w-3xl py-20 sm:py-28">
        {/* Header */}
        <div className="mb-10">
          <p className="text-primary text-xs font-semibold tracking-widest uppercase mb-3">Legal</p>
          <h1 className="text-4xl font-display font-bold mb-3">Privacy Policy</h1>
          <p className="text-muted-foreground text-sm">
            Effective Date: {EFFECTIVE_DATE} &nbsp;·&nbsp; Last Updated: {EFFECTIVE_DATE}
          </p>
        </div>

        <div className="prose-none">
          <p className="text-sm text-muted-foreground leading-relaxed mb-8">
            {COMPANY} ("we," "our," or "us") operates {SITE_URL} and provides professional mobile auto detailing
            services in Southeast Wisconsin. This Privacy Policy explains how we collect, use, disclose, and
            protect your personal information when you visit our website or use our services.
          </p>

          <Section title="1. Information We Collect">
            <p><strong className="text-foreground">Information you provide directly:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Name, email address, and phone number</li>
              <li>Vehicle information (year, make, model, color)</li>
              <li>Service address and location details</li>
              <li>Booking preferences, special requests, and notes</li>
              <li>Payment information (processed securely by Square — we do not store card numbers)</li>
              <li>Communications you send us via email or contact forms</li>
            </ul>
            <p className="mt-3"><strong className="text-foreground">Information collected automatically:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>IP address and browser type</li>
              <li>Pages visited and time spent on our site</li>
              <li>Referring URLs and device information</li>
              <li>Analytics data via Meta Pixel and other tools</li>
            </ul>
          </Section>

          <Section title="2. How We Use Your Information">
            <p>We use the information we collect to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Process and manage your booking requests and appointments</li>
              <li>Send booking confirmations, appointment reminders, and service updates</li>
              <li>Send SMS messages regarding your booking (with your explicit consent)</li>
              <li>Send marketing emails about our services (you may opt out at any time)</li>
              <li>Process payments and send invoices and receipts</li>
              <li>Respond to your inquiries and provide customer support</li>
              <li>Improve our website and services</li>
              <li>Comply with legal obligations</li>
            </ul>
          </Section>

          <Section title="3. SMS / Text Message Communications">
            <p>
              By providing your phone number and checking the SMS consent box during booking, you agree to
              receive SMS text messages from {COMPANY} related to your booking, appointment reminders, and
              service updates. Message frequency varies. Message and data rates may apply.
            </p>
            <p>
              <strong className="text-foreground">To opt out:</strong> Reply <strong className="text-foreground">STOP</strong> to any
              SMS message at any time. You may also email us at {EMAIL} to request removal.
              Opting out of SMS will not affect your ability to book services or receive email communications.
            </p>
            <p>
              We do not sell your phone number or use it for any purpose other than communicating with you
              about your bookings and our services.
            </p>
          </Section>

          <Section title="4. How We Share Your Information">
            <p>We do not sell your personal information. We may share it with:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong className="text-foreground">Service providers:</strong> Square (payments), SendGrid (email), Klaviyo (email marketing), and other tools necessary to operate our business</li>
              <li><strong className="text-foreground">Zapier:</strong> To automate workflow notifications between our systems (booking details only)</li>
              <li><strong className="text-foreground">Legal requirements:</strong> If required by law, court order, or government authority</li>
              <li><strong className="text-foreground">Business transfers:</strong> In the event of a merger, acquisition, or sale of assets</li>
            </ul>
            <p>All third-party providers are contractually required to protect your information and use it only as directed by us.</p>
          </Section>

          <Section title="5. Cookies and Tracking Technologies">
            <p>
              Our website uses cookies and similar tracking technologies to improve your browsing experience
              and analyze how visitors use our site. We use:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong className="text-foreground">Essential cookies:</strong> Required for the website to function properly</li>
              <li><strong className="text-foreground">Analytics:</strong> To understand how visitors use our site (anonymized data)</li>
              <li><strong className="text-foreground">Meta Pixel:</strong> To measure the effectiveness of our advertising</li>
            </ul>
            <p>You can disable cookies in your browser settings, though some features of our site may not work correctly.</p>
          </Section>

          <Section title="6. Data Retention">
            <p>
              We retain your personal information for as long as necessary to provide our services,
              comply with legal obligations, resolve disputes, and enforce our agreements. Booking
              records are typically retained for 3 years. You may request deletion of your data
              at any time by contacting us.
            </p>
          </Section>

          <Section title="7. Your Rights">
            <p>You have the right to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your personal data</li>
              <li>Opt out of marketing emails at any time via the unsubscribe link</li>
              <li>Opt out of SMS messages by replying STOP</li>
              <li>File a complaint with a data protection authority</li>
            </ul>
            <p>To exercise any of these rights, contact us at {EMAIL}.</p>
          </Section>

          <Section title="8. Security">
            <p>
              We implement reasonable technical and organizational measures to protect your personal
              information from unauthorized access, disclosure, alteration, or destruction. However,
              no internet transmission or electronic storage is 100% secure. We encourage you to use
              strong passwords and notify us immediately if you suspect any unauthorized access to
              your account.
            </p>
          </Section>

          <Section title="9. Children's Privacy">
            <p>
              Our services are not directed to children under 13. We do not knowingly collect personal
              information from children. If you believe we have inadvertently collected information
              from a child, please contact us and we will delete it promptly.
            </p>
          </Section>

          <Section title="10. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant
              changes by posting the new policy on this page and updating the effective date above.
              Your continued use of our services after any changes constitutes your acceptance of
              the updated policy.
            </p>
          </Section>

          <Section title="11. Contact Us">
            <p>If you have any questions about this Privacy Policy, please contact us:</p>
            <div className="mt-2 p-4 rounded-xl border border-border bg-card space-y-1">
              <p><strong className="text-foreground">{COMPANY}</strong></p>
              <p>{ADDRESS}</p>
              <p>Email: <a href={`mailto:${EMAIL}`} className="text-primary hover:underline">{EMAIL}</a></p>
              <p>Phone: <a href={`tel:${PHONE.replace(/\D/g,"")}`} className="text-primary hover:underline">{PHONE}</a></p>
            </div>
          </Section>
        </div>

        <div className="mt-10 pt-8 border-t border-border flex flex-wrap gap-4 text-xs text-muted-foreground">
          <Link href="/terms"><span className="text-primary hover:underline cursor-pointer">Terms of Service</span></Link>
          <Link href="/"><span className="hover:text-foreground cursor-pointer transition-colors">← Back to Home</span></Link>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
