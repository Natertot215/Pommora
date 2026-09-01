// What a returning artifact missed while it sat in the trash.
//
// Every nexus-wide sweep is tree-derived, and the tree excludes `.trash` — deliberately, because
// nothing may rewrite trashed content. So a bundle is frozen at the moment of its delete while
// the world moves on: a property deleted or unassigned since, a Context erased since, a Space
// gone. Replaying that content verbatim would reintroduce governed keys nothing stands behind,
// and the danger is not the dormant key itself — it is that a later property or Context taking
// that name inherits values the page never legitimately held.
//
// So the returning content is reconciled against the CURRENT world before it lands: a governed
// key survives only if what it names still exists, and whether a value stands is asked the way
// the destination asks it.

import { contextKey, normalizeContextValue, parseContextKey } from '@shared/contexts'
import type { PropertyDefinition } from '@shared/properties'
import { encodeValue } from '@shared/propertyValue'
import type { NexusTree } from '@shared/types'
import { contextTagStands, propertyValueStands } from './standing'
import { readJsonObject, rewritePageSerialized, writeJson } from '../IO/atomicWrite'
import { readRegistry } from '../IO/propertiesRegistry'
import { serializeOnFile } from '../IO/fileLock'
import { mergeFrontmatter, splitEnvelope } from '../IO/pageFile'
import { isMarkdownFile, listFilesRecursive, listMarkdownFiles } from '../IO/walk'
import { splitFrontmatter } from '../readNexus'
import { pageCollectionSidecar } from '@shared/schemas'
import { SPACE_SIDECAR } from '../paths'
import { readSidecar } from '../sidecarIO'
import { sweepAdmits } from './util'

/** What governs each key at the destination — the only thing the caller can answer, and all
 *  the standing check needs. A key absent from either map is governed by nothing. */
interface LiveWorld {
  /** Property key → the definition the destination Collection carries under that name. */
  defs: Map<string, PropertyDefinition>
  /** Context key → that Context's live Space titles, coerced for matching. */
  contextSpaces: Map<string, Set<string>>
}

async function liveWorld(
  root: string,
  tree: NexusTree,
  destCollectionFolder: string | null,
): Promise<LiveWorld> {
  const registry = (await readRegistry(root)).defs
  const assigned: string[] = destCollectionFolder
    ? (((await readSidecar(destCollectionFolder, 'collection', pageCollectionSidecar))
        ?.properties as string[] | undefined) ?? [])
    : []
  const defs = new Map<string, PropertyDefinition>()
  for (const id of assigned) {
    const def = registry[id]
    if (def) defs.set(def.name, def)
  }
  const contextSpaces = new Map(
    tree.contexts.map((g) => [
      contextKey(g.def.title),
      new Set(g.spaces.map((s) => normalizeContextValue(s.title))),
    ]),
  )
  return { defs, contextSpaces }
}

/** The frontmatter this page should return with, or null when nothing changes. Every decision
 *  is the standing check's; this only spends the answer. */
function reconciled(content: string, world: LiveWorld): string | null {
  const fields = splitFrontmatter(content)
  const drop: string[] = []
  const rewrite: Record<string, unknown> = {}
  for (const [key, raw] of Object.entries(fields)) {
    const def = world.defs.get(key)
    if (!def && parseContextKey(key) === null) continue
    const standing = def
      ? propertyValueStands(def, raw)
      : contextTagStands(world.contextSpaces.get(key), raw)
    if (!standing.stands) {
      drop.push(key)
      continue
    }
    // A survivor is rewritten only when it actually narrowed — a multi-value kind that lost one
    // of its options comes back holding the rest.
    const next = standing.layer === 'property' ? encodeValue(standing.value) : standing.titles
    if (JSON.stringify(next) !== JSON.stringify(raw)) rewrite[key] = next
  }
  const touched = [...drop, ...Object.keys(rewrite)]
  if (!touched.length) return null
  return mergeFrontmatter(content, rewrite, touched, splitEnvelope(content).body)
}

/** A Space sidecar's context keys, judged exactly as a page's are. Only the context layer is
 *  asked: no schema governs a Space, so a property-shaped key here is foreign data that rides
 *  through untouched, as every other key on the sidecar does. */
function reconciledSidecar(
  raw: Record<string, unknown>,
  world: LiveWorld,
  inTransitKey: string | undefined,
): Record<string, unknown> | null {
  const next = { ...raw }
  let changed = false
  for (const [key, value] of Object.entries(raw)) {
    if (key === inTransitKey || parseContextKey(key) === null) continue
    const standing = contextTagStands(world.contextSpaces.get(key), value)
    if (!standing.stands) {
      delete next[key]
      changed = true
    } else if (JSON.stringify(standing.titles) !== JSON.stringify(value)) {
      next[key] = standing.titles
      changed = true
    }
  }
  return changed ? next : null
}

/**
 * Reconcile a returning artifact against the live world, IN THE TRASH, before anything moves.
 * `absArtifact` is a page file or a folder; `destCollectionFolder` is the Collection whose schema
 * the returning pages will answer to (null when the artifact is not landing under one).
 *
 * `inTransitKey` names the returning Context's own key. The live world cannot answer for a subject
 * still in the trash — it is absent from the tree by definition, and a Context that has since
 * taken its title would answer in its place — so that one key is left for the post-move rekey,
 * which is what settles it. Nothing under a trashed Context can have gone stale beneath its own
 * key: the whole subtree froze together.
 */
export async function scrubReturning(
  root: string,
  tree: NexusTree,
  absArtifact: string,
  destCollectionFolder: string | null,
  inTransitKey?: string,
): Promise<void> {
  const world = await liveWorld(root, tree, destCollectionFolder)
  const pages = isMarkdownFile(absArtifact) ? [absArtifact] : await listMarkdownFiles(absArtifact)
  for (const file of pages) {
    // Under the page lock, and admission-gated exactly as every other nexus-wide sweep is: an
    // Unknown file is left byte-identical here too.
    await rewritePageSerialized(file, (content) =>
      sweepAdmits(content) ? reconciled(content, world) : null,
    ).catch(() => false)
  }
  // A Space sidecar is a context root too — the sweeps have always treated it as one, so the
  // reconcile reaches it on the way back for the same reason.
  for (const file of await listFilesRecursive(absArtifact, [SPACE_SIDECAR])) {
    await serializeOnFile(file, async () => {
      const raw = await readJsonObject(file)
      if (!raw) return
      const next = reconciledSidecar(raw, world, inTransitKey)
      if (next) await writeJson(file, next)
    })
  }
}
