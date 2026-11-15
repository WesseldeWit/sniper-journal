import { useEffect, useRef, useState } from 'react'
import { leesChart, LeesFout } from '../ai/lees'
import { MODELLEN, type ModelId } from '../ai/modellen'
import { dagMetLezing } from '../ai/oordeel'
import { LEEG_AGENT_GEHEUGEN, type AgentGeheugen } from '../ai/opdracht'
import type { Lezing } from '../ai/schema'
import { leesModel, leesSleutel } from '../ai/sleutel'
import { compacteDatum } from '../hulp/datum'
import { dollars, getal, kort, leesGetal, metTeken } from '../hulp/getal'
import Icoon from '../onderdelen/Icoon'
import StatusChip from '../onderdelen/StatusChip'
import { leesAlleDagen, schrijfDag, schrijfScreenshot, type Dag } from '../opslag/dagen'
import { leesGeheugen, schrijfGeheugen } from '../opslag/geheugen'
import { useInstellingen } from '../opslag/InstellingenContext'
import { leesPlaybook } from '../opslag/playbook'
import { patronen, tradeRegels } from '../regels/agent'
import { MODEL_NAMEN } from '../regels/analyse'
import { EXTRA, VERPLICHT } from '../regels/check'
import { oordeelVanDag } from '../regels/dagoordeel'
import { ftmoStand } from '../regels/ftmo'
import { sessieVanKlok } from '../regels/sessie'

const NAMEN = Object.fromEntries([...VERPLICHT, ...EXTRA].map((c) => [c.id, c.naam]))
const MAX_VRAGEN = 3
type PrijsVeld = 'entry' | 'stop' | 'fibLijn' | 'zoneRand'
const PRIJS_NAAM: Record<PrijsVeld, string> = { entry: 'Entry', stop: 'Stop loss', fibLijn: '0.764-lijn', zoneRand: 'Rand van de zone' }

interface Props {
  dag: Dag
  setDag: (dag: Dag) => void
  setScreenshot: (foto: Blob | null) => void
  /** Waarschuwingen over nieuws, voor op het samenvattingsscherm. */
  waarschuwingen: { niveau: 'rood' | 'oranje'; tekst: string }[]
  zelfInvullen: () => void
  naarInstellingen?: () => void
}

type Fase = 'start' | 'bezig' | 'vragen' | 'samenvatting'

