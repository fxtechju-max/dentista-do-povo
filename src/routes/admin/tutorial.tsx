import { createFileRoute } from "@tanstack/react-router";
import { NOVIDADES, TutorialView } from "@/components/admin/TutorialView";

export const Route = createFileRoute("/admin/tutorial")({
  validateSearch: (search: Record<string, unknown>): { secao?: string } => {
    const secao = search["secao"];
    return typeof secao === "string" ? { secao } : {};
  },
  component: Tutorial,
});

function Tutorial() {
  const { secao } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <TutorialView
      active={secao ?? NOVIDADES}
      onNavigate={(id) => navigate({ search: id === NOVIDADES ? {} : { secao: id } })}
    />
  );
}
