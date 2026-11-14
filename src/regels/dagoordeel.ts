// Voegt de analyse en de check samen tot één oordeel over een dag.

import { beoordeelAnalyse, type Analyse, type Beoordeling } from './analyse'
import { beoordeelCheck, type ConfluenceId, type Oordeel } from './check'
import type { Instellingen } from './instellingen'

export interface DagInvoer {
  analyse: Analyse
  vastgelegdOp: string | null
  heeftScreenshot: boolean
  confluences: ConfluenceId[]
  risicoProcent: number | null
}

export function oordeelVanDag(dag: DagInvoer, i: Instellingen): { analyse: Beoordeling; check: Oordeel } {
  const analyse = beoordeelAnalyse(dag.analyse, dag.heeftScreenshot, i)
  const check = beoordeelCheck(
    {
      // Vastgelegd telt alleen als de harde eisen ook nu nog kloppen (bijvoorbeeld na een gewijzigde instelling).
      planVast: dag.vastgelegdOp !== null && analyse.geldig,
      heeftModel: dag.analyse.model !== null,
      stopPips: analyse.stopPips,
      confluences: dag.confluences,
      gekozenRisico: dag.risicoProcent,
    },
    i,
  )
  return { analyse, check }
}
