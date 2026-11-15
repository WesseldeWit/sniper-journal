import { useEffect, useState, type ReactNode } from 'react'
import { getal, kort, metTeken } from '../hulp/getal'
import Icoon from '../onderdelen/Icoon'
import StatusChip from '../onderdelen/StatusChip'
import { schrijfDag, type Dag } from '../opslag/dagen'
import { useInstellingen } from '../opslag/InstellingenContext'
import { oordeelVanDag } from '../regels/dagoordeel'
import { huidigeStap, STAPPEN, type StapId } from '../regels/dagstatus'
import { regeltrouw } from '../regels/resultaat'
import AnalyseStap from './AnalyseStap'
import BesluitStap from './BesluitStap'
import CheckStap from './CheckStap'
import ManagementKaart from './ManagementKaart'
import ResultaatStap from './ResultaatStap'

interface Props {
  dag: Dag
  setDag: (dag: Dag) => void
  screenshot: Blob | null
  setScreenshot: (foto: Blob | null) => void
}

/** De vier stappen van een dag onder elkaar. Alleen de stap die aan de beurt is staat open. */
export default function DagKaart({ dag, setDag, screenshot, setScreenshot }: Props) {
  const { instellingen } = useInstellingen()
  const huidig = huidigeStap(dag)
  const [open, setOpen] = useState<StapId | null>(huidig)

  // Zodra een stap is afgerond, klapt de volgende vanzelf open.
  useEffect(() => setOpen(huidig), [huidig])

  const volgorde = STAPPEN.map((s) => s.id)
  const nietGenomen = dag.besluit?.soort === 'niet-genomen'
  const { analyse, check } = oordeelVanDag(dag, instellingen)

  function toestand(id: StapId): 'klaar' | 'huidig' | 'slot' {
    if (id === 'resultaat' && nietGenomen) return 'slot'
    if (huidig === null) return 'klaar'
    const verschil = volgorde.indexOf(id) - volgorde.indexOf(huidig)
    return verschil < 0 ? 'klaar' : verschil === 0 ? 'huidig' : 'slot'
  }

  function samenvatting(id: StapId): ReactNode {
    const a = dag.analyse
    if (id === 'analyse' && analyse.entry !== null && a.stop !== null && a.richting) {
      return (
        <>
          {a.richting === 'long' ? 'Long' : 'Short'} · entry <span className="getal">{getal(analyse.entry)}</span> ·
          stop <span className="getal">{getal(a.stop)}</span>
        </>
      )
    }
    if (id === 'check' && (dag.checkKlaarOp || dag.besluit || dag.confluences.length > 0)) {
      return (
        <>
          <StatusChip
            soort={check.goedgekeurd ? 'goedgekeurd' : 'afgekeurd'}
            tekst={check.goedgekeurd ? 'Goedgekeurd' : 'Afgekeurd'}
          />
          {check.goedgekeurd && (
            <span className="getal">
              {kort(check.risicoProcent!)}% · {getal(check.lots!)} lot
            </span>
          )}
        </>
      )
    }
    if (id === 'besluit' && dag.besluit) {
      return dag.besluit.soort === 'genomen' ? (
        <>
          Genomen · <span className="getal">{getal(dag.besluit.lots ?? 0)} lot</span>
        </>
      ) : (
        'Niet genomen'
      )
    }
    if (id === 'resultaat') {
      if (nietGenomen) return 'Geen trade genomen'
      if (dag.resultaat && dag.besluit) {
        const goed = regeltrouw(dag.besluit.ongepland, dag.resultaat).volgensRegels
        return (
          <>
            <span className="getal">{metTeken(dag.resultaat.r)}R</span>
            <StatusChip soort={goed ? 'goedgekeurd' : 'afgekeurd'} tekst={goed ? 'Volgens de regels' : 'Regelbreuk'} />
          </>
        )
      }
    }
    return null
  }

  const inhoud: Record<StapId, ReactNode> = {
    analyse: <AnalyseStap dag={dag} setDag={setDag} screenshot={screenshot} setScreenshot={setScreenshot} />,
    check: <CheckStap dag={dag} setDag={setDag} />,
    besluit: <BesluitStap dag={dag} setDag={setDag} />,
    resultaat: (
      <div className="stapel">
        <ManagementKaart dag={dag} setDag={setDag} />
        <ResultaatStap dag={dag} setDag={setDag} />
      </div>
    ),
  }

  return (
    <div className="dagkaart">
      <ol className="stepper">
        {STAPPEN.map((stap, n) => {
          const staat = toestand(stap.id)
          const isOpen = open === stap.id && staat !== 'slot'
          return (
            <li key={stap.id} className={`stap ${staat}${isOpen ? ' open' : ''}`}>
              <button
                className="stap-kop"
                disabled={staat === 'slot'}
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : stap.id)}
              >
                <span className="stap-nummer">
                  {staat === 'klaar' ? <Icoon naam="vink" maat={16} /> : staat === 'slot' ? <Icoon naam="slot" maat={14} /> : n + 1}
                </span>
                <span className="stap-titel">
                  <span className="stap-naam">{stap.naam}</span>
                  <span className="stap-samenvatting">
                    {samenvatting(stap.id) ??
                      (staat === 'slot' ? 'Op slot' : staat === 'huidig' ? 'Nu aan de beurt' : 'Afgerond')}
                  </span>
                </span>
                {staat !== 'slot' && (
                  <span className="stap-pijl">
                    <Icoon naam="omlaag" />
                  </span>
                )}
              </button>
              {isOpen && <div className="stap-inhoud">{inhoud[stap.id]}</div>}
            </li>
          )
        })}
      </ol>

      <label className="blok veldgroep">
        <span className="label">Notitie bij deze dag</span>
        <textarea
          rows={3}
          placeholder="Vrije notitie. Wordt direct bewaard."
          value={dag.notitie}
          onChange={(e) => {
            const nieuw = { ...dag, notitie: e.target.value }
            setDag(nieuw)
            void schrijfDag(nieuw)
          }}
        />
      </label>
    </div>
  )
}
