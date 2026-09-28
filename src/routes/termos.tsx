import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/integrations/mysql/client";
import { LegalPageView } from "@/components/site/LegalPageView";
import { parseLegalPage } from "@/lib/legal-pages";

export const Route = createFileRoute("/termos")({
  loader: async () => {
    const { data } = await db
      .from("site_content")
      .select("content")
      .eq("id", "terms")
      .maybeSingle();
    return parseLegalPage("terms", data?.content);
  },
  head: () => ({
    meta: [
      { title: "Termos de Uso — Dentista do Povo" },
      {
        name: "description",
        content: "Termos de Uso do site Dentista do Povo, clínica odontológica em Cujubim - RO.",
      },
    ],
  }),
  component: LegalPage,
});

function LegalPage() {
  return <LegalPageView page={Route.useLoaderData()} />;
}
