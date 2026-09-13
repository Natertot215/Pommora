import { useEffect, useState } from 'react'
import type { Ledger } from './ledgerModel'

const LEDGER_DOC = 'ledger/history'

export function useLedger(): Ledger | null {
  const [ledger, setLedger] = useState<Ledger | null>(null)
  useEffect(() => {
    if (import.meta.env.DEV) {
      void import('./loc-history.json').then((m) => setLedger(m.default))
      return
    }
    let live = true
    let stop: (() => void) | undefined
    void window.claude?.use('db').then((db) => {
      if (!live || !db) return
      stop = db.doc(LEDGER_DOC).onSnapshot((snap) => {
        if (snap.exists) setLedger(snap.data() as Ledger)
      })
    })
    return () => {
      live = false
      stop?.()
    }
  }, [])
  return ledger
}
