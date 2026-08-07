import { Input } from "forma-ui";

export const States = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 320 }}>
    <Input placeholder="Full name" />
    <Input type="email" defaultValue="jordan@example.com" />
    <Input type="tel" placeholder="(262) 260-9474" />
    <Input defaultValue="53177" disabled />
  </div>
);
