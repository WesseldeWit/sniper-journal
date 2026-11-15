// Het besluit (genomen of niet genomen), One & Done en het label ongepland.

import { naarSleutel, type DagSleutel } from '../hulp/datum'
import { oordeelVanDag, type DagInvoer } from './dagoordeel'
import type { Instellingen } from './instellingen'

export interface Besluit {
  soort: 'genomen' | 'niet-genomen'
  /** Moment waarop het besluit is opgeslagen. */
  op: string
  /** Bij niet genomen: de korte reden. */
  reden: string
  /** Trade zonder plan vooraf. Telt als regelbreuk. */
  ongepland: boolean
  /**
   * Wat er gold op het moment van het besluit. Dit wordt bewaard zodat een latere
   * wijziging van de instellingen de geschiedenis niet verandert.
   */
  /** Aantal extra confluences op het moment van het besluit. */
  aantalConfluences: number
  risicoProcent: number | null
  bedrag: number | null
  lots: number | null
}

export interface DagMetBesluit extends DagInvoer {
  datum: DagSleutel
  checkKlaarOp?: string | null
  afgeslotenOp?: string | null
  besluit: Besluit | null
}

/** One & Done: na een genomen trade zit de dag op slot. Dat is niet terug te draaien. */
export function isOpSlot(dag: { besluit: Besluit | null; afgeslotenOp?: string | null }): boolean {
  return dag.besluit?.soort === 'genomen' || Boolean(dag.afgeslotenOp)
}

/**
 * Een plan is ongepland als het pas na de handelsdag is vastgelegd,
 * of als je zelf aangeeft dat de trade achteraf is ingevoerd.
 */
export function isOngepland(dag: { datum: DagSleutel; vastgelegdOp: string | null }, zelfGemeld: boolean): boolean {
  if (zelfGemeld || dag.vastgelegdOp === null) return true
  return naarSleutel(new Date(dag.vastgelegdOp)) > dag.datum
}

function algemeneFouten(dag: DagMetBesluit, vandaag: DagSleutel): string[] {
  const fouten: string[] = []
  if (dag.besluit?.soort === 'genomen') fouten.push('Er is vandaag al een trade genomen. De dag zit op slot.')
  else if (dag.afgeslotenOp) fouten.push('Deze dag is afgesloten. Er is geen nieuwe analyse of trade meer mogelijk.')
  if (dag.datum > vandaag) fouten.push('Deze dag ligt in de toekomst. Een besluit kan pas op de dag zelf.')
  if (dag.vastgelegdOp === null) fouten.push('Het plan is nog niet vastgelegd.')
  return fouten
}

/** Lege lijst = de trade mag als genomen worden opgeslagen. */
export function foutenBijGenomen(dag: DagMetBesluit, i: Instellingen, vandaag: DagSleutel): string[] {
  const fouten = algemeneFouten(dag, vandaag)
  if (dag.besluit?.soort === 'niet-genomen') fouten.push('Deze dag staat al op niet genomen.')
  const { check } = oordeelVanDag(dag, i)
  if (!check.goedgekeurd) fouten.push('De trade is afgekeurd en kan niet als genomen worden opgeslagen.')
  return fouten
}

export function foutenBijNietGenomen(dag: DagMetBesluit, reden: string, vandaag: DagSleutel): string[] {
  const fouten = algemeneFouten(dag, vandaag)
  if (dag.besluit) fouten.push('Er is al een besluit voor deze dag.')
  if (!reden.trim()) fouten.push('Geef een korte reden waarom je de trade niet nam.')
  return fouten
}

/** Maakt het besluit, of geeft de fouten terug als het niet mag. */
export function neemTrade(
  dag: DagMetBesluit,
  i: Instellingen,
  nu: Date,
  zelfOngepland: boolean,
  vandaag: DagSleutel = naarSleutel(nu),
): { besluit: Besluit } | { fouten: string[] } {
  const fouten = foutenBijGenomen(dag, i, vandaag)
  if (fouten.length > 0) return { fouten }
  const { check } = oordeelVanDag(dag, i)
  return {
    besluit: {
      soort: 'genomen',
      op: nu.toISOString(),
      reden: '',
      ongepland: isOngepland(dag, zelfOngepland),
      aantalConfluences: check.aantalExtra,
      risicoProcent: check.risicoProcent,
      bedrag: check.bedrag,
      lots: check.lots,
    },
  }
}

export function slaOver(
  dag: DagMetBesluit,
  i: Instellingen,
  nu: Date,
  reden: string,
  vandaag: DagSleutel = naarSleutel(nu),
): { besluit: Besluit } | { fouten: string[] } {
  const fouten = foutenBijNietGenomen(dag, reden, vandaag)
  if (fouten.length > 0) return { fouten }
  const { check } = oordeelVanDag(dag, i)
  return {
    besluit: {
      soort: 'niet-genomen',
      op: nu.toISOString(),
      reden: reden.trim(),
      ongepland: false,
      aantalConfluences: check.aantalExtra,
      risicoProcent: null,
      bedrag: null,
      lots: null,
    },
  }
}

/** Sluit een dag zonder trade af. Kan niet als er al een trade is genomen of als de dag al dicht is. */
export function magAfsluiten(dag: DagMetBesluit, vandaag: DagSleutel): boolean {
  return !isOpSlot(dag) && dag.datum <= vandaag
}

/** De onderdelen van een dag die na een genomen trade of na het afsluiten nooit meer mogen veranderen. */
const VAST_NA_TRADE = [
  'analyse',
  'vastgelegdOp',
  'heeftScreenshot',
  'confluences',
  'risicoProcent',
  'checkKlaarOp',
  'besluit',
  'afgeslotenOp',
] as const

/**
 * Laatste slot op de deur: de opslag weigert elke wijziging aan plan, check of besluit
 * van een dag die op slot zit, ook als een scherm het per ongeluk zou toelaten.
 */
export function magOverschrijven(oud: DagMetBesluit | undefined, nieuw: DagMetBesluit): boolean {
  if (!oud || !isOpSlot(oud)) return true
  return VAST_NA_TRADE.every((veld) => JSON.stringify(oud[veld]) === JSON.stringify(nieuw[veld]))
}
