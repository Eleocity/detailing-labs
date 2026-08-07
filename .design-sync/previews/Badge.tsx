import { Badge } from "forma-ui";

export const CrmStatuses = () => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
    <Badge>New Lead</Badge>
    <Badge variant="secondary">Contacted</Badge>
    <Badge variant="secondary">Quote Sent</Badge>
    <Badge>Booked</Badge>
    <Badge variant="outline">Active</Badge>
    <Badge variant="destructive">Follow Up</Badge>
    <Badge>VIP</Badge>
    <Badge variant="outline">Inactive</Badge>
  </div>
);

export const BookingProviderStatuses = () => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
    <Badge>Confirmed</Badge>
    <Badge variant="secondary">Awaiting Scheduling</Badge>
    <Badge variant="destructive">Requires Review</Badge>
    <Badge variant="outline">Cancelled</Badge>
  </div>
);
