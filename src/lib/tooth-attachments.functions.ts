// Server-only. Fotos e radiografias do odontograma: redimensionadas no
// servidor e gravadas em tooth_attachments.image_data (Supabase). Os bytes só
// saem pela rota /api/tooth-attachments/:id, que exige sessão de administrador
// (ver src/server.ts) — são dados clínicos.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { randomUUID } from "node:crypto";

const MAX_DIMENSION = 2400;
const JPEG_QUALITY = 90;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

async function isAdmin() {
  const { requestActor } = await import("@/integrations/mysql/auth.server");
  return (await requestActor()).admin;
}

export const uploadToothAttachment = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (!(data instanceof FormData)) throw new Error("Envio inválido.");
    return data;
  })
  .handler(async ({ data }) => {
    if (!(await isAdmin())) return { data: null, error: { message: "Acesso negado." } };

    const file = data.get("file");
    const patientId = String(data.get("patient_id") ?? "");
    const toothNumber = Number(data.get("tooth_number"));
    const procedureId = String(data.get("procedure_id") ?? "") || null;
    if (!(file instanceof File))
      return { data: null, error: { message: "Nenhum arquivo enviado." } };
    if (!/^image\/(jpeg|png|webp)$/.test(file.type))
      return { data: null, error: { message: "Envie uma imagem JPG, PNG ou WEBP." } };
    if (file.size > MAX_UPLOAD_BYTES)
      return { data: null, error: { message: "Imagem muito grande (máximo 10MB)." } };
    if (!patientId || !Number.isInteger(toothNumber))
      return { data: null, error: { message: "Dente inválido." } };

    const sharp = (await import("sharp")).default;
    let processed;
    try {
      processed = await sharp(Buffer.from(await file.arrayBuffer()))
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
    const { getPool } = await import("@/integrations/mysql/pool.server");
    await getPool().execute(
      "INSERT INTO tooth_attachments (id,patient_id,procedure_id,tooth_number,title,mime_type,byte_size,image_data) VALUES (?,?,?,?,?,?,?,?)",
      [
        id,
        patientId,
        procedureId,
        toothNumber,
        file.name.slice(0, 200) || null,
        "image/jpeg",
        processed.info.size,
        processed.data,
      ],
    );
    return { data: { id }, error: null };
  });

export const deleteToothAttachment = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ id: z.string().min(1).max(64) }).parse(data))
  .handler(async ({ data }) => {
    if (!(await isAdmin())) return { error: { message: "Acesso negado." } };
    const { getPool } = await import("@/integrations/mysql/pool.server");
    await getPool().execute("DELETE FROM tooth_attachments WHERE id=?", [data.id]);
    return { error: null };
  });

export function toothAttachmentUrl(id: string) {
  return `/api/tooth-attachments/${id}`;
}
