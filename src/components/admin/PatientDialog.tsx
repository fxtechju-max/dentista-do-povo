import { useEffect, useState } from "react";
import { db } from "@/integrations/mysql/client";
import { formatCPF, calculateAge } from "@/lib/admin/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type PatientFormValues = {
  name: string;
  phone: string;
  email: string;
  cpf: string;
  birth_date: string;
  address: string;
  guardian_name: string;
  guardian_phone: string;
  guardian_cpf: string;
  gender: string;
  responsible_dentist: string;
};

export const emptyPatientForm: PatientFormValues = {
  name: "",
  phone: "",
  email: "",
  cpf: "",
  birth_date: "",
  address: "",
  guardian_name: "",
  guardian_phone: "",
  guardian_cpf: "",
  gender: "",
  responsible_dentist: "",
};

export function PatientDialog({
  open,
  onOpenChange,
  patientId,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string | null;
  initial: PatientFormValues;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<PatientFormValues>(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const age = calculateAge(form.birth_date);
  const isMinor = age != null && age < 18;
  const showGuardian =
    isMinor ||
    !!(form.guardian_name.trim() || form.guardian_phone.trim() || form.guardian_cpf.trim());

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      cpf: form.cpf.trim() || null,
      birth_date: form.birth_date || null,
      address: form.address.trim() || null,
      guardian_name: form.guardian_name.trim() || null,
      guardian_phone: form.guardian_phone.trim() || null,
      guardian_cpf: form.guardian_cpf.trim() || null,
      gender: form.gender || null,
      responsible_dentist: form.responsible_dentist.trim() || null,
    };
    if (patientId) {
      await db.from("patients").update(payload).eq("id", patientId);
    } else {
      await db.from("patients").insert(payload);
    }
    setSaving(false);
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{patientId ? "Editar paciente" : "Novo paciente"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="p-name">Nome completo</Label>
            <Input
              id="p-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Nome completo do paciente"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-cpf">CPF</Label>
              <Input
                id="p-cpf"
                value={form.cpf}
                onChange={(e) => setForm((f) => ({ ...f, cpf: formatCPF(e.target.value) }))}
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-birth">Data de nascimento</Label>
              <Input
                id="p-birth"
                type="date"
                value={form.birth_date}
                onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))}
              />
              {age != null && (
                <p className="text-xs text-muted-foreground">
                  {age} {age === 1 ? "ano" : "anos"}
                  {isMinor ? " · menor de idade" : ""}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Sexo</Label>
              <Select
                value={form.gender || "nao_informado"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, gender: v === "nao_informado" ? "" : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nao_informado">Não informado</SelectItem>
                  <SelectItem value="feminino">Feminino</SelectItem>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-dentist">Dentista responsável</Label>
              <Input
                id="p-dentist"
                value={form.responsible_dentist}
                onChange={(e) => setForm((f) => ({ ...f, responsible_dentist: e.target.value }))}
                placeholder="Dr(a). nome"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-phone">Telefone</Label>
              <Input
                id="p-phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-email">Email</Label>
              <Input
                id="p-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="paciente@email.com"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-address">Endereço</Label>
            <Textarea
              id="p-address"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="Rua, número, bairro, cidade"
              rows={2}
            />
          </div>

          {showGuardian && (
            <div className="space-y-3 rounded-lg border border-dashed border-border p-3">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Responsável (paciente menor de idade)
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="p-guardian-name">Nome completo do responsável</Label>
                <Input
                  id="p-guardian-name"
                  value={form.guardian_name}
                  onChange={(e) => setForm((f) => ({ ...f, guardian_name: e.target.value }))}
                  placeholder="Nome completo"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="p-guardian-phone">Telefone do responsável</Label>
                  <Input
                    id="p-guardian-phone"
                    value={form.guardian_phone}
                    onChange={(e) => setForm((f) => ({ ...f, guardian_phone: e.target.value }))}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-guardian-cpf">CPF do responsável</Label>
                  <Input
                    id="p-guardian-cpf"
                    value={form.guardian_cpf}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, guardian_cpf: formatCPF(e.target.value) }))
                    }
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={!form.name.trim() || saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
