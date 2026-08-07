import { Label, Input } from "forma-ui";

export const WithInput = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 320 }}>
    <Label htmlFor="preview-name">Full name</Label>
    <Input id="preview-name" placeholder="Jordan Ramirez" />
  </div>
);

export const Standalone = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 320 }}>
    <Label>Vehicle size</Label>
    <Label>Service address</Label>
  </div>
);
