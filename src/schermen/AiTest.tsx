import { useEffect, useRef, useState } from 'react'
import { leesChart, LeesFout, type LeesAntwoord } from '../ai/lees'
import { MODELLEN, type ModelId } from '../ai/modellen'
import { LEEG_AGENT_GEHEUGEN } from '../ai/opdracht'
import { oordeelUitLezing, PRIJS_EISEN } from '../ai/oordeel'
import type { Lezing, Zekerheid } from '../ai/schema'
import { leesSleutel } from '../ai/sleutel'
import { dollars, getal, kort } from '../hulp/getal'
import Icoon from '../onderdelen/Icoon'
import StatusChip from '../onderdelen/StatusChip'
import { useInstellingen } from '../opslag/InstellingenContext'
import { EXTRA, VERPLICHT } from '../regels/check'

const MAX = 10

type Uitkomst = { antwoord: LeesAntwoord } | { fout: string } | { bezig: true }
type Beoordeling = 'goed' | 'fout' | null

interface Kaart {
  id: string
  bestand: File
  url: string
  idee: string
  uitkomsten: Partial<Record<ModelId, Uitkomst>>
  /** Jouw eigen oordeel per model: heeft de AI entry en stop goed afgelezen? */
  beoordeling: Partial<Record<ModelId, Beoordeling>>
}

const NAMEN = Object.fromEntries([...VERPLICHT, ...EXTRA].map((c) => [c.id, c.naam]))
const GEZIEN = {
  gezien: { soort: 'goedgekeurd', tekst: 'Gezien' },
  niet_gezien: { soort: 'neutraal', tekst: 'Niet gezien' },
  onduidelijk: { soort: 'wachtend', tekst: 'Onduidelijk' },
} as const
const ZEKER: Record<Zekerheid, string> = { zeker: '', onzeker: 'onzeker', niet_leesbaar: 'niet leesbaar' }

