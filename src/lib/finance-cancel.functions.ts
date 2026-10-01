import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const cancelInput = z.object({
  id: z.string().min(1).max(64),
  reason: z.string().trim().min(5, "Escreva a justificativa (mínimo 5 letras).").max(1000),
  refund: z.number().min(0).max(10_000_000),
  password: z.string().min(1, "Digite a senha do administrador.").max(200),
});

/**
 * Cancela um lançamento do Financeiro. Só um administrador, confirmando a
 * própria senha. Guarda a justificativa, o valor devolvido, quando e quem.
 */
export const cancelPayment = createServerFn({ method: "POST" })
  .validator((data: unknown) => cancelInput.parse(data))
  .handler(async ({ data }) => {
    const { getPool } = await import("@/integrations/mysql/pool.server");
    const { currentUser, requestActor, rateLimit } =
      await import("@/integrations/mysql/auth.server");
    const { compare } = await import("bcryptjs");
    const user = await currentUser();
    if (!user || !(await requestActor()).admin)
      return { error: { message: "Apenas administradores podem cancelar lançamentos." } };
    await rateLimit(`payment-cancel:${user.id}`, 10, 900);

    const pool = getPool();
    const [users] = await pool.execute("SELECT password_hash FROM users WHERE id=?", [user.id]);
    const valid = await compare(data.password, String(users[0]?.["password_hash"] ?? ""));
    if (!valid) return { error: { message: "Senha do administrador incorreta." } };

    const [rows] = await pool.execute("SELECT amount, status FROM payments WHERE id=?", [data.id]);
    const payment = rows[0];
    if (!payment) return { error: { message: "Lançamento não encontrado." } };
    if (payment["status"] === "cancelado")
      return { error: { message: "Este lançamento já está cancelado." } };
    const refund = payment["status"] === "pago" ? data.refund : 0;
    if (refund > Number(payment["amount"]) + 0.001)
      return { error: { message: "A devolução não pode passar do valor do lançamento." } };

    await pool.execute(
      `UPDATE payments SET status='cancelado', cancel_reason=?, refund_amount=?,
              cancelled_at=now(), cancelled_by=? WHERE id=?`,
      [data.reason.trim(), refund, user.email, data.id],
    );
    await pool.execute(
      "INSERT INTO audit_log (user_id, action, table_name, record_id, record_label) VALUES (?,?,?,?,?)",
      [user.id, "update", "payments", data.id, `Cancelado: ${data.reason.trim().slice(0, 120)}`],
    );
    return { error: null };
  });
