import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Label,
  Input,
} from "forma-ui";

export const AddServiceArea = () => (
  <Dialog open>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Add Service Area</DialogTitle>
      </DialogHeader>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "8px 0" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Label htmlFor="preview-area-name">Area name</Label>
          <Input id="preview-area-name" defaultValue="Racine County" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Label htmlFor="preview-zip">ZIP codes</Label>
          <Input id="preview-zip" defaultValue="53177, 53402, 53403" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline">Cancel</Button>
        <Button>Save Area</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
