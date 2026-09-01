// Every nexus-wide sweep is tree-derived, and the tree excludes `.trash` — nothing may rewrite
// trashed content — so a bundle is frozen at the moment of its delete while the world moves on.
// Replaying it verbatim would reintroduce governed keys nothing stands behind: a later property
// or Context taking a dormant key's name would inherit values the page never legitimately held.
// So returning content is reconciled against the CURRENT world before it lands, by the one
// reconcile every governed write runs.

import type { NexusTree } from '@shared/types'
import { assignedDefs } from './contextWrite'
import {
  NO_DEFS,
  reconcileGovernedRoot,
  survivingChanges,
  type GovernedWorld,
} from '@shared/contextResolve'
import { readJsonObject, rewritePageSerialized, writeJson } from '../IO/atomicWrite'
import { serializeOnFile } from '../IO/fileLock'
import { mergeFrontmatter, splitEnvelope } from '../IO/pageFile'
import { isMarkdownFile, listFilesRecursive, listMarkdownFiles } from '../IO/walk'
import { splitFrontmatter } from '../readNexus'
import { SPACE_SIDECAR } from '../paths'
import { sweepAdmits } from './util'

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
  const held =
    inTransitKey !== undefined && inTransitKey in raw ? { [inTransitKey]: raw[inTransitKey] } : null
  const rest = held
    ? Object.fromEntries(Object.entries(raw).filter(([k]) => k !== inTransitKey))
    : raw
  const r = reconcileGovernedRoot(rest, { ...world, defs: NO_DEFS })
  return r.changed.length ? { ...r.root, ...held } : null
}

/**
 * Reconcile a returning artifact against the live world, IN THE TRASH, before anything moves.
 *
 * `inTransitKey` names the returning Context's own key. The live world cannot answer for a subject
 * still in the trash — it is absent from the tree by definition, and a Context that has since
 * taken its title would answer in its place — so that one key is left for the post-move rekey,
 * which settles it. Nothing under a trashed Context can have gone stale beneath its own key:
 * the whole subtree froze together.
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
    // Admission-gated exactly as every other nexus-wide sweep: an Unknown file is left
    // byte-identical here too.
    await rewritePageSerialized(file, (content) => {
      if (!sweepAdmits(content)) return null
      const r = reconcileGovernedRoot(splitFrontmatter(content), world, false)
      if (!r.changed.length) return null
      return mergeFrontmatter(content, survivingChanges(r), r.changed, splitEnvelope(content).body)
    }).catch(() => false)
  }
  // A Space sidecar is a context root too, so the reconcile reaches it on the way back as well.
  for (const file of await listFilesRecursive(absArtifact, [SPACE_SIDECAR])) {
    await serializeOnFile(file, async () => {
      const raw = await readJsonObject(file)
      if (!raw) return
      const next = reconciledSidecar(raw, world, inTransitKey)
      if (next) await writeJson(file, next)
    })
  }
}
