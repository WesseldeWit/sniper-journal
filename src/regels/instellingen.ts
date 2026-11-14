// De instellingen van de app en de vaste grenzen uit het plan.
// Vaste grenzen staan hier als constante: ze zijn bewust niet instelbaar.

/** Het risico hangt af van het aantal extra confluences: 1-2, 3-4 of 5-6. */
export type RisicoTrede = 'laag' | 'midden' | 'hoog'

export const TREDEN: { id: RisicoTrede; naam: string; vanaf: number }[] = [
  { id: 'laag', naam: '1 of 2 extra confluences', vanaf: 1 },
  { id: 'midden', naam: '3 of 4 extra confluences', vanaf: 3 },
  { id: 'hoog', naam: '5 of 6 extra confluences', vanaf: 5 },
]

export interface Instellingen {
  /** Accountgrootte in dollars. */
  accountGrootte: number
  /** Aantal ounce goud in 1 lot. */
  ouncePerLot: number
  /** Prijsbeweging in dollars die als 1 pip telt. */
  pipGrootte: number
  /** Kleinste stap waarin een lotsize kan worden ingevoerd. */
  lotStap: number
  /** Maximaal risico in procenten per trede van extra confluences. */
  risicoTabel: Record<RisicoTrede, number>
  /** Periodes waarin de dagen dicht staan, bijvoorbeeld de laatste weken van december. */
  pauzes: { van: string; tot: string }[]
}

export const STANDAARD_INSTELLINGEN: Instellingen = {
  accountGrootte: 100000,
  ouncePerLot: 100,
  pipGrootte: 0.1,
  lotStap: 0.01,
  risicoTabel: { laag: 0.5, midden: 0.75, hoog: 1 },
  pauzes: [],
}

/** Het risico per trade is nooit hoger dan dit, wat de tabel ook zegt. */
export const MAX_RISICO_PROCENT = 1
export const TOTAAL_VERPLICHT = 4
export const TOTAAL_EXTRA = 6
/** Minimaal zoveel extra confluences moeten in de entryzone liggen. */
export const MIN_EXTRA = 1
export const STOP_MIN_PIPS = 25
export const STOP_MAX_PIPS = 30

/** Welke trede hoort bij dit aantal extra confluences? Leeg als er te weinig zijn. */
export function tredeVoor(aantalExtra: number): RisicoTrede | null {
  if (!Number.isInteger(aantalExtra) || aantalExtra < MIN_EXTRA) return null
  if (aantalExtra >= 5) return 'hoog'
  return aantalExtra >= 3 ? 'midden' : 'laag'
}

/** Geeft een lijst met fouten. Een lege lijst betekent: deze instellingen mogen worden opgeslagen. */
export function controleerInstellingen(i: Instellingen): string[] {
  const fouten: string[] = []
  const positief = (n: number) => Number.isFinite(n) && n > 0

  if (!positief(i.accountGrootte)) fouten.push('De accountgrootte moet groter zijn dan 0.')
  if (!positief(i.ouncePerLot)) fouten.push('Het aantal ounce per lot moet groter zijn dan 0.')
  if (!positief(i.pipGrootte)) fouten.push('De pipgrootte moet groter zijn dan 0.')
  if (!positief(i.lotStap)) fouten.push('De lotstap moet groter zijn dan 0.')

  for (const trede of TREDEN) {
    const procent = i.risicoTabel[trede.id]
    if (!positief(procent)) {
      fouten.push(`Het risico bij ${trede.naam} moet groter zijn dan 0.`)
    } else if (procent > MAX_RISICO_PROCENT) {
      fouten.push(`Het risico bij ${trede.naam} mag niet hoger zijn dan ${MAX_RISICO_PROCENT}%.`)
    }
  }
  if (i.risicoTabel.laag > i.risicoTabel.midden || i.risicoTabel.midden > i.risicoTabel.hoog) {
    fouten.push('Minder extra confluences mag nooit een hoger risico geven dan meer.')
  }
  const datum = /^\d{4}-\d{2}-\d{2}$/
  for (const p of i.pauzes ?? []) {
    if (!datum.test(p.van) || !datum.test(p.tot)) fouten.push('Een pauzeperiode heeft een begin- en einddatum nodig.')
    else if (p.tot < p.van) fouten.push('Een pauzeperiode kan niet eindigen voordat hij begint.')
  }
  return fouten
}

/** Zet instellingen uit een oudere versie (risico per 5, 6 of 7 confluences) om naar de treden. */
export function werkInstellingenBij(bewaard: Record<string, unknown> | undefined): Instellingen {
  const oud = (bewaard?.risicoTabel ?? {}) as Record<string, number>
  const risicoTabel =
    '5' in oud
      ? { laag: oud['5'], midden: oud['6'], hoog: oud['7'] }
      : { ...STANDAARD_INSTELLINGEN.risicoTabel, ...oud }
  const samen = { ...STANDAARD_INSTELLINGEN, ...bewaard, risicoTabel } as Instellingen
  return controleerInstellingen(samen).length === 0 ? samen : STANDAARD_INSTELLINGEN
}
