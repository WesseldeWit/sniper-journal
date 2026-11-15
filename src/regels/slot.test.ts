import { describe, expect, it } from 'vitest'
import { STANDAARD_INSTELLINGEN as basis } from './instellingen'
import { magRegelsWijzigen, regelWijzigingen } from './slot'

describe('regels op slot', () => {
  it('is dicht tijdens Londen en New York en open daarbuiten', () => {
    expect(magRegelsWijzigen(new Date('2026-11-16T10:00:00Z'))).toBe(false) // maandag 11:00, Londen open
    expect(magRegelsWijzigen(new Date('2026-11-16T20:00:00Z'))).toBe(false) // maandag 21:00, New York open
    expect(magRegelsWijzigen(new Date('2026-11-16T06:00:00Z'))).toBe(true) // maandag 07:00, alles dicht
    expect(magRegelsWijzigen(new Date('2026-11-16T22:30:00Z'))).toBe(true) // maandag 23:30, alles dicht
    expect(magRegelsWijzigen(new Date('2026-11-14T13:00:00Z'))).toBe(true) // zaterdag
  })

  it('ziet alleen wijzigingen die de regels raken', () => {
    expect(regelWijzigingen(basis, { ...basis, accountGrootte: 50000, pauzes: [{ van: '2026-12-21', tot: '2026-12-31' }] })).toEqual([])
    expect(regelWijzigingen(basis, { ...basis, risicoTabel: { ...basis.risicoTabel, laag: 0.25 }, nieuwsNa: 45 })).toEqual([
      { veld: 'Risico bij 1 of 2 extra confluences', oud: '0,5%', nieuw: '0,25%' },
      { veld: 'Nieuwsblokkade na het nieuws', oud: '30 min', nieuw: '45 min' },
    ])
  })
})
