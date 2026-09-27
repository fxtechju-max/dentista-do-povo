import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { querySchema } from "./protocol";

export const runQuery = createServerFn({ method: "POST" })
  .validator((data: unknown) => querySchema.parse(data))
  .handler(async ({ data }) => {
    const { executeQuery } = await import("./query.server");
    const { requestActor, ensureVisitor, rateLimit, digest } = await import("./auth.server");
    const { getRequest } = await import("@tanstack/react-start/server");
    try {
      const actor = await requestActor();
      if (!actor.admin && data.table === "conversations" && data.action === "insert") {
        const ip = getRequest().headers.get("x-vercel-forwarded-for") ?? "local";
        await rateLimit(`chat-create:${digest(ip)}`, 20, 3600);
        actor.visitorHash = ensureVisitor();
      }
      if (!actor.admin && data.table === "messages" && data.action === "insert") await rateLimit(`chat-send:${actor.visitorHash}`, 30, 60);
      return await executeQuery(data, actor);
    } catch (error) {
      const code = (error as { code?: string }).code;
      const message = code === "ER_ROW_IS_REFERENCED_2" ? "Este cadastro possui histórico vinculado e não pode ser excluído." :
        code ? "Não foi possível salvar ou consultar os dados. Verifique os campos e a conexão." : error instanceof Error ? error.message : "Falha ao acessar os dados.";
      return { data: null, error: { message }, count: null };
    }
  });

export const getUser = createServerFn({ method: "POST" }).handler(async () => {
  const { currentUser } = await import("./auth.server");
  return { data: { user: await currentUser() }, error: null };
});

export const signIn = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ email: z.string().email().max(254), password: z.string().min(1).max(200) }).parse(data))
  .handler(async ({ data }) => {
    const { getPool } = await import("./pool.server");
    const { rateLimit, createSession, digest } = await import("./auth.server");
    const { getRequest } = await import("@tanstack/react-start/server");
    const { compare } = await import("bcryptjs");
    const email = data.email.trim().toLowerCase();
    try {
      await rateLimit(`login-email:${email}`, 10, 900);
      await rateLimit(`login-ip:${digest(getRequest().headers.get("x-vercel-forwarded-for") ?? "local")}`, 50, 900);
      const [rows] = await getPool().execute<import("mysql2").RowDataPacket[]>("SELECT id,password_hash FROM users WHERE email=?", [email]);
      const row = rows[0];
      // Always perform a hash comparison, including unknown users.
      const valid = await compare(data.password, String(row?.["password_hash"] ?? "$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW"));
      if (!valid || !row?.["password_hash"]) return { error: { message: "Email ou senha incorretos." } };
      await createSession(String(row["id"]));
      return { error: null };
    } catch {
      return { error: { message: "Não foi possível entrar. Aguarde e tente novamente." } };
    }
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const { destroySession } = await import("./auth.server");
  await destroySession();
  return { error: null };
});

export const hasRole = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ _user_id: z.string().uuid(), _role: z.enum(["admin", "user"]) }).parse(data))
  .handler(async ({ data }) => {
    const { requestActor } = await import("./auth.server");
    const actor = await requestActor();
    return { data: actor.userId === data._user_id && (data._role === "admin" ? actor.admin : Boolean(actor.userId)), error: null, count: null };
  });
