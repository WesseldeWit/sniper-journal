import { useEffect, useState } from 'react'
import { maandagVan, plusDagen, vandaag, werkweek } from '../hulp/datum'
import { metTeken } from '../hulp/getal'
import { leesAlleDagen, type Dag } from '../opslag/dagen'
import { leesGeheugen, nieuwId, schrijfGeheugen, type Geheugen, type Les } from '../opslag/geheugen'
import { useInstellingen } from '../opslag/InstellingenContext'
import { patronen, SIGNAAL_SOORTEN } from '../regels/agent'
import { maandPatronen, weekOverzicht } from '../regels/terugblik'
import NotitiesScherm from './NotitiesScherm'

/** Eén pagina met alles wat de agent over je weet. Niets is verborgen; alles is aan te passen. */
export default function AgentScherm() {
  const { instellingen, bewaar: bewaarInstellingen } = useInstellingen()
  const [geheugen, setGeheugen] = useState<Geheugen | null>(null)
  const [dagen, setDagen] = useState<Dag[]>([])
  const [nieuweLes, setNieuweLes] = useState('')
  const [nieuweRegel, setNieuweRegel] = useState('')
  const [notities, setNotities] = useState(false)
  const [melding, setMelding] = useState(typeof Notification === 'undefined' ? 'niet-ondersteund' : Notification.permission)

  useEffect(() => {
    void leesGeheugen().then(setGeheugen)
    void leesAlleDagen().then(setDagen)
  }, [])

  if (notities) {
    return (
      <section className="pagina">
        <button className="knop terug" onClick={() => setNotities(false)}>
          ‹ Agent
        </button>
        <NotitiesScherm />
      </section>
    )
  }
  if (!geheugen) return null

  function bewaar(nieuw: Geheugen) {
    setGeheugen(nieuw)
    void schrijfGeheugen(nieuw)
  }
  const les = (tekst: string, bron: string): Les => ({ id: nieuwId(), tekst: tekst.trim(), bron, datum: vandaag() })

  // In het weekend kijkt het overzicht naar de week die net voorbij is, doordeweeks naar de vorige week.
  const nu = vandaag()
  const weekend = [0, 6].includes(new Date(nu).getDay())
  const week = werkweek(weekend ? maandagVan(nu) : plusDagen(maandagVan(nu), -7))
  const overzicht = weekOverzicht(dagen, week)
  const maand = maandPatronen(dagen)
  const zelf = patronen(dagen)
  const alVoorgesteld = (tekst: string) => [...geheugen.lessen, ...geheugen.voorstellen].some((l) => l.tekst === tekst)

  const lijst = (items: string[], leeg: string) =>
    items.length ? (
      <ul className="opsomming">
        {items.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    ) : (
      <p className="zacht">{leeg}</p>
    )

  return (
    <section className="instellingen">
      <div>
        <p className="bovenkop">Agent</p>
        <h1>Wat ik over je weet</h1>
      </div>
      <p className="zacht">
        Dit is alles wat de agent gebruikt. Hij ziet geen live koersen, weet alleen wat jij invult, voorspelt niets,
        plaatst geen orders en kan een afgekeurde trade niet goedkeuren.
      </p>

      <div className="blok">
        <h2>Voorstellen</h2>
        <p className="zacht">Een voorstel telt pas mee als je het goedkeurt.</p>
        {geheugen.voorstellen.length === 0 && <p className="zacht">Geen openstaande voorstellen.</p>}
        {geheugen.voorstellen.map((v) => (
          <div key={v.id} className="geheugen-rij">
            <span>
              {v.tekst} <span className="zacht">· {v.bron}</span>
            </span>
            <div className="rij-knoppen">
              <button
                className="knop"
                onClick={() =>
                  bewaar({
                    ...geheugen,
                    voorstellen: geheugen.voorstellen.filter((x) => x.id !== v.id),
                    lessen: [...geheugen.lessen, v],
                  })
                }
              >
                Goedkeuren
              </button>
              <button
                className="knop"
                onClick={() => bewaar({ ...geheugen, voorstellen: geheugen.voorstellen.filter((x) => x.id !== v.id) })}
              >
                Afwijzen
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="blok">
        <h2>Mijn lessen</h2>
        <p className="zacht">De eerste drie staan elke ochtend in je briefing.</p>
        {geheugen.lessen.map((l) => (
          <div key={l.id} className="geheugen-rij">
            <textarea
              rows={2}
              value={l.tekst}
              onChange={(e) =>
                bewaar({ ...geheugen, lessen: geheugen.lessen.map((x) => (x.id === l.id ? { ...x, tekst: e.target.value } : x)) })
              }
            />
            <button className="knop" onClick={() => bewaar({ ...geheugen, lessen: geheugen.lessen.filter((x) => x.id !== l.id) })}>
              Verwijderen
            </button>
          </div>
        ))}
        <div className="geheugen-rij">
          <textarea rows={2} placeholder="Nieuwe les" value={nieuweLes} onChange={(e) => setNieuweLes(e.target.value)} />
          <button
            className="knop"
            disabled={!nieuweLes.trim()}
            onClick={() => {
              bewaar({ ...geheugen, lessen: [...geheugen.lessen, les(nieuweLes, 'zelf toegevoegd')] })
              setNieuweLes('')
            }}
          >
            Toevoegen
          </button>
        </div>
      </div>

      <div className="blok">
        <h2>Zo analyseer ik</h2>
        <p className="zacht">Correcties op hoe de AI je charts leest. Hij krijgt deze lijst bij elke analyse mee.</p>
        {geheugen.werkwijze.map((regel, n) => (
          <div key={n} className="geheugen-rij">
            <textarea
              rows={2}
              value={regel}
              onChange={(e) => bewaar({ ...geheugen, werkwijze: geheugen.werkwijze.map((x, m) => (m === n ? e.target.value : x)) })}
            />
            <button className="knop" onClick={() => bewaar({ ...geheugen, werkwijze: geheugen.werkwijze.filter((_, m) => m !== n) })}>
              Verwijderen
            </button>
          </div>
        ))}
        <div className="geheugen-rij">
          <textarea
            rows={2}
            placeholder="Bijvoorbeeld: mijn zone teken ik als grijze rechthoek"
            value={nieuweRegel}
            onChange={(e) => setNieuweRegel(e.target.value)}
          />
          <button
            className="knop"
            disabled={!nieuweRegel.trim()}
            onClick={() => {
              bewaar({ ...geheugen, werkwijze: [...geheugen.werkwijze, nieuweRegel.trim()] })
              setNieuweRegel('')
            }}
          >
            Toevoegen
          </button>
        </div>
      </div>

      <div className="blok">
        <h2>Weekoverzicht</h2>
        <p className="zacht">
          Week van {week[0].slice(8)}-{week[0].slice(5, 7)} tot en met {week[4].slice(8)}-{week[4].slice(5, 7)}.
        </p>
        <dl className="cijfers smal">
          <dt>Analyses</dt>
          <dd>{overzicht.analyses}</dd>
          <dt>Trades</dt>
          <dd>{overzicht.trades}</dd>
          <dt>Totaal</dt>
          <dd>{overzicht.afgerond ? `${metTeken(overzicht.totaalR)}R` : '–'}</dd>
          <dt>Volgens de regels</dt>
          <dd>{overzicht.afgerond ? `${overzicht.volgensRegels}/${overzicht.afgerond}` : '–'}</dd>
        </dl>
        <span className="label">Wat ging goed</span>
        {lijst(overzicht.goed, 'Nog niets om te melden.')}
        <span className="label">Vaakste fout</span>
        <p>{overzicht.vaaksteFout ?? 'Geen foutlabels deze week.'}</p>
        {overzicht.voorstel && (
          <div className="geheugen-rij">
            <span>
              <span className="label">Voorstel voor komende week</span>
              <br />
              {overzicht.voorstel}
            </span>
            <button
              className="knop"
              disabled={alVoorgesteld(overzicht.voorstel)}
              onClick={() => bewaar({ ...geheugen, voorstellen: [...geheugen.voorstellen, les(overzicht.voorstel!, 'weekoverzicht')] })}
            >
              {alVoorgesteld(overzicht.voorstel) ? 'Staat bij voorstellen' : 'Zet bij voorstellen'}
            </button>
          </div>
        )}
      </div>

      <div className="blok">
        <h2>Patronen in al je trades</h2>
        {lijst([...zelf, ...maand.zinnen], 'Nog te weinig afgeronde trades om iets te tellen (minimaal 3 per groep).')}
        <p className="zacht">{maand.voorbehoud}</p>
      </div>

      <div className="blok">
        <h2>Meldingen</h2>
        <p className="zacht">
          Maximaal vijf per dag. Ze verschijnen altijd in je briefing; als melding van je browser alleen terwijl de
          app open staat.
        </p>
        {SIGNAAL_SOORTEN.map((s) => {
          const uit = instellingen.meldingenUit.includes(s.id)
          return (
            <label key={s.id} className="vinkje">
              <input
                type="checkbox"
                checked={!uit}
                onChange={() =>
                  bewaarInstellingen({
                    ...instellingen,
                    meldingenUit: uit ? instellingen.meldingenUit.filter((x) => x !== s.id) : [...instellingen.meldingenUit, s.id],
                  })
                }
              />
              <span>{s.naam}</span>
            </label>
          )
        })}
        {melding === 'default' && (
          <button className="knop zelf" onClick={() => void Notification.requestPermission().then(setMelding)}>
            Meldingen van de browser aanzetten
          </button>
        )}
        {melding === 'granted' && <p className="zacht">Meldingen van de browser staan aan.</p>}
        {melding === 'denied' && <p className="zacht">Meldingen zijn in je browser geblokkeerd. Je ziet ze alleen in de briefing.</p>}
      </div>

      <div className="blok">
        <h2>Losse notities</h2>
        <button className="knop zelf" onClick={() => setNotities(true)}>
          Open notities
        </button>
      </div>
    </section>
  )
}
