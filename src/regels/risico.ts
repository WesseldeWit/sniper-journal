// Rekenregels voor risico en lotsize. Alleen berekeningen, geen schermen.

import { MAX_RISICO_PROCENT, tredeVoor, type Instellingen } from './instellingen'

/** Wat 1 pip beweging oplevert of kost bij 1 lot, in dollars. */
export function pipWaardePerLot(i: Instellingen): number {
  return i.ouncePerLot * i.pipGrootte
}

/**
 * Het hoogste risico dat bij dit aantal extra confluences is toegestaan, in procenten:
 * 1 of 2 = laag, 3 of 4 = midden, 5 of 6 = hoog. Nooit hoger dan 1%.
 * Geeft null als er geen extra confluence is: dan is er geen trade.
 */
export function maxRisicoProcent(aantalExtra: number, i: Instellingen): number | null {
  const trede = tredeVoor(aantalExtra)
  return trede === null ? null : Math.min(i.risicoTabel[trede], MAX_RISICO_PROCENT)
}

/** Lager dan de tabel mag altijd, hoger nooit. */
export function risicoToegestaan(procent: number, aantalExtra: number, i: Instellingen): boolean {
  const max = maxRisicoProcent(aantalExtra, i)
  return max !== null && Number.isFinite(procent) && procent > 0 && procent <= max
}

export function risicoBedrag(procent: number, i: Instellingen): number {
  return (i.accountGrootte * procent) / 100
}

/**
 * Lotsize = risicobedrag / (stop loss in pips x pipwaarde per lot),
 * altijd naar beneden afgerond op de lotstap.
 */
export function lotsize(bedrag: number, stopPips: number, i: Instellingen): number {
  if (!(bedrag > 0) || !(stopPips > 0)) return 0
  return rondLotsAf(bedrag / (stopPips * pipWaardePerLot(i)), i)
}

/** Rondt een aantal lots naar beneden af op de lotstap. */
export function rondLotsAf(lots: number, i: Instellingen): number {
  // De kleine marge voorkomt dat 3,00 door afrondfouten in de computer 2,99 wordt.
  const stappen = Math.floor(lots / i.lotStap + 1e-9)
  return Number((stappen * i.lotStap).toFixed(6))
}
