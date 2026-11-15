import { useState } from 'react'
import Icoon, { type IcoonNaam } from './onderdelen/Icoon'
import { InstellingenProvider } from './opslag/InstellingenContext'
import AiTest from './schermen/AiTest'
import Geschiedenis from './schermen/Geschiedenis'
import InstellingenScherm from './schermen/InstellingenScherm'
import AgentScherm from './schermen/AgentScherm'
import Vandaag from './schermen/Vandaag'

type Scherm = 'vandaag' | 'geschiedenis' | 'agent' | 'instellingen' | 'aitest'

const TABS: { id: Scherm; naam: string; icoon: IcoonNaam }[] = [
  { id: 'vandaag', naam: 'Vandaag', icoon: 'vandaag' },
  { id: 'geschiedenis', naam: 'Geschiedenis', icoon: 'lijst' },
  { id: 'agent', naam: 'Agent', icoon: 'notitie' },
  { id: 'instellingen', naam: 'Instellingen', icoon: 'tandwiel' },
]

export default function App() {
  const [scherm, setScherm] = useState<Scherm>('vandaag')
  // Opnieuw op een tab tikken begint dat scherm weer bovenaan (bijvoorbeeld terug naar de lijst).
  const [teller, setTeller] = useState(0)

  function ga(naar: Scherm) {
    setScherm(naar)
    setTeller((t) => t + 1)
    window.scrollTo(0, 0)
  }

  // De testpagina hoort bij Instellingen in het menu.
  const actief = (id: Scherm) => scherm === id || (id === 'instellingen' && scherm === 'aitest')

  return (
    <InstellingenProvider>
      <div className="app">
        <header className="kop">
          <div className="merk">
            <span className="merk-stip" aria-hidden="true" />
            Sniper Journal
          </div>
          <nav className="tabs" aria-label="Hoofdmenu">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={actief(t.id) ? 'tab actief' : 'tab'}
                aria-current={actief(t.id) ? 'page' : undefined}
                onClick={() => ga(t.id)}
              >
                <Icoon naam={t.icoon} maat={20} />
                <span>{t.naam}</span>
              </button>
            ))}
          </nav>
        </header>

        <main className="inhoud" key={`${scherm}-${teller}`}>
          {scherm === 'vandaag' && <Vandaag naarGeschiedenis={() => ga('geschiedenis')} />}
          {scherm === 'geschiedenis' && <Geschiedenis naarVandaag={() => ga('vandaag')} />}
          {scherm === 'agent' && <AgentScherm />}
          {scherm === 'instellingen' && <InstellingenScherm naarAiTest={() => ga('aitest')} />}
          {scherm === 'aitest' && <AiTest naarInstellingen={() => ga('instellingen')} />}
        </main>
      </div>
    </InstellingenProvider>
  )
}
