import { landBytes, parseJsonText } from '../../Files/atomicWrite'
import { stableStringify } from '../../Files/stableJson'
import { getLiveTree } from '../../Nexus/liveTree'
import { tileHostAt } from '../../Nexus/watchPatch'
import { tileBodyUnder } from '../../Nexus/watchSettle'
import { dirname, join } from '../../Paths/posix'
import { machine } from '../../Platform/machine'
import { syncStore } from '../../Platform/stores'
import { isPlainObject } from '../../Properties/propertyValue'
import type { Change, ItemRecord } from '../Contract/wire'
import type { SyncHost } from '../Client/call'
import { type Json, isMergedJson, mergeDepthFor, mergeKeys } from './jsonMerge'

const RECENCY_WINDOW_MS = 2_000

export function newerSide(
  localMtimeMs: number,
  localDeviceId: string,
  remoteMtimeMs: number,
  remoteDeviceId: string,
): 'local' | 'remote' {
  const gap = localMtimeMs - remoteMtimeMs
  if (gap > RECENCY_WINDOW_MS) return 'local'
  if (gap < -RECENCY_WINDOW_MS) return 'remote'
  return localDeviceId < remoteDeviceId ? 'local' : 'remote'
}

const utf8 = (text: string): Uint8Array => new TextEncoder().encode(text)

function parseObject(bytes: Uint8Array): Json | null {
  try {
    const value = parseJsonText(new TextDecoder().decode(bytes))
    return isPlainObject(value) ? value : null
  } catch {
    return null
  }
}

export function recordOf(change: Change): ItemRecord {
  if (!change.record) throw new Error(`Change ${change.seq} on ${change.path} carries no record.`)
  return change.record
}

async function bytesToLand(
  localDeviceId: string,
  abs: string,
  change: Change,
  record: ItemRecord,
  plaintext: Uint8Array,
): Promise<Uint8Array> {
  if (!isMergedJson(change.path)) return plaintext
  const local = await machine().readBytes(abs)
  const base = syncStore()?.readBase(change.path)?.baseBytes ?? null
  if (!local || !base) return plaintext
  if (machine().sha256Hex(local) === machine().sha256Hex(base)) return plaintext
  const b = parseObject(base)
  const l = parseObject(local)
  const r = parseObject(plaintext)
  if (!b || !l || !r) return plaintext
  const localMtimeMs = (await machine().stat(abs))?.mtimeMs ?? 0
  const merged = mergeKeys(b, l, r, mergeDepthFor(change.path), () =>
    newerSide(localMtimeMs, localDeviceId, record.mtimeMs, change.device),
  )
  return utf8(`${stableStringify(merged)}\n`)
}

function announceTile(host: SyncHost, rel: string): void {
  if (!tileBodyUnder(rel.split('/'), rel)) return
  const tree = getLiveTree()
  const ref = tree && tileHostAt(tree, rel)
  if (ref) host.push('tiles:changed', ref)
}

export async function landWrite(
  host: SyncHost,
  root: string,
  change: Change,
  plaintext: Uint8Array,
): Promise<void> {
  const record = recordOf(change)
  const abs = join(root, change.path)
  await machine().lock(abs, async () => {
    await machine().mkdir(dirname(abs))
    const bytes = await bytesToLand(host.device.id, abs, change, record, plaintext)
    await landBytes(abs, bytes, bytes === plaintext ? record.mtimeMs : Date.now())
    syncStore()?.upsertBase({
      path: change.path,
      mtimeMs: record.mtimeMs,
      size: plaintext.length,
      hash: machine().sha256Hex(plaintext),
      blobSha: record.sha256,
      version: change.seq,
      baseBytes: isMergedJson(change.path) ? plaintext : null,
    })
    announceTile(host, change.path)
  })
}

export async function landDelete(root: string, change: Change): Promise<void> {
  const abs = join(root, change.path)
  await machine().lock(abs, async () => {
    if (await machine().stat(abs)) {
      await machine().remove(abs)
      const parent = dirname(abs)
      if (parent !== root && (await machine().readDir(parent)).length === 0)
        await machine().remove(parent)
    }
    syncStore()?.deleteBase(change.path)
  })
}

export async function landRename(root: string, change: Change): Promise<void> {
  const fromRel = change.from
  if (fromRel === undefined)
    throw new Error(`Rename ${change.seq} to ${change.path} carries no source path.`)
  const from = join(root, fromRel)
  const to = join(root, change.path)
  await machine().lock(from, async () => {
    if (await machine().stat(from)) {
      await machine().mkdir(dirname(to))
      await machine().rename(from, to)
    }
    const store = syncStore()
    if (!store) return
    const prefix = `${fromRel}/`
    for (const row of store.readAllBases())
      if (row.path.startsWith(prefix))
        store.renameBase(row.path, `${change.path}/${row.path.slice(prefix.length)}`)
    store.renameBase(fromRel, change.path)
    const moved = store.readBase(change.path)
    if (moved) store.upsertBase({ ...moved, version: change.seq })
  })
}
