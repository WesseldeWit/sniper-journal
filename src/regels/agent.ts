// De agent zonder AI: wat hij uit je eigen gegevens en de klok kan afleiden.
// Hij voorspelt niets, keurt niets goed en overrulet je regels niet. Hij benoemt alleen wat hij ziet.

import { compacteDatum, type DagSleutel } from '../hulp/datum'
import { dollars, kort, metTeken } from '../hulp/getal'
import type { Dag } from '../opslag/dagen'
import { MODEL_NAMEN, SESSIE_NAMEN } from './analyse'
import { oordeelVanDag } from './dagoordeel'
import { ftmoStand, uitkomstenVanDagen } from './ftmo'
import type { Instellingen } from './instellingen'
import type { NieuwsVenster } from './nieuws'
import { FOUTLABELS, regeltrouw } from './resultaat'
import { klokTekst, nlMinuten, sessieVensters, type Venster } from './sessie'
import { berekenStreak } from './streak'

export const SIGNAAL_SOORTEN = [
  { id: 'nieuws', naam: 'Nieuws' },
  { id: 'sessie', naam: 'Sessie-opening' },
  { id: 'management', naam: 'Managementkaart' },
  { id: 'resultaat', naam: 'Trade zonder resultaat' },
  { id: 'analyse', naam: 'Nog geen analyse om 11:00' },
  { id: 'gedrag', naam: 'Afwijking van je eigen gedrag' },
] as const

export type SignaalSoort = (typeof SIGNAAL_SOORTEN)[number]['id']
export const MAX_SIGNALEN_PER_DAG = 5

export interface Signaal {
  /** Uniek per dag, zodat een melding maar één keer wordt verstuurd. */
  id: string
  soort: SignaalSoort
  tekst: string
}

export interface BriefingRegel {
  kop: string
  tekst: string
}


export interface AgentContext {
  vandaag: DagSleutel
  nu: Date
  /** Alle bewaarde dagen, inclusief vandaag. */
  dagen: Dag[]
  instellingen: Instellingen
  lessen: string[]
  /** Blokkadevensters van vandaag. Leeg als er geen nieuws is of als het onbekend is. */
  nieuws: NieuwsVenster[]
  nieuwsBekend: boolean
}

const trades = (dagen: Dag[]) =>
  dagen.filter((d) => d.besluit?.soort === 'genomen').sort((a, b) => (a.datum < b.datum ? -1 : 1))
const mediaan = (getallen: number[]) => {
  const s = [...getallen].sort((a, b) => a - b)
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2
}

/** De uren waarin een sessie open is en geen rood nieuwsvenster loopt. */
export function vrijeUren(datum: DagSleutel, nieuws: NieuwsVenster[]): Venster[] {
  const { londen, newyork } = sessieVensters(datum)
  let vrij: Venster[] = [{ van: Math.min(londen.van, newyork.van), tot: Math.max(londen.tot, newyork.tot) }]
  for (const blok of nieuws.filter((n) => n.niveau === 'rood')) {
    vrij = vrij.flatMap((v) => {
      if (blok.tot <= v.van || blok.van >= v.tot) return [v]
      return [
        { van: v.van, tot: blok.van },
        { van: blok.tot, tot: v.tot },
      ].filter((x) => x.tot > x.van)
    })
  }
  return vrij
}

function samenvattingVan(dag: Dag): string {
  if (dag.besluit?.soort === 'genomen') {
    if (!dag.resultaat) return 'trade genomen, het resultaat ontbreekt nog'
    const goed = regeltrouw(dag.besluit.ongepland, dag.resultaat).volgensRegels
    return `trade genomen, ${metTeken(dag.resultaat.r)}R, ${goed ? 'volgens de regels' : 'niet volgens de regels'}`
  }
  if (dag.besluit) return `geen trade genomen (${dag.besluit.reden})`
  return dag.vastgelegdOp ? 'plan gemaakt, geen besluit vastgelegd' : 'alleen een analyse'
}

