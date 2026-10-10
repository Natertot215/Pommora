// A bundle froze at its delete while the world moved on; replaying it verbatim would reintroduce governed keys nothing stands behind, so returning content is reconciled before it lands.

import type { NexusTree } from '../Nexus/tree'
import { assignedDefs } from '../Properties/assignment'
import { foldKey } from '../Paths/caseFold'
import { heldKeys, stripKeys } from '../Files/heldKeys'
import { byFoldedName } from '../Properties/properties'
import { governedWorld, reconcileGovernedRoot, spaceWorldOf } from '../Contexts/contextResolve'
import { type Frozen, gonePageEntry } from '../Properties/propertyValue'
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
import { sweepGovernedRoots, unsweptLine } from '../Properties/governedSweep'

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
  const unlinked = (raw: Record<string, unknown>): Record<string, string> =>
    Object.fromEntries(
      Object.entries(raw).flatMap(([k, v]) => {
        const entry = links.has(foldKey(k)) ? gonePageEntry(v, frozen) : null
        return entry === null ? [] : [[k, entry]]
      }),
    )
  const note = (gone: Record<string, string>, id: string | undefined): void => {
    for (const [key, value] of Object.entries(gone)) {
      const def = links.get(foldKey(key))
      if (def && id) dropped.push({ page: id, property: def.id, value })
    }
  }
  const pages = isMarkdownFile(absArtifact) ? [absArtifact] : await listMarkdownFiles(absArtifact)
  const unstamped = new Map<string, Record<string, string>>()
  const text = (content: string, file: string): string | null => {
    const raw = splitFrontmatter(content)
    const r = reconcileGovernedRoot(raw, world, frozen)
    const gone = unlinked(raw)
    const goneKeys = Object.keys(gone)
    if (!r.changed.length && !goneKeys.length) return null
    if (raw[ID_KEY] === undefined && goneKeys.length) unstamped.set(file, gone)
    else note(gone, asString(raw[ID_KEY]))
    const keys = [...new Set([...r.changed, ...goneKeys])]
    const kept = stripKeys(r.root, goneKeys) ?? r.root
    return mergeFrontmatter(content, kept, keys, splitEnvelope(content).body)
  }
  const { skipped } = await sweepGovernedRoots(root, pages, { text })
  if (skipped.length) throw new Error(unsweptLine(skipped.length))
  // An ID-less page takes the ID its next open would give it, so what it dropped can be parked.
  for (const [file, lost] of unstamped) note(lost, valueOr(await ensurePageId(file), undefined))
  const sidecars = await listPathsUnder(root, absArtifact, (rel, kind) =>
    kind === 'dir' ? !hiddenFolder(basename(rel)) : basename(rel) === SPACE_SIDECAR,
  )
  for (const rel of sidecars)
    await rmwJsonStrict(join(root, rel), (raw) => {
      const skip = inTransitKey === undefined ? [] : heldKeys(raw, inTransitKey)
      const r = reconcileGovernedRoot(raw, spaceWorld, {}, skip)
      const next = r.changed.length ? r.root : null
      const gone = unlinked(next ?? raw)
      note(gone, asString(raw.id))
      return stripKeys(next ?? raw, Object.keys(gone)) ?? next
    })
  return dropped
}
