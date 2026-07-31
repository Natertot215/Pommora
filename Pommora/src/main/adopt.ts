// Open-time write-pass that stamps a real ULID into every entity still lacking a persisted id.
// Idempotent; folder position decides kind — a root child is a Collection, anything nested a Set.

import { readdir, readFile } from 'node:fs/promises'
import type { Dirent } from 'node:fs'
import { join } from 'node:path'
import { contentId, PAGE_ID_KEY } from '@shared/identity'
import { newId } from './ids'
import { atomicWriteFile, readJsonObject, readJsonStrict, pathExists } from './io/atomicWrite'
import { writeSidecar } from './sidecarIO'
import { splitEnvelope, mergeFrontmatter, readFrontmatterFields } from './io/pageFile'
import { asString, asStringArray } from './coerce'
import { shouldSkipDir } from './exclusion'
import { NEXUS_CONFIG_FILES, SIDECAR_FILENAME, nexusConfig } from './paths'

type FolderKind = 'collection' | 'set'

async function listEntries(dir: string): Promise<Dirent[]> {
  try {
    return await readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }
}

/** Stamp a single `.md` page that lacks an id. Returns whether it wrote. Foreign
 *  frontmatter + body survive via the preserving merge. */
async function stampPage(absFile: string): Promise<boolean> {
  const content = await readFile(absFile, 'utf8')
  if (contentId(readFrontmatterFields(content))) return false // already adopted
  const { body } = splitEnvelope(content)
  await atomicWriteFile(
    absFile,
    mergeFrontmatter(content, { [PAGE_ID_KEY]: newId() }, [PAGE_ID_KEY], body),
  )
  return true
}

/** Mint + persist a folder id when it has none, reporting whether it wrote. A sidecar that exists
 *  but couldn't be read is left alone: minting over it would replace the Collection's views,
 *  schema and cache with a bare id, so the folder waits for a later open. */
async function stampFolder(absDir: string, kind: FolderKind): Promise<boolean> {
  const read = await readJsonStrict(join(absDir, SIDECAR_FILENAME[kind]))
  if (!read.ok && read.error.code !== 'not-found') return false
  const existing = read.ok ? read.value : {}
  if (asString(existing.id)) return false

  await writeSidecar(absDir, kind, { ...existing, id: newId() })
  return true
}

/** Stamp `absDir` (as `kind`) then its direct pages, then recurse every non-excluded
 *  subfolder as a Set. Accumulates the write count. */
async function stampTree(
  absDir: string,
  relDir: string,
  kind: FolderKind,
  excluded: string[],
): Promise<number> {
  let count = (await stampFolder(absDir, kind)) ? 1 : 0

  for (const e of await listEntries(absDir)) {
    if (e.isFile() && !e.name.startsWith('_') && e.name.toLowerCase().endsWith('.md')) {
      // An unreadable page, or one whose frontmatter refuses a field write, skips — adoption
      // is idempotent, so the next open retries it.
      if (await stampPage(join(absDir, e.name)).catch(() => false)) count++
    } else if (e.isDirectory()) {
      const childRel = `${relDir}/${e.name}`
      // A folder whose own sidecar is unreadable still adopts its subtree — the children are
      // independent entities, not dependents of their parent's id.
      if (!shouldSkipDir(e.name, childRel, excluded))
        count += await stampTree(join(absDir, e.name), childRel, 'set', excluded)
    }
  }
  return count
}

/**
 * Stamp every un-adopted entity under `root`, returning how many writes happened.
 * Top-level folders are Collections; everything nested is a Set. Agenda singleton
 * folders and excluded folders are left alone.
 */
export async function stampAdopted(root: string): Promise<{ stamped: number }> {
  const settings = (await readJsonObject(nexusConfig(root, NEXUS_CONFIG_FILES.settings))) ?? {}
  const excluded = asStringArray(settings.excluded_folders) ?? []

  let stamped = 0
  for (const e of await listEntries(root)) {
    if (!e.isDirectory()) continue
    if (shouldSkipDir(e.name, e.name, excluded)) continue
    const abs = join(root, e.name)
    // Agenda singletons are identified by their config sidecar (never by name). A folder carrying
    // one is left unclassified rather than adopted as a Collection — its members answer to the
    // agenda kind, not the page one.
    if (
      (await pathExists(join(abs, SIDECAR_FILENAME.taskConfig))) ||
      (await pathExists(join(abs, SIDECAR_FILENAME.eventConfig)))
    ) {
      continue
    }
    // Don't fabricate a Collection from an empty, sidecar-less folder (stray junk). One that
    // already has a sidecar, or holds pages/subfolders, is real content and gets adopted.
    if (
      !(await pathExists(join(abs, SIDECAR_FILENAME.collection))) &&
      (await isEmptyOfContent(abs, e.name, excluded))
    ) {
      continue
    }
    stamped += await stampTree(abs, e.name, 'collection', excluded)
  }
  return { stamped }
}

/** True when a folder holds no adoptable content: no `.md` pages and no non-excluded subfolders. */
async function isEmptyOfContent(
  absDir: string,
  relDir: string,
  excluded: string[],
): Promise<boolean> {
  for (const e of await listEntries(absDir)) {
    if (e.isFile() && !e.name.startsWith('_') && e.name.toLowerCase().endsWith('.md')) return false
    if (e.isDirectory() && !shouldSkipDir(e.name, `${relDir}/${e.name}`, excluded)) return false
  }
  return true
}
