import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function StaffCashRegisterSessionsPage() {
  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle>Cash Register Sessions (static)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Open/close cash register sessions and group sales by session (frontend only placeholder).
        </CardContent>
      </Card>
    </div>
  );
}

