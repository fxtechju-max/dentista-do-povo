import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { db } from "@/integrations/mysql/client";

export const Route = createFileRoute("/entrar")({
  head: () => ({
    meta: [
      { title: "Área Restrita — Dentista do Povo" },
      { name: "description", content: "Acesso da equipe ao painel de atendimento." },
      { property: "og:title", content: "Área Restrita — Dentista do Povo" },
      { property: "og:description", content: "Acesso da equipe ao painel de atendimento." },
    ],
  }),
  component: Entrar,
});

function Entrar() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    db.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/admin" });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    setLoading(true);

    try {
      const { error } = await db.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else navigate({ to: "/admin" });
    } catch {
      setError("Não foi possível conectar. Tente novamente.");
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm">
        <Link
          to="/"
          className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para o site
        </Link>
        <div className="rounded-2xl border border-border bg-card p-8 shadow-xl">
          <Link to="/" className="flex items-center justify-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary font-extrabold text-primary-foreground">
              D
            </span>
            <span className="font-extrabold">Dentista do Povo</span>
          </Link>

          <h1 className="mt-6 text-center text-xl font-extrabold">
            Área Restrita
          </h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Acesso da equipe ao painel de atendimento
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha"
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
                        <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {loading ? "Aguarde..." : "Entrar"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">Precisa de acesso? Fale com o responsável pela clínica.</p>
        </div>
      </div>
    </div>
  );
}
