import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Eye, EyeOff, Lock, UserRound } from "lucide-react";
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
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [firstAdmin, setFirstAdmin] = useState(false);

  useEffect(() => {
    db.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/admin" });
    });
    db.auth
      .needsFirstAdmin()
      .then(({ data, error }) => {
        setFirstAdmin(Boolean(data));
        if (error) setError("Não foi possível conectar ao banco de dados.");
      })
      .catch(() => {});
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    setLoading(true);

    try {
      const { error } = firstAdmin
        ? await db.auth.createFirstAdmin({ email, password })
        : await db.auth.signInWithPassword({ login: email.trim(), password });
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
            {firstAdmin ? "Primeiro acesso" : "Área Restrita"}
          </h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            {firstAdmin
              ? "Crie o e-mail e a senha do administrador (mínimo 12 caracteres). O nome de usuário pode ser definido depois em Configurações › Perfil."
              : "Acesso da equipe ao painel de atendimento"}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="login" className="text-sm font-semibold">
                {firstAdmin ? "E-mail" : "E-mail ou usuário"}
              </label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="login"
                  type={firstAdmin ? "email" : "text"}
                  required
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={firstAdmin ? "Email do administrador" : "Email ou nome de usuário"}
                  className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-semibold">
                Senha
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={firstAdmin ? 12 : 6}
                  autoComplete={firstAdmin ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Senha"
                  className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-10 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {loading ? "Aguarde..." : firstAdmin ? "Criar administrador" : "Entrar"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Precisa de acesso? Fale com o responsável pela clínica.
          </p>
        </div>
      </div>
    </div>
  );
}
