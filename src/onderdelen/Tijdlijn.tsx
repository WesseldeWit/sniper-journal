import { klokTekst, type Venster } from '../regels/sessie'

export interface TijdlijnZone extends Venster {
  niveau: 'rood' | 'oranje'
  naam: string
}

interface Props {
  londen: Venster
  newyork: Venster
  /** Blokkadevensters rond nieuws. */
  zones: TijdlijnZone[]
  /** Minuten sinds middernacht, Nederlandse tijd. Leeg op een andere dag dan vandaag. */
  nu: number | null
}

const START = 7 * 60
const EIND = 23 * 60
const UREN = [7, 9, 11, 13, 15, 17, 19, 21, 23]

const procent = (minuten: number) => ((Math.min(EIND, Math.max(START, minuten)) - START) / (EIND - START)) * 100
const stijl = (v: Venster) => ({ left: `${procent(v.van)}%`, width: `${Math.max(0.6, procent(v.tot) - procent(v.van))}%` })

/** De dag als tijdlijn: sessies als balken, nieuws als gekleurde zones en een lijn voor nu. */
export default function Tijdlijn({ londen, newyork, zones, nu }: Props) {
  const open = (v: Venster) => nu !== null && nu >= v.van && nu < v.tot
  const kop =
    nu === null
      ? 'Sessies van deze dag'
      : open(londen) && open(newyork)
        ? 'Londen en New York zijn open'
        : open(londen)
          ? 'Londen is open'
          : open(newyork)
            ? 'New York is open'
            : 'Geen sessie open'
  const volgende =
    nu === null ? null : nu < londen.van ? { naam: 'Londen', om: londen.van } : nu < newyork.van ? { naam: 'New York', om: newyork.van } : null

  return (
    <div className="blok tijdlijn">
      <div className="tl-kop">
        <strong>{kop}</strong>
        {volgende && nu !== null && (
          <span className="zacht getal">
            {volgende.naam} over {Math.floor((volgende.om - nu) / 60)}:{String((volgende.om - nu) % 60).padStart(2, '0')}
          </span>
        )}
      </div>
      <div className="tl-baan" role="img" aria-label={`Londen ${klokTekst(londen.van)} tot ${klokTekst(londen.tot)}, New York ${klokTekst(newyork.van)} tot ${klokTekst(newyork.tot)}`}>
        {zones.map((z, n) => (
          <div key={n} className={`tl-zone ${z.niveau}`} style={stijl(z)} />
        ))}
        <div className={open(londen) ? 'tl-sessie boven open' : 'tl-sessie boven'} style={stijl(londen)}>
          Londen {klokTekst(londen.van)}–{klokTekst(londen.tot)}
        </div>
        <div className={open(newyork) ? 'tl-sessie onder open' : 'tl-sessie onder'} style={stijl(newyork)}>
          New York {klokTekst(newyork.van)}–{klokTekst(newyork.tot)}
        </div>
        {nu !== null && nu >= START && nu <= EIND && (
          <div className="tl-nu" style={{ left: `${procent(nu)}%` }}>
            <span className={procent(nu) > 80 ? 'links' : undefined}>nu {klokTekst(nu)}</span>
          </div>
        )}
        <div className="tl-uren" aria-hidden="true">
          {UREN.map((u) => (
            <span key={u}>{String(u).padStart(2, '0')}</span>
          ))}
        </div>
      </div>
      <p className="zacht tl-voet">Tijden in Nederlandse tijd.</p>
    </div>
  )
}
