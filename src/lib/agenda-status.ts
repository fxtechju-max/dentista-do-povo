// Cores de cada situação de consulta (Agenda).
import type { AppointmentStatus } from "./admin/labels";

export const STATUS_STYLE: Record<AppointmentStatus, { dot: string; chip: string; ring: string }> =
  {
    agendado: {
      dot: "bg-sky-500",
      chip: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
      ring: "border-sky-500 bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
    },
    confirmado: {
      dot: "bg-emerald-500",
      chip: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
      ring: "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
    },
    concluido: {
      dot: "bg-violet-500",
      chip: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
      ring: "border-violet-500 bg-violet-50 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300",
    },
    cancelado: {
      dot: "bg-red-500",
      chip: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
      ring: "border-red-500 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
    },
  };
