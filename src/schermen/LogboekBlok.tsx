import { useEffect, useState } from 'react'
import { LOGBOEK, useInstellingen } from '../opslag/InstellingenContext'
import { lees } from '../opslag/opslag'
import { magRegelsWijzigen, type LogRegel } from '../regels/slot'
import StatusChip from '../onderdelen/StatusChip'

/** Elke wijziging aan je regels, met datum en oude en nieuwe waarde. */
export default function LogboekBlok() {
  const { instellingen } = useInstellingen()
  const [log, setLog] = useState<LogRegel[]>([])

  // Opnieuw ophalen zodra er iets aan de instellingen verandert.
  useEffect(() => {
    const timer = setTimeout(() => void lees<LogRegel[]>(LOGBOEK).then((l) => setLog(l ?? [])), 150)
    return () => clearTimeout(timer)
  }, [instellingen])

  return (
    <div className="blok">
      <h2>Regels op slot</h2>
      {magRegelsWijzigen(new Date()) ? (
        <StatusChip soort="wachtend" tekst="Open: de sessies zijn dicht" />
      ) : (
        <StatusChip soort="slot" tekst="Op slot tijdens de sessies" />
      )}
      <p className="zacht">
        De risicotabel en de nieuwsblokkade kun je alleen wijzigen in het weekend of als Londen en New York dicht
        zijn. De stop van 25 tot 30 pips en het trademanagement (break-even op 1:1, 20% op 1:2, 60% op 1:3) staan
        vast in de app en zijn niet instelbaar.
      </p>
      <span className="label">Logboek</span>
      {log.length === 0 ? (
        <p className="zacht">Nog geen wijzigingen aan je regels.</p>
      ) : (
        <div className="tabel-rol">
          <table>
            <thead>
              <tr>
                <th>Wanneer</th>
                <th>Regel</th>
                <th>Oud</th>
                <th>Nieuw</th>
              </tr>
            </thead>
            <tbody>
              {log.map((r, n) => (
                <tr key={n}>
                  <td>
                    {new Date(r.op).toLocaleString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td>{r.veld}</td>
                  <td>{r.oud}</td>
                  <td>{r.nieuw}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
