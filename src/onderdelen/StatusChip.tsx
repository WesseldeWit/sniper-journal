import type { StatusSoort } from '../regels/dagstatus'
import Icoon, { type IcoonNaam } from './Icoon'

const ICOON: Record<StatusSoort, IcoonNaam> = {
  goedgekeurd: 'vink',
  afgekeurd: 'kruis',
  wachtend: 'klok',
  slot: 'slot',
  neutraal: 'min',
}

/** Status met vaste kleur, icoon en woord. Nooit alleen kleur. */
export default function StatusChip({ soort, tekst }: { soort: StatusSoort; tekst: string }) {
  return (
    <span className={`chip-status ${soort}`}>
      <Icoon naam={ICOON[soort]} maat={14} />
      {tekst}
    </span>
  )
}
