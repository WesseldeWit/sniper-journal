// Van wat de AI heeft afgelezen naar het oordeel van de app.
// De AI levert alleen waarnemingen; goedgekeurd of afgekeurd komt uit dezelfde regels als de dagkaart.

import { beoordeelAnalyse, type Analyse, type Beoordeling } from '../regels/analyse'
import { beoordeelCheck, type ConfluenceId, type Oordeel } from '../regels/check'
import type { Instellingen } from '../regels/instellingen'
import type { Lezing } from './schema'

/** Welke harde eisen gaan over prijzen? De rest (sessie, prediction, screenshot) hoort bij de dag zelf. */
export const PRIJS_EISEN = ['richting', 'zone', 'entry', 'stopzone', 'stoppips', 'runner']

export function analyseUitLezing(lezing: Lezing, i: Instellingen): Analyse {
  const entry = lezing.entry.waarde
  const lijn = lezing.fibLijn.waarde
  // Ligt de entry binnen een halve pip van de lijn, dan is het een entry op de lijn.
  const opLijn = entry === null || lijn === null || Math.abs(entry - lijn) <= i.pipGrootte / 2
  return {
    prediction: lezing.beschrijving,
    richting: lezing.richting.waarde,
    model: lezing.entryModel.waarde,
    sessie: null,
    fibLijn: lijn ?? (opLijn ? entry : null),
    zoneRand: lezing.zoneRand.waarde,
    entryType: opLijn ? 'lijn' : 'dieper',
    entryDieper: opLijn ? null : entry,
    stop: lezing.stop.waarde,
    runnerDoel: null,
  }
}

export interface LezingOordeel {
  analyse: Beoordeling
  /** Kloppen alle harde eisen die over prijzen gaan? */
  prijzenGeldig: boolean
  check: Oordeel
}

/** Het oordeel volgens de regels, alsof deze lezing het plan van vandaag was. */
export function oordeelUitLezing(lezing: Lezing, i: Instellingen): LezingOordeel {
  const invoer = analyseUitLezing(lezing, i)
  const analyse = beoordeelAnalyse(invoer, true, i)
  const prijzenGeldig = analyse.eisen.filter((e) => PRIJS_EISEN.includes(e.id)).every((e) => e.status === 'ok')
  const gezien = lezing.confluences.filter((c) => c.gezien === 'gezien').map((c) => c.id as ConfluenceId)
  const check = beoordeelCheck(
    {
      planVast: prijzenGeldig,
      heeftModel: invoer.model !== null,
      stopPips: analyse.stopPips,
      confluences: gezien,
      gekozenRisico: null,
    },
    i,
  )
  return { analyse, prijzenGeldig, check }
}