/** Patronen in je eigen trades. Alleen feiten uit de cijfers, geen voorspelling. */
export function patronen(dagen: Dag[]): string[] {
  const klaar = trades(dagen).filter((d) => d.resultaat)
  const uit: string[] = []

  const verliezen = klaar.filter((d) => d.resultaat!.r < 0).slice(-3)
  if (verliezen.length === 3) {
    const model = verliezen[0].analyse.model
    const sessie = verliezen[0].analyse.sessie
    const zelfdeModel = model && verliezen.every((d) => d.analyse.model === model)
    const zelfdeSessie = sessie && verliezen.every((d) => d.analyse.sessie === sessie)
    if (zelfdeModel || zelfdeSessie) {
      const wat = [zelfdeModel && MODEL_NAMEN[model!].toLowerCase(), zelfdeSessie && `in de ${SESSIE_NAMEN[sessie!]}-sessie`]
        .filter(Boolean)
        .join(' ')
      uit.push(`Je laatste drie verliezen waren allemaal ${wat}.`)
    }
  }

  const laatste = klaar.slice(-10)
  const telling = FOUTLABELS.map((l) => ({ naam: l.naam, aantal: laatste.filter((d) => d.resultaat!.foutlabels.includes(l.id)).length }))
    .filter((t) => t.aantal >= 2)
    .sort((a, b) => b.aantal - a.aantal)[0]
  if (telling) uit.push(`Het foutlabel "${telling.naam}" kwam ${telling.aantal} keer voor in je laatste ${laatste.length} trades.`)

  return uit
}

/** De dagbriefing: wat je moet weten voordat je begint. */
export function dagbriefing(ctx: AgentContext): BriefingRegel[] {
  const regels: BriefingRegel[] = []
  const eerder = ctx.dagen.filter((d) => d.datum < ctx.vandaag).sort((a, b) => (a.datum < b.datum ? 1 : -1))

  if (!ctx.nieuwsBekend) {
    regels.push({ kop: 'Nieuws', tekst: 'Nieuws onbekend, controleer zelf de economische kalender.' })
  } else if (ctx.nieuws.length === 0) {
    regels.push({ kop: 'Nieuws', tekst: 'Geen zwaar of middelzwaar nieuws voor goud vandaag.' })
  } else {
    regels.push({
      kop: 'Nieuws',
      tekst: ctx.nieuws
        .map((n) => `${n.naam}: ${n.niveau === 'rood' ? 'niet traden' : 'uitkijken'} van ${klokTekst(n.van)} tot ${klokTekst(n.tot)}`)
        .join('. ') + '.',
    })
  }

  const vrij = vrijeUren(ctx.vandaag, ctx.nieuws)
  regels.push({
    kop: 'Vrij om te traden',
    tekst: vrij.length ? vrij.map((v) => `${klokTekst(v.van)}–${klokTekst(v.tot)}`).join(' en ') + ' (Nederlandse tijd).' : 'Vandaag geen vrije uren.',
  })

  const stand = ftmoStand(uitkomstenVanDagen(ctx.dagen), ctx.instellingen.accountGrootte)
  regels.push({
    kop: 'Buffer',
    tekst: `${dollars(Math.round(stand.buffer))} van ${dollars(stand.bufferMax)}. Stand: ${metTeken(stand.winstProcent)}% richting het doel van 10%.`,
  })

  const streak = berekenStreak(ctx.dagen, ctx.vandaag)
  regels.push({ kop: 'Streak', tekst: `${streak} ${streak === 1 ? 'dag' : 'dagen'} volgens de regels.` })

  if (eerder[0]) {
    regels.push({ kop: 'Vorige dag', tekst: `${compacteDatum(eerder[0].datum)}: ${samenvattingVan(eerder[0])}.` })
  }
  const open = eerder.filter((d) => d.besluit?.soort === 'genomen' && !d.resultaat)
  if (open.length) {
    regels.push({
      kop: 'Staat nog open',
      tekst: `Het resultaat ontbreekt van ${open.map((d) => compacteDatum(d.datum)).join(', ')}. Vul dat in via Geschiedenis.`,
    })
  }

  const let_op = [...ctx.lessen.slice(0, 3), ...patronen(ctx.dagen)]
  if (let_op.length) regels.push({ kop: 'Let vandaag op', tekst: let_op.join(' ') })

  return regels
}

