import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const preference = z.discriminatedUnion("key", [
  z.object({
    key: z.literal("theme"),
    value: z.object({ mode: z.enum(["light", "dark", "system"]), color: z.string().max(30) }),
  }),
  z.object({ key: z.literal("adminZoom"), value: z.number().int().min(80).max(150) }),
  z.object({ key: z.literal("publicZoom"), value: z.number().int().min(80).max(150) }),
  z.object({
    key: z.literal("treatmentView"),
    value: z.enum(["lista", "grande", "medio", "pequeno", "completo"]),
  }),
]);
export type Preference = z.infer<typeof preference>;

async function owner() {
  const { currentUser, ensureVisitor } = await import("@/integrations/supabase/auth.server");
  const user = await currentUser();
  return user ? `user:${user.id}` : `visitor:${ensureVisitor()}`;
}

export const getPreferences = createServerFn({ method: "POST" }).handler(async () => {
  const { getPool } = await import("@/integrations/supabase/pool.server");
  const [rows] = await getPool().execute("SELECT key,value FROM preferences WHERE owner=?", [
    await owner(),
  ]);
  return rows.flatMap((row) => {
    const parsed = preference.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  });
});

export const setPreference = createServerFn({ method: "POST" })
  .validator((data: unknown) => preference.parse(data))
  .handler(async ({ data }) => {
    const { getPool } = await import("@/integrations/supabase/pool.server");
    await getPool().execute(
      `INSERT INTO preferences (owner,key,value) VALUES (?,?,?::jsonb)
       ON CONFLICT (owner,key) DO UPDATE SET value=EXCLUDED.value,updated_at=CURRENT_TIMESTAMP`,
      [await owner(), data.key, JSON.stringify(data.value)],
    );
    return { error: null };
  });
