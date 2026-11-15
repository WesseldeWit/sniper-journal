import { describe, expect, it } from 'vitest'
import { ftmoStand } from './ftmo'
import { klokTekst, sessieVensters } from './sessie'

describe('FTMO-stand', () => {
  it('begint met de volle buffer', () => {
    expect(ftmoStand([], 100000)).toMatchObject({ winst: 0, buffer: 10000, ondergrens: 90000, besteDagProcent: null })
  })

  it('laat de ondergrens meebewegen met het hoogste eindsaldo', () => {
    const stand = ftmoStand(
      [
        { datum: '2026-11-16', bedrag: 2000 },
        { datum: '2026-11-17', bedrag: -500 },
      ],
      100000,
    )
    expect(stand).toMatchObject({ winst: 1500, winstProcent: 1.5, hoogsteSaldo: 102000, ondergrens: 92000, buffer: 9500 })
  })

  it('rekent het aandeel van de beste dag uit', () => {
    const stand = ftmoStand(
      [
        { datum: '2026-11-16', bedrag: 3000 },
        { datum: '2026-11-17', bedrag: 1000 },
      ],
      100000,
    )
    expect(stand.besteDagProcent).toBe(75)
  })
})

describe('sessies in Nederlandse tijd', () => {
  const tekst = (datum: string) => {
    const v = sessieVensters(datum)
    return `${klokTekst(v.londen.van)}-${klokTekst(v.londen.tot)} ${klokTekst(v.newyork.van)}-${klokTekst(v.newyork.tot)}`
  }
  it('in de winter', () => expect(tekst('2026-11-16')).toBe('09:00-18:00 14:00-23:00'))
  it('in de zomer', () => expect(tekst('2026-06-15')).toBe('09:00-18:00 14:00-23:00'))
  it('in de weken dat de VS al zomertijd heeft en Europa nog niet', () =>
    expect(tekst('2026-03-16')).toBe('09:00-18:00 13:00-22:00'))
})
