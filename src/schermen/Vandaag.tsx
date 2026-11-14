import { useEffect, useState } from 'react'
import { compacteDatum, langeDatum, maandagVan, vandaag, werkweek } from '../hulp/datum'
import { metTeken } from '../hulp/getal'
import Icoon from '../onderdelen/Icoon'
import { leesAlleDagen, type Dag } from '../opslag/dagen'
import { useInstellingen } from '../opslag/InstellingenContext'
import { regeltrouw } from '../regels/resultaat'
import { inPauze, isHandelsdag, sessieStatus, volgendeHandelsdag } from '../regels/sessie'
import { berekenStreak } from '../regels/streak'
import DagKaart from './DagKaart'
import { useDag } from './useDag'

export default function Vandaag({ naarGeschiedenis }: { naarGeschiedenis: () => void }) {
  const { instellingen } = useInstellingen()
  const datum = vandaag()
  const handelsdag = isHandelsdag(datum, instellingen.pauzes)
  const { dag, setDag, screenshot, setScreenshot } = useDag(datum)
  const [alle, setAlle] = useState<Dag[]>([])
  const [nu, setNu] = useState(() => new Date())

  // De sessie-indicator loopt mee met de klok.
  useEffect(() => {
    const timer = setInterval(() => setNu(new Date()), 30000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    let actueel = true
    void leesAlleDagen().then((dagen) => actueel && setAlle(dagen))
    return () => {
      actueel = false
    }
  }, [])

  if (!dag) return null

  const sessie = handelsdag ? sessieStatus(nu) : { londen: false, newyork: false }
  // Vandaag komt uit het scherm zelf, zodat de streak direct meeloopt met wat je invult.
  const metVandaag = [...alle.filter((d) => d.datum !== datum), dag]
  const streak = berekenStreak(metVandaag, datum)
  const genomen = dag.besluit?.soort === 'genomen'

  return (
    <section className="vandaag">
      <header className="dagkop">
        <div>
          <p className="bovenkop">Vandaag</p>
          <h1 className="hoofdletter">{langeDatum(datum)}</h1>
        </div>
        <div className="dagkop-feiten">
          <div className="sessies" aria-label="Sessies">
            <span className={sessie.londen ? 'sessie open' : 'sessie'}>
              <span className="lamp" aria-hidden="true" />
              Londen <span className="zacht">{sessie.londen ? 'open' : 'dicht'}</span>
            </span>
            <span className={sessie.newyork ? 'sessie open' : 'sessie'}>
              <span className="lamp" aria-hidden="true" />
              New York <span className="zacht">{sessie.newyork ? 'open' : 'dicht'}</span>
            </span>
          </div>
          <div className="feit">
            <span className="feit-label">Streak</span>
            <span className="feit-waarde getal">{streak}</span>
            <span className="zacht">{streak === 1 ? 'dag' : 'dagen'}</span>
          </div>
          <div className="feit">
            <span className="feit-label">Trade vandaag</span>
            <span className={genomen ? 'feit-waarde ja' : 'feit-waarde'}>
              <Icoon naam={genomen ? 'slot' : 'min'} maat={16} />
              {genomen ? 'Genomen' : 'Nog niet'}
            </span>
          </div>
        </div>
      </header>

      {handelsdag ? (
        <DagKaart dag={dag} setDag={setDag} screenshot={screenshot} setScreenshot={setScreenshot} />
      ) : (
        <MarktDicht
          pauze={inPauze(datum, instellingen.pauzes)}
          volgende={volgendeHandelsdag(datum, instellingen.pauzes)}
          dagen={metVandaag}
          naarGeschiedenis={naarGeschiedenis}
        />
      )}
    </section>
  )
}

function MarktDicht({
  pauze,
  volgende,
  dagen,
  naarGeschiedenis,
}: {
  pauze: boolean
  volgende: string
  dagen: Dag[]
  naarGeschiedenis: () => void
}) {
  // Weekreview in het klein: de werkweek van deze of de afgelopen week.
  const week = werkweek(maandagVan(vandaag()))
  const vanWeek = dagen.filter((d) => week.includes(d.datum))
  const trades = vanWeek.filter((d) => d.besluit?.soort === 'genomen')
  const afgerond = trades.filter((d) => d.resultaat)
  const totaalR = afgerond.reduce((som, d) => som + d.resultaat!.r, 0)
  const volgensRegels = afgerond.filter((d) => regeltrouw(d.besluit!.ongepland, d.resultaat!).volgensRegels).length
  const analyses = vanWeek.filter((d) => d.vastgelegdOp || d.analyse.prediction.trim()).length

  return (
    <div className="leeg">
      <span className="leeg-icoon">
        <Icoon naam="maan" maat={28} />
      </span>
      <h2>Markt dicht</h2>
      <p className="zacht">
        {pauze ? 'Je zit in een pauzeperiode.' : 'Het is weekend.'} Eerstvolgende handelsdag:{' '}
        <strong>{compacteDatum(volgende)}</strong>.
      </p>

      <div className="weekreview">
        <p className="bovenkop">Weekreview</p>
        <dl>
          <div>
            <dt>Analyses</dt>
            <dd className="getal">{analyses}</dd>
          </div>
          <div>
            <dt>Trades</dt>
            <dd className="getal">{trades.length}</dd>
          </div>
          <div>
            <dt>Totaal</dt>
            <dd className="getal">{afgerond.length ? `${metTeken(Number(totaalR.toFixed(2)))}R` : '–'}</dd>
          </div>
          <div>
            <dt>Volgens de regels</dt>
            <dd className="getal">{afgerond.length ? `${volgensRegels}/${afgerond.length}` : '–'}</dd>
          </div>
        </dl>
      </div>

      <button className="knop primair" onClick={naarGeschiedenis}>
        Bekijk de afgelopen dagen
      </button>
    </div>
  )
}
