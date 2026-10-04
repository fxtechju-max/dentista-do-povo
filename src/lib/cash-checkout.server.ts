import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Pool, Row } from "../integrations/mysql/pool.server";
import { saleDescription, saleTotals } from "./pdv";

const adjustment = z.object({ mode: z.enum(["valor", "percent"]), value: z.string().max(30) });
export const checkoutSchema = z.object({
  requestId: z.string().uuid(),
  sessionId: z.string().min(1),
  patientId: z.string().min(1).nullable(),
  items: z.array(z.object({
    key: z.string(), name: z.string().trim().min(1).max(500),
    price: z.number().finite().nonnegative().max(1_000_000),
    qty: z.number().finite().positive().max(10000), note: z.string().max(1000),
    budgetId: z.string().min(1).optional(),
  })).min(1).max(200),
  discount: adjustment, surcharge: adjustment,
  later: z.boolean(),
  method: z.enum(["pix", "dinheiro", "cartao_credito", "cartao_debito", "boleto", "transferencia", "link_pagamento", "cheque", "crediario", "convenio", "deposito", "outros"]).nullable(),
  installments: z.number().int().min(1).max(48).nullable(),
}).refine(d => d.later || d.method !== null, "Escolha a forma de pagamento.");

/** O identificador da tentativa permite repetir após uma falha de rede sem cobrar duas vezes. */
export async function checkoutCash(pool: Pool, input: z.infer<typeof checkoutSchema>) {
  const data = checkoutSchema.parse(input);
  const totals = saleTotals(data.items, data.discount, data.surcharge);
  if (!(totals.total > 0) || totals.total > 9_999_999)
    throw new Error("Confira o valor total da venda.");
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [sessions] = await conn.execute("SELECT id, status FROM cash_sessions WHERE id=? FOR UPDATE", [data.sessionId]);
    const [existing] = await conn.execute("SELECT id FROM payments WHERE id=? AND cash_session_id=?", [data.requestId, data.sessionId]);
    if (existing.length) { await conn.commit(); return { id: data.requestId }; }
    if (sessions[0]?.["status"] !== "aberto") throw new Error("Este caixa já foi fechado. Atualize a página e abra um caixa para continuar.");
    const [settings] = await conn.execute("SELECT disabled_payment_methods FROM clinic_settings WHERE id='default'");
    const disabled = settings[0]?.["disabled_payment_methods"];
    if (data.method && Array.isArray(disabled) && disabled.includes(data.method))
      throw new Error("Esta forma de pagamento foi desativada. Escolha outra.");
    const budgets: Row[] = [];
    const pendingIds = new Set<string>();
    for (const id of [...new Set(data.items.flatMap(i => i.budgetId ? [i.budgetId] : []))].sort()) {
      const [rows] = await conn.execute("SELECT id, patient_id, status, payment_id FROM budgets WHERE id=? FOR UPDATE", [id]);
      const budget = rows[0];
      if (!budget || budget["status"] === "recusado" || budget["patient_id"] !== data.patientId)
        throw new Error("O orçamento não está disponível para este paciente. Confira o carrinho.");
      if (budget["payment_id"]) {
        const [payments] = await conn.execute("SELECT id, status FROM payments WHERE id=? FOR UPDATE", [String(budget["payment_id"])]);
        if (payments[0]?.["status"] === "pago") throw new Error("Este orçamento já foi recebido. Atualize o carrinho.");
        if (payments[0]?.["status"] === "pendente") pendingIds.add(String(budget["payment_id"]));
      }
      budgets.push(budget);
    }
    // Não substitui um lançamento que também está ligado a um orçamento fora do carrinho.
    for (const id of pendingIds) {
      const [linked] = await conn.execute("SELECT id FROM budgets WHERE payment_id=?", [id]);
      if (linked.some(b => !budgets.some(selected => selected["id"] === b["id"])))
        throw new Error("Inclua todos os orçamentos deste lançamento no carrinho para recebê-lo.");
    }
    await conn.execute(`INSERT INTO payments (id, patient_id, amount, discount, surcharge, status, paid_at, payment_method, installments, description, cash_session_id)
      VALUES (?,?,?,?,?,?,?, ?,?,?,?)`, [data.requestId, data.patientId, totals.total, totals.discount, totals.surcharge,
      data.later ? "pendente" : "pago", data.later ? null : new Date(), data.method, data.installments, saleDescription(data.items), data.sessionId]);
    for (const budget of budgets) await conn.execute("UPDATE budgets SET payment_id=?, status='aprovado' WHERE id=?", [data.requestId, String(budget["id"])]);
    for (const id of pendingIds) await conn.execute("DELETE FROM payments WHERE id=? AND status='pendente'", [id]);
    await conn.execute("INSERT INTO audit_log (id, action, table_name, record_id, record_label) VALUES (?,?,?,?,?)", [randomUUID(), "insert", "payments", data.requestId, "Venda no Caixa"]);
    await conn.commit();
    return { id: data.requestId };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally { conn.release(); }
}
