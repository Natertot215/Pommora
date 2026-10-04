import type { RefObject } from 'react'
import type { PageFrontmatter } from '../Nexus/schemas'
import type { MutateOutcome, MutateRequest } from '../Nexus/mutateRequest'
import type { PropertyDefinition } from './properties'
import { applyValueAtRoot, isBlankValue, type PropertyValue } from './propertyValue'
import type { ResolvedColumn, ViewRow } from '../Views/viewRow'
import { resolveFieldValue } from './value'
import { pushUndo } from '../Session/undo'
import { useSession } from '../Session/store'
import { personalizationOf } from '../Session/configSlice'
import { resolvesCase } from '../Settings/personalization'

export interface ValueWriter {
  schema: PropertyDefinition[]
  mutate: (req: MutateRequest) => Promise<MutateOutcome | null>
  rowOf: (id: string) => ViewRow | undefined
  apply: (
    pageId: string,
    fm: PageFrontmatter,
    write: Promise<boolean>,
    contexts?: Record<string, string[]>,
  ) => void
}

function write(
  w: ValueWriter,
  row: ViewRow,
  column: ResolvedColumn,
  value: PropertyValue | null,
): Promise<boolean> | undefined {
  let req: MutateRequest
  let patched = row.frontmatter
  let contexts: Record<string, string[]> | undefined
  if (column.kind === 'context') {
    const ids = value?.kind === 'context' ? value.value : []
    contexts = { [column.id]: ids }
    req = { op: 'setContext', path: row.path, contextId: column.id, spaceIds: ids }
  } else {
    const def = w.schema.find((d) => d.id === column.id)
    if (!def) return undefined
    const resolveCase = resolvesCase(personalizationOf(useSession.getState()))
    patched = applyValueAtRoot(row.frontmatter, def, value, resolveCase) as PageFrontmatter
    req = { op: 'setProperty', path: row.path, propertyId: column.id, value }
  }
  const pending = w.mutate(req).then((done) => done !== null)
  w.apply(row.id, patched, pending, contexts)
  return pending
}

export function assignValue(
  writer: RefObject<ValueWriter | null>,
  row: ViewRow,
  column: ResolvedColumn,
  value: PropertyValue | null,
): Promise<boolean> | undefined {
  const w = writer.current
  if (!w) return undefined
  const target = w.rowOf(row.id) ?? row
  const resolved = resolveFieldValue(target, column.id, w.schema)
  const prior = isBlankValue(resolved) ? null : resolved
  const pending = write(w, target, column, value)
  if (!pending) return pending
  // Pushed now, so a sweep's group collects it; a refused write leaves nothing to revert.
  let landed: boolean | null = null
  void pending.then((ok) => {
    landed = ok
  })
  const revert = (): boolean => {
    const live = writer.current
    const current = live?.rowOf(row.id)
    return !!live && !!current && write(live, current, column, prior) !== undefined
  }
  pushUndo(() => {
    if (landed !== null) return landed && revert()
    void pending.then((ok) => ok && revert())
    return true
  })
  return pending
}
