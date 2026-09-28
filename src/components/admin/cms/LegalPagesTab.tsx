import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, RotateCcw, Save } from "lucide-react";
import { db } from "@/integrations/mysql/client";
import {
  DEFAULT_LEGAL,
  LEGAL_PAGES,
  parseLegalPage,
  type LegalPage,
  type LegalPageId,
} from "@/lib/legal-pages";
import { BlogContent } from "@/components/site/BlogContent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const today = () => new Date().toLocaleDateString("en-CA");

/** CMS Site › Páginas: Política de Privacidade e Termos de Uso. */
export function LegalPagesTab() {
  const [active, setActive] = useState<LegalPageId>("privacy");
  const [pages, setPages] = useState<Record<LegalPageId, LegalPage>>(DEFAULT_LEGAL);
  const [dirty, setDirty] = useState<Record<LegalPageId, boolean>>({
    privacy: false,
    terms: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all(
      LEGAL_PAGES.map((p) =>
        db
          .from("site_content")
          .select("content")
          .eq("id", p.id)
          .maybeSingle()
          .then(({ data }) => [p.id, parseLegalPage(p.id, data?.content)] as const),
      ),
    ).then((entries) => setPages(Object.fromEntries(entries) as Record<LegalPageId, LegalPage>));
  }, []);

  const page = pages[active];
  const meta = LEGAL_PAGES.find((p) => p.id === active)!;

  function update(patch: Partial<LegalPage>) {
    setPages((all) => ({ ...all, [active]: { ...all[active], ...patch } }));
    setDirty((d) => ({ ...d, [active]: true }));
  }

  async function save() {
    setSaving(true);
    const next = { ...page, updatedAt: today() };
    const { error } = await db.from("site_content").upsert({
      id: active,
      content: JSON.stringify(next),
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (!error) {
      setPages((all) => ({ ...all, [active]: next }));
      setDirty((d) => ({ ...d, [active]: false }));
      toast.success(`${meta.label} publicada no site.`);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
          {LEGAL_PAGES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setActive(p.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                active === p.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
              {dirty[p.id] && " •"}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={meta.path} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" /> Ver no site
            </a>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              update({ title: DEFAULT_LEGAL[active].title, body: DEFAULT_LEGAL[active].body });
              toast.info("Texto padrão restaurado. Clique em Salvar para publicar.");
            }}
          >
            <RotateCcw className="h-4 w-4" /> Texto padrão
          </Button>
          <Button size="sm" onClick={save} disabled={saving || !dirty[active]}>
            <Save className="h-4 w-4" /> {saving ? "Publicando..." : "Salvar e publicar"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
          <div className="space-y-1.5">
            <Label htmlFor="legal-title">Título</Label>
            <Input
              id="legal-title"
              value={page.title}
              onChange={(e) => update({ title: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="legal-body">Texto</Label>
            <Textarea
              id="legal-body"
              rows={24}
              value={page.body}
              onChange={(e) => update({ body: e.target.value })}
              className="font-mono text-xs leading-relaxed"
            />
            <p className="text-xs text-muted-foreground">
              Linha em branco separa parágrafos · <code>## Título</code> cria um subtítulo ·{" "}
              <code>- item</code> cria uma lista. A data de atualização muda sozinha ao salvar.
            </p>
          </div>
        </div>
        <div className="max-h-[760px] overflow-y-auto rounded-2xl border border-border bg-card p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Pré-visualização
          </p>
          <h2 className="mt-2 text-2xl font-extrabold">{page.title}</h2>
          <BlogContent content={page.body} />
        </div>
      </div>
    </div>
  );
}
