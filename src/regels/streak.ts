// De streak telt dagen waarop de regels zijn gevolgd, ook dagen zonder trade.
// Er is bewust geen winst-streak.

import type { DagSleutel } from '../hulp/datum'
import { regeltrouw, type Resultaat } from './resultaat'

export interface DagVoorStreak {
  datum: DagSleutel
  analyse: { prediction: string }
  vastgelegdOp: string | null
  besluit: { soort: 'genomen' | 'niet-genomen'; ongepland: boolean } | null
  resultaat: Resultaat | null
}

export type DagScore = 'goed' | 'breuk' | 'neutraal'

/**
 * goed     = regels gevolgd: een trade volgens de regels, niet genomen, of alleen analyse.
 * breuk    = een trade die niet volgens de regels was. De streak begint opnieuw.
 * neutraal = telt niet mee en breekt niets: een lege dag, of een trade waarvan het resultaat nog ontbreekt.
 */
export function scoreVanDag(dag: DagVoorStreak): DagScore {
  if (dag.besluit?.soort === 'genomen') {
    if (!dag.resultaat) return 'neutraal'
    return regeltrouw(dag.besluit.ongepland, dag.resultaat).volgensRegels ? 'goed' : 'breuk'
  }
  if (dag.besluit?.soort === 'niet-genomen') return 'goed'
  return dag.vastgelegdOp !== null || dag.analyse.prediction.trim() !== '' ? 'goed' : 'neutraal'
}

/** Telt terug vanaf vandaag tot de laatste regelbreuk. Dagen in de toekomst tellen niet mee. */
export function berekenStreak(dagen: DagVoorStreak[], vandaag: DagSleutel): number {
  const terug = dagen.filter((d) => d.datum <= vandaag).sort((a, b) => (a.datum < b.datum ? 1 : -1))
  let streak = 0
  for (const dag of terug) {
    const score = scoreVanDag(dag)
    if (score === 'breuk') break
    if (score === 'goed') streak++
  }
  return streak
}
