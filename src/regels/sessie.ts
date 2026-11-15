// Handelssessies en handelsdagen. De tijden volgen de klok in Londen en New York zelf,
// zodat zomer- en wintertijd automatisch kloppen.

import { plusDagen, vanSleutel, type DagSleutel } from '../hulp/datum'

export interface Pauze {
  van: DagSleutel
  tot: DagSleutel
}

// Aanname: beide sessies lopen van 08:00 tot 17:00 lokale tijd (in Nederland: 09:00-18:00 en 14:00-23:00).
const SESSIES = {
  londen: { tijdzone: 'Europe/London', open: 8 * 60, dicht: 17 * 60 },
  newyork: { tijdzone: 'America/New_York', open: 8 * 60, dicht: 17 * 60 },
} as const

function klokIn(nu: Date, tijdzone: string): { minuten: number; werkdag: boolean } {
  const delen = new Intl.DateTimeFormat('en-GB', {
    timeZone: tijdzone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(nu)
  const deel = (soort: string) => delen.find((d) => d.type === soort)?.value ?? ''
  return {
    minuten: Number(deel('hour')) * 60 + Number(deel('minute')),
    werkdag: !['Sat', 'Sun'].includes(deel('weekday')),
  }
}

/** Welke sessies zijn op dit moment open? */
export function sessieStatus(nu: Date): { londen: boolean; newyork: boolean } {
  const open = (s: (typeof SESSIES)[keyof typeof SESSIES]) => {
    const klok = klokIn(nu, s.tijdzone)
    return klok.werkdag && klok.minuten >= s.open && klok.minuten < s.dicht
  }
  return { londen: open(SESSIES.londen), newyork: open(SESSIES.newyork) }
}

export function isWeekend(datum: DagSleutel): boolean {
  const dag = vanSleutel(datum).getDay()
  return dag === 0 || dag === 6
}

export function inPauze(datum: DagSleutel, pauzes: Pauze[]): boolean {
  return pauzes.some((p) => datum >= p.van && datum <= p.tot)
}

/** Een handelsdag is een werkdag buiten een pauzeperiode. */
export function isHandelsdag(datum: DagSleutel, pauzes: Pauze[]): boolean {
  return !isWeekend(datum) && !inPauze(datum, pauzes)
}

/** De eerstvolgende handelsdag na deze datum. */
export function volgendeHandelsdag(datum: DagSleutel, pauzes: Pauze[]): DagSleutel {
  let dag = plusDagen(datum, 1)
  for (let n = 0; n < 400 && !isHandelsdag(dag, pauzes); n++) dag = plusDagen(dag, 1)
  return dag
}

// ---- Tijden in Nederlandse tijd, voor de tijdlijn ----

const NL = 'Europe/Amsterdam'

function delenIn(moment: Date, tijdzone: string) {
  const delen = new Intl.DateTimeFormat('en-GB', {
    timeZone: tijdzone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(moment)
  const n = (soort: string) => Number(delen.find((d) => d.type === soort)?.value)
  return { jaar: n('year'), maand: n('month'), dag: n('day'), uur: n('hour'), minuut: n('minute') }
}

/** Het moment waarop het in deze tijdzone op deze datum zo laat is. */
export function momentIn(tijdzone: string, datum: DagSleutel, uur: number, minuut = 0): Date {
  const [j, m, d] = datum.split('-').map(Number)
  const doel = Date.UTC(j, m - 1, d, uur, minuut)
  let gok = doel
  // Twee rondes zijn genoeg: de eerste vindt het tijdsverschil, de tweede corrigeert rond een klokwissel.
  for (let ronde = 0; ronde < 2; ronde++) {
    const k = delenIn(new Date(gok), tijdzone)
    gok += doel - Date.UTC(k.jaar, k.maand - 1, k.dag, k.uur, k.minuut)
  }
  return new Date(gok)
}

/** Minuten sinds middernacht in Nederlandse tijd. */
export function nlMinuten(moment: Date): number {
  const k = delenIn(moment, NL)
  return k.uur * 60 + k.minuut
}

/** De datum in Nederland op dit moment. */
export function nlDatum(moment: Date): DagSleutel {
  const k = delenIn(moment, NL)
  return `${k.jaar}-${String(k.maand).padStart(2, '0')}-${String(k.dag).padStart(2, '0')}`
}

export interface Venster {
  /** Minuten sinds middernacht, Nederlandse tijd. */
  van: number
  tot: number
}

/** De Londen- en New York-sessie van deze dag, in Nederlandse tijd. Volgt zomer- en wintertijd aan beide kanten. */
export function sessieVensters(datum: DagSleutel): { londen: Venster; newyork: Venster } {
  const venster = (s: (typeof SESSIES)[keyof typeof SESSIES]): Venster => ({
    van: nlMinuten(momentIn(s.tijdzone, datum, s.open / 60)),
    tot: nlMinuten(momentIn(s.tijdzone, datum, s.dicht / 60)),
  })
  return { londen: venster(SESSIES.londen), newyork: venster(SESSIES.newyork) }
}

export function klokTekst(minuten: number): string {
  const m = ((Math.round(minuten) % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/**
 * De sessie volgens de klok: voor de opening van New York telt de dag als Londen,
 * daarna als New York. Na het sluiten van New York is er geen sessie meer.
 */
export function sessieVanKlok(nu: Date, datum: DagSleutel): 'londen' | 'newyork' | null {
  if (nlDatum(nu) !== datum) return 'londen'
  const { newyork } = sessieVensters(datum)
  const m = nlMinuten(nu)
  return m < newyork.van ? 'londen' : m < newyork.tot ? 'newyork' : null
}
