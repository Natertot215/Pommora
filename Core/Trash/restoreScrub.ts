// A bundle froze at its delete while the world moved on; replaying it verbatim would reintroduce governed keys nothing stands behind, so returning content is reconciled before it lands.

import type { NexusTree } from '../Nexus/tree'
import { assignedDefs } from '../Properties/assignment'
import {
  NO_DEFS,
  reconcileGovernedRoot,
  survivingChanges,
  type GovernedWorld,
} from '../Contexts/contextResolve'
import { rmwJsonStrict } from '../Files/atomicWrite'
import { mergeFrontmatter, splitEnvelope, splitFrontmatter } from '../Files/pageFile'
import { basename, isMarkdownFile, join } from '../Paths/posix'
import { listMarkdownFiles, listPathsUnder } from '../Files/walk'
import { hiddenFolder } from '../Paths/exclusion'

import { SPACE_SIDECAR } from '../Paths/nexusPaths'
import { sweepGovernedRoots, unsweptLine } from '../Properties/governedSweep'

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

export async function scrubReturning(
  root: string,
  tree: NexusTree,
  absArtifact: string,
  destCollectionFolder: string | null,
  inTransitKey?: string,
): Promise<void> {
  const world = await liveWorld(root, tree, destCollectionFolder)
  const pages = isMarkdownFile(absArtifact) ? [absArtifact] : await listMarkdownFiles(absArtifact)
  const text = (content: string): string | null => {
    const r = reconcileGovernedRoot(splitFrontmatter(content), world, false)
    if (!r.changed.length) return null
    return mergeFrontmatter(content, survivingChanges(r), r.changed, splitEnvelope(content).body)
  }
  const { skipped } = await sweepGovernedRoots(root, pages, { text })
  if (skipped.length) throw new Error(unsweptLine(skipped.length))
  const sidecars = await listPathsUnder(root, absArtifact, (rel, kind) =>
    kind === 'dir' ? !hiddenFolder(basename(rel)) : basename(rel) === SPACE_SIDECAR,
  )
  for (const rel of sidecars)
    await rmwJsonStrict(join(root, rel), (raw) => reconciledSidecar(raw, world, inTransitKey))
}
