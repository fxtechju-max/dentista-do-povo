import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ExternalLink, ImagePlus, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { db } from "@/integrations/mysql/client";
import {
  DEFAULT_HOME,
  parseHomeContent,
  siteImageUrl,
  type Faq,
  type HomeContent,
  type Highlight,
  type Stat,
} from "@/lib/site-content";
import { deleteSiteImage, uploadSiteImage } from "@/lib/site-images.functions";
import heroImg from "@/assets/clinica-hero.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type SectionKey = keyof HomeContent;

function Field({
  label,
  value,
  onChange,
  multiline,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {multiline ? (
        <Textarea
          value={value}
          rows={4}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ImageField({
  label,
  imageId,
  fallback,
  uploading,
  onPick,
  onRemove,
}: {
  label: string;
  imageId: string | null;
  fallback: string | null;
  uploading: boolean;
  onPick: (file: File) => void;
  onRemove: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const src = imageId ? siteImageUrl(imageId) : fallback;
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="grid gap-4 sm:grid-cols-[260px_1fr]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl border-2 border-dashed border-border bg-muted">
          {src ? (
            <img src={src} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-xs text-muted-foreground">
              Sem foto
            </span>
          )}
          {uploading && (
            <span className="absolute inset-0 flex items-center justify-center bg-background/70 text-sm font-semibold">
              Enviando e ajustando...
            </span>
          )}
        </div>
        <div className="space-y-2 text-sm">
          <div className="rounded-lg bg-primary/5 p-3 text-xs leading-relaxed">
            <p className="font-bold text-primary">Formato certo da foto</p>
            <p>• Foto na horizontal, proporção 4:3 (ideal 1600 × 1200 px)</p>
            <p>• JPG, PNG ou WEBP, até 15 MB</p>
            <p>
              • Pode enviar qualquer foto do computador: o sistema recorta no formato, corrige a
              rotação e otimiza automaticamente.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => input.current?.click()} disabled={uploading}>
              <ImagePlus className="h-4 w-4" /> Enviar foto do computador
            </Button>
            {imageId && (
              <Button size="sm" variant="outline" onClick={onRemove} disabled={uploading}>
                <Trash2 className="h-4 w-4" /> {fallback ? "Voltar à foto padrão" : "Remover foto"}
              </Button>
            )}
          </div>
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onPick(file);
              e.target.value = "";
            }}
          />
        </div>
      </div>
    </div>
  );
}

/** Editor genérico de listas (números, destaques, perguntas). */
function ListEditor<T>({
  items,
  onChange,
  empty,
  max,
  addLabel,
  render,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  empty: T;
  max: number;
  addLabel: string;
  render: (item: T, update: (patch: Partial<T>) => void) => ReactNode;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div
          key={i}
          className="animate-in fade-in slide-in-from-bottom-1 flex gap-2 rounded-xl border border-border bg-background p-3"
        >
          <div className="min-w-0 flex-1">
            {render(item, (patch) =>
              onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x))),
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Remover"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      {items.length < max && (
        <Button variant="outline" size="sm" onClick={() => onChange([...items, { ...empty }])}>
          <Plus className="h-4 w-4" /> {addLabel}
        </Button>
      )}
    </div>
  );
}

function HighlightFields({
  item,
  update,
}: {
  item: Highlight;
  update: (patch: Partial<Highlight>) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[70px_1fr]">
      <Input
        value={item.emoji}
        onChange={(e) => update({ emoji: e.target.value })}
        aria-label="Emoji"
        className="text-center text-lg"
      />
      <Input
        value={item.title}
        placeholder="Título"
        onChange={(e) => update({ title: e.target.value })}
      />
      <Textarea
        value={item.text}
        rows={2}
        placeholder="Texto"
        className="sm:col-span-2"
        onChange={(e) => update({ text: e.target.value })}
      />
    </div>
  );
}

