import { getal } from '../hulp/getal'
import { schrijfDag, type Dag } from '../opslag/dagen'
import { useInstellingen } from '../opslag/InstellingenContext'
import { verdeelLots } from '../regels/check'
import { oordeelVanDag } from '../regels/dagoordeel'

type Niveau = 'r1' | 'r2' | 'r3'

/** De niveaus van de trade: wat je doet, met hoeveel lots, en afvinken wat gehaald is. */
export default function ManagementKaart({ dag, setDag }: { dag: Dag; setDag: (dag: Dag) => void }) {
  const { instellingen } = useInstellingen()
  const { analyse } = oordeelVanDag(dag, instellingen)
  const lots = dag.besluit?.lots ?? 0
  if (dag.besluit?.soort !== 'genomen' || !analyse.doelen || analyse.entry === null) return null

  const delen = verdeelLots(lots, instellingen)
  const m = dag.management
  const rijen: { id: Niveau; naam: string; prijs: number; actie: string; lots: string; mag: boolean }[] = [
    { id: 'r1', naam: '1:1', prijs: analyse.doelen.r1, actie: `Stop naar break-even (${getal(analyse.entry)}), niets sluiten`, lots: '–', mag: true },
    { id: 'r2', naam: '1:2', prijs: analyse.doelen.r2, actie: 'Sluit 20% van de positie', lots: `${getal(delen.opR2)} lot`, mag: Boolean(m.r1) },
    {
      id: 'r3',
      naam: '1:3',
      prijs: analyse.doelen.r3,
      actie: `Sluit nog 60%. Runner van ${getal(delen.runner)} lot loopt door, stop naar ${getal(analyse.doelen.r2)}`,
      lots: `${getal(delen.opR3)} lot`,
      mag: Boolean(m.r2),
    },
  ]

  function wissel(id: Niveau) {
    // Een niveau uitvinken haalt ook de latere niveaus weg: je kunt 1:3 niet halen zonder 1:2.
    const volgorde: Niveau[] = ['r1', 'r2', 'r3']
    const nieuw = { ...m }
    if (m[id]) for (const later of volgorde.slice(volgorde.indexOf(id))) nieuw[later] = null
    else nieuw[id] = new Date().toISOString()
    const bijgewerkt = { ...dag, management: nieuw }
    setDag(bijgewerkt)
    void schrijfDag(bijgewerkt)
  }

  return (
    <div className="managementkaart">
      <span className="bovenkop">Managementkaart · {getal(lots)} lot</span>
      {rijen.map((r) => (
        <label key={r.id} className={m[r.id] ? 'niveau gehaald' : r.mag ? 'niveau' : 'niveau wacht'}>
          <input type="checkbox" checked={Boolean(m[r.id])} disabled={!r.mag} onChange={() => wissel(r.id)} />
          <span className="niveau-naam getal">{r.naam}</span>
          <span className="niveau-prijs getal">{getal(r.prijs)}</span>
          <span className="niveau-actie">{r.actie}</span>
          <span className="niveau-lots getal">{r.lots}</span>
        </label>
      ))}
      <p className="zacht">
        Vink een niveau af zodra de prijs het haalt. De delen zijn naar beneden afgerond op 0,01 lot en tellen samen
        op tot {getal(lots)} lot.
      </p>
    </div>
  )
}
