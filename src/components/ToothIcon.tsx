/** Ícone de dente (menu do painel, proposta). */
export function ToothIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 3c-2.5 0-4 1.5-5.5 1.5C4.5 4.5 3 6.3 3 8.8c0 1.8.8 2.7.9 4.3.2 3 1.3 8 3.3 8 1.6 0 1.7-3.8 2.2-6 .3-1.3.7-2.1 2.1-2.1s1.8.8 2.1 2.1c.5 2.2.6 6 2.2 6 2 0 3.1-5 3.3-8 .1-1.6.9-2.5.9-4.3 0-2.5-1.5-4.3-3.5-4.3C16 4.5 14.5 3 12 3Z" />
    </svg>
  );
}
