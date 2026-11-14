import { useState } from 'react'
import Icoon from '../onderdelen/Icoon'
import { dollars, getal, kort, leesGetal } from '../hulp/getal'
import { schrijfDag, type Dag } from '../opslag/dagen'
import { useInstellingen } from '../opslag/InstellingenContext'
import { AUTOMATISCH, EXTRA, VERPLICHT, verdeelLots, type ConfluenceId } from '../regels/check'
import { oordeelVanDag } from '../regels/dagoordeel'
import { MIN_EXTRA, TOTAAL_EXTRA, TOTAAL_VERPLICHT } from '../regels/instellingen'
import { risicoToegestaan } from '../regels/risico'

export default function CheckStap({ dag, setDag }: { dag: Dag; setDag: (dag: Dag) => void }) {
  const { instellingen } = useInstellingen()
  const vast = dag.vastgelegdOp !== null
  const { analyse, check } = oordeelVanDag(dag, instellingen)
  const [risicoTekst, setRisicoTekst] = useState(dag.risicoProcent === null ? '' : kort(dag.risicoProcent))
  const [risicoFout, setRisicoFout] = useState<string | null>(null)

  function bewaar(nieuw: Dag) {
    setDag(nieuw)
    void schrijfDag(nieuw)
  }

  function wissel(id: ConfluenceId) {
    const aan = dag.confluences.includes(id)
    bewaar({ ...dag, confluences: aan ? dag.confluences.filter((c) => c !== id) : [...dag.confluences, id] })
  }

  function wijzigRisico(waarde: string) {
    setRisicoTekst(waarde)
    if (waarde.trim() === '') {
      setRisicoFout(null)
      bewaar({ ...dag, risicoProcent: null })
      return
    }
    const n = leesGetal(waarde)
    // Lager dan de tabel mag altijd, hoger wordt niet opgeslagen.
    if (risicoToegestaan(n, check.aantalExtra, instellingen)) {
      setRisicoFout(null)
      bewaar({ ...dag, risicoProcent: n })
    } else {
      setRisicoFout(
        check.maxRisico === null
          ? 'Er is geen goedgekeurde trade om risico op te nemen.'
          : `Niet opgeslagen. Het risico mag niet hoger zijn dan ${kort(check.maxRisico)}%.`,
      )
    }
  }

  const aanwezig = new Set<ConfluenceId>(check.aanwezig)
  const lijst = (groep: readonly { id: ConfluenceId; naam: string; uitleg: string }[]) => (
    <ul className="confluences">
      {groep.map((c) => {
        const automatisch = AUTOMATISCH.includes(c.id)
        return (
          <li key={c.id}>
            <label className={automatisch ? 'automatisch' : undefined}>
              <input
                type="checkbox"
                checked={aanwezig.has(c.id)}
                disabled={automatisch}
                onChange={() => wissel(c.id)}
              />
              <span>
                <strong>{c.naam}</strong>
                <span className="uitleg">{c.uitleg}</span>
                {automatisch && (
                  <span className="uitleg">
                    {c.id === 'fibonacci'
                      ? 'Automatisch: volgt uit je vastgelegde entry.'
                      : 'Automatisch: volgt uit het entry-model in je analyse.'}
                  </span>
                )}
              </span>
            </label>
          </li>
        )
      })}
    </ul>
  )

  const prijs = (n: number) => getal(n, 2)
  const delen = check.lots !== null ? verdeelLots(check.lots, instellingen) : null
  const long = dag.analyse.richting === 'long'

  return (
    <div className="analyse">
      <fieldset className="blok formulier" disabled={!vast || dag.besluit !== null || dag.checkKlaarOp !== null}>
        {!vast && <p className="zacht">Leg eerst het plan vast. Daarna vink je hier de confluences aan.</p>}
        <p className="zacht">Vink alleen aan wat je echt op de chart ziet.</p>

        <div className="groep-kop">
          <h2>Verplicht</h2>
          <span className="zacht getal">
            {check.aantalVerplicht}/{TOTAAL_VERPLICHT}
          </span>
        </div>
        <p className="zacht">Moeten er altijd alle vier zijn.</p>
        {lijst(VERPLICHT)}

        <div className="groep-kop">
          <h2>Extra</h2>
          <span className="zacht getal">
            {check.aantalExtra}/{TOTAAL_EXTRA}
          </span>
        </div>
        <p className="zacht">
          Telt alleen mee als hij in de entryzone ligt of ermee samenvalt. Minimaal {MIN_EXTRA} is nodig; het
          aantal bepaalt het risico.
        </p>
        {lijst(EXTRA)}
        <p className="ai-plek zacht">AI-check op de screenshot: komt in versie 2.</p>
      </fieldset>

      <aside className="zijkant">
        {vast && (
          <div className={check.goedgekeurd ? 'blok oordeel goed' : 'blok oordeel afgekeurd'} role="status">
            <span className="zacht">
              {check.aantalVerplicht} van {TOTAAL_VERPLICHT} verplicht · {check.aantalExtra} van {TOTAAL_EXTRA} extra
            </span>
            <strong className="oordeel-tekst">
              <Icoon naam={check.goedgekeurd ? 'vink' : 'kruis'} maat={26} />
              {check.goedgekeurd ? 'Goedgekeurd' : 'Afgekeurd'}
            </strong>
            {check.redenen.map((r) => (
              <p key={r}>{r}</p>
            ))}
            {!check.goedgekeurd && <p>Geen trade. Deze dag kan niet als genomen worden opgeslagen.</p>}
          </div>
        )}

        {check.goedgekeurd && check.lots !== null && (
          <div className="blok">
            <h2>Risico en lotsize</h2>
            <div className="lots">
              <span className="lots-getal">{getal(check.lots)}</span>
              <span className="zacht">lot</span>
            </div>
            <dl className="cijfers">
              <dt>Risico</dt>
              <dd>
                {kort(check.risicoProcent!)}% · {dollars(check.bedrag!)}
              </dd>
              <dt>Maximum volgens de tabel</dt>
              <dd>{kort(check.maxRisico!)}%</dd>
              <dt>Stop</dt>
              <dd>{kort(analyse.stopPips!)} pips</dd>
            </dl>
            <label className="veldgroep">
              <span className="label">Lager risico nemen (optioneel)</span>
              <span className="invoer">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder={kort(check.maxRisico!)}
                  value={risicoTekst}
                  disabled={dag.besluit !== null || dag.checkKlaarOp !== null}
                  onChange={(e) => wijzigRisico(e.target.value)}
                />
                <span className="eenheid">%</span>
              </span>
              {risicoFout && <span className="veld-fout">{risicoFout}</span>}
            </label>
          </div>
        )}
        {vast && !dag.besluit && (
          <div className="blok">
            {dag.checkKlaarOp ? (
              <button className="knop" onClick={() => bewaar({ ...dag, checkKlaarOp: null })}>
                Check wijzigen
              </button>
            ) : (
              <>
                <button
                  className="knop primair"
                  onClick={() => bewaar({ ...dag, checkKlaarOp: new Date().toISOString() })}
                >
                  Check afronden
                </button>
                <p className="zacht">
                  Daarna volgt het besluit: genomen of niet genomen.
                </p>
              </>
            )}
          </div>
        )}
      </aside>

      {check.goedgekeurd && delen && analyse.doelen && analyse.entry !== null && (
        <div className="blok breed">
          <h2>Trademanagement</h2>
          <p className="zacht">Elke stap staat vast voordat de trade opent.</p>
          <div className="tabel-rol">
            <table>
              <thead>
                <tr>
                  <th>Moment</th>
                  <th>Prijs</th>
                  <th>Actie</th>
                  <th>Sluiten</th>
                  <th>Vastgezet</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1:1</td>
                  <td>{prijs(analyse.doelen.r1)}</td>
                  <td>Stop naar break-even ({prijs(analyse.entry)})</td>
                  <td>–</td>
                  <td>0R</td>
                </tr>
                <tr>
                  <td>1:2</td>
                  <td>{prijs(analyse.doelen.r2)}</td>
                  <td>Sluit 20%</td>
                  <td>{getal(delen.opR2)} lot</td>
                  <td>+0,4R</td>
                </tr>
                <tr>
                  <td>1:3</td>
                  <td>{prijs(analyse.doelen.r3)}</td>
                  <td>Sluit 60%, stop runner naar 1:2 ({prijs(analyse.doelen.r2)})</td>
                  <td>{getal(delen.opR3)} lot</td>
                  <td>+2,2R</td>
                </tr>
                <tr>
                  <td>Runner</td>
                  <td>{dag.analyse.runnerDoel !== null ? prijs(dag.analyse.runnerDoel) : '–'}</td>
                  <td>Laat lopen tot het doel of het einde van de New York-sessie</td>
                  <td>{getal(delen.runner)} lot</td>
                  <td>+2,2R plus runner</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="zacht">
            Runnerregels (voorstel): doel en stop verplaatsen mag alleen in het voordeel van de trade, dus{' '}
            {long ? 'omhoog' : 'omlaag'}. Elke andere wijziging is een regelbreuk.
          </p>
        </div>
      )}
    </div>
  )
}
