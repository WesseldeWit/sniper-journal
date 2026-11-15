import { useEffect, useRef } from 'react'
import Icoon from '../onderdelen/Icoon'
import { MAX_SIGNALEN_PER_DAG, type BriefingRegel, type Signaal } from '../regels/agent'

const PLEK = 'sniper-journal-meldingen'

/** Stuurt een signaal één keer per dag als melding van de browser, als je dat hebt toegestaan. */
function useMeldingen(datum: string, signalen: Signaal[]) {
  const sleutels = signalen.map((s) => s.id).join('|')
  const laatste = useRef('')
  useEffect(() => {
    if (laatste.current === sleutels) return
    laatste.current = sleutels
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    try {
      const bewaard = JSON.parse(localStorage.getItem(PLEK) ?? '{}') as { datum?: string; ids?: string[] }
      const al = bewaard.datum === datum ? (bewaard.ids ?? []) : []
      for (const s of signalen) {
        if (al.includes(s.id) || al.length >= MAX_SIGNALEN_PER_DAG) continue
        new Notification('Sniper Journal', { body: s.tekst })
        al.push(s.id)
      }
      localStorage.setItem(PLEK, JSON.stringify({ datum, ids: al }))
    } catch {
      // Meldingen zijn een extraatje: lukt het niet, dan staat het signaal nog steeds op het scherm.
    }
  }, [datum, sleutels]) // eslint-disable-line react-hooks/exhaustive-deps
}

export default function Briefing({ datum, regels, signalen }: { datum: string; regels: BriefingRegel[]; signalen: Signaal[] }) {
  useMeldingen(datum, signalen)
  return (
    <div className="blok briefing">
      <span className="bovenkop">Briefing van je agent</span>
      {signalen.length > 0 && (
        <ul className="signalen">
          {signalen.map((s) => (
            <li key={s.id}>
              <Icoon naam="klok" maat={16} />
              <span>{s.tekst}</span>
            </li>
          ))}
        </ul>
      )}
      <dl className="briefing-lijst">
        {regels.map((r) => (
          <div key={r.kop}>
            <dt>{r.kop}</dt>
            <dd>{r.tekst}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
