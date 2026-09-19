import { type IconNode, icons as lucideIcons, type LucideIcon } from 'lucide-react'

/** Validated against lucide-react's own per-icon dist filenames — the sole outlier is a legacy alias with no canonical file. */
export function toKebabIconId(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/([a-zA-Z])([0-9])/g, '$1-$2')
    .replace(/([0-9])([a-zA-Z])/g, '$1-$2')
    .toLowerCase()
}

export interface IconEntry {
  id: string
  Glyph: LucideIcon
}

/** The FULL Lucide set — the Icon Picker's source, distinct from the curated `icons` registry (./index). */
export const ALL_ICONS: IconEntry[] = (() => {
  const seen = new Set<string>()
  const out: IconEntry[] = []
  for (const [pascal, Glyph] of Object.entries(lucideIcons)) {
    const id = toKebabIconId(pascal)
    if (seen.has(id)) continue
    seen.add(id)
    out.push({ id, Glyph })
  }
  return out.sort((a, b) => a.id.localeCompare(b.id))
})()

const BY_ID = new Map(ALL_ICONS.map((e) => [e.id, e.Glyph]))

export const lucideGlyph = (id: string): LucideIcon | undefined => BY_ID.get(id)

// `createLucideIcon` keeps an icon's node list in the closure it hands to `forwardRef`, so the drawing is
// reachable only through that render function; it runs no hooks, and calling it costs one element.
type NodeCarrier = { render: (props: object, ref: null) => { props: { iconNode: IconNode } } }

export const lucideIconNodes = (id: string): IconNode | null => {
  const Glyph = BY_ID.get(id)
  return Glyph ? (Glyph as unknown as NodeCarrier).render({}, null).props.iconNode : null
}

export function searchIcons(query: string): IconEntry[] {
  const q = query.trim().toLowerCase().replace(/[\s-]/g, '')
  if (!q) return ALL_ICONS
  return ALL_ICONS.filter((e) => e.id.replace(/-/g, '').includes(q))
}
