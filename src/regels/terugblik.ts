// Terugkijken: het weekoverzicht, de maandpatronen en de vragen voor de nabespreking.

import type { DagSleutel } from '../hulp/datum'
import { metTeken } from '../hulp/getal'
import type { Dag } from '../opslag/dagen'
import { MODEL_NAMEN, SESSIE_NAMEN } from './analyse'
import { FOUTLABELS, regeltrouw } from './resultaat'

export interface WeekOverzicht {
  analyses: number
  trades: number
  afgerond: number
  totaalR: number
  volgensRegels: number
  goed: string[]
  vaaksteFout: string | null
  /** Een voorstel voor komende week. Gaat pas in als je het goedkeurt. */
  voorstel: string | null
}

const klaar = (dagen: Dag[]) => dagen.filter((d) => d.besluit?.soort === 'genomen' && d.resultaat)

export function weekOverzicht(dagen: Dag[], week: DagSleutel[]): WeekOverzicht {
  const vanWeek = dagen.filter((d) => week.includes(d.datum))
  const afgerond = klaar(vanWeek)
  const volgens = afgerond.filter((d) => regeltrouw(d.besluit!.ongepland, d.resultaat!).volgensRegels)
  const fout = FOUTLABELS.map((l) => ({ naam: l.naam, aantal: afgerond.filter((d) => d.resultaat!.foutlabels.includes(l.id)).length }))
    .filter((t) => t.aantal > 0)
    .sort((a, b) => b.aantal - a.aantal)[0]
  const ongepland = afgerond.filter((d) => d.besluit!.ongepland).length
  const nietGenomen = vanWeek.filter((d) => d.besluit?.soort === 'niet-genomen').length

  const goed: string[] = []
  if (afgerond.length && volgens.length === afgerond.length) goed.push('Elke trade was volgens de regels.')
  if (nietGenomen) goed.push(`${nietGenomen} keer een setup laten lopen die niet klopte of de zone niet raakte.`)
  const verliesVolgensRegels = volgens.filter((d) => d.resultaat!.r < 0).length
  if (verliesVolgensRegels) goed.push(`${verliesVolgensRegels} verlies volgens de regels: dat telt als goede trade.`)

  const voorstel = fout
    ? `Let komende week extra op "${fout.naam}": dat ging ${fout.aantal} keer mis.`
    : ongepland
      ? 'Leg komende week elk plan vast voordat de prijs de zone raakt.'
      : null

  return {
    analyses: vanWeek.filter((d) => d.vastgelegdOp || d.analyse.prediction.trim()).length,
    trades: vanWeek.filter((d) => d.besluit?.soort === 'genomen').length,
    afgerond: afgerond.length,
    totaalR: Number(afgerond.reduce((som, d) => som + d.resultaat!.r, 0).toFixed(2)),
    volgensRegels: volgens.length,
    goed,
    vaaksteFout: fout ? `${fout.naam} (${fout.aantal} keer)` : null,
    voorstel,
  }
}

export interface MaandPatronen {
  aantal: number
  zinnen: string[]
  /** Wat de cijfers bij dit aantal trades wel en niet kunnen aantonen. */
  voorbehoud: string
}

export function maandPatronen(dagen: Dag[]): MaandPatronen {
  const trades = klaar(dagen)
  const zinnen: string[] = []
  const groep = (naam: string, sleutel: (d: Dag) => string | null, label: (s: string) => string) => {
    const per = new Map<string, number[]>()
    for (const d of trades) {
      const s = sleutel(d)
      if (s) per.set(s, [...(per.get(s) ?? []), d.resultaat!.r])
    }
    for (const [s, rs] of per) {
      if (rs.length >= 3) {
        const gem = rs.reduce((a, b) => a + b, 0) / rs.length
        zinnen.push(`${naam} ${label(s)}: ${rs.length} trades, gemiddeld ${metTeken(Number(gem.toFixed(2)))}R.`)
      }
    }
  }
  groep('Sessie', (d) => d.analyse.sessie, (s) => SESSIE_NAMEN[s as keyof typeof SESSIE_NAMEN])
  groep('Model', (d) => d.analyse.model, (s) => MODEL_NAMEN[s as keyof typeof MODEL_NAMEN])
  groep('Extra confluences', (d) => String(d.besluit!.aantalConfluences), (s) => s)
  const binnen = trades.filter((d) => regeltrouw(d.besluit!.ongepland, d.resultaat!).volgensRegels)
  if (trades.length >= 3) zinnen.push(`${binnen.length} van de ${trades.length} trades waren volgens de regels.`)

  const voorbehoud =
    trades.length < 20
      ? `Met ${trades.length} ${trades.length === 1 ? 'trade' : 'trades'} zijn dit waarnemingen, geen bewijs. Verschillen kunnen puur toeval zijn. Vanaf ongeveer 20 tot 30 trades worden patronen iets betrouwbaarder.`
      : `Met ${trades.length} trades worden grote verschillen zichtbaar, maar kleine verschillen kunnen nog steeds toeval zijn. Deze cijfers zeggen niets over de volgende trade.`
  return { aantal: trades.length, zinnen, voorbehoud }
}

/** Twee korte vragen voor de nabespreking, passend bij hoe de trade ging. */
export function nabesprekingsVragen(x: { r: number | null; volgensPlan: boolean; heeftFoutlabel: boolean }): [string, string] {
  if (!x.volgensPlan || x.heeftFoutlabel) {
    return ['Op welk moment week je af van je plan, en wat voelde je toen?', 'Wat doe je de volgende keer op precies dat moment?']
  }
  if (x.r !== null && x.r < 0) {
    return ['Zou je deze trade met dezelfde informatie opnieuw nemen? Waarom?', 'Zag je vooraf iets op de chart dat je nu zwaarder zou wegen?']
  }
  return ['Wat aan deze setup maakte hem goed, los van de uitkomst?', 'Waar was het volgen van het schema het moeilijkst?']
}
