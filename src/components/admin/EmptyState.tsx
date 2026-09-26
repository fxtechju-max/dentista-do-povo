import type { LucideIcon } from "lucide-react";

export function EmptyState({ title, icon: Icon }: { title: string; icon: LucideIcon }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
      <Icon className="h-8 w-8" />
      <p className="text-sm font-medium">{title}</p>
    </div>
  );
}
