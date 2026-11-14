import { useEffect, useState } from 'react'
import { lees, schrijf } from '../opslag/opslag'

interface Notitie {
  id: string
  tekst: string
  gemaaktOp: string
  gewijzigdOp: string
}

const SLEUTEL = 'notities'

const moment = (iso: string) =>
  new Date(iso).toLocaleString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function NotitiesScherm() {
  const [notities, setNotities] = useState<Notitie[] | null>(null)
  const [nieuw, setNieuw] = useState('')
  const [bewerkId, setBewerkId] = useState<string | null>(null)
  const [bewerkTekst, setBewerkTekst] = useState('')
  const [wisId, setWisId] = useState<string | null>(null)

  useEffect(() => {
    void lees<Notitie[]>(SLEUTEL).then((bewaard) => setNotities(bewaard ?? []))
  }, [])

  if (!notities) return null

  function bewaar(lijst: Notitie[]) {
    setNotities(lijst)
    void schrijf(SLEUTEL, lijst)
  }

  function voegToe() {
    if (!nieuw.trim()) return
    const nu = new Date().toISOString()
    bewaar([{ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, tekst: nieuw.trim(), gemaaktOp: nu, gewijzigdOp: nu }, ...notities!])
    setNieuw('')
  }

  function slaBewerkingOp(id: string) {
    if (!bewerkTekst.trim()) return
    bewaar(
      notities!.map((n) => (n.id === id ? { ...n, tekst: bewerkTekst.trim(), gewijzigdOp: new Date().toISOString() } : n)),
    )
    setBewerkId(null)
  }

  return (
    <section className="instellingen">
      <h1>Notities</h1>
      <p className="zacht">
        Losse notities die niet bij één dag horen. Een notitie bij een dag schrijf je op de dagkaart zelf.
      </p>

      <div className="blok">
        <label className="veldgroep">
          <span className="label">Nieuwe notitie</span>
          <textarea rows={3} value={nieuw} onChange={(e) => setNieuw(e.target.value)} />
        </label>
        <button className="knop primair" disabled={!nieuw.trim()} onClick={voegToe}>
          Notitie toevoegen
        </button>
      </div>

      {notities.length === 0 && <p className="zacht">Nog geen notities.</p>}

      {notities.map((n) => (
        <article key={n.id} className="blok">
          <span className="zacht">
            {moment(n.gemaaktOp)}
            {n.gewijzigdOp !== n.gemaaktOp && ' · gewijzigd'}
          </span>
          {bewerkId === n.id ? (
            <>
              <textarea rows={4} value={bewerkTekst} onChange={(e) => setBewerkTekst(e.target.value)} />
              <div className="rij-knoppen">
                <button className="knop" disabled={!bewerkTekst.trim()} onClick={() => slaBewerkingOp(n.id)}>
                  Opslaan
                </button>
                <button className="knop" onClick={() => setBewerkId(null)}>
                  Annuleren
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="vrije-tekst">{n.tekst}</p>
              <div className="rij-knoppen">
                <button
                  className="knop"
                  onClick={() => {
                    setBewerkId(n.id)
                    setBewerkTekst(n.tekst)
                    setWisId(null)
                  }}
                >
                  Bewerken
                </button>
                {wisId === n.id ? (
                  <>
                    <button className="knop gevaar" onClick={() => bewaar(notities.filter((x) => x.id !== n.id))}>
                      Ja, verwijderen
                    </button>
                    <button className="knop" onClick={() => setWisId(null)}>
                      Annuleren
                    </button>
                  </>
                ) : (
                  <button className="knop" onClick={() => setWisId(n.id)}>
                    Verwijderen
                  </button>
                )}
              </div>
            </>
          )}
        </article>
      ))}
    </section>
  )
}
