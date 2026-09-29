import { useEffect, useState } from "react";
import { db } from "@/integrations/mysql/client";
import type { PatientFormValues } from "@/lib/admin/patient-form";
import { formatCPF, formatPhone, calculateAge } from "@/lib/admin/labels";
import { Baby } from "lucide-react";
import { Switch } from "@/components/ui/switch";
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
  const hasGuardian = (v: PatientFormValues) =>
    !!(v.guardian_name.trim() || v.guardian_phone.trim() || v.guardian_cpf.trim());
  // Menor de idade: liga sozinho pela data de nascimento ou manualmente.
  const [minorOn, setMinorOn] = useState(false);
  useEffect(() => {
    if (open) {
      const a = calculateAge(initial.birth_date);
      setMinorOn((a != null && a < 18) || hasGuardian(initial));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  useEffect(() => {
    if (isMinor) setMinorOn(true);
  }, [isMinor]);
  const showGuardian = minorOn;
  const guardianMissing =
    minorOn && (!form.guardian_name.trim() || form.guardian_phone.replace(/D/g, "").length < 10);

  async function save() {
    if (!form.name.trim() || guardianMissing) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      cpf: form.cpf.trim() || null,
      birth_date: form.birth_date || null,
      address: form.address.trim() || null,
      guardian_name: (minorOn && form.guardian_name.trim()) || null,
      guardian_phone: (minorOn && form.guardian_phone.trim()) || null,
      guardian_cpf: (minorOn && form.guardian_cpf.trim()) || null,
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
                onChange={(e) => setForm((f) => ({ ...f, phone: formatPhone(e.target.value) }))}
                inputMode="tel"
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

          <div
            className={`rounded-xl border transition-colors ${
              minorOn
                ? "border-amber-300 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20"
                : "border-border"
            }`}
          >
            <label className="flex cursor-pointer items-center gap-3 p-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  minorOn
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Baby className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">Paciente menor de idade</span>
                <span className="block text-xs text-muted-foreground">
                  {isMinor
                    ? `Tem ${age} ${age === 1 ? "ano" : "anos"} — informe o responsável.`
                    : "Ative para cadastrar o responsável legal."}
                </span>
              </span>
              <Switch
                checked={minorOn}
                onCheckedChange={setMinorOn}
                disabled={isMinor}
                aria-label="Paciente menor de idade"
              />
            </label>

            {showGuardian && (
              <div className="space-y-3 border-t border-amber-200 p-3 animate-in fade-in slide-in-from-top-1 duration-200 dark:border-amber-900">
                <p className="text-xs font-bold uppercase tracking-widest text-amber-800 dark:text-amber-300">
                  Responsável legal
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="p-guardian-name">
                    Nome completo do responsável <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="p-guardian-name"
                    value={form.guardian_name}
                    onChange={(e) => setForm((f) => ({ ...f, guardian_name: e.target.value }))}
                    placeholder="Nome completo (mãe, pai ou responsável)"
                    aria-invalid={!form.guardian_name.trim()}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="p-guardian-phone">
                      Telefone do responsável <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="p-guardian-phone"
                      inputMode="tel"
                      value={form.guardian_phone}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, guardian_phone: formatPhone(e.target.value) }))
                      }
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
                {guardianMissing && (
                  <p className="text-xs font-medium text-destructive">
                    Preencha o nome e o telefone do responsável para salvar.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={!form.name.trim() || guardianMissing || saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
