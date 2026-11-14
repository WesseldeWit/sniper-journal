import { useState } from 'react'
import Icoon from '../onderdelen/Icoon'
import { vandaag } from '../hulp/datum'
import { dollars, getal, kort } from '../hulp/getal'
import { schrijfDag, type Dag } from '../opslag/dagen'
import { useInstellingen } from '../opslag/InstellingenContext'
import { foutenBijGenomen, isOngepland, neemTrade, slaOver } from '../regels/besluit'

const moment = (iso: string) =>
  new Date(iso).toLocaleString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

export default function BesluitStap({ dag, setDag }: { dag: Dag; setDag: (dag: Dag) => void }) {
  const { instellingen } = useInstellingen()
  const [reden, setReden] = useState('')
  const [achteraf, setAchteraf] = useState(false)
  const [bevestigen, setBevestigen] = useState(false)
  const [fouten, setFouten] = useState<string[]>([])


  function bewaar(nieuw: Dag) {
    setDag(nieuw)
    void schrijfDag(nieuw)
  }

  function verwerk(uitkomst: ReturnType<typeof neemTrade>) {
    setBevestigen(false)
    if ('fouten' in uitkomst) {
      setFouten(uitkomst.fouten)
    } else {
      setFouten([])
      bewaar({ ...dag, besluit: uitkomst.besluit })
    }
  }

  const b = dag.besluit

  if (b?.soort === 'genomen') {
    return (
      <div className="blok slot">
        <strong className="oordeel-tekst">
          <Icoon naam="slot" maat={24} />
          Trade genomen · dag op slot
        </strong>
        <p className="zacht">{moment(b.op)}</p>
        {b.ongepland && <span className="label-fout">Ongepland</span>}
        <dl className="cijfers smal">
          <dt>Lotsize</dt>
          <dd>{getal(b.lots ?? 0)} lot</dd>
          <dt>Risico</dt>
          <dd>
            {kort(b.risicoProcent ?? 0)}% · {dollars(b.bedrag ?? 0)}
          </dd>
          <dt>Extra confluences</dt>
          <dd>{b.aantalConfluences} van 6</dd>
        </dl>
        <p>
          One &amp; Done. Vandaag komt er geen tweede trade, bij winst en bij verlies. Volg het
          trademanagement-schema en sluit het platform.
        </p>
      </div>
    )
  }

  if (b?.soort === 'niet-genomen') {
    return (
      <div className="blok">
        <strong>Niet genomen</strong>
        <p className="zacht">{moment(b.op)}</p>
        <p>{b.reden}</p>
        <button className="knop zelf" onClick={() => bewaar({ ...dag, besluit: null })}>
          Besluit terugdraaien
        </button>
      </div>
    )
  }

  const nu = vandaag()
  const toekomst = dag.datum > nu
  const blokkades = foutenBijGenomen(dag, instellingen, nu)
  const magNemen = blokkades.length === 0
  const automatischOngepland = isOngepland(dag, false)

  return (
    <div className="blok">
      {toekomst ? (
        <p className="zacht">Deze dag ligt in de toekomst. Een besluit kan pas op de dag zelf.</p>
      ) : (
        <div className="besluit-keuzes">
          <div className="besluit-kant">
            <strong>Genomen</strong>
            {magNemen ? (
              <>
                {automatischOngepland ? (
                  <p className="veld-fout">
                    Het plan is pas na deze dag vastgelegd. De trade krijgt het label ongepland.
                  </p>
                ) : (
                  <label className="vinkje">
                    <input type="checkbox" checked={achteraf} onChange={(e) => setAchteraf(e.target.checked)} />
                    <span>Het plan stond nog niet vast toen de prijs de zone raakte (ongepland)</span>
                  </label>
                )}
                {bevestigen ? (
                  <div className="bevestig">
                    <p>
                      <strong>Weet je het zeker?</strong> De dag gaat op slot. Dit is niet terug te draaien.
                    </p>
                    <div className="rij-knoppen">
                      <button
                        className="knop primair"
                        onClick={() => verwerk(neemTrade(dag, instellingen, new Date(), achteraf, nu))}
                      >
                        Ja, trade genomen
                      </button>
                      <button className="knop" onClick={() => setBevestigen(false)}>
                        Annuleren
                      </button>
                    </div>
                  </div>
                ) : (
                  <button className="knop primair" onClick={() => setBevestigen(true)}>
                    Trade genomen
                  </button>
                )}
              </>
            ) : (
              <ul className="blokkades">
                {blokkades.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="besluit-kant">
            <strong>Niet genomen</strong>
            <label className="veldgroep">
              <span className="label">Korte reden</span>
              <textarea
                rows={2}
                placeholder="Bijvoorbeeld: de prijs bereikte de zone niet."
                value={reden}
                onChange={(e) => setReden(e.target.value)}
              />
            </label>
            <button
              className="knop"
              disabled={!reden.trim()}
              onClick={() => verwerk(slaOver(dag, instellingen, new Date(), reden, nu))}
            >
              Niet genomen
            </button>
          </div>
        </div>
      )}

      {fouten.length > 0 && (
        <div className="melding fout" role="alert">
          <strong>Niet opgeslagen.</strong>
          <ul>
            {fouten.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
