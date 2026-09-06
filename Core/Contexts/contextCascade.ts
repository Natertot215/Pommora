import { basename, join } from '../Paths/posix'
import { normalizeTitle } from '../Connections/connections'
import { contextKey, type ContextsRegistry } from './contexts'
import { contentId } from '../Nexus/identityMark'
import { ok, fail, errText, type Result } from '../Contract/result'
import { mutateRegistryFile, readRegistryStrict } from './contextsRegistry'
import { pathExists, readJsonObject } from '../Files/atomicWrite'
import { renameFrontmatterKey, type KeyCollision } from '../Files/pageFile'
import { recordWrite } from '../Files/writeEcho'
import { machine } from '../Platform/machine'
import { contextsDir, SPACE_SIDECAR } from '../Paths/paths'
import { clearJournal, readJournal, writeJournal, type RenameJournal } from './contextJournal'
import {
  type Raw,
  type Rewrite,
  type RewriteText,
  type SweepResult,
  sweepGovernedRoots,
} from '../Properties/governedSweep'
import { loadContextWorld } from './contextWrite'
import { invalidName, invalidContextTitle } from '../Nexus/util'

/** A Context rename commits its registry LAST, so a tag written mid-cascade still lands under the OLD key while a key already wearing the new title can only be inert or hand-authored — neither list is fresher, so dropping either would silently lose tags. */
const NEITHER_KEY_IS_FRESHER: KeyCollision = 'merge'

function rewriteRoot(raw: Raw, contextTitle: string, j: RenameJournal): Raw | null {
  if (j.spaceId === undefined) {
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

export interface SweepCapture {
  id?: string
  kind: 'page' | 'space'
  values: string[]
}

export type UnlinkOutcome = SweepResult & { captured: SweepCapture[] }

const sweepContextRoots = (
  root: string,
  raw: Rewrite,
  pageText?: RewriteText,
): Promise<SweepResult> =>
  sweepGovernedRoots(
    root,
    { kind: 'nexus' },
    pageText ? { text: pageText, sidecars: raw } : { raw },
  )

function captureRoot(raw: Raw, file: string, values: string[]): SweepCapture {
  const isSpace = basename(file) === SPACE_SIDECAR
  const id = isSpace ? (typeof raw.id === 'string' ? raw.id : undefined) : contentId(raw)
  return { ...(id ? { id } : {}), kind: isSpace ? 'space' : 'page', values }
}

function pageLeg(j: RenameJournal): RewriteText | undefined {
  if (j.spaceId !== undefined) return undefined
  const oldKey = contextKey(j.oldTitle)
  const newKey = contextKey(j.newTitle)
  return (content) => renameFrontmatterKey(content, oldKey, newKey, NEITHER_KEY_IS_FRESHER)
}

async function cascadeTitle(
  root: string,
  registry: ContextsRegistry,
  j: RenameJournal,
): Promise<SweepResult> {
  const def = registry.contexts.find((c) => c.id === j.contextId)
  if (!def) return { touched: [], skipped: [], refused: [] }
  // The key being rewritten comes from the journal, never the registry title, which may already read old or new.
  return sweepContextRoots(root, (raw) => rewriteRoot(raw, def.title, j), pageLeg(j))
}

export async function unlinkContextKey(
  root: string,
  contextTitle: string,
  skipUnder?: string,
): Promise<Result<UnlinkOutcome>> {
  const key = contextKey(contextTitle)
  const skipPrefix = skipUnder ? `${skipUnder}/` : null
  const captured: SweepCapture[] = []
  const swept = await sweepContextRoots(root, (raw, file) => {
    if (skipPrefix && file.startsWith(skipPrefix)) return null
    if (!(key in raw)) return null
    const values = Array.isArray(raw[key])
      ? raw[key].filter((v): v is string => typeof v === 'string')
      : []
    captured.push(captureRoot(raw, file, values))
    const next = { ...raw }
    delete next[key]
    return next
  })
  return ok({ ...swept, captured })
}

export async function unlinkSpaceValue(
  root: string,
  contextTitle: string,
  spaceTitle: string,
): Promise<Result<UnlinkOutcome>> {
  const key = contextKey(contextTitle)
  const captured: SweepCapture[] = []
  const swept = await sweepContextRoots(root, (raw, file) => {
    const arr = raw[key]
    if (!Array.isArray(arr) || !arr.includes(spaceTitle)) return null
    captured.push(captureRoot(raw, file, [spaceTitle]))
    const kept = arr.filter((v) => v !== spaceTitle)
    const next = { ...raw }
    if (kept.length) next[key] = kept
    else delete next[key]
    return next
  })
  return ok({ ...swept, captured })
}

async function settleJournal(root: string, j: RenameJournal, skipped: string[]): Promise<void> {
  if (skipped.length) await writeJournal(root, { ...j, skipped })
  else await clearJournal(root, j)
}

/** Order: journal → folder rename → KEY cascade → registry title commit → journal settle; a live failure aborts with a best-effort reverse and a cleared journal. */
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
  if (
    reg.value.contexts.some(
      (c) => c.id !== contextId && normalizeTitle(c.title) === normalizeTitle(newName),
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
      await machine().rename(oldDir, newDir)
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
    await cascadeTitle(root, reg.value, { ...j, oldTitle: newName, newTitle: entry.title })
    try {
      if (await pathExists(newDir)) await machine().rename(newDir, oldDir)
    } catch {}
    await clearJournal(root, j)
    return committed
  }

  await settleJournal(root, j, cascade.skipped)
  return ok(null)
}

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
  const caseOnly = normalizeTitle(ref.title) === normalizeTitle(newName)
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
    await machine().rename(ref.dir, target)
  } catch (e) {
    await clearJournal(root, j)
    return fail('operation-failed', errText(e))
  }

  const cascade = await cascadeTitle(root, world.value.registry, j)
  await settleJournal(root, j, cascade.skipped)
  return ok(null)
}

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
    if ((await pathExists(oldDir)) && !(await pathExists(newDir)))
      await machine().rename(oldDir, newDir)
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
    await machine().rename(join(ctxDir, j.oldTitle), target)
  }
  const cascade = await cascadeTitle(root, reg.value, j)
  await settleJournal(root, j, cascade.skipped)
}
