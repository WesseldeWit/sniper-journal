import { describe, expect, it } from 'vitest'
import {
  foutenBijGenomen,
  isOpSlot,
  magAfsluiten,
  isOngepland,
  magOverschrijven,
  neemTrade,
  slaOver,
  type Besluit,
  type DagMetBesluit,
} from './besluit'
import { STANDAARD_INSTELLINGEN as i } from './instellingen'

const ochtend = new Date(2026, 10, 16, 8, 30) // maandag 16 nov 2026, 08:30
const middag = new Date(2026, 10, 16, 14, 0)

// Een goedgekeurde dag: geldig plan, 's ochtends vastgelegd, alle verplichte confluences en 3 extra's
// (P.O.C. en imbalance aangevinkt, entry-model automatisch).
const dag: DagMetBesluit = {
  datum: '2026-11-16',
  analyse: {
    prediction: 'Bounce op demand.',
    richting: 'long',
    model: 'continuation',
    sessie: 'londen',
    fibLijn: 4000,
    zoneRand: 3998.5,
    entryType: 'lijn',
    entryDieper: null,
    stop: 3997.5,
    runnerDoel: null,
  },
  vastgelegdOp: ochtend.toISOString(),
  heeftScreenshot: true,
  confluences: ['structuur', 'supplydemand', 'liquidity', 'poc', 'imbalance'],
  risicoProcent: null,
  besluit: null,
}

const genomen = (d: DagMetBesluit = dag, nu = middag) => neemTrade(d, i, nu, false)
const besluitVan = (uitkomst: ReturnType<typeof neemTrade>): Besluit => {
  if ('fouten' in uitkomst) throw new Error(uitkomst.fouten.join(' '))
  return uitkomst.besluit
}

describe('trade nemen', () => {
  it('slaat een goedgekeurde trade op met risico en lotsize van dat moment', () => {
    expect(besluitVan(genomen())).toMatchObject({
      soort: 'genomen',
      ongepland: false,
      aantalConfluences: 3,
      risicoProcent: 0.75,
      bedrag: 750,
      lots: 3,
    })
  })

  it('weigert een afgekeurde trade', () => {
    const verplichtMist = { ...dag, confluences: dag.confluences.filter((c) => c !== 'liquidity') }
    expect(genomen(verplichtMist)).toHaveProperty('fouten')
    const geenExtra = {
      ...dag,
      analyse: { ...dag.analyse, model: null },
      confluences: dag.confluences.filter((c) => c !== 'poc' && c !== 'imbalance'),
    }
    expect(genomen(geenExtra)).toHaveProperty('fouten')
    const ongeldig = { ...dag, analyse: { ...dag.analyse, stop: 3990 } }
    expect(genomen(ongeldig)).toHaveProperty('fouten')
    const geenPlan = { ...dag, vastgelegdOp: null }
    expect(genomen(geenPlan)).toHaveProperty('fouten')
  })

  it('weigert een tweede trade op dezelfde dag (One & Done)', () => {
    const opSlot = { ...dag, besluit: besluitVan(genomen()) }
    expect(genomen(opSlot)).toHaveProperty('fouten')
    expect(slaOver(opSlot, i, middag, 'Toch niet')).toHaveProperty('fouten')
    expect(foutenBijGenomen(opSlot, i, '2026-11-16')[0]).toContain('op slot')
  })

  it('weigert een trade op een dag in de toekomst', () => {
    expect(genomen({ ...dag, datum: '2026-11-17' })).toHaveProperty('fouten')
  })
})

describe('ongepland', () => {
  it('is gepland als het plan op de dag zelf is vastgelegd', () => {
    expect(isOngepland(dag, false)).toBe(false)
  })

  it('is ongepland als het plan pas een dag later is vastgelegd', () => {
    const later = { ...dag, vastgelegdOp: new Date(2026, 10, 17, 9, 0).toISOString() }
    expect(isOngepland(later, false)).toBe(true)
    expect(besluitVan(neemTrade(later, i, new Date(2026, 10, 17, 9, 5), false)).ongepland).toBe(true)
  })

  it('is ongepland als je het zelf meldt', () => {
    expect(besluitVan(neemTrade(dag, i, middag, true)).ongepland).toBe(true)
  })
})

describe('niet genomen', () => {
  it('vraagt om een reden', () => {
    expect(slaOver(dag, i, middag, '  ')).toHaveProperty('fouten')
    expect(slaOver(dag, i, middag, 'Prijs bereikte de zone niet.')).toHaveProperty('besluit')
  })

  it('kan ook bij een afgekeurde setup', () => {
    const teWeinig = { ...dag, confluences: [] }
    expect(slaOver(teWeinig, i, middag, 'Afgekeurd.')).toHaveProperty('besluit')
  })
})

describe('slot op de opslag', () => {
  const opSlot = { ...dag, besluit: besluitVan(genomen()) }

  it('laat een dag zonder genomen trade gewoon wijzigen', () => {
    expect(magOverschrijven(undefined, dag)).toBe(true)
    expect(magOverschrijven(dag, { ...dag, confluences: [] })).toBe(true)
  })

  it('weigert elke wijziging aan plan, check of besluit na een genomen trade', () => {
    expect(magOverschrijven(opSlot, { ...opSlot, besluit: null })).toBe(false)
    expect(magOverschrijven(opSlot, { ...opSlot, confluences: [] })).toBe(false)
    expect(magOverschrijven(opSlot, { ...opSlot, risicoProcent: 0.1 })).toBe(false)
    expect(magOverschrijven(opSlot, { ...opSlot, analyse: { ...opSlot.analyse, stop: 3990 } })).toBe(false)
    expect(magOverschrijven(opSlot, { ...opSlot, vastgelegdOp: null })).toBe(false)
  })

  it('laat latere onderdelen zoals het resultaat wel toe', () => {
    expect(magOverschrijven(opSlot, { ...opSlot, resultaat: { r: 2.2 } } as DagMetBesluit)).toBe(true)
  })
})

describe('dag afsluiten zonder trade', () => {
  const dicht = { ...dag, afgeslotenOp: middag.toISOString() }

  it('zet de dag op slot: geen trade en geen heropening meer', () => {
    expect(isOpSlot(dicht)).toBe(true)
    expect(genomen(dicht)).toHaveProperty('fouten')
    expect(slaOver(dicht, i, middag, 'Toch niet')).toHaveProperty('fouten')
    expect(magOverschrijven(dicht, { ...dicht, afgeslotenOp: null })).toBe(false)
    expect(magOverschrijven(dicht, { ...dicht, confluences: [] })).toBe(false)
  })

  it('kan alleen op een open dag van vandaag of eerder', () => {
    expect(magAfsluiten(dag, '2026-11-16')).toBe(true)
    expect(magAfsluiten(dicht, '2026-11-16')).toBe(false)
    expect(magAfsluiten({ ...dag, datum: '2026-11-17' }, '2026-11-16')).toBe(false)
  })
})
