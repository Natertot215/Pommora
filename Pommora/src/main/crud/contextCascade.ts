// The title cascade behind Context/Space renames, plus the rename ops and the on-open journal
// replay. A Context rename rewrites the parenthesized KEY in every member root; a Space rename
// rewrites its exact canonical title as a VALUE under its Context's key (near-miss forms stay —
// the reconcile owns those). Scopes: every `.md` frontmatter and every `_space.json` root — each
// under its own file lock.

import { rename } from 'node:fs/promises'
import { basename, join, sep } from 'node:path'
import { contextKey, normalizeContextValue, type ContextsRegistry } from '@shared/contexts'
import { contentId } from '@shared/identity'
import { ok, fail, errText, type Result } from '@shared/result'
import { mutateRegistryFile, readRegistryStrict } from '../contextsRegistry'
import { pathExists, readJsonObject } from '../io/atomicWrite'
import { renameFrontmatterKey, type KeyCollision } from '../io/pageFile'
import { recordWrite } from '../io/writeEcho'
import { contextsDir, SPACE_SIDECAR } from '../paths'
import { clearJournal, readJournal, writeJournal, type RenameJournal } from './contextJournal'
import {
  type Raw,
  type SweepOptions,
  type SweepResult as GovernedSweepResult,
  sweepGovernedRoots,
} from './governedSweep'
import { loadContextWorld } from './contextWrite'
import { invalidName, invalidContextTitle } from './util'

/** A Context rename commits its registry LAST, so a tag written during the cascade still lands under
 *  the OLD key and a key already wearing the new title can only be inert or hand-authored. Neither
 *  list is the fresher of the two, and dropping either would silently lose tags. */
const NEITHER_KEY_IS_FRESHER: KeyCollision = 'merge'

