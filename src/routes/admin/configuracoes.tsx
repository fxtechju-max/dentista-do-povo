import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AtSign,
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
  ShieldCheck,
  Users,
  Plus,
  Trash2,
  KeyRound,
  Mail,
  History,
  Minus,
  RotateCcw,
  CreditCard,
  ChevronRight,
} from "lucide-react";
import { db } from "@/integrations/mysql/client";
import { normalizeUsername, usernameError } from "@/lib/username";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { ADMIN_MODULES } from "@/lib/modules";
import { AUDIT_TABLE_LABEL, AUDIT_ACTION_LABEL } from "@/lib/admin/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PAYMENT_METHODS } from "@/lib/payment-methods";
import { AdsenseSettings } from "@/components/admin/settings/AdsenseSettings";
import { AppearanceSettings } from "@/components/admin/settings/AppearanceSettings";
import {
  SECTIONS,
  SectionHeader,
  SettingsNav,
  type SectionId,
} from "@/components/admin/settings/SettingsNav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export const Route = createFileRoute("/admin/configuracoes")({
  validateSearch: (search: Record<string, unknown>): { aba?: SectionId } => {
    const aba = search["aba"];
    return SECTIONS.some((x) => x.id === aba) ? { aba: aba as SectionId } : {};
  },
  component: Configuracoes,
});

