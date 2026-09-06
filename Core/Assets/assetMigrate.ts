// Walks the STORES rather than the directory: nothing cleans up `.nexus/assets/<id>/` when an entity
// is deleted, so a directory-driven copy would carry orphans into a folder shared with Obsidian.
// Idempotent per reference, so a run after a partial failure finishes rather than wedging.

import { parseConnectionText } from '../Connections/connections'
import { ASSETS_DIR_REL, THUMBNAILS_SEGMENT, TRASH_DIR } from '../Locations/nexusPaths'
import { basenameNoMd } from '../Locations/coerce'
import { basename, dirname, extname, join } from '../Locations/posix'
import { NEXUS_CONFIG_FILES, SIDECARS, assetsDir, nexusConfig, relPosix } from '../Locations/paths'
import { machine } from '../Platform/machine'
import { splitEnvelope, mergeFrontmatter, readFrontmatterFields } from '../IO/pageFile'
import {
  readJsonObject,
  rewritePageSerialized,
  rmwJsonStrict,
  readTextOrNull,
} from '../IO/atomicWrite'
import { corpusFiles, listEntries, listFilesRecursive } from '../IO/walk'
import { trashFileFlat } from '../Trash/bundle'
import { readNavigationFile, writeNavigationState } from '../Navigation/navigationFile'
import { readWatchScope, updateCrops, updateSettings } from '../Settings/settings'
import { AMBIGUOUS, buildAssetMap, refreshAssetMap, resolveAssetName } from './assetMap'
import { assetFilePath } from './assetRoots'
import { writeAssetFile } from './assetWrite'

export interface AssetMigration {
  /** Source → the name the file now wears. */
  moved: { from: string; to: string }[]
  rewritten: number
  skipped: { store: string; why: string }[]
  trashed: number
}

/** `owner` is the name the file takes when its own is one Pommora invented; a `write` answering
 *  false is a refusal, not a rewrite. */
interface StoreRef {
  store: string
  owner: string
  read: () => Promise<unknown>
  write: (link: string) => Promise<boolean>
}

/** Only a name Pommora minted is worth replacing — a file the user named keeps it. */
const INVENTED = /^(?:banner|profile)-[a-z0-9]{6,}$/i

/** Latin-1 is a byte-for-byte bijection, so this digests the bytes — the machine's hash takes text. */
const hashOf = (bytes: Uint8Array): string =>
  machine().sha256Hex(new TextDecoder('latin1').decode(bytes))

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
    const file = join(root, rel)
    refs.push({
      store: rel,
      owner: `${basenameNoMd(basename(rel))} Banner`,
      read: async () => readFrontmatterFields((await readTextOrNull(file)) ?? '').banner,
      write: (link) =>
        rewritePageSerialized(file, (content) => {
          const { body } = splitEnvelope(content)
          return mergeFrontmatter(content, { banner: link }, ['banner'], body)
        }),
    })
  }
  return refs
}

/** `.nexus/contexts` included — the corpus walk never enters the folders the app owns. */
async function sidecarsUnder(root: string): Promise<string[]> {
  const out: string[] = []
  const walk = async (dir: string): Promise<void> => {
    for (const entry of await listEntries(dir)) {
      const abs = join(dir, entry.name)
      if (entry.kind === 'dir') {
        if (entry.name === TRASH_DIR || entry.name === 'node_modules') continue
        await walk(abs)
      } else if (SIDECARS.has(entry.name)) out.push(abs)
    }
  }
  await walk(root)
  return out.sort()
}

/** Null when it does not apply: an unset `asset_directory` makes source and destination one place,
 *  and a `.nexus/assets` holding only thumbnails has already migrated. */
export async function migrateAssets(root: string): Promise<AssetMigration | null> {
  const { assetDir } = await readWatchScope(root)
  if (assetDir === ASSETS_DIR_REL) return null

  // From the OLD root: the live map describes the destination and skips thumbnails, so it is the gate.
  const legacy = await buildAssetMap(root, ASSETS_DIR_REL)
  if (!Object.keys(legacy.files).length) return null
  const result: AssetMigration = { moved: [], rewritten: 0, skipped: [], trashed: 0 }
  const landed = new Map<string, string>()

  for (const ref of await collectRefs(root)) {
    const value = await ref.read()
    if (typeof value !== 'string' || !value.trim()) continue
    const named = parseConnectionText(value)
    const hit = named ? resolveAssetName(legacy, named.title) : value
    // Choosing between twins would move the wrong image and trash the other; reporting holds the sweep.
    if (hit === AMBIGUOUS) {
      result.skipped.push({ store: ref.store, why: `more than one file is named ${value}` })
      continue
    }
    if (typeof hit !== 'string' || !hit.startsWith(`${ASSETS_DIR_REL}/`)) continue

    const bytes = await machine().readBytes(join(root, hit))
    if (bytes === null) {
      result.skipped.push({ store: ref.store, why: `${hit} could not be read` })
      continue
    }
    const digest = hashOf(bytes)
    let link = landed.get(digest)
    if (!link) {
      // Byte-identical files collapse: the destination is flat, so name-sharing copies cannot coexist.
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

  // A skipped pass leaves the folder alone — that reference still names the only copy of its file.
  if (!result.skipped.length) result.trashed = await sweepLegacyRoot(root)
  await refreshAssetMap(root)

  const rekeys: [string, string][] = []
  for (const { from, to } of result.moved) {
    const toRel = await assetFilePath(root, to)
    if (toRel) rekeys.push([from, toRel])
  }
  if (rekeys.length) {
    // Best-effort: a corrupt crops.json must not block the change after the originals were trashed.
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

/** Through the trash, so nothing moved is unrecoverable; thumbnails go with their directories. */
async function sweepLegacyRoot(root: string): Promise<number> {
  const dir = assetsDir(root, ASSETS_DIR_REL)
  const files = (await listFilesRecursive(dir)).filter(
    (abs) => !abs.split('/').includes(THUMBNAILS_SEGMENT),
  )
  for (const abs of files) await trashFileFlat(root, abs)
  for (const entry of await listEntries(dir)) {
    if (entry.kind === 'dir') await machine().remove(join(dir, entry.name))
  }
  return files.length
}
