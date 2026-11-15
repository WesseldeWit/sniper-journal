import { describe, expect, it } from 'vitest'
import { aftellen, blokkadeNu, nieuwsWaarschuwingen, venstersVoor, verwerkKalender } from './nieuws'

const feed = [
  { title: 'Fed Chairman Warsh Speaks', country: 'USD', date: '2026-11-16T12:00:00-05:00', impact: 'High', forecast: '', previous: '' },
  { title: 'Core CPI m/m', country: 'USD', date: '2026-11-17T08:30:00-05:00', impact: 'High', forecast: '0.3%', previous: '0.2%' },
  { title: 'CPI m/m', country: 'USD', date: '2026-11-17T08:30:00-05:00', impact: 'High', forecast: '0.2%', previous: '0.3%' },
  { title: 'Unemployment Claims', country: 'USD', date: '2026-11-19T08:30:00-05:00', impact: 'Medium', forecast: '199K', previous: '200K' },
  { title: 'Retail Sales m/m', country: 'USD', date: '2026-11-17T08:30:00-05:00', impact: 'High', forecast: '', previous: '' },
  { title: 'CPI y/y', country: 'GBP', date: '2026-11-18T02:00:00-05:00', impact: 'High', forecast: '', previous: '' },
  { title: 'Unemployment Claims', country: 'USD', date: '2026-11-19T08:30:00-05:00', impact: 'Low', forecast: '', previous: '' },
]

describe('kalender verwerken', () => {
  const items = verwerkKalender(feed)

  it('houdt alleen Amerikaans nieuws over dat goud kan bewegen, met het juiste niveau', () => {
    expect(items.map((i) => `${i.naam}:${i.niveau}:${i.soort}`)).toEqual([
      'Fed Chairman Warsh Speaks:rood:toespraak',
      'Core CPI m/m:rood:inflatie',
      'CPI m/m:rood:inflatie',
      'Unemployment Claims:oranje:banen',
    ])
  })

  it('rekent om naar Nederlandse tijd', () => {
    expect(items[0]).toMatchObject({ datum: '2026-11-16', minuten: 18 * 60 })
    expect(items[1]).toMatchObject({ datum: '2026-11-17', minuten: 14 * 60 + 30 })
  })

  it('rekent goed om in de weken dat de zomertijd niet gelijk loopt', () => {
    // 10 maart 2026: de VS heeft al zomertijd (UTC-4), Nederland nog niet (UTC+1). 08:30 in New York is 13:30 hier.
    const [item] = verwerkKalender([{ title: 'CPI m/m', country: 'USD', date: '2026-03-10T08:30:00-04:00', impact: 'High' }])
    expect(item).toMatchObject({ datum: '2026-03-10', minuten: 13 * 60 + 30 })
  })

  it('geeft een lege lijst bij onbruikbare invoer', () => {
    expect(verwerkKalender(null)).toEqual([])
    expect(verwerkKalender({ fout: true })).toEqual([])
  })
})

describe('blokkade', () => {
  const vensters = venstersVoor(verwerkKalender(feed), '2026-11-17', 30, 30)

  it('maakt één venster voor nieuws op hetzelfde tijdstip', () => {
    expect(vensters).toEqual([{ van: 14 * 60, tot: 15 * 60, niveau: 'rood', naam: 'Core CPI m/m, CPI m/m' }])
  })

  it('blokkeert alleen binnen een rood venster', () => {
    expect(blokkadeNu(vensters, 13 * 60 + 59)).toBeNull()
    expect(blokkadeNu(vensters, 14 * 60)?.naam).toContain('CPI')
    expect(blokkadeNu(vensters, 15 * 60)).toBeNull()
    const oranje = venstersVoor(verwerkKalender(feed), '2026-11-19', 30, 30)
    expect(blokkadeNu(oranje, 14 * 60 + 30)).toBeNull()
  })

  it('volgt de ingestelde minuten', () => {
    expect(venstersVoor(verwerkKalender(feed), '2026-11-17', 60, 15)[0]).toMatchObject({ van: 13 * 60 + 30, tot: 14 * 60 + 45 })
  })

  it('waarschuwt in de ochtend voor wat nog komt', () => {
    expect(nieuwsWaarschuwingen(vensters, 9 * 60)[0].tekst).toContain('niet traden van 14:00 tot 15:00')
    expect(nieuwsWaarschuwingen(vensters, 16 * 60)).toEqual([])
    expect(aftellen(85)).toBe('1:25')
  })
})
