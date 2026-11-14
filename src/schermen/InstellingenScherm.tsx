import { useState } from 'react'
import { dollars, getal, kort, leesGetal } from '../hulp/getal'
import { useInstellingen } from '../opslag/InstellingenContext'
import {
  MAX_RISICO_PROCENT,
  STOP_MAX_PIPS,
  STOP_MIN_PIPS,
  TREDEN,
  type Instellingen,
} from '../regels/instellingen'
import AiBlok from './AiBlok'
import BackupBlok from './BackupBlok'
import PauzeBlok from './PauzeBlok'
import { lotsize, maxRisicoProcent, pipWaardePerLot, risicoBedrag } from '../regels/risico'

type Veld = 'ouncePerLot' | 'pipGrootte' | 'lotStap' | 'laag' | 'midden' | 'hoog'

function naarTekst(i: Instellingen): Record<Veld, string> {
  return {
    ouncePerLot: kort(i.ouncePerLot),
    pipGrootte: kort(i.pipGrootte),
    lotStap: kort(i.lotStap),
    laag: kort(i.risicoTabel.laag),
    midden: kort(i.risicoTabel.midden),
    hoog: kort(i.risicoTabel.hoog),
  }
}

export default function InstellingenScherm({ naarAiTest }: { naarAiTest: () => void }) {
  const { instellingen, bewaar } = useInstellingen()
  const [tekst, setTekst] = useState(() => naarTekst(instellingen))
  const [fouten, setFouten] = useState<string[]>([])

  function probeer(nieuweTekst: Record<Veld, string>, accountGrootte: number) {
    const nieuw: Instellingen = {
      accountGrootte,
      pauzes: instellingen.pauzes,
      ouncePerLot: leesGetal(nieuweTekst.ouncePerLot),
      pipGrootte: leesGetal(nieuweTekst.pipGrootte),
      lotStap: leesGetal(nieuweTekst.lotStap),
      risicoTabel: {
        laag: leesGetal(nieuweTekst.laag),
        midden: leesGetal(nieuweTekst.midden),
        hoog: leesGetal(nieuweTekst.hoog),
      },
    }
    setFouten(bewaar(nieuw))
  }

  function wijzig(veld: Veld, waarde: string) {
    const nieuweTekst = { ...tekst, [veld]: waarde }
    setTekst(nieuweTekst)
    probeer(nieuweTekst, instellingen.accountGrootte)
  }

  const veld = (naam: Veld, label: string, eenheid?: string) => (
    <label className="veld" key={naam}>
      <span>{label}</span>
      <span className="invoer">
        <input
          type="text"
          inputMode="decimal"
          value={tekst[naam]}
          onChange={(e) => wijzig(naam, e.target.value)}
        />
        {eenheid && <span className="eenheid">{eenheid}</span>}
      </span>
    </label>
  )

  return (
    <section className="instellingen">
      <h1>Instellingen</h1>

      {fouten.length > 0 ? (
        <div className="melding fout" role="alert">
          <strong>Niet opgeslagen.</strong> De vorige geldige instellingen blijven gelden.
          <ul>
            {fouten.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="zacht">Wijzigingen worden direct opgeslagen.</p>
      )}

      <div className="blok">
        <h2>Account</h2>
        <div className="keuze" role="group" aria-label="Accountgrootte">
          {[50000, 100000].map((bedrag) => (
            <button
              key={bedrag}
              className={instellingen.accountGrootte === bedrag ? 'keuze-knop actief' : 'keuze-knop'}
              aria-pressed={instellingen.accountGrootte === bedrag}
              onClick={() => probeer(tekst, bedrag)}
            >
              {dollars(bedrag)}
            </button>
          ))}
        </div>
      </div>

      <div className="blok">
        <h2>Contract goud (XAUUSD)</h2>
        <p className="zacht">Controleer deze waarden in het FTMO-platform.</p>
        <div className="velden">
          {veld('ouncePerLot', '1 lot is', 'ounce')}
          {veld('pipGrootte', '1 pip is een prijsbeweging van', 'dollar')}
          {veld('lotStap', 'Kleinste lotstap', 'lot')}
        </div>
        <p className="zacht">
          Dat maakt 1 pip bij 1 lot <strong>{dollars(pipWaardePerLot(instellingen))}</strong> waard.
        </p>
      </div>

      <div className="blok">
        <h2>Risicotabel</h2>
        <p className="zacht">
          Maximaal risico per trade, afhankelijk van het aantal extra confluences in de entryzone. Nooit hoger
          dan {kort(MAX_RISICO_PROCENT)}%. Zonder extra confluence is er geen trade.
        </p>
        <div className="velden">
          {TREDEN.map((t) => veld(t.id, t.naam, '%'))}
        </div>
      </div>

      <div className="blok">
        <h2>Zo rekent de app</h2>
        <p className="zacht">
          Lotsize bij een account van {dollars(instellingen.accountGrootte)}, altijd naar beneden afgerond.
        </p>
        <div className="tabel-rol">
          <table>
            <thead>
              <tr>
                <th>Extra confluences</th>
                <th>Risico</th>
                <th>Bedrag</th>
                <th>{STOP_MIN_PIPS} pips stop</th>
                <th>{STOP_MAX_PIPS} pips stop</th>
              </tr>
            </thead>
            <tbody>
              {TREDEN.map((trede) => {
                const procent = maxRisicoProcent(trede.vanaf, instellingen)!
                const bedrag = risicoBedrag(procent, instellingen)
                return (
                  <tr key={trede.id}>
                    <td>{trede.vanaf} of {trede.vanaf + 1}</td>
                    <td>{kort(procent)}%</td>
                    <td>{dollars(bedrag)}</td>
                    <td>{getal(lotsize(bedrag, STOP_MIN_PIPS, instellingen))} lot</td>
                    <td>{getal(lotsize(bedrag, STOP_MAX_PIPS, instellingen))} lot</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AiBlok naarTest={naarAiTest} />

      <PauzeBlok />

      <BackupBlok />
    </section>
  )
}
