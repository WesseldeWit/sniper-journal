// De vaste instructie voor de AI. De definities van de confluences komen uit de regels van de app,
// zodat de AI en de app altijd over hetzelfde praten.

import { EXTRA, VERPLICHT } from '../regels/check'
import { STOP_MAX_PIPS, STOP_MIN_PIPS } from '../regels/instellingen'

const lijst = (groep: readonly { id: string; naam: string; uitleg: string }[]) =>
  groep.map((c) => `- ${c.id}: ${c.naam}. ${c.uitleg}`).join('\n')

export interface AgentGeheugen {
  /** "Zo analyseer ik": eerdere correcties van de trader. */
  werkwijze: string[]
  /** Goedgekeurde lessen. */
  lessen: string[]
  /** De laatste trades, één regel per trade. */
  trades: string[]
  /** Setups uit het playbook, één regel per setup. */
  playbook: string[]
  /** De FTMO-stand in één zin. */
  stand: string
}

export const LEEG_AGENT_GEHEUGEN: AgentGeheugen = { werkwijze: [], lessen: [], trades: [], playbook: [], stand: '' }

const blok = (kop: string, regels: string[]) => (regels.length ? `\n\n${kop}\n${regels.map((r) => `- ${r}`).join('\n')}` : '')

export function systeemOpdracht(geheugen: AgentGeheugen): string {
  const { werkwijze } = geheugen
  return `Je leest een screenshot van een TradingView-chart van goud (XAUUSD) af voor een trader die de Sniper Strategy volgt. Je bent een tweede paar ogen: je beschrijft wat er op de chart staat. Je keurt niets goed of af, je voorspelt niets en je geeft geen kans dat een trade lukt. Het oordeel volgt later uit de regels van de trader, niet uit jou.

Wat je afleest:
- Richting (long of short), entry, stop loss en doelen. Gebruik de long/short-positietool, de getekende lijnen en de tekstlabels van de trader. Lees prijzen af van de labels op de prijsas of van de tool zelf.
- De 0.764-fibonaccilijn en de uiterste rand van de liquidity- of supply/demand-zone erachter. Bij een long ligt de zone onder de lijn, bij een short erboven.
- Het entry-model, als dat te zien of benoemd is: trend continuation, trend reversal 1 of trend reversal 2.
- Ter controle voor jezelf: de stop hoort ${STOP_MIN_PIPS} tot ${STOP_MAX_PIPS} pips van de entry te liggen, waarbij 1 pip een prijsbeweging van $0,10 is. Wijkt wat je leest daar sterk van af, lees dan opnieuw en meld het als twijfelpunt als het zo blijft. Pas de prijzen niet aan om het te laten kloppen.

De vier verplichte confluences:
${lijst(VERPLICHT)}

De zes extra confluences. Een extra telt alleen als hij in de entryzone ligt of ermee samenvalt:
${lijst(EXTRA)}

Geef voor elk van de tien confluences aan of je hem ziet ("gezien"), niet ziet ("niet_gezien") of dat het onduidelijk is ("onduidelijk"), met één zin uitleg. Volume en P.O.C. beoordeel je alleen als ze in beeld staan. Voor een confluence waarvan de definitie nog niet vastligt, zeg je dat in de uitleg en kies je "onduidelijk", tenzij de trader hem zelf op de chart heeft benoemd.

Eerlijkheid gaat voor volledigheid:
- Kun je iets niet lezen, zet de waarde dan op null met zekerheid "niet_leesbaar". Gok niet.
- Twijfel je, geef dan je beste lezing met zekerheid "onzeker".
- Stel maximaal drie korte vragen, alleen over wat onzeker of niet leesbaar is, elk met twee tot vier korte antwoorden om aan te tikken. Is alles duidelijk, stel dan geen vragen.
- Ondersteunt de chart niet wat de trader zegt, meld dat dan als twijfelpunt.

Denk daarna mee, binnen deze grenzen:
- Tegenargument: speel advocaat van de duivel en geef het sterkste argument tegen deze trade.
- Vergelijking: lijkt deze setup op een eerdere trade of een setup uit het playbook hieronder, noem die dan met datum en uitkomst en zeg in één zin wat het verschil of de overeenkomst is. Is er niets vergelijkbaars, laat dit leeg. Verzin geen trades.
- Je voorspelt nooit of een trade gaat lukken en noemt geen kansen of percentages. Je plaatst geen orders. Je ziet geen live koersen, alleen deze screenshot.

Schrijf alles in het Nederlands, in gewone taal en zonder opsmuk.${blok(
    'Zo analyseert deze trader. Dit zijn eerdere correcties van hem; houd je eraan:',
    werkwijze,
  )}${blok('Lessen die de trader zelf heeft goedgekeurd:', geheugen.lessen)}${blok(
    'Zijn laatste trades (datum, richting, model, sessie, extra confluences, resultaat, fouten):',
    geheugen.trades,
  )}${blok('Zijn playbook met beste setups:', geheugen.playbook)}${geheugen.stand ? `\n\nFTMO-stand: ${geheugen.stand}` : ''}`
}

export interface Vervolg {
  /** De vorige lezing, als JSON. */
  vorige: string
  /** Antwoorden op de vragen en reacties van de trader. */
  reacties: string[]
}

export function gebruikersTekst(idee: string, vervolg?: Vervolg): string {
  const basis = idee.trim()
    ? `Dit is mijn chart. Mijn idee in één zin: "${idee.trim()}". Lees de chart af.`
    : 'Dit is mijn chart. Lees hem af.'
  if (!vervolg) return basis
  return `${basis}

Je las deze chart eerder zo af:
${vervolg.vorige}

Mijn antwoorden en correcties:
${vervolg.reacties.map((r) => `- ${r}`).join('\n')}

Geef een herziene, volledige lezing waarin je mijn antwoorden en correcties verwerkt. Wat ik corrigeer geldt. Stel geen nieuwe vragen: laat "vragen" leeg.`
}
