import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { db } from "@/integrations/mysql/client";
import { calculateAge, formatCurrency } from "@/lib/admin/labels";
import { ToothIcon } from "@/lib/modules";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/pacientes_/$patientId_/proposta")({
  component: Proposta,
});

type Patient = { name: string; cpf: string | null; birth_date: string | null };
type Clinic = { clinic_name: string | null; phone: string | null; address: string | null };
type BudgetItem = { id: string; treatment: string; value: number; status: string };

function Proposta() {
  const { patientId } = Route.useParams();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: patientData }, { data: clinicData }, { data: budgetsData }] =
        await Promise.all([
          db.from("patients").select("name, cpf, birth_date").eq("id", patientId).single(),
          db
            .from("clinic_settings")
            .select("clinic_name, phone, address")
            .eq("id", "default")
            .maybeSingle(),
          db
            .from("budgets")
            .select("id, treatment, value, status")
            .eq("patient_id", patientId)
            .order("created_at"),
        ]);
      setPatient(patientData as Patient | null);
      setClinic(clinicData as Clinic | null);
      setItems(((budgetsData ?? []) as BudgetItem[]).filter((b) => b.status !== "recusado"));
      setLoading(false);
    })();
  }, [patientId]);

  const total = items.reduce((s, i) => s + Number(i.value), 0);
  const age = patient?.birth_date ? calculateAge(patient.birth_date) : null;
  const today = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  if (loading) {
    return <p className="p-8 text-center text-sm text-muted-foreground">Carregando...</p>;
  }

  return (
    <div className="animate-in fade-in duration-300">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link
          to="/admin/pacientes/$patientId"
          params={{ patientId }}
          search={{ tab: "orcamentos" }}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Imprimir / Baixar PDF
        </Button>
      </div>

      <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-8 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <div className="flex items-center justify-between gap-4 border-b-2 border-primary pb-4">
          <div className="flex items-center gap-3">
            <ToothIcon className="h-10 w-10 text-primary" />
            <div>
              <p className="text-lg font-extrabold leading-tight">
                {clinic?.clinic_name || "Dentista do Povo"}
              </p>
              <p className="text-xs text-muted-foreground">
                {[clinic?.address, clinic?.phone].filter(Boolean).join(" · ") ||
                  "Clínica Odontológica"}
              </p>
            </div>
          </div>
          <p className="text-xs font-semibold text-muted-foreground">{today}</p>
        </div>

        <h1 className="mt-6 text-center text-xl font-extrabold uppercase tracking-wide">
          Proposta de Tratamento
        </h1>

        <div className="mt-6 grid grid-cols-2 gap-3 rounded-xl bg-muted/40 p-4 text-sm">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Paciente
            </p>
            <p className="font-semibold">{patient?.name}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              CPF / Idade
            </p>
            <p className="font-semibold">
              {patient?.cpf || "—"}
              {age != null ? ` · ${age} anos` : ""}
            </p>
          </div>
        </div>

        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-border text-left">
              <th className="pb-2 font-bold">Procedimento</th>
              <th className="pb-2 text-right font-bold">Valor</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={2} className="py-6 text-center text-muted-foreground">
                  Nenhum orçamento cadastrado para este paciente.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-b border-border">
                  <td className="py-2.5">{item.treatment}</td>
                  <td className="py-2.5 text-right tabular-nums">
                    {formatCurrency(Number(item.value))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr>
              <td className="pt-3 text-right font-bold">Total</td>
              <td className="pt-3 text-right text-lg font-extrabold text-primary tabular-nums">
                {formatCurrency(total)}
              </td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-16 grid grid-cols-2 gap-8 text-center text-xs text-muted-foreground">
          <div>
            <div className="border-t border-foreground/40 pt-2">Assinatura do paciente</div>
          </div>
          <div>
            <div className="border-t border-foreground/40 pt-2">
              Assinatura do responsável técnico
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-[10px] text-muted-foreground">
          Proposta gerada em {today} · válida conforme acordo entre as partes.
        </p>
      </div>
    </div>
  );
}
