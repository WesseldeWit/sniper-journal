import { useEffect, useState } from 'react'
import Icoon from '../onderdelen/Icoon'
import { dollars, kort, leesGetal, metTeken } from '../hulp/getal'
import { leesScreenshot, schrijfDag, schrijfScreenshot, verwijderScreenshot, type Dag } from '../opslag/dagen'
import { nabesprekingsVragen } from '../regels/terugblik'
import {
  FOUTLABELS,
  foutenInResultaat,
  inGeld,
  LEEG_RESULTAAT,
  regeltrouw,
  rUitDollars,
  type Foutlabel,
  type ResultaatInvoer,
} from '../regels/resultaat'

type GetalVeld = 'dollars' | 'verstVoor' | 'verstTegen'
type VraagVeld = 'entryVolgensPlan' | 'stopVolgensPlan' | 'exitsVolgensPlan'

const VRAGEN: { veld: VraagVeld; tekst: string }[] = [
  { veld: 'entryVolgensPlan', tekst: 'Entry en lotsize waren volgens het plan' },
  { veld: 'stopVolgensPlan', tekst: 'De stop bleef volgens plan (alleen naar break-even en naar 1:2)' },
  { veld: 'exitsVolgensPlan', tekst: 'De exits waren volgens het trademanagement-schema' },
]

