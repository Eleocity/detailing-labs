import { Checkbox, Label } from "forma-ui";

export const ConditionQuestions = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Checkbox id="preview-pet-hair" defaultChecked />
      <Label htmlFor="preview-pet-hair">Pet hair present</Label>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Checkbox id="preview-stains" />
      <Label htmlFor="preview-stains">Stains on seats or carpet</Label>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Checkbox id="preview-disabled" disabled />
      <Label htmlFor="preview-disabled">Biohazard present</Label>
    </div>
  </div>
);
