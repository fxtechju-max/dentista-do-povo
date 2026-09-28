// Exportação dos documentos: impressão, PDF (imagem fiel da folha) e DOCX
// (editável no Word). Só roda no navegador; bibliotecas carregadas sob demanda.
import type { ClinicInfo, DocumentLayout } from "./document-templates";
import { longDate } from "./document-templates";

const A4_PX = { width: 794, height: 1123 };

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Abre a folha numa janela limpa e chama a impressão (A4, sem margens). */
export function printDocument(page: HTMLElement, title: string) {
  const win = window.open("", "_blank", `width=${A4_PX.width + 40},height=900`);
  if (!win) throw new Error("O navegador bloqueou a janela de impressão. Permita pop-ups.");
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>@page{size:A4;margin:0}html,body{margin:0;padding:0;background:#fff}
*{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head>
<body>${page.outerHTML}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.close();
  }, 400);
}

export async function exportPdf(page: HTMLElement, name: string) {
  const [{ toJpeg }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
  const jpeg = await toJpeg(page, {
    quality: 0.92,
    pixelRatio: 2.5,
    width: A4_PX.width,
    height: A4_PX.height,
    backgroundColor: "#ffffff",
    // A folha usa fontes do sistema; não tenta embutir as fontes web do painel.
    skipFonts: true,
  });
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  pdf.addImage(jpeg, "JPEG", 0, 0, 210, 297);
  pdf.save(`${name}.pdf`);
}

export async function exportDocx(options: {
  layout: DocumentLayout;
  clinic: ClinicInfo;
  title: string;
  body: string;
  name: string;
}) {
  const { layout, clinic, title, body, name } = options;
  const { AlignmentType, BorderStyle, Document, Footer, Packer, Paragraph, ShadingType, TextRun } =
    await import("docx");

  const BLUE = "1D4ED8";
  const DARK = "0F172A";
  const MUTED = "64748B";
  const font = "Arial";
  const run = (text: string, extra: Record<string, unknown> = {}) =>
    new TextRun({ text, font, size: 24, color: "1E293B", ...extra });

  const header = [
    new Paragraph({
      alignment: layout === "classico" ? AlignmentType.LEFT : AlignmentType.CENTER,
      children: [run(clinic.dentist_name, { bold: true, size: 34, color: DARK })],
    }),
    new Paragraph({
      alignment: layout === "classico" ? AlignmentType.LEFT : AlignmentType.CENTER,
      children: [run(`Cirurgião-Dentista · ${clinic.dentist_cro}`, { color: BLUE, bold: true })],
    }),
    new Paragraph({
      alignment: layout === "classico" ? AlignmentType.LEFT : AlignmentType.CENTER,
      spacing: { after: 360 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: "DBEAFE", space: 8 } },
      children: [run(clinic.clinic_name, { color: MUTED, size: 22 })],
    }),
  ];

  const titleParagraph = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 480 },
    ...(layout === "elegante"
      ? { border: { bottom: { style: BorderStyle.THICK, size: 24, color: BLUE, space: 6 } } }
      : {}),
    children: [
      run(layout === "moderno" ? title.toUpperCase() : title, {
        bold: layout !== "moderno",
        size: layout === "elegante" ? 44 : 36,
        color: layout === "moderno" ? BLUE : DARK,
      }),
    ],
  });

  const bodyParagraphs = body.split("\n").map(
    (line) =>
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { line: 400 },
        children: [run(line)],
      }),
  );

  const signature = [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 720, after: 1200 },
      children: [run(`${clinic.clinic_city}, ${longDate()}.`)],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [run("_______________________________________", { color: DARK })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [run(clinic.dentist_name, { bold: true, color: DARK })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [run(`Cirurgião-Dentista · ${clinic.dentist_cro}`, { color: MUTED, size: 20 })],
    }),
  ];

  const footerText = [clinic.phone, clinic.clinic_email, clinic.address]
    .filter(Boolean)
    .join(" · ");

  const doc = new Document({
    creator: clinic.clinic_name,
    title,
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1000, bottom: 1000, left: 1200, right: 1100 },
            ...(layout === "classico"
              ? {
                  borders: {
                    pageBorderLeft: { style: BorderStyle.THICK, size: 48, color: BLUE, space: 20 },
                  },
                }
              : layout === "moderno"
                ? {
                    borders: {
                      pageBorderRight: {
                        style: BorderStyle.THICK,
                        size: 48,
                        color: DARK,
                        space: 20,
                      },
                    },
                  }
                : {}),
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                ...(layout === "elegante"
                  ? { shading: { fill: DARK, color: "auto", type: ShadingType.CLEAR } }
                  : {}),
                children: [
                  run(footerText, { size: 18, color: layout === "elegante" ? "FFFFFF" : MUTED }),
                ],
              }),
            ],
          }),
        },
        children: [...header, titleParagraph, ...bodyParagraphs, ...signature],
      },
    ],
  });

  download(await Packer.toBlob(doc), `${name}.docx`);
}
