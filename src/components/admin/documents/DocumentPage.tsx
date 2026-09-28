import { forwardRef, type CSSProperties, type ReactNode } from "react";
import type { ClinicInfo, DocumentLayout } from "@/lib/document-templates";
import { longDate } from "@/lib/document-templates";

// Folha A4 (794 × 1123 px a 96 dpi). Estilos inline — não dependem do CSS do
// painel, para a impressão, o PDF e a tela ficarem idênticos.
export const PAGE_WIDTH = 794;
export const PAGE_HEIGHT = 1123;

export const COLORS = {
  blue: "#1d4ed8",
  blueLight: "#dbeafe",
  dark: "#0f172a",
  text: "#1e293b",
  muted: "#64748b",
  white: "#ffffff",
};

const TOOTH_PATH =
  "M12 3c-2.5 0-4 1.5-5.5 1.5C4.5 4.5 3 6.3 3 8.8c0 1.8.8 2.7.9 4.3.2 3 1.3 8 3.3 8 1.6 0 1.7-3.8 2.2-6 .3-1.3.7-2.1 2.1-2.1s1.8.8 2.1 2.1c.5 2.2.6 6 2.2 6 2 0 3.1-5 3.3-8 .1-1.6.9-2.5.9-4.3 0-2.5-1.5-4.3-3.5-4.3C16 4.5 14.5 3 12 3Z";

