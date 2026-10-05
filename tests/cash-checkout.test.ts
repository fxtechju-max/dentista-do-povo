import test from "node:test";
import assert from "node:assert/strict";
import { checkoutCash, checkoutSchema } from "../src/lib/cash-checkout.server";
import type { Pool, PoolConnection, Row } from "../src/integrations/mysql/pool.server";

const input = checkoutSchema.parse({
  requestId: "ed3e55ca-9716-4b5f-a579-0132c70a973e",
  sessionId: "session",
  patientId: "patient",
  items: [{ key: "one", name: "Limpeza", price: 100, qty: 2, note: "", budgetId: "budget" }],
  discount: { mode: "percent", value: "10" },
  surcharge: { mode: "valor", value: "5" },
  later: false,
  method: "pix",
  installments: null,
});

function database(
  options: {
    closed?: boolean;
    existing?: boolean;
    paid?: boolean;
    failLink?: boolean;
    otherPatient?: boolean;
  } = {},
) {
  const events: string[] = [];
  let paymentValues: unknown[] = [];
  const execute: PoolConnection["execute"] = async <T>(
    sql: string,
    values?: readonly unknown[],
  ) => {
    events.push(sql);
    let rows: Row[] = [];
    if (sql.startsWith("SELECT id, status FROM cash_sessions"))
      rows = [{ id: "session", status: options.closed ? "fechado" : "aberto" }];
    else if (sql.includes("cash_session_id=?"))
      rows = options.existing ? [{ id: input.requestId }] : [];
    else if (sql.includes("FROM budgets WHERE id=?"))
      rows = [
        {
          id: "budget",
          patient_id: options.otherPatient ? "other" : "patient",
          status: "aprovado",
          payment_id: "old",
        },
      ];
    else if (sql.includes("FROM payments WHERE id=? FOR UPDATE"))
      rows = [{ id: "old", status: options.paid ? "pago" : "pendente" }];
    else if (sql.includes("FROM budgets WHERE payment_id=?")) rows = [{ id: "budget" }];
    if (sql.startsWith("INSERT INTO payments")) paymentValues = [...(values ?? [])];
    if (options.failLink && sql.startsWith("UPDATE budgets")) throw new Error("Falha de gravação");
    return [rows as T];
  };
  const conn: PoolConnection = {
    execute,
    query: execute,
    async beginTransaction() {
      events.push("begin");
    },
    async commit() {
      events.push("commit");
    },
    async rollback() {
      events.push("rollback");
    },
    release() {
      events.push("release");
    },
  };
  const pool: Pool = {
    execute,
    query: execute,
    async getConnection() {
      return conn;
    },
    async end() {},
  };
  return { pool, events, payment: () => paymentValues };
}

test("venda calcula total, vincula orçamento e substitui pendência na mesma transação", async () => {
  const db = database();
  assert.deepEqual(await checkoutCash(db.pool, input), { id: input.requestId });
  assert.equal(db.payment()[2], 185);
  assert.equal(db.payment()[5], "pago");
  assert.ok(db.events.some((s) => s.startsWith("DELETE FROM payments")));
  assert.deepEqual(db.events.slice(-2), ["commit", "release"]);
});

test("falha ao vincular orçamento desfaz a venda e não remove a pendência", async () => {
  const db = database({ failLink: true });
  await assert.rejects(checkoutCash(db.pool, input), /Falha de gravação/);
  assert.deepEqual(db.events.slice(-2), ["rollback", "release"]);
  assert.ok(!db.events.some((s) => s.startsWith("DELETE FROM payments") || s === "commit"));
});

for (const [name, options, message] of [
  ["caixa fechado", { closed: true }, /fechado/],
  ["orçamento pago", { paid: true }, /já foi recebido/],
  ["outro paciente", { otherPatient: true }, /este paciente/],
] as const)
  test(`não registra venda: ${name}`, async () => {
    const db = database(options);
    await assert.rejects(checkoutCash(db.pool, input), message);
    assert.equal(db.payment().length, 0);
    assert.ok(db.events.includes("rollback"));
  });

test("repetição após falha de rede retorna o pagamento existente mesmo com caixa fechado", async () => {
  const db = database({ existing: true, closed: true });
  assert.deepEqual(await checkoutCash(db.pool, input), { id: input.requestId });
  assert.equal(db.payment().length, 0);
});

test("fica a receber não grava data de recebimento e aceita forma ainda não escolhida", async () => {
  const db = database();
  await checkoutCash(db.pool, { ...input, later: true, method: null });
  assert.equal(db.payment()[5], "pendente");
  assert.equal(db.payment()[6], null);
});

test("recusa venda vazia, quantidade inválida e recebimento sem forma", () => {
  assert.equal(checkoutSchema.safeParse({ ...input, items: [] }).success, false);
  assert.equal(
    checkoutSchema.safeParse({ ...input, items: [{ ...input.items[0], qty: -1 }] }).success,
    false,
  );
  assert.equal(checkoutSchema.safeParse({ ...input, method: null }).success, false);
});
