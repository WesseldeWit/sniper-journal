// Eén vaste status per dag, voor de lijst in Geschiedenis en de stappen op de dagkaart.

import type { Besluit } from './besluit'
import { oordeelVanDag, type DagInvoer } from './dagoordeel'
import type { Instellingen } from './instellingen'
import { regeltrouw, type Resultaat } from './resultaat'

/** De vier vaste statussen, plus neutraal voor een dag zonder trade. */
export type StatusSoort = 'goedgekeurd' | 'afgekeurd' | 'wachtend' | 'slot' | 'neutraal'

export interface DagVoorStatus extends DagInvoer {
  checkKlaarOp: string | null
  besluit: Besluit | null
  resultaat: Resultaat | null
  afgeslotenOp?: string | null
}

export type StapId = 'analyse' | 'check' | 'besluit' | 'resultaat'
export const STAPPEN: { id: StapId; naam: string }[] = [
  { id: 'analyse', naam: 'Analyse' },
  { id: 'check', naam: 'Check' },
  { id: 'besluit', naam: 'Besluit' },
  { id: 'resultaat', naam: 'Resultaat' },
]

/** De stap die nu aan de beurt is. Leeg als de dag is afgerond. */
export function huidigeStap(dag: DagVoorStatus): StapId | null {
  if (dag.afgeslotenOp && dag.besluit?.soort !== 'genomen') return null
  if (!dag.vastgelegdOp) return 'analyse'
  if (!dag.checkKlaarOp && !dag.besluit) return 'check'
  if (!dag.besluit) return 'besluit'
  if (dag.besluit.soort === 'genomen' && !dag.resultaat) return 'resultaat'
  return null
}

export function statusVanDag(dag: DagVoorStatus, i: Instellingen): { soort: StatusSoort; tekst: string } {
  if (dag.besluit?.soort === 'genomen') {
    if (!dag.resultaat) return { soort: 'wachtend', tekst: 'Resultaat invullen' }
    const goed = regeltrouw(dag.besluit.ongepland, dag.resultaat).volgensRegels
    return goed ? { soort: 'slot', tekst: 'Volgens de regels' } : { soort: 'afgekeurd', tekst: 'Regelbreuk' }
  }
  if (dag.besluit) return { soort: 'neutraal', tekst: 'Niet genomen' }
  if (dag.afgeslotenOp) {
    return dag.checkKlaarOp ? { soort: 'afgekeurd', tekst: 'Afgekeurd, geen trade' } : { soort: 'neutraal', tekst: 'Geen setup' }
  }
  if (!dag.vastgelegdOp) return { soort: 'wachtend', tekst: 'Analyse in concept' }
  if (!dag.checkKlaarOp) return { soort: 'wachtend', tekst: 'Check invullen' }
  return oordeelVanDag(dag, i).check.goedgekeurd
    ? { soort: 'goedgekeurd', tekst: 'Goedgekeurd' }
    : { soort: 'afgekeurd', tekst: 'Afgekeurd' }
}
