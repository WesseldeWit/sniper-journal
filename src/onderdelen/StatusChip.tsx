import type { StatusSoort } from '../regels/dagstatus'
import Icoon, { type IcoonNaam } from './Icoon'

type Soort = StatusSoort | 'oranje'

const ICOON: Record<Soort, IcoonNaam> = {
  goedgekeurd: 'vink',
  afgekeurd: 'kruis',
  wachtend: 'klok',
  slot: 'slot',
  neutraal: 'min',
  oranje: 'klok',
}

/** Status met vaste kleur, icoon en woord. Nooit alleen kleur. */
export default function StatusChip({ soort, tekst }: { soort: Soort; tekst: string }) {
  return (
    <span className={`chip-status ${soort}`}>
      <Icoon naam={ICOON[soort]} maat={14} />
      {tekst}
    </span>
  )
}
