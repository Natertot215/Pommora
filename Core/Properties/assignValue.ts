import type { RefObject } from 'react'
import type { PageFrontmatter } from '@pommora/core/Nexus/schemas'
import type { MutateRequest } from '@pommora/core/Pages/mutateRequest'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import { applyValueAtRoot, type PropertyValue } from '@pommora/core/Properties/propertyValue'
import type { ResolvedColumn, ViewRow } from '@pommora/core/Views/viewRow'

export interface ValueWriter {
  schema: PropertyDefinition[]
  mutate: (req: MutateRequest) => Promise<boolean>
  rowOf: (id: string) => ViewRow | undefined
  apply: (pageId: string, fm: PageFrontmatter, write: Promise<boolean>) => void
}

// loadValues never re-reads mid-session, so a context write patches the resolved ids onto the frontmatter's `contextValues` rider, which resolveFieldValue prefers while the commit is in flight.
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
  write(w, row, column, value)
}
