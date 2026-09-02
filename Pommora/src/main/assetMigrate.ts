// Moves what Pommora minted under `.nexus/assets` into the user-configured directory, once.
//
// Walks the STORES rather than the directory: nothing cleans up `.nexus/assets/<id>/` when an
// entity is deleted, so a directory-driven copy would carry orphans into a folder the user
// shares with Obsidian. Only a referenced file is copied and renamed; once every reference
// points elsewhere, everything left under `.nexus/assets` is spent and swept.
//
// Idempotent per reference, not per pass: a reference still naming a file under `.nexus/assets`
// migrates, one already elsewhere is skipped — so a run after a partial failure finishes the
// job instead of wedging on counts that have legitimately moved.

import { basename, dirname, extname, join } from 'node:path'
import { readFile, rm } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { parseConnectionText } from '@shared/connections'
import { ASSETS_DIR_REL, TRASH_DIR } from '@shared/nexusPaths'
import { splitEnvelope, mergeFrontmatter, readFrontmatterFields } from './IO/pageFile'
import {
  readJsonObject,
  rewritePageSerialized,
  rmwJsonStrict,
  trashFileFlat,
} from './IO/atomicWrite'
import { evictThumbnails } from './IO/thumbnails'
import { readNavigationFile, writeNavigationState } from './IO/navigationFile'
import { AMBIGUOUS, buildAssetMap, refreshAssetMap, resolveAssetName } from './assetMap'
import { writeAssetFile } from './assetWrite'
import { corpusFiles, listEntries, listFilesRecursive } from './IO/walk'
import { NEXUS_CONFIG_FILES, SIDECARS, assetsDir, nexusConfig, relPosix } from './paths'
import { readWatchScope, updateCrops, updateSettings } from './settings'
import { assetFilePath } from './assetRoots'
import { basenameNoMd } from './coerce'

export interface AssetMigration {
  /** Every distinct file moved, source → the name it now wears. */
  moved: { from: string; to: string }[]
  rewritten: number
  /** A reference left alone, and why. */
  skipped: { store: string; why: string }[]
  /** Files swept out of `.nexus/assets` once nothing referenced them. */
  trashed: number
}

/** One stored image value, with the plumbing that reads and rewrites it. The pass is identical
 *  for all six stores; only how the value is fetched and committed differs. */
interface StoreRef {
  store: string
  /** The name the file takes when its own is one Pommora invented. */
  owner: string
  read: () => Promise<unknown>
  /** False means the store refused — not a rewrite. */
  write: (link: string) => Promise<boolean>
}

/** A name Pommora minted rather than one a file arrived with. Those are the only names worth
 *  replacing — a file the user named keeps it, even when several entities share it. */
const INVENTED = /^(?:banner|profile)-[a-z0-9]{6,}$/i

const hashOf = (bytes: Buffer): string => createHash('md5').update(bytes).digest('hex')

async function collectRefs(root: string): Promise<StoreRef[]> {
  const refs: StoreRef[] = []
  const homeFile = nexusConfig(root, NEXUS_CONFIG_FILES.homepage)
  const settingsFile = nexusConfig(root, NEXUS_CONFIG_FILES.settings)

  // Nexus-level singletons lead, so a file several owners share takes the nexus's own name.
  refs.push({
    store: 'navigation.json',
    owner: 'nexus-banner',
    read: async () => (await readNavigationFile(root)).banner,
    write: async (link) => {
      await writeNavigationState(root, { banner: link })
      return true
    },
  })
  refs.push({
    store: 'settings.json',
    owner: 'nexus-icon',
    read: async () => (await readJsonObject(settingsFile))?.profile_image,
    write: async (link) => {
      await updateSettings(root, (cur) => ({ ...cur, profile_image: link }))
      return true
    },
  })
  refs.push({
    store: 'homepage.json',
    owner: 'Homepage Banner',
    read: async () => (await readJsonObject(homeFile))?.banner,
    write: async (link) =>
      (
        await rmwJsonStrict(
          homeFile,
          (cur) => ({ ...cur, banner: link }),
          () => ({}),
        )
      ).ok,
  })
  for (const file of await sidecarsUnder(root)) {
    refs.push({
      store: relPosix(root, file),
      owner: `${basename(dirname(file))} Banner`,
      read: async () => (await readJsonObject(file))?.banner,
      write: async (link) => (await rmwJsonStrict(file, (cur) => ({ ...cur, banner: link }))).ok,
    })
  }

  const scope = await readWatchScope(root)
  for (const rel of (await corpusFiles(root, scope)).sort()) {
    const file = join(root, ...rel.split('/'))
    refs.push({
      store: rel,
      owner: `${basenameNoMd(basename(rel))} Banner`,
      read: async () => readFrontmatterFields(await readFile(file, 'utf8').catch(() => '')).banner,
      write: (link) =>
        rewritePageSerialized(file, (content) => {
          const { body } = splitEnvelope(content)
          return mergeFrontmatter(content, { banner: link }, ['banner'], body)
        }),
    })
  }
  return refs
}

