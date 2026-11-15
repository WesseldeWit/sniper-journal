import { compacteDatum, type DagSleutel } from '../hulp/datum'
import StatusChip from '../onderdelen/StatusChip'
import type { NieuwsStand } from '../opslag/nieuws'
import { aftellen, type NieuwsItem } from '../regels/nieuws'
import { klokTekst, nlDatum, nlMinuten } from '../regels/sessie'

interface Props {
  nieuws: NieuwsStand
  datum: DagSleutel
  nu: Date
  voor: number
  na: number
}

const chip = (item: NieuwsItem) =>
  item.niveau === 'rood' ? <StatusChip soort="afgekeurd" tekst="Rood · niet traden" /> : <StatusChip soort="oranje" tekst="Oranje · uitkijken" />

/** Het nieuws van vandaag met aftelklok en blokkadevenster, en daaronder de rest van de week. */
export default function NieuwsBlok({ nieuws, datum, nu, voor, na }: Props) {
  if (!nieuws.bekend) {
    return (
      <div className="blok">
        <span className="bovenkop">Nieuws</span>
        <div className="melding let-op">Nieuws onbekend, controleer zelf de economische kalender.</div>
      </div>
    )
  }

  const nuMin = nlDatum(nu) === datum ? nlMinuten(nu) : null
  const vandaag = nieuws.items.filter((i) => i.datum === datum)
  const week = nieuws.items.filter((i) => i.datum !== datum)

  const regel = (item: NieuwsItem, metDatum: boolean) => {
    const voorbij = nuMin !== null && !metDatum && nuMin >= item.minuten
    return (
      <li key={item.moment + item.naam} className={voorbij ? 'nieuws-item voorbij' : 'nieuws-item'}>
        <div className="nieuws-tijd">
          <span className="getal nieuws-klok">{klokTekst(item.minuten)}</span>
          <span className="zacht getal">
            {metDatum ? compacteDatum(item.datum) : nuMin === null ? '' : voorbij ? 'geweest' : `over ${aftellen(item.minuten - nuMin)}`}
          </span>
        </div>
        <div className="nieuws-tekst">
          <span className="nieuws-kop">
            <strong>{item.naam}</strong>
            {chip(item)}
          </span>
          {!metDatum && <span className="zacht">{item.uitleg}</span>}
          <span className="getal zacht">
            {item.niveau === 'rood' ? 'Niet traden' : 'Uitkijken'} van {klokTekst(item.minuten - voor)} tot {klokTekst(item.minuten + na)}
            {item.verwacht && ` · verwacht ${item.verwacht}`}
            {item.vorige && ` · vorige ${item.vorige}`}
          </span>
        </div>
      </li>
    )
  }

  return (
    <div className="blok">
      <span className="bovenkop">Nieuws vandaag</span>
      {vandaag.length === 0 ? (
        <p className="zacht">Geen rood of oranje nieuws voor goud vandaag.</p>
      ) : (
        <ul className="nieuws-lijst">{vandaag.map((i) => regel(i, false))}</ul>
      )}
      {week.length > 0 && (
        <>
          <span className="bovenkop">Rest van deze week</span>
          <ul className="nieuws-lijst">{week.map((i) => regel(i, true))}</ul>
        </>
      )}
      <p className="zacht">
        Bron: weekkalender van Forex Factory, tijden in Nederlandse tijd. De werkelijke uitslag zit niet in deze bron.
        {nieuws.opgehaaldOp &&
          ` Opgehaald om ${new Date(nieuws.opgehaaldOp).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}.`}
      </p>
    </div>
  )
}
