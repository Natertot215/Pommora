// A part that is not mounted reads as absent, never as the first element a class happens to match.

export type ChromePart =
  | 'sidebar'
  | 'sidePane'
  | 'toolbar'
  | 'pageWindow'
  | 'contentPane'
  | 'contentView'
  | 'shell'

const parts = new Map<ChromePart, HTMLElement>()
// One callback per part, so a re-render hands React the same ref and never detaches the entry it is about to re-attach.
type Publish = (el: HTMLElement | null) => (() => void) | undefined
const publishers = new Map<ChromePart, Publish>()

/** The ref callback an owner hands its element; its cleanup drops the entry only while that same element still holds it. */
export function publishChromePart(part: ChromePart): Publish {
  const held = publishers.get(part)
  if (held) return held
  const publish: Publish = (el) => {
    if (!el) return undefined
    parts.set(part, el)
    // A replacement that mounted before this one unmounted already owns the entry.
    return () => {
      if (parts.get(part) === el) parts.delete(part)
    }
  }
  publishers.set(part, publish)
  return publish
}

export const chromePartEl = (part: ChromePart): HTMLElement | null => parts.get(part) ?? null

export const chromePartRect = (part: ChromePart): DOMRect | null =>
  parts.get(part)?.getBoundingClientRect() ?? null
