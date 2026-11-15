// Nieuws dat goud kan bewegen: welke items tellen, hoe zwaar, en wanneer je niet mag traden.
// Bron: de weekkalender van Forex Factory (gratis, onofficieel). Tijden worden omgerekend naar Nederlandse tijd.

import type { DagSleutel } from '../hulp/datum'
import { klokTekst, nlDatum, nlMinuten, type Venster } from './sessie'

export type NieuwsNiveau = 'rood' | 'oranje'
export type NieuwsSoort = 'rente' | 'inflatie' | 'banen' | 'toespraak'

export interface NieuwsItem {
  /** Het exacte moment, als ISO-tekst. */
  moment: string
  /** Datum en minuten sinds middernacht in Nederlandse tijd. */
  datum: DagSleutel
  minuten: number
  naam: string
  niveau: NieuwsNiveau
  soort: NieuwsSoort
  /** In één zin: wat het is en waarom het goud kan bewegen. */
  uitleg: string
  verwacht: string
  vorige: string
}

const SOORTEN: { soort: NieuwsSoort; patroon: RegExp; uitleg: string }[] = [
  {
    soort: 'rente',
    patroon: /federal funds rate|fomc statement|fomc press conference|fomc meeting minutes|fomc economic projections/i,
    uitleg: 'Rentebesluit of toelichting van de Amerikaanse centrale bank. De rente bepaalt hoe aantrekkelijk goud is tegenover de dollar.',
  },
  {
    soort: 'inflatie',
    patroon: /\bcpi\b|\bpce\b|\bppi\b/i,
    uitleg: 'Amerikaans inflatiecijfer. Hogere of lagere inflatie verandert de renteverwachting, en daarmee de goudprijs.',
  },
  {
    soort: 'banen',
    patroon: /non-farm|unemployment rate|unemployment claims|\badp\b|jolts|average hourly earnings/i,
    uitleg: 'Amerikaans banencijfer. Een sterke of zwakke arbeidsmarkt stuurt de dollar en de renteverwachting.',
  },
  {
    soort: 'toespraak',
    patroon: /\b(fed|fomc)\b.*\b(speaks|testifies)\b/i,
    uitleg: 'Toespraak van de Amerikaanse centrale bank. Een onverwachte opmerking over de rente kan goud direct bewegen.',
  },
]

/** Maakt van de ruwe kalender de items die voor goud tellen. Onbruikbare invoer geeft een lege lijst. */
export function verwerkKalender(ruw: unknown): NieuwsItem[] {
  if (!Array.isArray(ruw)) return []
  const items: NieuwsItem[] = []
  for (const x of ruw as Record<string, unknown>[]) {
    if (x?.country !== 'USD') continue
    const niveau: NieuwsNiveau | null = x.impact === 'High' ? 'rood' : x.impact === 'Medium' ? 'oranje' : null
    const naam = typeof x.title === 'string' ? x.title : ''
    const soort = SOORTEN.find((s) => s.patroon.test(naam))
    const moment = new Date(String(x.date))
    if (!niveau || !soort || Number.isNaN(moment.getTime())) continue
    items.push({
      moment: moment.toISOString(),
      datum: nlDatum(moment),
      minuten: nlMinuten(moment),
      naam,
      niveau,
      soort: soort.soort,
      uitleg: soort.uitleg,
      verwacht: typeof x.forecast === 'string' ? x.forecast : '',
      vorige: typeof x.previous === 'string' ? x.previous : '',
    })
  }
  return items.sort((a, b) => (a.moment < b.moment ? -1 : 1))
}

export interface NieuwsVenster extends Venster {
  niveau: NieuwsNiveau
  naam: string
}

/** De blokkadevensters van een dag. Items op hetzelfde tijdstip en niveau vallen samen in één venster. */
export function venstersVoor(items: NieuwsItem[], datum: DagSleutel, voor: number, na: number): NieuwsVenster[] {
  const vensters: NieuwsVenster[] = []
  for (const item of items.filter((i) => i.datum === datum)) {
    const zelfde = vensters.find((v) => v.niveau === item.niveau && v.van === item.minuten - voor)
    if (zelfde) zelfde.naam += `, ${item.naam}`
    else vensters.push({ van: item.minuten - voor, tot: item.minuten + na, niveau: item.niveau, naam: item.naam })
  }
  return vensters
}

/** Loopt er nu een rood venster? Dan mag een trade niet als genomen worden gemarkeerd. */
export function blokkadeNu(vensters: NieuwsVenster[], nuMinuten: number): NieuwsVenster | null {
  return vensters.find((v) => v.niveau === 'rood' && nuMinuten >= v.van && nuMinuten < v.tot) ?? null
}

/** Bijvoorbeeld '1:25' voor 85 minuten. */
export function aftellen(minuten: number): string {
  const m = Math.max(0, Math.round(minuten))
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`
}

export function vensterTekst(v: NieuwsVenster): string {
  return `${v.niveau === 'rood' ? 'niet traden' : 'uitkijken'} van ${klokTekst(v.van)} tot ${klokTekst(v.tot)}`
}

/** Waarschuwingen voor de ochtendanalyse: wat er vandaag nog aan nieuws komt. */
export function nieuwsWaarschuwingen(vensters: NieuwsVenster[], nuMinuten: number): { niveau: NieuwsNiveau; tekst: string }[] {
  return vensters
    .filter((v) => v.tot > nuMinuten)
    .map((v) => ({
      niveau: v.niveau,
      tekst:
        v.niveau === 'rood'
          ? `Rood nieuws vandaag (${v.naam}): niet traden van ${klokTekst(v.van)} tot ${klokTekst(v.tot)}. Valt je entry of een open trade in dat venster, wacht dan of sluit op tijd.`
          : `Oranje nieuws vandaag (${v.naam}): uitkijken van ${klokTekst(v.van)} tot ${klokTekst(v.tot)}.`,
    }))
}
