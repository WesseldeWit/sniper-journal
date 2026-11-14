// Bewaren en ophalen van dagkaarten en hun screenshots.

import type { DagSleutel } from '../hulp/datum'
import { LEGE_ANALYSE, type Analyse } from '../regels/analyse'
import { isOpSlot, magOverschrijven, type Besluit } from '../regels/besluit'
import { werkConfluencesBij, type ConfluenceId } from '../regels/check'
import type { Resultaat } from '../regels/resultaat'
import { lees, leesMetVoorvoegsel, schrijf, verwijder } from './opslag'

export interface Dag {
  datum: DagSleutel
  analyse: Analyse
  /** Moment waarop het plan is vastgelegd. Leeg zolang de analyse een concept is. */
  vastgelegdOp: string | null
  heeftScreenshot: boolean
  /** De aangevinkte confluences. */
  confluences: ConfluenceId[]
  /** Zelf gekozen lager risico in procenten. Leeg = het maximum uit de tabel. */
  risicoProcent: number | null
  /** Moment waarop de check is afgerond. Leeg zolang de confluences nog worden aangevinkt. */
  checkKlaarOp: string | null
  /** Genomen of niet genomen. Leeg zolang er geen besluit is. */
  besluit: Besluit | null
  /** Uitkomst en nabespreking van een genomen trade. */
  resultaat: Resultaat | null
  /** Vrije notitie bij deze dag. Blijft altijd te bewerken, ook als de dag op slot zit. */
  notitie: string
}

export function legeDag(datum: DagSleutel): Dag {
  return {
    datum,
    analyse: LEGE_ANALYSE,
    vastgelegdOp: null,
    heeftScreenshot: false,
    confluences: [],
    risicoProcent: null,
    checkKlaarOp: null,
    besluit: null,
    resultaat: null,
    notitie: '',
  }
}

const dagSleutel = (datum: DagSleutel) => `dag:${datum}`
export type FotoSoort = 'analyse' | 'resultaat'
const fotoSleutel = (datum: DagSleutel, soort: FotoSoort) => `screenshot:${datum}:${soort}`

/** Alle bewaarde dagen, bijvoorbeeld om de streak te berekenen. */
export async function leesAlleDagen(): Promise<Dag[]> {
  const dagen = await leesMetVoorvoegsel<Dag>('dag:')
  return dagen.map(werkBij)
}

/** Velden die in een latere versie zijn toegevoegd of hernoemd krijgen hun juiste waarde. */
function werkBij(dag: Dag): Dag {
  return {
    ...legeDag(dag.datum),
    ...dag,
    analyse: { ...LEGE_ANALYSE, ...dag.analyse },
    confluences: werkConfluencesBij(dag.confluences ?? []),
  }
}

export async function leesDag(datum: DagSleutel): Promise<Dag | undefined> {
  const dag = await lees<Dag>(dagSleutel(datum))
  return dag && werkBij(dag)
}

/** Slaat de dag op. Weigert wijzigingen aan plan, check of besluit van een dag die op slot zit. */
export async function schrijfDag(dag: Dag): Promise<void> {
  const oud = await leesDag(dag.datum)
  if (!magOverschrijven(oud, dag)) throw new Error('Deze dag zit op slot en kan niet meer worden gewijzigd.')
  return schrijf(dagSleutel(dag.datum), dag)
}

async function controleerSlot(datum: DagSleutel): Promise<void> {
  const dag = await leesDag(datum)
  if (dag && isOpSlot(dag)) throw new Error('Deze dag zit op slot en kan niet meer worden gewijzigd.')
}

export function leesScreenshot(datum: DagSleutel, soort: FotoSoort = 'analyse'): Promise<Blob | undefined> {
  return lees<Blob>(fotoSleutel(datum, soort))
}

// De screenshot van de analyse hoort bij het plan en zit dus mee op slot.
// De screenshot achteraf hoort bij het resultaat en mag altijd.
export async function schrijfScreenshot(datum: DagSleutel, bestand: Blob, soort: FotoSoort = 'analyse'): Promise<void> {
  if (soort === 'analyse') await controleerSlot(datum)
  return schrijf(fotoSleutel(datum, soort), bestand)
}

export async function verwijderScreenshot(datum: DagSleutel, soort: FotoSoort = 'analyse'): Promise<void> {
  if (soort === 'analyse') await controleerSlot(datum)
  return verwijder(fotoSleutel(datum, soort))
}
