import { forwardRef } from "react";
import { formatCurrency } from "@/lib/admin/labels";
import { itemTotal } from "@/lib/pdv";
import { moneyInWords, type NoteData } from "@/lib/note";
import { PAGE_HEIGHT, PAGE_WIDTH } from "@/lib/document-page";
import type { ClinicInfo } from "@/lib/document-templates";

const BLUE = "#1d4ed8";
const DARK = "#0f172a";
const MUTED = "#64748b";
const LINE = "#e2e8f0";
const SOFT = "#f1f5f9";

const qty = (n: number) => String(n).replace(".", ",");
const dateBR = (d: Date) => d.toLocaleDateString("pt-BR");

/**
 * Nota grande (A4) de orçamento ou recibo. Estilos inline: a mesma folha serve
 * para a tela, a impressão e o PDF.
 */
export const A4Note = forwardRef<HTMLDivElement, { note: NoteData; clinic: ClinicInfo }>(
  function A4Note({ note, clinic }, ref) {
    const isBudget = note.kind === "orcamento";
    const valid = new Date(note.date);
    valid.setDate(valid.getDate() + (note.validityDays ?? 15));
    const cell = { padding: "9px 12px", borderBottom: `1px solid ${LINE}` } as const;
    return (
      <div
        ref={ref}
        style={{
          width: PAGE_WIDTH,
          height: PAGE_HEIGHT,
          background: "#fff",
          color: DARK,
          fontFamily: "Arial, Helvetica, sans-serif",
          fontSize: 13,
          position: "relative",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ height: 10, background: BLUE }} />
        {/* Cabeçalho */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "26px 48px 18px",
            borderBottom: `2px solid ${LINE}`,
          }}
        >
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: BLUE,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                fontWeight: 800,
              }}
            >
              {clinic.clinic_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  letterSpacing: 0.3,
                  textTransform: "uppercase",
                }}
              >
                {clinic.clinic_name}
              </div>
              <div style={{ color: MUTED, marginTop: 2 }}>
                {clinic.dentist_name} · {clinic.dentist_cro}
              </div>
            </div>
          </div>
          <div style={{ textAlign: "right", color: MUTED, fontSize: 11.5, lineHeight: 1.6 }}>
            <div>{clinic.address}</div>
            <div>
              {clinic.phone}
              {clinic.whatsapp_number && clinic.whatsapp_number !== clinic.phone
                ? ` · WhatsApp ${clinic.whatsapp_number}`
                : ""}
            </div>
            {clinic.clinic_email && <div>{clinic.clinic_email}</div>}
          </div>
        </div>

        {/* Título */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            padding: "22px 48px 12px",
          }}
        >
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: BLUE, letterSpacing: 1 }}>
              {isBudget ? "ORÇAMENTO" : "RECIBO"}
            </div>
            <div style={{ color: MUTED, fontSize: 12 }}>
              {isBudget
                ? "Proposta de tratamento odontológico"
                : "Comprovante de pagamento de serviços odontológicos"}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, color: MUTED }}>Nº do documento</div>
            <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "Courier New, monospace" }}>
              {note.number}
            </div>
          </div>
        </div>

        {/* Dados */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr",
            gap: 10,
            padding: "0 48px",
          }}
        >
          {[
            ["Paciente", note.patient.name],
            ["CPF", note.patient.cpf || "—"],
            ["Telefone", note.patient.phone || "—"],
            ["Endereço", note.patient.address || "—"],
            ["Emissão", dateBR(note.date)],
            [
              isBudget ? "Válido até" : "Situação",
              isBudget ? dateBR(valid) : note.received === false ? "A receber" : "Pago",
            ],
          ].map(([label, value]) => (
            <div key={label} style={{ background: SOFT, borderRadius: 8, padding: "8px 12px" }}>
              <div
                style={{
                  fontSize: 10,
                  color: MUTED,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  fontWeight: 700,
                }}
              >
                {label}
              </div>
              <div style={{ fontWeight: 700, marginTop: 2, wordBreak: "break-word" }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Itens */}
        <div style={{ padding: "20px 48px 0" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr
                style={{
                  background: DARK,
                  color: "#fff",
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                }}
              >
                <th style={{ ...cell, textAlign: "left", width: 34, borderBottom: "none" }}>#</th>
                <th style={{ ...cell, textAlign: "left", borderBottom: "none" }}>Descrição</th>
                <th style={{ ...cell, textAlign: "center", width: 60, borderBottom: "none" }}>
                  Qtd
                </th>
                <th style={{ ...cell, textAlign: "right", width: 110, borderBottom: "none" }}>
                  Valor unit.
                </th>
                <th style={{ ...cell, textAlign: "right", width: 120, borderBottom: "none" }}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {note.items.map((i, n) => (
                <tr key={i.key} style={{ background: n % 2 ? SOFT : "#fff" }}>
                  <td style={{ ...cell, color: MUTED }}>{String(n + 1).padStart(2, "0")}</td>
                  <td style={cell}>
                    <div style={{ fontWeight: 700 }}>{i.name}</div>
                    {i.note && <div style={{ fontSize: 11.5, color: MUTED }}>{i.note}</div>}
                  </td>
                  <td style={{ ...cell, textAlign: "center" }}>{qty(i.qty)}</td>
                  <td style={{ ...cell, textAlign: "right" }}>{formatCurrency(i.price)}</td>
                  <td style={{ ...cell, textAlign: "right", fontWeight: 700 }}>
                    {formatCurrency(itemTotal(i))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totais */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
            <div style={{ width: 300 }}>
              {[
                ["Subtotal", formatCurrency(note.subtotal)],
                ...(note.discount ? [["Desconto", `− ${formatCurrency(note.discount)}`]] : []),
                ...(note.surcharge ? [["Acréscimo", `+ ${formatCurrency(note.surcharge)}`]] : []),
              ].map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "4px 12px",
                    color: MUTED,
                  }}
                >
                  <span>{k}</span>
                  <span style={{ color: DARK, fontWeight: 600 }}>{v}</span>
                </div>
              ))}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 6,
                  padding: "12px 14px",
                  background: BLUE,
                  color: "#fff",
                  borderRadius: 10,
                }}
              >
                <span style={{ fontWeight: 700, letterSpacing: 0.6 }}>TOTAL</span>
                <span style={{ fontSize: 22, fontWeight: 800 }}>{formatCurrency(note.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Texto do documento */}
        <div style={{ padding: "18px 48px 0", lineHeight: 1.6 }}>
          {isBudget ? (
            <div style={{ border: `1px solid ${LINE}`, borderRadius: 10, padding: "12px 16px" }}>
              <b>Condições:</b> orçamento válido por {note.validityDays ?? 15} dias a partir da
              emissão. Valores sujeitos a reavaliação clínica caso o tratamento mude. Formas de
              pagamento a combinar na recepção.
            </div>
          ) : (
            <div style={{ border: `1px solid ${LINE}`, borderRadius: 10, padding: "12px 16px" }}>
              {note.received === false ? "Registramos" : "Recebemos"} de <b>{note.patient.name}</b>
              {note.patient.cpf ? `, CPF ${note.patient.cpf},` : ""} a importância de{" "}
              <b>{formatCurrency(note.total)}</b> ({moneyInWords(note.total)}), referente aos
              serviços odontológicos descritos acima
              {note.method ? (
                <>
                  , pagos em <b>{note.method}</b>
                  {note.installments && note.installments > 1 ? ` (${note.installments}x)` : ""}
                </>
              ) : null}
              .{note.received === false ? " Valor pendente de pagamento." : ""}
            </div>
          )}
          {note.notes && (
            <div style={{ marginTop: 10, color: MUTED, fontSize: 12 }}>
              <b style={{ color: DARK }}>Observações:</b> {note.notes}
            </div>
          )}
        </div>

        <div style={{ flex: 1 }} />

        {/* Assinaturas */}
        <div style={{ padding: "0 48px 22px" }}>
          <div style={{ textAlign: "right", color: MUTED, marginBottom: 46 }}>
            {clinic.clinic_city},{" "}
            {note.date.toLocaleDateString("pt-BR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            .
          </div>
          <div style={{ display: "flex", gap: 48 }}>
            {[
              [clinic.dentist_name, `${clinic.dentist_cro} · ${clinic.clinic_name}`],
              [note.patient.name, isBudget ? "Paciente (de acordo)" : "Paciente"],
            ].map(([name, role]) => (
              <div key={role} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ borderTop: `1px solid ${DARK}`, paddingTop: 6, fontWeight: 700 }}>
                  {name}
                </div>
                <div style={{ color: MUTED, fontSize: 11.5 }}>{role}</div>
              </div>
            ))}
          </div>
        </div>
        <div
          style={{
            background: SOFT,
            borderTop: `1px solid ${LINE}`,
            padding: "10px 48px",
            display: "flex",
            justifyContent: "space-between",
            color: MUTED,
            fontSize: 10.5,
          }}
        >
          <span>Documento sem valor fiscal · {note.number}</span>
          <span>
            Emitido em{" "}
            {note.date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
          </span>
        </div>
      </div>
    );
  },
);
