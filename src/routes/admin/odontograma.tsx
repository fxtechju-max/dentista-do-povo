import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, FileText, Search, Users } from "lucide-react";
import { db } from "@/integrations/mysql/client";
import { OdontogramModule } from "@/components/admin/odontogram/OdontogramModule";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { calculateAge, patientCode } from "@/lib/admin/labels";
import type { ToothCondition } from "@/lib/odontogram";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/odontograma")({
  validateSearch: (search: Record<string, unknown>): { paciente?: string } => {
    const paciente = search["paciente"];
    return typeof paciente === "string" && paciente ? { paciente } : {};
  },
  component: Odontograma,
});

type Patient = {
  id: string;
  name: string;
  cpf: string | null;
  phone: string | null;
  birth_date: string | null;
  responsible_dentist: string | null;
  code: number | null;
};

function Odontograma() {
  const { paciente } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [legacy, setLegacy] = useState<Map<number, ToothCondition[]>>(new Map());

  useEffect(() => {
    db.from("patients")
      .select("id, name, cpf, phone, birth_date, responsible_dentist, code")
      .order("name", { ascending: true })
      .then(({ data }) => {
        setPatients((data ?? []) as Patient[]);
        setLoading(false);
      });
  }, []);

  // Marcações do odontograma antigo, para continuarem aparecendo.
  useEffect(() => {
    if (!paciente) return;
    let cancelled = false;
    db.from("tooth_records")
      .select("tooth_number, conditions")
      .eq("patient_id", paciente)
      .then(({ data }) => {
        if (cancelled) return;
        setLegacy(
          new Map(
            ((data ?? []) as { tooth_number: number; conditions: ToothCondition[] }[]).map((t) => [
              t.tooth_number,
              t.conditions,
            ]),
          ),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [paciente]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.cpf?.toLowerCase().includes(q) ||
        p.phone?.toLowerCase().includes(q) ||
        patientCode(p.code).includes(q),
    );
  }, [patients, query]);

  const selected = patients.find((p) => p.id === paciente) ?? null;

  function choose(id: string | null) {
    navigate({ search: id ? { paciente: id } : {} });
    setQuery("");
  }

  return (
    <div className="animate-in fade-in space-y-4 duration-300">
      <PageHeader
        title="🦷 Odontograma"
        description="Escolha o paciente para abrir o odontograma dele."
      />

      {paciente && selected ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-extrabold text-primary-foreground">
                {selected.name.charAt(0).toUpperCase()}
              </span>
              <div>
                <p className="font-extrabold">{selected.name}</p>
                <p className="text-xs text-muted-foreground">
                  {patientCode(selected.code)}
                  {selected.birth_date && calculateAge(selected.birth_date) != null
                    ? ` · ${calculateAge(selected.birth_date)} anos`
                    : ""}
                  {selected.responsible_dentist ? ` · ${selected.responsible_dentist}` : ""}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => choose(null)}>
                <ArrowLeftRight className="h-4 w-4" /> Trocar paciente
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin/pacientes/$patientId" params={{ patientId: selected.id }}>
                  <FileText className="h-4 w-4" /> Abrir prontuário
                </Link>
              </Button>
            </div>
          </div>

          <OdontogramModule
            key={selected.id}
            patientId={selected.id}
            defaultDentist={selected.responsible_dentist ?? ""}
            legacyConditions={legacy}
          />
        </>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar paciente por nome, CPF, telefone ou código..."
              className="pl-9"
            />
          </div>
          {loading ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Carregando...</p>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Users}
              title={query ? "Nenhum paciente encontrado." : "Nenhum paciente cadastrado ainda."}
            />
          ) : (
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => choose(p.id)}
                  className="flex items-center gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:border-primary hover:bg-accent"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-extrabold text-primary">
                    {p.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{p.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {patientCode(p.code)}
                      {p.cpf ? ` · ${p.cpf}` : ""}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
