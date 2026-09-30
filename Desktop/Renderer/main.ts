// First: zod probes `new Function` when it builds its first object schema, and the window's content policy forbids eval.
import './zodConfig'
import { mountApp } from '@pommora/core/Interface/mount'
import './drag-region.css'

mountApp(document.getElementById('root') as HTMLElement)

// Dev-only CDP drive seam: agents verify UI headlessly by calling store actions (never synthetic clicks near an editor — those risk real-Nexus writes).
if (import.meta.env.DEV) {
  void import('@pommora/core/Session/store').then(({ useSession }) => {
    ;(window as unknown as { __pommora: unknown }).__pommora = useSession
  })
}
