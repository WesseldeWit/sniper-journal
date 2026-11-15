// Regels op slot: instellingen die je regels raken kun je alleen wijzigen in het weekend
// of buiten de Londen- en New York-sessie. Elke wijziging komt in het logboek.

import { TREDEN, type Instellingen } from './instellingen'
import { isWeekend, nlDatum, sessieStatus } from './sessie'

export interface RegelWijziging {
  veld: string
  oud: string
  nieuw: string
}

export interface LogRegel extends RegelWijziging {
  op: string
}

const nl = (n: number) => n.toLocaleString('nl-NL', { maximumFractionDigits: 6 })

/** Welke beschermde instellingen verschillen tussen oud en nieuw? */
export function regelWijzigingen(oud: Instellingen, nieuw: Instellingen): RegelWijziging[] {
  const uit: RegelWijziging[] = []
  for (const trede of TREDEN) {
    if (oud.risicoTabel[trede.id] !== nieuw.risicoTabel[trede.id]) {
      uit.push({ veld: `Risico bij ${trede.naam}`, oud: `${nl(oud.risicoTabel[trede.id])}%`, nieuw: `${nl(nieuw.risicoTabel[trede.id])}%` })
    }
  }
  if (oud.nieuwsVoor !== nieuw.nieuwsVoor) {
    uit.push({ veld: 'Nieuwsblokkade voor het nieuws', oud: `${oud.nieuwsVoor} min`, nieuw: `${nieuw.nieuwsVoor} min` })
  }
  if (oud.nieuwsNa !== nieuw.nieuwsNa) {
    uit.push({ veld: 'Nieuwsblokkade na het nieuws', oud: `${oud.nieuwsNa} min`, nieuw: `${nieuw.nieuwsNa} min` })
  }
  return uit
}

/** Regels wijzigen mag in het weekend en op werkdagen zolang Londen en New York allebei dicht zijn. */
export function magRegelsWijzigen(nu: Date): boolean {
  if (isWeekend(nlDatum(nu))) return true
  const open = sessieStatus(nu)
  return !open.londen && !open.newyork
}

export const SLOT_MELDING =
  'Je regels zitten op slot tijdens de Londen- en New York-sessie. Wijzigen kan in het weekend of als beide sessies dicht zijn.'
