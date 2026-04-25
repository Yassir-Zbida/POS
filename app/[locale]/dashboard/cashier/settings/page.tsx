import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

export default function StaffSettingsPage() {
  return (
    <div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Settings (static)</CardTitle>
          <ThemeToggle />
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          App-level configuration page placeholder (frontend only).
        </CardContent>
      </Card>
    </div>
  );
}

