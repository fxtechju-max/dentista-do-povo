// Server-only. Photos are resized/re-encoded here before storage so the
// public gallery stays fast: a consistent max dimension and JPEG quality
// keep files small without visibly losing quality, and normalizes whatever
// the visitor's camera/phone produced (including EXIF rotation). The bytes
// themselves live in the "gallery" Supabase Storage bucket; the database
// only stores metadata + the storage path.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { randomUUID } from "node:crypto";

const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 88;
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

async function requireAdmin() {
  const { getRequest } = await import("@tanstack/react-start/server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const auth = getRequest().headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  const { data: userData } = await supabaseAdmin.auth.getUser(token);
  if (!userData.user) return null;
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();
  return data ? userData.user.id : null;
}

export const uploadGalleryPhoto = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (!(data instanceof FormData)) throw new Error("Envio inválido.");
    return data;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (!(await requireAdmin())) return { data: null, error: { message: "Acesso negado." } };

    const file = data.get("file");
    if (!(file instanceof File))
      return { data: null, error: { message: "Nenhum arquivo enviado." } };
    if (!file.type.startsWith("image/")) {
      return { data: null, error: { message: "Envie apenas arquivos de imagem." } };
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return { data: null, error: { message: "Imagem muito grande (máximo 15MB)." } };
    }
    const title = String(data.get("title") ?? "").trim() || null;

    const sharp = (await import("sharp")).default;
    const inputBuffer = Buffer.from(await file.arrayBuffer());
    let processed;
    try {
      processed = await sharp(inputBuffer)
        .rotate()
        .resize({
          width: MAX_DIMENSION,
          height: MAX_DIMENSION,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
        .toBuffer({ resolveWithObject: true });
    } catch {
      return { data: null, error: { message: "Não foi possível processar essa imagem." } };
    }

    const id = randomUUID();
    const storagePath = `${id}.jpg`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("gallery")
      .upload(storagePath, processed.data, { contentType: "image/jpeg", upsert: false });
    if (uploadError) return { data: null, error: { message: uploadError.message } };

    const { error } = await supabaseAdmin.from("gallery_photos").insert({
      id,
      title,
      storage_path: storagePath,
      mime_type: "image/jpeg",
      width: processed.info.width,
      height: processed.info.height,
      byte_size: processed.info.size,
    });
    if (error) {
      await supabaseAdmin.storage.from("gallery").remove([storagePath]);
      return { data: null, error: { message: error.message } };
    }
    return { data: { id }, error: null };
  });

export const deleteGalleryPhoto = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (!(await requireAdmin())) return { error: { message: "Acesso negado." } };
    const { data: photo } = await supabaseAdmin
      .from("gallery_photos")
      .select("storage_path")
      .eq("id", data.id)
      .maybeSingle();
    await supabaseAdmin.from("gallery_photos").delete().eq("id", data.id);
    if (photo) await supabaseAdmin.storage.from("gallery").remove([photo.storage_path]);
    return { error: null };
  });
