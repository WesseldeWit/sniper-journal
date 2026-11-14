// De API-sleutel staat alleen in deze browser, apart van de rest van de gegevens.
// Daardoor komt hij nooit in een back-up terecht.

const PLEK = 'sniper-journal-api-sleutel'

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
