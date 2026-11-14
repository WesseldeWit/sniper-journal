import { useEffect, useState } from 'react'
import Icoon from '../onderdelen/Icoon'
import { dollars, kort, leesGetal, metTeken } from '../hulp/getal'
import { leesScreenshot, schrijfDag, schrijfScreenshot, verwijderScreenshot, type Dag } from '../opslag/dagen'
import {
  FOUTLABELS,
  foutenInResultaat,
  inGeld,
  LEEG_RESULTAAT,
  regeltrouw,
  type Foutlabel,
  type ResultaatInvoer,
} from '../regels/resultaat'

type GetalVeld = 'r' | 'verstVoor' | 'verstTegen'
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
  const [tekst, setTekst] = useState<Record<GetalVeld, string>>({
    r: bewaard ? kort(bewaard.r) : '',
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
    const n = leesGetal(waarde, veld === 'r')
    setInvoer({ ...invoer, [veld]: Number.isNaN(n) ? null : n })
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
        verstVoor: invoer.verstVoor!,
        verstTegen: invoer.verstTegen!,
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
    const geld = inGeld(bewaard.r, besluit)
    const score = regeltrouw(besluit.ongepland, bewaard)
    return (
      <div className="blok">
        <div className="uitkomst">
          <span className={bewaard.r > 0 ? 'uitkomst-r plus' : bewaard.r < 0 ? 'uitkomst-r min' : 'uitkomst-r'}>
            {metTeken(bewaard.r)}R
          </span>
          <span className="zacht">
            {dollars(geld.dollars)} · {metTeken(geld.procent)}%
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
        <div>
          <span className="label">Nabespreking</span>
          <p className="vrije-tekst">{bewaard.nabespreking}</p>
        </div>
        <button className="knop zelf" onClick={() => setBewerken(true)}>
          Resultaat wijzigen
        </button>
      </div>
    )
  }

  const geld = invoer.r !== null ? inGeld(invoer.r, besluit) : null

  const getalVeld = (veld: GetalVeld, label: string, hulp: string) => (
    <label className="veldgroep">
      <span className="label">{label}</span>
      <span className="invoer">
        <input
          className="prijs"
          type="text"
          inputMode={veld === 'r' ? 'text' : 'decimal'}
          placeholder={veld === 'r' ? '-1 of 2,6' : '0'}
          value={tekst[veld]}
          onChange={(e) => wijzigGetal(veld, e.target.value)}
        />
        <span className="eenheid">R</span>
      </span>
      <span className="zacht">{hulp}</span>
    </label>
  )

  return (
    <div className="blok formulier">
      <div className="rij">
        {getalVeld(
          'r',
          'Uitkomst',
          geld ? `${dollars(geld.dollars)} · ${metTeken(geld.procent)}%` : '-1 is een volle stop, 0 is break-even.',
        )}
        {getalVeld('verstVoor', 'Verste stand in het voordeel', 'Hoe ver liep de prijs maximaal jouw kant op?')}
        {getalVeld('verstTegen', 'Verste stand in het nadeel', 'Hoe ver liep de prijs maximaal tegen je in?')}
      </div>

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
        <span className="label">Nabespreking</span>
        <textarea
          rows={4}
          placeholder="Wat ging goed, wat niet, en wat neem je mee?"
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
