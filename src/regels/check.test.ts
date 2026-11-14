import { describe, expect, it } from 'vitest'
import { beoordeelCheck, EXTRA, verdeelLots, werkConfluencesBij, type CheckInvoer, type ConfluenceId } from './check'
import { STANDAARD_INSTELLINGEN as i } from './instellingen'

// De drie verplichte confluences die je zelf aanvinkt. Fibonacci volgt automatisch uit het plan.
const verplicht: ConfluenceId[] = ['structuur', 'supplydemand', 'liquidity']
// Extra's die je zelf aanvinkt. Entry models volgt automatisch uit het gekozen model.
const handExtra = EXTRA.map((c) => c.id).filter((id) => id !== 'entrymodel')

/** Een check met alle verplichte confluences en n zelf aangevinkte extra's, zonder entry-model. */
const check = (n: number, deel: Partial<CheckInvoer> = {}) =>
  beoordeelCheck(
    {
      planVast: true,
      heeftModel: false,
      stopPips: 25,
      confluences: [...verplicht, ...handExtra.slice(0, n)],
      gekozenRisico: null,
      ...deel,
    },
    i,
  )

describe('oordeel van de check', () => {
  it('keurt af zonder extra confluence, ook als alle verplichte er zijn', () => {
    const o = check(0)
    expect(o).toMatchObject({ aantalVerplicht: 4, aantalExtra: 0, goedgekeurd: false, lots: null })
    expect(o.redenen).toHaveLength(1)
  })

  it('keurt af als een verplichte confluence ontbreekt, hoeveel extra er ook zijn', () => {
    for (const mist of verplicht) {
      const o = check(5, { confluences: [...verplicht.filter((c) => c !== mist), ...handExtra] })
      expect(o.goedgekeurd).toBe(false)
      expect(o.aantalVerplicht).toBe(3)
    }
  })

  it('geeft het risico en de lotsize per aantal extra confluences', () => {
    expect(check(1)).toMatchObject({ goedgekeurd: true, risicoProcent: 0.5, bedrag: 500, lots: 2 })
    expect(check(2)).toMatchObject({ goedgekeurd: true, risicoProcent: 0.5, bedrag: 500, lots: 2 })
    expect(check(3)).toMatchObject({ goedgekeurd: true, risicoProcent: 0.75, bedrag: 750, lots: 3 })
    expect(check(4)).toMatchObject({ goedgekeurd: true, risicoProcent: 0.75, bedrag: 750, lots: 3 })
    expect(check(5)).toMatchObject({ goedgekeurd: true, risicoProcent: 1, bedrag: 1000, lots: 4 })
    expect(check(5, { heeftModel: true })).toMatchObject({ aantalExtra: 6, risicoProcent: 1, lots: 4 })
  })

  it('telt Fibonacci en Entry models automatisch, niet via een vinkje', () => {
    // Zonder vastgelegd plan is Fibonacci er niet, ook al staat het vinkje in de lijst.
    const zonderPlan = check(3, { planVast: false, confluences: [...verplicht, 'fibonacci', ...handExtra.slice(0, 3)] })
    expect(zonderPlan).toMatchObject({ aantalVerplicht: 3, goedgekeurd: false })
    // Een aangevinkt entry-model telt niet als er in de analyse geen model is gekozen.
    expect(check(0, { confluences: [...verplicht, 'entrymodel'] })).toMatchObject({ aantalExtra: 0 })
    // Met een gekozen model is dat ene extra genoeg voor een geldige trade.
    expect(check(0, { heeftModel: true })).toMatchObject({ aantalExtra: 1, goedgekeurd: true, risicoProcent: 0.5 })
  })

  it('telt dubbele of onbekende confluences niet mee', () => {
    const dubbel = [...verplicht, 'poc', 'poc', 'nep'] as ConfluenceId[]
    expect(check(0, { confluences: dubbel })).toMatchObject({ aantalExtra: 1, risicoProcent: 0.5 })
  })

  it('staat een lager risico toe, maar nooit een hoger', () => {
    expect(check(5, { gekozenRisico: 0.25 })).toMatchObject({ risicoProcent: 0.25, bedrag: 250, lots: 1 })
    expect(check(1, { gekozenRisico: 1 })).toMatchObject({ risicoProcent: 0.5, lots: 2 })
    expect(check(5, { gekozenRisico: 5 })).toMatchObject({ risicoProcent: 1, lots: 4 })
  })

  it('laat een plafond (later: de AI) het risico alleen verlagen', () => {
    expect(check(5, { risicoPlafond: 0.5 })).toMatchObject({ maxRisico: 0.5, risicoProcent: 0.5 })
    expect(check(1, { risicoPlafond: 1 })).toMatchObject({ maxRisico: 0.5, risicoProcent: 0.5 })
  })
})

describe('oude vinkjes omzetten', () => {
  it('hernoemt de zone en laat vervallen confluences weg', () => {
    expect(werkConfluencesBij(['structuur', 'zone', 'vers', 'vertrek', 'imbalance', 'liquidity', 'poc'])).toEqual([
      'structuur',
      'supplydemand',
      'imbalance',
      'liquidity',
      'poc',
    ])
  })
})

describe('verdeling over de exits', () => {
  it('verdeelt 20%, 60% en de rest', () => {
    expect(verdeelLots(4, i)).toEqual({ opR2: 0.8, opR3: 2.4, runner: 0.8 })
    expect(verdeelLots(2, i)).toEqual({ opR2: 0.4, opR3: 1.2, runner: 0.4 })
  })

  it('rondt de delen naar beneden af en geeft de rest aan de runner', () => {
    const v = verdeelLots(1.66, i)
    expect(v).toEqual({ opR2: 0.33, opR3: 0.99, runner: 0.34 })
    expect(Number((v.opR2 + v.opR3 + v.runner).toFixed(2))).toBe(1.66)
  })
})
