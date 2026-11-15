import { useEffect, useState } from 'react'
import { useNieuws } from '../opslag/nieuws'
import { aftellen, blokkadeNu, venstersVoor } from '../regels/nieuws'
import { klokTekst, nlDatum, nlMinuten } from '../regels/sessie'
import Icoon from '../onderdelen/Icoon'
import StatusChip from '../onderdelen/StatusChip'
import { getal as toonGetal } from '../hulp/getal'
import { oordeelVanDag } from '../regels/dagoordeel'
import OrderKaart, { type OrderRegel } from './OrderKaart'
import { vandaag } from '../hulp/datum'
import { dollars, getal, kort } from '../hulp/getal'
import { schrijfDag, type Dag } from '../opslag/dagen'
import { useInstellingen } from '../opslag/InstellingenContext'
import { foutenBijGenomen, isOngepland, neemTrade, slaOver } from '../regels/besluit'

const moment = (iso: string) =>
  new Date(iso).toLocaleString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

export default function BesluitStap({ dag, setDag }: { dag: Dag; setDag: (dag: Dag) => void }) {
  const { instellingen } = useInstellingen()
  const [reden, setReden] = useState('')
  const [achteraf, setAchteraf] = useState(false)
  const [bevestigen, setBevestigen] = useState(false)
  const [fouten, setFouten] = useState<string[]>([])
  const nieuws = useNieuws()
  // De aftelklok van de blokkade loopt mee.
  const [, setTik] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setTik((t) => t + 1), 20000)
    return () => clearInterval(timer)
  }, [])


  function bewaar(nieuw: Dag) {
    setDag(nieuw)
    void schrijfDag(nieuw)
  }

  function verwerk(uitkomst: ReturnType<typeof neemTrade>) {
    setBevestigen(false)
    if ('fouten' in uitkomst) {
      setFouten(uitkomst.fouten)
    } else {
      setFouten([])
      // Een genomen trade sluit de dag meteen af (One & Done).
      bewaar({
        ...dag,
        besluit: uitkomst.besluit,
        afgeslotenOp: uitkomst.besluit.soort === 'genomen' ? uitkomst.besluit.op : dag.afgeslotenOp,
        // Bewaar bij de trade welk nieuws er die dag was.
        nieuws: nieuws.bekend ? nieuws.items.filter((n) => n.datum === dag.datum) : null,
      })
    }
  }

  const b = dag.besluit

  if (b?.soort === 'genomen') {
    return (
      <div className="blok slot">
        <strong className="oordeel-tekst">
          <Icoon naam="slot" maat={24} />
          Trade genomen · dag op slot
        </strong>
        <p className="zacht">{moment(b.op)}</p>
        {b.ongepland && <span className="label-fout">Ongepland</span>}
        <dl className="cijfers smal">
          <dt>Lotsize</dt>
          <dd>{getal(b.lots ?? 0)} lot</dd>
          <dt>Risico</dt>
          <dd>
            {kort(b.risicoProcent ?? 0)}% · {dollars(b.bedrag ?? 0)}
          </dd>
          <dt>Extra confluences</dt>
          <dd>{b.aantalConfluences} van 6</dd>
        </dl>
        <p className="zacht">De managementkaart staat bij stap 4.</p>
        <p>
          One &amp; Done. Vandaag komt er geen tweede trade, bij winst en bij verlies. Volg het
          trademanagement-schema en sluit het platform.
        </p>
      </div>
    )
  }

  if (b?.soort === 'niet-genomen') {
    return (
      <div className="blok">
        <strong>Niet genomen</strong>
        <p className="zacht">{moment(b.op)}</p>
        <p>{b.reden}</p>
        {dag.afgeslotenOp ? (
          <StatusChip soort="slot" tekst="Dag afgesloten" />
        ) : (
          <div className="rij-knoppen">
            <button className="knop primair" onClick={() => bewaar({ ...dag, afgeslotenOp: new Date().toISOString() })}>
              Dag afsluiten
            </button>
            <button className="knop" onClick={() => bewaar({ ...dag, besluit: null })}>
              Besluit terugdraaien
            </button>
          </div>
        )}
      </div>
    )
  }

  if (dag.afgeslotenOp) {
    return (
      <div className="blok">
        <StatusChip soort="slot" tekst="Dag afgesloten zonder trade" />
      </div>
    )
  }

  const nu = vandaag()
  const toekomst = dag.datum > nu
  // Rood nieuws: zolang het venster loopt, kan een trade niet als genomen worden gemarkeerd.
  const klok = new Date()
  const isVandaag = nlDatum(klok) === dag.datum
  const vensters = isVandaag ? venstersVoor(nieuws.items, dag.datum, instellingen.nieuwsVoor, instellingen.nieuwsNa) : []
  const lopend = nieuws.bekend ? blokkadeNu(vensters, nlMinuten(klok)) : null
  const nieuwsBlokkade = lopend
    ? `Nieuwsblokkade (${lopend.naam}): niet traden tot ${klokTekst(lopend.tot)}, nog ${aftellen(lopend.tot - nlMinuten(klok))}.`
    : null
  const blokkades = foutenBijGenomen(dag, instellingen, nu, nieuwsBlokkade)
  const magNemen = blokkades.length === 0
  const automatischOngepland = isOngepland(dag, false)
  const { analyse, check } = oordeelVanDag(dag, instellingen)
  const punt = (n: number, decimalen = 2) => n.toFixed(decimalen)
  const order: OrderRegel[] | null =
    check.goedgekeurd && analyse.entry !== null && analyse.doelen && dag.analyse.stop !== null
      ? [
          {
            naam: 'Richting',
            tekst: dag.analyse.richting === 'short' ? 'Short · verkopen' : 'Long · kopen',
            kopie: dag.analyse.richting === 'short' ? 'Sell' : 'Buy',
          },
          { naam: 'Lotsize', tekst: toonGetal(check.lots!), kopie: punt(check.lots!) },
          { naam: 'Entry', tekst: toonGetal(analyse.entry), kopie: punt(analyse.entry) },
          { naam: 'Stop loss', tekst: toonGetal(dag.analyse.stop), kopie: punt(dag.analyse.stop) },
          { naam: 'Doel (1:3)', tekst: toonGetal(analyse.doelen.r3), kopie: punt(analyse.doelen.r3) },
        ]
      : null

  return (
    <div className="blok">
      {toekomst ? (
        <p className="zacht">Deze dag ligt in de toekomst. Een besluit kan pas op de dag zelf.</p>
      ) : (
        <div className="besluit-keuzes">
          <div className="besluit-kant">
            <strong>Genomen</strong>
            {magNemen ? (
              <>
                {order && <OrderKaart regels={order} />}
                {automatischOngepland ? (
                  <p className="veld-fout">
                    Het plan is pas na deze dag vastgelegd. De trade krijgt het label ongepland.
                  </p>
                ) : (
                  <label className="vinkje">
                    <input type="checkbox" checked={achteraf} onChange={(e) => setAchteraf(e.target.checked)} />
                    <span>Het plan stond nog niet vast toen de prijs de zone raakte (ongepland)</span>
                  </label>
                )}
                {bevestigen ? (
                  <div className="bevestig">
                    <p>
                      <strong>Weet je het zeker?</strong> De dag gaat op slot. Dit is niet terug te draaien.
                    </p>
                    <div className="rij-knoppen">
                      <button
                        className="knop primair"
                        onClick={() => verwerk(neemTrade(dag, instellingen, new Date(), achteraf, nu, nieuwsBlokkade))}
                      >
                        Ja, trade genomen
                      </button>
                      <button className="knop" onClick={() => setBevestigen(false)}>
                        Annuleren
                      </button>
                    </div>
                  </div>
                ) : (
                  <button className="knop primair" onClick={() => setBevestigen(true)}>
                    Trade genomen
                  </button>
                )}
              </>
            ) : (
              <ul className="blokkades">
                {blokkades.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            )}
            {!magNemen && (
              <button className="knop" onClick={() => bewaar({ ...dag, afgeslotenOp: new Date().toISOString() })}>
                Geen trade: dag afsluiten
              </button>
            )}
          </div>

          <div className="besluit-kant">
            <strong>Niet genomen</strong>
            <label className="veldgroep">
              <span className="label">Korte reden</span>
              <textarea
                rows={2}
                placeholder="Bijvoorbeeld: de prijs bereikte de zone niet."
                value={reden}
                onChange={(e) => setReden(e.target.value)}
              />
            </label>
            <button
              className="knop"
              disabled={!reden.trim()}
              onClick={() => verwerk(slaOver(dag, instellingen, new Date(), reden, nu))}
            >
              Niet genomen
            </button>
          </div>
        </div>
      )}

      {fouten.length > 0 && (
        <div className="melding fout" role="alert">
          <strong>Niet opgeslagen.</strong>
          <ul>
            {fouten.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
