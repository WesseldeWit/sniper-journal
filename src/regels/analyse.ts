// De ochtendanalyse en de harde eisen uit het plan. Alleen regels, geen schermen.

import { STOP_MAX_PIPS, STOP_MIN_PIPS, type Instellingen } from './instellingen'

export type Richting = 'long' | 'short'
export type Model = 'continuation' | 'reversal1' | 'reversal2'
export type Sessie = 'londen' | 'newyork'
export type EntryType = 'lijn' | 'dieper'

export const MODEL_NAMEN: Record<Model, string> = {
  continuation: 'Trend continuation',
  reversal1: 'Trend reversal 1',
  reversal2: 'Trend reversal 2',
}

// De Aziatische sessie staat hier bewust niet tussen: die kan niet worden gekozen.
export const SESSIE_NAMEN: Record<Sessie, string> = {
  londen: 'Londen',
  newyork: 'New York',
}

export interface Analyse {
  prediction: string
  richting: Richting | null
  model: Model | null
  sessie: Sessie | null
  /** Prijs van de 0.764-fibonaccilijn. */
  fibLijn: number | null
  /** Uiterste rand van de liquidity- of supply/demand-zone achter de lijn. */
  zoneRand: number | null
  /** Entry op de lijn, of dieper in de zone na een bevestigingscandle. */
  entryType: EntryType
  entryDieper: number | null
  stop: number | null
  /** Doel voor de runner: de eerstvolgende zone aan de overkant. Optioneel. */
  runnerDoel: number | null
}

export const LEGE_ANALYSE: Analyse = {
  prediction: '',
  richting: null,
  model: null,
  sessie: null,
  fibLijn: null,
  zoneRand: null,
  entryType: 'lijn',
  entryDieper: null,
  stop: null,
  runnerDoel: null,
}

/** ok = klopt, fout = klopt niet, open = nog niet te beoordelen omdat er iets ontbreekt. */
export type EisStatus = 'ok' | 'fout' | 'open'

export interface Eis {
  id: string
  naam: string
  status: EisStatus
  uitleg: string
}

export interface Beoordeling {
  eisen: Eis[]
  /** Alleen waar als elke eis klopt. */
  geldig: boolean
  entry: number | null
  stopPips: number | null
  /** Prijzen van 1:1, 1:2 en 1:3. */
  doelen: { r1: number; r2: number; r3: number } | null
}

const rond = (n: number, decimalen: number) => Number(n.toFixed(decimalen))

export function beoordeelAnalyse(a: Analyse, heeftScreenshot: boolean, i: Instellingen): Beoordeling {
  const eisen: Eis[] = []
  const eis = (id: string, naam: string, status: EisStatus, uitleg: string) =>
    eisen.push({ id, naam, status, uitleg })

  const long = a.richting === 'long'
  const entry = a.entryType === 'lijn' ? a.fibLijn : a.entryDieper

  eis('prediction', 'Prediction', a.prediction.trim() ? 'ok' : 'open', 'Schrijf op wat je verwacht.')
  eis('richting', 'Richting', a.richting ? 'ok' : 'open', 'Kies long of short.')
  eis('sessie', 'Sessie', a.sessie ? 'ok' : 'open', 'Alleen Londen of New York.')

  // Entryzone: bij een long ligt de zone onder de lijn, bij een short erboven.
  let zoneOk = false
  if (!a.richting || a.fibLijn === null || a.zoneRand === null) {
    eis('zone', 'Entryzone', 'open', 'Vul de 0.764-lijn en de rand van de zone in.')
  } else {
    zoneOk = long ? a.zoneRand < a.fibLijn : a.zoneRand > a.fibLijn
    eis(
      'zone',
      'Entryzone',
      zoneOk ? 'ok' : 'fout',
      long ? 'Bij een long ligt de zone onder de 0.764-lijn.' : 'Bij een short ligt de zone boven de 0.764-lijn.',
    )
  }

  // Entry: op de lijn of dieper in de zone, nooit erbuiten.
  let entryOk = false
  if (!zoneOk || entry === null) {
    eis('entry', 'Entry in de zone', 'open', 'Vul de entry in.')
  } else {
    const laag = Math.min(a.fibLijn!, a.zoneRand!)
    const hoog = Math.max(a.fibLijn!, a.zoneRand!)
    entryOk = entry >= laag && entry <= hoog
    eis(
      'entry',
      'Entry in de zone',
      entryOk ? 'ok' : 'fout',
      a.entryType === 'lijn'
        ? 'Entry direct op de 0.764-lijn.'
        : 'Dieper in de zone, alleen na een bevestigingscandle. Buiten de zone is geen trade.',
    )
  }

  // Stop achter de zone.
  let stopAchterZone = false
  if (!zoneOk || a.stop === null) {
    eis('stopzone', 'Stop achter de zone', 'open', 'Vul de stop loss in.')
  } else {
    stopAchterZone = long ? a.stop < a.zoneRand! : a.stop > a.zoneRand!
    eis(
      'stopzone',
      'Stop achter de zone',
      stopAchterZone ? 'ok' : 'fout',
      long ? 'De stop ligt onder de rand van de zone.' : 'De stop ligt boven de rand van de zone.',
    )
  }

  // Stop van 25 tot 30 pips.
  let stopPips: number | null = null
  let doelen: Beoordeling['doelen'] = null
  if (!a.richting || entry === null || a.stop === null) {
    eis('stoppips', `Stop ${STOP_MIN_PIPS} tot ${STOP_MAX_PIPS} pips`, 'open', 'Vul entry en stop loss in.')
  } else {
    const afstand = long ? entry - a.stop : a.stop - entry
    stopPips = rond(afstand / i.pipGrootte, 2)
    const ok = stopPips >= STOP_MIN_PIPS && stopPips <= STOP_MAX_PIPS
    eis(
      'stoppips',
      `Stop ${STOP_MIN_PIPS} tot ${STOP_MAX_PIPS} pips`,
      ok ? 'ok' : 'fout',
      afstand <= 0
        ? 'De stop ligt aan de verkeerde kant van de entry.'
        : `De stop is nu ${stopPips.toLocaleString('nl-NL')} pips.`,
    )
    if (afstand > 0) {
      const stap = long ? afstand : -afstand
      doelen = { r1: rond(entry + stap, 4), r2: rond(entry + 2 * stap, 4), r3: rond(entry + 3 * stap, 4) }
    }
  }

  // Runnerdoel is optioneel, maar moet aan de winstkant liggen als het is ingevuld.
  if (a.runnerDoel !== null && a.richting && entry !== null) {
    const ok = long ? a.runnerDoel > entry : a.runnerDoel < entry
    eis('runner', 'Runnerdoel', ok ? 'ok' : 'fout', 'Het doel ligt aan de winstkant van de entry.')
  }

  eis('screenshot', 'Screenshot', heeftScreenshot ? 'ok' : 'open', 'Voeg een screenshot van de chart toe.')

  return { eisen, geldig: eisen.every((e) => e.status === 'ok'), entry, stopPips, doelen }
}
