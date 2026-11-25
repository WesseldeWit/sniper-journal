import { describe, expect, it } from 'vitest'
import { foutenInResultaat, inGeld, regeltrouw, type Resultaat, type ResultaatInvoer } from './resultaat'
import { berekenStreak, scoreVanDag, type DagVoorStreak } from './streak'

const invoer: ResultaatInvoer = {
  r: 2.6,
  verstVoor: 4,
  verstTegen: 0.3,
  entryVolgensPlan: true,
  stopVolgensPlan: true,
  exitsVolgensPlan: true,
  foutlabels: [],
  nabespreking: 'Schema gevolgd.',
}

const resultaat = (deel: Partial<Resultaat> = {}): Resultaat => ({
  r: -1,
  verstVoor: 0.5,
  verstTegen: 1,
  entryVolgensPlan: true,
  stopVolgensPlan: true,
  exitsVolgensPlan: true,
  foutlabels: [],
  nabespreking: 'Stop geraakt.',
  heeftScreenshot: false,
  opgeslagenOp: '2026-11-16T15:00:00.000Z',
  ...deel,
})

describe('resultaat controleren', () => {
  it('keurt een volledig resultaat goed', () => {
    expect(foutenInResultaat(invoer)).toEqual([])
  })

  it('weigert een onvolledig resultaat', () => {
    expect(foutenInResultaat({ ...invoer, r: null }).length).toBe(1)
    expect(foutenInResultaat({ ...invoer, exitsVolgensPlan: null }).length).toBe(1)
    expect(foutenInResultaat({ ...invoer, nabespreking: ' ' }).length).toBe(0)
  })

  it('weigert een uitkomst die niet past bij de verste standen', () => {
    expect(foutenInResultaat({ ...invoer, r: 3, verstVoor: 2 }).length).toBe(1)
    expect(foutenInResultaat({ ...invoer, r: -1, verstTegen: 0.5 }).length).toBe(1)
    expect(foutenInResultaat({ ...invoer, r: -1, verstVoor: 0.2, verstTegen: 1 })).toEqual([])
  })

  it('rekent R om naar dollars en procenten', () => {
    expect(inGeld(2.6, { bedrag: 750, risicoProcent: 0.75 })).toEqual({ dollars: 1950, procent: 1.95 })
    expect(inGeld(-1, { bedrag: 500, risicoProcent: 0.5 })).toEqual({ dollars: -500, procent: -0.5 })
  })
})

describe('regeltrouw', () => {
  it('telt een verlies volgens de regels als goede trade', () => {
    expect(regeltrouw(false, resultaat({ r: -1 })).volgensRegels).toBe(true)
  })

  it('telt een winst buiten de regels als regelbreuk', () => {
    expect(regeltrouw(false, resultaat({ r: 3, stopVolgensPlan: false })).volgensRegels).toBe(false)
    expect(regeltrouw(false, resultaat({ r: 3, foutlabels: ['fomo'] })).volgensRegels).toBe(false)
  })

  it('telt een ongeplande trade altijd als regelbreuk', () => {
    const score = regeltrouw(true, resultaat())
    expect(score.volgensRegels).toBe(false)
    expect(score.redenen[0]).toContain('Ongepland')
  })
})

describe('streak', () => {
  const dag = (datum: string, deel: Partial<DagVoorStreak> = {}): DagVoorStreak => ({
    datum,
    analyse: { prediction: 'Analyse gedaan.' },
    vastgelegdOp: null,
    besluit: null,
    resultaat: null,
    ...deel,
  })
  const genomen = { soort: 'genomen' as const, ongepland: false }
  const nietGenomen = { soort: 'niet-genomen' as const, ongepland: false }

  it('telt dagen zonder trade mee', () => {
    expect(scoreVanDag(dag('2026-11-16'))).toBe('goed')
    expect(scoreVanDag(dag('2026-11-16', { besluit: nietGenomen }))).toBe('goed')
    expect(scoreVanDag(dag('2026-11-16', { analyse: { prediction: '' } }))).toBe('neutraal')
  })

  it('telt een verlies volgens de regels mee en breekt op een regelbreuk', () => {
    const dagen = [
      dag('2026-11-16', { besluit: genomen, resultaat: resultaat({ foutlabels: ['revenge'] }) }),
      dag('2026-11-17'),
      dag('2026-11-18', { besluit: genomen, resultaat: resultaat({ r: -1 }) }),
      dag('2026-11-19', { besluit: nietGenomen }),
    ]
    expect(berekenStreak(dagen, '2026-11-19')).toBe(3)
    expect(berekenStreak(dagen, '2026-11-16')).toBe(0)
  })

  it('laat een trade zonder resultaat en dagen in de toekomst buiten beschouwing', () => {
    const dagen = [
      dag('2026-11-16'),
      dag('2026-11-17', { besluit: genomen }),
      dag('2026-11-18'),
      dag('2026-11-20'),
    ]
    expect(berekenStreak(dagen, '2026-11-18')).toBe(2)
  })
})
