import { useState } from 'react'
import { aantalDagen, downloadBackup, leesBackup, maakBackup, zetBackupTerug, type Backup } from '../opslag/backup'

export default function BackupBlok() {
  const [melding, setMelding] = useState<string | null>(null)
  const [fout, setFout] = useState<string | null>(null)
  const [klaar, setKlaar] = useState<Backup | null>(null)

  async function exporteer() {
    setFout(null)
    const backup = await maakBackup()
    downloadBackup(backup)
    setMelding(`Back-up gemaakt met ${aantalDagen(backup)} dagen. Het bestand staat in je downloads.`)
  }

  async function kiesBestand(bestand: File | undefined) {
    if (!bestand) return
    setMelding(null)
    const uitkomst = leesBackup(await bestand.text())
    if ('fout' in uitkomst) {
      setFout(uitkomst.fout)
      setKlaar(null)
    } else {
      setFout(null)
      setKlaar(uitkomst.backup)
    }
  }

  async function importeer() {
    if (!klaar) return
    await zetBackupTerug(klaar)
    // Opnieuw laden zodat elk scherm de teruggezette gegevens toont.
    window.location.reload()
  }

  return (
    <div className="blok">
      <h2>Back-up</h2>
      <p className="zacht">
        Je gegevens staan alleen in deze browser op dit apparaat. Maak regelmatig een back-up: één bestand met
        alle dagen, screenshots, notities en instellingen.
      </p>
      <div className="rij-knoppen">
        <button className="knop" onClick={() => void exporteer()}>
          Back-up exporteren
        </button>
        <label className="knop">
          Back-up importeren
          <input
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              void kiesBestand(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </label>
      </div>

      {melding && <p className="zacht">{melding}</p>}
      {fout && (
        <div className="melding fout" role="alert">
          {fout}
        </div>
      )}

      {klaar && (
        <div className="bevestig">
          <p>
            <strong>Back-up van {new Date(klaar.gemaaktOp).toLocaleDateString('nl-NL')} terugzetten?</strong> Hij
            bevat {aantalDagen(klaar)} dagen. Alles wat nu in deze browser staat wordt vervangen. Dit is niet terug
            te draaien.
          </p>
          <div className="rij-knoppen">
            <button className="knop gevaar" onClick={() => void importeer()}>
              Ja, alles vervangen
            </button>
            <button className="knop" onClick={() => setKlaar(null)}>
              Annuleren
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
