import { describe, expect, it } from 'vitest'
import { aantalDagen, leesBackup } from './backup'

const goed = {
  app: 'sniper-journal',
  versie: 1,
  gemaaktOp: '2026-11-14T10:00:00.000Z',
  gegevens: { instellingen: { accountGrootte: 100000 }, 'dag:2026-11-13': { datum: '2026-11-13' }, notities: [] },
  screenshots: { 'screenshot:2026-11-13:analyse': 'data:image/png;base64,AAAA' },
}

describe('back-up lezen', () => {
  it('accepteert een back-up van deze app', () => {
    const uitkomst = leesBackup(JSON.stringify(goed))
    expect(uitkomst).toHaveProperty('backup')
    if ('backup' in uitkomst) expect(aantalDagen(uitkomst.backup)).toBe(1)
  })

  it('weigert iets wat geen back-up is', () => {
    expect(leesBackup('geen json')).toHaveProperty('fout')
    expect(leesBackup('[1,2]')).toHaveProperty('fout')
    expect(leesBackup(JSON.stringify({ ...goed, app: 'iets-anders' }))).toHaveProperty('fout')
    expect(leesBackup(JSON.stringify({ ...goed, versie: 99 }))).toHaveProperty('fout')
    expect(leesBackup(JSON.stringify({ ...goed, gegevens: null }))).toHaveProperty('fout')
    expect(leesBackup(JSON.stringify({ ...goed, screenshots: { a: 'https://voorbeeld.nl/x.png' } }))).toHaveProperty(
      'fout',
    )
  })
})
