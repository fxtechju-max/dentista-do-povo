import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Instagram, Facebook, MessageCircle } from "lucide-react";
import { db } from "@/integrations/mysql/client";

type SocialLinks = {
  instagram_url: string | null;
  facebook_url: string | null;
  whatsapp_number: string | null;
};

export function SiteFooter() {
  const [social, setSocial] = useState<SocialLinks | null>(null);

  useEffect(() => {
    db.from("clinic_settings")
      .select("instagram_url, facebook_url, whatsapp_number")
      .eq("id", "default")
      .maybeSingle()
      .then(({ data }) => setSocial(data as SocialLinks | null));
  }, []);

  const whatsappDigits = social?.whatsapp_number?.replace(/\D/g, "");
  const whatsappHref = whatsappDigits
    ? `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(
        "Olá! Vim pelo site da Dentista do Povo e gostaria de mais informações.",
      )}`
    : null;

  const hasSocial = social?.instagram_url || social?.facebook_url || whatsappHref;

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground md:flex-row">
        <p>© 2026 Dentista do Povo — Clínica Odontológica</p>

        {hasSocial && (
          <div className="flex items-center gap-3">
            {social?.instagram_url && (
              <a
                href={social.instagram_url}
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Instagram"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border transition-colors hover:border-primary hover:text-primary"
              >
                <Instagram className="h-4 w-4" />
              </a>
            )}
            {social?.facebook_url && (
              <a
                href={social.facebook_url}
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Facebook"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border transition-colors hover:border-primary hover:text-primary"
              >
                <Facebook className="h-4 w-4" />
              </a>
            )}
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer noopener"
                aria-label="WhatsApp"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border transition-colors hover:border-primary hover:text-primary"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            )}
          </div>
        )}

        <Link to="/entrar" className="font-semibold hover:text-foreground">
          Área Restrita
        </Link>
      </div>
    </footer>
  );
}