function Configuracoes() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState<string | null>(null);
  const [newUsername, setNewUsername] = useState("");
  const [usernamePassword, setUsernamePassword] = useState("");
  const [usernameMsg, setUsernameMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [savingUsername, setSavingUsername] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [aiSecretaryEnabled, setAiSecretaryEnabled] = useState(false);
  const [disabledModules, setDisabledModules] = useState<string[]>([]);
  const [disabledPayments, setDisabledPayments] = useState<string[]>([]);
  const [savingPayments, setSavingPayments] = useState(false);
  const [savedPayments, setSavedPayments] = useState(false);
  const { aba } = Route.useSearch();
  const navigate = Route.useNavigate();
  const activeSection: SectionId = aba ?? "perfil";
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingClinic, setSavingClinic] = useState(false);
  const [savingModules, setSavingModules] = useState(false);
  const [savedProfile, setSavedProfile] = useState(false);
  const [savedClinic, setSavedClinic] = useState(false);
  const [savedModules, setSavedModules] = useState(false);

  const [emailPassword, setEmailPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savedEmail, setSavedEmail] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savedPassword, setSavedPassword] = useState(false);

  type Admin = {
    id: string;
    email: string;
    username: string | null;
    created_at: string;
    display_name: string | null;
  };
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [adminsError, setAdminsError] = useState<string | null>(null);
  const [newAdminDialogOpen, setNewAdminDialogOpen] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminUsername, setNewAdminUsername] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [newAdminError, setNewAdminError] = useState<string | null>(null);
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Admin | null>(null);

  const [aiProvider, setAiProvider] = useState("");
  const [aiBaseUrl, setAiBaseUrl] = useState("");
  const [aiModel, setAiModel] = useState("");
  const [aiApiKeyInput, setAiApiKeyInput] = useState("");
  const [aiHasApiKey, setAiHasApiKey] = useState(false);
  const [aiApiKeyPreview, setAiApiKeyPreview] = useState("");
  const [aiEnvFallback, setAiEnvFallback] = useState(false);
  const [savingAi, setSavingAi] = useState(false);
  const [savedAi, setSavedAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  type AuditEntry = {
    id: string;
    action: "insert" | "update" | "delete";
    table_name: string;
    record_id: string | null;
    record_label: string | null;
    created_at: string;
    actor_name: string;
  };
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditError, setAuditError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: userData } = await db.auth.getUser();
      if (userData.user) {
        setUserId(userData.user.id);
        setEmail(userData.user.email ?? "");
        setUsername(userData.user.username ?? null);
        setNewUsername(userData.user.username ?? "");
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
          "clinic_name, phone, address, instagram_url, facebook_url, whatsapp_number, ai_secretary_enabled, disabled_modules, disabled_payment_methods",
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
      setDisabledPayments(clinic?.disabled_payment_methods ?? []);
      setLoading(false);
      loadAdmins();
      loadAiGateway();
      loadAuditLog();
    })();
  }, []);

  async function loadAdmins() {
    const { data, error } = await db.admins.list();
    if (error) setAdminsError(error.message);
    else setAdmins(data ?? []);
  }

  async function loadAuditLog() {
    setAuditLoading(true);
    const { data, error } = await db.auditLog.list();
    if (error) setAuditError(error.message);
    else setAuditLog(data ?? []);
    setAuditLoading(false);
  }

  async function loadAiGateway() {
    const { data, error } = await db.aiGateway.get();
    if (error || !data) return;
    setAiProvider(data.provider);
    setAiBaseUrl(data.baseUrl);
    setAiModel(data.model);
    setAiHasApiKey(data.hasApiKey);
    setAiApiKeyPreview(data.apiKeyPreview);
    setAiEnvFallback(data.envFallbackAvailable);
  }

  async function saveProfile() {
    if (!userId) return;
    setSavingProfile(true);
    await db.from("profiles").upsert({ id: userId, display_name: displayName.trim() || null });
    setSavingProfile(false);
    setSavedProfile(true);
    setTimeout(() => setSavedProfile(false), 2000);
  }

  async function changeUsername() {
    setUsernameMsg(null);
    const problem = usernameError(newUsername);
    if (problem) return setUsernameMsg({ ok: false, text: problem });
    if (!usernamePassword) return setUsernameMsg({ ok: false, text: "Confirme com sua senha." });
    setSavingUsername(true);
    const r = await db.auth.updateUsername({ password: usernamePassword, username: newUsername });
    setSavingUsername(false);
    if (r.error) return setUsernameMsg({ ok: false, text: r.error.message });
    const saved = "username" in r && r.username ? r.username : normalizeUsername(newUsername);
    setUsername(saved);
    setNewUsername(saved);
    setUsernamePassword("");
    setUsernameMsg({ ok: true, text: `Pronto! Agora você também entra com o usuário “${saved}”.` });
  }

  async function changeEmail() {
    setEmailError(null);
    if (!emailPassword.trim() || !newEmail.trim()) return;
    setSavingEmail(true);
    const { error } = await db.auth.updateEmail({
      password: emailPassword,
      newEmail: newEmail.trim(),
    });
    setSavingEmail(false);
    if (error) {
      setEmailError(error.message);
      return;
    }
    setEmail(newEmail.trim().toLowerCase());
    setEmailPassword("");
    setNewEmail("");
    setSavedEmail(true);
    setTimeout(() => setSavedEmail(false), 2000);
  }

  async function changePassword() {
    setPasswordError(null);
    if (!currentPassword.trim() || !newPassword.trim()) return;
    if (newPassword.length < 12) {
      setPasswordError("A nova senha precisa ter ao menos 12 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("As senhas não coincidem.");
      return;
    }
    setSavingPassword(true);
    const { error } = await db.auth.updatePassword({ currentPassword, newPassword });
    setSavingPassword(false);
    if (error) {
      setPasswordError(error.message);
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSavedPassword(true);
    setTimeout(() => setSavedPassword(false), 2000);
  }

  async function handleCreateAdmin() {
    setNewAdminError(null);
    if (!newAdminEmail.trim() || newAdminPassword.length < 12) {
      setNewAdminError("Informe um email válido e uma senha com ao menos 12 caracteres.");
      return;
    }
    setCreatingAdmin(true);
    const { error } = await db.admins.create({
      email: newAdminEmail.trim(),
      ...(newAdminUsername.trim() ? { username: newAdminUsername } : {}),
      password: newAdminPassword,
    });
    setCreatingAdmin(false);
    if (error) {
      setNewAdminError(error.message);
      return;
    }
    setNewAdminEmail("");
    setNewAdminUsername("");
    setNewAdminPassword("");
    setNewAdminDialogOpen(false);
    loadAdmins();
  }

  async function handleRemoveAdmin() {
    if (!removeTarget) return;
    const { error } = await db.admins.remove({ userId: removeTarget.id });
    setRemoveTarget(null);
    if (error) setAdminsError(error.message);
    else loadAdmins();
  }

  const AI_PRESETS = [
    {
      id: "openrouter",
      label: "OpenRouter",
      baseUrl: "https://openrouter.ai/api/v1",
      modelPlaceholder: "openai/gpt-4o-mini",
    },
    {
      id: "gemini",
      label: "Google Gemini",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
      modelPlaceholder: "gemini-2.0-flash",
    },
    {
      id: "deepseek",
      label: "DeepSeek",
      baseUrl: "https://api.deepseek.com",
      modelPlaceholder: "deepseek-chat",
    },
  ];

  function applyAiPreset(preset: (typeof AI_PRESETS)[number]) {
    setAiProvider(preset.id);
    setAiBaseUrl(preset.baseUrl);
  }

  async function saveAiGateway() {
    setAiError(null);
    setSavingAi(true);
    const { error } = await db.aiGateway.save({
      provider: aiProvider,
      baseUrl: aiBaseUrl,
      model: aiModel,
      apiKey: aiApiKeyInput,
    });
    setSavingAi(false);
    if (error) {
      setAiError(error.message);
      return;
    }
    setAiApiKeyInput("");
    setSavedAi(true);
    setTimeout(() => setSavedAi(false), 2000);
    loadAiGateway();
  }

  async function clearAiApiKey() {
    setAiError(null);
    const { error } = await db.aiGateway.clearKey();
    if (error) {
      setAiError(error.message);
      return;
    }
    loadAiGateway();
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

  function togglePayment(id: string, enabled: boolean) {
    setDisabledPayments((prev) => (enabled ? prev.filter((m) => m !== id) : [...prev, id]));
  }

  async function savePayments() {
    setSavingPayments(true);
    await db.from("clinic_settings").upsert({
      id: "default",
      disabled_payment_methods: disabledPayments,
      updated_at: new Date().toISOString(),
    });
    setSavingPayments(false);
    setSavedPayments(true);
    setTimeout(() => setSavedPayments(false), 2000);
  }

  if (loading) {
    return <p className="p-8 text-center text-sm text-muted-foreground">Carregando...</p>;
  }

  return (
    <div className="animate-in fade-in duration-300">
      <PageHeader
        title="⚙️ Configurações"
        description="Conta, clínica, equipe e sistema — tudo organizado em um só lugar."
      />

      <Tabs
        value={activeSection}
        onValueChange={(v) => navigate({ search: { aba: v as SectionId }, replace: true })}
        orientation="vertical"
        className="mt-5 grid items-start gap-6 lg:grid-cols-[270px_minmax(0,1fr)]"
      >
        <SettingsNav />

        <div className="min-w-0 max-w-4xl">
          <TabsContent
            value="perfil"
            className="mt-0 data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:slide-in-from-bottom-3 data-[state=active]:duration-300"
          >
            <SectionHeader id="perfil" />
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

          <TabsContent
            value="seguranca"
            className="mt-0 space-y-4 data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:slide-in-from-bottom-3 data-[state=active]:duration-300"
          >
            <SectionHeader id="seguranca" />
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="flex items-center gap-2 font-bold">
                <AtSign className="h-4 w-4 text-primary" /> Nome de usuário para entrar
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Na tela de entrar você pode usar o e-mail ({email}) ou o nome de usuário.
                {username ? (
                  <>
                    {" "}
                    Usuário atual: <b className="text-foreground">{username}</b>
                  </>
                ) : (
                  " Você ainda não tem nome de usuário."
                )}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="new-username">Nome de usuário</Label>
                  <Input
                    id="new-username"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="ex.: dr.alvaro"
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                  {newUsername.trim() && normalizeUsername(newUsername) !== newUsername.trim() && (
                    <p className="text-[11px] text-muted-foreground">
                      Vai ficar: <b>{normalizeUsername(newUsername)}</b>
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="username-password">Senha atual</Label>
                  <Input
                    id="username-password"
                    type="password"
                    value={usernamePassword}
                    onChange={(e) => setUsernamePassword(e.target.value)}
                    placeholder="Confirme sua senha"
                  />
                </div>
              </div>
              {usernameMsg && (
                <p
                  className={`mt-3 text-sm font-semibold ${usernameMsg.ok ? "text-emerald-600" : "text-destructive"}`}
                >
                  {usernameMsg.text}
                </p>
              )}
              <p className="mt-2 text-[11px] text-muted-foreground">
                De 3 a 30 caracteres: letras, números, ponto, hífen ou sublinhado (sem espaço e sem
                @).
              </p>
              <Button
                className="mt-3"
                onClick={changeUsername}
                disabled={!newUsername.trim() || !usernamePassword || savingUsername}
              >
                {savingUsername ? "Salvando..." : username ? "Alterar usuário" : "Criar usuário"}
              </Button>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="flex items-center gap-2 font-bold">
                <Mail className="h-4 w-4 text-primary" /> Alterar email
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">Email atual: {email}</p>
              <div className="mt-4 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email-current-password">Senha atual</Label>
                  <Input
                    id="email-current-password"
                    type="password"
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    placeholder="Confirme sua senha"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-email">Novo email</Label>
                  <Input
                    id="new-email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="novo@email.com"
                  />
                </div>
                {emailError && (
                  <p className="text-sm font-semibold text-destructive">{emailError}</p>
                )}
                <Button
                  onClick={changeEmail}
                  disabled={!emailPassword.trim() || !newEmail.trim() || savingEmail}
                >
                  {savedEmail ? (
                    <>
                      <Check /> Salvo
                    </>
                  ) : savingEmail ? (
                    "Salvando..."
                  ) : (
                    "Alterar email"
                  )}
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="flex items-center gap-2 font-bold">
                <KeyRound className="h-4 w-4 text-primary" /> Alterar senha
              </h2>
              <div className="mt-4 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="current-password">Senha atual</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="new-password">Nova senha</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mín. 12 caracteres"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-password">Confirmar nova senha</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
                {passwordError && (
                  <p className="text-sm font-semibold text-destructive">{passwordError}</p>
                )}
                <Button
                  onClick={changePassword}
                  disabled={!currentPassword.trim() || !newPassword.trim() || savingPassword}
                >
                  {savedPassword ? (
                    <>
                      <Check /> Salvo
                    </>
                  ) : savingPassword ? (
                    "Salvando..."
                  ) : (
                    "Alterar senha"
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Ao trocar a senha, todas as outras sessões abertas são encerradas automaticamente.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="usuarios"
            className="mt-0 data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:slide-in-from-bottom-3 data-[state=active]:duration-300"
          >
            <SectionHeader id="usuarios" />
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="font-bold">Administradores</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Todos têm acesso completo à área restrita.
                  </p>
                </div>
                <Button size="sm" onClick={() => setNewAdminDialogOpen(true)}>
                  <Plus /> Novo administrador
                </Button>
              </div>

              {adminsError && (
                <p className="mt-3 text-sm font-semibold text-destructive">{adminsError}</p>
              )}

              <div className="mt-4 space-y-2">
                {admins.length === 0 ? (
                  <EmptyState icon={Users} title="Nenhum administrador encontrado." />
                ) : (
                  admins.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{a.display_name || a.email}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {a.email}
                          {a.username ? ` · usuário ${a.username}` : ""} · desde{" "}
                          {new Date(a.created_at).toLocaleDateString("pt-BR")}
                          {a.id === userId ? " · você" : ""}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setRemoveTarget(a)}
                        disabled={a.id === userId}
                        aria-label="Remover administrador"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="clinica"
            className="mt-0 data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:slide-in-from-bottom-3 data-[state=active]:duration-300"
          >
            <SectionHeader id="clinica" />
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

          <TabsContent
            value="ia"
            className="mt-0 data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:slide-in-from-bottom-3 data-[state=active]:duration-300"
          >
            <SectionHeader id="ia" />
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-bold">Provedor de IA</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Usado na secretária virtual, resumos de prontuário e rascunho de receitas e
                respostas.
                {aiEnvFallback && !aiHasApiKey && (
                  <>
                    {" "}
                    Sem chave configurada aqui, o sistema usa a variável de ambiente do servidor.
                  </>
                )}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {AI_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => applyAiPreset(p)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                      aiProvider === p.id
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="mt-4 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ai-base-url">URL base da API</Label>
                  <Input
                    id="ai-base-url"
                    value={aiBaseUrl}
                    onChange={(e) => setAiBaseUrl(e.target.value)}
                    placeholder="https://openrouter.ai/api/v1"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ai-model">Modelo</Label>
                  <Input
                    id="ai-model"
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    placeholder={
                      AI_PRESETS.find((p) => p.id === aiProvider)?.modelPlaceholder ??
                      "openai/gpt-4o-mini"
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ai-api-key">Chave da API</Label>
                  <Input
                    id="ai-api-key"
                    type="password"
                    value={aiApiKeyInput}
                    onChange={(e) => setAiApiKeyInput(e.target.value)}
                    placeholder={
                      aiHasApiKey ? `Configurada (${aiApiKeyPreview})` : "Cole sua chave aqui"
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {aiHasApiKey
                      ? "A chave já salva nunca é exibida por segurança — deixe em branco para mantê-la, ou digite uma nova para trocar."
                      : "Nenhuma chave salva no banco de dados ainda."}
                  </p>
                  {aiHasApiKey && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAiApiKey}
                      className="text-destructive"
                    >
                      Remover chave salva
                    </Button>
                  )}
                </div>
                {aiError && <p className="text-sm font-semibold text-destructive">{aiError}</p>}
                <Button onClick={saveAiGateway} disabled={savingAi}>
                  {savedAi ? (
                    <>
                      <Check /> Salvo
                    </>
                  ) : savingAi ? (
                    "Salvando..."
                  ) : (
                    "Salvar configuração de IA"
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="modulos"
            className="mt-0 data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:slide-in-from-bottom-3 data-[state=active]:duration-300"
          >
            <SectionHeader id="modulos" />
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

          <TabsContent
            value="aparencia"
            className="mt-0 data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:slide-in-from-bottom-3 data-[state=active]:duration-300"
          >
            <SectionHeader id="aparencia" />
            <AppearanceSettings />
          </TabsContent>

          <TabsContent
            value="pagamentos"
            className="mt-0 data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:slide-in-from-bottom-3 data-[state=active]:duration-300"
          >
            <SectionHeader id="pagamentos" />
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="text-sm text-muted-foreground">
                Ative as formas de pagamento que a clínica aceita. Só as ativas aparecem ao lançar
                pagamentos no Financeiro e em Contas a Pagar/Receber — lançamentos antigos continuam
                mostrando a forma usada.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {PAYMENT_METHODS.map((m, i) => {
                  const enabled = !disabledPayments.includes(m.id);
                  return (
                    <label
                      key={m.id}
                      htmlFor={`pay-${m.id}`}
                      className={`animate-in fade-in slide-in-from-bottom-1 fill-mode-both flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition-all duration-200 hover:shadow-sm ${
                        enabled ? "border-primary/40 bg-primary/5" : "border-border opacity-70"
                      }`}
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <span className="flex items-center gap-3">
                        <span className="text-xl">{m.emoji}</span>
                        <span>
                          <span className="block text-sm font-semibold">{m.label}</span>
                          <span className="block text-xs text-muted-foreground">
                            {m.description}
                            {m.installments ? " · aceita parcelas" : ""}
                          </span>
                        </span>
                      </span>
                      <Switch
                        id={`pay-${m.id}`}
                        checked={enabled}
                        onCheckedChange={(checked) => togglePayment(m.id, checked)}
                      />
                    </label>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button onClick={savePayments} disabled={savingPayments}>
                  {savedPayments ? (
                    <>
                      <Check /> Salvo
                    </>
                  ) : savingPayments ? (
                    "Salvando..."
                  ) : (
                    "Salvar formas de pagamento"
                  )}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {PAYMENT_METHODS.length - disabledPayments.length} de {PAYMENT_METHODS.length}{" "}
                  ativas
                </span>
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="anuncios"
            className="mt-0 data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:slide-in-from-bottom-3 data-[state=active]:duration-300"
          >
            <SectionHeader id="anuncios" />
            <AdsenseSettings />
          </TabsContent>

          <TabsContent
            value="transparencia"
            className="mt-0 data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:slide-in-from-bottom-3 data-[state=active]:duration-300"
          >
            <SectionHeader id="transparencia" />
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-bold">Atividade na área restrita</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Registro de tudo que é criado, alterado ou excluído no sistema, e por quem.
              </p>

              {auditError && (
                <p className="mt-3 text-sm font-semibold text-destructive">{auditError}</p>
              )}

              <div className="mt-4 max-h-[32rem] space-y-1 overflow-y-auto">
                {auditLoading ? (
                  <p className="p-8 text-center text-sm text-muted-foreground">Carregando...</p>
                ) : auditLog.length === 0 ? (
                  <EmptyState icon={History} title="Nenhuma atividade registrada ainda." />
                ) : (
                  auditLog.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate">
                          <span className="font-semibold">{entry.actor_name}</span>{" "}
                          {AUDIT_ACTION_LABEL[entry.action]}{" "}
                          <span className="font-semibold">
                            {AUDIT_TABLE_LABEL[entry.table_name] ?? entry.table_name}
                          </span>
                          {entry.record_label ? ` "${entry.record_label}"` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {new Date(entry.created_at).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      <Dialog open={newAdminDialogOpen} onOpenChange={setNewAdminDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo administrador</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-admin-email">Email</Label>
              <Input
                id="new-admin-email"
                type="email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                placeholder="colega@dentistadopovo.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-admin-username">Nome de usuário (opcional)</Label>
              <Input
                id="new-admin-username"
                value={newAdminUsername}
                onChange={(e) => setNewAdminUsername(e.target.value)}
                placeholder="ex.: recepcao"
                autoCapitalize="none"
                spellCheck={false}
              />
              <p className="text-[11px] text-muted-foreground">
                Com ele, a pessoa pode entrar usando o usuário ou o e-mail.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-admin-password">Senha</Label>
              <Input
                id="new-admin-password"
                type="password"
                value={newAdminPassword}
                onChange={(e) => setNewAdminPassword(e.target.value)}
                placeholder="Mín. 12 caracteres"
              />
            </div>
            {newAdminError && (
              <p className="text-sm font-semibold text-destructive">{newAdminError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewAdminDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateAdmin}
              disabled={!newAdminEmail.trim() || newAdminPassword.length < 12 || creatingAdmin}
            >
              {creatingAdmin ? "Criando..." : "Criar administrador"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover administrador?</AlertDialogTitle>
            <AlertDialogDescription>
              "{removeTarget?.display_name || removeTarget?.email}" perderá acesso à área restrita
              imediatamente. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveAdmin}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
