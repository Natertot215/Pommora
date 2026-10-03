// Where a recorded artifact re-enters: the placement resolved against the CURRENT tree, or the refusal that says why it cannot be placed.

import { CONTEXTS_DIR_REL, contextDirRel } from '../Paths/nexusPaths'
import { titleFromPath } from '../Paths/posix'
import { freeName } from '../Paths/names'
import type { CollectionNode, NexusTree, SetNode } from '../Nexus/tree'
import { recordById } from '../Nexus/record'
import { findContainerWhere } from '../Nexus/treePatch'
import type { RecordFile } from './record'
import { contextWorldOf } from '../Contexts/contextResolve'

interface Placement {
  dir: string
  finalName: string
  /** For a Space or Context: the final title restore writes everywhere (folder, registry, re-applied membership keys). Recorded titles are labels; this is the decision. */
  finalTitle?: string
}

export type Refusal = 'parent-gone' | 'cannot-hold' | 'unaddressable' | 'id-live'
type Resolution = { place: Placement } | { refuse: Refusal }

/** The property shape is artifact-less — there is nothing to place. */
export type ArtifactRecord = Exclude<RecordFile, { entity: 'property' }>

type Container = CollectionNode | SetNode

export const findContainerById = (tree: NexusTree, id: string): Container | null =>
  findContainerWhere(tree, (n) => n.id === id)

/** THE decision, against the CURRENT tree — a renamed parent resolves to its renamed path. The acting code branches on nothing: every name and title choice is made here. A live id refusal outranks every other answer — nothing may write over a living identity. */
export function resolveRecord(
  record: ArtifactRecord,
  baseName: string,
  tree: NexusTree,
): Resolution {
  const live = recordById(tree)
  const recordId = record.entity === 'context' ? record.registry.id : record.id
  if (recordId && live[recordId]) return { refuse: 'id-live' }

  if (record.entity === 'context') {
    const finalTitle = freeName(
      record.registry.title,
      tree.contexts.map((g) => g.def.title),
    )
    return { place: { dir: CONTEXTS_DIR_REL, finalName: finalTitle, finalTitle } }
  }

  if (record.entity === 'space') {
    const parent = record.parent
    if (parent.kind === 'unaddressable') return { refuse: 'unaddressable' }
    if (parent.kind !== 'context') return { refuse: 'cannot-hold' }
    const group = contextWorldOf(tree.contexts).groupById.get(parent.id)
    if (!group) return { refuse: 'parent-gone' }
    const finalTitle = freeName(
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
      const finalName = freeName(
        baseName,
        tree.collections.map((c) => c.title),
      )
      return { place: { dir: '', finalName } }
    }
    case 'container': {
      if (record.entity === 'collection') return { refuse: 'cannot-hold' }
      const parent = findContainerById(tree, record.parent.id)
      if (!parent)
        return live[record.parent.id] ? { refuse: 'cannot-hold' } : { refuse: 'parent-gone' }
      // A page and a Set share one folder namespace — both sibling sets block both kinds.
      const siblings = [
        ...parent.pages.map((p) => p.title),
        ...(parent.sets ?? []).map((s) => s.title),
      ]
      if (record.entity === 'page') {
        const finalTitle = freeName(titleFromPath(baseName), siblings)
        return { place: { dir: parent.path, finalName: `${finalTitle}.md` } }
      }
      return { place: { dir: parent.path, finalName: freeName(baseName, siblings) } }
    }
  }
}
