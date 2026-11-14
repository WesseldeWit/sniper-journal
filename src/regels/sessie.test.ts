import { describe, expect, it } from 'vitest'
import { isHandelsdag, sessieStatus, volgendeHandelsdag } from './sessie'

describe('sessies', () => {
  // Maandag 16 november 2026 (wintertijd: Londen = UTC, New York = UTC-5).
  it('kent alleen Londen in de ochtend', () => {
    expect(sessieStatus(new Date('2026-11-16T09:00:00Z'))).toEqual({ londen: true, newyork: false })
  })
  it('kent de overlap in de middag', () => {
    expect(sessieStatus(new Date('2026-11-16T14:00:00Z'))).toEqual({ londen: true, newyork: true })
  })
  it('kent alleen New York in de avond', () => {
    expect(sessieStatus(new Date('2026-11-16T20:00:00Z'))).toEqual({ londen: false, newyork: true })
  })
  it('is dicht in de Aziatische uren en in het weekend', () => {
    expect(sessieStatus(new Date('2026-11-16T03:00:00Z'))).toEqual({ londen: false, newyork: false })
    expect(sessieStatus(new Date('2026-11-14T14:00:00Z'))).toEqual({ londen: false, newyork: false })
  })
  it('volgt de zomertijd', () => {
    // 15 juni: Londen = UTC+1, dus 07:30 UTC is 08:30 in Londen.
    expect(sessieStatus(new Date('2026-06-15T07:30:00Z')).londen).toBe(true)
  })
})

describe('handelsdagen', () => {
  const pauzes = [{ van: '2026-12-21', tot: '2027-01-01' }]
  it('sluit weekend en pauzes uit', () => {
    expect(isHandelsdag('2026-11-13', pauzes)).toBe(true)
    expect(isHandelsdag('2026-11-14', pauzes)).toBe(false)
    expect(isHandelsdag('2026-12-23', pauzes)).toBe(false)
  })
  it('vindt de eerstvolgende handelsdag', () => {
    expect(volgendeHandelsdag('2026-11-14', [])).toBe('2026-11-16')
    expect(volgendeHandelsdag('2026-11-13', [])).toBe('2026-11-16')
    expect(volgendeHandelsdag('2026-12-18', pauzes)).toBe('2027-01-04')
  })
})
