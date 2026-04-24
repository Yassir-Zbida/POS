import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function StaffCustomersPage() {
  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle>Customers (static)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Customer profiles and lookup during sale (frontend only placeholder).
        </CardContent>
      </Card>
    </div>
  );
}

