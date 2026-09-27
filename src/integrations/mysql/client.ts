import { toast } from "sonner";
import { createDataClient } from "./query";
import {
  runQuery,
  getUser,
  signIn,
  signOut,
  hasRole,
  updateEmail,
  updatePassword,
  listAdmins,
  createAdmin,
  removeAdmin,
  getAiGatewaySettings,
  saveAiGatewaySettings,
  clearAiGatewayApiKey,
  getAuditLog,
  needsFirstAdmin,
  createFirstAdmin,
} from "./functions";

export const db = {
  ...createDataClient(async (query) => {
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
    updateEmail: (data: { password: string; newEmail: string }) => updateEmail({ data }),
    updatePassword: (data: { currentPassword: string; newPassword: string }) =>
      updatePassword({ data }),
    needsFirstAdmin: () => needsFirstAdmin(),
    createFirstAdmin: (data: { email: string; password: string }) => createFirstAdmin({ data }),
  },
  admins: {
    list: () => listAdmins(),
    create: (data: { email: string; password: string }) => createAdmin({ data }),
    remove: (data: { userId: string }) => removeAdmin({ data }),
  },
  aiGateway: {
    get: () => getAiGatewaySettings(),
    save: (data: { provider: string; baseUrl: string; model: string; apiKey: string }) =>
      saveAiGatewaySettings({ data }),
    clearKey: () => clearAiGatewayApiKey(),
  },
  auditLog: {
    list: (data?: { limit?: number }) => getAuditLog({ data: { limit: data?.limit ?? 200 } }),
  },
  rpc: (_name: "has_role", data: { _user_id: string; _role: "admin" | "user" }) =>
    hasRole({ data }),
};

// Gallery bytes live in the database (Supabase) and are served by src/server.ts.
export function galleryPhotoUrl(id: string) {
  return `/api/gallery/${id}`;
}
