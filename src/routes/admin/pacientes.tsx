import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Users, Plus, Pencil, Trash2, Search, Mail, Phone, FileText } from "lucide-react";
import { db } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import {
  PatientDialog,
  emptyPatientForm,
  type PatientFormValues,
} from "@/components/admin/PatientDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/pacientes")({
  component: Pacientes,
});

type Patient = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  cpf: string | null;
  birth_date: string | null;
  address: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  guardian_cpf: string | null;
  created_at: string;
};

function Pacientes() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await db
      .from("patients")
      .select(
        "id, name, phone, email, cpf, birth_date, address, guardian_name, guardian_phone, guardian_cpf, created_at",
      )
      .order("created_at", { ascending: false });
    setPatients((data ?? []) as Patient[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.phone?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.cpf?.toLowerCase().includes(q),
    );
  }, [patients, query]);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(patient: Patient) {
    setEditing(patient);
    setDialogOpen(true);
  }

  async function remove() {
    if (!deleteTarget) return;
    await db.from("patients").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null);
    load();
  }

  const initialForm: PatientFormValues = editing
    ? {
        name: editing.name,
        phone: editing.phone ?? "",
        email: editing.email ?? "",
        cpf: editing.cpf ?? "",
        birth_date: editing.birth_date ? editing.birth_date.slice(0, 10) : "",
        address: editing.address ?? "",
        guardian_name: editing.guardian_name ?? "",
        guardian_phone: editing.guardian_phone ?? "",
        guardian_cpf: editing.guardian_cpf ?? "",
      }
    : emptyPatientForm;

  return (
    <div className="animate-in fade-in duration-300">
      <PageHeader
        title="👥 Pacientes"
        description="Cadastro e histórico dos pacientes da clínica."
        action={
          <Button onClick={openCreate}>
            <Plus /> Novo paciente
          </Button>
        }
      />

      <div className="mt-4 flex items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, telefone, email ou CPF..."
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground">{filtered.length} paciente(s)</span>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-card">
        {loading ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Carregando...</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={query ? "Nenhum paciente encontrado." : "Nenhum paciente cadastrado ainda."}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Cadastrado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id} className="animate-in fade-in">
                  <TableCell className="font-semibold">
                    <Link
                      to="/admin/pacientes/$patientId"
                      params={{ patientId: p.id }}
                      className="hover:text-primary hover:underline"
                    >
                      {p.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.cpf || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex flex-col gap-0.5 text-xs">
                      {p.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {p.phone}
                        </span>
                      )}
                      {p.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {p.email}
                        </span>
                      )}
                      {!p.phone && !p.email && "—"}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      aria-label="Ver documentos do paciente"
                    >
                      <Link
                        to="/admin/pacientes/$patientId"
                        params={{ patientId: p.id }}
                        search={{ tab: "documentos" }}
                      >
                        <FileText className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(p)}
                      aria-label="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(p)}
                      aria-label="Excluir"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <PatientDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        patientId={editing?.id ?? null}
        initial={initialForm}
        onSaved={load}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir paciente?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso também remove consultas, orçamentos e outros registros ligados a{" "}
              {deleteTarget?.name}. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
