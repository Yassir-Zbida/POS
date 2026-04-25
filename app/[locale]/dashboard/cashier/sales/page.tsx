import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function StaffSalesPage() {
  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Sales (static)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Sales history, items breakdown, and linkage to customer + cashier (frontend only placeholder).
        </CardContent>
      </Card>
    </div>
  );
}

