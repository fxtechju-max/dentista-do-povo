import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Newspaper, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ChatWidget } from "@/components/site/ChatWidget";
import { AdSlot } from "@/components/site/AdSlot";
import { db } from "@/integrations/mysql/client";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Blog — Dentista do Povo" },
      {
        name: "description",
        content: "Dicas de saúde bucal e novidades da clínica Dentista do Povo.",
      },
      { property: "og:title", content: "Blog — Dentista do Povo" },
      {
        property: "og:description",
        content: "Dicas de saúde bucal e novidades da clínica Dentista do Povo.",
      },
    ],
  }),
  component: Blog,
});

type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  category: string;
  published_at: string | null;
};

function Blog() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>("Todas");

  useEffect(() => {
    db.from("blog_posts")
      .select("id, title, slug, excerpt, cover_image_url, category, published_at")
      .eq("status", "publicado")
      .order("published_at", { ascending: false })
      .then(({ data }) => {
        setPosts((data ?? []) as Post[]);
        setLoading(false);
      });
  }, []);

  const categories = useMemo(
    () => ["Todas", ...Array.from(new Set(posts.map((p) => p.category)))],
    [posts],
  );
  const filteredPosts = useMemo(
    () => (categoryFilter === "Todas" ? posts : posts.filter((p) => p.category === categoryFilter)),
    [posts, categoryFilter],
  );

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-16">
        <h1 className="text-4xl font-extrabold tracking-tight">📰 Blog</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Dicas de saúde bucal, novidades da clínica e cuidados para toda a família.
        </p>

        {!loading && posts.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategoryFilter(c)}
                className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                  categoryFilter === c
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        <div className="mt-8">
          <AdSlot position="blog_list" className="min-h-[100px]" />
        </div>

        {loading ? (
          <p className="mt-10 text-sm text-muted-foreground">Carregando...</p>
        ) : posts.length === 0 ? (
          <div className="mt-10 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-16 text-center text-muted-foreground">
            <Newspaper className="h-10 w-10" />
            <p>Ainda não publicamos nenhum post. Volte em breve!</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPosts.map((post) => (
              <Link
                key={post.id}
                to="/blog/$slug"
                params={{ slug: post.slug }}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-lg"
              >
                {post.cover_image_url ? (
                  <img
                    src={post.cover_image_url}
                    alt={post.title}
                    className="h-40 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-40 w-full items-center justify-center bg-primary/10 text-primary">
                    <Newspaper className="h-10 w-10" />
                  </div>
                )}
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                      {post.category}
                    </span>
                    {post.published_at && (
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        {new Date(post.published_at).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                  <h2 className="mt-2 text-lg font-bold">{post.title}</h2>
                  {post.excerpt && (
                    <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted-foreground">
                      {post.excerpt}
                    </p>
                  )}
                  <span className="mt-4 flex items-center gap-1 text-sm font-semibold text-primary">
                    Ler mais{" "}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
      <ChatWidget />
    </div>
  );
}
