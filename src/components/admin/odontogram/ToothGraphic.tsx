import { useId } from "react";
import type { ToothType } from "@/lib/odontogram";
import { situationOf, type Situation, type Surface } from "@/lib/odontogram-pro";

// Desenho no sentido do arco superior (raiz em cima, coroa embaixo, borda
// oclusal/incisal em y≈88). O arco inferior é o mesmo desenho espelhado.
const CROWN: Record<ToothType, string> = {
  incisor: "M12 52 C10 62 9 74 11 84 Q20 90 29 84 C31 74 30 62 28 52 Z",
  canine: "M11 52 C9 64 10 76 14 84 L20 89 L26 84 C30 76 31 64 29 52 Z",
  premolar: "M9 52 C6 62 6 76 9 84 Q14 89 20 86 Q26 89 31 84 C34 76 34 62 31 52 Z",
  molar: "M5 50 C2 60 2 76 5 84 Q10 89 15 86 Q20 89 25 86 Q30 89 35 84 C38 76 38 60 35 50 Z",
};
const ROOTS: Record<ToothType, string[]> = {
  incisor: ["M13 54 C13 38 15 18 20 4 C25 18 27 38 27 54 Z"],
  canine: ["M13 54 C13 36 15 12 20 1 C25 12 27 36 27 54 Z"],
  premolar: ["M12 54 C12 38 15 18 20 6 C25 18 28 38 28 54 Z"],
  molar: [
    "M7 52 C6 38 7 22 11 8 C14 20 16 36 18 52 Z",
    "M22 52 C24 36 26 20 29 8 C33 22 34 38 33 52 Z",
  ],
};
// Região da borda oclusal/incisal, onde ficam restauração, selante e cárie.
const OCCLUSAL: Record<ToothType, string> = {
  incisor: "M12 78 Q20 82 28 78 L29 84 Q20 90 11 84 Z",
  canine: "M12 76 Q20 80 28 76 L26 84 L20 89 L14 84 Z",
  premolar: "M8 76 Q20 81 32 76 L31 84 Q26 89 20 86 Q14 89 9 84 Z",
  molar: "M4 75 Q20 81 36 75 L35 84 Q30 89 25 86 Q20 89 15 86 Q10 89 5 84 Z",
};

export function ToothGraphic({
  type,
  lower,
  situation,
  className,
}: {
  type: ToothType;
  lower: boolean;
  situation: Situation | null;
  className?: string;
}) {
  const gradientId = useId();
  const s = situation;
  const color = s ? situationOf(s).color : null;
  const faded = s === "ausente" || s === "extraido";
  const crownFill = s === "coroa" ? "#facc15" : s === "protese" ? "#f9a8d4" : `url(#${gradientId})`;

  return (
    <svg viewBox="0 0 40 90" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e7e5e4" />
        </linearGradient>
      </defs>
      <g
        transform={lower ? "translate(0 90) scale(1 -1)" : undefined}
        opacity={faded ? 0.35 : 1}
        strokeDasharray={s === "ausente" ? "3 2" : undefined}
      >
        {s === "implante" ? (
          <g>
            <rect x={15} y={10} width={10} height={42} rx={2} fill="#9ca3af" stroke="#4b5563" />
            {[16, 22, 28, 34, 40, 46].map((y) => (
              <line key={y} x1={13} x2={27} y1={y} y2={y + 2} stroke="#4b5563" strokeWidth={1.2} />
            ))}
          </g>
        ) : (
          ROOTS[type].map((d) => (
            <path key={d} d={d} fill="#f5f0e6" stroke="#a8a29e" strokeWidth={0.8} />
          ))
        )}
        <path d={CROWN[type]} fill={crownFill} stroke="#a8a29e" strokeWidth={0.8} />
        {(s === "restauracao" || s === "selante" || s === "carie") && (
          <path d={OCCLUSAL[type]} fill={color!} opacity={s === "carie" ? 0.9 : 0.85} />
        )}
        {s === "carie" && <circle cx={20} cy={70} r={4} fill="#b91c1c" opacity={0.85} />}
        {s === "canal" && (
          <g>
            <path d="M20 6 L20 60" stroke="#dc2626" strokeWidth={2.2} strokeLinecap="round" />
            <ellipse cx={20} cy={64} rx={5} ry={5} fill="#dc2626" opacity={0.85} />
          </g>
        )}
        {s === "fratura" && (
          <path
            d="M8 62 L16 70 L12 74 L22 80 L18 84"
            stroke="#7e22ce"
            strokeWidth={2}
            fill="none"
            strokeLinejoin="round"
          />
        )}
        {s === "outros" && <circle cx={20} cy={70} r={4} fill={color!} />}
      </g>
      {(s === "extraido" || s === "extracao_indicada") && (
        <g stroke={s === "extraido" ? "#6b7280" : "#f97316"} strokeWidth={3} strokeLinecap="round">
          <line x1={6} y1={10} x2={34} y2={80} />
          <line x1={34} y1={10} x2={6} y2={80} />
        </g>
      )}
    </svg>
  );
}

/**
 * Diagrama das 5 faces (visto de cima). Mesial fica do lado da linha média:
 * quadrantes 1/4/5/8 (lado direito do paciente) → mesial à direita da tela.
 */
export function SurfaceDiagram({
  toothNumber,
  fills,
  selected,
  onToggle,
  className,
}: {
  toothNumber: number;
  fills: Partial<Record<Surface, string>>;
  selected?: Surface[];
  onToggle?: (surface: Surface) => void;
  className?: string;
}) {
  const quadrant = Math.floor(toothNumber / 10);
  const mesialRight = [1, 4, 5, 8].includes(quadrant);
  const lower = [3, 4, 7, 8].includes(quadrant);
  // Vestibular fica para fora da boca: em cima no arco superior, embaixo no inferior.
  const areas: { surface: Surface; points: string }[] = [
    { surface: lower ? "palatina" : "vestibular", points: "0,0 24,0 17,7 7,7" },
    { surface: lower ? "vestibular" : "palatina", points: "7,17 17,17 24,24 0,24" },
    { surface: mesialRight ? "distal" : "mesial", points: "0,0 7,7 7,17 0,24" },
    { surface: mesialRight ? "mesial" : "distal", points: "24,0 24,24 17,17 17,7" },
  ];
  const fillOf = (surface: Surface) => fills[surface] ?? "#ffffff";
  const isSelected = (surface: Surface) => selected?.includes(surface) ?? false;

  return (
    <svg viewBox="-1 -1 26 26" className={className} aria-hidden={onToggle ? undefined : true}>
      {areas.map((a) => (
        <polygon
          key={a.surface}
          points={a.points}
          fill={fillOf(a.surface)}
          stroke={isSelected(a.surface) ? "var(--primary)" : "#a8a29e"}
          strokeWidth={isSelected(a.surface) ? 1.6 : 0.7}
          className={onToggle ? "cursor-pointer hover:opacity-80" : undefined}
          onClick={onToggle ? () => onToggle(a.surface) : undefined}
        />
      ))}
      <rect
        x={7}
        y={7}
        width={10}
        height={10}
        fill={fillOf("oclusal")}
        stroke={isSelected("oclusal") ? "var(--primary)" : "#a8a29e"}
        strokeWidth={isSelected("oclusal") ? 1.6 : 0.7}
        className={onToggle ? "cursor-pointer hover:opacity-80" : undefined}
        onClick={onToggle ? () => onToggle("oclusal") : undefined}
      />
    </svg>
  );
}
