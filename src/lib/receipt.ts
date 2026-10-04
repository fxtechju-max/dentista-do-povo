// Cupom NÃO FISCAL do Caixa (PDV), no formato de bobina térmica de 80 mm.
// Gera o HTML; quem imprime é printHtml (iframe escondido).
import { formatCurrency } from "./admin/labels";
import { itemTotal, type CartItem } from "./pdv";

export type ReceiptData = {
  kind: "venda" | "conferencia" | "orcamento";
  /** Orçamento: validade em dias. */
  validityDays?: number | undefined;
  number: number;
  code?: string | undefined;
  patient: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  surcharge: number;
  total: number;
  method?: string | undefined;
  installments?: number | null | undefined;
  cashReceived?: number | undefined;
  change?: number | undefined;
  received: boolean;
  operator?: string | null | undefined;
  date: Date;
};

export type ClinicHeader = { name: string; phone?: string; address?: string; document?: string };

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const qty = (n: number) => String(n).replace(".", ",");
const money = (n: number) => formatCurrency(n).replace(/\u00a0/g, " ");
const pad = (n: number) => String(n).padStart(2, "0");
// Impressora térmica não imprime emoji (ex.: "💵 Dinheiro").
const plain = (t: string) => t.replace(/\p{Extended_Pictographic}|️/gu, "").trim();

/** Código curto da venda: AAMMDD-HHMM-NN (aparece no rodapé do cupom). */
export function receiptCode(date: Date, number: number) {
  return `${String(date.getFullYear()).slice(2)}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}-${pad(number)}`;
}

export function receiptHtml(r: ReceiptData, clinic: ClinicHeader) {
  const line = '<div class="sep"></div>';
  const rows = r.items
    .map((i, n) => {
      const name = `${String(n + 1).padStart(3, "0")} ${esc(i.name)}`;
      return `<div class="item"><div class="nm">${name}</div>
        <div class="row"><span>${qty(i.qty)} x ${money(i.price)}</span><b>${money(itemTotal(i))}</b></div>
        ${i.note ? `<div class="obs">Obs.: ${esc(i.note)}</div>` : ""}</div>`;
    })
    .join("");
  const kv = (k: string, v: string, cls = "") =>
    `<div class="row ${cls}"><span>${k}</span><span>${v}</span></div>`;
  const title =
    r.kind === "conferencia"
      ? "CONFERÊNCIA DE VENDA"
      : r.kind === "orcamento"
        ? "ORÇAMENTO"
        : "CUPOM NÃO FISCAL";
  const code = r.code ?? receiptCode(r.date, r.number);
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>
    @page { size: 80mm auto; margin: 0; }
    * { box-sizing: border-box; }
    body { width: 80mm; margin: 0; padding: 4mm 4mm 8mm; font: 12px/1.35 "Courier New", ui-monospace, monospace; color: #000; }
    .c { text-align: center; } .b { font-weight: bold; }
    h1 { font-size: 15px; margin: 0; text-align: center; text-transform: uppercase; letter-spacing: .5px; }
    .muted { font-size: 11px; }
    .sep { border-top: 1px dashed #000; margin: 6px 0; }
    .title { text-align: center; font-weight: bold; font-size: 13px; letter-spacing: 1px; margin: 2px 0; }
    .row { display: flex; justify-content: space-between; gap: 8px; }
    .row span:first-child { flex: 1; }
    .item { margin: 4px 0; } .nm { word-break: break-word; } .obs { font-size: 11px; padding-left: 4ch; }
    .total { font-size: 16px; font-weight: bold; margin-top: 2px; }
    .head { font-size: 11px; font-weight: bold; display: flex; justify-content: space-between; }
    .warn { text-align: center; font-size: 11px; font-weight: bold; margin-top: 4px; }
    .code { text-align: center; letter-spacing: 2px; font-size: 11px; margin-top: 6px; }
  </style></head><body>
    <h1>${esc(clinic.name)}</h1>
    ${clinic.document ? `<div class="c muted">${esc(clinic.document)}</div>` : ""}
    ${clinic.address ? `<div class="c muted">${esc(clinic.address)}</div>` : ""}
    ${clinic.phone ? `<div class="c muted">Tel.: ${esc(clinic.phone)}</div>` : ""}
    ${line}
    <div class="title">${title}</div>
    <div class="c muted">NÃO É DOCUMENTO FISCAL</div>
    ${line}
    ${kv(r.kind === "orcamento" ? "Orçamento" : "Venda", r.code && r.kind === "orcamento" ? r.code : `Nº ${pad(r.number)}`)}
    ${kv("Data", r.date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }))}
    ${kv("Cliente", esc(r.patient))}
    ${r.operator ? kv("Atendente", esc(r.operator)) : ""}
    ${line}
    <div class="head"><span>ITEM / QTD x VL. UNIT.</span><span>TOTAL</span></div>
    ${rows}
    ${line}
    ${kv(`Subtotal (${qty(r.items.reduce((s, i) => s + i.qty, 0))} itens)`, money(r.subtotal))}
    ${r.discount ? kv("Desconto", `- ${money(r.discount)}`) : ""}
    ${r.surcharge ? kv("Acréscimo", `+ ${money(r.surcharge)}`) : ""}
    ${kv("TOTAL", money(r.total), "total")}
    ${line}
    ${
      r.kind === "venda"
        ? `${kv("Forma de pagamento", esc(plain(r.method ?? "Não informada")))}
           ${r.installments && r.installments > 1 ? kv("Parcelas", `${r.installments}x de ${money(r.total / r.installments)}`) : ""}
           ${r.cashReceived ? kv("Valor recebido", money(r.cashReceived)) : ""}
           ${r.change ? kv("Troco", money(r.change), "b") : ""}
           ${r.received ? "" : `<div class="warn">*** VALOR A RECEBER ***</div>`}`
        : r.kind === "orcamento"
          ? `<div class="c">Válido por ${r.validityDays ?? 15} dias</div><div class="warn">*** NÃO VALE COMO COMPROVANTE DE PAGAMENTO ***</div>`
          : `<div class="warn">*** NÃO VALE COMO COMPROVANTE DE PAGAMENTO ***</div>`
    }
    ${line}
    <div class="c">Obrigado pela preferência!</div>
    <div class="c muted">Volte sempre.</div>
    <div class="code">${code}</div>
  </body></html>`;
}

/** Imprime um HTML sem abrir janela (iframe escondido). */
export function printHtml(html: string) {
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(frame);
  const doc = frame.contentWindow!.document;
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    frame.contentWindow!.focus();
    frame.contentWindow!.print();
    setTimeout(() => frame.remove(), 1500);
  }, 150);
}
