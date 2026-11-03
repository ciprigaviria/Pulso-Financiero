/** Marca de Pulso: una línea de pulso dentro de un cuadro redondeado. */
export function BrandMark({ size = 30, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <rect width="32" height="32" rx="9" fill="var(--primary)" />
      <path d="M5 17h5l2.5-6 4 11 3-8 1.5 3H27" fill="none" stroke="var(--primary-foreground)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Solo la línea de pulso, para usar dentro de diagramas. */
export function PulseGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 13h4l2-5 3.2 9 2.4-6.5 1.2 2.5H22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
