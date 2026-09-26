import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/admin" });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError("Email ou senha incorretos.");
      } else {
        navigate({ to: "/admin" });
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) {
        setError(error.message);
      } else if (!data.session) {
        setNotice("Conta criada! Confirme seu email para entrar.");
      } else {
        navigate({ to: "/admin" });
      }
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
            {mode === "login" ? "Área Restrita" : "Criar conta da equipe"}
          </h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            {mode === "login"
              ? "Acesso ao painel de atendimento"
              : "A primeira conta criada vira administradora"}
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
            {notice && <p className="text-sm font-semibold text-emerald-600">{notice}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
            </button>
          </form>

          <button
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError(null);
              setNotice(null);
            }}
            className="mt-4 w-full text-center text-sm font-semibold text-primary hover:underline"
          >
            {mode === "login" ? "Ainda não tem conta? Criar agora" : "Já tem conta? Entrar"}
          </button>
        </div>
      </div>
    </div>
  );
}
