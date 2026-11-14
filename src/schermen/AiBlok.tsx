import { useState } from 'react'
import { bewaarSleutel, leesSleutel } from '../ai/sleutel'

export default function AiBlok({ naarTest }: { naarTest: () => void }) {
  const [sleutel, setSleutel] = useState(leesSleutel)
  const [tonen, setTonen] = useState(false)

  function wijzig(waarde: string) {
    setSleutel(waarde)
    bewaarSleutel(waarde)
  }

  return (
    <div className="blok">
      <h2>AI-check</h2>
      <p className="zacht">
        De AI leest je screenshot af via de Claude API. Daarvoor is een eigen API-sleutel nodig van
        platform.claude.com, met tegoed en een uitgavenlimiet. De sleutel staat alleen in deze browser en komt
        niet in de back-up.
      </p>
      <label className="veldgroep">
        <span className="label">API-sleutel</span>
        <input
          className="prijs"
          type={tonen ? 'text' : 'password'}
          autoComplete="off"
          spellCheck={false}
          placeholder="sk-ant-..."
          value={sleutel}
          onChange={(e) => wijzig(e.target.value)}
        />
      </label>
      <div className="rij-knoppen">
        <button className="knop" onClick={() => setTonen(!tonen)}>
          {tonen ? 'Verbergen' : 'Tonen'}
        </button>
        {sleutel && (
          <button className="knop" onClick={() => wijzig('')}>
            Sleutel verwijderen
          </button>
        )}
        <button className="knop" onClick={naarTest}>
          Open de AI-testpagina
        </button>
      </div>
    </div>
  )
}
