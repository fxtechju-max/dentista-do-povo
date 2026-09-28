import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, ExternalLink, Save } from "lucide-react";
import { db } from "@/integrations/mysql/client";
import { AD_POSITIONS, buildAdsTxt, normalizeClientId, type AdPosition } from "@/lib/adsense";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type Form = {
  enabled: boolean;
  clientId: string;
  slots: Record<AdPosition, string>;
  extra: string;
};

const EMPTY: Form = {
  enabled: false,
  clientId: "",
  slots: { home: "", blog_list: "", blog_post: "" },
  extra: "",
};

const SLOT_COLUMN: Record<AdPosition, string> = {
  home: "adsense_slot_home",
  blog_list: "adsense_slot_blog_list",
  blog_post: "adsense_slot_blog_post",
};

const STEPS = [
  "Crie ou acesse sua conta em adsense.google.com com o Gmail da clínica.",
  "Em Sites, adicione o endereço do seu site (o domínio publicado na Vercel).",
  "Copie o seu ID de editor (ca-pub-…) e cole abaixo. Ligue “Exibir anúncios” e salve.",
  "O código de verificação e o ads.txt passam a ser publicados automaticamente.",
  "No AdSense, clique em Verificar e solicite a revisão. A aprovação pode levar alguns dias.",
  "Depois de aprovado, crie blocos de anúncio (Anúncios › Por bloco de anúncios) e cole os IDs dos blocos abaixo — ou ative os Anúncios automáticos no próprio AdSense.",
];

/** Configurações › Anúncios: Google AdSense salvo no projeto (clinic_settings). */
export function AdsenseSettings() {
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    db.from("clinic_settings")
      .select(
        "adsense_enabled, adsense_client_id, adsense_slot_home, adsense_slot_blog_list, adsense_slot_blog_post, ads_txt_extra",
      )
      .eq("id", "default")
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setForm({
          enabled: Boolean(data.adsense_enabled),
          clientId: data.adsense_client_id ?? "",
          slots: {
            home: data.adsense_slot_home ?? "",
            blog_list: data.adsense_slot_blog_list ?? "",
            blog_post: data.adsense_slot_blog_post ?? "",
          },
          extra: data.ads_txt_extra ?? "",
        });
      });
  }, []);

  const normalized = normalizeClientId(form.clientId);
  const idInvalid = form.clientId.trim() !== "" && !normalized;
  const badSlots = AD_POSITIONS.filter((p) => {
    const v = form.slots[p.id].trim();
    return v !== "" && !/^\d{6,20}$/.test(v);
  });

  async function save() {
    if (idInvalid || badSlots.length) return;
    if (form.enabled && !normalized) {
      toast.error("Informe o ID de editor (ca-pub-…) para ativar os anúncios.");
      return;
    }
    setSaving(true);
    const { error } = await db.from("clinic_settings").upsert({
      id: "default",
      adsense_enabled: form.enabled,
      adsense_client_id: normalized,
      adsense_slot_home: form.slots.home.trim() || null,
      adsense_slot_blog_list: form.slots.blog_list.trim() || null,
      adsense_slot_blog_post: form.slots.blog_post.trim() || null,
      ads_txt_extra: form.extra.trim() || null,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (!error) {
      if (normalized) setForm((f) => ({ ...f, clientId: normalized }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast.success("Anúncios salvos no projeto. O site é atualizado em até 5 minutos.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="font-bold">Como ativar o Google AdSense</p>
        <ol className="mt-3 space-y-2">
          {STEPS.map((step, i) => (
            <li key={step} className="flex gap-3 text-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {i + 1}
              </span>
              <span className="text-muted-foreground">{step}</span>
            </li>
          ))}
        </ol>
        <Button variant="outline" size="sm" className="mt-4" asChild>
          <a href="https://adsense.google.com/" target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4" /> Abrir o Google AdSense
          </a>
        </Button>
      </div>

      <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
        <label
          htmlFor="ads-enabled"
          className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors ${
            form.enabled ? "border-primary/40 bg-primary/5" : "border-border"
          }`}
        >
          <span>
            <span className="block font-semibold">Exibir anúncios no site</span>
            <span className="block text-xs text-muted-foreground">
              Anúncios aparecem só no site público — nunca no painel nem na tela de login.
            </span>
          </span>
          <Switch
            id="ads-enabled"
            checked={form.enabled}
            onCheckedChange={(enabled) => setForm({ ...form, enabled })}
          />
        </label>

        <div className="space-y-1.5">
          <Label htmlFor="ads-client">ID de editor (Publisher ID)</Label>
          <Input
            id="ads-client"
            value={form.clientId}
            placeholder="ca-pub-0000000000000000"
            onChange={(e) => setForm({ ...form, clientId: e.target.value })}
            className={idInvalid ? "border-destructive" : ""}
          />
          <p className={`text-xs ${idInvalid ? "text-destructive" : "text-muted-foreground"}`}>
            {idInvalid
              ? "ID inválido. Ele tem o formato ca-pub- seguido de 16 números."
              : "No AdSense: Conta › Informações da conta › ID do editor."}
          </p>
        </div>

        <div className="space-y-2">
          <Label>Blocos de anúncio (opcional)</Label>
          <p className="text-xs text-muted-foreground">
            Cole o ID numérico de cada bloco criado no AdSense (data-ad-slot). Deixe em branco para
            não mostrar anúncio naquele lugar.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {AD_POSITIONS.map((p) => {
              const invalid = badSlots.some((b) => b.id === p.id);
              return (
                <div key={p.id} className="space-y-1">
                  <Label htmlFor={`slot-${p.id}`} className="text-xs">
                    {p.label}
                  </Label>
                  <Input
                    id={`slot-${p.id}`}
                    value={form.slots[p.id]}
                    inputMode="numeric"
                    placeholder="Ex.: 1234567890"
                    onChange={(e) =>
                      setForm({ ...form, slots: { ...form.slots, [p.id]: e.target.value } })
                    }
                    className={invalid ? "border-destructive" : ""}
                  />
                  <p
                    className={`text-[11px] ${invalid ? "text-destructive" : "text-muted-foreground"}`}
                  >
                    {invalid ? "Use só números." : p.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ads-extra">ads.txt</Label>
          <p className="text-xs text-muted-foreground">
            Gerado automaticamente a partir do seu ID e publicado em{" "}
            <a href="/ads.txt" target="_blank" rel="noreferrer" className="text-primary underline">
              /ads.txt
            </a>
            . Se usar outras redes de anúncio, adicione as linhas delas abaixo.
          </p>
          <pre className="overflow-x-auto rounded-lg bg-muted px-3 py-2 text-xs">
            {buildAdsTxt(normalized, form.extra)}
          </pre>
          <Textarea
            id="ads-extra"
            rows={3}
            value={form.extra}
            placeholder="Linhas extras (opcional), ex.: outra-rede.com, 12345, DIRECT"
            onChange={(e) => setForm({ ...form, extra: e.target.value })}
            className="font-mono text-xs"
          />
        </div>

        <Button onClick={save} disabled={saving || idInvalid || badSlots.length > 0}>
          {saved ? (
            <>
              <Check /> Salvo
            </>
          ) : (
            <>
              <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar anúncios"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
