import type { LucideIcon } from "lucide-react";

export function ComingSoon({ title, icon: Icon }: { title: string; icon: LucideIcon }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
      <Icon className="h-10 w-10" />
      <div>
        <p className="font-bold text-foreground">{title}</p>
        <p className="mt-1 text-sm">
          Essa página ainda não foi desenhada. Manda o print que a gente monta certinho.
        </p>
      </div>
    </div>
  );
}
