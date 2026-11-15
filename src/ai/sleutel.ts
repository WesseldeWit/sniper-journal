// De API-sleutel staat alleen in deze browser, apart van de rest van de gegevens.
// Daardoor komt hij nooit in een back-up terecht.

const PLEK = 'sniper-journal-api-sleutel'
const MODEL_PLEK = 'sniper-journal-ai-model'

/** Het model voor de ochtendflow. Standaard het eerste uit de lijst. */
export function leesModel<T extends string>(geldig: readonly T[]): T {
  try {
    const bewaard = localStorage.getItem(MODEL_PLEK) as T | null
    return bewaard && geldig.includes(bewaard) ? bewaard : geldig[0]
  } catch {
    return geldig[0]
  }
}

export function bewaarModel(model: string): void {
  try {
    localStorage.setItem(MODEL_PLEK, model)
  } catch {
    // Niet erg: dan geldt de standaard.
  }
}

export function leesSleutel(): string {
  try {
    return localStorage.getItem(PLEK) ?? ''
  } catch {
    return ''
  }
}

export function bewaarSleutel(sleutel: string): void {
  try {
    if (sleutel.trim()) localStorage.setItem(PLEK, sleutel.trim())
    else localStorage.removeItem(PLEK)
  } catch {
    // Opslag geblokkeerd (bijvoorbeeld een privévenster): de sleutel geldt dan alleen tot je de pagina sluit.
  }
}
