// Server functions for account/admin/AI-gateway/audit-log/backup management —
// the pieces that need the service-role key and must never run in the browser.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function currentUserId(): Promise<string | null> {
  const { getRequest } = await import("@tanstack/react-start/server");
  const { supabaseAdmin } = await import("./client.server");
  const auth = getRequest().headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  const { data } = await supabaseAdmin.auth.getUser(token);
  return data.user?.id ?? null;
}

async function isAdmin(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  const { supabaseAdmin } = await import("./client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

export const updateEmail = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({ password: z.string().min(1).max(200), newEmail: z.string().email().max(254) })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("./client.server");
    const userId = await currentUserId();
    if (!userId) return { error: { message: "Sessão expirada. Entre novamente." } };
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
    const email = userData.user?.email;
    if (!email) return { error: { message: "Usuário não encontrado." } };
    const check = await supabaseAdmin.auth.signInWithPassword({ email, password: data.password });
    if (check.error) return { error: { message: "Senha atual incorreta." } };
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email: data.newEmail.trim().toLowerCase(),
      email_confirm: true,
    });
    if (error) return { error: { message: error.message } };
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
    const { supabaseAdmin } = await import("./client.server");
    const userId = await currentUserId();
    if (!userId) return { error: { message: "Sessão expirada. Entre novamente." } };
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
    const email = userData.user?.email;
    if (!email) return { error: { message: "Usuário não encontrado." } };
    const check = await supabaseAdmin.auth.signInWithPassword({
      email,
      password: data.currentPassword,
    });
    if (check.error) return { error: { message: "Senha atual incorreta." } };
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: data.newPassword,
    });
    if (error) return { error: { message: error.message } };
    return { error: null };
  });

export const listAdmins = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("./client.server");
  const userId = await currentUserId();
  if (!(await isAdmin(userId))) return { data: null, error: { message: "Acesso negado." } };
  const { data: roles } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");
  const ids = (roles ?? []).map((r) => r.user_id);
  if (!ids.length) return { data: [], error: null };
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, display_name, created_at")
    .in("id", ids);
  const results = await Promise.all(
    ids.map(async (id) => {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(id);
      const profile = profiles?.find((p) => p.id === id);
      return {
        id,
        email: u.user?.email ?? "",
        created_at: profile?.created_at ?? u.user?.created_at ?? new Date().toISOString(),
        display_name: profile?.display_name ?? null,
      };
    }),
  );
  return { data: results, error: null };
});

export const createAdmin = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({ email: z.string().email().max(254), password: z.string().min(12).max(72) })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("./client.server");
    const userId = await currentUserId();
    if (!(await isAdmin(userId))) return { error: { message: "Acesso negado." } };
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email.trim().toLowerCase(),
      password: data.password,
      email_confirm: true,
    });
    if (error || !created.user) {
      return { error: { message: error?.message ?? "Não foi possível criar o administrador." } };
    }
    await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: "admin" });
    return { error: null };
  });

export const removeAdmin = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ userId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("./client.server");
    const actorId = await currentUserId();
    if (!(await isAdmin(actorId))) return { error: { message: "Acesso negado." } };
    if (actorId === data.userId) {
      return { error: { message: "Você não pode remover seu próprio acesso." } };
    }
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) <= 1) {
      return { error: { message: "É necessário manter ao menos um administrador." } };
    }
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) return { error: { message: error.message } };
    return { error: null };
  });

export const getAiGatewaySettings = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("./client.server");
  const userId = await currentUserId();
  if (!(await isAdmin(userId))) return { data: null, error: { message: "Acesso negado." } };
  const { data } = await supabaseAdmin
    .from("clinic_settings")
    .select("ai_gateway_provider, ai_gateway_base_url, ai_gateway_model, ai_gateway_api_key")
    .eq("id", "default")
    .maybeSingle();
  const apiKey = data?.ai_gateway_api_key ?? "";
  return {
    data: {
      provider: data?.ai_gateway_provider ?? "",
      baseUrl: data?.ai_gateway_base_url ?? "",
      model: data?.ai_gateway_model ?? "",
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
    const { supabaseAdmin } = await import("./client.server");
    const userId = await currentUserId();
    if (!(await isAdmin(userId))) return { error: { message: "Acesso negado." } };
    const payload: Record<string, string | null> = {
      id: "default",
      ai_gateway_provider: data.provider.trim() || null,
      ai_gateway_base_url: data.baseUrl.trim() || null,
      ai_gateway_model: data.model.trim() || null,
    };
    if (data.apiKey.trim()) payload["ai_gateway_api_key"] = data.apiKey.trim();
    const { error } = await supabaseAdmin.from("clinic_settings").upsert(payload);
    if (error) return { error: { message: error.message } };
    return { error: null };
  });

export const clearAiGatewayApiKey = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("./client.server");
  const userId = await currentUserId();
  if (!(await isAdmin(userId))) return { error: { message: "Acesso negado." } };
  await supabaseAdmin
    .from("clinic_settings")
    .update({ ai_gateway_api_key: null })
    .eq("id", "default");
  return { error: null };
});

export const getAuditLog = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({ limit: z.number().int().min(1).max(500).default(200) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("./client.server");
    const userId = await currentUserId();
    if (!(await isAdmin(userId))) return { data: null, error: { message: "Acesso negado." } };
    const { data: rows } = await supabaseAdmin
      .from("audit_log")
      .select("id, action, table_name, record_id, record_label, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    const userIds = Array.from(
      new Set((rows ?? []).map((r) => r.user_id).filter((v): v is string => !!v)),
    );
    const names = new Map<string, string>();
    for (const id of userIds) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(id);
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("display_name")
        .eq("id", id)
        .maybeSingle();
      names.set(id, profile?.display_name || u.user?.email || "Sistema");
    }
    return {
      data: (rows ?? []).map((r) => ({
        id: r.id,
        action: r.action as "insert" | "update" | "delete",
        table_name: r.table_name,
        record_id: r.record_id,
        record_label: r.record_label,
        created_at: r.created_at,
        actor_name: r.user_id ? (names.get(r.user_id) ?? "Sistema") : "Sistema",
      })),
      error: null,
    };
  });
