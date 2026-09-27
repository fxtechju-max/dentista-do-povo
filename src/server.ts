import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

// Gallery photos are stored as bytea in the Supabase Postgres database,
// so they're served through a plain GET here — outside the TanStack Start
// router/server-function RPC layer — so a normal <img src> just works.
const GALLERY_IMAGE_PATH = /^\/api\/gallery\/([0-9a-f-]{36})$/i;

async function serveGalleryImage(id: string): Promise<Response | null> {
  const { getPool } = await import("./integrations/supabase/pool.server");
  const [rows] = await getPool().execute<
    import("@/integrations/supabase/pool.server").RowDataPacket[]
  >("SELECT image_data, mime_type FROM gallery_photos WHERE id=?", [id]);
  const row = rows[0];
  if (!row) return null;
  return new Response(new Uint8Array(row["image_data"] as Buffer), {
    headers: {
      "content-type": String(row["mime_type"]),
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      if (request.method === "GET") {
        const match = GALLERY_IMAGE_PATH.exec(new URL(request.url).pathname);
        if (match?.[1]) {
          const imageResponse = await serveGalleryImage(match[1]);
          if (imageResponse) return imageResponse;
        }
      }
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
