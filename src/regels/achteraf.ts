// MARK: Trade achteraf invoeren

import type { DagSleutel } from '../hulp/datum'
import type { Besluit } from './besluit'
import type { Instellingen } from './instellingen'
import { pipWaardePerLot } from './risico'
import type { Analyse, Richting, Sessie } from './analyse'

export type Herkomst = 'call' | 'eigen' | 'analyse'

export const HERKOMST_NAMEN: Record<Herkomst, string> = {
  call: 'Call van iemand anders',
  eigen: 'Eigen idee, zonder analyse',
  analyse: 'Eigen analyse, niet in de app gezet',
}

export interface AchterafInvoer {
  richting: Richting | null
  entry: number | null
  stop: number | null
  lots: number | null
  herkomst: Herkomst | null
  toelichting: string
}

export const LEGE_ACHTERAF: AchterafInvoer = {
  richting: null,
  entry: null,
  stop: null,
  lots: null,
  herkomst: null,
  toelichting: '',
}

interface DagVoorAchteraf {
  datum: DagSleutel
  analyse: Analyse
  besluit: Besluit | null
  afgeslotenOp: string | null
}

export function foutenInAchteraf(dag: DagVoorAchteraf, x: AchterafInvoer, vandaag: DagSleutel): string[] {
  const fouten: string[] = []
  if (dag.besluit) fouten.push('Er is voor deze dag al een besluit.')
  if (dag.afgeslotenOp) fouten.push('Deze dag is al afgesloten.')
  if (dag.datum > vandaag) fouten.push('Deze dag ligt in de toekomst.')
  if (!x.richting) fouten.push('Kies long of short.')
  if (x.entry === null || !(x.entry > 0)) fouten.push('Vul de entry in.')
  if (x.stop === null || !(x.stop > 0)) fouten.push('Vul de stop loss in.')
  if (x.richting && x.entry !== null && x.stop !== null) {
    const goed = x.richting === 'long' ? x.stop < x.entry : x.stop > x.entry
    if (!goed) fouten.push('De stop ligt aan de verkeerde kant van de entry.')
  }
  if (x.lots === null || !(x.lots > 0)) fouten.push('Vul de lotsize in.')
  if (!x.herkomst) fouten.push('Kies waar de trade vandaan kwam.')
  return fouten
}

/** Wat de trade riskeerde: stop in pips x pipwaarde x lots. */
export function risicoVanAchteraf(x: AchterafInvoer, i: Instellingen): { stopPips: number; bedrag: number; procent: number } | null {
  if (x.entry === null || x.stop === null || x.lots === null) return null
  const stopPips = Math.abs(x.entry - x.stop) / i.pipGrootte
  const bedrag = stopPips * pipWaardePerLot(i) * x.lots
  return {
    stopPips: Number(stopPips.toFixed(2)),
    bedrag: Number(bedrag.toFixed(2)),
    procent: Number(((bedrag / i.accountGrootte) * 100).toFixed(3)),
  }
}

/**
 * Een trade die buiten de app om is genomen. Hij telt altijd als ongepland,
 * de dag gaat op slot (One & Done) en daarna volgt het resultaat zoals bij elke trade.
 */
export function legTradeAchterafVast<D extends DagVoorAchteraf & { vastgelegdOp: string | null; checkKlaarOp: string | null; heeftScreenshot: boolean }>(
  dag: D,
  x: AchterafInvoer,
  i: Instellingen,
  nu: Date,
  vandaag: DagSleutel,
  sessie: Sessie | null,
  metScreenshot: boolean,
): { dag: D } | { fouten: string[] } {
  const fouten = foutenInAchteraf(dag, x, vandaag)
  if (fouten.length > 0) return { fouten }
  const risico = risicoVanAchteraf(x, i)!
  const op = nu.toISOString()
  const herkomst = HERKOMST_NAMEN[x.herkomst!]
  const reden = `Achteraf ingevoerd · ${herkomst}${x.toelichting.trim() ? ` · ${x.toelichting.trim()}` : ''}`
  return {
    dag: {
      ...dag,
      analyse: {
        ...dag.analyse,
        prediction: dag.analyse.prediction.trim() || reden,
        richting: x.richting,
        sessie: dag.analyse.sessie ?? sessie,
        entryType: 'dieper',
        entryDieper: x.entry,
        stop: x.stop,
      },
      vastgelegdOp: dag.vastgelegdOp ?? op,
      checkKlaarOp: dag.checkKlaarOp ?? op,
      heeftScreenshot: dag.heeftScreenshot || metScreenshot,
      besluit: {
        soort: 'genomen',
        op,
        reden,
        ongepland: true,
        aantalConfluences: 0,
        risicoProcent: risico.procent,
        bedrag: risico.bedrag,
        lots: x.lots,
      },
      afgeslotenOp: op,
    },
  }
}
