import { useState } from 'react'
import { compacteDatum } from '../hulp/datum'
import { useInstellingen } from '../opslag/InstellingenContext'

export default function PauzeBlok() {
  const { instellingen, bewaar } = useInstellingen()
  const [van, setVan] = useState('')
  const [tot, setTot] = useState('')
  const [fouten, setFouten] = useState<string[]>([])

  function voegToe() {
    const gevonden = bewaar({ ...instellingen, pauzes: [...instellingen.pauzes, { van, tot }] })
    setFouten(gevonden)
    if (gevonden.length === 0) {
      setVan('')
      setTot('')
    }
  }

  return (
    <div className="blok">
      <h2>Pauzeperiodes</h2>
      <p className="zacht">Op deze dagen toont de app "markt dicht" en is er geen dagkaart.</p>

      {instellingen.pauzes.map((p, n) => (
        <div key={`${p.van}-${p.tot}-${n}`} className="veld">
          <span>
            {compacteDatum(p.van)} {p.van.slice(0, 4)} tot en met {compacteDatum(p.tot)} {p.tot.slice(0, 4)}
          </span>
          <button
            className="knop"
            onClick={() => bewaar({ ...instellingen, pauzes: instellingen.pauzes.filter((_, m) => m !== n) })}
          >
            Verwijderen
          </button>
        </div>
      ))}

      <div className="rij">
        <label className="veldgroep">
          <span className="label">Van</span>
          <input className="prijs" type="date" value={van} onChange={(e) => setVan(e.target.value)} />
        </label>
        <label className="veldgroep">
          <span className="label">Tot en met</span>
          <input className="prijs" type="date" value={tot} onChange={(e) => setTot(e.target.value)} />
        </label>
      </div>
      {fouten.length > 0 && (
        <div className="melding fout" role="alert">
          {fouten.join(' ')}
        </div>
      )}
      <button className="knop" disabled={!van || !tot} onClick={voegToe}>
        Pauze toevoegen
      </button>
    </div>
  )
}