/** Momenten waarop de agent zich meldt, en afwijkingen van je eigen gedrag. Hij houdt je niet tegen. */
export function signalen(ctx: AgentContext): Signaal[] {
  const uit: Signaal[] = []
  const dag = ctx.dagen.find((d) => d.datum === ctx.vandaag)
  const nu = nlMinuten(ctx.nu)
  const { londen, newyork } = sessieVensters(ctx.vandaag)
  const eerder = ctx.dagen.filter((d) => d.datum < ctx.vandaag)
  const afgesloten = Boolean(dag?.afgeslotenOp || dag?.besluit)

  for (const n of ctx.nieuws) {
    if (nu >= n.van - 30 && nu < n.tot) {
      uit.push({
        id: `nieuws-${n.van}`,
        soort: 'nieuws',
        tekst: `${n.naam}: ${n.niveau === 'rood' ? 'niet traden' : 'uitkijken'} van ${klokTekst(n.van)} tot ${klokTekst(n.tot)}.`,
      })
    }
  }

  for (const [naam, v] of [['Londen', londen], ['New York', newyork]] as const) {
    if (!afgesloten && nu >= v.van - 15 && nu < v.van + 15) {
      uit.push({ id: `sessie-${naam}`, soort: 'sessie', tekst: `${naam} ${nu < v.van ? `opent om ${klokTekst(v.van)}` : 'is net geopend'}.` })
    }
  }

  if (dag?.besluit?.soort === 'genomen' && !dag.resultaat) {
    const m = dag.management
    if (!m.r1 || !m.r2 || !m.r3) {
      uit.push({ id: 'management', soort: 'management', tekst: 'Je trade loopt. Houd de managementkaart erbij en vink elk niveau af.' })
    }
    if (nu >= newyork.tot) {
      uit.push({ id: 'resultaat-vandaag', soort: 'resultaat', tekst: 'De New York-sessie is voorbij. Sluit de runner en vul het resultaat in.' })
    }
  }
  for (const d of eerder.filter((x) => x.besluit?.soort === 'genomen' && !x.resultaat)) {
    uit.push({ id: `resultaat-${d.datum}`, soort: 'resultaat', tekst: `Van ${compacteDatum(d.datum)} ontbreekt nog het resultaat.` })
  }

  if (!afgesloten && !dag?.vastgelegdOp && nu >= 11 * 60 && nu < newyork.tot) {
    uit.push({ id: 'analyse-11', soort: 'analyse', tekst: 'Het is na 11:00 en er is nog geen analyse voor vandaag.' })
  }

  // Afwijkingen van je eigen gedrag.
  const plannen = eerder.filter((d) => d.vastgelegdOp).map((d) => nlMinuten(new Date(d.vastgelegdOp!)))
  if (dag?.vastgelegdOp && plannen.length >= 3) {
    const gewoon = mediaan(plannen)
    const vandaagOm = nlMinuten(new Date(dag.vastgelegdOp))
    if (vandaagOm > gewoon + 90) {
      uit.push({
        id: 'gedrag-laat',
        soort: 'gedrag',
        tekst: `Je plan staat er om ${klokTekst(vandaagOm)}. Meestal is dat rond ${klokTekst(gewoon)}.`,
      })
    }
  }
  const vorigeTrade = trades(eerder).filter((d) => d.resultaat).pop()
  const vorigeDag = [...eerder].sort((a, b) => (a.datum < b.datum ? 1 : -1))[0]
  if (dag?.vastgelegdOp && !dag.besluit && vorigeTrade && vorigeDag?.datum === vorigeTrade.datum && vorigeTrade.resultaat!.r < 0) {
    uit.push({
      id: 'gedrag-na-verlies',
      soort: 'gedrag',
      tekst: `Je vorige trade (${compacteDatum(vorigeTrade.datum)}) was een verlies. Dit is je eerste setup daarna.`,
    })
  }
  const eerderExtra = trades(eerder).map((d) => d.besluit!.aantalConfluences)
  if (dag?.checkKlaarOp && !dag.besluit && eerderExtra.length >= 3) {
    const gewoon = mediaan(eerderExtra)
    const nuExtra = oordeelVanDag(dag, ctx.instellingen).check.aantalExtra
    if (nuExtra < gewoon) {
      uit.push({
        id: 'gedrag-minder-extra',
        soort: 'gedrag',
        tekst: `Deze setup heeft ${nuExtra} extra ${nuExtra === 1 ? 'confluence' : 'confluences'}. Meestal neem je er ${kort(gewoon)}.`,
      })
    }
  }

  const uitgezet = ctx.instellingen.meldingenUit ?? []
  return uit.filter((s) => !uitgezet.includes(s.soort)).slice(0, MAX_SIGNALEN_PER_DAG)
}

/** De laatste trades als korte regels, zodat de AI ermee kan vergelijken. */
export function tradeRegels(dagen: Dag[], aantal = 15): string[] {
  return trades(dagen)
    .slice(-aantal)
    .map((d) => {
      const delen = [
        compacteDatum(d.datum),
        d.analyse.richting ?? '',
        d.analyse.model ? MODEL_NAMEN[d.analyse.model] : '',
        d.analyse.sessie ? SESSIE_NAMEN[d.analyse.sessie] : '',
        `${d.besluit!.aantalConfluences} extra`,
        d.resultaat ? `${metTeken(d.resultaat.r)}R` : 'resultaat onbekend',
        d.resultaat?.foutlabels.length ? `fouten: ${d.resultaat.foutlabels.join(', ')}` : '',
        d.resultaat ? `nabespreking: ${d.resultaat.nabespreking.replace(/\s+/g, ' ').slice(0, 160)}` : '',
      ]
      return delen.filter(Boolean).join(' · ')
    })
}
