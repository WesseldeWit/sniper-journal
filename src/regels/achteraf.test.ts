import { describe, expect, it } from 'vitest'
import { legeDag } from '../opslag/dagen'
import { legTradeAchterafVast, risicoVanAchteraf, type AchterafInvoer } from './achteraf'
import { STANDAARD_INSTELLINGEN as i } from './instellingen'
import { huidigeStap } from './dagstatus'
import { regeltrouw } from './resultaat'

const short: AchterafInvoer = { richting: 'short', entry: 2650, stop: 2652.5, lots: 1, herkomst: 'call', toelichting: '' }

describe('trade achteraf', () => {
  it('rekent risico uit stop en lots', () => {
    const r = risicoVanAchteraf(short, i)!
    expect(r.stopPips).toBe(25)
    expect(r.bedrag).toBeCloseTo(25 * i.ouncePerLot * i.pipGrootte, 2)
  })
  it('legt een ongeplande, genomen trade vast en zet de dag op slot', () => {
    const u = legTradeAchterafVast(legeDag('2026-11-25'), short, i, new Date('2026-11-25T15:00:00Z'), '2026-11-25', 'newyork', false)
    if (!('dag' in u)) throw new Error('fouten')
    expect(u.dag.besluit?.soort).toBe('genomen')
    expect(u.dag.besluit?.ongepland).toBe(true)
    expect(u.dag.afgeslotenOp).not.toBeNull()
    expect(huidigeStap(u.dag)).toBe('resultaat')
    expect(u.dag.besluit?.reden).toContain('Call van iemand anders')
  })
  it('weigert een stop aan de verkeerde kant', () => {
    const u = legTradeAchterafVast(legeDag('2026-11-25'), { ...short, stop: 2640 }, i, new Date(), '2026-11-25', null, false)
    expect('fouten' in u).toBe(true)
  })
  it('telt in de regeltrouw als ongepland', () => {
    expect(regeltrouw(true, { entryVolgensPlan: true, stopVolgensPlan: true, exitsVolgensPlan: true, foutlabels: [] }).volgensRegels).toBe(false)
  })
})

import { ftmoStand, uitkomstenVanDagen } from './ftmo'
import { scoreVanDag } from './streak'

describe('resultaat buiten de app om', () => {
  it('telt mee in de FTMO-stand en als regelbreuk', () => {
    const dag = { ...legeDag('2026-11-25'), buitenApp: 1394.46 }
    expect(ftmoStand(uitkomstenVanDagen([dag]), 50000).saldo).toBe(51394.46)
    expect(scoreVanDag(dag)).toBe('breuk')
  })
})
