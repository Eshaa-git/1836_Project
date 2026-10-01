import type { Metadata } from "next";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getNavItem } from "@/config/navigation";

export const metadata: Metadata = { title: "Meals" };

export default function MealsPage() {
  const item = getNavItem("meals");
  return (
    <div className="space-y-6">
      <PageHeader title={item.label} description={item.description} />
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>
            <h2>Look up a food</h2>
          </CardTitle>
          <CardDescription>
            See nutrition for any amount, and whether it fits your allergies and diet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/meals/foods" role="search" className="flex gap-2">
            <Input
              name="q"
              aria-label="Search foods"
              placeholder="e.g. dosa, egg, chicken breast"
              className="h-11 text-base sm:h-10 sm:text-sm"
            />
            <Button type="submit" size="lg" className="h-11 sm:h-10">
              <Search aria-hidden /> Search
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="flex flex-wrap gap-2" aria-label="Coming soon">
        {["Log by meal", "Skipped vs not logged", "Saved meals", "Search history"].map((f) => (
          <Badge key={f} variant="secondary" className="px-3 py-1">
            {f} — coming next
          </Badge>
        ))}
      </div>
    </div>
  );
}
