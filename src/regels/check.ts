// De check: vier verplichte confluences, zes extra's, het oordeel, het risico en de lotsize.

import { MIN_EXTRA, TOTAAL_EXTRA, type Instellingen } from './instellingen'
import { lotsize, maxRisicoProcent, risicoBedrag, rondLotsAf } from './risico'

/** Moeten er altijd alle vier zijn. */
export const VERPLICHT = [
  { id: 'structuur', naam: 'Market structure', uitleg: 'BoS in de traderichting, of een ChoCh bij een reversal.' },
  { id: 'fibonacci', naam: 'Fibonacci', uitleg: 'De entry ligt in de 0.764-entryzone.' },
  {
    id: 'supplydemand',
    naam: 'Supply and demand',
    uitleg: 'Geldige zone van een van de vier types: RBR, DBR, RBD of DBD.',
  },
  {
    id: 'liquidity',
    naam: 'Liquidity (intern/extern)',
    uitleg: 'Externe liquidity opgehaald, interne opgebouwd en daarna opgehaald.',
  },
] as const

/** Tellen alleen mee als ze in de entryzone liggen of ermee samenvallen. Bepalen het risico. */
export const EXTRA = [
  { id: 'poc', naam: 'P.O.C.', uitleg: 'Het point of control ligt in de zone.' },
  {
    id: 'imbalance',
    naam: 'Imbalance',
    uitleg: 'Een imbalance ligt in of direct bij de zone. Geen garantie dat hij gevuld wordt.',
  },
  {
    id: 'sessieliquidity',
    naam: 'Session liquidity',
    uitleg: 'De liquidity van de vorige sessie is opgehaald, bijvoorbeeld de Aziatische high of low door Londen.',
  },
  { id: 'volume', naam: 'Volume zones en structure', uitleg: 'Definitie nog vast te leggen.' },
  {
    id: 'entrymodel',
    naam: 'Entry models',
    uitleg: 'De setup past in trend continuation, trend reversal 1 of trend reversal 2.',
  },
  { id: 'fib50', naam: '50% fibonacci', uitleg: 'Definitie nog vast te leggen.' },
] as const

export type VerplichtId = (typeof VERPLICHT)[number]['id']
export type ExtraId = (typeof EXTRA)[number]['id']
export type ConfluenceId = VerplichtId | ExtraId

/**
 * Deze twee vink je niet zelf aan: ze volgen uit het plan.
 * Fibonacci is aanwezig als de entry in de zone ligt, Entry models als er een model is gekozen.
 */
export const AUTOMATISCH: ConfluenceId[] = ['fibonacci', 'entrymodel']

export interface CheckInvoer {
  /** Het plan is vastgelegd, dus alle harde eisen kloppen en de entry ligt in de zone. */
  planVast: boolean
  /** In de analyse is een entry-model gekozen. */
  heeftModel: boolean
  stopPips: number | null
  /** De zelf aangevinkte confluences. */
  confluences: ConfluenceId[]
  /** Zelf gekozen lager risico in procenten. Leeg = het maximum uit de tabel. */
  gekozenRisico: number | null
  /**
   * Extra plafond op het risico, in procenten. Hier haakt later de AI-check in:
   * twijfel van de AI kan het risico alleen verlagen, nooit verhogen.
   */
  risicoPlafond?: number
}

export interface Oordeel {
  /** Alle confluences die aanwezig zijn: aangevinkt plus automatisch. */
  aanwezig: ConfluenceId[]
  aantalVerplicht: number
  aantalExtra: number
  goedgekeurd: boolean
  /** Waarom de trade is afgekeurd. Leeg bij een goedgekeurde trade. */
  redenen: string[]
  maxRisico: number | null
  risicoProcent: number | null
  bedrag: number | null
  lots: number | null
}

