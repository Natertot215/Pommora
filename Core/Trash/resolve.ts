// Where a recorded artifact re-enters: the placement resolved against the CURRENT tree, or the refusal that says why it cannot be placed.

import { CONTEXTS_DIR_REL, contextDirRel } from '../Paths/nexusPaths'
import { normalizeTitle } from '../Connections/connections'
import type { CollectionNode, NexusTree, SetNode } from '../Nexus/tree'
import { projectBaseline } from '../Nexus/remintLedger'
import type { RecordFile } from './record'

export interface Placement {
  dir: string
  finalName: string
  /** For a Space or Context: the final title restore writes everywhere (folder, registry, re-applied membership keys). Recorded titles are labels; this is the decision. */
  finalTitle?: string
}

export type Refusal = 'parent-gone' | 'cannot-hold' | 'unaddressable' | 'id-live'
type Resolution = { place: Placement } | { refuse: Refusal }

/** The property shape is artifact-less — there is nothing to place. */
export type ArtifactRecord = Exclude<RecordFile, { entity: 'property' }>

/** The create convention: a name already held — case- and form-insensitively — gains a counter. */
const disambiguate = (base: string, taken: string[]): string => {
  const held = taken.map(normalizeTitle)
  const isTaken = (title: string): boolean => held.includes(normalizeTitle(title))
  if (!isTaken(base)) return base
  let n = 2
  while (isTaken(`${base} ${n}`)) n++
  return `${base} ${n}`
}

type Container = CollectionNode | SetNode

/** The tree walked structurally rather than a path split, because a crumb chain built from names is the one thing the record model refuses. */
export function containerChain(tree: NexusTree, id: string): Container[] | null {
  const inSets = (sets: SetNode[] | undefined, trail: Container[]): Container[] | null => {
    for (const s of sets ?? []) {
      const next = [...trail, s]
      if (s.id === id) return next
      const hit = inSets(s.sets, next)
      if (hit) return hit
    }
    return null
  }
  for (const c of tree.collections) {
    if (c.id === id) return [c]
    const hit = inSets(c.sets, [c])
    if (hit) return hit
  }
  return null
}

export const findContainer = (tree: NexusTree, id: string): Container | null =>
  containerChain(tree, id)?.at(-1) ?? null

/** THE decision, against the CURRENT tree — a renamed parent resolves to its renamed path. The acting code branches on nothing: every name and title choice is made here. A live id refusal outranks every other answer — nothing may write over a living identity. */
export function resolveRecord(
  record: ArtifactRecord,
  baseName: string,
  tree: NexusTree,
): Resolution {
  const live = projectBaseline(tree).entries
  const recordId = record.entity === 'context' ? record.registry.id : record.id
  if (recordId && live[recordId]) return { refuse: 'id-live' }

  if (record.entity === 'context') {
    const finalTitle = disambiguate(
      record.registry.title,
      tree.contexts.map((g) => g.def.title),
    )
    return { place: { dir: CONTEXTS_DIR_REL, finalName: finalTitle, finalTitle } }
  }

  if (record.entity === 'space') {
    const parent = record.parent
    if (parent.kind === 'unaddressable') return { refuse: 'unaddressable' }
    if (parent.kind !== 'context') return { refuse: 'cannot-hold' }
    const group = tree.contexts.find((g) => g.def.id === parent.id)
    if (!group) return { refuse: 'parent-gone' }
    const finalTitle = disambiguate(
      baseName,
      group.spaces.map((s) => s.title),
    )
    return {
      place: { dir: contextDirRel(group.def.title), finalName: finalTitle, finalTitle },
    }
  }

  switch (record.parent.kind) {
    case 'unaddressable':
      return { refuse: 'unaddressable' }
    case 'context':
      return { refuse: 'cannot-hold' }
    case 'root': {
      if (record.entity !== 'collection') return { refuse: 'cannot-hold' }
      const finalName = disambiguate(
        baseName,
        tree.collections.map((c) => c.title),
      )
      return { place: { dir: '', finalName } }
    }
    case 'container': {
      if (record.entity === 'collection') return { refuse: 'cannot-hold' }
      const parent = findContainer(tree, record.parent.id)
      if (!parent)
        return live[record.parent.id] ? { refuse: 'cannot-hold' } : { refuse: 'parent-gone' }
      // A page and a Set share one folder namespace — both sibling sets block both kinds.
      const siblings = [
        ...parent.pages.map((p) => p.title),
        ...(parent.sets ?? []).map((s) => s.title),
      ]
      if (record.entity === 'page') {
        const finalTitle = disambiguate(baseName.replace(/\.md$/i, ''), siblings)
        return { place: { dir: parent.path, finalName: `${finalTitle}.md` } }
      }
      return { place: { dir: parent.path, finalName: disambiguate(baseName, siblings) } }
    }
  }
}
