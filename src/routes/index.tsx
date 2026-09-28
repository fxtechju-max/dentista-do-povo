import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Clock, MapPin, Phone, ShieldCheck, Sparkles, Star } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ChatWidget } from "@/components/site/ChatWidget";
import { AdSlot } from "@/components/site/AdSlot";
import { db } from "@/integrations/mysql/client";
import heroImg from "@/assets/clinica-hero.jpg";
import { mapsUrl, parseHomeContent, siteImageUrl, type Stat } from "@/lib/site-content";

const DESCRIPTION =
  "Dentista do Povo: clínica odontológica em Cujubim - RO. Avaliação gratuita, tratamento completo para toda a família e pagamento facilitado.";

export const Route = createFileRoute("/")({
  loader: async () => {
    const { data } = await db.from("site_content").select("content").eq("id", "home").maybeSingle();
    return parseHomeContent(data?.content);
  },
  head: () => ({
    meta: [
      { title: "Dentista do Povo — Clínica Odontológica em Cujubim - RO" },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "Dentista do Povo — Clínica Odontológica em Cujubim" },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: Index,
});

function StatValue({ stat }: { stat: Stat }) {
  const hasStar = stat.value.includes("★");
  return (
    <p className="flex items-center gap-1 text-2xl font-extrabold">
      {stat.value.replace("★", "").trim()}
      {hasStar && <Star className="h-5 w-5 fill-amber-400 text-amber-400" />}
    </p>
  );
}

function Index() {
  const content = Route.useLoaderData();
  const { hero, about, why, city, faq, cta } = content;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Destaque */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary">
            <Sparkles className="h-3.5 w-3.5" /> {hero.badge}
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
            {hero.titleStart} <span className="text-primary">{hero.titleHighlight}</span>
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted-foreground">{hero.subtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/contato"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-[1.02]"
            >
              {hero.primaryLabel} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/servicos"
              className="inline-flex items-center rounded-full border border-border bg-card px-7 py-3.5 font-bold transition-colors hover:bg-accent"
            >
              {hero.secondaryLabel}
            </Link>
          </div>
          {hero.stats.length > 0 && (
            <div className="mt-10 flex flex-wrap gap-10">
              {hero.stats.map((stat) => (
                <div key={`${stat.value}-${stat.label}`}>
                  <StatValue stat={stat} />
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="relative animate-in fade-in zoom-in-95 duration-700">
          <img
            src={hero.imageId ? siteImageUrl(hero.imageId) : heroImg}
            alt={hero.imageAlt}
            className="aspect-[4/3] w-full rounded-3xl object-cover shadow-2xl"
          />
          {(hero.floatingTitle || hero.floatingSubtitle) && (
            <div className="absolute -bottom-5 left-6 flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-xl">
              <ShieldCheck className="h-8 w-8 text-emerald-500" />
              <div>
                <p className="text-sm font-bold">{hero.floatingTitle}</p>
                <p className="text-xs text-muted-foreground">{hero.floatingSubtitle}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Sobre */}
      {about.enabled && (
        <section className="border-t border-border bg-muted/40">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-20">
            <div
              className={
                about.imageId ? "" : "md:col-span-2 md:mx-auto md:max-w-3xl md:text-center"
              }
            >
              <p className="text-xs font-bold uppercase tracking-widest text-primary">
                {about.eyebrow}
              </p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">
                {about.title}
              </h2>
              <p className="mt-4 whitespace-pre-line text-muted-foreground">{about.text}</p>
            </div>
            {about.imageId && (
              <img
                src={siteImageUrl(about.imageId)}
                alt={about.title}
                className="aspect-[4/3] w-full rounded-3xl object-cover shadow-xl"
                loading="lazy"
              />
            )}
            {about.highlights.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 md:col-span-2 lg:grid-cols-4">
                {about.highlights.map((h) => (
                  <div
                    key={h.title}
                    className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-transform hover:-translate-y-1"
                  >
                    <span className="text-3xl">{h.emoji}</span>
                    <p className="mt-2 font-bold">{h.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{h.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Por que escolher */}
      {why.enabled && why.items.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16 md:py-20">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">
              {why.eyebrow}
            </p>
            <h2 className="mx-auto mt-2 max-w-3xl text-3xl font-extrabold tracking-tight md:text-4xl">
              {why.title}
            </h2>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {why.items.map((item) => (
              <div
                key={item.title}
                className="group rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-2xl transition-transform group-hover:scale-110">
                  {item.emoji}
                </span>
                <p className="mt-4 text-lg font-bold">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Cujubim */}
      {city.enabled && (
        <section className="bg-primary text-primary-foreground">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-[1.2fr_1fr] md:py-20">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-80">
                {city.eyebrow}
              </p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">
                {city.title}
              </h2>
              <p className="mt-4 whitespace-pre-line opacity-90">{city.text}</p>
            </div>
            <div className="space-y-4 rounded-3xl bg-white/10 p-6 backdrop-blur">
              {city.address && (
                <p className="flex gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0" /> {city.address}
                </p>
              )}
              {city.phone && (
                <p className="flex gap-3">
                  <Phone className="mt-0.5 h-5 w-5 shrink-0" /> {city.phone}
                </p>
              )}
              {city.hours && (
                <p className="flex gap-3 whitespace-pre-line">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0" /> {city.hours}
                </p>
              )}
              {city.address && (
                <a
                  href={mapsUrl(city.address)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-primary transition-transform hover:scale-[1.02]"
                >
                  <MapPin className="h-4 w-4" /> Como chegar
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      <AdSlot position="home" className="mx-auto max-w-4xl px-4 pt-10" />

      {/* Perguntas frequentes */}
      {faq.enabled && faq.items.length > 0 && (
        <section className="mx-auto max-w-3xl px-4 py-16 md:py-20">
          <h2 className="text-center text-3xl font-extrabold tracking-tight md:text-4xl">
            {faq.title}
          </h2>
          <div className="mt-8 space-y-3">
            {faq.items.map((item) => (
              <details
                key={item.question}
                className="group rounded-2xl border border-border bg-card px-5 py-4 open:shadow-md"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold">
                  {item.question}
                  <span className="text-primary transition-transform group-open:rotate-45">＋</span>
                </summary>
                <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Chamada final */}
      {cta.enabled && (
        <section className="border-t border-border bg-muted/40">
          <div className="mx-auto max-w-4xl px-4 py-16 text-center">
            <h2 className="text-3xl font-extrabold tracking-tight">{cta.title}</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">{cta.text}</p>
            <Link
              to="/contato"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-[1.02]"
            >
              {cta.buttonLabel} <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              Dúvidas? Clique no chat no canto da tela — o suporte é gratuito e sem cadastro.
            </p>
          </div>
        </section>
      )}

      <SiteFooter />
      <ChatWidget />
    </div>
  );
}
