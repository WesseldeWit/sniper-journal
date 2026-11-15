import { describe, expect, it } from 'vitest'
import { legeDag, type Dag } from '../opslag/dagen'
import { dagbriefing, patronen, signalen, vrijeUren, type AgentContext } from './agent'
import { STANDAARD_INSTELLINGEN } from './instellingen'
import type { Resultaat } from './resultaat'
import { maandPatronen, nabesprekingsVragen, weekOverzicht } from './terugblik'

const besluit = (extra = 3) => ({
  soort: 'genomen' as const, op: '', reden: '', ongepland: false, aantalConfluences: extra, risicoProcent: 0.75, bedrag: 750, lots: 3,
})
const resultaat = (r: number, deel: Partial<Resultaat> = {}): Resultaat => ({
  r, verstVoor: Math.max(r, 0), verstTegen: 1, entryVolgensPlan: true, stopVolgensPlan: true, exitsVolgensPlan: true,
  foutlabels: [], nabespreking: 'x', heeftScreenshot: false, opgeslagenOp: '', ...deel,
})
const trade = (datum: string, r: number | null, deel: Partial<Dag> = {}): Dag => ({
  ...legeDag(datum),
  analyse: { ...legeDag(datum).analyse, prediction: 'p', model: 'reversal1', sessie: 'newyork' },
  vastgelegdOp: `${datum}T07:30:00.000Z`,
  checkKlaarOp: `${datum}T07:40:00.000Z`,
  besluit: besluit(),
  resultaat: r === null ? null : resultaat(r),
  ...deel,
})
// Maandag 16 november 2026, 12:00 Nederlandse tijd.
const ctx = (dagen: Dag[], deel: Partial<AgentContext> = {}): AgentContext => ({
  vandaag: '2026-11-16', nu: new Date('2026-11-16T11:00:00Z'), dagen, instellingen: STANDAARD_INSTELLINGEN,
  lessen: [], nieuws: [], nieuwsBekend: false, ...deel,
})

describe('dagbriefing', () => {
  it('zegt eerlijk dat nieuws onbekend is en noemt de vrije uren', () => {
    const regels = dagbriefing(ctx([]))
    expect(regels.find((r) => r.kop === 'Nieuws')!.tekst).toContain('onbekend')
    expect(regels.find((r) => r.kop === 'Vrij om te traden')!.tekst).toContain('09:00–23:00')
  })

  it('haalt rood nieuws van de vrije uren af', () => {
    const rood = { van: 14 * 60, tot: 15 * 60, niveau: 'rood' as const, naam: 'CPI' }
    expect(vrijeUren('2026-11-16', [rood])).toEqual([{ van: 540, tot: 840 }, { van: 900, tot: 1380 }])
  })

  it('noemt de vorige dag, wat openstaat en je lessen', () => {
    const regels = dagbriefing(ctx([trade('2026-11-12', null), trade('2026-11-13', -1)], { lessen: ['Wacht op de candle.'] }))
    expect(regels.find((r) => r.kop === 'Vorige dag')!.tekst).toContain('-1R')
    expect(regels.find((r) => r.kop === 'Staat nog open')!.tekst).toContain('12 nov')
    expect(regels.find((r) => r.kop === 'Let vandaag op')!.tekst).toContain('Wacht op de candle.')
  })
})

describe('patronen en signalen', () => {
  const drieVerliezen = [trade('2026-11-10', -1), trade('2026-11-11', -1), trade('2026-11-12', -1)]

  it('ziet drie verliezen met hetzelfde model en dezelfde sessie', () => {
    expect(patronen(drieVerliezen)[0]).toContain('trend reversal 1 in de New York-sessie')
  })

  it('herinnert na 11:00 aan een ontbrekende analyse, en niet als die soort is uitgezet', () => {
    expect(signalen(ctx([])).map((s) => s.soort)).toContain('analyse')
    const uit = { ...STANDAARD_INSTELLINGEN, meldingenUit: ['analyse'] }
    expect(signalen(ctx([], { instellingen: uit })).map((s) => s.soort)).not.toContain('analyse')
  })

  it('meldt een setup direct na een verlies, zonder iets te blokkeren', () => {
    const vandaag = trade('2026-11-16', null, { besluit: null })
    const s = signalen(ctx([trade('2026-11-13', -1), vandaag]))
    expect(s.some((x) => x.id === 'gedrag-na-verlies')).toBe(true)
  })

  it('geeft nooit meer dan vijf signalen', () => {
    const veel = ['02', '03', '04', '05', '06', '09', '10'].map((d) => trade(`2026-11-${d}`, null))
    expect(signalen(ctx(veel)).length).toBe(5)
  })
})

describe('terugkijken', () => {
  it('maakt een weekoverzicht met de vaakste fout en een voorstel', () => {
    const week = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13']
    const dagen = [
      trade('2026-11-10', 2.6),
      trade('2026-11-11', -1, { resultaat: resultaat(-1, { foutlabels: ['fomo'] }) }),
      trade('2026-11-12', -1),
    ]
    const o = weekOverzicht(dagen, week)
    expect(o).toMatchObject({ trades: 3, afgerond: 3, totaalR: 0.6, volgensRegels: 2, vaaksteFout: 'FOMO (1 keer)' })
    expect(o.voorstel).toContain('FOMO')
  })

  it('benoemt bij weinig trades dat de cijfers niets bewijzen', () => {
    const m = maandPatronen([trade('2026-11-10', 1), trade('2026-11-11', -1), trade('2026-11-12', 2)])
    expect(m.zinnen.some((z) => z.includes('New York'))).toBe(true)
    expect(m.voorbehoud).toContain('geen bewijs')
  })

  it('kiest vragen die passen bij de trade', () => {
    expect(nabesprekingsVragen({ r: -1, volgensPlan: true, heeftFoutlabel: false })[0]).toContain('opnieuw nemen')
    expect(nabesprekingsVragen({ r: 2, volgensPlan: false, heeftFoutlabel: false })[0]).toContain('week je af')
  })
})
