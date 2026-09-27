import { createMiddleware } from "@tanstack/react-start";

export const requireAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const { requestActor } = await import("./auth.server");
  const { executeQuery } = await import("./query.server");
  const { createDataClient } = await import("./query");
  const actor = await requestActor();
  if (!actor.userId || !actor.admin) throw new Error("Acesso negado.");
  const db = createDataClient((query) => executeQuery(query, actor));
  return next({ context: { db, userId: actor.userId } });
});
