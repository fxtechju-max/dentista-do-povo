import { toast } from "sonner";
import { createDataClient } from "./query";
import { runQuery, getUser, signIn, signOut, hasRole } from "./functions";

export const db = {
  ...createDataClient(async query => {
    try {
      const result = await runQuery({ data: query });
      if (result.error && typeof window !== "undefined") toast.error(result.error.message);
      return result;
    } catch {
      const error = { message: "Não foi possível conectar ao servidor. Tente novamente." };
      if (typeof window !== "undefined") toast.error(error.message);
      return { data: null, error, count: null };
    }
  }),
  auth: {
    getUser: () => getUser(),
    signInWithPassword: (data: { email: string; password: string }) => signIn({ data }),
    signOut: () => signOut(),
  },
  rpc: (_name: "has_role", data: { _user_id: string; _role: "admin" | "user" }) => hasRole({ data }),
};