export default function ResultaatStap({ dag, setDag }: { dag: Dag; setDag: (dag: Dag) => void }) {
  const besluit = dag.besluit
  const bewaard = dag.resultaat
  const [bewerken, setBewerken] = useState(bewaard === null)
  const [invoer, setInvoer] = useState<ResultaatInvoer>(bewaard ?? LEEG_RESULTAAT)
  const [details, setDetails] = useState(false)
  const [tekst, setTekst] = useState<Record<GetalVeld, string>>({
    dollars: bewaard ? kort(bewaard.dollars ?? inGeld(bewaard.r, dag.besluit ?? { bedrag: null, risicoProcent: null }).dollars) : '',
    verstVoor: bewaard ? kort(bewaard.verstVoor) : '',
    verstTegen: bewaard ? kort(bewaard.verstTegen) : '',
  })
  const [fouten, setFouten] = useState<string[]>([])
  const [foto, setFoto] = useState<Blob | null>(null)
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)

  useEffect(() => {
    let actueel = true
    void leesScreenshot(dag.datum, 'resultaat').then((b) => actueel && setFoto(b ?? null))
    return () => {
      actueel = false
    }
  }, [dag.datum])

  useEffect(() => {
    if (!foto) {
      setFotoUrl(null)
      return
    }
    const url = URL.createObjectURL(foto)
    setFotoUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [foto])

  if (besluit?.soort !== 'genomen') return null

  function wijzigGetal(veld: GetalVeld, waarde: string) {
    setTekst({ ...tekst, [veld]: waarde })
    const n = leesGetal(waarde, veld === 'dollars')
    const getal = Number.isNaN(n) ? null : n
    if (veld === 'dollars') {
      setInvoer({ ...invoer, dollars: getal, r: getal === null ? null : rUitDollars(getal, besluit?.bedrag ?? null) })
    } else {
      setInvoer({ ...invoer, [veld]: getal })
    }
  }

  function wisselLabel(id: Foutlabel) {
    const aan = invoer.foutlabels.includes(id)
    setInvoer({ ...invoer, foutlabels: aan ? invoer.foutlabels.filter((l) => l !== id) : [...invoer.foutlabels, id] })
  }

  async function kiesFoto(bestand: File | undefined) {
    if (!bestand) return
    await schrijfScreenshot(dag.datum, bestand, 'resultaat')
    setFoto(bestand)
  }

  async function wisFoto() {
    await verwijderScreenshot(dag.datum, 'resultaat')
    setFoto(null)
  }

  function slaOp() {
    const gevonden = foutenInResultaat(invoer)
    setFouten(gevonden)
    if (gevonden.length > 0) return
    const nieuw: Dag = {
      ...dag,
      resultaat: {
        r: invoer.r!,
        ...(invoer.dollars !== undefined && invoer.dollars !== null ? { dollars: invoer.dollars } : {}),
        verstVoor: invoer.verstVoor ?? Math.max(invoer.r!, 0),
        verstTegen: invoer.verstTegen ?? Math.max(-invoer.r!, 0),
        entryVolgensPlan: invoer.entryVolgensPlan!,
        stopVolgensPlan: invoer.stopVolgensPlan!,
        exitsVolgensPlan: invoer.exitsVolgensPlan!,
        foutlabels: invoer.foutlabels,
        nabespreking: invoer.nabespreking.trim(),
        heeftScreenshot: foto !== null,
        opgeslagenOp: new Date().toISOString(),
      },
    }
    setDag(nieuw)
    void schrijfDag(nieuw)
    setBewerken(false)
  }

  // Samenvatting van een opgeslagen resultaat.
  if (bewaard && !bewerken) {
    const geld = inGeld(bewaard.r, besluit, bewaard.dollars)
    const score = regeltrouw(besluit.ongepland, bewaard)
    return (
      <div className="blok">
        <div className="uitkomst">
          <span className={geld.dollars > 0 ? 'uitkomst-r plus' : geld.dollars < 0 ? 'uitkomst-r min' : 'uitkomst-r'}>
            {geld.dollars > 0 ? '+' : ''}{dollars(geld.dollars)}
          </span>
          <span className="zacht">
            {metTeken(bewaard.r)}R · {metTeken(geld.procent)}%
          </span>
        </div>
        <div className={score.volgensRegels ? 'regeltrouw goed' : 'regeltrouw breuk'}>
          <strong>
            <Icoon naam={score.volgensRegels ? 'vink' : 'kruis'} />
            {score.volgensRegels ? 'Volgens de regels' : 'Niet volgens de regels'}
          </strong>
          {score.volgensRegels && bewaard.r < 0 && <p>Een verlies volgens de regels telt als goede trade.</p>}
          {score.redenen.length > 0 && (
            <ul>
              {score.redenen.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
        </div>
        <dl className="cijfers smal">
          <dt>Verste stand in het voordeel</dt>
          <dd>{metTeken(bewaard.verstVoor)}R</dd>
          <dt>Verste stand in het nadeel</dt>
          <dd>{metTeken(-bewaard.verstTegen)}R</dd>
        </dl>
        {fotoUrl && <img className="screenshot" src={fotoUrl} alt="Screenshot achteraf" />}
        {bewaard.nabespreking.trim() && (
          <div>
            <span className="label">Wat je meeneemt</span>
            <p className="vrije-tekst">{bewaard.nabespreking}</p>
          </div>
        )}
        <button className="knop zelf" onClick={() => setBewerken(true)}>
          Resultaat wijzigen
        </button>
      </div>
    )
  }

  const geld = invoer.r !== null ? inGeld(invoer.r, besluit, invoer.dollars) : null
  const vragen = nabesprekingsVragen({
    r: invoer.r,
    volgensPlan:
      !besluit.ongepland &&
      invoer.entryVolgensPlan !== false &&
      invoer.stopVolgensPlan !== false &&
      invoer.exitsVolgensPlan !== false,
    heeftFoutlabel: invoer.foutlabels.length > 0,
  })

  const getalVeld = (veld: GetalVeld, label: string, hulp: string) => (
    <label className="veldgroep">
      <span className="label">{label}</span>
      <span className="invoer">
        <input
          className="prijs"
          type="text"
          inputMode={veld === 'dollars' ? 'text' : 'decimal'}
          placeholder={veld === 'dollars' ? '1394,46 of -250' : '0'}
          value={tekst[veld]}
          onChange={(e) => wijzigGetal(veld, e.target.value)}
        />
        <span className="eenheid">{veld === 'dollars' ? '$' : 'R'}</span>
      </span>
      <span className="zacht">{hulp}</span>
    </label>
  )

  return (
    <div className="blok formulier">
      {getalVeld(
        'dollars',
        'Winst of verlies',
        invoer.r !== null && besluit.bedrag
          ? `Dat is ${metTeken(invoer.r)}R (${metTeken(geld!.procent)}% van je account). Verlies met een min ervoor.`
          : 'Zoals je het in MT5 of bij FTMO ziet. Verlies met een min ervoor.',
      )}
      {details ? (
        <div className="rij">
          {getalVeld('verstVoor', 'Verste stand in het voordeel', 'Hoe ver liep de prijs maximaal jouw kant op?')}
          {getalVeld('verstTegen', 'Verste stand in het nadeel', 'Hoe ver liep de prijs maximaal tegen je in?')}
        </div>
      ) : (
        <button type="button" className="knop zelf" onClick={() => setDetails(true)}>
          Meer details (optioneel)
        </button>
      )}

      <div className="veldgroep">
        <span className="label">Regeltrouw</span>
        {besluit.ongepland && (
          <p className="veld-fout">Deze trade is ongepland en telt daardoor als niet volgens de regels.</p>
        )}
        {VRAGEN.map((v) => (
          <div key={v.veld} className="vraag">
            <span>{v.tekst}</span>
            <div className="keuze" role="group" aria-label={v.tekst}>
              {[true, false].map((antwoord) => (
                <button
                  key={String(antwoord)}
                  type="button"
                  className={invoer[v.veld] === antwoord ? 'keuze-knop actief' : 'keuze-knop'}
                  aria-pressed={invoer[v.veld] === antwoord}
                  onClick={() => setInvoer({ ...invoer, [v.veld]: antwoord })}
                >
                  {antwoord ? 'Ja' : 'Nee'}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="veldgroep">
        <span className="label">Foutlabels (alleen als ze van toepassing zijn)</span>
        <div className="labels">
          {FOUTLABELS.map((l) => (
            <button
              key={l.id}
              type="button"
              className={invoer.foutlabels.includes(l.id) ? 'chip actief' : 'chip'}
              aria-pressed={invoer.foutlabels.includes(l.id)}
              onClick={() => wisselLabel(l.id)}
            >
              {l.naam}
            </button>
          ))}
        </div>
      </div>

      <div className="veldgroep">
        <span className="label">Screenshot achteraf (optioneel)</span>
        {fotoUrl && <img className="screenshot" src={fotoUrl} alt="Screenshot achteraf" />}
        <div className="rij-knoppen">
          <label className="knop">
            {foto ? 'Vervangen' : 'Screenshot kiezen'}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                void kiesFoto(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </label>
          {foto && (
            <button type="button" className="knop" onClick={() => void wisFoto()}>
              Verwijderen
            </button>
          )}
        </div>
      </div>

      <label className="veldgroep">
        <span className="label">Wat neem je mee? (optioneel)</span>
        <textarea
          rows={3}
          placeholder={vragen[0]}
          value={invoer.nabespreking}
          onChange={(e) => setInvoer({ ...invoer, nabespreking: e.target.value })}
        />
      </label>

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

      <button className="knop primair" onClick={slaOp}>
        Resultaat opslaan
      </button>
    </div>
  )
}
