// A bundle froze at its delete while the world moved on; replaying it verbatim would reintroduce governed keys nothing stands behind, so returning content is reconciled before it lands.

import type { NexusTree } from '../Nexus/tree'
import { assignedDefs } from '../Contexts/contextWrite'
import {
  NO_DEFS,
  reconcileGovernedRoot,
  survivingChanges,
  type GovernedWorld,
} from '../Properties/contextResolve'
import { readJsonObject, writeJson } from '../IO/atomicWrite'
import { machine } from '../Platform/machine'
import { mergeFrontmatter, splitEnvelope, splitFrontmatter } from '../IO/pageFile'
import { isMarkdownFile, listFilesRecursive, listMarkdownFiles } from '../IO/walk'

import { SPACE_SIDECAR } from '../Locations/paths'
import { sweepGovernedRoots } from '../Properties/governedSweep'

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
  await sweepGovernedRoots(root, { kind: 'files', files: pages }, { text })
  for (const file of await listFilesRecursive(absArtifact, [SPACE_SIDECAR])) {
    await machine().lock(file, async () => {
      const raw = await readJsonObject(file)
      if (!raw) return
      const next = reconciledSidecar(raw, world, inTransitKey)
      if (next) await writeJson(file, next)
    })
  }
}
