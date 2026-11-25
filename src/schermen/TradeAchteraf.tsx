import { useEffect, useState } from 'react'
import { leesMt5, LeesFout } from '../ai/lees'
import { MODELLEN, type ModelId } from '../ai/modellen'
import { leesModel, leesSleutel } from '../ai/sleutel'
import { vandaag } from '../hulp/datum'
import { dollars, getal, kort, leesGetal } from '../hulp/getal'
import Icoon from '../onderdelen/Icoon'
import { schrijfDag, schrijfScreenshot, type Dag } from '../opslag/dagen'
import { useInstellingen } from '../opslag/InstellingenContext'
import {
  HERKOMST_NAMEN,
  LEGE_ACHTERAF,
  legTradeAchterafVast,
  risicoVanAchteraf,
  type AchterafInvoer,
  type Herkomst,
} from '../regels/achteraf'
import { nlDatum, sessieVanKlok } from '../regels/sessie'

type Veld = 'entry' | 'stop' | 'lots'

// MARK: Trade achteraf invoeren

export default function TradeAchteraf({ dag, setDag }: { dag: Dag; setDag: (dag: Dag) => void }) {
  const { instellingen } = useInstellingen()
  const [open, setOpen] = useState(false)
  const [invoer, setInvoer] = useState<AchterafInvoer>(LEGE_ACHTERAF)
  const [tekst, setTekst] = useState<Record<Veld, string>>({ entry: '', stop: '', lots: '' })
  const [foto, setFoto] = useState<File | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [bezig, setBezig] = useState(false)
  const [melding, setMelding] = useState<string | null>(null)
  const [fouten, setFouten] = useState<string[]>([])
  const [bevestigen, setBevestigen] = useState(false)
  const sleutel = leesSleutel()
  const model = leesModel<ModelId>(MODELLEN.map((m) => m.id))

  useEffect(() => {
    if (!foto) {
      setUrl(null)
      return
    }
    const u = URL.createObjectURL(foto)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [foto])

  if (!open) {
    return (
      <button className="knop zelf" onClick={() => setOpen(true)}>
        Trade buiten de app om genomen? Achteraf invoeren
      </button>
    )
  }

  function zetVeld(veld: Veld, waarde: string) {
    setTekst({ ...tekst, [veld]: waarde })
    const n = leesGetal(waarde)
    setInvoer({ ...invoer, [veld]: Number.isNaN(n) ? null : n })
  }

  async function leesFoto(bestand: File) {
    setFoto(bestand)
    setMelding(null)
    if (!sleutel) {
      setMelding('Geen API-sleutel: vul de velden zelf in.')
      return
    }
    setBezig(true)
    try {
      const { lezing, kosten } = await leesMt5(sleutel, model, bestand)
      const nieuw: AchterafInvoer = {
        ...invoer,
        richting: lezing.richting ?? invoer.richting,
        entry: lezing.entry ?? invoer.entry,
        stop: lezing.stop ?? invoer.stop,
        lots: lezing.lots ?? invoer.lots,
      }
      setInvoer(nieuw)
      setTekst({
        entry: nieuw.entry === null ? '' : String(nieuw.entry),
        stop: nieuw.stop === null ? '' : String(nieuw.stop),
        lots: nieuw.lots === null ? '' : String(nieuw.lots),
      })
      const delen = [
        'Afgelezen uit je MT5. Controleer elk veld.',
        lezing.stop === null ? 'Er stond geen stop loss: vul de stop in die je aanhoudt.' : '',
        lezing.winstNu !== null ? `Stand nu: ${dollars(lezing.winstNu)}.` : '',
        lezing.opmerking,
        `Kosten: $${getal(kosten, 3)}.`,
      ]
      setMelding(delen.filter(Boolean).join(' '))
    } catch (e) {
      setMelding(e instanceof LeesFout ? `${e.message} Vul de velden zelf in.` : 'Aflezen lukte niet. Vul de velden zelf in.')
    } finally {
      setBezig(false)
    }
  }

  async function bewaar() {
    setBevestigen(false)
    const nu = new Date()
    const sessie = nlDatum(nu) === dag.datum ? sessieVanKlok(nu, dag.datum) : null
    const uitkomst = legTradeAchterafVast(dag, invoer, instellingen, nu, vandaag(), sessie, foto !== null)
    if ('fouten' in uitkomst) {
      setFouten(uitkomst.fouten)
      return
    }
    setFouten([])
    // De foto eerst: na het opslaan zit de dag op slot.
    if (foto) await schrijfScreenshot(dag.datum, foto)
    setDag(uitkomst.dag)
    await schrijfDag(uitkomst.dag)
  }

  const risico = risicoVanAchteraf(invoer, instellingen)

  return (
    <div className="blok stapel achteraf">
      <strong>Trade achteraf invoeren</strong>
      <p className="zacht">
        Voor een trade die je buiten de app om hebt genomen. Hij komt in je journal en telt mee voor je FTMO-stand. Omdat er
        vooraf geen plan in de app stond, telt hij als ongepland.
      </p>

      <label className={bezig ? 'knop uit' : 'knop'}>
        <Icoon naam="op" />
        {bezig ? 'De agent leest je MT5…' : foto ? 'Andere MT5-screenshot' : 'Screenshot van MT5 uploaden'}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          hidden
          disabled={bezig}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void leesFoto(f)
            e.target.value = ''
          }}
        />
      </label>
      {url && <img className="screenshot" src={url} alt="Je MT5-positie" />}
      {melding && <p className="melding let-op">{melding}</p>}

      <div className="veldgroep">
        <span className="label">Richting</span>
        <div className="labels">
          {(['long', 'short'] as const).map((r) => (
            <button
              key={r}
              className={invoer.richting === r ? 'chip keuze-chip gekozen' : 'chip keuze-chip'}
              onClick={() => setInvoer({ ...invoer, richting: r })}
            >
              {r === 'long' ? 'Long · buy' : 'Short · sell'}
            </button>
          ))}
        </div>
      </div>

      <div className="grootgetallen">
        {(['entry', 'stop', 'lots'] as Veld[]).map((veld) => (
          <label key={veld} className="veldgroep">
            <span className="label">{veld === 'entry' ? 'Entry' : veld === 'stop' ? 'Stop loss' : 'Lotsize'}</span>
            <input
              className="prijs"
              type="text"
              inputMode="decimal"
              value={tekst[veld]}
              onChange={(e) => zetVeld(veld, e.target.value)}
            />
          </label>
        ))}
      </div>
      {risico && risico.stopPips > 0 && (
        <p className="zacht getal">
          Stop {kort(risico.stopPips)} pips · risico {dollars(risico.bedrag)} ({kort(risico.procent)}% van je account)
        </p>
      )}

      <div className="veldgroep">
        <span className="label">Waar kwam de trade vandaan?</span>
        <div className="labels">
          {(Object.keys(HERKOMST_NAMEN) as Herkomst[]).map((h) => (
            <button
              key={h}
              className={invoer.herkomst === h ? 'chip keuze-chip gekozen' : 'chip keuze-chip'}
              onClick={() => setInvoer({ ...invoer, herkomst: h })}
            >
              {HERKOMST_NAMEN[h]}
            </button>
          ))}
        </div>
      </div>
      <label className="veldgroep">
        <span className="label">Toelichting (optioneel)</span>
        <textarea
          rows={2}
          placeholder="Bijvoorbeeld: call om te shorten, zelf niet gecheckt."
          value={invoer.toelichting}
          onChange={(e) => setInvoer({ ...invoer, toelichting: e.target.value })}
        />
      </label>

      {fouten.length > 0 && (
        <div className="melding fout" role="alert">
          <ul>
            {fouten.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      {bevestigen ? (
        <div className="bevestig">
          <p>
            <strong>Weet je het zeker?</strong> De dag gaat op slot (One &amp; Done). Daarna vul je het resultaat in zodra de
            trade dicht is.
          </p>
          <div className="rij-knoppen">
            <button className="knop primair" onClick={() => void bewaar()}>
              Ja, trade opslaan
            </button>
            <button className="knop" onClick={() => setBevestigen(false)}>
              Annuleren
            </button>
          </div>
        </div>
      ) : (
        <div className="rij-knoppen">
          <button className="knop primair" disabled={bezig} onClick={() => setBevestigen(true)}>
            Trade opslaan
          </button>
          <button className="knop" onClick={() => setOpen(false)}>
            Sluiten
          </button>
        </div>
      )}
    </div>
  )
}
