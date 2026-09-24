import type { RefObject } from 'react'
import type { PageFrontmatter } from '@pommora/core/Nexus/schemas'
import type { MutateRequest } from '@pommora/core/Nexus/mutateRequest'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import {
  applyValueAtRoot,
  isBlankValue,
  type PropertyValue,
} from '@pommora/core/Properties/propertyValue'
import type { ResolvedColumn, ViewRow } from '@pommora/core/Views/viewRow'
import { resolveFieldValue } from './value'
import { pushUndo } from '../Session/undo'

export interface ValueWriter {
  schema: PropertyDefinition[]
  mutate: (req: MutateRequest) => Promise<boolean>
  rowOf: (id: string) => ViewRow | undefined
  apply: (pageId: string, fm: PageFrontmatter, write: Promise<boolean>) => void
}

function write(
  w: ValueWriter,
  row: ViewRow,
  column: ResolvedColumn,
  value: PropertyValue | null,
): Promise<boolean> | undefined {
  if (column.kind === 'context') {
    const ids = value?.kind === 'context' ? value.value : []
    const current =
      (row.frontmatter.contextValues as Record<string, string[]> | undefined) ??
      row.contextValues ??
      {}
    const patched = {
      ...row.frontmatter,
      contextValues: { ...current, [column.id]: ids },
    } as PageFrontmatter
    const pending = w.mutate({
      op: 'setContext',
      path: row.path,
      contextId: column.id,
      spaceIds: ids,
    })
    w.apply(row.id, patched, pending)
    return pending
  }
  const def = w.schema.find((d) => d.id === column.id)
  if (!def) return undefined
  const patched = applyValueAtRoot(row.frontmatter, def, value) as PageFrontmatter
  const pending = w.mutate({ op: 'setProperty', path: row.path, propertyId: column.id, value })
  w.apply(row.id, patched, pending)
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
