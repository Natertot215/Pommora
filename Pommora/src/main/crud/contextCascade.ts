// The three-scope title cascade behind Context/Space renames, plus the rename ops and the
// on-open journal replay. A Context rename rewrites the parenthesized KEY in every member root; a
// Space rename rewrites its exact canonical title as a VALUE under its Context's key
// (near-miss forms stay — the reconcile owns those). Scopes: every `.md` frontmatter, every
// agenda `*.json` root, every `_space.json` root — each under its own file lock.

import { readFile, rename } from 'node:fs/promises'
import { join } from 'node:path'
import {
  contextKey,
  invalidContextTitle,
  isGovernedContextKey,
  normalizeContextValue,
  type ContextsRegistry,
} from '@shared/contexts'
import { AGENDA_SUFFIX } from '@shared/agenda'
import { ok, fail, errText, type Result } from '@shared/result'
import { mutateRegistryFile, readRegistryStrict } from '../contextsRegistry'
import { atomicWriteFile, pathExists, readJsonObject, writeJson } from '../io/atomicWrite'
import { serializeOnFile } from '../io/fileLock'
import { mergeFrontmatter, splitEnvelope } from '../io/pageFile'
import { listFilesRecursive, listMarkdownFiles } from '../io/walk'
import { recordWrite } from '../io/writeEcho'
import { splitFrontmatter } from '../readNexus'
import { contextsDir, SPACE_SIDECAR } from '../paths'
import { clearJournal, readJournal, writeJournal, type RenameJournal } from './contextJournal'
import { loadContextWorld } from './contextWrite'
import { invalidName } from './util'

const SKIP_TOP_LEVEL = ['.nexus', '.trash']
type Raw = Record<string, unknown>

/** The key/value rewrite one root undergoes, or null when untouched. */
function rewriteRoot(raw: Raw, contextTitle: string, j: RenameJournal): Raw | null {
  if (j.spaceId === undefined) {
    // Context rename: [oldTitle] → [newTitle]. A pre-existing (inert, hand-authored)
    // [newTitle] key merges + dedupes into the renamed one — overwriting would silently
    // drop one of the two value sets.
    const oldKey = contextKey(j.oldTitle)
    const newKey = contextKey(j.newTitle)
    if (!(oldKey in raw)) return null
    const oldV = raw[oldKey]
    const existing = raw[newKey]
    const moved =
      Array.isArray(oldV) && Array.isArray(existing)
        ? [...existing, ...oldV.filter((v) => !existing.includes(v))]
        : oldV
    const out: Raw = {}
    for (const [k, v] of Object.entries(raw)) {
      if (k === oldKey) out[newKey] = moved
      else if (k !== newKey) out[k] = v
    }
    return out
  }
  // Space rename: only the EXACT canonical old title rewrites, deduped if the new
  // title already rode alongside.
  const key = contextKey(contextTitle)
  const arr = raw[key]
  if (!Array.isArray(arr) || !arr.includes(j.oldTitle)) return null
  const next: unknown[] = []
  for (const v of arr) {
    const mapped = v === j.oldTitle ? j.newTitle : v
    if (!next.includes(mapped)) next.push(mapped)
  }
  return { ...raw, [key]: next }
}

/** Sweep every root in the three scopes through `rewrite` (null = untouched), each under
 *  its file lock. The one walk every key/value cascade and unlink shares. */
export async function sweepContextRoots(
  root: string,
  rewrite: (raw: Raw) => Raw | null,
): Promise<{ touched: string[]; skipped: string[] }> {
  const touched: string[] = []
  const skipped: string[] = []

  for (const file of await listMarkdownFiles(root, { skipTopLevel: SKIP_TOP_LEVEL })) {
    await serializeOnFile(file, async () => {
      let content: string
      try {
        content = await readFile(file, 'utf8')
      } catch {
        skipped.push(file)
        return
      }
      const raw = splitFrontmatter(content)
      const next = rewrite(raw)
      if (next === null) return
      const keys = new Set([...Object.keys(raw), ...Object.keys(next)])
      const governed = [...keys].filter(isGovernedContextKey)
      const modeled: Raw = {}
      for (const k of governed) if (k in next) modeled[k] = next[k]
      await atomicWriteFile(
        file,
        mergeFrontmatter(content, modeled, governed, splitEnvelope(content).body),
      )
      touched.push(file)
    })
  }

  const jsonFiles = [
    ...(await listFilesRecursive(root, [AGENDA_SUFFIX.task, AGENDA_SUFFIX.event], {
      skipTopLevel: SKIP_TOP_LEVEL,
    })),
    ...(await listFilesRecursive(contextsDir(root), [SPACE_SIDECAR])),
  ]
  for (const file of jsonFiles) {
    await serializeOnFile(file, async () => {
      const raw = await readJsonObject(file)
      if (!raw) {
        skipped.push(file)
        return
      }
      const next = rewrite(raw)
      if (next === null) return
      await writeJson(file, next)
      touched.push(file)
    })
  }
  return { touched, skipped }
}

