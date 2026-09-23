import { readJsonStrict, updateNexusFile } from '../Files/atomicWrite'
import { isMarkdownFile, listEntries } from '../Files/walk'
import { errText, fail, fault, ok, type Result } from '../Contract/result'
import { resolveUnderRoot } from '../Paths/pathSafety'
import { machine } from '../Platform/machine'
import { isPlainObject } from '../Properties/propertyValue'
import { metadataShardPath } from '../Paths/paths'
import { METADATA_DIR_REL, SHARD_FILE_RE } from '../Paths/nexusPaths'
import { basename, join } from '../Paths/posix'
import { metadataShardFile, type PageMeta, type PageMetaPatch } from './schemas'
import { shardOf } from './ids'
import { ensurePageId } from './adopt'
import type { MutateReply } from './mutateRequest'
import { stabilize } from './treeStabilize'
import { findContainerWhere } from './treePatch'
import type { NexusTree } from './tree'

export type ShardRead =
  | { kind: 'ok'; pages: Record<string, PageMeta> }
  | { kind: 'absent' }
  | { kind: 'unreadable' }

const hasFields = (meta: PageMeta | undefined): meta is PageMeta =>
  meta !== undefined && Object.values(meta).some((v) => v !== undefined)

const clean = (pages: Record<string, PageMeta | undefined> | undefined): Record<string, PageMeta> =>
  Object.fromEntries(
    Object.entries(pages ?? {}).filter((e): e is [string, PageMeta] => hasFields(e[1])),
  )

export async function readShard(root: string, shard: string): Promise<ShardRead> {
  const read = await readJsonStrict(metadataShardPath(root, shard))
  if (read.ok) return { kind: 'ok', pages: clean(metadataShardFile.parse(read.value).pages) }
  return read.error.code === 'not-found' ? { kind: 'absent' } : { kind: 'unreadable' }
}

export function withShards(
  held: Record<string, PageMeta>,
  shards: Record<string, Record<string, PageMeta>>,
): Record<string, PageMeta> {
  const next: Record<string, PageMeta> = {}
  for (const [id, meta] of Object.entries(held)) {
    const shard = shardOf(id)
    if (shard === null || !(shard in shards)) next[id] = meta
  }
  for (const [shard, pages] of Object.entries(shards))
    for (const [id, meta] of Object.entries(pages)) if (shardOf(id) === shard) next[id] = meta
  return stabilize(next, held)
}

export async function readPageMetadata(root: string): Promise<Record<string, PageMeta>> {
  const shards = (await listEntries(join(root, METADATA_DIR_REL)))
    .filter((e) => e.kind === 'file' && SHARD_FILE_RE.test(e.name))
    .map((e) => basename(e.name, '.json'))
  const loaded = await Promise.all(
    shards.map(async (shard) => {
      const read = await readShard(root, shard)
      return read.kind === 'ok' ? [[shard, read.pages] as const] : []
    }),
  )
  return withShards({}, Object.fromEntries(loaded.flat()))
}

function patchedEntry(
  cur: Record<string, unknown> | undefined,
  patch: PageMetaPatch,
): Record<string, unknown> | undefined {
  const next: Record<string, unknown> = { ...cur }
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === undefined) delete next[k]
    else next[k] = v
  }
  return hasFields(next as PageMeta) ? next : undefined
}

const rawPages = (file: Record<string, unknown>): Record<string, unknown> =>
  isPlainObject(file.pages) ? file.pages : {}

function byShard(ids: readonly string[]): Map<string, string[]> {
  const out = new Map<string, string[]>()
  for (const id of ids) {
    const shard = shardOf(id)
    if (shard === null) continue
    const group = out.get(shard)
    if (group) group.push(id)
    else out.set(shard, [id])
  }
  return out
}

export async function updatePageMetadata(
  root: string,
  id: string,
  patch: PageMetaPatch,
): Promise<Result<null>> {
  const shard = shardOf(id)
  if (shard === null) return fault('That page has no ID Pommora can file.')
  await machine().mkdir(join(root, METADATA_DIR_REL))
  const written = await updateNexusFile(metadataShardPath(root, shard), (cur) => {
    const pages = { ...rawPages(cur) }
    const raw = pages[id]
    const had = isPlainObject(raw) ? raw : undefined
    const entry = patchedEntry(had, patch)
    if (stabilize(entry, had) === had) return null
    if (entry) pages[id] = entry
    else delete pages[id]
    return { ...cur, pages }
  })
  return written.ok ? ok(null) : written
}

export async function dropPageMetadata(
  root: string,
  ids: readonly string[],
  live: NexusTree | null,
): Promise<void> {
  const held = new Set<string>()
  if (live)
    findContainerWhere(live, (c) => {
      for (const p of c.pages) held.add(p.id)
      return false
    })
  for (const [shard, gone] of byShard(ids.filter((id) => !held.has(id)))) {
    const written = await updateNexusFile(metadataShardPath(root, shard), (cur) => {
      const pages = { ...rawPages(cur) }
      if (!gone.some((id) => id in pages)) return null
      for (const id of gone) delete pages[id]
      return { ...cur, pages }
    }).catch((e) => fault(errText(e)))
    if (!written.ok)
      console.error(`metadata: ${shard} kept dropped entries:`, written.error.message)
  }
}

export async function copyPageMetadata(
  root: string,
  pairs: readonly (readonly [string, string])[],
): Promise<void> {
  const sources = new Map<string, PageMeta>()
  for (const [shard, froms] of byShard(pairs.map(([from]) => from))) {
    const read = await readShard(root, shard)
    for (const from of froms) {
      const entry = read.kind === 'ok' ? read.pages[from] : undefined
      if (entry) sources.set(from, entry)
    }
  }
  for (const [from, to] of pairs) {
    const entry = sources.get(from)
    if (!entry) continue
    const copied = await updatePageMetadata(root, to, entry).catch((e) => fault(errText(e)))
    if (!copied.ok) console.error(`metadata: the copy to ${to} refused:`, copied.error.message)
  }
}

export async function writePageMeta(
  root: string,
  relPath: string,
  patch: PageMetaPatch,
): Promise<MutateReply> {
  if (!isMarkdownFile(relPath)) return fail('not-found', 'Page not found.')
  const resolved = await resolveUnderRoot(root, relPath)
  if (!resolved.ok) return resolved
  const id = await ensurePageId(resolved.value)
  if (!id.ok) return id
  const written = await updatePageMetadata(root, id.value, patch)
  return written.ok ? ok({}) : written
}
