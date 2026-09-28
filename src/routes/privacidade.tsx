import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/integrations/mysql/client";
import { LegalPageView } from "@/components/site/LegalPageView";
import { parseLegalPage } from "@/lib/legal-pages";

export const Route = createFileRoute("/privacidade")({
  loader: async () => {
    const { data } = await db
      .from("site_content")
      .select("content")
      .eq("id", "privacy")
      .maybeSingle();
    return parseLegalPage("privacy", data?.content);
  },
  head: () => ({
    meta: [
      { title: "Política de Privacidade — Dentista do Povo" },
      {
        name: "description",
        content:
          "Política de Privacidade do site Dentista do Povo, clínica odontológica em Cujubim - RO.",
      },
    ],
  }),
  component: LegalPage,
});

function LegalPage() {
  return <LegalPageView page={Route.useLoaderData()} />;
}
