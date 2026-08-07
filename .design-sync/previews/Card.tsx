import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
  Button,
  Badge,
} from "forma-ui";

export const PricingCard = () => (
  <Card style={{ width: 300 }}>
    <CardHeader>
      <CardTitle style={{ fontFamily: "Oswald, 'Arial Narrow', sans-serif", fontSize: 18 }}>
        Exterior Decon &amp; Shield
      </CardTitle>
      <CardDescription>
        Total decontamination and 3-month hydrophobic protection.
      </CardDescription>
      <CardAction>
        <Badge>Popular</Badge>
      </CardAction>
    </CardHeader>
    <CardContent>
      <p
        style={{
          fontFamily: "'Inter Tight', 'Arial Narrow', sans-serif",
          fontSize: 28,
          margin: "0 0 4px",
        }}
      >
        From $129.99
      </p>
      <p style={{ fontSize: 12, opacity: 0.6 }}>~2 hours · Sedan / Coupe</p>
    </CardContent>
    <CardFooter>
      <Button style={{ width: "100%" }}>Book This Package</Button>
    </CardFooter>
  </Card>
);
