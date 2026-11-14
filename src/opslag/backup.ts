// Export en import van alle gegevens als één back-upbestand.

import { leesAlles, vervangAlles } from './opslag'

const APP = 'sniper-journal'
const VERSIE = 1

export interface Backup {
  app: typeof APP
  versie: number
  gemaaktOp: string
  /** Instellingen, dagen en notities, per sleutel. */
  gegevens: Record<string, unknown>
  /** Screenshots per sleutel, als tekst (data-URL) zodat ze in het bestand passen. */
  screenshots: Record<string, string>
}

function alsTekst(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const lezer = new FileReader()
    lezer.onload = () => resolve(lezer.result as string)
    lezer.onerror = () => reject(lezer.error)
    lezer.readAsDataURL(blob)
  })
}

export async function maakBackup(): Promise<Backup> {
  const backup: Backup = { app: APP, versie: VERSIE, gemaaktOp: new Date().toISOString(), gegevens: {}, screenshots: {} }
  for (const [sleutel, waarde] of await leesAlles()) {
    if (waarde instanceof Blob) backup.screenshots[sleutel] = await alsTekst(waarde)
    else backup.gegevens[sleutel] = waarde
  }
  return backup
}

/** Controleert of een bestand een back-up van deze app is. Geeft de back-up of een foutmelding. */
export function leesBackup(tekst: string): { backup: Backup } | { fout: string } {
  let data: unknown
  try {
    data = JSON.parse(tekst)
  } catch {
    return { fout: 'Dit bestand is geen geldige back-up (het is niet te lezen).' }
  }
  const b = data as Partial<Backup> | null
  const isObject = (x: unknown) => typeof x === 'object' && x !== null && !Array.isArray(x)
  if (!isObject(b) || b!.app !== APP) return { fout: 'Dit bestand is geen back-up van Sniper Journal.' }
  if (typeof b!.versie !== 'number' || b!.versie > VERSIE) {
    return { fout: 'Deze back-up komt uit een nieuwere versie van de app.' }
  }
  if (!isObject(b!.gegevens) || !isObject(b!.screenshots)) return { fout: 'De back-up is beschadigd.' }
  if (Object.values(b!.screenshots!).some((s) => typeof s !== 'string' || !s.startsWith('data:image/'))) {
    return { fout: 'De back-up bevat een screenshot die niet te lezen is.' }
  }
  return { backup: b as Backup }
}

/** Vervangt alle gegevens op dit apparaat door de inhoud van de back-up. */
export async function zetBackupTerug(backup: Backup): Promise<void> {
  const items: [string, unknown][] = Object.entries(backup.gegevens)
  for (const [sleutel, dataUrl] of Object.entries(backup.screenshots)) {
    items.push([sleutel, await (await fetch(dataUrl)).blob()])
  }
  await vervangAlles(items)
}

/** Aantal dagen in een back-up, voor de bevestiging bij het importeren. */
export function aantalDagen(backup: Backup): number {
  return Object.keys(backup.gegevens).filter((s) => s.startsWith('dag:')).length
}

export function downloadBackup(backup: Backup): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup)], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `sniper-journal-backup-${backup.gemaaktOp.slice(0, 10)}.json`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
