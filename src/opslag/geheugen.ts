// Alles wat de agent over je weet. Dit staat op één pagina die je kunt lezen en aanpassen.

import { lees, schrijf } from './opslag'

export interface Les {
  id: string
  tekst: string
  /** Waar de les vandaan komt, bijvoorbeeld 'weekoverzicht' of 'zelf toegevoegd'. */
  bron: string
  datum: string
}

export interface Geheugen {
  /** Goedgekeurde lessen. Alleen deze tellen mee in de briefing. */
  lessen: Les[]
  /** "Zo analyseer ik": correcties die de AI bij elke analyse meekrijgt. */
  werkwijze: string[]
  /** Voorstellen van de agent die nog op goedkeuring wachten. */
  voorstellen: Les[]
}

const SLEUTEL = 'geheugen'
export const LEEG_GEHEUGEN: Geheugen = { lessen: [], werkwijze: [], voorstellen: [] }

export async function leesGeheugen(): Promise<Geheugen> {
  return { ...LEEG_GEHEUGEN, ...(await lees<Partial<Geheugen>>(SLEUTEL)) }
}

export function schrijfGeheugen(geheugen: Geheugen): Promise<void> {
  return schrijf(SLEUTEL, geheugen)
}

export const nieuwId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
