import { Button } from "forma-ui";

export const Variants = () => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
    <Button variant="default">Book Now</Button>
    <Button variant="secondary">View Packages</Button>
    <Button variant="outline">Contact Us</Button>
    <Button variant="ghost">Learn More</Button>
    <Button variant="destructive">Cancel Booking</Button>
    <Button variant="link">See all services</Button>
  </div>
);

export const Sizes = () => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
    <Button size="sm">Book Now</Button>
    <Button size="default">Book Now</Button>
    <Button size="lg">Book Your Service</Button>
  </div>
);

export const Disabled = () => (
  <div style={{ display: "flex", gap: 12 }}>
    <Button disabled>Processing…</Button>
    <Button variant="outline" disabled>
      Unavailable
    </Button>
  </div>
);
