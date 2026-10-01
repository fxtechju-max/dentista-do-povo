import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Newspaper } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ChatWidget } from "@/components/site/ChatWidget";
import { AdSlot } from "@/components/site/AdSlot";
import { BlogContent } from "@/components/site/BlogContent";
import { imageUrlForWidth } from "@/lib/images";
import { db } from "@/integrations/mysql/client";

export const Route = createFileRoute("/blog_/$slug")({
  head: () => ({
    meta: [{ title: "Blog — Dentista do Povo" }],
  }),
  component: BlogPost,
});

type Post = {
  id: string;
  title: string;
  content: string;
  cover_image_url: string | null;
  category: string;
  published_at: string | null;
};

function BlogPost() {
  const { slug } = Route.useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    db.from("blog_posts")
      .select("id, title, content, cover_image_url, category, published_at")
      .eq("slug", slug)
      .eq("status", "publicado")
      .lte("published_at", new Date().toISOString())
      .maybeSingle()
      .then(({ data }) => {
        setPost((data as Post) ?? null);
        setLoading(false);
      });
  }, [slug]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <Link
          to="/blog"
          className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para o blog
        </Link>

        {loading ? (
          <p className="mt-10 text-sm text-muted-foreground">Carregando...</p>
        ) : !post ? (
          <div className="mt-10 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-16 text-center text-muted-foreground">
            <Newspaper className="h-10 w-10" />
            <p>Esse post não existe ou ainda não foi publicado.</p>
          </div>
        ) : (
          <article className="mt-6">
            {post.cover_image_url && (
              <img
                src={imageUrlForWidth(post.cover_image_url, 1200)}
                alt={post.title}
                fetchPriority="high"
                decoding="async"
                width={1200}
                height={675}
                className="mb-6 aspect-video w-full rounded-2xl object-cover"
              />
            )}
            <div className="flex flex-wrap items-center gap-2">
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
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">{post.title}</h1>
            <BlogContent content={post.content} />

            <div className="mt-8 border-t border-border pt-8">
              <AdSlot position="blog_post" className="min-h-[100px]" />
            </div>
          </article>
        )}
      </main>
      <SiteFooter />
      <ChatWidget />
    </div>
  );
}
