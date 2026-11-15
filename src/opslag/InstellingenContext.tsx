import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  controleerInstellingen,
  STANDAARD_INSTELLINGEN,
  werkInstellingenBij,
  type Instellingen,
} from '../regels/instellingen'
import { magRegelsWijzigen, regelWijzigingen, SLOT_MELDING, type LogRegel } from '../regels/slot'
import { lees, schrijf } from './opslag'

export const LOGBOEK = 'logboek'

const SLEUTEL = 'instellingen'

interface Waarde {
  instellingen: Instellingen
  /** Slaat op als alles klopt. Geeft de lijst met fouten terug (leeg = opgeslagen). */
  bewaar: (nieuw: Instellingen) => string[]
}

const Context = createContext<Waarde | null>(null)

export function InstellingenProvider({ children }: { children: ReactNode }) {
  const [instellingen, setInstellingen] = useState<Instellingen | null>(null)

  useEffect(() => {
    lees<Record<string, unknown>>(SLEUTEL)
      .then((bewaard) => setInstellingen(werkInstellingenBij(bewaard)))
      .catch(() => setInstellingen(STANDAARD_INSTELLINGEN))
  }, [])

  if (!instellingen) return null

  const bewaar = (nieuw: Instellingen) => {
    const fouten = controleerInstellingen(nieuw)
    // Regels op slot: wat je regels raakt kan alleen in het weekend of buiten de sessies worden gewijzigd.
    const wijzigingen = regelWijzigingen(instellingen, nieuw)
    if (fouten.length === 0 && wijzigingen.length > 0) {
      const nu = new Date()
      if (!magRegelsWijzigen(nu)) return [SLOT_MELDING]
      const regels: LogRegel[] = wijzigingen.map((w) => ({ ...w, op: nu.toISOString() }))
      void lees<LogRegel[]>(LOGBOEK).then((log) => schrijf(LOGBOEK, [...regels, ...(log ?? [])]))
    }
    if (fouten.length === 0) {
      setInstellingen(nieuw)
      void schrijf(SLEUTEL, nieuw)
    }
    return fouten
  }

  return <Context.Provider value={{ instellingen, bewaar }}>{children}</Context.Provider>
}

export function useInstellingen(): Waarde {
  const waarde = useContext(Context)
  if (!waarde) throw new Error('useInstellingen hoort binnen InstellingenProvider')
  return waarde
}
