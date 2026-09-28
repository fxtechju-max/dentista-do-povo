import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { querySchema } from "./protocol";

// Visitor chat is resumed from the server via the httpOnly visitor cookie —
// nothing about the conversation is kept in browser storage.
export const resumeConversation = createServerFn({ method: "POST" }).handler(async () => {
  const { getPool } = await import("./pool.server");
  const { getCookie } = await import("@tanstack/react-start/server");
  const { digest } = await import("./auth.server");
  const token = getCookie("ddp_visitor");
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return { data: null };
  const [rows] = await getPool().execute(
    "SELECT id,visitor_name FROM conversations WHERE visitor_token_hash=? ORDER BY last_message_at DESC LIMIT 1",
    [digest(token)],
  );
  const row = rows[0];
  return {
    data: row ? { id: String(row["id"]), visitor_name: String(row["visitor_name"]) } : null,
  };
});

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
      if (!actor.admin && data.table === "messages" && data.action === "insert")
        await rateLimit(`chat-send:${actor.visitorHash}`, 30, 60);
      return await executeQuery(data, actor);
    } catch (error) {
      const code = (error as { code?: string }).code;
      // O usuário vê uma mensagem simples; o erro real vai para o log do
      // servidor (Vercel › Logs) para diagnóstico.
      console.error(`[banco] ${data.action} ${data.table} falhou:`, error);
      const message =
        code === "23503"
          ? "Este cadastro possui histórico vinculado e não pode ser excluído."
          : code
            ? "Não foi possível salvar ou consultar os dados. Verifique os campos e a conexão."
            : error instanceof Error
              ? error.message
              : "Falha ao acessar os dados.";
      return { data: null, error: { message }, count: null };
    }
  });

export const getUser = createServerFn({ method: "POST" }).handler(async () => {
  const { currentUser } = await import("./auth.server");
  return { data: { user: await currentUser() }, error: null };
});

export const signIn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({ email: z.string().email().max(254), password: z.string().min(1).max(200) })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { getPool } = await import("./pool.server");
    const { rateLimit, createSession, digest } = await import("./auth.server");
    const { getRequest } = await import("@tanstack/react-start/server");
    const { compare } = await import("bcryptjs");
    const email = data.email.trim().toLowerCase();
    try {
      await rateLimit(`login-email:${email}`, 10, 900);
      await rateLimit(
        `login-ip:${digest(getRequest().headers.get("x-vercel-forwarded-for") ?? "local")}`,
        50,
        900,
      );
      const [rows] = await getPool().execute<import("@/integrations/mysql/pool.server").Row[]>(
        "SELECT id,password_hash FROM users WHERE email=?",
        [email],
      );
      const row = rows[0];
      // Always perform a hash comparison, including unknown users.
      const valid = await compare(
        data.password,
        String(
          row?.["password_hash"] ?? "$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW",
        ),
      );
      if (!valid || !row?.["password_hash"])
        return { error: { message: "Email ou senha incorretos." } };
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

export const updateEmail = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({ password: z.string().min(1).max(200), newEmail: z.string().email().max(254) })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { getPool } = await import("./pool.server");
    const { currentUser, rateLimit } = await import("./auth.server");
    const { compare } = await import("bcryptjs");
    const user = await currentUser();
    if (!user) return { error: { message: "Sessão expirada. Entre novamente." } };
    await rateLimit(`account-update:${user.id}`, 10, 900);
    const pool = getPool();
    const [rows] = await pool.execute<import("@/integrations/mysql/pool.server").Row[]>(
      "SELECT password_hash FROM users WHERE id=?",
      [user.id],
    );
    const valid = await compare(data.password, String(rows[0]?.["password_hash"] ?? ""));
    if (!valid) return { error: { message: "Senha atual incorreta." } };
    const newEmail = data.newEmail.trim().toLowerCase();
    const [existing] = await pool.execute<import("@/integrations/mysql/pool.server").Row[]>(
      "SELECT id FROM users WHERE email=? AND id<>?",
      [newEmail, user.id],
    );
    if (existing.length) return { error: { message: "Este email já está em uso." } };
    await pool.execute("UPDATE users SET email=? WHERE id=?", [newEmail, user.id]);
    return { error: null };
  });

