// De ene plek waar de app met de Claude API praat. Schermen roepen alleen deze functie aan,
// zodat de aanroep later naar een tussenserver kan verhuizen zonder de schermen te wijzigen.

import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { kostenVan, type ModelId, type Verbruik } from './modellen'
import { gebruikersTekst, systeemOpdracht, type AgentGeheugen, type Vervolg } from './opdracht'
import { LezingSchema, type Lezing } from './schema'

export interface LeesVraag {
  sleutel: string
  model: ModelId
  afbeelding: Blob
  /** De optionele zin van de trader bij de screenshot. */
  idee: string
  /** Wat de agent over de trader weet: werkwijze, lessen, laatste trades, playbook en FTMO-stand. */
  geheugen: AgentGeheugen
  /** Bij een tweede ronde: de vorige lezing met de antwoorden en correcties van de trader. */
  vervolg?: Vervolg
}

export interface LeesAntwoord {
  lezing: Lezing
  /** Het model dat werkelijk heeft geantwoord. */
  model: string
  verbruik: Verbruik
  /** Kosten van deze aanroep in dollars. */
  kosten: number
  duurMs: number
}

const SOORTEN = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const
type Soort = (typeof SOORTEN)[number]

function alsBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const lezer = new FileReader()
    lezer.onload = () => resolve(String(lezer.result).split(',')[1] ?? '')
    lezer.onerror = () => reject(lezer.error)
    lezer.readAsDataURL(blob)
  })
}

/** Een fout met een uitleg die de gebruiker kan lezen. */
export class LeesFout extends Error {}

function vertaalFout(fout: unknown): LeesFout {
  if (fout instanceof LeesFout) return fout
  if (fout instanceof Anthropic.AuthenticationError) {
    return new LeesFout('De API-sleutel wordt niet geaccepteerd. Controleer hem in Instellingen.')
  }
  if (fout instanceof Anthropic.PermissionDeniedError) {
    return new LeesFout('Deze sleutel heeft geen toegang tot dit model of tot aanroepen vanuit de browser.')
  }
  if (fout instanceof Anthropic.RateLimitError) {
    return new LeesFout('Te veel aanvragen achter elkaar, of de limiet van je account is bereikt. Probeer het zo opnieuw.')
  }
  if (fout instanceof Anthropic.BadRequestError) {
    return new LeesFout(`De aanvraag is geweigerd: ${fout.message}`)
  }
  if (fout instanceof Anthropic.APIConnectionError) {
    return new LeesFout('Geen verbinding met de API. Controleer je internet en probeer het opnieuw.')
  }
  if (fout instanceof Anthropic.APIError) {
    return new LeesFout(`De API gaf een fout (${fout.status ?? 'onbekend'}): ${fout.message}`)
  }
  return new LeesFout(fout instanceof Error ? fout.message : 'Er ging iets mis.')
}

export async function leesChart(vraag: LeesVraag): Promise<LeesAntwoord> {
  if (!vraag.sleutel.trim()) throw new LeesFout('Er is nog geen API-sleutel ingevuld in Instellingen.')
  if (!SOORTEN.includes(vraag.afbeelding.type as Soort)) {
    throw new LeesFout('Dit bestandstype wordt niet ondersteund. Gebruik PNG, JPEG, WebP of GIF.')
  }

  const start = performance.now()
  try {
    // De sleutel staat in de browser van de gebruiker zelf; daarom moet dit uitdrukkelijk worden toegestaan.
    const client = new Anthropic({ apiKey: vraag.sleutel.trim(), dangerouslyAllowBrowser: true })
    const antwoord = await client.messages.parse({
      model: vraag.model,
      max_tokens: 16000,
      system: systeemOpdracht(vraag.geheugen),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: vraag.afbeelding.type as Soort, data: await alsBase64(vraag.afbeelding) },
            },
            { type: 'text', text: gebruikersTekst(vraag.idee, vraag.vervolg) },
          ],
        },
      ],
      output_config: { effort: 'high', format: zodOutputFormat(LezingSchema) },
    })

    if (antwoord.stop_reason === 'refusal') {
      throw new LeesFout('Het model heeft deze aanvraag geweigerd. Probeer een andere screenshot of het andere model.')
    }
    if (antwoord.stop_reason === 'max_tokens') {
      throw new LeesFout('Het antwoord was te lang en is afgebroken. Probeer het opnieuw.')
    }
    if (!antwoord.parsed_output) {
      throw new LeesFout('Het antwoord van het model had niet de verwachte vorm. Probeer het opnieuw.')
    }

    const verbruik: Verbruik = {
      invoer: antwoord.usage.input_tokens,
      uitvoer: antwoord.usage.output_tokens,
      cacheLezen: antwoord.usage.cache_read_input_tokens ?? 0,
      cacheSchrijven: antwoord.usage.cache_creation_input_tokens ?? 0,
    }
    return {
      lezing: antwoord.parsed_output,
      model: antwoord.model,
      verbruik,
      kosten: kostenVan(vraag.model, verbruik),
      duurMs: Math.round(performance.now() - start),
    }
  } catch (fout) {
    throw vertaalFout(fout)
  }
}