/** Welke confluences zijn aanwezig? Automatische komen uit het plan, de rest uit de vinkjes. */
export function aanwezigeConfluences(invoer: Pick<CheckInvoer, 'planVast' | 'heeftModel' | 'confluences'>): ConfluenceId[] {
  const gevinkt = new Set<string>(invoer.confluences)
  const alle: ConfluenceId[] = [...VERPLICHT, ...EXTRA].map((c) => c.id)
  return alle.filter((id) => {
    if (id === 'fibonacci') return invoer.planVast
    if (id === 'entrymodel') return invoer.heeftModel
    return gevinkt.has(id)
  })
}

export function beoordeelCheck(invoer: CheckInvoer, i: Instellingen): Oordeel {
  const aanwezig = aanwezigeConfluences(invoer)
  const heeft = new Set<string>(aanwezig)
  const ontbreekt = VERPLICHT.filter((c) => !heeft.has(c.id))
  const aantalVerplicht = VERPLICHT.length - ontbreekt.length
  const aantalExtra = EXTRA.filter((c) => heeft.has(c.id)).length
  const redenen: string[] = []

  if (!invoer.planVast || invoer.stopPips === null) {
    redenen.push('Het plan is niet vastgelegd. Eerst moeten alle harde eisen kloppen.')
  }
  if (ontbreekt.length > 0) {
    redenen.push(`Verplichte confluence ontbreekt: ${ontbreekt.map((c) => c.naam).join(', ')}.`)
  }
  if (aantalExtra < MIN_EXTRA) {
    redenen.push(`Geen extra confluence in de entryzone. Minimaal ${MIN_EXTRA} van de ${TOTAAL_EXTRA} is nodig.`)
  }

  const basis = { aanwezig, aantalVerplicht, aantalExtra }
  const tabel = maxRisicoProcent(aantalExtra, i)
  if (redenen.length > 0 || tabel === null || invoer.stopPips === null) {
    return { ...basis, goedgekeurd: false, redenen, maxRisico: null, risicoProcent: null, bedrag: null, lots: null }
  }

  // Het risico kan alleen omlaag: door het plafond en door een eigen lagere keuze.
  const maxRisico = Math.min(tabel, invoer.risicoPlafond ?? Infinity)
  const risicoProcent =
    invoer.gekozenRisico !== null && invoer.gekozenRisico > 0 ? Math.min(invoer.gekozenRisico, maxRisico) : maxRisico
  const bedrag = risicoBedrag(risicoProcent, i)
  const lots = lotsize(bedrag, invoer.stopPips, i)

  if (lots <= 0) {
    return {
      ...basis,
      goedgekeurd: false,
      redenen: ['Het risicobedrag is te klein voor de kleinste lotsize.'],
      maxRisico,
      risicoProcent,
      bedrag,
      lots: 0,
    }
  }
  return { ...basis, goedgekeurd: true, redenen: [], maxRisico, risicoProcent, bedrag, lots }
}

/** Zet vinkjes uit de oude lijst van 7 confluences om naar de nieuwe namen. */
export function werkConfluencesBij(lijst: string[]): ConfluenceId[] {
  const geldig = new Set<string>([...VERPLICHT, ...EXTRA].map((c) => c.id))
  const omgezet = lijst.map((id) => (id === 'zone' ? 'supplydemand' : id))
  return [...new Set(omgezet)].filter((id) => geldig.has(id)) as ConfluenceId[]
}

export interface Verdeling {
  /** Sluiten op 1:2 (20%). */
  opR2: number
  /** Sluiten op 1:3 (60%). */
  opR3: number
  /** Blijft lopen als runner (de rest, ongeveer 20%). */
  runner: number
}

/** Verdeelt de lotsize over de exits. De delen worden naar beneden afgerond, de rest is de runner. */
export function verdeelLots(lots: number, i: Instellingen): Verdeling {
  const opR2 = rondLotsAf(lots * 0.2, i)
  const opR3 = rondLotsAf(lots * 0.6, i)
  return { opR2, opR3, runner: Number((lots - opR2 - opR3).toFixed(6)) }
}
