import { Textarea } from "forma-ui";

export const Default = () => (
  <Textarea
    placeholder="Anything else we should know before your appointment?"
    rows={4}
    style={{ maxWidth: 360 }}
  />
);

export const Filled = () => (
  <Textarea
    defaultValue="Heavy dog hair in the back seat and a coffee stain on the passenger floor mat."
    rows={4}
    style={{ maxWidth: 360 }}
  />
);
