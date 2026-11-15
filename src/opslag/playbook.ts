// Het playbook: je beste setups, om bij een nieuwe analyse naar te verwijzen.

import type { DagSleutel } from '../hulp/datum'
import type { Model } from '../regels/analyse'
import { lees, schrijf } from './opslag'

export interface PlaybookKaart {
  /** De dag van de trade. De screenshots voor en na komen van die dag. */
  datum: DagSleutel
  model: Model | null
  richting: 'long' | 'short' | null
  r: number | null
  /** Namen van de confluences die aanwezig waren. */
  confluences: string[]
  /** Jouw uitleg waarom deze setup werkte. */
  uitleg: string
  toegevoegdOp: string
}

const SLEUTEL = 'playbook'

export async function leesPlaybook(): Promise<PlaybookKaart[]> {
  return (await lees<PlaybookKaart[]>(SLEUTEL)) ?? []
}

export function schrijfPlaybook(kaarten: PlaybookKaart[]): Promise<void> {
  return schrijf(SLEUTEL, kaarten)
}