/** The key/value rewrite one raw root undergoes, or null when untouched. */
function rewriteRoot(raw: Raw, contextTitle: string, j: RenameJournal): Raw | null {
  if (j.spaceId === undefined) {
    // Context rename: [oldTitle] → [newTitle], merging into a key already wearing the new title
    // for the reason NEITHER_KEY_IS_FRESHER states.
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

/** What one swept root gave up: its identity (absent = unrestorable, stated honestly) and
 *  the values the rewrite removed, discriminated by which id key the root carries. */
export interface SweepCapture {
  id?: string
  kind: 'page' | 'space'
  values: string[]
}

export type SweepResult = Omit<GovernedSweepResult<never>, 'captured'>

/** What an unlink sweep returns: the sweep's own truth plus what each stripped root gave up. */
export type UnlinkOutcome = SweepResult & { captured: SweepCapture[] }

/** Clearing a value IS a content edit — the page no longer holds what it held — so an unlink
 *  re-dates every root it strips, exactly as clearing a property value does. A key-only rename
 *  does not: the relation is unchanged, only its spelling. */
const STAMP_ON_CLEAR = { stamp: true }

/** Sweep every context-bearing root through `rewrite` (null = untouched). The scope is the one
 *  fact that makes this the CONTEXT sweep: a tag is legal on any page and on a Space sidecar. */
export async function sweepContextRoots(
  root: string,
  rewrite: (raw: Raw, file: string) => Raw | null,
  opts: SweepOptions = {},
): Promise<SweepResult> {
  const { touched, skipped, refused } = await sweepGovernedRoots<never>(
    root,
    { kind: 'nexus' },
    (raw, file) => {
      const next = rewrite(raw, file)
      return next === null ? null : { next }
    },
    opts,
  )
  return { touched, skipped, refused }
}

/** A capture for one root the unlink is about to strip. The id comes from whichever id key
 *  the root carries — a root with the key but no id captures id-less: honest, unrestorable. */
function captureRoot(raw: Raw, file: string, values: string[]): SweepCapture {
  const isSpace = basename(file) === SPACE_SIDECAR
  const id = isSpace ? (typeof raw.id === 'string' ? raw.id : undefined) : contentId(raw)
  return { ...(id ? { id } : {}), kind: isSpace ? 'space' : 'page', values }
}

/** How the cascade rewrites a PAGE. A Context rename moves a KEY, and a key's position and the
 *  comment above it live only in the file's own text. A Space rename moves VALUES under a key that
 *  stays where it is, which the raw decision already says exactly. */
function pageLeg(j: RenameJournal): SweepOptions {
  if (j.spaceId !== undefined) return {}
  const oldKey = contextKey(j.oldTitle)
  const newKey = contextKey(j.newTitle)
  return {
    rewriteText: (content) => renameFrontmatterKey(content, oldKey, newKey, NEITHER_KEY_IS_FRESHER),
  }
}

/** Run the title cascade for a journal record. `contextTitle` is the owning
 *  Context's CURRENT registry title (the key Space values live under). Every caller
 *  resolves the def before journaling, so an unknown context sweeps nothing. */
export async function cascadeTitle(
  root: string,
  registry: ContextsRegistry,
  j: RenameJournal,
): Promise<SweepResult> {
  const def = registry.contexts.find((c) => c.id === j.contextId)
  if (!def) return { touched: [], skipped: [], refused: [] }
  // A context rename's own registry title may already read old or new — the key being
  // rewritten comes from the journal, never the registry.
  return sweepContextRoots(root, (raw) => rewriteRoot(raw, def.title, j), pageLeg(j))
}

/** Strip a deleted Context's parenthesized KEY from every context-bearing root. A root under
 *  `skipUnder` is a passenger — leaving with its owner, its key still true inside the subtree
 *  the same operation ships to trash — so the delete arm passes its resolved target and the
 *  sweep leaves the subtree intact. The rename cascade never skips: its subtree stays live. */
export async function unlinkContextKey(
  root: string,
  contextTitle: string,
  skipUnder?: string,
): Promise<Result<UnlinkOutcome>> {
  const key = contextKey(contextTitle)
  const skipPrefix = skipUnder ? skipUnder + sep : null
  const captured: SweepCapture[] = []
  const swept = await sweepContextRoots(
    root,
    (raw, file) => {
      if (skipPrefix && file.startsWith(skipPrefix)) return null
      if (!(key in raw)) return null
      const values = Array.isArray(raw[key])
        ? raw[key].filter((v): v is string => typeof v === 'string')
        : []
      captured.push(captureRoot(raw, file, values))
      const next = { ...raw }
      delete next[key]
      return next
    },
    STAMP_ON_CLEAR,
  )
  return ok({ ...swept, captured })
}

/** Strip a deleted Space's exact title as a VALUE under its Context's key in every
 *  context-bearing root; a key left empty drops with it (no empties). Silent, like the id-strip. */
export async function unlinkSpaceValue(
  root: string,
  contextTitle: string,
  spaceTitle: string,
): Promise<Result<UnlinkOutcome>> {
  const key = contextKey(contextTitle)
  const captured: SweepCapture[] = []
  const swept = await sweepContextRoots(
    root,
    (raw, file) => {
      const arr = raw[key]
      if (!Array.isArray(arr) || !arr.includes(spaceTitle)) return null
      captured.push(captureRoot(raw, file, [spaceTitle]))
      const kept = arr.filter((v) => v !== spaceTitle)
      const next = { ...raw }
      if (kept.length) next[key] = kept
      else delete next[key]
      return next
    },
    STAMP_ON_CLEAR,
  )
  return ok({ ...swept, captured })
}

/** Finish a rename after its cascade: persist the skip list (the journal survives for
 *  retry) or clear the journal when the sweep completed clean. */
async function settleJournal(root: string, j: RenameJournal, skipped: string[]): Promise<void> {
  if (skipped.length) await writeJournal(root, { ...j, skipped })
  else await clearJournal(root, j)
}

/** Rename a Context: journal → folder rename → KEY cascade → registry title
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
  if (!entry) return fail('not-found', 'Unknown Context.')
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
    await clearJournal(root, j)
    return fail('operation-failed', errText(e))
  }

  const cascade = await cascadeTitle(root, reg.value, j)

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
    await clearJournal(root, j)
    return committed
  }

  await settleJournal(root, j, cascade.skipped)
  return ok(null)
}

/** Rename a Space: journal → folder rename → VALUE cascade → journal settle.
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
  if (!ref) return fail('not-found', 'Unknown Space.')
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
    await clearJournal(root, j)
    return fail('operation-failed', errText(e))
  }

  const cascade = await cascadeTitle(root, world.value.registry, j)
  await settleJournal(root, j, cascade.skipped)
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
    await clearJournal(root, j)
    return
  }
  const entry = reg.value.contexts.find((c) => c.id === j.contextId)
  if (!entry) {
    await clearJournal(root, j)
    return
  }

  if (j.spaceId === undefined) {
    const othersOwnOld = reg.value.contexts.some(
      (c) => c.id !== j.contextId && c.title === j.oldTitle,
    )
    if ((entry.title !== j.oldTitle && entry.title !== j.newTitle) || othersOwnOld) {
      await clearJournal(root, j)
      return
    }
    const oldDir = join(contextsDir(root), j.oldTitle)
    const newDir = join(contextsDir(root), j.newTitle)
    if ((await pathExists(oldDir)) && !(await pathExists(newDir))) await rename(oldDir, newDir)
    const cascade = await cascadeTitle(root, reg.value, j)
    if (entry.title !== j.newTitle) {
      const committed = await mutateRegistryFile(root, (cur) => ({
        contexts: cur.contexts.map((c) => (c.id === j.contextId ? { ...c, title: j.newTitle } : c)),
      }))
      if (!committed.ok) return
    }
    await settleJournal(root, j, cascade.skipped)
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
    await clearJournal(root, j)
    return
  }
  if (atNew && (await pathExists(join(ctxDir, j.oldTitle)))) {
    // The freed old title was re-minted by another Space — discard, never hijack.
    await clearJournal(root, j)
    return
  }
  if (atOld) {
    const target = join(ctxDir, j.newTitle)
    if (await pathExists(target)) {
      await clearJournal(root, j)
      return
    }
    await rename(join(ctxDir, j.oldTitle), target)
  }
  const cascade = await cascadeTitle(root, reg.value, j)
  await settleJournal(root, j, cascade.skipped)
}
