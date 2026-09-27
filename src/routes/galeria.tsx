import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Images, X } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ChatWidget } from "@/components/site/ChatWidget";
import { db, galleryPhotoUrl } from "@/integrations/mysql/client";

export const Route = createFileRoute("/galeria")({
  head: () => ({
    meta: [
      { title: "Galeria — Dentista do Povo" },
      {
        name: "description",
        content: "Conheça a estrutura da Dentista do Povo em fotos.",
      },
      { property: "og:title", content: "Galeria — Dentista do Povo" },
    ],
  }),
  component: Galeria,
});

type Photo = { id: string; title: string | null };

function Galeria() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Photo | null>(null);

  useEffect(() => {
    db.from("gallery_photos")
      .select("id, title")
      .order("sort_order")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setPhotos((data ?? []) as Photo[]);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-16">
        <h1 className="text-4xl font-extrabold tracking-tight">📷 Galeria</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Conheça um pouco da nossa estrutura e do dia a dia da clínica.
        </p>

        {loading ? (
          <p className="mt-10 text-sm text-muted-foreground">Carregando...</p>
        ) : photos.length === 0 ? (
          <div className="mt-10 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-16 text-center text-muted-foreground">
            <Images className="h-10 w-10" />
            <p>Em breve, fotos da nossa clínica.</p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((photo) => (
              <button
                key={photo.id}
                onClick={() => setOpen(photo)}
                className="group aspect-square overflow-hidden rounded-2xl border border-border bg-muted"
              >
                <img
                  src={galleryPhotoUrl(photo.id)}
                  alt={photo.title ?? "Foto da Dentista do Povo"}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </button>
            ))}
          </div>
        )}
      </main>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setOpen(null)}
        >
          <button
            onClick={() => setOpen(null)}
            aria-label="Fechar"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={galleryPhotoUrl(open.id)}
            alt={open.title ?? "Foto da Dentista do Povo"}
            className="max-h-[90vh] max-w-full rounded-lg object-contain"
          />
        </div>
      )}

      <SiteFooter />
      <ChatWidget />
    </div>
  );
}