/** Run the three-scope cascade for a journal record. `contextTitle` is the owning
 *  Context's CURRENT registry title (the key Space values live under). */
export async function cascadeTitle(
  root: string,
  registry: ContextsRegistry,
  j: RenameJournal,
): Promise<Result<{ touched: string[]; skipped: string[] }>> {
  const def = registry.contexts.find((c) => c.id === j.contextId)
  if (!def) return fail('not-found', 'Unknown Context.', 'contexts')
  // A context rename's own registry title may already read old or new — the key being
  // rewritten comes from the journal, never the registry.
  return ok(await sweepContextRoots(root, (raw) => rewriteRoot(raw, def.title, j)))
}

/** Strip a deleted Context's parenthesized KEY from every root in all three scopes. */
export async function unlinkContextKey(
  root: string,
  contextTitle: string,
): Promise<Result<{ touched: string[]; skipped: string[] }>> {
  const key = contextKey(contextTitle)
  return ok(
    await sweepContextRoots(root, (raw) => {
      if (!(key in raw)) return null
      const next = { ...raw }
      delete next[key]
      return next
    }),
  )
}

/** Strip a deleted Space's exact title as a VALUE under its Context's key in all three
 *  scopes; a key left empty drops with it (no empties). Silent, like today's id-strip. */
export async function unlinkSpaceValue(
  root: string,
  contextTitle: string,
  spaceTitle: string,
): Promise<Result<{ touched: string[]; skipped: string[] }>> {
  const key = contextKey(contextTitle)
  return ok(
    await sweepContextRoots(root, (raw) => {
      const arr = raw[key]
      if (!Array.isArray(arr) || !arr.includes(spaceTitle)) return null
      const kept = arr.filter((v) => v !== spaceTitle)
      const next = { ...raw }
      if (kept.length) next[key] = kept
      else delete next[key]
      return next
    }),
  )
}

/** Finish a rename after its cascade: persist the skip list (the journal survives for
 *  retry) or clear the journal when the sweep completed clean. */
async function settleJournal(root: string, j: RenameJournal, skipped: string[]): Promise<void> {
  if (skipped.length) await writeJournal(root, { ...j, skipped })
  else await clearJournal(root)
}

/** Rename a Context: journal → folder rename → three-scope KEY cascade → registry title
 *  commit → journal settle, in that exact order. A live failure aborts: best-effort
 *  reverse, journal cleared. */
export async function renameContextOp(
  root: string,
  contextId: string,
  newName: string,
): Promise<Result<null>> {
  if (invalidContextTitle(newName)) return fail('invalid-name', `"${newName}" is not valid.`)
  const reg = await readRegistryStrict(root)
  if (!reg.ok) return reg
  const entry = reg.value.contexts.find((c) => c.id === contextId)
  if (!entry) return fail('not-found', 'Unknown Context.', 'contexts')
  if (entry.title === newName) return ok(null)
  // Case-insensitive vs OTHER groups (the filesystem is); a case-only rename of itself passes.
  if (
    reg.value.contexts.some(
      (c) =>
        c.id !== contextId && normalizeContextValue(c.title) === normalizeContextValue(newName),
    )
  )
    return fail('exists', `"${newName}" already exists.`)

  const j: RenameJournal = { contextId, oldTitle: entry.title, newTitle: newName, skipped: [] }
  await writeJournal(root, j)

  const oldDir = join(contextsDir(root), entry.title)
  const newDir = join(contextsDir(root), newName)
  try {
    if (await pathExists(oldDir)) {
      recordWrite(oldDir)
      recordWrite(newDir)
      await rename(oldDir, newDir)
    }
  } catch (e) {
    await clearJournal(root)
    return fail('operation-failed', errText(e), 'contexts')
  }

  const cascade = await cascadeTitle(root, reg.value, j)
  if (!cascade.ok) {
    await clearJournal(root)
    return cascade
  }

  const committed = await mutateRegistryFile(root, (cur) => ({
    contexts: cur.contexts.map((c) => (c.id === contextId ? { ...c, title: newName } : c)),
  }))
  if (!committed.ok) {
    // Live failure = abort: reverse the cascade + folder rename best-effort, clear.
    await cascadeTitle(root, reg.value, { ...j, oldTitle: newName, newTitle: entry.title })
    try {
      if (await pathExists(newDir)) await rename(newDir, oldDir)
    } catch {
      /* best-effort */
    }
    await clearJournal(root)
    return committed
  }

  await settleJournal(root, j, cascade.value.skipped)
  return ok(null)
}

