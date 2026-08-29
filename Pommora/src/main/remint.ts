// The re-mint half of the record: a duplicated id — content or container — stops sharing its
// twin's identity. The prior session's baseline names the path that legitimately held each id;
// what sits there is the original, everything else takes a fresh id and DUPLICATES of the
// device-local rows keyed to the old one — the original is untouched by construction.

import { join } from 'node:path'
import { blockHostKey } from '@shared/blocks'
import { KIND_ID_KEY } from '@shared/identity'
import { isPlainObject } from '@shared/propertyValue'
import type { EntityRecord, RecordKind } from '@shared/record'
import { errText } from '@shared/result'
import { remintConfigIds } from './blocks'
import { readKey, writeKey } from './Database/localState'
import { newId } from './ids'
import { readJsonStrict, rewritePageSerialized, writeJson } from './IO/atomicWrite'
import { mergeFrontmatter, splitEnvelope, readFrontmatterFields } from './IO/pageFile'
import { readPreviewsState, writePreviewsState } from './IO/previewState'
import { SIDECAR_FILENAME } from './paths'
import type { Baseline, Projection } from './record'

export interface RemintTarget {
  /** The shared id being vacated — the write half mints the replacement. */
  id: string
  kind: RecordKind
  path: string
}

/** Who keeps a contested id. The recorded path is the only non-re-derivable fact, so it is the
 *  whole verdict: a readable claimant there is the original and every other claimant re-mints —
 *  an ambiguous mark is preserved evidence and is spent the session its path answers again.
 *  Everything else defers: no baseline, no entry, an unreadable recorded path (never guess),
 *  or no claimant at it (unadjudicable — the baseline writer drops that entry). */
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

export interface RemintedEntity {
  target: RemintTarget
  newId: string
}

/** Execute the verdicts: disk writes first (the identity), device-row duplicates second (the
 *  chrome) — a row failure leaves the copy on default chrome and the original untouched,
 *  never a half-minted identity. A refused disk write skips that target; the defer stands. */
export async function runRemintPass(
  root: string,
  projection: Projection,
  prior: Baseline | null,
  unreadablePaths: readonly string[],
): Promise<RemintedEntity[]> {
  const { remint } = adjudicate(projection.duplicates, prior, unreadablePaths)
  const done: RemintedEntity[] = []
  for (const target of remint) {
    const fresh = newId()
    const viewIds = await writeFreshId(root, target, fresh)
    if (!viewIds) continue
    copyDeviceRows(target, fresh, viewIds)
    done.push({ target, newId: fresh })
  }
  return done
}

/** No duplication mechanism reproduces a registry ENTRY (copying the folder copies the whole
 *  nexus), so a duplicated context id is a hand-edit; it defers rather than rewriting the
 *  registry blind. */
async function writeFreshId(
  root: string,
  target: RemintTarget,
  fresh: string,
): Promise<Map<string, string> | null> {
  try {
    // The map is what the copy's device rows join on; a page carries no views, so a landed page
    // write is an empty one — null keeps its single meaning, a refused write.
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
    // Read fresh inside the lock: a file that no longer carries the contested id moved under
    // us, and a blind stamp would overwrite an identity the walk never adjudicated.
    if (readFrontmatterFields(content)[KIND_ID_KEY.page] !== oldId) return null
    return mergeFrontmatter(
      content,
      { [KIND_ID_KEY.page]: fresh },
      [KIND_ID_KEY.page],
      splitEnvelope(content).body,
    )
  })
}

async function remintSidecar(
  absFolder: string,
  kind: 'space' | 'collection' | 'set',
  oldId: string,
  fresh: string,
): Promise<Map<string, string> | null> {
  const file = join(absFolder, SIDECAR_FILENAME[kind])
  const current = await readJsonStrict(file)
  if (!current.ok || current.value.id !== oldId) return null
  const viewIds = new Map<string, string>()
  const next: Record<string, unknown> = { ...current.value, id: fresh }
  // A file-copied container duplicated its saved views' ids too — they key per-machine
  // viewOrder rows, so the copy's views re-mint in the same write. The correspondence travels:
  // anything device-local that NAMES a view must follow it to the copy's own id.
  if (Array.isArray(next.views))
    next.views = next.views.map((v) => {
      if (!isPlainObject(v)) return v
      const minted = newId()
      if (typeof v.id === 'string') viewIds.set(v.id, minted)
      return { ...v, id: minted }
    })
  await writeJson(file, next)
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
    // A row that NAMES a view is not opaque chrome: it travels through the same map that
    // re-minted the views, so it names the copy's own. One with no counterpart — a stale row
    // naming a view the container no longer has — does not travel at all. The manual order keys
    // ON the view; the selection keys on the container and holds a view in its value.
    for (const [old, minted] of viewIds) {
      const order = readKey<string[]>('viewOrder', old)
      if (order !== null) writeKey('viewOrder', minted, order)
    }
    const active = readKey<string>('activeView', target.id)
    const moved = active === null ? undefined : viewIds.get(active)
    if (moved) writeKey('activeView', fresh, moved)
    if (target.kind === 'space') copyBlockDocRow(target.id, fresh)
    const previews = readPreviewsState()
    const origin = previews.origins[target.id]
    if (origin)
      writePreviewsState({
        ...previews,
        origins: { ...previews.origins, [fresh]: structuredClone(origin) },
      })
  } catch (e) {
    console.error('remint: device-row copy failed; the copy starts on default chrome:', errText(e))
  }
}

/** The blockDoc value is NOT opaque: view-embed tiles carry `views[].config.id`, a live
 *  per-machine key two boards must never share — each tile's views pass through the same
 *  re-mint every in-app tile copy uses. */
function copyBlockDocRow(oldId: string, fresh: string): void {
  const doc = readKey<Record<string, unknown>>(
    'blockDoc',
    blockHostKey({ kind: 'space', id: oldId }),
  )
  if (doc === null) return
  const blocks = Array.isArray(doc.blocks)
    ? doc.blocks.map((b) =>
        isPlainObject(b) && b.type === 'view' && Array.isArray(b.views)
          ? { ...b, views: remintConfigIds(b.views) }
          : b,
      )
    : doc.blocks
  writeKey('blockDoc', blockHostKey({ kind: 'space', id: fresh }), { ...doc, blocks })
}

/** Fold executed re-mints back into the projection the baseline will latch: each written copy
 *  enters under its fresh id, and an id whose claimants fell to one is no longer a duplicate —
 *  the survivor is the original. The walked tree itself is never mutated (its page nodes are
 *  shared with the parse cache). */
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
