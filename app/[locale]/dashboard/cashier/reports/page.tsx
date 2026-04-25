import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function StaffReportsPage() {
  return (
    <div>
      <div className="grid gap-3 sm:gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Revenue (static)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">$12,480</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sales Count (static)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">164</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Low Stock (static)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">6</CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Overview (static)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Sales chart + low stock table placeholders (frontend only).
        </CardContent>
      </Card>
    </div>
  );
}

