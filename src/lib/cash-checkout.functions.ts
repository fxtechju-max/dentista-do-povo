import { createServerFn } from "@tanstack/react-start";

export const finishCashSale = createServerFn({ method: "POST" })
  .validator((data: unknown) => data)
  .handler(async ({ data }) => {
    const { currentUser, requestActor } = await import("@/integrations/mysql/auth.server");
    const user = await currentUser();
    if (!user || !(await requestActor()).admin)
      throw new Error("Apenas administradores usam o caixa.");
    const { getPool } = await import("@/integrations/mysql/pool.server");
    const { checkoutCash, checkoutSchema } = await import("./cash-checkout.server");
    return checkoutCash(getPool(), checkoutSchema.parse(data), user.id);
  });