/** Every sidecar in the nexus, `.nexus/contexts` included — a Space's banner is a store like any
 *  other, and the corpus walk deliberately never enters the folders the app owns. */
async function sidecarsUnder(root: string): Promise<string[]> {
  const out: string[] = []
  const walk = async (dir: string): Promise<void> => {
    for (const entry of await listEntries(dir)) {
      const abs = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === TRASH_DIR || entry.name === 'node_modules') continue
        await walk(abs)
      } else if (SIDECARS.has(entry.name)) out.push(abs)
    }
  }
  await walk(root)
  return out.sort()
}

/** Migrate every `.nexus/assets` reference into the configured directory, then empty the folder.
 *  Answers null when it does not apply, which is the ordinary case: an unset `asset_directory`
 *  makes source and destination the same place, and a `.nexus/assets` holding nothing but
 *  thumbnails has already been migrated. The listing that decides is one readdir, so this stays
 *  cheap enough to ask at every open — and it is what keeps the pass from re-reading every page
 *  in the nexus, or from sweeping thumbnails that regenerate between launches. */
export async function migrateAssets(root: string): Promise<AssetMigration | null> {
  const { assetDir } = await readWatchScope(root)
  if (assetDir === ASSETS_DIR_REL) return null

  // Taken from the OLD root: the live map already describes the destination, so it cannot answer
  // for a file that has not moved yet. It skips thumbnails, which is what makes it the gate.
  const legacy = await buildAssetMap(root, ASSETS_DIR_REL)
  if (!Object.keys(legacy.files).length) return null
  const result: AssetMigration = { moved: [], rewritten: 0, skipped: [], trashed: 0 }
  const landed = new Map<string, string>()

  for (const ref of await collectRefs(root)) {
    const value = await ref.read()
    if (typeof value !== 'string' || !value.trim()) continue
    const named = parseConnectionText(value)
    const hit = named ? resolveAssetName(legacy, named.title) : value
    // A name several files answer to names none of them, and choosing one would move the wrong
    // image and trash the other. Reported rather than dropped, which is what holds the sweep.
    if (hit === AMBIGUOUS) {
      result.skipped.push({ store: ref.store, why: `more than one file is named ${value}` })
      continue
    }
    // Anything not naming a file under the OLD root has already moved, or names nothing here.
    if (typeof hit !== 'string' || !hit.startsWith(`${ASSETS_DIR_REL}/`)) continue

    let bytes: Buffer
    try {
      bytes = await readFile(join(root, hit))
    } catch {
      result.skipped.push({ store: ref.store, why: `${hit} could not be read` })
      continue
    }
    const digest = hashOf(bytes)
    let link = landed.get(digest)
    if (!link) {
      // Byte-identical files collapse to one: the destination is flat, and seven files sharing a
      // name could not coexist there in any case.
      const base = basename(hit)
      const ext = extname(base)
      const name = INVENTED.test(basename(base, ext)) ? `${ref.owner}${ext}` : base
      const written = await writeAssetFile(root, assetDir, name, bytes)
      if (!written.ok) {
        result.skipped.push({ store: ref.store, why: written.error.message })
        continue
      }
      link = written.value
      landed.set(digest, link)
      result.moved.push({ from: hit, to: link })
    }
    try {
      if (await ref.write(link)) result.rewritten++
      else result.skipped.push({ store: ref.store, why: 'the store refused its write' })
    } catch (e) {
      result.skipped.push({ store: ref.store, why: `write failed: ${String(e)}` })
    }
  }

  // Only once every reference has moved is what remains spent — migrated originals, orphans no
  // store ever released, and the thumbnails, which regenerate on use. A pass that skipped
  // anything leaves the folder alone: the file a skipped reference still names is the only copy
  // of it, and a later run finishes the job rather than finding it in the trash.
  if (!result.skipped.length) {
    await evictThumbnails(root, [])
    result.trashed = await sweepLegacyRoot(root)
  }
  await refreshAssetMap(root)

  // A crop keys by the image's path, so a moved file's framing follows it to the new root.
  const rekeys: [string, string][] = []
  for (const { from, to } of result.moved) {
    const toRel = await assetFilePath(root, to)
    if (toRel) rekeys.push([from, toRel])
  }
  if (rekeys.length) {
    // Best-effort: a corrupt crops.json must not block open after the originals were trashed.
    await updateCrops(root, (b) => {
      const next = { ...b }
      for (const [fromRel, toRel] of rekeys) {
        if (next[fromRel] === undefined) continue
        next[toRel] = next[fromRel]
        delete next[fromRel]
      }
      return next
    }).catch(() => {})
  }
  return result
}

/** Empty `.nexus/assets` through the trash, so nothing this pass moved is unrecoverable. */
async function sweepLegacyRoot(root: string): Promise<number> {
  const dir = assetsDir(root, ASSETS_DIR_REL)
  const files = await listFilesRecursive(dir)
  for (const abs of files) await trashFileFlat(root, abs)
  for (const entry of await listEntries(dir)) {
    if (entry.isDirectory())
      await rm(join(dir, entry.name), { recursive: true, force: true }).catch(() => {})
  }
  return files.length
}