export function HomeContentTab() {
  const [content, setContent] = useState<HomeContent>(DEFAULT_HOME);
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  // Fotos substituídas só são apagadas depois de salvar (o site continua usando até lá).
  const [replaced, setReplaced] = useState<string[]>([]);

  useEffect(() => {
    db.from("site_content")
      .select("content")
      .eq("id", "home")
      .maybeSingle()
      .then(({ data }) => {
        setContent(parseHomeContent(data?.content));
        setLoaded(true);
      });
  }, []);

  function patch<K extends SectionKey>(section: K, values: Partial<HomeContent[K]>) {
    setContent((c) => ({ ...c, [section]: { ...c[section], ...values } }));
    setDirty(true);
  }

  function restore(section: SectionKey) {
    setContent((c) => {
      const current = c[section] as { imageId?: string | null };
      const base = { ...DEFAULT_HOME[section] } as { imageId?: string | null };
      if ("imageId" in base) base.imageId = current.imageId ?? null;
      return { ...c, [section]: base };
    });
    setDirty(true);
    toast.info("Texto padrão restaurado. Clique em Salvar para publicar.");
  }

  async function upload(section: "hero" | "about", file: File) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      toast.error("Envie uma imagem JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Imagem muito grande (máximo 15MB).");
      return;
    }
    setUploading(section);
    const body = new FormData();
    body.set("file", file);
    body.set("slot", section);
    const result = await uploadSiteImage({ data: body });
    setUploading(null);
    if (result.error || !result.data) {
      toast.error(result.error?.message ?? "Falha no envio.");
      return;
    }
    const previous = content[section].imageId;
    if (previous) setReplaced((r) => [...r, previous]);
    patch(section, { imageId: result.data.id });
    toast.success("Foto ajustada ao formato certo. Clique em Salvar para publicar.");
  }

  function removeImage(section: "hero" | "about") {
    const previous = content[section].imageId;
    if (previous) setReplaced((r) => [...r, previous]);
    patch(section, { imageId: null });
  }

  async function save() {
    setSaving(true);
    const { error } = await db.from("site_content").upsert({
      id: "home",
      content: JSON.stringify(content),
      updated_at: new Date().toISOString(),
    });
    if (!error) {
      await Promise.all(replaced.map((id) => deleteSiteImage({ data: { id } })));
      setReplaced([]);
      setDirty(false);
      toast.success("Página inicial publicada no site.");
    }
    setSaving(false);
  }

  if (!loaded)
    return <p className="p-8 text-center text-sm text-muted-foreground">Carregando...</p>;

  const { hero, about, why, city, faq, cta } = content;

  const sectionHeader = (
    title: string,
    description: string,
    section: SectionKey,
    toggle?: boolean,
  ) => (
    <div className="flex flex-1 items-center justify-between gap-3 pr-2 text-left">
      <span>
        <span className="block font-bold">{title}</span>
        <span className="block text-xs font-normal text-muted-foreground">{description}</span>
      </span>
      {toggle !== undefined && (
        <span
          className="flex items-center gap-2 text-xs font-normal"
          onClick={(e) => e.stopPropagation()}
        >
          {toggle ? "Visível" : "Oculta"}
          <Switch
            checked={toggle}
            onCheckedChange={(enabled) => patch(section, { enabled } as never)}
          />
        </span>
      )}
    </div>
  );

  const restoreButton = (section: SectionKey) => (
    <Button variant="ghost" size="sm" onClick={() => restore(section)}>
      <RotateCcw className="h-3.5 w-3.5" /> Restaurar texto padrão
    </Button>
  );

  return (
    <div className="space-y-4">
      <div className="sticky top-2 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-sm backdrop-blur">
        <p className="text-sm">
          {dirty ? (
            <span className="font-semibold text-amber-600">● Alterações não publicadas</span>
          ) : (
            <span className="text-muted-foreground">Tudo publicado no site.</span>
          )}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href="/" target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" /> Ver site
            </a>
          </Button>
          <Button size="sm" onClick={save} disabled={saving || !!uploading || !dirty}>
            <Save className="h-4 w-4" /> {saving ? "Publicando..." : "Salvar e publicar"}
          </Button>
        </div>
      </div>

      <Accordion type="multiple" defaultValue={["hero"]} className="space-y-3">
        <AccordionItem value="hero" className="rounded-2xl border border-border bg-card px-5">
          <AccordionTrigger>
            {sectionHeader(
              "⭐ Destaque (topo do site)",
              "Título, texto, botões, números e foto principal",
              "hero",
            )}
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-5">
            <ImageField
              label="Foto principal"
              imageId={hero.imageId}
              fallback={heroImg}
              uploading={uploading === "hero"}
              onPick={(file) => upload("hero", file)}
              onRemove={() => removeImage("hero")}
            />
            <Field
              label="Descrição da foto (acessibilidade e Google)"
              value={hero.imageAlt}
              onChange={(imageAlt) => patch("hero", { imageAlt })}
            />
            <Field
              label="Etiqueta acima do título"
              value={hero.badge}
              onChange={(badge) => patch("hero", { badge })}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Título (parte preta)"
                value={hero.titleStart}
                onChange={(titleStart) => patch("hero", { titleStart })}
              />
              <Field
                label="Título (parte azul)"
                value={hero.titleHighlight}
                onChange={(titleHighlight) => patch("hero", { titleHighlight })}
              />
            </div>
            <Field
              label="Texto de apoio"
              multiline
              value={hero.subtitle}
              onChange={(subtitle) => patch("hero", { subtitle })}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Botão principal (abre Contato)"
                value={hero.primaryLabel}
                onChange={(primaryLabel) => patch("hero", { primaryLabel })}
              />
              <Field
                label="Botão secundário (abre Serviços)"
                value={hero.secondaryLabel}
                onChange={(secondaryLabel) => patch("hero", { secondaryLabel })}
              />
              <Field
                label="Selo sobre a foto — título"
                value={hero.floatingTitle}
                onChange={(floatingTitle) => patch("hero", { floatingTitle })}
              />
              <Field
                label="Selo sobre a foto — texto"
                value={hero.floatingSubtitle}
                onChange={(floatingSubtitle) => patch("hero", { floatingSubtitle })}
              />
            </div>
            <div className="space-y-2">
              <Label>Números em destaque</Label>
              <p className="text-xs text-muted-foreground">
                Use ★ no valor para mostrar a estrela (ex.: 4.9 ★). Use apenas números reais.
              </p>
              <ListEditor<Stat>
                items={hero.stats}
                onChange={(stats) => patch("hero", { stats })}
                empty={{ value: "", label: "" }}
                max={4}
                addLabel="Adicionar número"
                render={(item, update) => (
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={item.value}
                      placeholder="Valor (ex.: +15k)"
                      onChange={(e) => update({ value: e.target.value })}
                    />
                    <Input
                      value={item.label}
                      placeholder="Legenda (ex.: Sorrisos)"
                      onChange={(e) => update({ label: e.target.value })}
                    />
                  </div>
                )}
              />
            </div>
            {restoreButton("hero")}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="about" className="rounded-2xl border border-border bg-card px-5">
          <AccordionTrigger>
            {sectionHeader(
              "🏥 Sobre o Dentista do Povo",
              "Apresentação da clínica e destaques",
              "about",
              about.enabled,
            )}
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-5">
            <Field
              label="Chamada pequena"
              value={about.eyebrow}
              onChange={(eyebrow) => patch("about", { eyebrow })}
            />
            <Field
              label="Título"
              value={about.title}
              onChange={(title) => patch("about", { title })}
            />
            <Field
              label="Texto"
              multiline
              value={about.text}
              onChange={(text) => patch("about", { text })}
              hint="Deixe uma linha em branco para separar parágrafos."
            />
            <ImageField
              label="Foto da seção (opcional)"
              imageId={about.imageId}
              fallback={null}
              uploading={uploading === "about"}
              onPick={(file) => upload("about", file)}
              onRemove={() => removeImage("about")}
            />
            <Label>Destaques</Label>
            <ListEditor<Highlight>
              items={about.highlights}
              onChange={(highlights) => patch("about", { highlights })}
              empty={{ emoji: "✨", title: "", text: "" }}
              max={8}
              addLabel="Adicionar destaque"
              render={(item, update) => <HighlightFields item={item} update={update} />}
            />
            {restoreButton("about")}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="why" className="rounded-2xl border border-border bg-card px-5">
          <AccordionTrigger>
            {sectionHeader(
              "💙 Por que escolher",
              "Diferenciais da clínica em cartões",
              "why",
              why.enabled,
            )}
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-5">
            <Field
              label="Chamada pequena"
              value={why.eyebrow}
              onChange={(eyebrow) => patch("why", { eyebrow })}
            />
            <Field label="Título" value={why.title} onChange={(title) => patch("why", { title })} />
            <ListEditor<Highlight>
              items={why.items}
              onChange={(items) => patch("why", { items })}
              empty={{ emoji: "✨", title: "", text: "" }}
              max={9}
              addLabel="Adicionar diferencial"
              render={(item, update) => <HighlightFields item={item} update={update} />}
            />
            {restoreButton("why")}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="city" className="rounded-2xl border border-border bg-card px-5">
          <AccordionTrigger>
            {sectionHeader(
              "📍 Referência em Cujubim",
              "Texto sobre a cidade, endereço, telefone e horários",
              "city",
              city.enabled,
            )}
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-5">
            <Field
              label="Chamada pequena"
              value={city.eyebrow}
              onChange={(eyebrow) => patch("city", { eyebrow })}
            />
            <Field
              label="Título"
              value={city.title}
              onChange={(title) => patch("city", { title })}
            />
            <Field
              label="Texto"
              multiline
              value={city.text}
              onChange={(text) => patch("city", { text })}
            />
            <Field
              label="Endereço (usado no botão Como chegar)"
              value={city.address}
              onChange={(address) => patch("city", { address })}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Telefone / WhatsApp"
                value={city.phone}
                onChange={(phone) => patch("city", { phone })}
              />
              <Field
                label="Horários de atendimento"
                multiline
                value={city.hours}
                onChange={(hours) => patch("city", { hours })}
                placeholder={"Segunda a sexta: 8h às 18h\nSábado: 8h às 12h"}
              />
            </div>
            {restoreButton("city")}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="faq" className="rounded-2xl border border-border bg-card px-5">
          <AccordionTrigger>
            {sectionHeader(
              "❓ Perguntas frequentes",
              "Dúvidas comuns dos pacientes",
              "faq",
              faq.enabled,
            )}
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-5">
            <Field label="Título" value={faq.title} onChange={(title) => patch("faq", { title })} />
            <ListEditor<Faq>
              items={faq.items}
              onChange={(items) => patch("faq", { items })}
              empty={{ question: "", answer: "" }}
              max={15}
              addLabel="Adicionar pergunta"
              render={(item, update) => (
                <div className="space-y-2">
                  <Input
                    value={item.question}
                    placeholder="Pergunta"
                    onChange={(e) => update({ question: e.target.value })}
                  />
                  <Textarea
                    value={item.answer}
                    rows={2}
                    placeholder="Resposta"
                    onChange={(e) => update({ answer: e.target.value })}
                  />
                </div>
              )}
            />
            {restoreButton("faq")}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="cta" className="rounded-2xl border border-border bg-card px-5">
          <AccordionTrigger>
            {sectionHeader(
              "📣 Chamada final",
              "Convite para agendar no fim da página",
              "cta",
              cta.enabled,
            )}
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-5">
            <Field label="Título" value={cta.title} onChange={(title) => patch("cta", { title })} />
            <Field
              label="Texto"
              multiline
              value={cta.text}
              onChange={(text) => patch("cta", { text })}
            />
            <Field
              label="Botão (abre Contato)"
              value={cta.buttonLabel}
              onChange={(buttonLabel) => patch("cta", { buttonLabel })}
            />
            {restoreButton("cta")}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
