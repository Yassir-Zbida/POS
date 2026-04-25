import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function StaffInventoryPage() {
  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Inventory (static)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Stock movements (in/out) and low-stock alerts widget (frontend only placeholder).
        </CardContent>
      </Card>
    </div>
  );
}

