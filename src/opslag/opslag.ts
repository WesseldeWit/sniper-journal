// Eén plek waar de app gegevens bewaart en ophaalt. Nu is dat de opslag van de
// browser (IndexedDB). Als er later sync komt, verandert alleen dit bestand.

const DATABASE = 'sniper-journal'
const BAK = 'gegevens'

let verbinding: Promise<IDBDatabase> | null = null

function open(): Promise<IDBDatabase> {
  if (!verbinding) {
    verbinding = new Promise((resolve, reject) => {
      const verzoek = indexedDB.open(DATABASE, 1)
      verzoek.onupgradeneeded = () => {
        if (!verzoek.result.objectStoreNames.contains(BAK)) verzoek.result.createObjectStore(BAK)
      }
      verzoek.onsuccess = () => resolve(verzoek.result)
      verzoek.onerror = () => reject(verzoek.error)
    })
  }
  return verbinding
}

export async function lees<T>(sleutel: string): Promise<T | undefined> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const verzoek = db.transaction(BAK, 'readonly').objectStore(BAK).get(sleutel)
    verzoek.onsuccess = () => resolve(verzoek.result as T | undefined)
    verzoek.onerror = () => reject(verzoek.error)
  })
}

/** Alle waarden waarvan de sleutel met dit voorvoegsel begint. */
export async function leesMetVoorvoegsel<T>(voorvoegsel: string): Promise<T[]> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const bereik = IDBKeyRange.bound(voorvoegsel, voorvoegsel + '\uffff')
    const verzoek = db.transaction(BAK, 'readonly').objectStore(BAK).getAll(bereik)
    verzoek.onsuccess = () => resolve(verzoek.result as T[])
    verzoek.onerror = () => reject(verzoek.error)
  })
}

/** Alles wat is opgeslagen, als lijst van [sleutel, waarde]. Voor de back-up. */
export async function leesAlles(): Promise<[string, unknown][]> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const bak = db.transaction(BAK, 'readonly').objectStore(BAK)
    const sleutels = bak.getAllKeys()
    const waarden = bak.getAll()
    waarden.onsuccess = () => resolve(sleutels.result.map((s, n) => [String(s), waarden.result[n]]))
    waarden.onerror = () => reject(waarden.error)
  })
}

/** Wist alles en zet de gegeven items ervoor in de plaats, in één keer. Voor het terugzetten van een back-up. */
export async function vervangAlles(items: [string, unknown][]): Promise<void> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const transactie = db.transaction(BAK, 'readwrite')
    const bak = transactie.objectStore(BAK)
    bak.clear()
    for (const [sleutel, waarde] of items) bak.put(waarde, sleutel)
    transactie.oncomplete = () => resolve()
    transactie.onerror = () => reject(transactie.error)
  })
}

export async function verwijder(sleutel: string): Promise<void> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const transactie = db.transaction(BAK, 'readwrite')
    transactie.objectStore(BAK).delete(sleutel)
    transactie.oncomplete = () => resolve()
    transactie.onerror = () => reject(transactie.error)
  })
}

export async function schrijf<T>(sleutel: string, waarde: T): Promise<void> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const transactie = db.transaction(BAK, 'readwrite')
    transactie.objectStore(BAK).put(waarde, sleutel)
    transactie.oncomplete = () => resolve()
    transactie.onerror = () => reject(transactie.error)
  })
}