/** Eén screenshot uploaden; de agent leest de rest af. Zonder "Klopt" wordt er niets opgeslagen. */
export default function OchtendFlow({ dag, setDag, setScreenshot, waarschuwingen, zelfInvullen }: Props) {
  const { instellingen } = useInstellingen()
  const [fase, setFase] = useState<Fase>('start')
  const [bestand, setBestand] = useState<File | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [idee, setIdee] = useState('')
  const [lezing, setLezing] = useState<Lezing | null>(null)
  const [fout, setFout] = useState<string | null>(null)
  const [vraagNr, setVraagNr] = useState(0)
  const [antwoorden, setAntwoorden] = useState<string[]>([])
  const [anders, setAnders] = useState('')
  const [correcties, setCorrecties] = useState<string[]>([])
  const [reactie, setReactie] = useState('')
  const [bewerk, setBewerk] = useState<PrijsVeld | null>(null)
  const [bewerkTekst, setBewerkTekst] = useState('')
  const [luistert, setLuistert] = useState(false)
  const [geheugen, setGeheugen] = useState<AgentGeheugen>(LEEG_AGENT_GEHEUGEN)
  const [zelfPatronen, setZelfPatronen] = useState<string[]>([])
  const [kosten, setKosten] = useState(0)
  const rondes = useRef(0)
  const sleutel = leesSleutel()
  const model = leesModel<ModelId>(MODELLEN.map((m) => m.id))

  // Wat de agent bij elk gesprek bij de hand heeft: regels, lessen, werkwijze, laatste trades, playbook en FTMO-stand.
  useEffect(() => {
    void Promise.all([leesGeheugen(), leesAlleDagen(), leesPlaybook()]).then(([g, dagen, playbook]) => {
      const stand = ftmoStand(
        dagen.flatMap((d) => (d.resultaat && d.besluit ? [{ datum: d.datum, bedrag: d.resultaat.r * (d.besluit.bedrag ?? 0) }] : [])),
        instellingen.accountGrootte,
      )
      setGeheugen({
        werkwijze: g.werkwijze,
        lessen: g.lessen.map((l) => l.tekst),
        trades: tradeRegels(dagen),
        playbook: playbook.map(
          (p) => `${compacteDatum(p.datum)} · ${p.model ? MODEL_NAMEN[p.model] : 'geen model'} · ${p.r === null ? '' : `${metTeken(p.r)}R · `}${p.uitleg}`,
        ),
        stand: `${metTeken(stand.winstProcent)}% richting 10%, buffer ${dollars(Math.round(stand.buffer))}.`,
      })
      setZelfPatronen(patronen(dagen))
    })
  }, [instellingen.accountGrootte])

  useEffect(() => {
    if (!bestand) {
      setUrl(null)
      return
    }
    const u = URL.createObjectURL(bestand)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [bestand])

  async function lees(reacties?: string[]) {
    if (!bestand) return
    setFase('bezig')
    setFout(null)
    try {
      const antwoord = await leesChart({
        sleutel,
        model,
        afbeelding: bestand,
        idee,
        geheugen,
        vervolg: reacties && lezing ? { vorige: JSON.stringify(lezing), reacties } : undefined,
      })
      rondes.current += 1
      setKosten((k) => k + antwoord.kosten)
      // Vragen alleen in de eerste ronde, en nooit meer dan drie.
      const vragen = reacties ? [] : antwoord.lezing.vragen.slice(0, MAX_VRAGEN)
      setLezing({ ...antwoord.lezing, vragen })
      setVraagNr(0)
      setAntwoorden([])
      setFase(vragen.length > 0 ? 'vragen' : 'samenvatting')
    } catch (e) {
      setFout(e instanceof LeesFout ? e.message : 'Er ging iets mis.')
      setFase(lezing ? 'samenvatting' : 'start')
    }
  }

  function antwoord(tekst: string) {
    if (!lezing) return
    const alle = [...antwoorden, `Vraag: ${lezing.vragen[vraagNr].vraag} Antwoord: ${tekst}`]
    setAnders('')
    if (vraagNr + 1 < lezing.vragen.length) {
      setAntwoorden(alle)
      setVraagNr(vraagNr + 1)
    } else {
      void lees(alle)
    }
  }

  function spreekIn() {
    const Herkenning =
      (window as unknown as { SpeechRecognition?: new () => SpraakHerkenning }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => SpraakHerkenning }).webkitSpeechRecognition
    if (!Herkenning) return
    const h = new Herkenning()
    h.lang = 'nl-NL'
    h.onresult = (e) => setIdee(e.results[0][0].transcript)
    h.onend = () => setLuistert(false)
    h.onerror = () => setLuistert(false)
    setLuistert(true)
    h.start()
  }
  const kanSpreken = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  // ---- Start: screenshot en optioneel één zin ----
  if (fase === 'start' || (fase === 'bezig' && !lezing)) {
    return (
      <div className="ochtend">
        {!sleutel && (
          <div className="melding fout">
            Er is nog geen API-sleutel ingevuld bij Instellingen → AI-check. Zonder sleutel kan de agent je screenshot
            niet lezen.
          </div>
        )}
        {url ? <img className="screenshot" src={url} alt="Je chart" /> : null}
        <label className={fase === 'bezig' ? 'knop uit' : url ? 'knop' : 'knop primair'}>
          <Icoon naam="op" />
          {url ? 'Andere screenshot kiezen' : 'Screenshot uploaden'}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            hidden
            onChange={(e) => {
              setBestand(e.target.files?.[0] ?? null)
              e.target.value = ''
            }}
          />
        </label>
        <label className="veldgroep">
          <span className="label">Je idee in één zin (optioneel)</span>
          <span className="invoer">
            <input className="tekstveld" type="text" value={idee} disabled={fase === 'bezig'} onChange={(e) => setIdee(e.target.value)} />
            {kanSpreken && (
              <button type="button" className="knop" disabled={luistert || fase === 'bezig'} onClick={spreekIn}>
                {luistert ? 'Ik luister…' : 'Inspreken'}
              </button>
            )}
          </span>
        </label>
        {fout && (
          <div className="melding fout" role="alert">
            {fout}
          </div>
        )}
        {url && (
          <>
            <button className="knop primair" disabled={fase === 'bezig' || !sleutel} onClick={() => void lees()}>
              {fase === 'bezig' ? 'De agent leest je chart…' : 'Laat de agent lezen'}
            </button>
            <p className="zacht">Dit kost tegoed op je API-account. Datum en sessie komen van de klok.</p>
          </>
        )}
        <button className="knop zelf" onClick={zelfInvullen}>
          Zelf invullen
        </button>
      </div>
    )
  }

  if (!lezing) return null

  // ---- Vragen: één tegelijk, met aantikbare antwoorden ----
  if (fase === 'vragen') {
    const v = lezing.vragen[vraagNr]
    return (
      <div className="ochtend">
        <p className="agent-zegt">{lezing.beschrijving}</p>
        <div className="blok vraagkaart">
          <span className="bovenkop">
            Vraag {vraagNr + 1} van {lezing.vragen.length}
          </span>
          <strong>{v.vraag}</strong>
          <div className="labels">
            {v.antwoorden.map((a) => (
              <button key={a} className="chip keuze-chip" onClick={() => antwoord(a)}>
                {a}
              </button>
            ))}
          </div>
          <span className="invoer">
            <input className="tekstveld" type="text" placeholder="Of typ je antwoord" value={anders} onChange={(e) => setAnders(e.target.value)} />
            <button className="knop" disabled={!anders.trim()} onClick={() => antwoord(anders.trim())}>
              Stuur
            </button>
          </span>
        </div>
      </div>
    )
  }

  // ---- Samenvatting ----
  const sessie = sessieVanKlok(new Date(), dag.datum)
  const kandidaat = dagMetLezing(dag, lezing, sessie, idee, instellingen)
  const { analyse, check } = oordeelVanDag({ ...kandidaat, vastgelegdOp: 'kandidaat' }, instellingen)
  const bezig = fase === 'bezig'
  const vandaagTekst = compacteDatum(dag.datum)

  function corrigeerPrijs(veld: PrijsVeld) {
    const n = leesGetal(bewerkTekst)
    if (!lezing || Number.isNaN(n)) return
    const oud = lezing[veld].waarde
    setLezing({ ...lezing, [veld]: { waarde: n, zekerheid: 'zeker', bron: 'door jou gecorrigeerd' } })
    setCorrecties([
      ...correcties,
      `Correctie (${vandaagTekst}): ${PRIJS_NAAM[veld]} was ${getal(n)}; de AI las ${oud === null ? 'niets' : getal(oud)} af.`,
    ])
    setBewerk(null)
  }

  function wisselConfluence(id: string) {
    if (!lezing) return
    const c = lezing.confluences.find((x) => x.id === id)!
    const nieuw = c.gezien === 'gezien' ? 'niet_gezien' : 'gezien'
    setLezing({
      ...lezing,
      confluences: lezing.confluences.map((x) => (x.id === id ? { ...x, gezien: nieuw, uitleg: 'Door jou gecorrigeerd.' } : x)),
    })
    setCorrecties([
      ...correcties,
      `Correctie (${vandaagTekst}): ${NAMEN[id]} was ${nieuw === 'gezien' ? 'wel' : 'niet'} aanwezig; de AI zei: "${c.uitleg}"`,
    ])
  }

  function wisselRichting() {
    if (!lezing) return
    const nieuw = lezing.richting.waarde === 'long' ? 'short' : 'long'
    setLezing({ ...lezing, richting: { waarde: nieuw, zekerheid: 'zeker', uitleg: 'Door jou gecorrigeerd.' } })
    setCorrecties([...correcties, `Correctie (${vandaagTekst}): de richting was ${nieuw}.`])
  }

  async function klopt() {
    if (!bestand || !lezing) return
    const nu = new Date().toISOString()
    // Alleen een plan waarvan alle harde eisen kloppen wordt vastgelegd; de regels beslissen, niet de AI.
    const nieuw: Dag = { ...kandidaat, vastgelegdOp: analyse.geldig ? nu : null, checkKlaarOp: analyse.geldig ? nu : null }
    await schrijfScreenshot(dag.datum, bestand)
    setScreenshot(bestand)
    setDag(nieuw)
    await schrijfDag(nieuw)
    if (correcties.length > 0) {
      const g = await leesGeheugen()
      await schrijfGeheugen({ ...g, werkwijze: [...g.werkwijze, ...correcties] })
    }
  }

  const groot = (veld: PrijsVeld) => {
    const p = lezing[veld]
    return (
      <div className="grootgetal">
        <span className="label">{PRIJS_NAAM[veld]}</span>
        {bewerk === veld ? (
          <span className="invoer">
            <input className="prijs" type="text" inputMode="decimal" autoFocus value={bewerkTekst} onChange={(e) => setBewerkTekst(e.target.value)} />
            <button className="knop" onClick={() => corrigeerPrijs(veld)}>
              Oké
            </button>
          </span>
        ) : (
          <button
            className="tik grootgetal-waarde getal"
            title="Tik om te corrigeren"
            onClick={() => {
              setBewerk(veld)
              setBewerkTekst(p.waarde === null ? '' : kort(p.waarde))
            }}
          >
            {p.waarde === null ? 'niet leesbaar' : getal(p.waarde)}
          </button>
        )}
        <span className="zacht">
          {p.zekerheid === 'onzeker' && <strong className="twijfel">onzeker · </strong>}
          {p.bron}
        </span>
      </div>
    )
  }

  return (
    <div className="ochtend">
      {url && <img className="screenshot" src={url} alt="Je chart" />}

      <div className="grootgetallen">
        {groot('entry')}
        {groot('stop')}
      </div>

      <div className={check.goedgekeurd ? 'blok oordeel goed' : 'blok oordeel afgekeurd'} role="status">
        <strong className="oordeel-tekst">
          <Icoon naam={check.goedgekeurd ? 'vink' : 'kruis'} maat={24} />
          {check.goedgekeurd ? 'Goedgekeurd' : 'Afgekeurd'}
        </strong>
        {check.goedgekeurd ? (
          <div className="grootgetallen">
            <div className="grootgetal">
              <span className="label">Risico</span>
              <span className="grootgetal-waarde getal">{kort(check.risicoProcent!)}%</span>
              <span className="zacht getal">{dollars(check.bedrag!)}</span>
            </div>
            <div className="grootgetal">
              <span className="label">Lotsize</span>
              <span className="grootgetal-waarde getal">{getal(check.lots!)}</span>
              <span className="zacht">{check.aantalExtra} extra · stop {kort(analyse.stopPips!)} pips</span>
            </div>
          </div>
        ) : (
          <ul className="blokkades">
            {analyse.eisen
              .filter((e) => e.status !== 'ok')
              .map((e) => (
                <li key={e.id}>
                  {e.naam}: {e.uitleg}
                </li>
              ))}
            {analyse.geldig && check.redenen.map((r) => <li key={r}>{r}</li>)}
          </ul>
        )}
        <span className="zacht">Dit oordeel volgt uit jouw regels. De agent keurt niets goed of af.</span>
      </div>

      {waarschuwingen.map((w) => (
        <div key={w.tekst} className={w.niveau === 'rood' ? 'melding fout' : 'melding let-op'} role="alert">
          {w.tekst}
        </div>
      ))}

      <p className="agent-zegt">{lezing.beschrijving}</p>

      <dl className="cijfers">
        <dt>Richting</dt>
        <dd>
          <button className="tik" title="Tik om te corrigeren" onClick={wisselRichting}>
            {lezing.richting.waarde === 'long' ? 'Long' : lezing.richting.waarde === 'short' ? 'Short' : 'niet leesbaar'}
          </button>
        </dd>
        <dt>Sessie (van de klok)</dt>
        <dd>{sessie === 'londen' ? 'Londen' : sessie === 'newyork' ? 'New York' : 'geen sessie open'}</dd>
        <dt>Entry-model</dt>
        <dd>{lezing.entryModel.waarde ? MODEL_NAMEN[lezing.entryModel.waarde] : '–'}</dd>
        {lezing.doelen.map((d, n) => (
          <div key={n} className="cijfer-rij">
            <dt>Doel: {d.label}</dt>
            <dd>{getal(d.prijs)}</dd>
          </div>
        ))}
      </dl>
      <div className="grootgetallen">
        {groot('fibLijn')}
        {groot('zoneRand')}
      </div>

      <div className="veldgroep">
        <span className="label">Confluences · tik om te corrigeren</span>
        <ul className="gezien-lijst">
          {lezing.confluences.map((c) => (
            <li key={c.id}>
              <button className="tik" onClick={() => wisselConfluence(c.id)}>
                <StatusChip
                  soort={c.gezien === 'gezien' ? 'goedgekeurd' : c.gezien === 'onduidelijk' ? 'wachtend' : 'neutraal'}
                  tekst={c.gezien === 'gezien' ? 'Gezien' : c.gezien === 'onduidelijk' ? 'Onduidelijk' : 'Niet gezien'}
                />
              </button>
              <span>
                <strong>{NAMEN[c.id]}</strong>
                <span className="uitleg">{c.uitleg}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="blok tegen">
        <span className="bovenkop">Advocaat van de duivel</span>
        <p>{lezing.tegenargument}</p>
        {lezing.vergelijking.trim() && (
          <>
            <span className="bovenkop">Lijkt op</span>
            <p>{lezing.vergelijking}</p>
          </>
        )}
        {zelfPatronen.length > 0 && (
          <>
            <span className="bovenkop">Patroon in jezelf</span>
            <p>{zelfPatronen.join(' ')}</p>
          </>
        )}
        {lezing.twijfelpunten.length > 0 && (
          <>
            <span className="bovenkop">Twijfelpunten</span>
            <ul className="opsomming">
              {lezing.twijfelpunten.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </>
        )}
      </div>

      <label className="veldgroep">
        <span className="label">Klopt er iets niet? Reageer kort</span>
        <span className="invoer">
          <input className="tekstveld" type="text" value={reactie} disabled={bezig} onChange={(e) => setReactie(e.target.value)} />
          <button
            className="knop"
            disabled={!reactie.trim() || bezig}
            onClick={() => {
              const tekst = reactie.trim()
              setCorrecties([...correcties, tekst])
              setReactie('')
              void lees([...correcties, tekst])
            }}
          >
            {bezig ? 'Bezig…' : 'Stuur'}
          </button>
        </span>
      </label>
      {correcties.length > 0 && (
        <p className="zacht">
          {correcties.length} {correcties.length === 1 ? 'correctie gaat' : 'correcties gaan'} bij "Klopt" naar je lijst
          "Zo analyseer ik".
        </p>
      )}
      {fout && (
        <div className="melding fout" role="alert">
          {fout}
        </div>
      )}

      <button className="knop primair" disabled={bezig} onClick={() => void klopt()}>
        Klopt
      </button>
      <p className="zacht">
        Zonder "Klopt" wordt er niets opgeslagen. {check.goedgekeurd ? 'Daarna volgt de orderkaart.' : 'Een afgekeurde setup kan geen trade worden.'}{' '}
        <span className="getal">Verbruik tot nu toe: ${getal(kosten, 3)}.</span>
      </p>
      <button className="knop zelf" disabled={bezig} onClick={() => { setLezing(null); setCorrecties([]); setFase('start') }}>
        Opnieuw beginnen
      </button>
    </div>
  )
}

interface SpraakHerkenning {
  lang: string
  onresult: ((e: { results: { 0: { transcript: string } }[] }) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start: () => void
}
