// Kleine lijn-iconen. Een status krijgt altijd een icoon naast de kleur.

const PADEN = {
  vink: 'M5 12.5l4.5 4.5L19 7.5',
  kruis: 'M6 6l12 12M18 6L6 18',
  klok: 'M12 7v5l3 2M12 3a9 9 0 100 18 9 9 0 000-18z',
  slot: 'M7 11V8a5 5 0 0110 0v3M6 11h12v9H6z',
  min: 'M6 12h12',
  kopie: 'M9 9h10v11H9zM5 15V4h10',
  op: 'M12 16V5M7 10l5-5 5 5M5 20h14',
  maan: 'M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z',
  pijl: 'M9 6l6 6-6 6',
  terug: 'M15 6l-6 6 6 6',
  omlaag: 'M6 9l6 6 6-6',
  vandaag: 'M4 9h16M7 3v4M17 3v4M5 5h14v15H5zM9 14h2',
  lijst: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  notitie: 'M6 4h9l4 4v12H6zM14 4v5h5M9 13h7M9 17h5',
  tandwiel:
    'M12 9a3 3 0 100 6 3 3 0 000-6zM19 12l2-1.5-2-3.5-2.4.8-1.6-1-.5-2.5h-4l-.5 2.5-1.6 1L6 7l-2 3.5L6 12l-2 1.5L6 17l2.4-.8 1.6 1 .5 2.5h4l.5-2.5 1.6-1 2.4.8 2-3.5z',
  vuur: 'M12 3c1 3.5 5 5.5 5 10a5 5 0 01-10 0c0-2 1-3.5 2-4.5.5 1.5 1.5 2 2 2C10.500 8 11 5 12 3z',
} as const

export type IcoonNaam = keyof typeof PADEN

export default function Icoon({ naam, maat = 18 }: { naam: IcoonNaam; maat?: number }) {
  return (
    <svg
      className="icoon"
      width={maat}
      height={maat}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PADEN[naam]} />
    </svg>
  )
}
