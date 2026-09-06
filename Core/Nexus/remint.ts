import { join } from '../Paths/posix'
import { ID_KEY } from './identityMark'
import { isPlainObject } from '../Properties/propertyValue'
import type { EntityRecord, RecordKind } from './record'
import { errText } from '../Contract/result'
import { copyEntry } from '../Tiles/tilesFile'
import { writeTileDocAt } from '../Tiles/tileDoc'
import { pathExists } from '../Files/atomicWrite'
import { tileDocPath } from '../Paths/paths'
import { readKey, writeKey } from '../Platform/localState'
import { newContentId, newId } from './ids'
import { readJsonStrict, rewritePageSerialized, writeJson } from '../Files/atomicWrite'
import { mergeFrontmatter, splitEnvelope, splitFrontmatter } from '../Files/pageFile'
import { readWindowsState, writeWindowsState } from '../Interface/Windows/windowState'
import { sidecarPath } from '../Paths/paths'
import { withSidecarLock } from '../Files/sidecar'
import type { Baseline, Projection } from './remintLedger'

interface RemintTarget {
  id: string
  kind: RecordKind
  path: string
}

export function adjudicate(
  duplicates: Record<string, EntityRecord[]>,
  prior: Baseline | null,
  unreadablePaths: readonly string[],
): { remint: RemintTarget[]; defer: string[] } {
  const remint: RemintTarget[] = []
  const defer: string[] = []
  const unreadable = new Set(unreadablePaths)
  for (const [id, claims] of Object.entries(duplicates)) {
    const p = prior?.[id]
    if (!p || unreadable.has(p.path) || !claims.some((c) => c.path === p.path)) {
      defer.push(id)
      continue
    }
    for (const c of claims)
      if (c.path !== p.path) remint.push({ id: c.id, kind: c.kind, path: c.path })
  }
  return { remint, defer }
}

interface RemintedEntity {
  target: RemintTarget
  newId: string
}

export async function runRemintPass(
  root: string,
  projection: Projection,
  prior: Baseline | null,
  unreadablePaths: readonly string[],
): Promise<RemintedEntity[]> {
  const { remint } = adjudicate(projection.duplicates, prior, unreadablePaths)
  const done: RemintedEntity[] = []
  for (const target of remint) {
    const fresh = target.kind === 'page' ? newContentId('page') : newId()
    const viewIds = await writeFreshId(root, target, fresh)
    if (!viewIds) continue
    copyDeviceRows(target, fresh, viewIds)
    done.push({ target, newId: fresh })
  }
  return done
}

async function writeFreshId(
  root: string,
  target: RemintTarget,
  fresh: string,
): Promise<Map<string, string> | null> {
  try {
    // A page carries no views, so a landed page write returns an empty map, not null — null must keep its single meaning, a refused write.
    if (target.kind === 'page')
      return (await remintPageFile(join(root, target.path), target.id, fresh)) ? new Map() : null
    if (target.kind === 'context') return null
    return await remintSidecar(join(root, target.path), target.kind, target.id, fresh)
  } catch (e) {
    console.error(`remint: the write for ${target.path} refused; the defer stands:`, errText(e))
    return null
  }
}

async function remintPageFile(absFile: string, oldId: string, fresh: string): Promise<boolean> {
  return rewritePageSerialized(absFile, (content) => {
    // Read fresh inside the lock: a file that no longer carries the contested id moved under us, and a blind stamp would overwrite an identity the walk never adjudicated.
    if (splitFrontmatter(content)[ID_KEY] !== oldId) return null
    return mergeFrontmatter(content, { [ID_KEY]: fresh }, [ID_KEY], splitEnvelope(content).body)
  })
}

async function remintSidecar(
  absFolder: string,
  kind: 'space' | 'collection' | 'set',
  oldId: string,
  fresh: string,
): Promise<Map<string, string> | null> {
  const file = sidecarPath(absFolder, kind)
  const viewIds = new Map<string, string>()
  // Read fresh inside the lock: a container write that landed since the walk holds facts the stamp must carry forward, and a blind write would drop them.
  const landed = await withSidecarLock(absFolder, kind, async () => {
    const current = await readJsonStrict(file)
    if (!current.ok || current.value.id !== oldId) return false
    const next: Record<string, unknown> = { ...current.value, id: fresh }
    if (Array.isArray(next.views))
      next.views = next.views.map((v) => {
        if (!isPlainObject(v)) return v
        const minted = newId()
        if (typeof v.id === 'string') viewIds.set(v.id, minted)
        return { ...v, id: minted }
      })
    await writeJson(file, next)
    return true
  })
  if (!landed) return null
  if (kind === 'space' && (await pathExists(tileDocPath(absFolder)))) {
    const doc = await writeTileDocAt(absFolder, (cur) => ({
      ...cur,
      tiles: cur.tiles.map(copyEntry),
    }))
    if (!doc.ok)
      console.error(
        "remint: the copy's tile document refused; its view ids stand:",
        doc.error.message,
      )
  }
  return viewIds
}

const COPY_SCOPES = [
  'folds',
  'headingCols',
  'headingIcon',
  'citations',
  'embedHeights',
  'embedZooms',
  'aliases',
] as const

function copyDeviceRows(target: RemintTarget, fresh: string, viewIds: Map<string, string>): void {
  try {
    for (const scope of COPY_SCOPES) {
      const value = readKey(scope, target.id)
      if (value !== null) writeKey(scope, fresh, value)
    }
    for (const [old, minted] of viewIds) {
      const order = readKey<string[]>('viewOrder', old)
      if (order !== null) writeKey('viewOrder', minted, order)
    }
    const active = readKey<string>('activeView', target.id)
    const moved = active === null ? undefined : viewIds.get(active)
    if (moved) writeKey('activeView', fresh, moved)
    const windows = readWindowsState()
    const origin = windows.origins[target.id]
    if (origin)
      writeWindowsState({
        ...windows,
        origins: { ...windows.origins, [fresh]: structuredClone(origin) },
      })
  } catch (e) {
    console.error('remint: device-row copy failed; the copy starts on default chrome:', errText(e))
  }
}

export function applyRemints(projection: Projection, reminted: RemintedEntity[]): Projection {
  if (reminted.length === 0) return projection
  const entries = { ...projection.entries }
  const duplicates: Record<string, EntityRecord[]> = { ...projection.duplicates }
  for (const { target, newId: fresh } of reminted) {
    const claims = duplicates[target.id] ?? []
    const claim = claims.find((c) => c.path === target.path)
    if (claim) entries[fresh] = { ...claim, id: fresh }
    duplicates[target.id] = claims.filter((c) => c.path !== target.path)
  }
  for (const [id, claims] of Object.entries(duplicates)) {
    if (claims.length > 1) continue
    if (claims.length === 1) entries[id] = claims[0]
    delete duplicates[id]
  }
  return { entries, duplicates }
}
