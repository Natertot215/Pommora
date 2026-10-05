import type { LucideIcon } from 'lucide-react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ALL_ICONS, type IconEntry } from './iconRoster'
import { ICON_TAGS } from './iconTags'
import { Icon } from './index'

export { ALL_ICONS, type IconEntry, toKebabIconId } from './iconRoster'

const BY_ID = new Map(ALL_ICONS.map((e) => [e.id, e.Glyph]))

export const lucideGlyph = (id: string): LucideIcon | undefined => BY_ID.get(id)

// The markup an <Icon> mounts for `name`, for a surface that can only draw it as an image; `color` lands as its `currentColor`.
export const iconMarkup = (name: string, color: string): string =>
  renderToStaticMarkup(
    createElement(Icon, { name, style: { color }, xmlns: 'http://www.w3.org/2000/svg' }),
  )

const searchKey = (text: string): string => text.toLowerCase().replace(/[\s-]/g, '')

type Searchable = { entry: IconEntry; name: string; tags: string[]; tagWords: string[] }

// Built on first search, since glyph rendering loads this module without ever searching.
let searchable: Searchable[] | undefined

const TIERS = 5

/** 0 exact name · 1 name prefix · 2 name substring · 3 exact tag · 4 a tag or one of its words starts with the query. */
function tier({ name, tags, tagWords }: Searchable, q: string): number | undefined {
  if (name === q) return 0
  if (name.startsWith(q)) return 1
  if (name.includes(q)) return 2
  if (tags.includes(q)) return 3
  if (tags.some((t) => t.startsWith(q)) || tagWords.some((w) => w.startsWith(q))) return 4
  return undefined
}

/** Ranked by match quality, each tier in id order. */
export function searchIcons(query: string): IconEntry[] {
  const q = searchKey(query)
  if (!q) return ALL_ICONS
  searchable ??= ALL_ICONS.map((entry) => ({
    entry,
    name: searchKey(entry.id),
    tags: ICON_TAGS[entry.id].map(searchKey),
    tagWords: ICON_TAGS[entry.id].flatMap((t) => t.toLowerCase().split(/[\s-]+/)),
  }))
  const tiers: IconEntry[][] = Array.from({ length: TIERS }, () => [])
  for (const s of searchable) {
    const t = tier(s, q)
    if (t !== undefined) tiers[t].push(s.entry)
  }
  return tiers.flat()
}
