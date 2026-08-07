import { Tabs, TabsList, TabsTrigger, TabsContent } from "forma-ui";

export const ServiceCategories = () => (
  <Tabs defaultValue="detailing" style={{ width: 420 }}>
    <TabsList>
      <TabsTrigger value="detailing">Detailing</TabsTrigger>
      <TabsTrigger value="ceramic">Ceramic Coating</TabsTrigger>
      <TabsTrigger value="correction">Paint Correction</TabsTrigger>
    </TabsList>
    <TabsContent value="detailing">
      <p style={{ fontSize: 14, opacity: 0.8 }}>
        Exterior Decon &amp; Shield, Interior Deep Refresh, Full Showroom
        Reset, and The Signature Detail — from $129.99.
      </p>
    </TabsContent>
    <TabsContent value="ceramic">
      <p style={{ fontSize: 14, opacity: 0.8 }}>
        Multi-year hydrophobic protection. Pricing by quote after inspection.
      </p>
    </TabsContent>
    <TabsContent value="correction">
      <p style={{ fontSize: 14, opacity: 0.8 }}>
        Single or multi-stage polish to remove swirls and oxidation. Pricing
        by quote after inspection.
      </p>
    </TabsContent>
  </Tabs>
);
