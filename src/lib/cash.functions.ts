import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { cashDifference, cashSummary, type CashSummary } from "./cash-summary";

export type CashSession = {
  id: string;
  status: "aberto" | "fechado";
  opened_at: string;
  opened_by: string | null;
  opening_amount: number;
  opening_notes: string | null;
  closed_at: string | null;
  closed_by: string | null;
  expected_cash: number | null;
  counted_cash: number | null;
  difference: number | null;
  total_sales: number | null;
  closing_notes: string | null;
};
export type CashMovementRow = {
  id: string;
  type: "sangria" | "suprimento";
  amount: number;
  reason: string | null;
  created_by: string | null;
  created_at: string;
};
export type CashStatus = {
  open: CashSession | null;
  summary: CashSummary | null;
  movements: CashMovementRow[];
  history: CashSession[];
};

type Row = Record<string, unknown>;
const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v == null ? null : String(v));
const num = (v: unknown) => (v == null ? null : Number(v));

function toSession(r: Row): CashSession {
  return {
    id: String(r["id"]),
    status: r["status"] === "fechado" ? "fechado" : "aberto",
    opened_at: iso(r["opened_at"])!,
    opened_by: (r["opened_by"] as string | null) ?? null,
    opening_amount: Number(r["opening_amount"] ?? 0),
    opening_notes: (r["opening_notes"] as string | null) ?? null,
    closed_at: iso(r["closed_at"]),
    closed_by: (r["closed_by"] as string | null) ?? null,
    expected_cash: num(r["expected_cash"]),
    counted_cash: num(r["counted_cash"]),
    difference: num(r["difference"]),
    total_sales: num(r["total_sales"]),
    closing_notes: (r["closing_notes"] as string | null) ?? null,
  };
}

async function admin() {
  const { currentUser, requestActor } = await import("@/integrations/mysql/auth.server");
  const user = await currentUser();
  if (!user || !(await requestActor()).admin)
    throw new Error("Apenas administradores usam o caixa.");
  const { getPool } = await import("@/integrations/mysql/pool.server");
  return { user, pool: getPool() };
}

type Pool = import("@/integrations/mysql/pool.server").Executor;

async function summaryFor(pool: Pool, session: CashSession) {
  const [payments] = await pool.execute(
    "SELECT amount, status, payment_method FROM payments WHERE cash_session_id=?",
    [session.id],
  );
  const [moves] = await pool.execute(
    "SELECT id, type, amount, reason, created_by, created_at FROM cash_movements WHERE session_id=? ORDER BY created_at",
    [session.id],
  );
  const movements = (moves as Row[]).map((m) => ({
    id: String(m["id"]),
    type: m["type"] as "sangria" | "suprimento",
    amount: Number(m["amount"]),
    reason: (m["reason"] as string | null) ?? null,
    created_by: (m["created_by"] as string | null) ?? null,
    created_at: iso(m["created_at"])!,
  }));
  return {
    summary: cashSummary(
      session.opening_amount,
      (payments as Row[]).map((p) => ({
        amount: p["amount"] as string,
        status: String(p["status"]),
        payment_method: (p["payment_method"] as string | null) ?? null,
      })),
      movements,
    ),
    movements,
  };
}

/** Caixa aberto agora (com resumo) e os últimos caixas fechados. */
export const getCashStatus = createServerFn({ method: "POST" }).handler(
  async (): Promise<CashStatus> => {
    const { pool } = await admin();
    const [openRows] = await pool.execute(
      "SELECT * FROM cash_sessions WHERE status='aberto' ORDER BY opened_at DESC LIMIT 1",
    );
    const [historyRows] = await pool.execute(
      "SELECT * FROM cash_sessions WHERE status='fechado' ORDER BY closed_at DESC LIMIT 10",
    );
    const open = (openRows as Row[])[0] ? toSession((openRows as Row[])[0]!) : null;
    const extra = open ? await summaryFor(pool, open) : null;
    return {
      open,
      summary: extra?.summary ?? null,
      movements: extra?.movements ?? [],
      history: (historyRows as Row[]).map(toSession),
    };
  },
);

export const openCash = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({ amount: z.number().min(0).max(1_000_000), notes: z.string().max(500).optional() })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { user, pool: source } = await admin();
    const pool = await source.getConnection();
    try {
      await pool.beginTransaction();
      await pool.execute("SELECT pg_advisory_xact_lock(7426032)");
    const [open] = await pool.execute("SELECT id FROM cash_sessions WHERE status='aberto' LIMIT 1 FOR UPDATE");
    if ((open as Row[]).length) return { error: { message: "Já existe um caixa aberto." } };
    await pool.execute(
      "INSERT INTO cash_sessions (opening_amount, opening_notes, opened_by) VALUES (?,?,?)",
      [data.amount, data.notes?.trim() || null, user.email],
    );
    await pool.commit();
    return { error: null };
    } catch (error) {
      await pool.rollback();
      throw error;
    } finally {
      await pool.rollback();
      pool.release();
    }
  });

export const addCashMovement = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        type: z.enum(["sangria", "suprimento"]),
        amount: z.number().positive().max(1_000_000),
        reason: z.string().max(300).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { user, pool: source } = await admin();
    const pool = await source.getConnection();
    try {
      await pool.beginTransaction();
      await pool.execute("SELECT pg_advisory_xact_lock(7426032)");
    const [open] = await pool.execute("SELECT id FROM cash_sessions WHERE status='aberto' LIMIT 1 FOR UPDATE");
    const id = (open as Row[])[0]?.["id"];
    if (!id) return { error: { message: "Abra o caixa primeiro." } };
    await pool.execute(
      "INSERT INTO cash_movements (session_id, type, amount, reason, created_by) VALUES (?,?,?,?,?)",
      [String(id), data.type, data.amount, data.reason?.trim() || null, user.email],
    );
    await pool.commit();
    return { error: null };
    } catch (error) {
      await pool.rollback();
      throw error;
    } finally {
      await pool.rollback();
      pool.release();
    }
  });

export const closeCash = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        counted: z.number().min(0).max(10_000_000),
        notes: z.string().max(1000).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { user, pool: source } = await admin();
    const pool = await source.getConnection();
    try {
      await pool.beginTransaction();
      await pool.execute("SELECT pg_advisory_xact_lock(7426032)");
    const [rows] = await pool.execute(
      "SELECT * FROM cash_sessions WHERE status='aberto' ORDER BY opened_at DESC LIMIT 1 FOR UPDATE",
    );
    const row = (rows as Row[])[0];
    if (!row) return { error: { message: "Nenhum caixa aberto." }, session: null };
    const session = toSession(row);
    const { summary } = await summaryFor(pool, session);
    const difference = cashDifference(data.counted, summary.expectedCash);
    await pool.execute(
      `UPDATE cash_sessions SET status='fechado', closed_at=now(), closed_by=?, expected_cash=?,
              counted_cash=?, difference=?, total_sales=?, closing_notes=? WHERE id=?`,
      [
        user.email,
        summary.expectedCash,
        data.counted,
        difference,
        summary.received,
        data.notes?.trim() || null,
        session.id,
      ],
    );
    await pool.commit();
    return {
      error: null,
      session: {
        ...session,
        status: "fechado" as const,
        closed_at: new Date().toISOString(),
        closed_by: user.email,
        expected_cash: summary.expectedCash,
        counted_cash: data.counted,
        difference,
        total_sales: summary.received,
        closing_notes: data.notes?.trim() || null,
      },
      summary,
    };
    } catch (error) {
      await pool.rollback();
      throw error;
    } finally {
      await pool.rollback();
      pool.release();
    }
  });
