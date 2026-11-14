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
