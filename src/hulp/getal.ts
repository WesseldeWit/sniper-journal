// Getallen tonen en lezen op de Nederlandse manier (komma als decimaalteken).

export function dollars(n: number): string {
  const heel = Number.isInteger(n)
  const bedrag = Math.abs(n).toLocaleString('nl-NL', { minimumFractionDigits: heel ? 0 : 2, maximumFractionDigits: 2 })
  return (n < 0 ? '-$' : '$') + bedrag
}

/** Getal met een plusteken ervoor als het positief is, bijvoorbeeld +2,6 of -1. */
export function metTeken(n: number): string {
  return (n > 0 ? '+' : '') + kort(n)
}

export function getal(n: number, decimalen = 2): string {
  return n.toLocaleString('nl-NL', { minimumFractionDigits: decimalen, maximumFractionDigits: decimalen })
}

/** Getal zonder overbodige nullen, bijvoorbeeld 0,75 of 100. */
export function kort(n: number): string {
  return n.toLocaleString('nl-NL', { maximumFractionDigits: 6, useGrouping: false })
}

/** Leest '0,75' en '0.75'. Geeft NaN bij iets wat geen getal is. */
export function leesGetal(tekst: string, negatiefMag = false): number {
  const schoon = tekst.trim().replace(',', '.').replace(/^\+/, '')
  const patroon = negatiefMag ? /^-?\d*\.?\d*$/ : /^\d*\.?\d*$/
  if (schoon === '' || schoon === '-' || schoon === '.' || !patroon.test(schoon)) return NaN
  return Number(schoon)
}
