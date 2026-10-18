import type { RefObject } from 'react'
import type { PageFrontmatter } from '../Nexus/schemas'
import type { MutateOutcome, MutateRequest } from '../Nexus/mutateRequest'
import type { PropertyDefinition } from './properties'
import { applyValueAtRoot, isBlankValue, type PropertyValue } from './propertyValue'
import type { ResolvedColumn, ViewRow } from '../Views/viewRow'
import { resolveFieldValue } from './value'
import { shownAlias } from '../Connections/linkValue'
import { pageIndexOf } from '../Nexus/record'
import { pushUndo } from '../Session/undo'
import { useSession } from '../Session/store'
import { landValue } from '../Files/heldKeys'

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

function send(
  w: ValueWriter,
  row: ViewRow,
  req: MutateRequest,
  patched: PageFrontmatter,
  contexts?: Record<string, string[]>,
): Promise<boolean> {
  const pending = w.mutate(req).then((done) => done !== null)
  w.apply(row.id, patched, pending, contexts)
  return pending
}

function write(
  w: ValueWriter,
  row: ViewRow,
  column: ResolvedColumn,
  value: PropertyValue | null,
): Promise<boolean> | undefined {
  if (column.kind === 'context') {
    const ids = value?.kind === 'context' ? value.value : []
    const req: MutateRequest = {
      op: 'setContext',
      path: row.path,
      contextId: column.id,
      spaceIds: ids,
    }
    return send(w, row, req, row.frontmatter, { [column.id]: ids })
  }
  const def = w.schema.find((d) => d.id === column.id)
  if (!def) return undefined
  const patched = applyValueAtRoot(row.frontmatter, def, value) as PageFrontmatter
  return send(w, row, { op: 'setProperty', path: row.path, propertyId: column.id, value }, patched)
}

function restore(
  w: ValueWriter,
  row: ViewRow,
  column: ResolvedColumn,
  prior: PropertyValue | null,
  held: unknown,
): Promise<boolean> | undefined {
  if (column.kind === 'context') return write(w, row, column, prior)
  const def = w.schema.find((d) => d.id === column.id)
  if (!def) return undefined
  const patched = landValue(row.frontmatter, def.key, held) as PageFrontmatter
  return send(w, row, { op: 'restoreValue', path: row.path, propertyId: column.id, held }, patched)
}

// A landed Link value newly showing an alias for a page gives that page the alias, as authoring one in a body does.
function rememberedAlias(
  value: PropertyValue | null,
  prior: PropertyValue | null,
): MutateRequest | null {
  const tree = useSession.getState().tree
  if (value?.kind !== 'link' || !tree) return null
  const was = prior?.kind === 'link' ? prior.value : undefined
  const shown = shownAlias(value.value, pageIndexOf(tree), was)
  if (!shown) return null
  return { op: 'editAliases', path: shown.page.path, edit: { op: 'add', alias: shown.alias } }
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
  const def = w.schema.find((d) => d.id === column.id)
  const held = def && target.frontmatter[def.key]
  const pending = write(w, target, column, value)
  if (!pending) return pending
  // Pushed now, so a sweep's group collects it; a refused write leaves nothing to revert.
  let landed: boolean | null = null
  void pending.then((ok) => {
    landed = ok
    const remember = ok && rememberedAlias(value, prior)
    if (remember) void w.mutate(remember)
  })
  const revert = (): boolean => {
    const live = writer.current
    const current = live?.rowOf(row.id)
    return !!live && !!current && restore(live, current, column, prior, held) !== undefined
  }
  pushUndo(() => {
    if (landed !== null) return landed && revert()
    void pending.then((ok) => ok && revert())
    return true
  })
  return pending
}
