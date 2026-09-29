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
    key: z.literal("financeChart"),
    value: z.object({ visible: z.boolean(), size: z.enum(["pequeno", "medio", "grande"]) }),
  }),
  z.object({
    key: z.literal("treatmentView"),
    value: z.enum(["lista", "grande", "medio", "pequeno", "completo"]),
  }),
]);
export type Preference = z.infer<typeof preference>;

// Preferências da interface ficam salvas NO PROJETO (banco), uma só para a
// clínica: valem para todos os administradores, computadores e navegadores.
// Todos leem; só administradores alteram.
const OWNER = "clinic";

export const getPreferences = createServerFn({ method: "POST" }).handler(async () => {
  const { getPool } = await import("@/integrations/mysql/pool.server");
  const [rows] = await getPool().execute("SELECT key,value FROM preferences WHERE owner=?", [
    OWNER,
  ]);
  return rows.flatMap((row) => {
    // Registros antigos foram gravados como texto JSON dentro do jsonb; aceita os dois.
    let value = row["value"];
    if (typeof value === "string") {
      try {
        value = JSON.parse(value);
      } catch {
        return [];
      }
    }
    const parsed = preference.safeParse({ key: row["key"], value });
    return parsed.success ? [parsed.data] : [];
  });
});

export const setPreference = createServerFn({ method: "POST" })
  .validator((data: unknown) => preference.parse(data))
  .handler(async ({ data }) => {
    const { requestActor } = await import("@/integrations/mysql/auth.server");
    if (!(await requestActor()).admin)
      throw new Error("Apenas administradores alteram a interface.");
    const { getPool } = await import("@/integrations/mysql/pool.server");
    await getPool().execute(
      `INSERT INTO preferences (owner,key,value) VALUES (?,?,?::text::jsonb)
       ON CONFLICT (owner,key) DO UPDATE SET value=EXCLUDED.value,updated_at=CURRENT_TIMESTAMP`,
      [OWNER, data.key, JSON.stringify(data.value)],
    );
    return { error: null };
  });