export const updatePassword = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        currentPassword: z.string().min(1).max(200),
        newPassword: z.string().min(12).max(72),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { getPool } = await import("./pool.server");
    const { currentUser, rateLimit, destroyOtherSessions } = await import("./auth.server");
    const { compare, hash } = await import("bcryptjs");
    const user = await currentUser();
    if (!user) return { error: { message: "Sessão expirada. Entre novamente." } };
    if (Buffer.byteLength(data.newPassword) > 72)
      return { error: { message: "Senha muito longa." } };
    await rateLimit(`account-update:${user.id}`, 10, 900);
    const pool = getPool();
    const [rows] = await pool.execute<import("@/integrations/mysql/pool.server").Row[]>(
      "SELECT password_hash FROM users WHERE id=?",
      [user.id],
    );
    const valid = await compare(data.currentPassword, String(rows[0]?.["password_hash"] ?? ""));
    if (!valid) return { error: { message: "Senha atual incorreta." } };
    const passwordHash = await hash(data.newPassword, 12);
    await pool.execute("UPDATE users SET password_hash=? WHERE id=?", [passwordHash, user.id]);
    await destroyOtherSessions(user.id);
    return { error: null };
  });

export const listAdmins = createServerFn({ method: "POST" }).handler(async () => {
  const { getPool } = await import("./pool.server");
  const { requestActor } = await import("./auth.server");
  const actor = await requestActor();
  if (!actor.admin) return { data: null, error: { message: "Acesso negado." } };
  const [rows] = await getPool().execute<import("@/integrations/mysql/pool.server").Row[]>(
    "SELECT u.id, u.email, u.created_at, p.display_name FROM users u JOIN user_roles r ON r.user_id=u.id AND r.role='admin' LEFT JOIN profiles p ON p.id=u.id ORDER BY u.created_at",
  );
  return {
    data: rows.map((r) => ({
      id: String(r["id"]),
      email: String(r["email"]),
      created_at: (r["created_at"] as Date).toISOString(),
      display_name: r["display_name"] ? String(r["display_name"]) : null,
    })),
    error: null,
  };
});

export const createAdmin = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({ email: z.string().email().max(254), password: z.string().min(12).max(72) })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { getPool } = await import("./pool.server");
    const { requestActor } = await import("./auth.server");
    const { randomUUID } = await import("node:crypto");
    const { hash } = await import("bcryptjs");
    const actor = await requestActor();
    if (!actor.admin) return { error: { message: "Acesso negado." } };
    if (Buffer.byteLength(data.password) > 72) return { error: { message: "Senha muito longa." } };
    const pool = getPool();
    const email = data.email.trim().toLowerCase();
    const [existing] = await pool.execute<import("@/integrations/mysql/pool.server").Row[]>(
      "SELECT id FROM users WHERE email=?",
      [email],
    );
    if (existing.length) return { error: { message: "Este email já está cadastrado." } };
    const id = randomUUID();
    const passwordHash = await hash(data.password, 12);
    await pool.execute("INSERT INTO users (id,email,password_hash) VALUES (?,?,?)", [
      id,
      email,
      passwordHash,
    ]);
    await pool.execute("INSERT INTO user_roles (id,user_id,role) VALUES (?,?,'admin')", [
      randomUUID(),
      id,
    ]);
    return { error: null };
  });

export const removeAdmin = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ userId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { getPool } = await import("./pool.server");
    const { requestActor } = await import("./auth.server");
    const actor = await requestActor();
    if (!actor.admin) return { error: { message: "Acesso negado." } };
    if (actor.userId === data.userId)
      return { error: { message: "Você não pode remover seu próprio acesso." } };
    const pool = getPool();
    const [countRows] = await pool.execute<import("@/integrations/mysql/pool.server").Row[]>(
      "SELECT COUNT(*) AS n FROM user_roles WHERE role='admin'",
    );
    if (Number(countRows[0]?.["n"]) <= 1)
      return { error: { message: "É necessário manter ao menos um administrador." } };
    await pool.execute("DELETE FROM users WHERE id=?", [data.userId]);
    return { error: null };
  });

