// A bundle froze at its delete while the world moved on; replaying it verbatim would reintroduce governed keys nothing stands behind, so returning content is reconciled before it lands.

import type { NexusTree } from '../Nexus/tree'
import { assignedDefs } from '../Properties/assignment'
import { foldKey } from '../Paths/caseFold'
import { heldKeys } from '../Files/heldKeys'
import { byFoldedName } from '../Properties/properties'
import { governedWorld, reconcileGovernedRoot, spaceWorldOf } from '../Contexts/contextResolve'
import { type Frozen, namesGonePage } from '../Properties/propertyValue'
import { ensurePageId } from '../Nexus/adopt'
import { valueOr } from '../Contract/result'
import { asString } from '../Nexus/coerce'
import type { StrippedLink } from '../Nexus/cascade'
import { ID_KEY } from '../Nexus/identityMark'
import { rmwJsonStrict } from '../Files/atomicWrite'
import { mergeFrontmatter, splitEnvelope, splitFrontmatter } from '../Files/pageFile'
import { basename, isMarkdownFile, join } from '../Paths/posix'
import { listMarkdownFiles, listPathsUnder } from '../Files/walk'
import { hiddenFolder } from '../Paths/exclusion'

import { SPACE_SIDECAR } from '../Paths/nexusPaths'
import { stripKeys, sweepGovernedRoots, unsweptLine } from '../Properties/governedSweep'

/** Answers each Link value it dropped, by its root's id, so a restore can park the ones naming a page the Trash holds. */
export async function scrubReturning(
  root: string,
  tree: NexusTree,
  absArtifact: string,
  destCollectionFolder: string | null,
  frozen: Frozen,
  inTransitKey?: string,
): Promise<StrippedLink[]> {
  const world = governedWorld(tree, await assignedDefs(root, destCollectionFolder))
  const spaceWorld = spaceWorldOf(tree)
  const links = byFoldedName(tree.config.registry.filter((d) => d.type === 'link'))
  const dropped: StrippedLink[] = []
  // Whether or not the destination assigns its key, a Link naming a page gone leaves, noted by its root's id.
  const unlinked = (raw: Record<string, unknown>): string[] =>
    Object.keys(raw).filter((k) => links.has(foldKey(k)) && namesGonePage(raw[k], frozen))
  const note = (raw: Record<string, unknown>, keys: string[], id: string | undefined): void => {
    for (const key of keys) {
      const def = links.get(foldKey(key))
      if (def && id) dropped.push({ page: id, property: def.id, value: String(raw[key]) })
    }
  }
  const pages = isMarkdownFile(absArtifact) ? [absArtifact] : await listMarkdownFiles(absArtifact)
  const unstamped = new Map<string, Record<string, unknown>>()
  const text = (content: string, file: string): string | null => {
    const raw = splitFrontmatter(content)
    const r = reconcileGovernedRoot(raw, world, frozen)
    const gone = unlinked(raw)
    if (!r.changed.length && !gone.length) return null
    if (raw[ID_KEY] === undefined && gone.length)
      unstamped.set(file, Object.fromEntries(gone.map((k) => [k, raw[k]])))
    else note(raw, gone, asString(raw[ID_KEY]))
    const keys = [...new Set([...r.changed, ...gone])]
    const kept = stripKeys(...gone)(r.root, file) ?? r.root
    return mergeFrontmatter(content, kept, keys, splitEnvelope(content).body)
  }
  const { skipped } = await sweepGovernedRoots(root, pages, { text })
  if (skipped.length) throw new Error(unsweptLine(skipped.length))
  // An ID-less page takes the ID its next open would give it, so what it dropped can be parked.
  for (const [file, lost] of unstamped)
    note(lost, Object.keys(lost), valueOr(await ensurePageId(file), undefined))
  const sidecars = await listPathsUnder(root, absArtifact, (rel, kind) =>
    kind === 'dir' ? !hiddenFolder(basename(rel)) : basename(rel) === SPACE_SIDECAR,
  )
  for (const rel of sidecars)
    await rmwJsonStrict(join(root, rel), (raw) => {
      const skip = inTransitKey === undefined ? [] : heldKeys(raw, inTransitKey)
      const r = reconcileGovernedRoot(raw, spaceWorld, {}, skip)
      const next = r.changed.length ? r.root : null
      const gone = unlinked(next ?? raw)
      note(raw, gone, asString(raw.id))
      return stripKeys(...gone)(next ?? raw, rel) ?? next
    })
  return dropped
}