function ToothLogo({ size, color, style }: { size: number; color: string; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style} aria-hidden="true">
      <path d={TOOTH_PATH} fill={color} />
      <path
        d="M6.5 9.5 Q12 12.5 17.5 9.5"
        stroke={COLORS.white}
        strokeWidth={1.2}
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

type Props = {
  layout: DocumentLayout;
  clinic: ClinicInfo;
  title: string;
  body: string;
  date?: Date;
};

const FONT = "'Helvetica Neue', Arial, sans-serif";

export const DocumentPage = forwardRef<HTMLDivElement, Props>(function DocumentPage(
  { layout, clinic, title, body, date = new Date() },
  ref,
) {
  const page: CSSProperties = {
    position: "relative",
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    background: COLORS.white,
    color: COLORS.text,
    fontFamily: FONT,
    overflow: "hidden",
    boxSizing: "border-box",
  };

  const signature = (
    <div style={{ marginTop: 56 }}>
      <p style={{ textAlign: "right", fontSize: 15, margin: 0 }}>
        {clinic.clinic_city}, {longDate(date)}.
      </p>
      <div style={{ marginTop: 70, textAlign: "center" }}>
        <div style={{ width: 320, margin: "0 auto", borderTop: `1.5px solid ${COLORS.dark}` }} />
        <p style={{ margin: "8px 0 0", fontSize: 15, fontWeight: 700, color: COLORS.dark }}>
          {clinic.dentist_name}
        </p>
        <p style={{ margin: "2px 0 0", fontSize: 13, color: COLORS.muted }}>
          Cirurgião-Dentista · {clinic.dentist_cro}
        </p>
      </div>
    </div>
  );

  const bodyBlock = (
    <div
      style={{
        whiteSpace: "pre-wrap",
        fontSize: 16,
        lineHeight: 1.9,
        textAlign: "justify",
        color: COLORS.text,
      }}
    >
      {body}
    </div>
  );

  const contacts: { icon: string; text: string }[] = [
    { icon: "☎", text: clinic.phone },
    ...(clinic.whatsapp_number && clinic.whatsapp_number !== clinic.phone
      ? [{ icon: "✆", text: clinic.whatsapp_number }]
      : []),
    ...(clinic.clinic_email ? [{ icon: "✉", text: clinic.clinic_email }] : []),
    { icon: "⌂", text: clinic.address },
  ].filter((c) => c.text);

  let content: ReactNode;

  if (layout === "classico") {
    content = (
      <>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 22,
            background: COLORS.blue,
          }}
        />
        <div style={{ padding: "56px 64px 0 86px", height: "100%", boxSizing: "border-box" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <ToothLogo size={78} color={COLORS.blue} />
            <div>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: COLORS.dark }}>
                {clinic.dentist_name}
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 14, color: COLORS.blue, fontWeight: 700 }}>
                Cirurgião-Dentista · {clinic.dentist_cro}
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 13, color: COLORS.muted }}>
                {clinic.clinic_name}
              </p>
            </div>
          </div>
          <div style={{ height: 2, background: COLORS.blueLight, margin: "26px 0 30px" }} />
          <h1
            style={{
              textAlign: "center",
              fontSize: 28,
              fontWeight: 700,
              margin: "0 0 30px",
              color: COLORS.dark,
              letterSpacing: 1,
            }}
          >
            {title}
          </h1>
          {bodyBlock}
          {signature}
          <div
            style={{
              position: "absolute",
              left: 86,
              right: 64,
              bottom: 36,
              borderTop: `1px solid ${COLORS.blueLight}`,
              paddingTop: 10,
              fontSize: 12,
              color: COLORS.muted,
              textAlign: "center",
            }}
          >
            {clinic.clinic_name} · {clinic.phone} · {clinic.address}
          </div>
        </div>
      </>
    );
  } else if (layout === "moderno") {
    content = (
      <>
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: 20,
            background: COLORS.dark,
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            height: 380,
            width: 20,
            background: COLORS.blue,
          }}
        />
        <div style={{ padding: "48px 84px 0 70px", height: "100%", boxSizing: "border-box" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
              <p style={{ margin: 0, fontSize: 26, fontWeight: 300, color: COLORS.dark }}>
                {clinic.dentist_name}
              </p>
              <ToothLogo size={46} color={COLORS.blue} />
            </div>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: COLORS.blue, fontWeight: 600 }}>
              Cirurgião-Dentista · {clinic.dentist_cro}
            </p>
          </div>
          <h1
            style={{
              textAlign: "center",
              fontSize: 30,
              fontWeight: 500,
              margin: "44px 0 34px",
              color: COLORS.blue,
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            {title}
          </h1>
          {bodyBlock}
          {signature}
          <div style={{ position: "absolute", left: 70, bottom: 40, fontSize: 13 }}>
            {contacts.map((c) => (
              <p
                key={c.text}
                style={{
                  margin: "5px 0",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  color: COLORS.dark,
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    width: 22,
                    height: 22,
                    borderRadius: 4,
                    background: COLORS.dark,
                    color: COLORS.white,
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                  }}
                >
                  {c.icon}
                </span>
                {c.text}
              </p>
            ))}
          </div>
        </div>
      </>
    );
  } else {
    content = (
      <>
        <ToothLogo
          size={560}
          color={COLORS.dark}
          style={{ position: "absolute", left: 117, top: 230, opacity: 0.05 }}
        />
        <svg
          width={PAGE_WIDTH}
          height={230}
          viewBox={`0 0 ${PAGE_WIDTH} 230`}
          style={{ position: "absolute", left: 0, bottom: 0 }}
          aria-hidden="true"
        >
          <path
            d={`M0 60 C 220 0, 420 150, ${PAGE_WIDTH} 70 L ${PAGE_WIDTH} 230 L 0 230 Z`}
            fill={COLORS.dark}
          />
          <path
            d={`M0 60 C 220 0, 420 150, ${PAGE_WIDTH} 70`}
            stroke={COLORS.blue}
            strokeWidth={6}
            fill="none"
          />
        </svg>
        <div
          style={{
            position: "relative",
            padding: "64px 76px 0",
            height: "100%",
            boxSizing: "border-box",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <ToothLogo size={40} color={COLORS.blue} />
              <span style={{ fontSize: 15, fontWeight: 800, color: COLORS.dark }}>
                {clinic.clinic_name}
              </span>
            </div>
            <span style={{ fontSize: 13, color: COLORS.muted }}>{clinic.dentist_cro}</span>
          </div>
          <h1
            style={{
              textAlign: "center",
              fontSize: 36,
              fontWeight: 800,
              lineHeight: 1.15,
              margin: "56px 0 8px",
              color: COLORS.dark,
            }}
          >
            {title}
          </h1>
          <div style={{ width: 150, height: 4, background: COLORS.blue, margin: "0 auto 40px" }} />
          {bodyBlock}
          {signature}
          <div
            style={{
              position: "absolute",
              left: 60,
              right: 60,
              bottom: 34,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              color: COLORS.white,
            }}
          >
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>
              {contacts.map((c) => (
                <p key={c.text} style={{ margin: 0 }}>
                  {c.icon} {c.text}
                </p>
              ))}
            </div>
            <div style={{ textAlign: "right" }}>
              <p
                style={{
                  margin: 0,
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontStyle: "italic",
                  fontSize: 20,
                  color: COLORS.white,
                }}
              >
                {clinic.dentist_name}
              </p>
              <p style={{ margin: 0, fontSize: 12, color: "#93c5fd" }}>Cirurgião-Dentista</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div ref={ref} style={page}>
      {content}
    </div>
  );
});