/** Rename a Space: journal → folder rename → three-scope VALUE cascade → journal settle.
 *  No registry commit — Space identity lives in its folder + sidecar id. */
export async function renameSpaceOp(
  root: string,
  spaceId: string,
  newName: string,
): Promise<Result<null>> {
  if (invalidName(newName)) return fail('invalid-name', `"${newName}" is not valid.`)
  const world = await loadContextWorld(root)
  if (!world.ok) return world
  const ref = world.value.spaceById.get(spaceId)
  if (!ref) return fail('not-found', 'Unknown Space.', 'contexts')
  if (ref.title === newName) return ok(null)
  const target = join(contextsDir(root), ref.contextTitle, newName)
  // A case-only rename of ITSELF hits its own folder on a case-insensitive filesystem —
  // that's the rename, not a collision.
  const caseOnly = normalizeContextValue(ref.title) === normalizeContextValue(newName)
  if (!caseOnly && (await pathExists(target))) return fail('exists', `"${newName}" already exists.`)

  const j: RenameJournal = {
    contextId: ref.contextId,
    spaceId,
    oldTitle: ref.title,
    newTitle: newName,
    skipped: [],
  }
  await writeJournal(root, j)
  try {
    recordWrite(ref.dir)
    recordWrite(target)
    await rename(ref.dir, target)
  } catch (e) {
    await clearJournal(root)
    return fail('operation-failed', errText(e), 'contexts')
  }

  const cascade = await cascadeTitle(root, world.value.registry, j)
  if (!cascade.ok) {
    await clearJournal(root)
    return cascade
  }
  await settleJournal(root, j, cascade.value.skipped)
  return ok(null)
}

/** On-open replay of a crashed rename. Re-verifies before touching anything:
 *  the registry/folders must still map the journal's exact old→new record, and a freed,
 *  re-minted old title discards the journal rather than hijacking the new owner.
 *  Idempotent — replaying twice equals once. */
export async function replayPendingRename(root: string): Promise<void> {
  const j = await readJournal(root)
  if (!j) return
  const reg = await readRegistryStrict(root)
  if (!reg.ok) {
    await clearJournal(root)
    return
  }
  const entry = reg.value.contexts.find((c) => c.id === j.contextId)
  if (!entry) {
    await clearJournal(root)
    return
  }

  if (j.spaceId === undefined) {
    const othersOwnOld = reg.value.contexts.some(
      (c) => c.id !== j.contextId && c.title === j.oldTitle,
    )
    if ((entry.title !== j.oldTitle && entry.title !== j.newTitle) || othersOwnOld) {
      await clearJournal(root)
      return
    }
    const oldDir = join(contextsDir(root), j.oldTitle)
    const newDir = join(contextsDir(root), j.newTitle)
    if ((await pathExists(oldDir)) && !(await pathExists(newDir))) await rename(oldDir, newDir)
    const cascade = await cascadeTitle(root, reg.value, j)
    if (!cascade.ok) return
    if (entry.title !== j.newTitle) {
      const committed = await mutateRegistryFile(root, (cur) => ({
        contexts: cur.contexts.map((c) => (c.id === j.contextId ? { ...c, title: j.newTitle } : c)),
      }))
      if (!committed.ok) return
    }
    await settleJournal(root, j, cascade.value.skipped)
    return
  }

  // Space replay: locate the space by id inside its context folder.
  const ctxDir = join(contextsDir(root), entry.title)
  const findTitle = async (title: string): Promise<boolean> => {
    const sc = await readJsonObject(join(ctxDir, title, SPACE_SIDECAR))
    return sc?.id === j.spaceId
  }
  const atOld = await findTitle(j.oldTitle)
  const atNew = await findTitle(j.newTitle)
  if (!atOld && !atNew) {
    await clearJournal(root)
    return
  }
  if (atNew && (await pathExists(join(ctxDir, j.oldTitle)))) {
    // The freed old title was re-minted by another Space — discard, never hijack.
    await clearJournal(root)
    return
  }
  if (atOld) {
    const target = join(ctxDir, j.newTitle)
    if (await pathExists(target)) {
      await clearJournal(root)
      return
    }
    await rename(join(ctxDir, j.oldTitle), target)
  }
  const cascade = await cascadeTitle(root, reg.value, j)
  if (!cascade.ok) return
  await settleJournal(root, j, cascade.value.skipped)
}
