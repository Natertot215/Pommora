// The pane widths and sidebar folds Pommora once kept in the browser, carried into the device store on the first open that finds them and erased behind it. Renderer-side, because localStorage is the browser's.

import { host } from '../Platform/dialer'

const KEYS = ['pommora.sidebarWidth', 'pommora.inspectorWidth', 'pommora.sidebar.disclosure']

const widthOf = (raw: string | null): number | undefined => {
  const n = Number(raw)
  return raw !== null && Number.isFinite(n) && n > 0 ? n : undefined
}

const foldsOf = (raw: string | null): Record<string, boolean> => {
  try {
    const parsed: unknown = raw === null ? null : JSON.parse(raw)
    return parsed !== null && typeof parsed === 'object' ? (parsed as Record<string, boolean>) : {}
  } catch {
    return {}
  }
}

export async function importBrowserState(): Promise<void> {
  let held: (string | null)[]
  try {
    held = KEYS.map((k) => localStorage.getItem(k))
  } catch {
    return
  }
  if (held.every((v) => v === null)) return
  const [sidebar, inspector, disclosure] = held
  const loaded = await host().ask('devicePrefs:load')
  if (!loaded.ok) return
  const prefs = loaded.value ?? {}
  const saved = await host().ask('devicePrefs:save', {
    ...prefs,
    // Whatever the device store already holds wins; the browser value only fills a gap it left.
    panes: { sidebar: widthOf(sidebar), inspector: widthOf(inspector), ...prefs.panes },
    disclosure: { ...foldsOf(disclosure), ...prefs.disclosure },
  })
  // Erased only once the write is confirmed: emptying the source ahead of it is how the value is lost.
  if (saved.ok) for (const k of KEYS) localStorage.removeItem(k)
}
