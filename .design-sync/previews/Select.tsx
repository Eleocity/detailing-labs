import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "forma-ui";

export const VehicleSize = () => (
  <Select defaultValue="suv">
    <SelectTrigger style={{ width: 260 }}>
      <SelectValue placeholder="Choose your vehicle size" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="sedan">Sedan / Coupe</SelectItem>
      <SelectItem value="suv">SUV — Small / Truck</SelectItem>
      <SelectItem value="large">Large SUV — Minivan / Full-size</SelectItem>
    </SelectContent>
  </Select>
);
