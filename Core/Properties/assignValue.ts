import type { RefObject } from 'react'
import type { PageFrontmatter } from '@pommora/core/Nexus/schemas'
import type { MutateRequest } from '@pommora/core/Pages/mutateRequest'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import {
  applyValueAtRoot,
  isBlankValue,
  type PropertyValue,
} from '@pommora/core/Properties/propertyValue'
import type { ResolvedColumn, ViewRow } from '@pommora/core/Views/viewRow'
import { resolveFieldValue } from './value'
import { pushValueUndo } from './valueUndo'

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
): boolean {
  if (column.kind === 'context') {
    const ids = value?.kind === 'context' ? value.value : []
    const current =
      ((row.frontmatter as Record<string, unknown>).contextValues as
        | Record<string, string[]>
        | undefined) ??
      row.contextValues ??
      {}
    const patched = {
      ...row.frontmatter,
      contextValues: { ...current, [column.id]: ids },
    } as PageFrontmatter
    w.apply(
      row.id,
      patched,
      w.mutate({ op: 'setContext', path: row.path, contextId: column.id, spaceIds: ids }),
    )
    return true
  }
  const def = w.schema.find((d) => d.id === column.id)
  if (!def) return false
  const patched = applyValueAtRoot(
    row.frontmatter as Record<string, unknown>,
    def,
    value,
  ) as PageFrontmatter
  w.apply(
    row.id,
    patched,
    w.mutate({ op: 'setProperty', path: row.path, propertyId: column.id, value }),
  )
  return true
}

export function assignValue(
  writer: RefObject<ValueWriter | null>,
  row: ViewRow,
  column: ResolvedColumn,
  value: PropertyValue | null,
): void {
  const w = writer.current
  if (!w) return
  const resolved = resolveFieldValue(row, column.id, w.schema)
  const prior = isBlankValue(resolved) ? null : resolved
  if (!write(w, row, column, value)) return
  pushValueUndo(() => {
    const live = writer.current
    const target = live?.rowOf(row.id)
    return !!live && !!target && write(live, target, column, prior)
  })
}
