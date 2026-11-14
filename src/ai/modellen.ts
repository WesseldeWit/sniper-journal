// De modellen die de AI-check kan gebruiken, met hun prijs per miljoen tokens in dollars.
// Bron: platform.claude.com/docs/en/about-claude/pricing (gelezen op 14 november 2026).

export const MODELLEN = [
  { id: 'claude-opus-5-5', naam: 'Claude Opus 5.5', invoer: 4, uitvoer: 20, cacheLezen: 0.2, cacheSchrijven: 5 },
  { id: 'claude-sonnet-5-5', naam: 'Claude Sonnet 5.5', invoer: 2, uitvoer: 10, cacheLezen: 0.1, cacheSchrijven: 2.5 },
] as const

export type ModelId = (typeof MODELLEN)[number]['id']

export interface Verbruik {
  invoer: number
  uitvoer: number
  cacheLezen: number
  cacheSchrijven: number
}

/** Wat een aanroep heeft gekost, in dollars. */
export function kostenVan(model: ModelId, v: Verbruik): number {
  const m = MODELLEN.find((x) => x.id === model)!
  const dollars =
    (v.invoer * m.invoer + v.uitvoer * m.uitvoer + v.cacheLezen * m.cacheLezen + v.cacheSchrijven * m.cacheSchrijven) /
    1_000_000
  return Number(dollars.toFixed(5))
}
