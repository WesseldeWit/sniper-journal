/** Een meter met het getal erin. */
export default function Meter({
  naam,
  waarde,
  deel,
  kleur = 'goud',
}: {
  naam: string
  waarde: string
  /** 0 tot 1. */
  deel: number
  kleur?: 'goud' | 'groen' | 'rood'
}) {
  const breedte = Math.min(100, Math.max(0, deel * 100))
  return (
    <div className={`meter ${kleur}`} role="meter" aria-label={naam} aria-valuenow={Math.round(breedte)} aria-valuemin={0} aria-valuemax={100} aria-valuetext={waarde}>
      <i style={{ width: `${breedte}%` }} />
      <span>
        {naam} <b className="getal">{waarde}</b>
      </span>
    </div>
  )
}
