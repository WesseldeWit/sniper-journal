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
  twijfelpunten: z.array(z.string()).describe('Waar de chart niet ondersteunt wat de trader zegt, of wat tegen de trade pleit.'),
  vragen: z
    .array(z.object({ vraag: z.string(), antwoorden: z.array(z.string()) }))
    .describe('Maximaal drie korte vragen, alleen over wat onzeker of niet leesbaar is, elk met 2 tot 4 aantikbare antwoorden.'),
})

export type Lezing = z.infer<typeof LezingSchema>
export type Zekerheid = z.infer<typeof Zekerheid>
