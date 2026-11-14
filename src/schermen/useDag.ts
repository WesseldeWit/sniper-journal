import { useEffect, useState } from 'react'
import type { DagSleutel } from '../hulp/datum'
import { legeDag, leesDag, leesScreenshot, type Dag } from '../opslag/dagen'

/** Haalt een dag en de screenshot van de analyse op uit de opslag. */
export function useDag(datum: DagSleutel) {
  const [dag, setDag] = useState<Dag | null>(null)
  const [screenshot, setScreenshot] = useState<Blob | null>(null)

  useEffect(() => {
    let actueel = true
    setDag(null)
    void Promise.all([leesDag(datum), leesScreenshot(datum)]).then(([bewaard, foto]) => {
      if (!actueel) return
      setDag(bewaard ?? legeDag(datum))
      setScreenshot(foto ?? null)
    })
    return () => {
      actueel = false
    }
  }, [datum])

  return { dag, setDag, screenshot, setScreenshot }
}
