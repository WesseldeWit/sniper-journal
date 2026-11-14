import { useEffect, useState } from 'react'
import StatusChip from '../onderdelen/StatusChip'
import { dollars, getal, kort, leesGetal } from '../hulp/getal'
import { schrijfDag, schrijfScreenshot, verwijderScreenshot, type Dag } from '../opslag/dagen'
import { useInstellingen } from '../opslag/InstellingenContext'
import {
  beoordeelAnalyse,
  MODEL_NAMEN,
  SESSIE_NAMEN,
  type Analyse,
  type EisStatus,
  type Model,
  type Sessie,
} from '../regels/analyse'
import { TREDEN } from '../regels/instellingen'
import { lotsize, maxRisicoProcent, risicoBedrag } from '../regels/risico'

type PrijsVeld = 'fibLijn' | 'zoneRand' | 'entryDieper' | 'stop' | 'runnerDoel'

const TEKEN: Record<EisStatus, string> = { ok: '✓', fout: '✕', open: '·' }

function prijs(n: number): string {
  return getal(n, 2)
}

interface Props {
  dag: Dag
  setDag: (dag: Dag) => void
  screenshot: Blob | null
  setScreenshot: (foto: Blob | null) => void
}

export default function AnalyseStap({ dag, setDag, screenshot, setScreenshot }: Props) {
  const { instellingen } = useInstellingen()
  const a = dag.analyse
  const vast = dag.vastgelegdOp !== null

  // Wat er letterlijk in de prijsvelden staat, zodat je '4000,' kunt typen zonder dat het verspringt.
  const [tekst, setTekst] = useState<Record<PrijsVeld, string>>(() => ({
    fibLijn: a.fibLijn === null ? '' : kort(a.fibLijn),
    zoneRand: a.zoneRand === null ? '' : kort(a.zoneRand),
    entryDieper: a.entryDieper === null ? '' : kort(a.entryDieper),
    stop: a.stop === null ? '' : kort(a.stop),
    runnerDoel: a.runnerDoel === null ? '' : kort(a.runnerDoel),
  }))

  const [fotoUrl, setFotoUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!screenshot) {
      setFotoUrl(null)
      return
    }
    const url = URL.createObjectURL(screenshot)
    setFotoUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [screenshot])

  const oordeel = beoordeelAnalyse(a, dag.heeftScreenshot, instellingen)

  function bewaar(nieuw: Dag) {
    setDag(nieuw)
    void schrijfDag(nieuw)
  }

  function wijzig(deel: Partial<Analyse>) {
    bewaar({ ...dag, analyse: { ...a, ...deel } })
  }

  function wijzigPrijs(veld: PrijsVeld, waarde: string) {
    setTekst({ ...tekst, [veld]: waarde })
    const n = leesGetal(waarde)
    wijzig({ [veld]: Number.isNaN(n) ? null : n })
  }

  async function kiesScreenshot(bestand: File | undefined) {
    if (!bestand) return
    await schrijfScreenshot(dag.datum, bestand)
    setScreenshot(bestand)
    bewaar({ ...dag, heeftScreenshot: true })
  }

  async function wisScreenshot() {
    await verwijderScreenshot(dag.datum)
    setScreenshot(null)
    bewaar({ ...dag, heeftScreenshot: false })
  }

  function legVast() {
    // De regels beslissen, niet de knop: een ongeldige analyse wordt nooit vastgelegd.
    if (!beoordeelAnalyse(a, dag.heeftScreenshot, instellingen).geldig) return
    bewaar({ ...dag, vastgelegdOp: new Date().toISOString() })
  }

  const keuze = <T extends string>(
    label: string,
    opties: Record<T, string>,
    waarde: T | null,
    kies: (w: T) => void,
  ) => (
    <div className="veldgroep">
      <span className="label">{label}</span>
      <div className="keuze" role="group" aria-label={label}>
        {(Object.keys(opties) as T[]).map((optie) => (
          <button
            key={optie}
            type="button"
            className={waarde === optie ? 'keuze-knop actief' : 'keuze-knop'}
            aria-pressed={waarde === optie}
            onClick={() => kies(optie)}
          >
            {opties[optie]}
          </button>
        ))}
      </div>
    </div>
  )

  const prijsVeld = (veld: PrijsVeld, label: string, hulp?: string) => (
    <label className="veldgroep">
      <span className="label">{label}</span>
      <input
        className="prijs"
        type="text"
        inputMode="decimal"
        placeholder="0,00"
        value={tekst[veld]}
        onChange={(e) => wijzigPrijs(veld, e.target.value)}
      />
      {hulp && <span className="zacht">{hulp}</span>}
    </label>
  )

  return (
    <div className="analyse">
      <fieldset className="blok formulier" disabled={vast}>

        <label className="veldgroep">
          <span className="label">Prediction</span>
          <textarea
            rows={3}
            placeholder="Wat verwacht je vandaag, en waarom?"
            value={a.prediction}
            onChange={(e) => wijzig({ prediction: e.target.value })}
          />
        </label>

        {keuze('Richting', { long: 'Long', short: 'Short' }, a.richting, (richting) => wijzig({ richting }))}
        {keuze<Model>('Entry-model (optioneel, telt als extra confluence)', MODEL_NAMEN, a.model, (model) =>
          // Nog een keer tikken haalt de keuze weer weg.
          wijzig({ model: a.model === model ? null : model }),
        )}
        {keuze<Sessie>('Sessie', SESSIE_NAMEN, a.sessie, (sessie) => wijzig({ sessie }))}

        <div className="rij">
          {prijsVeld('fibLijn', '0.764-lijn')}
          {prijsVeld(
            'zoneRand',
            'Rand van de zone',
            a.richting === 'short' ? 'Ligt boven de lijn.' : a.richting === 'long' ? 'Ligt onder de lijn.' : undefined,
          )}
        </div>

        {keuze(
          'Entry',
          { lijn: 'Op de 0.764-lijn', dieper: 'Dieper in de zone' },
          a.entryType,
          (entryType) => wijzig({ entryType }),
        )}
        {a.entryType === 'dieper' &&
          prijsVeld('entryDieper', 'Entryprijs', 'Alleen na een bevestigingscandle, zoals een doji star.')}

        <div className="rij">
          {prijsVeld('stop', 'Stop loss')}
          {prijsVeld('runnerDoel', 'Doel runner (optioneel)', 'Eerstvolgende zone aan de overkant.')}
        </div>

        <div className="veldgroep">
          <span className="label">Screenshot van de chart</span>
          {fotoUrl && <img className="screenshot" src={fotoUrl} alt="Screenshot van de analyse" />}
          <div className="rij-knoppen">
            <label className={vast ? 'knop uit' : 'knop'}>
              {screenshot ? 'Vervangen' : 'Screenshot kiezen'}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  void kiesScreenshot(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
            </label>
            {screenshot && (
              <button type="button" className="knop" onClick={() => void wisScreenshot()}>
                Verwijderen
              </button>
            )}
          </div>
        </div>
      </fieldset>

      <aside className="zijkant">
        <div className="blok">
          <h2>Harde eisen</h2>
          <ul className="eisen">
            {oordeel.eisen.map((e) => (
              <li key={e.id} className={e.status}>
                <span className="teken" aria-hidden="true">
                  {TEKEN[e.status]}
                </span>
                <span>
                  <strong>{e.naam}</strong>
                  {e.status !== 'ok' && <span className="uitleg">{e.uitleg}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="blok">
          <h2>Berekend</h2>
          {oordeel.entry !== null && oordeel.doelen && oordeel.stopPips !== null ? (
            <>
              <dl className="cijfers">
                <dt>Entry</dt>
                <dd>{prijs(oordeel.entry)}</dd>
                <dt>Stop</dt>
                <dd>
                  {prijs(a.stop!)} · {kort(oordeel.stopPips)} pips
                </dd>
                <dt>1:1 · stop naar break-even</dt>
                <dd>{prijs(oordeel.doelen.r1)}</dd>
                <dt>1:2 · sluit 20%</dt>
                <dd>{prijs(oordeel.doelen.r2)}</dd>
                <dt>1:3 · sluit 60%</dt>
                <dd>{prijs(oordeel.doelen.r3)}</dd>
              </dl>
              <p className="zacht">Lotsize bij deze stop, afhankelijk van de extra confluences in stap 2:</p>
              <dl className="cijfers">
                {TREDEN.map((trede) => {
                  const bedrag = risicoBedrag(maxRisicoProcent(trede.vanaf, instellingen)!, instellingen)
                  return (
                    <div key={trede.id} className="cijfer-rij">
                      <dt>
                        {trede.vanaf} of {trede.vanaf + 1} extra · {dollars(bedrag)}
                      </dt>
                      <dd>{getal(lotsize(bedrag, oordeel.stopPips!, instellingen))} lot</dd>
                    </div>
                  )
                })}
              </dl>
            </>
          ) : (
            <p className="zacht">Vul richting, entry en stop loss in om de doelen en de lotsize te zien.</p>
          )}
        </div>

        {vast ? (
          <div className="blok vastgelegd">
            <StatusChip soort="slot" tekst="Plan vastgelegd" />
            <span className="zacht">
              {new Date(dag.vastgelegdOp!).toLocaleString('nl-NL', {
                weekday: 'long',
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            {!dag.besluit && <p>Zet nu een TradingView-alert op de zone en loop weg van het scherm.</p>}
            {dag.besluit ? (
              <span className="zacht">Er is een besluit genomen. Het plan kan niet meer worden gewijzigd.</span>
            ) : (
              <button className="knop" onClick={() => bewaar({ ...dag, vastgelegdOp: null, checkKlaarOp: null })}>
                Plan wijzigen
              </button>
            )}
          </div>
        ) : (
          <div className="blok">
            <button className="knop primair" disabled={!oordeel.geldig} onClick={legVast}>
              Plan vastleggen
            </button>
            <p className="zacht">
              {oordeel.geldig
                ? 'Alle harde eisen kloppen. Leg het plan vast voordat de prijs de zone raakt.'
                : 'Je invoer wordt bewaard als concept. Vastleggen kan pas als elke harde eis klopt.'}
            </p>
          </div>
        )}
      </aside>
    </div>
  )
}
