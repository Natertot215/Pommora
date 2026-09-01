// What a returning artifact missed while it sat in the trash.
//
// Every nexus-wide sweep is tree-derived, and the tree excludes `.trash` — deliberately, because
// nothing may rewrite trashed content. So a bundle is frozen at the moment of its delete while
// the world moves on: a property deleted or unassigned since, a Context erased since, a Space
// gone. Replaying that content verbatim would reintroduce governed keys nothing stands behind,
// and the danger is not the dormant key itself — it is that a later property or Context taking
// that name inherits values the page never legitimately held.
//
// So the returning content is reconciled against the CURRENT world before it lands, by the one
// reconcile every governed write runs: a registered Context's key is repaired against the Spaces it
// still holds, a key the destination's schema assigns is re-read as its definition reads it, and
// every other key — a Context or property the registry no longer names included — rides through.

import type { PropertyDefinition } from '@shared/properties'
import type { Adoption } from '@shared/propertyValue'
import type { NexusTree } from '@shared/types'
import { assignedDefs } from './contextWrite'
import { applyAdoptions } from './optionOps'
import { reconcileGovernedRoot, type GovernedWorld } from '@shared/contextResolve'
import { readJsonObject, rewritePageSerialized, writeJson } from '../IO/atomicWrite'
import { serializeOnFile } from '../IO/fileLock'
import { mergeFrontmatter, splitEnvelope } from '../IO/pageFile'
import { isMarkdownFile, listFilesRecursive, listMarkdownFiles } from '../IO/walk'
import { splitFrontmatter } from '../readNexus'
import { SPACE_SIDECAR } from '../paths'
import { sweepAdmits } from './util'

const NO_DEFS: ReadonlyMap<string, PropertyDefinition> = new Map()

async function liveWorld(
  root: string,
  tree: NexusTree,
  destCollectionFolder: string | null,
): Promise<GovernedWorld> {
  return {
    registry: { contexts: tree.contexts.map((g) => g.def) },
    spacesByContext: new Map(tree.contexts.map((g) => [g.def.id, g.spaces])),
    defs: await assignedDefs(root, destCollectionFolder),
  }
}

/** A Space sidecar's context keys, judged exactly as a page's are; no schema governs a Space, so
 *  every other key rides through. */
function reconciledSidecar(
  raw: Record<string, unknown>,
  world: GovernedWorld,
  inTransitKey: string | undefined,
): Record<string, unknown> | null {
  const { [inTransitKey ?? '']: held, ...rest } = raw
  const r = reconcileGovernedRoot(rest, { ...world, defs: NO_DEFS })
  if (!r.changed.length) return null
  return inTransitKey && inTransitKey in raw ? { ...r.root, [inTransitKey]: held } : r.root
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
  const adoptions: Adoption[] = []
  for (const file of pages) {
    // Under the page lock, and admission-gated exactly as every other nexus-wide sweep is: an
    // Unknown file is left byte-identical here too.
    await rewritePageSerialized(file, (content) => {
      if (!sweepAdmits(content)) return null
      const r = reconcileGovernedRoot(splitFrontmatter(content), world)
      adoptions.push(...r.adoptions)
      if (!r.changed.length) return null
      const set = Object.fromEntries(
        r.changed.filter((k) => k in r.root).map((k) => [k, r.root[k]]),
      )
      return mergeFrontmatter(content, set, r.changed, splitEnvelope(content).body)
    }).catch(() => false)
  }
  await applyAdoptions(root, adoptions)
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
