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
import { readJsonStrict, rewritePageSerialized, setOrDrop, writeJson } from '../Files/atomicWrite'
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
    if (!(await writeFreshId(root, target, fresh))) continue
    copyDeviceRows(target, fresh)
    done.push({ target, newId: fresh })
  }
  return done
}

async function writeFreshId(root: string, target: RemintTarget, fresh: string): Promise<boolean> {
  try {
    if (target.kind === 'page')
      return await remintPageFile(join(root, target.path), target.id, fresh)
    if (target.kind === 'context') return false
    return await remintSidecar(join(root, target.path), target.kind, target.id, fresh)
  } catch (e) {
    console.error(`remint: the write for ${target.path} refused; the defer stands:`, errText(e))
    return false
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
): Promise<boolean> {
  const file = sidecarPath(absFolder, kind)
  const viewIds = new Map<string, string>()
  // Read fresh inside the lock: a container write that landed since the walk holds facts the stamp must carry forward, and a blind write would drop them.
  const landed = await withSidecarLock(absFolder, kind, async () => {
    const current = await readJsonStrict(file)
    if (!current.ok || current.value.id !== oldId) return false
    let next: Record<string, unknown> = { ...current.value, id: fresh }
    if (Array.isArray(next.views))
      next.views = next.views.map((v) => {
        if (!isPlainObject(v)) return v
        const minted = newId()
        if (typeof v.id === 'string') viewIds.set(v.id, minted)
        // The copy's pages are reminted to fresh ids in this same pass, so a carried manual order would name pages the copy does not hold — and on disk it syncs everywhere with nothing to sweep it.
        return { ...v, id: minted, manual_order: undefined }
      })
    // The copy must not inherit a selection it cannot resolve: a view id naming nothing in the copy's own namespace is dropped rather than carried.
    if (typeof next.active_view === 'string')
      next = setOrDrop(next, 'active_view', viewIds.get(next.active_view))
    await writeJson(file, next)
    return true
  })
  if (!landed) return false
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
  return true
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

function copyDeviceRows(target: RemintTarget, fresh: string): void {
  try {
    for (const scope of COPY_SCOPES) {
      const value = readKey(scope, target.id)
      if (value !== null) writeKey(scope, fresh, value)
    }
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
