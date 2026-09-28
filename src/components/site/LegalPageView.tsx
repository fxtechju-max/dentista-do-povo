import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ChatWidget } from "@/components/site/ChatWidget";
import { BlogContent } from "@/components/site/BlogContent";
import type { LegalPage } from "@/lib/legal-pages";

/** Página legal pública (Política de Privacidade, Termos de Uso). */
export function LegalPageView({ page }: { page: LegalPage }) {
  const updated = new Date(`${page.updatedAt}T12:00:00`);
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 md:py-16">
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">{page.title}</h1>
        {!Number.isNaN(updated.getTime()) && (
          <p className="mt-2 text-sm text-muted-foreground">
            Última atualização: {updated.toLocaleDateString("pt-BR")}
          </p>
        )}
        <BlogContent content={page.body} />
      </main>
      <SiteFooter />
      <ChatWidget />
    </div>
  );
}
