import { describe, expect, it } from 'vitest'
import {
  controleerInstellingen,
  STANDAARD_INSTELLINGEN,
  werkInstellingenBij,
  type Instellingen,
} from './instellingen'
import { lotsize, maxRisicoProcent, pipWaardePerLot, risicoBedrag, risicoToegestaan } from './risico'

const honderd = STANDAARD_INSTELLINGEN
const vijftig: Instellingen = { ...STANDAARD_INSTELLINGEN, accountGrootte: 50000 }

function lots(i: Instellingen, confluences: number, stopPips: number) {
  return lotsize(risicoBedrag(maxRisicoProcent(confluences, i)!, i), stopPips, i)
}

describe('risicotabel', () => {
  it('geeft het risico uit het plan per aantal extra confluences', () => {
    expect([1, 2].map((n) => maxRisicoProcent(n, honderd))).toEqual([0.5, 0.5])
    expect([3, 4].map((n) => maxRisicoProcent(n, honderd))).toEqual([0.75, 0.75])
    expect([5, 6].map((n) => maxRisicoProcent(n, honderd))).toEqual([1, 1])
  })

  it('geeft geen risico zonder extra confluence', () => {
    expect(maxRisicoProcent(0, honderd)).toBeNull()
    expect(maxRisicoProcent(-1, honderd)).toBeNull()
  })

  it('komt nooit boven de 1%, ook niet met een verkeerde tabel', () => {
    const teHoog = { ...honderd, risicoTabel: { laag: 2, midden: 3, hoog: 5 } }
    expect([1, 3, 6].map((n) => maxRisicoProcent(n, teHoog))).toEqual([1, 1, 1])
  })

  it('rekent het bedrag uit', () => {
    expect(risicoBedrag(0.5, honderd)).toBe(500)
    expect(risicoBedrag(0.75, vijftig)).toBe(375)
  })

  it('staat lager toe, hoger niet', () => {
    expect(risicoToegestaan(0.5, 1, honderd)).toBe(true)
    expect(risicoToegestaan(0.25, 2, honderd)).toBe(true)
    expect(risicoToegestaan(0.51, 2, honderd)).toBe(false)
    expect(risicoToegestaan(1, 4, honderd)).toBe(false)
    expect(risicoToegestaan(1.01, 6, honderd)).toBe(false)
    expect(risicoToegestaan(0.5, 0, honderd)).toBe(false)
  })
})

describe('lotsize', () => {
  it('rekent met $10 per pip per lot', () => {
    expect(pipWaardePerLot(honderd)).toBe(10)
  })

  it('komt overeen met de tabel uit het plan', () => {
    // Kolommen: 1-2, 3-4 en 5-6 extra confluences (0,5%, 0,75% en 1%).
    expect([lots(honderd, 2, 25), lots(honderd, 4, 25), lots(honderd, 6, 25)]).toEqual([2, 3, 4])
    expect([lots(honderd, 1, 30), lots(honderd, 3, 30), lots(honderd, 5, 30)]).toEqual([1.66, 2.5, 3.33])
    expect([lots(vijftig, 2, 25), lots(vijftig, 4, 25), lots(vijftig, 6, 25)]).toEqual([1, 1.5, 2])
    expect([lots(vijftig, 1, 30), lots(vijftig, 3, 30), lots(vijftig, 5, 30)]).toEqual([0.83, 1.25, 1.66])
  })

  it('rondt altijd naar beneden af', () => {
    expect(lotsize(500, 26, honderd)).toBe(1.92) // 1,923...
    expect(lotsize(500, 29, honderd)).toBe(1.72) // 1,724...
    expect(lotsize(1, 30, honderd)).toBe(0) // te klein voor 0,01 lot
  })

  it('geeft 0 bij onzinnige invoer', () => {
    expect(lotsize(500, 0, honderd)).toBe(0)
    expect(lotsize(-5, 25, honderd)).toBe(0)
  })
})

describe('instellingen controleren', () => {
  it('keurt de standaard goed', () => {
    expect(controleerInstellingen(honderd)).toEqual([])
  })

  it('weigert een risico boven 1%', () => {
    const fout = { ...honderd, risicoTabel: { laag: 0.5, midden: 0.75, hoog: 1.5 } }
    expect(controleerInstellingen(fout).length).toBeGreaterThan(0)
  })

  it('weigert een tabel die bij minder confluences meer risico geeft', () => {
    const fout = { ...honderd, risicoTabel: { laag: 1, midden: 0.75, hoog: 1 } }
    expect(controleerInstellingen(fout).length).toBeGreaterThan(0)
  })

  it('zet een oude risicotabel (5, 6, 7 confluences) om naar de treden', () => {
    const oud = { accountGrootte: 50000, risicoTabel: { 5: 0.4, 6: 0.6, 7: 0.9 } }
    expect(werkInstellingenBij(oud)).toMatchObject({
      accountGrootte: 50000,
      risicoTabel: { laag: 0.4, midden: 0.6, hoog: 0.9 },
    })
    expect(werkInstellingenBij(undefined)).toEqual(honderd)
  })
})