export const getAiGatewaySettings = createServerFn({ method: "POST" }).handler(async () => {
  const { getPool } = await import("./pool.server");
  const { requestActor } = await import("./auth.server");
  const actor = await requestActor();
  if (!actor.admin) return { data: null, error: { message: "Acesso negado." } };
  const [rows] = await getPool().execute<import("@/integrations/mysql/pool.server").Row[]>(
    "SELECT ai_gateway_provider, ai_gateway_base_url, ai_gateway_model, ai_gateway_api_key FROM clinic_settings WHERE id='default'",
  );
  const row = rows[0];
  const apiKey = row?.["ai_gateway_api_key"] ? String(row["ai_gateway_api_key"]) : "";
  return {
    data: {
      provider: row?.["ai_gateway_provider"] ? String(row["ai_gateway_provider"]) : "",
      baseUrl: row?.["ai_gateway_base_url"] ? String(row["ai_gateway_base_url"]) : "",
      model: row?.["ai_gateway_model"] ? String(row["ai_gateway_model"]) : "",
      hasApiKey: apiKey.length > 0,
      apiKeyPreview: apiKey ? `••••••••${apiKey.slice(-4)}` : "",
      envFallbackAvailable: Boolean(
        process.env["AI_GATEWAY_API_KEY"] &&
        process.env["AI_GATEWAY_BASE_URL"] &&
        process.env["AI_GATEWAY_MODEL"],
      ),
    },
    error: null,
  };
});

export const saveAiGatewaySettings = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        provider: z.string().max(100).default(""),
        baseUrl: z.string().max(500).default(""),
        model: z.string().max(200).default(""),
        apiKey: z.string().max(500).default(""),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { getPool } = await import("./pool.server");
    const { requestActor } = await import("./auth.server");
    const actor = await requestActor();
    if (!actor.admin) return { error: { message: "Acesso negado." } };
    const provider = data.provider.trim() || null;
    const baseUrl = data.baseUrl.trim() || null;
    const model = data.model.trim() || null;
    const pool = getPool();
    if (data.apiKey.trim()) {
      await pool.execute(
        `INSERT INTO clinic_settings (id, ai_gateway_provider, ai_gateway_base_url, ai_gateway_model, ai_gateway_api_key)
         VALUES ('default',?,?,?,?)
         ON CONFLICT (id) DO UPDATE SET ai_gateway_provider=EXCLUDED.ai_gateway_provider, ai_gateway_base_url=EXCLUDED.ai_gateway_base_url,
           ai_gateway_model=EXCLUDED.ai_gateway_model, ai_gateway_api_key=EXCLUDED.ai_gateway_api_key`,
        [provider, baseUrl, model, data.apiKey.trim()],
      );
    } else {
      await pool.execute(
        `INSERT INTO clinic_settings (id, ai_gateway_provider, ai_gateway_base_url, ai_gateway_model)
         VALUES ('default',?,?,?)
         ON CONFLICT (id) DO UPDATE SET ai_gateway_provider=EXCLUDED.ai_gateway_provider, ai_gateway_base_url=EXCLUDED.ai_gateway_base_url,
           ai_gateway_model=EXCLUDED.ai_gateway_model`,
        [provider, baseUrl, model],
      );
    }
    return { error: null };
  });

export const clearAiGatewayApiKey = createServerFn({ method: "POST" }).handler(async () => {
  const { getPool } = await import("./pool.server");
  const { requestActor } = await import("./auth.server");
  const actor = await requestActor();
  if (!actor.admin) return { error: { message: "Acesso negado." } };
  await getPool().execute("UPDATE clinic_settings SET ai_gateway_api_key=NULL WHERE id='default'");
  return { error: null };
});

