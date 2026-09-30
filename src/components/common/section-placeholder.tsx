import { Construction } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getNavItem } from "@/config/navigation";
import { EmptyState } from "./empty-state";
import { PageHeader } from "./page-header";

/** Temporary page body for sections not yet implemented. Replaced phase by phase. */
export function SectionPlaceholder({ navKey, upcoming }: { navKey: string; upcoming: string[] }) {
  const item = getNavItem(navKey);
  return (
    <>
      <PageHeader title={item.label} description={item.description} />
      <EmptyState
        icon={item.icon}
        title="Coming soon"
        description="This section is being built. Here's what it will include:"
        action={
          <ul className="flex flex-wrap justify-center gap-2" aria-label="Planned features">
            {upcoming.map((feature) => (
              <li key={feature}>
                <Badge variant="secondary" className="gap-1.5 px-3 py-1">
                  <Construction className="size-3" aria-hidden />
                  {feature}
                </Badge>
              </li>
            ))}
          </ul>
        }
      />
    </>
  );
}