export default function AiTest({ naarInstellingen }: { naarInstellingen: () => void }) {
  const { instellingen } = useInstellingen()
  const [kaarten, setKaarten] = useState<Kaart[]>([])
  const [model, setModel] = useState<ModelId>(MODELLEN[0].id)
  const [bezig, setBezig] = useState(false)
  const [melding, setMelding] = useState<string | null>(null)
  const stop = useRef(false)
  const sleutel = leesSleutel()

  // Ruim de voorbeeldafbeeldingen op als de pagina sluit.
  const urls = useRef<string[]>([])
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), [])

  function voegToe(bestanden: FileList | null) {
    if (!bestanden) return
    const ruimte = MAX - kaarten.length
    const nieuw = [...bestanden].slice(0, ruimte).map((bestand, n) => {
      const url = URL.createObjectURL(bestand)
      urls.current.push(url)
      return { id: `${Date.now()}-${n}`, bestand, url, idee: '', uitkomsten: {}, beoordeling: {} }
    })
    setMelding(bestanden.length > ruimte ? `Er passen maximaal ${MAX} screenshots op deze pagina.` : null)
    setKaarten([...kaarten, ...nieuw])
  }

  const werkBij = (id: string, wijzig: (k: Kaart) => Kaart) =>
    setKaarten((lijst) => lijst.map((k) => (k.id === id ? wijzig(k) : k)))

  async function leesAlles() {
    setBezig(true)
    setMelding(null)
    stop.current = false
    // Eén voor één, zodat een fout of een limiet niet alles tegelijk raakt.
    for (const kaart of kaarten) {
      if (stop.current) break
      const al = kaart.uitkomsten[model]
      if (al && 'antwoord' in al) continue
      werkBij(kaart.id, (k) => ({ ...k, uitkomsten: { ...k.uitkomsten, [model]: { bezig: true } } }))
      let uitkomst: Uitkomst
      try {
        uitkomst = { antwoord: await leesChart({ sleutel, model, afbeelding: kaart.bestand, idee: kaart.idee, geheugen: LEEG_AGENT_GEHEUGEN }) }
      } catch (fout) {
        uitkomst = { fout: fout instanceof LeesFout ? fout.message : 'Er ging iets mis.' }
      }
      werkBij(kaart.id, (k) => ({ ...k, uitkomsten: { ...k.uitkomsten, [model]: uitkomst } }))
      // Bij een fout met de sleutel heeft doorgaan geen zin.
      if ('fout' in uitkomst && uitkomst.fout.includes('API-sleutel')) break
    }
    setBezig(false)
  }

  const telling = MODELLEN.map((m) => {
    const klaar = kaarten.flatMap((k) => {
      const u = k.uitkomsten[m.id]
      return u && 'antwoord' in u ? [{ antwoord: u.antwoord, oordeel: k.beoordeling[m.id] ?? null }] : []
    })
    return {
      model: m,
      aantal: klaar.length,
      goed: klaar.filter((x) => x.oordeel === 'goed').length,
      beoordeeld: klaar.filter((x) => x.oordeel !== null).length,
      kosten: klaar.reduce((som, x) => som + x.antwoord.kosten, 0),
    }
  }).filter((t) => t.aantal > 0)

  const teLezen = kaarten.filter((k) => {
    const u = k.uitkomsten[model]
    return !u || !('antwoord' in u)
  }).length

  return (
    <section className="pagina">
      <div>
        <p className="bovenkop">Testpagina</p>
        <h1>Hoe goed leest de AI je charts?</h1>
      </div>
      <p className="zacht">
        Upload tot {MAX} oude screenshots. De AI leest ze af en de app rekent met jouw regels uit of de setup
        goedgekeurd zou zijn. Jij geeft per screenshot aan of entry en stop kloppen. Er wordt niets opgeslagen:
        na het sluiten of herladen van deze pagina zijn de resultaten weg.
      </p>

      {!sleutel && (
        <div className="leeg">
          <span className="leeg-icoon">
            <Icoon naam="slot" maat={28} />
          </span>
          <p className="zacht">Vul eerst je API-sleutel in bij Instellingen.</p>
          <button className="knop primair" onClick={naarInstellingen}>
            Naar Instellingen
          </button>
        </div>
      )}

      {sleutel && (
        <div className="blok">
          <div className="veldgroep">
            <span className="label">Model</span>
            <div className="keuze" role="group" aria-label="Model">
              {MODELLEN.map((m) => (
                <button
                  key={m.id}
                  className={model === m.id ? 'keuze-knop actief' : 'keuze-knop'}
                  aria-pressed={model === m.id}
                  disabled={bezig}
                  onClick={() => setModel(m.id)}
                >
                  {m.naam}
                </button>
              ))}
            </div>
          </div>

          <div className="rij-knoppen">
            <label className={kaarten.length >= MAX || bezig ? 'knop uit' : 'knop'}>
              Screenshots kiezen ({kaarten.length}/{MAX})
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                multiple
                hidden
                onChange={(e) => {
                  voegToe(e.target.files)
                  e.target.value = ''
                }}
              />
            </label>
            {kaarten.length > 0 && !bezig && (
              <button className="knop" onClick={() => setKaarten([])}>
                Alles wissen
              </button>
            )}
          </div>

          {melding && <p className="veld-fout">{melding}</p>}

          {kaarten.length > 0 &&
            (bezig ? (
              <button className="knop" onClick={() => (stop.current = true)}>
                Stoppen na deze screenshot
              </button>
            ) : (
              <>
                <button className="knop primair" disabled={teLezen === 0} onClick={() => void leesAlles()}>
                  {teLezen === 0
                    ? 'Alles is gelezen met dit model'
                    : `Lees ${teLezen} ${teLezen === 1 ? 'screenshot' : 'screenshots'} af`}
                </button>
                <p className="zacht">
                  Dit kost tegoed op je API-account: naar schatting een paar cent tot een dubbeltje per screenshot.
                  De werkelijke kosten staan na afloop bij elk resultaat.
                </p>
              </>
            ))}
        </div>
      )}

      {telling.length > 0 && (
        <div className="blok">
          <h2>Tussenstand</h2>
          <div className="tabel-rol">
            <table>
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Gelezen</th>
                  <th>Goed afgelezen</th>
                  <th>Kosten</th>
                  <th>Per screenshot</th>
                </tr>
              </thead>
              <tbody>
                {telling.map((t) => (
                  <tr key={t.model.id}>
                    <td>{t.model.naam}</td>
                    <td>{t.aantal}</td>
                    <td>{t.beoordeeld === 0 ? '–' : `${t.goed}/${t.beoordeeld}`}</td>
                    <td>{dollars(Number(t.kosten.toFixed(2)))}</td>
                    <td>${getal(t.kosten / t.aantal, 3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {kaarten.map((kaart, n) => (
        <article key={kaart.id} className="blok testkaart">
          <div className="testkaart-kop">
            <h2>
              {n + 1}. {kaart.bestand.name}
            </h2>
            {!bezig && (
              <button className="knop" onClick={() => setKaarten(kaarten.filter((k) => k.id !== kaart.id))}>
                Verwijderen
              </button>
            )}
          </div>
          <img className="screenshot" src={kaart.url} alt={`Screenshot ${n + 1}`} />
          <label className="veldgroep">
            <span className="label">Jouw idee in één zin (optioneel)</span>
            <input
              className="tekstveld"
              type="text"
              value={kaart.idee}
              disabled={bezig}
              onChange={(e) => werkBij(kaart.id, (k) => ({ ...k, idee: e.target.value }))}
            />
          </label>

          {MODELLEN.map((m) => {
            const u = kaart.uitkomsten[m.id]
            if (!u) return null
            return (
              <div key={m.id} className="lezing">
                <p className="bovenkop">{m.naam}</p>
                {'bezig' in u && <StatusChip soort="wachtend" tekst="Bezig met aflezen" />}
                {'fout' in u && (
                  <div className="melding fout" role="alert">
                    {u.fout}
                  </div>
                )}
                {'antwoord' in u && (
                  <Resultaat
                    antwoord={u.antwoord}
                    oordeel={oordeelUitLezing(u.antwoord.lezing, instellingen)}
                    beoordeling={kaart.beoordeling[m.id] ?? null}
                    beoordeel={(b) =>
                      werkBij(kaart.id, (k) => ({ ...k, beoordeling: { ...k.beoordeling, [m.id]: b } }))
                    }
                  />
                )}
              </div>
            )
          })}
        </article>
      ))}
    </section>
  )
}

function Resultaat({
  antwoord,
  oordeel,
  beoordeling,
  beoordeel,
}: {
  antwoord: LeesAntwoord
  oordeel: ReturnType<typeof oordeelUitLezing>
  beoordeling: Beoordeling
  beoordeel: (b: Beoordeling) => void
}) {
  const l: Lezing = antwoord.lezing
  const prijs = (p: Lezing['entry']) => (p.waarde === null ? '–' : getal(p.waarde))
  const groot = (label: string, p: Lezing['entry']) => (
    <div className="grootgetal">
      <span className="label">{label}</span>
      <span className="grootgetal-waarde getal">{prijs(p)}</span>
      <span className="zacht">
        {ZEKER[p.zekerheid] && <strong className="twijfel">{ZEKER[p.zekerheid]} · </strong>}
        {p.bron}
      </span>
    </div>
  )

  return (
    <>
      <div className="grootgetallen">
        {groot('Entry', l.entry)}
        {groot('Stop loss', l.stop)}
      </div>

      <dl className="cijfers">
        <dt>Richting</dt>
        <dd>
          {l.richting.waarde === 'long' ? 'Long' : l.richting.waarde === 'short' ? 'Short' : '–'}
          {ZEKER[l.richting.zekerheid] && ` (${ZEKER[l.richting.zekerheid]})`}
        </dd>
        <dt>0.764-lijn</dt>
        <dd>
          {prijs(l.fibLijn)}
          {ZEKER[l.fibLijn.zekerheid] && ` (${ZEKER[l.fibLijn.zekerheid]})`}
        </dd>
        <dt>Rand van de zone</dt>
        <dd>
          {prijs(l.zoneRand)}
          {ZEKER[l.zoneRand.zekerheid] && ` (${ZEKER[l.zoneRand.zekerheid]})`}
        </dd>
        <dt>Stop in pips</dt>
        <dd>{oordeel.analyse.stopPips === null ? '–' : kort(oordeel.analyse.stopPips)}</dd>
        {l.doelen.map((d, n) => (
          <div key={n} className="cijfer-rij">
            <dt>Doel: {d.label}</dt>
            <dd>{getal(d.prijs)}</dd>
          </div>
        ))}
      </dl>

      <p>{l.beschrijving}</p>

      <div className={oordeel.check.goedgekeurd ? 'blok oordeel goed' : 'blok oordeel afgekeurd'}>
        <span className="zacht">Oordeel volgens jouw regels, op basis van deze lezing</span>
        <strong className="oordeel-tekst">
          <Icoon naam={oordeel.check.goedgekeurd ? 'vink' : 'kruis'} maat={24} />
          {oordeel.check.goedgekeurd ? 'Goedgekeurd' : 'Afgekeurd'}
        </strong>
        {oordeel.check.goedgekeurd ? (
          <span className="getal">
            {oordeel.check.aantalExtra} extra · {kort(oordeel.check.risicoProcent!)}% · {dollars(oordeel.check.bedrag!)} ·{' '}
            {getal(oordeel.check.lots!)} lot
          </span>
        ) : (
          <ul className="blokkades">
            {oordeel.analyse.eisen
              .filter((e) => PRIJS_EISEN.includes(e.id) && e.status !== 'ok')
              .map((e) => (
                <li key={e.id}>
                  {e.naam}: {e.uitleg}
                </li>
              ))}
            {oordeel.prijzenGeldig && oordeel.check.redenen.map((r) => <li key={r}>{r}</li>)}
          </ul>
        )}
      </div>

      <ul className="gezien-lijst">
        {l.confluences.map((c) => (
          <li key={c.id}>
            <StatusChip soort={GEZIEN[c.gezien].soort} tekst={GEZIEN[c.gezien].tekst} />
            <span>
              <strong>{NAMEN[c.id]}</strong>
              <span className="uitleg">{c.uitleg}</span>
            </span>
          </li>
        ))}
      </ul>

      {l.twijfelpunten.length > 0 && (
        <div>
          <span className="label">Twijfelpunten</span>
          <ul className="opsomming">
            {l.twijfelpunten.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      )}

      {l.vragen.length > 0 && (
        <div>
          <span className="label">Vragen die de AI zou stellen</span>
          {l.vragen.map((v) => (
            <div key={v.vraag} className="vraag-ai">
              <span>{v.vraag}</span>
              <div className="labels">
                {v.antwoorden.map((a) => (
                  <span key={a} className="chip vast">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="veldgroep">
        <span className="label">Jouw oordeel: zijn entry en stop goed afgelezen?</span>
        <div className="keuze" role="group" aria-label="Jouw oordeel">
          <button
            className={beoordeling === 'goed' ? 'keuze-knop actief' : 'keuze-knop'}
            aria-pressed={beoordeling === 'goed'}
            onClick={() => beoordeel(beoordeling === 'goed' ? null : 'goed')}
          >
            Klopt
          </button>
          <button
            className={beoordeling === 'fout' ? 'keuze-knop actief' : 'keuze-knop'}
            aria-pressed={beoordeling === 'fout'}
            onClick={() => beoordeel(beoordeling === 'fout' ? null : 'fout')}
          >
            Klopt niet
          </button>
        </div>
      </div>

      <p className="zacht getal">
        {antwoord.model} · {antwoord.verbruik.invoer.toLocaleString('nl-NL')} tokens in ·{' '}
        {antwoord.verbruik.uitvoer.toLocaleString('nl-NL')} uit · ${getal(antwoord.kosten, 3)} ·{' '}
        {getal(antwoord.duurMs / 1000, 1)} s
      </p>
    </>
  )
}
