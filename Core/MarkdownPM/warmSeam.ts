import { fenceWarm } from '../Navigation/warmTabs'
import { capSet } from '../Utilities/capMap'

/** The host binds `restore`/`capture` to a (tab, entity) identity at mount time — the mount-once effect freezes that binding, so a capture can never land under the NEXT tab's identity mid-switch. */
export interface WarmSeam {
  restore: () => { editorState?: unknown; scrollTop?: number } | undefined
  capture: (state: { editorState: unknown; scrollTop: number }) => void
}

type WarmState = { editorState: unknown; scrollTop: number }

/** A page edited since the capture invalidates the whole entry, since selection and history are positions into a document that no longer exists. */
export function mapWarmSeam(
  cache: Map<string, WarmState>,
  key: string,
  liveBody: () => string | undefined,
  cap?: number,
): WarmSeam {
  return {
    restore: () => {
      const kept = fenceWarm(cache.get(key), liveBody())
      if (!kept) cache.delete(key)
      return kept
    },
    capture: (state) =>
      cap === undefined ? void cache.set(key, state) : capSet(cache, key, state, cap),
  }
}
