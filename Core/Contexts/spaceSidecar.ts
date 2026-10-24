import { parseContextKey } from './contexts'
import { asString, asStringArray } from '../Nexus/coerce'
import type { Json } from '../Files/stableJson'
import type { Rewrite } from '../Nexus/governedSweep'
import { pathExists, readJsonObject, withoutId } from '../Files/atomicWrite'
import { visibleFolders } from '../Files/walk'
import { contextsDir, sidecarPath } from '../Paths/paths'
import { join } from '../Paths/posix'
import type { SpaceNode } from '../Nexus/tree'

export const COLOR_KEY = '$color'
export const ORDER_KEY = '$order'
export const ICON_KEY = '$icon'

// Each name here is a reserved property name or `$`-prefixed, so no property value can sit under one.
export const SPACE_MODELED_KEYS = new Set([
  'id',
  ICON_KEY,
  'banner',
  'heading_icon_hidden',
  COLOR_KEY,
  ORDER_KEY,
])

/** The Spaces a Context folder holds, by folder name, and where each one's sidecar sits; a folder without a sidecar is a plain folder its reader passes over. */
export async function spaceSidecarsIn(
  absContextDir: string,
): Promise<{ name: string; file: string }[]> {
  return (await visibleFolders(absContextDir)).map((name) => ({
    name,
    file: sidecarPath(join(absContextDir, name), 'space'),
  }))
}

/** Each Space's id by folder name; `unread` when a sidecar is present and unusable, where an absent one is a plain folder. */
export async function spaceIdsIn(
  absContextDir: string,
): Promise<{ ids: Map<string, string>; unread: boolean }> {
  const ids = new Map<string, string>()
  let unread = false
  for (const { name, file } of await spaceSidecarsIn(absContextDir)) {
    const raw = await readJsonObject(file)
    if (typeof raw?.id === 'string') ids.set(name, raw.id)
    else if (await pathExists(file)) unread = true
  }
  return { ids, unread }
}

/** Every Space sidecar on disk, found by folder rather than from the tree, so the asset migration reports one the tree couldn't read. */
export async function spaceSidecars(root: string): Promise<string[]> {
  const dir = contextsDir(root)
  const files: string[] = []
  for (const context of await visibleFolders(dir))
    for (const { file } of await spaceSidecarsIn(join(dir, context)))
      if (await pathExists(file)) files.push(file)
  return files
}

export function spaceNodeFrom(
  sc: Json,
  at: { title: string; path: string; contextId: string },
): SpaceNode | null {
  const id = asString(sc.id)
  if (!id) return null
  const unmodeled = (contextKey: boolean): Json | undefined => {
    const kept = Object.entries(sc).filter(
      ([k]) => !SPACE_MODELED_KEYS.has(k) && (parseContextKey(k) !== null) === contextKey,
    )
    return kept.length ? Object.fromEntries(kept) : undefined
  }
  return {
    kind: 'space',
    id,
    ...at,
    icon: asString(sc[ICON_KEY]),
    banner: asString(sc.banner),
    headingIconHidden: sc.heading_icon_hidden === true,
    color: asString(sc[COLOR_KEY]),
    rowOrder: asStringArray(sc[ORDER_KEY]),
    values: unmodeled(false),
    contextKeys: unmodeled(true),
  }
}

export const withoutOrderId =
  (inner: Rewrite, id: string): Rewrite =>
  (raw, file) => {
    const kept = inner(raw, file)
    return withoutId(kept ?? raw, ORDER_KEY, id) ?? kept
  }
