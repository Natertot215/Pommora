// A bundle froze at its delete while the world moved on; replaying it verbatim would reintroduce governed keys nothing stands behind, so returning content is reconciled before it lands, and its own links repaired once it has.

import type { NexusTree } from '../Nexus/tree'
import { editHeldList, editList, rekeyHeld, stripKeys } from '../Files/rootValues'
import { byKey, optionsOf, PROPERTY_TYPES, type PropertyDefinition } from '../Properties/properties'
import { linkDefsOf } from '../Properties/propertiesRegistry'
import { spellingsOf } from '../Properties/keyFormat'
import { contextKey, parseContextKey } from '../Contexts/contexts'
import { exactTitle, normalizeTitle } from '../Paths/caseFold'
import { keyRefusal } from '../Properties/validation'
import { scalarMembers } from '../Contract/validators'
import type { Json } from '../Files/stableJson'
import {
  type Frozen,
  gonePageEntry,
  governedWorld,
  reconcileGovernedRoot,
  spaceWorldOf,
} from '../Nexus/governedRoot'
import { ensurePageId } from '../Nexus/adopt'
import { valueOr } from '../Contract/result'
import { asString } from '../Nexus/coerce'
import { fileRewrites, type StrippedLink } from '../Nexus/cascade'
import { rewriteConnections } from '../Connections/rewrite'
import { ID_KEY } from '../Nexus/identityMark'
import {
  mergeFrontmatter,
  renameFrontmatterKey,
  splitEnvelope,
  splitFrontmatter,
} from '../Files/pageFile'
import { basename, isMarkdownFile, join } from '../Paths/posix'
import { listPathsUnder } from '../Files/walk'
import { contentPages } from '../Bundles/bundle'
import type { RecordFile } from '../Bundles/record'
import { hiddenFolder } from '../Paths/exclusion'
import { SPACE_SIDECAR } from '../Paths/nexusPaths'
import { type Rewrite, sweepGovernedRoots } from '../Nexus/governedSweep'
import { unsweptLine } from '../Nexus/entities'

type Match = (word: string) => string | undefined

/** The current word a returning word names among `words`: the word itself when it is one, else the one key whose label any format spells as the word without regard to case; none when no key does, or more than one. */
function matchOf(words: Iterable<{ label: string; key: string }>): Match {
  const keys = new Set<string>()
  const bySpelling = new Map<string, string | null>()
  for (const { label, key } of words) {
    keys.add(key)
    for (const fold of spellingsOf(label).map(normalizeTitle)) {
      if (!fold) continue
      const held = bySpelling.get(fold)
      bySpelling.set(fold, held === undefined || held === key ? key : null)
    }
  }
  return (word) => (keys.has(word) ? word : (bySpelling.get(normalizeTitle(word)) ?? undefined))
}

function currentKeys(tree: NexusTree, skip?: string) {
  const titled = (title: string) => ({ label: title, key: title })
  const property = matchOf(tree.config.registry)
  const inTransit = skip === undefined ? null : parseContextKey(skip)
  const titles = tree.contexts.map((g) => g.def.title)
  const context = matchOf((inTransit === null ? titles : [...titles, inTransit]).map(titled))
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

/** A returning or landed artifact's governed files: its pages, and the Space sidecars under it. */
async function artifactFiles(
  root: string,
  entity: RecordFile['entity'],
  abs: string,
): Promise<string[]> {
  const sidecars = await listPathsUnder(root, abs, (rel, kind) =>
    kind === 'dir' ? !hiddenFolder(basename(rel)) : basename(rel) === SPACE_SIDECAR,
  )
  return [...(await contentPages(entity, abs)), ...sidecars.map((rel) => join(root, rel))]
}

/** Reconciles the returning pages against `schema`, the definitions their destination assigns, and answers each Link value it dropped, by its root's id, so a restore can park the ones naming a page the Trash holds. */
export async function scrubReturning(
  root: string,
  tree: NexusTree,
  entity: RecordFile['entity'],
  absArtifact: string,
  schema: readonly PropertyDefinition[],
  frozen: Frozen,
  inTransitKey?: string,
): Promise<StrippedLink[]> {
  const world = governedWorld(tree, schema)
  const spaceWorld = spaceWorldOf(tree)
  const current = currentKeys(tree, inTransitKey)
  const links = byKey(linkDefsOf(tree.config.registry))
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
  const json: Rewrite = (held) => {
    const raw = current.words(current.json(held)).root
    const r = reconcileGovernedRoot(raw, spaceWorld, {}, inTransitKey)
    const gone = unlinked(r.root)
    note(gone, asString(raw.id))
    return (
      stripKeys(r.root, Object.keys(gone)) ?? (r.changed.length || raw !== held ? r.root : null)
    )
  }
  const swept = await sweepGovernedRoots(await artifactFiles(root, entity, absArtifact), {
    text,
    raw: json,
  })
  // A page the scrub couldn't write refuses the restore; a Space it couldn't write goes unreported.
  const missed = swept.skipped.filter(isMarkdownFile)
  if (missed.length) throw new Error(unsweptLine(missed.length))
  // An ID-less page takes the ID its next open would give it, so what it dropped can be parked.
  for (const [file, lost] of unstamped) note(lost, valueOr(await ensurePageId(file), undefined))
  return dropped
}

/** A returning artifact's own links, repaired where it landed: each key in `repair` re-spells to the current name of the page the delete recorded it naming. Answers the files it couldn't write. */
export async function repairLanded(
  root: string,
  tree: NexusTree,
  entity: RecordFile['entity'],
  targetAbs: string,
  repair: ReadonlyMap<string, string>,
): Promise<string[]> {
  if (!repair.size) return []
  const { text, spaceMoved } = fileRewrites(root, tree, (t) => rewriteConnections(t, repair))
  const files = await artifactFiles(root, entity, targetAbs)
  return (await sweepGovernedRoots(files, { text, raw: spaceMoved })).skipped
}
