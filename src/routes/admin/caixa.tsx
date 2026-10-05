import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Receipt } from "lucide-react";
import { db } from "@/integrations/mysql/client";
import { CaixaTab } from "@/components/admin/finance/CaixaTab";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/caixa")({
  validateSearch: (search: Record<string, unknown>): { orcamento?: string } =>
    typeof search["orcamento"] === "string" ? { orcamento: search["orcamento"] } : {},
  component: Caixa,
});

function Caixa() {
  const navigate = useNavigate();
  const { orcamento } = Route.useSearch();
  const [patients, setPatients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await db.from("patients").select("id, name").order("name");
      if (result.error) throw new Error(result.error.message);
      setPatients(result.data ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar os pacientes.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="animate-in fade-in space-y-5 duration-300">
      <PageHeader
        title="💵 Caixa"
        description="Abra o caixa, receba os tratamentos e confira o fechamento do dia."
        action={
          <Button asChild variant="outline">
            <Link to="/admin/financeiro">
              <Receipt /> Ver lançamentos
            </Link>
          </Button>
        }
      />
      {error ? (
        <div role="alert" className="space-y-3 rounded-xl border border-destructive/30 p-6">
          <p className="text-destructive">{error}</p>
          <Button onClick={load}>Tentar novamente</Button>
        </div>
      ) : loading ? (
        <p role="status">Carregando pacientes...</p>
      ) : (
        <CaixaTab
          patients={patients}
          onSale={() => {}}
          budgetId={orcamento ?? null}
          onBudgetHandled={() => {
            if (orcamento) void navigate({ to: "/admin/caixa", search: {}, replace: true });
          }}
        />
      )}
    </div>
  );
}
