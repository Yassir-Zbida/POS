import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function StaffProductsPage() {
  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Products & Categories (static)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Add/edit/delete products, categories, and per-product inventory (frontend only placeholder).
        </CardContent>
      </Card>
    </div>
  );
}

