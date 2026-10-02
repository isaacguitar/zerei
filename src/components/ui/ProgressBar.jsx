/**
 * ProgressBar — barra de progresso retrô segmentada.
 * Props:
 *   value      {number}  0–100
 *   color      {string}  classe Tailwind de cor (padrão: bg-electric)
 *   className  {string}  classes extras para o wrapper
 *   segmented  {boolean} se true, renderiza no estilo de blocos de pixel
 */
export default function ProgressBar({ value, color = 'bg-electric', className = '', segmented = false }) {
  if (segmented) {
    const total = 20
    const filled = Math.round((value / 100) * total)
    return (
      <div className={`flex gap-[3px] ${className}`} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-[2px] ${i < filled ? color : 'bg-slate-800/80'}`}
          />
        ))}
      </div>
    )
  }

  return (
    <div className={`h-2 overflow-hidden rounded-full bg-slate-950/70 ${className}`} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full transition-[width] duration-500 ${color}`} style={{ width: `${value}%` }} />
    </div>
  )
}

