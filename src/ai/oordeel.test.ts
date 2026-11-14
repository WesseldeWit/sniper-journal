import { describe, expect, it } from 'vitest'
import { EXTRA, VERPLICHT } from '../regels/check'
import { STANDAARD_INSTELLINGEN as i } from '../regels/instellingen'
import { kostenVan } from './modellen'
import { analyseUitLezing, oordeelUitLezing } from './oordeel'
import { systeemOpdracht } from './opdracht'
import { CONFLUENCE_IDS, LezingSchema, type Lezing } from './schema'

const prijs = (waarde: number | null) => ({ waarde, zekerheid: 'zeker' as const, bron: 'positietool' })

// Een long: lijn 4000, zone tot 3998,50, stop 3997,50 (25 pips), alle verplichte en twee extra's gezien.
const lezing: Lezing = {
  beschrijving: 'Long op een demandzone.',
  richting: { waarde: 'long', zekerheid: 'zeker', uitleg: 'Long-tool.' },
  entry: prijs(4000),
  stop: prijs(3997.5),
  fibLijn: prijs(4000),
  zoneRand: prijs(3998.5),
  doelen: [{ label: '1:3', prijs: 4007.5 }],
  entryModel: { waarde: null, zekerheid: 'niet_leesbaar', uitleg: 'Niet benoemd.' },
  confluences: CONFLUENCE_IDS.map((id) => ({
    id,
    gezien: ['structuur', 'supplydemand', 'liquidity', 'poc', 'imbalance'].includes(id) ? 'gezien' : 'niet_gezien',
    uitleg: 'Test.',
  })),
  twijfelpunten: [],
  vragen: [],
}

describe('schema', () => {
  it('kent precies de confluences uit de regels', () => {
    expect([...CONFLUENCE_IDS]).toEqual([...VERPLICHT, ...EXTRA].map((c) => c.id))
  })

  it('accepteert een volledige lezing en weigert een onvolledige', () => {
    expect(LezingSchema.safeParse(lezing).success).toBe(true)
    expect(LezingSchema.safeParse({ ...lezing, entry: undefined }).success).toBe(false)
  })

  it('noemt elke confluence in de opdracht en neemt de werkwijze mee', () => {
    const tekst = systeemOpdracht(['Mijn zone teken ik altijd als grijze rechthoek.'])
    for (const id of CONFLUENCE_IDS) expect(tekst).toContain(`- ${id}:`)
    expect(tekst).toContain('grijze rechthoek')
    expect(systeemOpdracht([])).not.toContain('Zo analyseert deze trader')
  })
})

describe('oordeel uit een lezing', () => {
  it('rekent met de regels van de app, niet met een mening van de AI', () => {
    const o = oordeelUitLezing(lezing, i)
    expect(o.prijzenGeldig).toBe(true)
    expect(o.analyse.stopPips).toBe(25)
    expect(o.check).toMatchObject({ goedgekeurd: true, aantalVerplicht: 4, aantalExtra: 2, risicoProcent: 0.5, lots: 2 })
  })

  it('keurt af als de afgelezen stop buiten 25 tot 30 pips valt', () => {
    const o = oordeelUitLezing({ ...lezing, stop: prijs(3995) }, i)
    expect(o.prijzenGeldig).toBe(false)
    expect(o.check.goedgekeurd).toBe(false)
  })

  it('keurt af als een prijs niet leesbaar was', () => {
    const o = oordeelUitLezing({ ...lezing, stop: { waarde: null, zekerheid: 'niet_leesbaar', bron: '' } }, i)
    expect(o.check.goedgekeurd).toBe(false)
  })

  it('telt "onduidelijk" niet als gezien', () => {
    const twijfel = {
      ...lezing,
      confluences: lezing.confluences.map((c) => (c.id === 'liquidity' ? { ...c, gezien: 'onduidelijk' as const } : c)),
    }
    expect(oordeelUitLezing(twijfel, i).check).toMatchObject({ goedgekeurd: false, aantalVerplicht: 3 })
  })

  it('herkent een diepere entry in de zone', () => {
    const dieper = { ...lezing, entry: prijs(3999), stop: prijs(3996.2) }
    expect(analyseUitLezing(dieper, i)).toMatchObject({ entryType: 'dieper', entryDieper: 3999 })
    expect(oordeelUitLezing(dieper, i).prijzenGeldig).toBe(true)
  })
})

describe('kosten', () => {
  it('rekent tokens om naar dollars', () => {
    const verbruik = { invoer: 6000, uitvoer: 2000, cacheLezen: 0, cacheSchrijven: 0 }
    expect(kostenVan('claude-opus-5-5', verbruik)).toBe(0.064)
    expect(kostenVan('claude-sonnet-5-5', verbruik)).toBe(0.032)
  })
})
