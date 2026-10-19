// A bundle froze at its delete while the world moved on; replaying it verbatim would reintroduce governed keys nothing stands behind, so returning content is reconciled before it lands.

import type { NexusTree } from '../Nexus/tree'
import { assignedDefs } from '../Properties/assignment'
import { editHeldList, rekeyHeld, stripKeys } from '../Files/heldKeys'
import { byKey, optionsOf, PROPERTY_TYPES } from '../Properties/properties'
import { spellingsOf } from '../Properties/keyFormat'
import { editList } from '../Properties/pageValue'
import { contextKey, parseContextKey } from '../Contexts/contexts'
import { exactTitle, normalizeTitle } from '../Paths/caseFold'
import { keyRefusal } from '../Properties/schema'
import { scalarMembers } from '../Contract/validators'
import type { Json } from '../Files/stableJson'
import { governedWorld, reconcileGovernedRoot, spaceWorldOf } from '../Contexts/contextResolve'
import { type Frozen, gonePageEntry } from '../Properties/propertyValue'
import { ensurePageId } from '../Nexus/adopt'
import { valueOr } from '../Contract/result'
import { asString } from '../Nexus/coerce'
import type { StrippedLink } from '../Nexus/cascade'
import { ID_KEY } from '../Nexus/identityMark'
import { rmwJsonStrict } from '../Files/atomicWrite'
import {
  mergeFrontmatter,
  renameFrontmatterKey,
  splitEnvelope,
  splitFrontmatter,
} from '../Files/pageFile'
import { basename, isMarkdownFile, join } from '../Paths/posix'
import { listMarkdownFiles, listPathsUnder } from '../Files/walk'
import { hiddenFolder } from '../Paths/exclusion'

import { SPACE_SIDECAR } from '../Paths/nexusPaths'
import { sweepGovernedRoots, unsweptLine } from '../Properties/governedSweep'

type Match = (word: string) => string | undefined

/** The current word a returning word names among `words`: the word itself when it is one, else the one key whose label any format spells as the word without regard to case; none when no key does, or more than one. */
function matchOf(words: Iterable<{ label: string; key: string }>): Match {
  const keys = new Set<string>()
  const bySpelling = new Map<string, string | null>()
  for (const { label, key } of words) {
    keys.add(key)
    for (const fold of spellingsOf(label).map(normalizeTitle)) {
      const held = bySpelling.get(fold)
      bySpelling.set(fold, held === undefined || held === key ? key : null)
    }
  }
  return (word) => (keys.has(word) ? word : (bySpelling.get(normalizeTitle(word)) ?? undefined))
}

function currentKeys(tree: NexusTree, skip?: string) {
  const titled = (title: string) => ({ label: title, key: title })
  const property = matchOf(tree.config.registry)
  const context = matchOf(tree.contexts.map((g) => titled(g.def.title)))
  const words = new Map<string, Match>([
    ...tree.config.registry.flatMap((d) =>
      PROPERTY_TYPES[d.type].options ? [[d.key, matchOf(optionsOf(d))] as const] : [],
    ),
    ...tree.contexts.map(
      (g) => [contextKey(g.def.title), matchOf(g.spaces.map((s) => titled(s.title)))] as const,
    ),
  ])
  const targetOf = (k: string): string | undefined => {
    const title = parseContextKey(k)
    if (title === null) return keyRefusal(k) === null ? property(k) : undefined
    const to = context(title)
    return to === undefined ? undefined : contextKey(to)
  }
  /** Each held key and the key it moves to; a key the root holds is no target, so an exact current key keeps its value and a variant beside it stays foreign. */
  const moves = (held: string[]): [string, string][] => {
    const taken = new Set(held)
    return held.flatMap((k): [string, string][] => {
      const to = k === skip ? undefined : targetOf(k)
      if (to === undefined || taken.has(to)) return []
      taken.add(to)
      return [[k, to]]
    })
  }
  const listed =
    (match: Match) =>
    (held: unknown[]): unknown[] | null =>
      editList(
        held,
        new Map(
          scalarMembers(held).flatMap((w): [string, string][] => {
            const to = match(w)
            return to === undefined || to === exactTitle(w) ? [] : [[w, to]]
          }),
        ),
      )
  return {
    text: (content: string): string =>
      moves(Object.keys(splitFrontmatter(content))).reduce(
        (t, [from, to]) => renameFrontmatterKey(t, from, to, 'prefer-new') ?? t,
        content,
      ),
    json: (raw: Json): Json =>
      moves(Object.keys(raw)).reduce(
        (r, [from, to]) => rekeyHeld(r, from, to, 'prefer-new') ?? r,
        raw,
      ),
    words: (raw: Json): { root: Json; changed: string[] } => {
      let root = raw
      const changed: string[] = []
      for (const key of Object.keys(raw)) {
        const match = key === skip ? undefined : words.get(key)
        const next = match && editHeldList(root, key, listed(match))
        if (!next) continue
        root = next
        changed.push(key)
      }
      return { root, changed }
    },
  }
}

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
  const current = currentKeys(tree, inTransitKey)
  const links = byKey(tree.config.registry.filter((d) => d.type === 'link'))
  const dropped: StrippedLink[] = []
  // Whether or not the destination assigns its key, a Link naming a page gone leaves, noted by its root's id.
  const unlinked = (raw: Record<string, unknown>): Record<string, string> =>
    Object.fromEntries(
      Object.entries(raw).flatMap(([k, v]) => {
        const entry = links.has(k) ? gonePageEntry(v, frozen) : null
        return entry === null ? [] : [[k, entry]]
      }),
    )
  const note = (gone: Record<string, string>, id: string | undefined): void => {
    for (const [key, value] of Object.entries(gone)) {
      const def = links.get(key)
      if (def && id) dropped.push({ page: id, property: def.id, value })
    }
  }
  const pages = isMarkdownFile(absArtifact) ? [absArtifact] : await listMarkdownFiles(absArtifact)
  const unstamped = new Map<string, Record<string, string>>()
  const text = (held: string, file: string): string | null => {
    const content = current.text(held)
    const { root: raw, changed } = current.words(splitFrontmatter(content))
    const r = reconcileGovernedRoot(raw, world, frozen)
    const gone = unlinked(raw)
    const goneKeys = Object.keys(gone)
    const keys = [...new Set([...changed, ...r.changed, ...goneKeys])]
    if (!keys.length) return content === held ? null : content
    if (raw[ID_KEY] === undefined && goneKeys.length) unstamped.set(file, gone)
    else note(gone, asString(raw[ID_KEY]))
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
    await rmwJsonStrict(join(root, rel), (held) => {
      const raw = current.words(current.json(held)).root
      const r = reconcileGovernedRoot(raw, spaceWorld, {}, inTransitKey)
      const next = r.changed.length ? r.root : raw === held ? null : raw
      const gone = unlinked(next ?? raw)
      note(gone, asString(raw.id))
      return stripKeys(next ?? raw, Object.keys(gone)) ?? next
    })
  return dropped
}