export const getAuditLog = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({ limit: z.number().int().min(1).max(500).default(200) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { getPool } = await import("./pool.server");
    const { requestActor } = await import("./auth.server");
    const actor = await requestActor();
    if (!actor.admin) return { data: null, error: { message: "Acesso negado." } };
    const [rows] = await getPool().execute<import("@/integrations/mysql/pool.server").Row[]>(
      `SELECT a.id, a.action, a.table_name, a.record_id, a.record_label, a.created_at, u.email, p.display_name
       FROM audit_log a
       LEFT JOIN users u ON u.id = a.user_id
       LEFT JOIN profiles p ON p.id = a.user_id
       ORDER BY a.created_at DESC
       LIMIT ?`,
      [data.limit],
    );
    return {
      data: rows.map((r) => ({
        id: String(r["id"]),
        action: String(r["action"]) as "insert" | "update" | "delete",
        table_name: String(r["table_name"]),
        record_id: r["record_id"] ? String(r["record_id"]) : null,
        record_label: r["record_label"] ? String(r["record_label"]) : null,
        created_at: (r["created_at"] as Date).toISOString(),
        actor_name: r["display_name"]
          ? String(r["display_name"])
          : r["email"]
            ? String(r["email"])
            : "Sistema",
      })),
      error: null,
    };
  });

export const hasRole = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({ _user_id: z.string().uuid(), _role: z.enum(["admin", "user"]) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { requestActor } = await import("./auth.server");
    const actor = await requestActor();
    return {
      data:
        actor.userId === data._user_id &&
        (data._role === "admin" ? actor.admin : Boolean(actor.userId)),
      error: null,
      count: null,
    };
  });

// Primeiro acesso: enquanto não existir nenhum administrador, a tela /entrar
// permite criar o primeiro. Depois disso, essa opção some para sempre.
export const needsFirstAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const { getPool } = await import("./pool.server");
  try {
    const [rows] = await getPool().execute<import("@/integrations/mysql/pool.server").Row[]>(
      "SELECT 1 FROM user_roles WHERE role='admin' LIMIT 1",
    );
    return { data: rows.length === 0, error: null };
  } catch (error) {
    console.error("[banco] Falha ao conectar:", error);
    return {
      data: false,
      error: { message: error instanceof Error ? error.message : "Banco indisponível." },
    };
  }
});

export const createFirstAdmin = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({ email: z.string().email().max(254), password: z.string().min(12).max(72) })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { getPool } = await import("./pool.server");
    const { createSession, rateLimit, digest } = await import("./auth.server");
    const { getRequest } = await import("@tanstack/react-start/server");
    const { randomUUID } = await import("node:crypto");
    const { hash } = await import("bcryptjs");
    if (Buffer.byteLength(data.password) > 72) return { error: { message: "Senha muito longa." } };
    await rateLimit(
      `first-admin:${digest(getRequest().headers.get("x-vercel-forwarded-for") ?? "local")}`,
      10,
      900,
    );
    const email = data.email.trim().toLowerCase();
    const passwordHash = await hash(data.password, 12);
    const conn = await getPool().getConnection();
    let id = "";
    try {
      await conn.beginTransaction();
      await conn.execute("SELECT pg_advisory_xact_lock(7426032)");
      const [admins] = await conn.execute<import("@/integrations/mysql/pool.server").Row[]>(
        "SELECT 1 FROM user_roles WHERE role='admin' LIMIT 1",
      );
      if (admins.length) {
        await conn.rollback();
        return { error: { message: "O administrador já foi criado. Faça login." } };
      }
      const [existing] = await conn.execute<import("@/integrations/mysql/pool.server").Row[]>(
        "SELECT id FROM users WHERE email=?",
        [email],
      );
      id = existing[0] ? String(existing[0]["id"]) : randomUUID();
      if (existing[0])
        await conn.execute("UPDATE users SET password_hash=? WHERE id=?", [passwordHash, id]);
      else
        await conn.execute("INSERT INTO users (id,email,password_hash) VALUES (?,?,?)", [
          id,
          email,
          passwordHash,
        ]);
      await conn.execute(
        "INSERT INTO user_roles (id,user_id,role) VALUES (?,?,'admin') ON CONFLICT (user_id, role) DO NOTHING",
        [randomUUID(), id],
      );
      await conn.commit();
    } catch (error) {
      await conn.rollback();
      return {
        error: { message: error instanceof Error ? error.message : "Falha ao criar o acesso." },
      };
    } finally {
      conn.release();
    }
    await createSession(id);
    return { error: null };
  });
