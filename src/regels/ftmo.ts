// De stand ten opzichte van de grenzen van de FTMO 1-Step.
// Controleer de actuele regels op ftmo.com: deze waarden komen uit het plan.

export const FTMO = {
  winstdoelProcent: 10,
  maxVerliesProcent: 10,
  besteDagMaxProcent: 50,
}

export interface TradeUitkomst {
  datum: string
  /** Resultaat in dollars. */
  bedrag: number
}

export interface FtmoStand {
  winst: number
  winstProcent: number
  winstdoel: number
  saldo: number
  /** Het hoogste eindsaldo tot nu toe. De ondergrens beweegt hiermee mee. */
  hoogsteSaldo: number
  ondergrens: number
  /** Hoeveel je nog kunt verliezen voordat de ondergrens is geraakt. */
  buffer: number
  bufferMax: number
  /** Aandeel van de beste dag in de totale winst, in procenten. Leeg zonder winst. */
  besteDagProcent: number | null
}

export function ftmoStand(trades: TradeUitkomst[], account: number): FtmoStand {
  const opVolgorde = [...trades].sort((a, b) => (a.datum < b.datum ? -1 : 1))
  let saldo = account
  let hoogste = account
  const perDag = new Map<string, number>()
  for (const t of opVolgorde) {
    saldo += t.bedrag
    hoogste = Math.max(hoogste, saldo)
    perDag.set(t.datum, (perDag.get(t.datum) ?? 0) + t.bedrag)
  }
  const rond = (n: number) => Number(n.toFixed(2))
  const winst = rond(saldo - account)
  const bufferMax = (account * FTMO.maxVerliesProcent) / 100
  const ondergrens = hoogste - bufferMax
  const besteDag = Math.max(0, ...perDag.values())
  return {
    winst,
    winstProcent: rond((winst / account) * 100),
    winstdoel: (account * FTMO.winstdoelProcent) / 100,
    saldo: rond(saldo),
    hoogsteSaldo: rond(hoogste),
    ondergrens: rond(ondergrens),
    buffer: rond(saldo - ondergrens),
    bufferMax,
    besteDagProcent: winst > 0 ? rond((besteDag / winst) * 100) : null,
  }
}
