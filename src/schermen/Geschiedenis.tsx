import { useEffect, useState } from 'react'
import { compacteDatum, langeDatum, vandaag, type DagSleutel } from '../hulp/datum'
import { metTeken } from '../hulp/getal'
import Icoon from '../onderdelen/Icoon'
import StatusChip from '../onderdelen/StatusChip'
import { leesAlleDagen, type Dag } from '../opslag/dagen'
import { useInstellingen } from '../opslag/InstellingenContext'
import { statusVanDag } from '../regels/dagstatus'
import { leesPlaybook, schrijfPlaybook, type PlaybookKaart } from '../opslag/playbook'
import { aanwezigeConfluences, EXTRA, VERPLICHT } from '../regels/check'
import DagKaart from './DagKaart'
import { useDag } from './useDag'

export default function Geschiedenis({ naarVandaag }: { naarVandaag: () => void }) {
  const { instellingen } = useInstellingen()
  const [dagen, setDagen] = useState<Dag[] | null>(null)
  const [open, setOpen] = useState<DagSleutel | null>(null)

  useEffect(() => {
    if (open) return
    let actueel = true
    void leesAlleDagen().then((alle) => {
      if (!actueel) return
      const nu = vandaag()
      setDagen(alle.filter((d) => d.datum < nu).sort((a, b) => (a.datum < b.datum ? 1 : -1)))
    })
    return () => {
      actueel = false
    }
  }, [open])

  if (open) return <EerdereDag datum={open} terug={() => setOpen(null)} />
  if (!dagen) return null

  return (
    <section className="pagina">
      <h1>Geschiedenis</h1>

      {dagen.length === 0 ? (
        <div className="leeg">
          <span className="leeg-icoon">
            <Icoon naam="lijst" maat={28} />
          </span>
          <p className="zacht">Hier komen je eerdere dagen te staan zodra je een analyse hebt gemaakt.</p>
          <button className="knop primair" onClick={naarVandaag}>
            Naar vandaag
          </button>
        </div>
      ) : (
        <ul className="lijst">
          <li className="lijst-kop" aria-hidden="true">
            <span>Datum</span>
            <span>Status</span>
            <span>Resultaat</span>
          </li>
          {dagen.map((dag) => {
            const status = statusVanDag(dag, instellingen)
            const r = dag.resultaat?.r
            return (
              <li key={dag.datum}>
                <button className="lijst-rij" onClick={() => setOpen(dag.datum)}>
                  <span className="lijst-datum">{compacteDatum(dag.datum)}</span>
                  <StatusChip soort={status.soort} tekst={status.tekst} />
                  <span
                    className={r === undefined ? 'getal zacht' : r > 0 ? 'getal plus' : r < 0 ? 'getal min' : 'getal'}
                  >
                    {r === undefined ? '–' : `${metTeken(r)}R`}
                  </span>
                  <Icoon naam="pijl" maat={16} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function EerdereDag({ datum, terug }: { datum: DagSleutel; terug: () => void }) {
  const { dag, setDag, screenshot, setScreenshot } = useDag(datum)
  if (!dag) return null
  return (
    <section className="vandaag">
      <button className="knop terug" onClick={terug}>
        <Icoon naam="terug" maat={16} />
        Geschiedenis
      </button>
      <header className="dagkop">
        <div>
          <p className="bovenkop">Eerdere dag</p>
          <h1 className="hoofdletter">{langeDatum(datum)}</h1>
        </div>
      </header>
      <DagKaart dag={dag} setDag={setDag} screenshot={screenshot} setScreenshot={setScreenshot} />
      <PlaybookKnop dag={dag} />
    </section>
  )
}

/** Eén knop om een afgeronde trade in het playbook te zetten. */
function PlaybookKnop({ dag }: { dag: Dag }) {
  const [kaarten, setKaarten] = useState<PlaybookKaart[] | null>(null)
  const [uitleg, setUitleg] = useState('')
  useEffect(() => {
    void leesPlaybook().then(setKaarten)
  }, [])
  if (!kaarten || dag.besluit?.soort !== 'genomen' || !dag.resultaat) return null

  const staatErin = kaarten.some((k) => k.datum === dag.datum)
  const namen = Object.fromEntries([...VERPLICHT, ...EXTRA].map((c) => [c.id, c.naam]))

  function voegToe() {
    const kaart: PlaybookKaart = {
      datum: dag.datum,
      model: dag.analyse.model,
      richting: dag.analyse.richting,
      r: dag.resultaat!.r,
      confluences: aanwezigeConfluences({
        planVast: true,
        heeftModel: dag.analyse.model !== null,
        confluences: dag.confluences,
      }).map((id) => namen[id]),
      uitleg: uitleg.trim(),
      toegevoegdOp: new Date().toISOString(),
    }
    const nieuw = [...kaarten!, kaart]
    setKaarten(nieuw)
    void schrijfPlaybook(nieuw)
  }

  return (
    <div className="blok">
      <span className="bovenkop">Playbook</span>
      {staatErin ? (
        <StatusChip soort="goedgekeurd" tekst="Staat in je playbook" />
      ) : (
        <>
          <label className="veldgroep">
            <span className="label">Waarom werkte deze setup? (optioneel, later aan te vullen)</span>
            <textarea rows={2} value={uitleg} onChange={(e) => setUitleg(e.target.value)} />
          </label>
          <button className="knop zelf" onClick={voegToe}>
            Zet in mijn playbook
          </button>
        </>
      )}
    </div>
  )
}
