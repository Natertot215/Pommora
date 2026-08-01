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
// key survives only if what it names still exists. Only orphaned keys are dropped — a value the
// live tree would merely fail to resolve is left exactly as the user wrote it, because restore
// must never be stricter about a user's file than the tree it restores into.

import { contextKey } from '@shared/contexts'
import { parseGovernedKey } from '@shared/governedKeys'
import type { PropertyDefinition } from '@shared/properties'
import { encodeValue, propertyKey } from '@shared/propertyValue'
import type { NexusTree } from '@shared/types'
import { contextTagStands, propertyValueStands } from './standing'
import { readRegistry } from '../io/propertiesRegistry'
import { rewritePageSerialized } from '../io/fileLock'
import { mergeFrontmatter, splitEnvelope } from '../io/pageFile'
import { listMarkdownFiles } from '../io/walk'
import { splitFrontmatter } from '../readNexus'
import { pageCollectionSidecar } from '@shared/schemas'
import { readSidecar } from '../sidecarIO'
import { sweepAdmits } from './util'

/** What governs each key at the destination — the only thing the caller can answer, and all
 *  the standing check needs. A key absent from either map is governed by nothing. */
interface LiveWorld {
  /** Property key → the definition the destination Collection carries under that name. */
  defs: Map<string, PropertyDefinition>
  /** Context key → the Space titles that Context still holds. */
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
    if (def) defs.set(propertyKey(def), def)
  }
  const contextSpaces = new Map(
    tree.contexts.map((g) => [contextKey(g.def.title), new Set(g.spaces.map((s) => s.title))]),
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
    const governed = parseGovernedKey(key)
    if (!governed) continue
    const standing =
      governed.layer === 'property'
        ? propertyValueStands(world.defs.get(key), raw)
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

/**
 * Reconcile a returning artifact against the live world, IN THE TRASH, before anything moves.
 * `absArtifact` is a page file or a folder; `destCollectionFolder` is the Collection whose schema
 * the returning pages will answer to (null when the artifact is not landing under one).
 */
export async function scrubReturning(
  root: string,
  tree: NexusTree,
  absArtifact: string,
  destCollectionFolder: string | null,
): Promise<void> {
  const world = await liveWorld(root, tree, destCollectionFolder)
  const pages = absArtifact.toLowerCase().endsWith('.md')
    ? [absArtifact]
    : await listMarkdownFiles(absArtifact)
  for (const file of pages) {
    // Under the page lock, and admission-gated exactly as every other nexus-wide sweep is: an
    // Unknown file is left byte-identical here too.
    await rewritePageSerialized(file, (content) =>
      sweepAdmits(content) ? reconciled(content, world) : null,
    ).catch(() => false)
  }
}
