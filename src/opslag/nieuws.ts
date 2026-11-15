// Haalt de economische kalender op en bewaart de laatste versie.
// Lokaal loopt het ophalen via het ontwikkelprogramma; online zet GitHub het bestand elk uur klaar.

import { useEffect, useState } from 'react'
import { verwerkKalender, type NieuwsItem } from '../regels/nieuws'
import { lees, schrijf } from './opslag'

const SLEUTEL = 'nieuws'
const ADRES = './nieuws/thisweek.json'
const VERVERS_MS = 30 * 60 * 1000
/** Ouder dan dit telt de kalender als onbekend. */
const TE_OUD_MS = 12 * 60 * 60 * 1000

interface Bewaard {
  opgehaaldOp: string
  items: NieuwsItem[]
}

export interface NieuwsStand {
  items: NieuwsItem[]
  /** Onwaar als het ophalen niet lukte en er geen recente versie is: "nieuws onbekend, controleer zelf". */
  bekend: boolean
  opgehaaldOp: string | null
}

async function haalOp(): Promise<Bewaard> {
  const antwoord = await fetch(ADRES, { cache: 'no-store' })
  if (!antwoord.ok) throw new Error(`kalender niet bereikbaar (${antwoord.status})`)
  const ruw: unknown = await antwoord.json()
  if (!Array.isArray(ruw)) throw new Error('kalender heeft een onbekende vorm')
  const bewaard = { opgehaaldOp: new Date().toISOString(), items: verwerkKalender(ruw) }
  await schrijf(SLEUTEL, bewaard)
  return bewaard
}

const stand = (b: Bewaard | undefined): NieuwsStand => ({
  items: b?.items ?? [],
  bekend: Boolean(b && Date.now() - new Date(b.opgehaaldOp).getTime() < TE_OUD_MS),
  opgehaaldOp: b?.opgehaaldOp ?? null,
})

/** De kalender van deze week. Ververst zichzelf elk half uur zolang de app open staat. */
export function useNieuws(): NieuwsStand {
  const [nieuws, setNieuws] = useState<NieuwsStand>({ items: [], bekend: false, opgehaaldOp: null })

  useEffect(() => {
    let actueel = true
    const ververs = async () => {
      const bewaard = await lees<Bewaard>(SLEUTEL)
      if (actueel) setNieuws(stand(bewaard))
      if (bewaard && Date.now() - new Date(bewaard.opgehaaldOp).getTime() < VERVERS_MS) return
      try {
        const nieuw = await haalOp()
        if (actueel) setNieuws(stand(nieuw))
      } catch {
        // Ophalen mislukt: de laatste versie blijft staan tot hij te oud is.
      }
    }
    void ververs()
    const timer = setInterval(() => void ververs(), VERVERS_MS)
    return () => {
      actueel = false
      clearInterval(timer)
    }
  }, [])

  return nieuws
}
