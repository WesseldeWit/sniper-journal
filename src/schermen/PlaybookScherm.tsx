import { useEffect, useState } from 'react'
import { compacteDatum } from '../hulp/datum'
import { metTeken } from '../hulp/getal'
import Icoon from '../onderdelen/Icoon'
import { leesScreenshot } from '../opslag/dagen'
import { leesPlaybook, schrijfPlaybook, type PlaybookKaart } from '../opslag/playbook'
import { MODEL_NAMEN, type Model } from '../regels/analyse'

/** Eén screenshot uit de opslag, groot getoond. */
function Foto({ datum, soort, label }: { datum: string; soort: 'analyse' | 'resultaat'; label: string }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let adres: string | null = null
    void leesScreenshot(datum, soort).then((blob) => {
      if (!blob) return
      adres = URL.createObjectURL(blob)
      setUrl(adres)
    })
    return () => {
      if (adres) URL.revokeObjectURL(adres)
    }
  }, [datum, soort])
  return (
    <figure className="pb-foto">
      <figcaption className="label">{label}</figcaption>
      {url ? <img className="screenshot" src={url} alt={label} /> : <p className="zacht">Geen screenshot.</p>}
    </figure>
  )
}

/** Je beste setups, per entry-model. */
export default function PlaybookScherm({ naarGeschiedenis }: { naarGeschiedenis: () => void }) {
  const [kaarten, setKaarten] = useState<PlaybookKaart[] | null>(null)
  useEffect(() => {
    void leesPlaybook().then(setKaarten)
  }, [])
  if (!kaarten) return null

  function bewaar(nieuw: PlaybookKaart[]) {
    setKaarten(nieuw)
    void schrijfPlaybook(nieuw)
  }

  const groepen: (Model | null)[] = ['continuation', 'reversal1', 'reversal2', null]

  return (
    <section className="pagina">
      <div>
        <p className="bovenkop">Playbook</p>
        <h1>Mijn beste setups</h1>
      </div>

      {kaarten.length === 0 && (
        <div className="leeg">
          <span className="leeg-icoon">
            <Icoon naam="notitie" maat={28} />
          </span>
          <p className="zacht">Voeg een afgeronde trade toe vanuit Geschiedenis. Hij verschijnt hier per entry-model.</p>
          <button className="knop primair" onClick={naarGeschiedenis}>
            Naar Geschiedenis
          </button>
        </div>
      )}

      {groepen.map((model) => {
        const lijst = kaarten.filter((k) => k.model === model).sort((a, b) => (a.datum < b.datum ? 1 : -1))
        if (lijst.length === 0) return null
        return (
          <div key={model ?? 'geen'} className="pagina">
            <h2>{model ? MODEL_NAMEN[model] : 'Zonder entry-model'}</h2>
            {lijst.map((k) => (
              <article key={k.datum} className="blok">
                <div className="testkaart-kop">
                  <strong>
                    {compacteDatum(k.datum)} · {k.richting === 'short' ? 'Short' : 'Long'}
                  </strong>
                  {k.r !== null && <span className={k.r > 0 ? 'getal plus pb-r' : 'getal pb-r'}>{metTeken(k.r)}R</span>}
                </div>
                <div className="pb-fotos">
                  <Foto datum={k.datum} soort="analyse" label="Voor" />
                  <Foto datum={k.datum} soort="resultaat" label="Na" />
                </div>
                <div className="labels">
                  {k.confluences.map((c) => (
                    <span key={c} className="chip vast">
                      {c}
                    </span>
                  ))}
                </div>
                <label className="veldgroep">
                  <span className="label">Waarom het werkte</span>
                  <textarea
                    rows={3}
                    value={k.uitleg}
                    onChange={(e) => bewaar(kaarten.map((x) => (x.datum === k.datum ? { ...x, uitleg: e.target.value } : x)))}
                  />
                </label>
                <button className="knop zelf" onClick={() => bewaar(kaarten.filter((x) => x.datum !== k.datum))}>
                  Uit het playbook halen
                </button>
              </article>
            ))}
          </div>
        )
      })}
    </section>
  )
}
