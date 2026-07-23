// The one-time tierN → registry migration. Idempotent and resumable: `schemaVersion < 2`
// alone re-triggers (never on-disk shape, which earlier steps consume), every step re-runs
// safely (folder moves skip the already-moved, rewrites skip the already-bracketed), and
// the version bump commits LAST — only after a fully-clean run — so a crash or an
// unreadable sidecar re-runs the remainder on the next open instead of sealing a partial
// state. No verification re-scan gates the bump — a straggler MEMBER file isn't data loss:
// legacy tierN stays read-recognized and heals on that file's next governed write.

import { mkdir, readdir, rename, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { contextKey, seededRegistry } from '@shared/contexts'
import { LEGACY_CHIP_COLOR_MAP } from '@shared/types'
import { mutateJson, pathExists, readJsonObject, readJsonStrict, writeJson } from './io/atomicWrite'
import { listFilesRecursive } from './io/walk'
import { serializeOnFile } from './io/fileLock'
import { readLabels } from './readNexus'
import { loadContextWorld, reconcileWriteRoot } from './crud/contextWrite'
import { sweepContextRoots } from './crud/contextCascade'
import {
  contextTierDir,
  contextsDir,
  contextsRegistryFile,
  NEXUS_CONFIG_FILES,
  nexusConfig,
  SIDECAR_FILENAME,
  SPACE_SIDECAR,
} from './paths'

/** The nexus.json schemaVersion at which the Contexts registry model is in force. */
export const CONTEXTS_SCHEMA_VERSION = 2

const TIERS = [
  { level: 1, id: '_tier1', dir: 'areas', sidecar: SIDECAR_FILENAME.area },
  { level: 2, id: '_tier2', dir: 'topics', sidecar: SIDECAR_FILENAME.topic },
  { level: 3, id: '_tier3', dir: 'projects', sidecar: SIDECAR_FILENAME.project },
] as const

export async function migrateContexts(root: string): Promise<void> {
  const identityPath = nexusConfig(root, NEXUS_CONFIG_FILES.identity)
  const identity = await readJsonObject(identityPath)
  if (!identity) return // raw / un-adopted nexus — nothing versioned to migrate
  const version = typeof identity.schemaVersion === 'number' ? identity.schemaVersion : 1
  if (version >= CONTEXTS_SCHEMA_VERSION) return

  /** An unreadable file left something untransformed — withhold the bump so the next open retries. */
  let incomplete = false

  const settings = (await readJsonObject(nexusConfig(root, NEXUS_CONFIG_FILES.settings))) ?? {}
  const labels = readLabels(settings.labels)

  // 1. Mint the registry (reserved ids, titles from the tier labels) — kept as-is when a
  //    prior crashed run already wrote it.
  if (!(await pathExists(contextsRegistryFile(root)))) {
    await writeJson(contextsRegistryFile(root), seededRegistry(labels))
  }
  const registryRaw = await readJsonObject(contextsRegistryFile(root))
  const titleById = new Map<string, string>()
  if (registryRaw && Array.isArray(registryRaw.contexts)) {
    for (const c of registryRaw.contexts as { id?: unknown; title?: unknown }[]) {
      if (typeof c.id === 'string' && typeof c.title === 'string') titleById.set(c.id, c.title)
    }
  }

  // 2. Move each tier's member folders under `.nexus/contexts/<Context Title>/`
  //    (already-moved entries skip; an emptied tier dir is removed).
  for (const t of TIERS) {
    const src = contextTierDir(root, t.dir)
    const destParent = join(contextsDir(root), titleById.get(t.id) ?? t.dir)
    if (!(await pathExists(src))) continue
    await mkdir(destParent, { recursive: true })
    for (const e of await readdir(src, { withFileTypes: true })) {
      if (!e.isDirectory()) continue
      const dest = join(destParent, e.name)
      if (await pathExists(dest)) continue
      await rename(join(src, e.name), dest)
    }
    if ((await readdir(src)).length === 0) await rm(src, { recursive: true })
  }

  // 3. Transform each moved folder's tier sidecar into `_space.json`: the `tier` field
  //    dies, an Area color maps onto its chip solid (`accent`/unknown → unset).
  for (const t of TIERS) {
    const parent = join(contextsDir(root), titleById.get(t.id) ?? t.dir)
    if (!(await pathExists(parent))) continue
    for (const e of await readdir(parent, { withFileTypes: true })) {
      if (!e.isDirectory()) continue
      const oldSidecar = join(parent, e.name, t.sidecar)
      const newSidecar = join(parent, e.name, SPACE_SIDECAR)
      const read = await readJsonStrict(oldSidecar)
      if (!read.ok) {
        // Unreadable ≠ absent: the sidecar is the Space's only identity, so leave it in
        // place for a retry rather than fall through to the delete below.
        if (read.error.code !== 'not-found') incomplete = true
        continue
      }
      if (!(await pathExists(newSidecar))) {
        const next = { ...read.value }
        delete next.tier
        const mapped =
          typeof next.color === 'string' ? LEGACY_CHIP_COLOR_MAP[next.color] : undefined
        if (mapped) next.color = mapped
        else delete next.color
        await writeJson(newSidecar, next)
      }
      await rm(oldSidecar, { force: true })
    }
  }

  // 4. Rewrite every member file's tierN ULID arrays into bracketed title keys, resolved
  //    through the moved sidecars; unresolvable ids drop (their count is diagnostics only).
  const world = await loadContextWorld(root)
  if (!world.ok) incomplete = true
  if (world.ok) {
    let droppedIds = 0
    await sweepContextRoots(root, (raw) => {
      for (const t of TIERS) {
        const arr = raw[`tier${t.level}`]
        if (!Array.isArray(arr)) continue
        droppedIds += arr.filter(
          (v) => typeof v !== 'string' || !world.value.spaceById.has(v),
        ).length
      }
      const { root: next, changed } = reconcileWriteRoot(world.value, raw)
      return changed ? next : null
    })
    if (droppedIds > 0)
      console.warn(`contexts migration: dropped ${droppedIds} unresolvable tier ids`)
  }

  // 5. Tier orders generalize into the per-context `space_orders` map.
  const statePath = nexusConfig(root, NEXUS_CONFIG_FILES.state)
  if (await pathExists(statePath)) {
    await serializeOnFile(statePath, () =>
      mutateJson<Record<string, unknown>>(
        statePath,
        () => ({}),
        (state) => {
          const orders =
            state.space_orders != null && typeof state.space_orders === 'object'
              ? { ...(state.space_orders as Record<string, unknown>) }
              : {}
          const next = { ...state }
          for (const [legacyKey, id] of [
            ['area_order', '_tier1'],
            ['topic_order', '_tier2'],
            ['project_order', '_tier3'],
          ] as const) {
            if (Array.isArray(next[legacyKey]) && !(id in orders)) orders[id] = next[legacyKey]
            delete next[legacyKey]
          }
          return { ...next, space_orders: orders }
        },
      ),
    )
  }

  // 6. Every saved view's currently-VISIBLE tier columns record into its property_order —
  //    under default-OFF, an unrecorded-but-shown column would silently vanish from every
  //    existing view (the never-visually-changes rule applies to the migration itself).
  const sidecars = await listFilesRecursive(
    root,
    [SIDECAR_FILENAME.collection, SIDECAR_FILENAME.set],
    { skipTopLevel: ['.nexus', '.trash'] },
  )
  for (const file of sidecars) {
    await serializeOnFile(file, async () => {
      const raw = await readJsonObject(file)
      if (!raw || !Array.isArray(raw.views)) return
      let changed = false
      const views = raw.views.map((v) => {
        if (v == null || typeof v !== 'object') return v
        const view = v as Record<string, unknown>
        const hidden = Array.isArray(view.hidden_properties) ? view.hidden_properties : []
        const order = Array.isArray(view.property_order) ? [...view.property_order] : []
        for (const t of TIERS) {
          if (!hidden.includes(t.id) && !order.includes(t.id)) {
            order.push(t.id)
            changed = true
          }
        }
        return changed ? { ...view, property_order: order } : view
      })
      if (changed) await writeJson(file, { ...raw, views })
    })
  }

  // 7. Version bump LAST, and only after a fully-clean run — an incomplete pass (or a crash
  //    anywhere above) leaves the version alone so the next open re-runs the remainder.
  if (incomplete) {
    console.warn('contexts migration: incomplete (unreadable file) — will retry on next open')
    return
  }
  await serializeOnFile(identityPath, () =>
    mutateJson<Record<string, unknown>>(
      identityPath,
      () => identity,
      (cur) => ({
        ...cur,
        schemaVersion: CONTEXTS_SCHEMA_VERSION,
      }),
    ),
  )
}
