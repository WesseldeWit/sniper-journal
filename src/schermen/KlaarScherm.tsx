import { getal, metTeken } from '../hulp/getal'
import Icoon from '../onderdelen/Icoon'
import StatusChip from '../onderdelen/StatusChip'
import type { Dag } from '../opslag/dagen'
import { regeltrouw } from '../regels/resultaat'

/** Het rustige eindscherm van de dag. Vanaf hier is er vandaag geen nieuwe analyse of trade meer. */
export default function KlaarScherm({ dag, streak }: { dag: Dag; streak: number }) {
  const b = dag.besluit
  const genomen = b?.soort === 'genomen'
  const score = genomen && dag.resultaat ? regeltrouw(b.ongepland, dag.resultaat) : null

  const wat = genomen
    ? `Je nam één trade: ${dag.analyse.richting === 'short' ? 'short' : 'long'}, ${getal(b.lots ?? 0)} lot${dag.resultaat ? `, ${metTeken(dag.resultaat.r)}R` : ''}.`
    : b
      ? `Je nam geen trade: ${b.reden}`
      : dag.checkKlaarOp
        ? 'Je setup was afgekeurd. Je nam geen trade.'
        : dag.vastgelegdOp
          ? 'Je maakte een plan en nam geen trade.'
          : 'Er was vandaag geen setup. Je nam geen trade.'

  return (
    <div className="blok klaar">
      <span className="leeg-icoon">
        <Icoon naam="slot" maat={26} />
      </span>
      <h2>Klaar voor vandaag</h2>
      <p>{wat}</p>
      {genomen && !dag.resultaat ? (
        <StatusChip soort="wachtend" tekst="Regeltrouw volgt na het resultaat" />
      ) : score && !score.volgensRegels ? (
        <StatusChip soort="afgekeurd" tekst="Niet volgens de regels" />
      ) : (
        <StatusChip soort="goedgekeurd" tekst="Je volgde je regels" />
      )}
      <p className="klaar-streak">
        <span className="getal">{streak}</span> {streak === 1 ? 'dag' : 'dagen'} volgens de regels
      </p>
      <p className="zacht">
        {genomen && !dag.resultaat
          ? 'Volg de managementkaart hieronder. Daarna mogen de charts dicht.'
          : 'De charts mogen dicht. Morgen is er een nieuwe dag.'}
      </p>
    </div>
  )
}
