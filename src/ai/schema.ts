// Wat de AI van een screenshot moet teruggeven. Dit schema dwingt de vorm van het antwoord af.

import { z } from 'zod'

/** zeker = duidelijk af te lezen; onzeker = gelezen maar met twijfel; niet_leesbaar = niet gegokt. */
const Zekerheid = z.enum(['zeker', 'onzeker', 'niet_leesbaar'])

const Prijs = z.object({
  waarde: z.number().nullable().describe('De prijs, of null als hij niet af te lezen is. Nooit gokken.'),
  zekerheid: Zekerheid,
  bron: z.string().describe('Waar op de chart dit is afgelezen, in een paar woorden.'),
})

export const CONFLUENCE_IDS = [
  'structuur',
  'fibonacci',
  'supplydemand',
  'liquidity',
  'poc',
  'imbalance',
  'sessieliquidity',
  'volume',
  'entrymodel',
  'fib50',
] as const

export const LezingSchema = z.object({
  beschrijving: z.string().describe('In gewone taal, in 2 tot 4 zinnen: wat er op de chart te zien is.'),
  richting: z.object({
    waarde: z.enum(['long', 'short']).nullable(),
    zekerheid: Zekerheid,
    uitleg: z.string(),
  }),
  entry: Prijs,
  stop: Prijs,
  fibLijn: Prijs.describe('De prijs van de 0.764-fibonaccilijn.'),
  zoneRand: Prijs.describe('De uiterste rand van de zone achter de 0.764-lijn.'),
  doelen: z.array(z.object({ label: z.string(), prijs: z.number() })).describe('Doelen die op de chart staan.'),
  entryModel: z.object({
    waarde: z.enum(['continuation', 'reversal1', 'reversal2']).nullable(),
    zekerheid: Zekerheid,
    uitleg: z.string(),
  }),
  confluences: z
    .array(
      z.object({
        id: z.enum(CONFLUENCE_IDS),
        gezien: z.enum(['gezien', 'niet_gezien', 'onduidelijk']),
        uitleg: z.string().describe('Eén zin.'),
      }),
    )
    .describe('Precies één regel per confluence, alle tien.'),
  tegenargument: z
    .string()
    .describe('Advocaat van de duivel: het sterkste argument tegen deze trade, in één of twee zinnen. Geen kans of percentage.'),
  vergelijking: z
    .string()
    .describe('Eén of twee zinnen over een eerdere trade of playbook-setup die hierop lijkt, met datum en uitkomst. Leeg als er niets vergelijkbaars is meegegeven.'),
  zelfGezien: z
    .array(
      z.object({
        wat: z.string().describe('Wat je ziet, in een paar woorden, bijvoorbeeld "doji star onder de 0.764" of "onaangeraakte imbalance".'),
        waar: z.string().describe('Waar op de chart, met prijs als die af te lezen is.'),
        waarom: z.string().describe('Waarom dit voor deze trader telt: welke les, correctie, confluence of playbook-setup erbij hoort. Eén zin.'),
      }),
    )
    .describe('Maximaal vijf dingen op de chart die de trader NIET zelf heeft getekend of benoemd, maar die volgens zijn eigen werkwijze, lessen of playbook ertoe doen. Leeg als er niets is. Verzin niets.'),
  tekeningCorrecties: z
    .array(
      z.object({
        wat: z.string().describe('Welke tekening van de trader, bijvoorbeeld "de demand-zone" of "de 0.764-lijn".'),
        voorstel: z.string().describe('Hoe het volgens zijn eigen regels zou moeten liggen, met prijs als die af te lezen is.'),
        waarom: z.string().describe('Welke regel, les of correctie van hem dit zegt. Eén zin.'),
      }),
    )
    .describe('Maximaal drie plekken waar de tekening van de trader afwijkt van zijn eigen regels en eerdere correcties. Leeg als alles klopt of als je het niet zeker weet.'),
  twijfelpunten: z.array(z.string()).describe('Waar de chart niet ondersteunt wat de trader zegt, of wat tegen de trade pleit.'),
  vragen: z
    .array(z.object({ vraag: z.string(), antwoorden: z.array(z.string()) }))
    .describe('Maximaal drie korte vragen, alleen over wat onzeker of niet leesbaar is, elk met 2 tot 4 aantikbare antwoorden.'),
})

export type Lezing = z.infer<typeof LezingSchema>
export type Zekerheid = z.infer<typeof Zekerheid>

// MARK: MT5-positie

export const Mt5Schema = z.object({
  richting: z.enum(['long', 'short']).nullable(),
  lots: z.number().nullable(),
  entry: z.number().nullable().describe('Openingsprijs.'),
  stop: z.number().nullable().describe('S/L, of null als er geen stop staat.'),
  takeProfit: z.number().nullable().describe('T/P, of null.'),
  winstNu: z.number().nullable().describe('Huidige winst of verlies in dollars, negatief bij verlies.'),
  opmerking: z.string().describe('Eén korte zin: wat onzeker was of wat verder opviel. Leeg als alles duidelijk was.'),
})

export type Mt5Lezing = z.infer<typeof Mt5Schema>
