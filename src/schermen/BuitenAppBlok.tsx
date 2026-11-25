import { useState } from 'react'
import { dollars, kort, leesGetal } from '../hulp/getal'
import { schrijfDag, type Dag } from '../opslag/dagen'

// MARK: Resultaat buiten de app om

export default function BuitenAppBlok({ dag, setDag }: { dag: Dag; setDag: (dag: Dag) => void }) {
  const [open, setOpen] = useState(dag.buitenApp !== null)
  const [tekst, setTekst] = useState(dag.buitenApp === null ? '' : kort(dag.buitenApp))
  const [fout, setFout] = useState<string | null>(null)

  function bewaar(waarde: number | null) {
    const nieuw = { ...dag, buitenApp: waarde }
    setDag(nieuw)
    void schrijfDag(nieuw)
  }

  if (!open) {
    return (
      <button className="knop zelf" onClick={() => setOpen(true)}>
        Alleen je winst of verlies weten? Zet het bedrag in dollars erin
      </button>
    )
  }

  return (
    <div className="blok stapel">
      <strong>Resultaat buiten de app om</strong>
      <p className="zacht">
        Voor een trade waarvan je entry, stop en lots niet meer weet. Het bedrag telt mee voor je FTMO-stand. Omdat de trade
        niet vooraf in je plan stond, telt de dag als regelbreuk.
      </p>
      <label className="veldgroep">
        <span className="label">Winst of verlies in dollars (verlies met een min ervoor)</span>
        <span className="invoer">
          <input
            className="prijs"
            type="text"
            inputMode="decimal"
            placeholder="Bijvoorbeeld 1394,46 of -250"
            value={tekst}
            onChange={(e) => setTekst(e.target.value)}
          />
          <button
            className="knop primair"
            onClick={() => {
              const n = leesGetal(tekst, true)
              if (Number.isNaN(n) || n === 0) {
                setFout('Vul een bedrag in, bijvoorbeeld 1394,46 of -250.')
                return
              }
              setFout(null)
              bewaar(Number(n.toFixed(2)))
            }}
          >
            Opslaan
          </button>
        </span>
      </label>
      {fout && <p className="veld-fout">{fout}</p>}
      {dag.buitenApp !== null && (
        <div className="rij-knoppen">
          <span className="getal">Opgeslagen: {dollars(dag.buitenApp)}</span>
          <button
            className="knop"
            onClick={() => {
              bewaar(null)
              setTekst('')
            }}
          >
            Verwijderen
          </button>
        </div>
      )}
    </div>
  )
}
