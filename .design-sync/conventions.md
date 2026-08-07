# Forma Auto Spa — design conventions

Mobile auto detailing, Racine & Kenosha County, WI. Tagline: **"Refined. Protected. Ready."**

## This is a dark-only design system

There is no light theme. `body` sets `background:#050505` / `color:#f5f5f5` unconditionally.
Always compose on a dark canvas — never assume a light host page. Several components
(Button's `outline`/`ghost`/`link` variants, `Label`, plain text) render their text by
inheriting the page's foreground color rather than setting their own, specifically because
every real host page here is dark. On a light background that text is unreadable.

## Color

- **Forma Red `#E10600`** — primary actions, CTAs, brand accents. This is the `primary` token
  (`Button` default variant, `Badge` default variant, links).
- **Deep Red `#A90000`** — secondary/hover depth, the `accent` token.
- **Carbon Black `#050505`** — page background.
- **Graphite `#1A1A1A`** — card/surface background (`card`/`secondary`/`muted` tokens).
- **Clean White `#F5F5F5`** — primary text (`foreground`).
- **Metallic Silver `#C9CBCD`** — decorative accent only (chrome/metal textures, dividers), not
  a text or surface color. Available as the `silver` token.
- `destructive` (`#DC2626`) is intentionally a different red from Forma Red — reserve it for
  destructive actions (cancel, delete), never as a decorative/brand accent.

## Typography

- **Headlines**: Oswald (bold, condensed) — `.font-display` / `h1`–`h6`. Falls back to
  `Arial Narrow`.
- **Body**: Inter.
- **Numbers / pricing**: Inter Tight via `.font-numeric` (tabular figures) — use for prices,
  phone numbers, ZIP codes, durations.
- **Type rule**: don't use more than two font families in one customer-facing composition.
  Use wide letter-spacing sparingly — readability beats the "performance" look.

## Voice

Confident, direct, technically credible — not hypey. Describes real process and documented
quality control rather than superlatives ("premium", "best-in-class"). Service copy names the
actual steps (e.g. "hand wash, wheel and tire deep clean, iron and bug/tar removal") rather
than vague claims.

## Realistic content for mockups

When composing new screens with these components, prefer real Forma domain content over
placeholder Lorem/Acme text:

- **Packages** (from the site's service catalog): Exterior Decon & Shield ($129.99+),
  Interior Deep Refresh ($129.99+), Full Showroom Reset ($229.99+), The Signature Detail
  ($449.99+), Ceramic Coating (quote), Paint Correction (quote).
- **Vehicle sizes**: Sedan / Coupe, SUV — Small / Truck, Large SUV — Minivan / Full-size.
- **CRM lead statuses**: New Lead, Contacted, Quote Sent, Booked, Active, Follow Up, VIP,
  Inactive.
- **Booking sync statuses**: Confirmed, Awaiting Scheduling, Awaiting Deposit, Requested,
  Requires Review, Failed Sync, Cancelled.
- **Service area**: Racine County & Kenosha County, WI (mobile — "we come to you", HQ
  Sturtevant WI).
- **Phone**: (262) 260-9474.
