import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Check,
  Sparkles,
  User as UserIcon,
  Building2,
  Grid2x2,
  Palette,
  Sun,
  Moon,
  Monitor,
  Instagram,
  Facebook,
  MessageCircle,
} from "lucide-react";
import { db } from "@/integrations/mysql/client";
import { PageHeader } from "@/components/admin/PageHeader";
import { ADMIN_MODULES } from "@/lib/modules";
import {
  THEME_COLORS,
  applyThemePrefs,
  loadThemePrefs,
  saveThemePrefs,
  type ThemeMode,
} from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/admin/configuracoes")({
  component: Configuracoes,
});

const MODE_OPTIONS: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Claro", icon: Sun },
  { id: "dark", label: "Escuro", icon: Moon },
  { id: "system", label: "Automático", icon: Monitor },
];

function Configuracoes() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [aiSecretaryEnabled, setAiSecretaryEnabled] = useState(false);
  const [disabledModules, setDisabledModules] = useState<string[]>([]);
  const [themePrefs, setThemePrefs] = useState(() => loadThemePrefs());
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingClinic, setSavingClinic] = useState(false);
  const [savingModules, setSavingModules] = useState(false);
  const [savedProfile, setSavedProfile] = useState(false);
  const [savedClinic, setSavedClinic] = useState(false);
  const [savedModules, setSavedModules] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: userData } = await db.auth.getUser();
      if (userData.user) {
        setUserId(userData.user.id);
        setEmail(userData.user.email ?? "");
        const { data: profile } = await db
          .from("profiles")
          .select("display_name")
          .eq("id", userData.user.id)
          .maybeSingle();
        setDisplayName(profile?.display_name ?? "");
      }
      const { data: clinic } = await db
        .from("clinic_settings")
        .select(
          "clinic_name, phone, address, instagram_url, facebook_url, whatsapp_number, ai_secretary_enabled, disabled_modules",
        )
        .eq("id", "default")
        .maybeSingle();
      setClinicName(clinic?.clinic_name ?? "");
      setPhone(clinic?.phone ?? "");
      setAddress(clinic?.address ?? "");
      setInstagramUrl(clinic?.instagram_url ?? "");
      setFacebookUrl(clinic?.facebook_url ?? "");
      setWhatsappNumber(clinic?.whatsapp_number ?? "");
      setAiSecretaryEnabled(clinic?.ai_secretary_enabled ?? false);
      setDisabledModules(clinic?.disabled_modules ?? []);
      setLoading(false);
    })();
  }, []);

  async function saveProfile() {
    if (!userId) return;
    setSavingProfile(true);
    await db.from("profiles").upsert({ id: userId, display_name: displayName.trim() || null });
    setSavingProfile(false);
    setSavedProfile(true);
    setTimeout(() => setSavedProfile(false), 2000);
  }

  async function saveClinic() {
    setSavingClinic(true);
    await db.from("clinic_settings").upsert({
      id: "default",
      clinic_name: clinicName.trim() || null,
      phone: phone.trim() || null,
      address: address.trim() || null,
      instagram_url: instagramUrl.trim() || null,
      facebook_url: facebookUrl.trim() || null,
      whatsapp_number: whatsappNumber.trim() || null,
      ai_secretary_enabled: aiSecretaryEnabled,
      updated_at: new Date().toISOString(),
    });
    setSavingClinic(false);
    setSavedClinic(true);
    setTimeout(() => setSavedClinic(false), 2000);
  }

  function toggleModule(id: string, enabled: boolean) {
    setDisabledModules((prev) => (enabled ? prev.filter((m) => m !== id) : [...prev, id]));
  }

  async function saveModules() {
    setSavingModules(true);
    await db.from("clinic_settings").upsert({
      id: "default",
      disabled_modules: disabledModules,
      updated_at: new Date().toISOString(),
    });
    setSavingModules(false);
    setSavedModules(true);
    setTimeout(() => setSavedModules(false), 2000);
  }

  function updateTheme(patch: Partial<typeof themePrefs>) {
    const next = { ...themePrefs, ...patch };
    setThemePrefs(next);
    applyThemePrefs(next);
    saveThemePrefs(next);
  }

  if (loading) {
    return <p className="p-8 text-center text-sm text-muted-foreground">Carregando...</p>;
  }

  return (
    <div className="animate-in fade-in max-w-3xl duration-300">
      <PageHeader
        title="⚙️ Configurações"
        description="Perfil, clínica, módulos e aparência do painel."
      />

      <Tabs defaultValue="perfil" className="mt-4">
        <TabsList>
          <TabsTrigger value="perfil">
            <UserIcon className="h-3.5 w-3.5" /> Perfil
          </TabsTrigger>
          <TabsTrigger value="clinica">
            <Building2 className="h-3.5 w-3.5" /> Clínica
          </TabsTrigger>
          <TabsTrigger value="modulos">
            <Grid2x2 className="h-3.5 w-3.5" /> Módulos
          </TabsTrigger>
          <TabsTrigger value="aparencia">
            <Palette className="h-3.5 w-3.5" /> Aparência
          </TabsTrigger>
        </TabsList>

        <TabsContent value="perfil" className="mt-4">
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
        </TabsContent>

        <TabsContent value="clinica" className="mt-4">
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

              <div className="pt-2">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Redes sociais (exibidas no site público)
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="clinic-instagram" className="flex items-center gap-1.5">
                  <Instagram className="h-3.5 w-3.5" /> Instagram
                </Label>
                <Input
                  id="clinic-instagram"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="https://instagram.com/seuperfil"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="clinic-facebook" className="flex items-center gap-1.5">
                  <Facebook className="h-3.5 w-3.5" /> Facebook
                </Label>
                <Input
                  id="clinic-facebook"
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  placeholder="https://facebook.com/suapagina"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="clinic-whatsapp" className="flex items-center gap-1.5">
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </Label>
                <Input
                  id="clinic-whatsapp"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="(65) 99999-0000"
                />
                <p className="text-xs text-muted-foreground">
                  O botão de WhatsApp do site abre uma conversa direto com esse número.
                </p>
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
        </TabsContent>

        <TabsContent value="modulos" className="mt-4">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-bold">Módulos do sistema</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Desative aqui os módulos que não usa — eles somem do quadro e do menu.
            </p>
            <div className="mt-4 space-y-2">
              {ADMIN_MODULES.map((m) => {
                const enabled = !disabledModules.includes(m.id);
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${m.iconBg} ${m.iconColor}`}
                      >
                        <m.icon className="h-4 w-4" />
                      </span>
                      <div>
                        <Label htmlFor={`mod-${m.id}`}>{m.name}</Label>
                        <p className="text-xs text-muted-foreground">{m.description}</p>
                      </div>
                    </div>
                    <Switch
                      id={`mod-${m.id}`}
                      checked={enabled}
                      onCheckedChange={(checked) => toggleModule(m.id, checked)}
                    />
                  </div>
                );
              })}
            </div>
            <Button className="mt-4" onClick={saveModules} disabled={savingModules}>
              {savedModules ? (
                <>
                  <Check /> Salvo
                </>
              ) : savingModules ? (
                "Salvando..."
              ) : (
                "Salvar módulos"
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="aparencia" className="mt-4">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-bold">Tema</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Escolha entre claro, escuro ou seguir o sistema. Aplica na hora.
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {MODE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => updateTheme({ mode: opt.id })}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-sm font-semibold transition-colors ${
                    themePrefs.mode === opt.id
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <opt.icon className="h-4 w-4" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-card p-6">
            <h2 className="font-bold">Cor da interface</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Escolha a cor de destaque usada em botões, links e ícones do painel inteiro.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {THEME_COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => updateTheme({ color: c.id })}
                  title={c.name}
                  aria-label={c.name}
                  className={`flex h-11 w-11 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-card transition-transform hover:scale-110 ${
                    themePrefs.color === c.id ? "ring-foreground" : "ring-transparent"
                  }`}
                >
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full"
                    style={{ backgroundColor: c.primary }}
                  >
                    {themePrefs.color === c.id && <Check className="h-4 w-4 text-white" />}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
