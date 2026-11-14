import { describe, expect, it } from 'vitest'
import { beoordeelAnalyse, LEGE_ANALYSE, type Analyse } from './analyse'
import { STANDAARD_INSTELLINGEN as i } from './instellingen'

// Een geldige long: lijn 4000, zone tot 3998,50, stop 3997,50 = 25 pips.
const long: Analyse = {
  prediction: 'Verwacht een bounce op de demandzone.',
  richting: 'long',
  model: 'continuation',
  sessie: 'londen',
  fibLijn: 4000,
  zoneRand: 3998.5,
  entryType: 'lijn',
  entryDieper: null,
  stop: 3997.5,
  runnerDoel: 4012,
}

const short: Analyse = { ...long, richting: 'short', fibLijn: 4000, zoneRand: 4001.5, stop: 4002.8, runnerDoel: 3990 }

const status = (a: Analyse, id: string, screenshot = true) =>
  beoordeelAnalyse(a, screenshot, i).eisen.find((e) => e.id === id)?.status

describe('harde eisen van de analyse', () => {
  it('keurt een volledige long goed en rekent de doelen uit', () => {
    const b = beoordeelAnalyse(long, true, i)
    expect(b.geldig).toBe(true)
    expect(b.stopPips).toBe(25)
    expect(b.doelen).toEqual({ r1: 4002.5, r2: 4005, r3: 4007.5 })
  })

  it('keurt een volledige short goed', () => {
    const b = beoordeelAnalyse(short, true, i)
    expect(b.geldig).toBe(true)
    expect(b.stopPips).toBe(28)
    expect(b.doelen).toEqual({ r1: 3997.2, r2: 3994.4, r3: 3991.6 })
  })

  it('is niet geldig zolang er iets ontbreekt', () => {
    expect(beoordeelAnalyse(LEGE_ANALYSE, false, i).geldig).toBe(false)
    expect(beoordeelAnalyse(long, false, i).geldig).toBe(false)
    expect(beoordeelAnalyse({ ...long, sessie: null }, true, i).geldig).toBe(false)
    // Het entry-model is geen harde eis meer: het telt als extra confluence.
    expect(beoordeelAnalyse({ ...long, model: null }, true, i).geldig).toBe(true)
    expect(beoordeelAnalyse({ ...long, prediction: '  ' }, true, i).geldig).toBe(false)
  })

  it('weigert een zone aan de verkeerde kant van de lijn', () => {
    expect(status({ ...long, zoneRand: 4001 }, 'zone')).toBe('fout')
    expect(status({ ...short, zoneRand: 3999 }, 'zone')).toBe('fout')
  })

  it('staat een diepere entry in de zone toe, maar niet erbuiten', () => {
    const dieper: Analyse = { ...long, entryType: 'dieper', entryDieper: 3999, stop: 3996.2 }
    expect(beoordeelAnalyse(dieper, true, i).geldig).toBe(true)
    expect(status({ ...dieper, entryDieper: 3998 }, 'entry')).toBe('fout') // onder de zone
    expect(status({ ...dieper, entryDieper: 4000.5 }, 'entry')).toBe('fout') // boven de lijn
  })

  it('weigert een stop die niet achter de zone ligt', () => {
    expect(status({ ...long, stop: 3999 }, 'stopzone')).toBe('fout')
    expect(status({ ...short, stop: 4001 }, 'stopzone')).toBe('fout')
  })

  it('weigert een stop buiten 25 tot 30 pips', () => {
    expect(status({ ...long, stop: 3997.6 }, 'stoppips')).toBe('fout') // 24 pips
    expect(status({ ...long, stop: 3997 }, 'stoppips')).toBe('ok') // 30 pips
    expect(status({ ...long, stop: 3996.9 }, 'stoppips')).toBe('fout') // 31 pips
  })

  it('maakt de setup ongeldig als de stop bij een diepere entry niet meer past', () => {
    // Zone van 4 dollar diep: vanaf de lijn is de rand al 40 pips weg.
    const breed: Analyse = { ...long, zoneRand: 3996, stop: 3995.9 }
    expect(beoordeelAnalyse(breed, true, i).geldig).toBe(false)
  })

  it('weigert een runnerdoel aan de verlieskant, maar het doel mag leeg blijven', () => {
    expect(status({ ...long, runnerDoel: 3990 }, 'runner')).toBe('fout')
    expect(beoordeelAnalyse({ ...long, runnerDoel: null }, true, i).geldig).toBe(true)
  })
})
