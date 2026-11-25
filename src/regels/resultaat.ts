// Het resultaat van een genomen trade en de regeltrouw-score.

export const FOUTLABELS = [
  { id: 'fomo', naam: 'FOMO' },
  { id: 'revenge', naam: 'Revenge' },
  { id: 'tevroeg', naam: 'Te vroeg ingestapt' },
  { id: 'stop', naam: 'Stop verplaatst' },
  { id: 'doel', naam: 'Doel verplaatst' },
  { id: 'telaat', naam: 'Te laat gesloten' },
] as const

export type Foutlabel = (typeof FOUTLABELS)[number]['id']

/** Wat er in het formulier staat. Leeg (null) betekent: nog niet ingevuld. */
export interface ResultaatInvoer {
  /** Uitkomst in R. -1 is een volle stop, 0 is break-even. */
  r: number | null
  /** Winst of verlies in dollars, zoals je het in MT5 of bij FTMO ziet. */
  dollars?: number | null
  /** Verste stand in het voordeel, in R. */
  verstVoor: number | null
  /** Verste stand in het nadeel, in R (als positief getal). */
  verstTegen: number | null
  entryVolgensPlan: boolean | null
  stopVolgensPlan: boolean | null
  exitsVolgensPlan: boolean | null
  foutlabels: Foutlabel[]
  nabespreking: string
}

export interface Resultaat {
  r: number
  /** Winst of verlies in dollars. Leeg bij oudere resultaten: dan geldt R x risicobedrag. */
  dollars?: number
  verstVoor: number
  verstTegen: number
  entryVolgensPlan: boolean
  stopVolgensPlan: boolean
  exitsVolgensPlan: boolean
  foutlabels: Foutlabel[]
  nabespreking: string
  heeftScreenshot: boolean
  opgeslagenOp: string
}

export const LEEG_RESULTAAT: ResultaatInvoer = {
  r: null,
  dollars: null,
  verstVoor: null,
  verstTegen: null,
  entryVolgensPlan: null,
  stopVolgensPlan: null,
  exitsVolgensPlan: null,
  foutlabels: [],
  nabespreking: '',
}

/** Lege lijst = het resultaat mag worden opgeslagen. */
export function foutenInResultaat(x: ResultaatInvoer): string[] {
  const fouten: string[] = []
  if (x.r === null) fouten.push('Vul je winst of verlies in.')
  if (x.verstVoor !== null && x.verstVoor < 0) fouten.push('De verste stand in het voordeel is 0 of hoger.')
  if (x.verstTegen !== null && x.verstTegen < 0) fouten.push('De verste stand in het nadeel is 0 of hoger.')
  if (x.r !== null && x.verstVoor !== null && x.verstVoor >= 0 && x.r > x.verstVoor + 1e-9) {
    fouten.push('De uitkomst kan niet hoger zijn dan de verste stand in het voordeel.')
  }
  if (x.r !== null && x.verstTegen !== null && x.verstTegen >= 0 && x.r < -x.verstTegen - 1e-9) {
    fouten.push('De uitkomst kan niet lager zijn dan de verste stand in het nadeel.')
  }
  if (x.entryVolgensPlan === null || x.stopVolgensPlan === null || x.exitsVolgensPlan === null) {
    fouten.push('Beantwoord de drie vragen over regeltrouw.')
  }
  return fouten
}

export interface Regeltrouw {
  volgensRegels: boolean
  /** Waarom de trade niet volgens de regels was. Leeg bij een goede trade. */
  redenen: string[]
}

/**
 * De regeltrouw-score. De app bepaalt wat hij zelf kan zien (ongepland),
 * de rest komt uit je eigen antwoorden. Het resultaat in R speelt geen rol:
 * een verlies volgens de regels is een goede trade.
 */
export function regeltrouw(
  ongepland: boolean,
  x: Pick<Resultaat, 'entryVolgensPlan' | 'stopVolgensPlan' | 'exitsVolgensPlan' | 'foutlabels'>,
): Regeltrouw {
  const redenen: string[] = []
  if (ongepland) redenen.push('Ongepland: het plan stond niet vooraf vast.')
  if (!x.entryVolgensPlan) redenen.push('Entry of lotsize week af van het plan.')
  if (!x.stopVolgensPlan) redenen.push('De stop is niet volgens plan gebleven.')
  if (!x.exitsVolgensPlan) redenen.push('De exits weken af van het schema.')
  for (const label of FOUTLABELS) {
    if (x.foutlabels.includes(label.id)) redenen.push(`Foutlabel: ${label.naam}.`)
  }
  return { volgensRegels: redenen.length === 0, redenen }
}

/** Rekent R om naar dollars en procenten, met het risico dat bij het besluit is vastgelegd. */
export function inGeld(
  r: number,
  besluit: { bedrag: number | null; risicoProcent: number | null },
  dollars?: number | null,
): { dollars: number; procent: number } {
  const rond = (n: number) => Number(n.toFixed(2))
  if (dollars !== undefined && dollars !== null) {
    const procent = besluit.bedrag && besluit.risicoProcent ? (dollars / besluit.bedrag) * besluit.risicoProcent : 0
    return { dollars: rond(dollars), procent: rond(procent) }
  }
  return { dollars: rond(r * (besluit.bedrag ?? 0)), procent: rond(r * (besluit.risicoProcent ?? 0)) }
}

/** R uit dollars: winst of verlies gedeeld door het risicobedrag. Leeg zonder risicobedrag. */
export function rUitDollars(dollars: number, bedrag: number | null): number {
  if (!bedrag || bedrag <= 0) return 0
  return Number((dollars / bedrag).toFixed(2))
}
