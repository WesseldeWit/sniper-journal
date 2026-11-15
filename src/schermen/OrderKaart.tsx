import { useState } from 'react'
import Icoon from '../onderdelen/Icoon'

export interface OrderRegel {
  naam: string
  /** Zoals je het leest. */
  tekst: string
  /** Zoals je het in het platform plakt: met een punt als decimaalteken. */
  kopie: string
}

/** Eén scherm met wat je in het platform invoert. Elke waarde groot, met een kopieerknop. */
export default function OrderKaart({ regels }: { regels: OrderRegel[] }) {
  const [gekopieerd, setGekopieerd] = useState<string | null>(null)

  async function kopieer(regel: OrderRegel) {
    try {
      await navigator.clipboard.writeText(regel.kopie)
      setGekopieerd(regel.naam)
      setTimeout(() => setGekopieerd((nu) => (nu === regel.naam ? null : nu)), 1500)
    } catch {
      setGekopieerd(null)
    }
  }

  return (
    <div className="orderkaart">
      <span className="bovenkop">Orderkaart · voer dit in het platform in</span>
      {regels.map((regel) => (
        <div key={regel.naam} className="order-rij">
          <span className="order-naam">{regel.naam}</span>
          <span className="order-waarde getal">{regel.tekst}</span>
          <button className="knop order-knop" onClick={() => void kopieer(regel)} aria-label={`Kopieer ${regel.naam}`}>
            <Icoon naam={gekopieerd === regel.naam ? 'vink' : 'kopie'} maat={18} />
            {gekopieerd === regel.naam ? 'Gekopieerd' : 'Kopieer'}
          </button>
        </div>
      ))}
    </div>
  )
}
