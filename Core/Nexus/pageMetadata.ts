import { readJsonStrict } from '../Files/atomicWrite'
import { listEntries } from '../Files/walk'
import { metadataShardPath } from '../Paths/paths'
import { METADATA_DIR_REL, SHARD_FILE_RE } from '../Paths/nexusPaths'
import { basename, join } from '../Paths/posix'
import { metadataShardFile, type PageMeta } from './schemas'
import { shardOf } from './ids'
import { stabilize } from './treeStabilize'

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
