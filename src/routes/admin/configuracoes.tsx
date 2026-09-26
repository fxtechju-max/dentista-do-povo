import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/admin/configuracoes")({
  component: Configuracoes,
});

function Configuracoes() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [aiSecretaryEnabled, setAiSecretaryEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingClinic, setSavingClinic] = useState(false);
  const [savedProfile, setSavedProfile] = useState(false);
  const [savedClinic, setSavedClinic] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        setUserId(userData.user.id);
        setEmail(userData.user.email ?? "");
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", userData.user.id)
          .maybeSingle();
        setDisplayName(profile?.display_name ?? "");
      }
      const { data: clinic } = await supabase
        .from("clinic_settings")
        .select("clinic_name, phone, address, ai_secretary_enabled")
        .eq("id", "default")
        .maybeSingle();
      setClinicName(clinic?.clinic_name ?? "");
      setPhone(clinic?.phone ?? "");
      setAddress(clinic?.address ?? "");
      setAiSecretaryEnabled(clinic?.ai_secretary_enabled ?? false);
      setLoading(false);
    })();
  }, []);

  async function saveProfile() {
    if (!userId) return;
    setSavingProfile(true);
    await supabase
      .from("profiles")
      .upsert({ id: userId, display_name: displayName.trim() || null });
    setSavingProfile(false);
    setSavedProfile(true);
    setTimeout(() => setSavedProfile(false), 2000);
  }

  async function saveClinic() {
    setSavingClinic(true);
    await supabase.from("clinic_settings").upsert({
      id: "default",
      clinic_name: clinicName.trim() || null,
      phone: phone.trim() || null,
      address: address.trim() || null,
      ai_secretary_enabled: aiSecretaryEnabled,
      updated_at: new Date().toISOString(),
    });
    setSavingClinic(false);
    setSavedClinic(true);
    setTimeout(() => setSavedClinic(false), 2000);
  }

  if (loading) {
    return <p className="p-8 text-center text-sm text-muted-foreground">Carregando...</p>;
  }

  return (
    <div className="animate-in fade-in max-w-2xl space-y-6 duration-300">
      <PageHeader title="⚙️ Configurações" description="Perfil e dados da clínica." />

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-bold">Seu perfil</h2>
        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={email} disabled />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="display-name">Nome de exibição</Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Como você quer aparecer no painel"
            />
          </div>
          <Button onClick={saveProfile} disabled={savingProfile}>
            {savedProfile ? (
              <>
                <Check /> Salvo
              </>
            ) : savingProfile ? (
              "Salvando..."
            ) : (
              "Salvar perfil"
            )}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-bold">Dados da clínica</h2>
        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="clinic-name">Nome da clínica</Label>
            <Input
              id="clinic-name"
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              placeholder="Dentista do Povo"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="clinic-phone">Telefone</Label>
            <Input
              id="clinic-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(00) 0000-0000"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="clinic-address">Endereço</Label>
            <Input
              id="clinic-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Rua, número, bairro, cidade"
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <div>
                <Label htmlFor="ai-secretary">Atendente virtual (IA) no chat do site</Label>
                <p className="text-xs text-muted-foreground">
                  Responde visitantes automaticamente até um humano assumir a conversa.
                </p>
              </div>
            </div>
            <Switch
              id="ai-secretary"
              checked={aiSecretaryEnabled}
              onCheckedChange={setAiSecretaryEnabled}
            />
          </div>
          <Button onClick={saveClinic} disabled={savingClinic}>
            {savedClinic ? (
              <>
                <Check /> Salvo
              </>
            ) : savingClinic ? (
              "Salvando..."
            ) : (
              "Salvar dados da clínica"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
