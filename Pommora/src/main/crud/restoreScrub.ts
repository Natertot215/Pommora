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
import { propertyKey } from '@shared/propertyValue'
import type { NexusTree } from '@shared/types'
import { readRegistry } from '../io/propertiesRegistry'
import { rewritePageSerialized } from '../io/fileLock'
import { mergeFrontmatter, splitEnvelope } from '../io/pageFile'
import { listMarkdownFiles } from '../io/walk'
import { splitFrontmatter } from '../readNexus'
import { pageCollectionSidecar } from '@shared/schemas'
import { readSidecar } from '../sidecarIO'
import { sweepAdmits } from './util'

/** The live world a returning page is measured against. */
interface LiveWorld {
  /** Property keys the destination Collection actually carries — name-derived, as frontmatter is. */
  propertyKeys: Set<string>
  /** Context keys the registry still stands behind → the Space titles that Context still holds. */
  contextSpaces: Map<string, Set<string>>
}

async function liveWorld(
  root: string,
  tree: NexusTree,
  destCollectionFolder: string | null,
): Promise<LiveWorld> {
  const defs = (await readRegistry(root)).defs
  const assigned: string[] = destCollectionFolder
    ? (((await readSidecar(destCollectionFolder, 'collection', pageCollectionSidecar))
        ?.properties as string[] | undefined) ?? [])
    : []
  const propertyKeys = new Set(
    assigned.map((id) => defs[id]).filter((d) => d !== undefined).map((d) => propertyKey(d)),
  )
  const contextSpaces = new Map(
    tree.contexts.map((g) => [contextKey(g.def.title), new Set(g.spaces.map((s) => s.title))]),
  )
  return { propertyKeys, contextSpaces }
}

/** The frontmatter this page should return with, or null when nothing needs dropping. */
function reconciled(content: string, world: LiveWorld): string | null {
  const fields = splitFrontmatter(content)
  const drop: string[] = []
  const rewrite: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(fields)) {
    const governed = parseGovernedKey(key)
    if (!governed) continue
    if (governed.layer === 'property') {
      // No definition, or one the destination Collection no longer carries.
      if (!world.propertyKeys.has(key)) drop.push(key)
      continue
    }
    const spaces = world.contextSpaces.get(key)
    if (!spaces) {
      drop.push(key)
      continue
    }
    const titles = Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
    const kept = titles.filter((t) => spaces.has(t))
    // An emptied value deletes its key — the no-empties rule reaches here too.
    if (kept.length === titles.length) continue
    if (kept.length) rewrite[key] = kept
    else drop.push(key)
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
