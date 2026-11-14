// Hulpfuncties voor datums. Een dag wordt overal opgeslagen als tekst 'JJJJ-MM-DD'
// in lokale tijd, zodat een dag nooit verschuift door tijdzones.

export type DagSleutel = string

const DAGEN = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag']
const MAANDEN = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']

export function naarSleutel(d: Date): DagSleutel {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dag = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${dag}`
}

export function vanSleutel(s: DagSleutel): Date {
  const [j, m, d] = s.split('-').map(Number)
  return new Date(j, m - 1, d)
}

export function vandaag(): DagSleutel {
  // Alleen tijdens het ontwikkelen: met ?datum=2026-11-16 in het adres doet de app alsof het die dag is.
  // In de gebouwde versie werkt dit niet, zodat het dagslot niet te omzeilen is.
  if (import.meta.env?.DEV && typeof window !== 'undefined') {
    const proef = new URLSearchParams(window.location.search).get('datum')
    if (proef && /^\d{4}-\d{2}-\d{2}$/.test(proef)) return proef
  }
  return naarSleutel(new Date())
}

const DAGEN_KORT = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']
const DAGEN_LANG = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag']

/** Bijvoorbeeld 'maandag 16 nov'. */
export function langeDatum(s: DagSleutel): string {
  return `${DAGEN_LANG[(vanSleutel(s).getDay() + 6) % 7]} ${korteDatum(s)}`
}

/** Bijvoorbeeld 'ma 16 nov'. */
export function compacteDatum(s: DagSleutel): string {
  return `${DAGEN_KORT[(vanSleutel(s).getDay() + 6) % 7]} ${korteDatum(s)}`
}

/** De maandag van de week waarin deze dag valt. */
export function maandagVan(s: DagSleutel): DagSleutel {
  const d = vanSleutel(s)
  const weekdag = (d.getDay() + 6) % 7 // maandag = 0, zondag = 6
  d.setDate(d.getDate() - weekdag)
  return naarSleutel(d)
}

export function plusDagen(s: DagSleutel, n: number): DagSleutel {
  const d = vanSleutel(s)
  d.setDate(d.getDate() + n)
  return naarSleutel(d)
}

/** Maandag tot en met vrijdag van de week die op deze maandag begint. */
export function werkweek(maandag: DagSleutel): DagSleutel[] {
  return [0, 1, 2, 3, 4].map((n) => plusDagen(maandag, n))
}

/** ISO-weeknummer (week 1 is de week met de eerste donderdag van het jaar). */
export function weekNummer(s: DagSleutel): number {
  const d = vanSleutel(s)
  const donderdag = new Date(d)
  donderdag.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const eersteJan = new Date(donderdag.getFullYear(), 0, 1)
  const dagen = Math.round((donderdag.getTime() - eersteJan.getTime()) / 86400000)
  return 1 + Math.floor(dagen / 7)
}

export function dagNaam(s: DagSleutel): string {
  return DAGEN[(vanSleutel(s).getDay() + 6) % 7] ?? ''
}

export function korteDatum(s: DagSleutel): string {
  const d = vanSleutel(s)
  return `${d.getDate()} ${MAANDEN[d.getMonth()]}`
}
