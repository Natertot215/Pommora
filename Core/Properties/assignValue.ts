import type { RefObject } from 'react'
import type { PageFrontmatter } from '../Nexus/schemas'
import type { MutateOutcome, MutateRequest } from '../Nexus/mutateRequest'
import type { PropertyDefinition } from './properties'
import { applyValueAtRoot, isBlankValue, type PropertyValue } from './propertyValue'
import type { ResolvedColumn, ViewRow } from '../Views/viewRow'
import { resolveFieldValue } from './fieldValue'
import { shownAlias } from '../Connections/linkValue'
import { pageIndexOf } from '../Nexus/record'
import { pushUndo } from '../Session/undo'
import { useSession } from '../Session/store'

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

/** Sends `req` with `value` laid over the row while it's in flight; undefined for a property the writer's schema lacks. */
function send(
  w: ValueWriter,
  row: ViewRow,
  column: ResolvedColumn,
  value: PropertyValue | null,
  req: MutateRequest,
): Promise<MutateOutcome | null> | undefined {
  let patched = row.frontmatter
  let contexts: Record<string, string[]> | undefined
  if (column.kind === 'context')
    contexts = { [column.id]: value?.kind === 'context' ? value.value : [] }
  else {
    const def = w.schema.find((d) => d.id === column.id)
    if (!def) return undefined
    patched = applyValueAtRoot(row.frontmatter, def, value) as PageFrontmatter
  }
  const sent = w.mutate(req)
  w.apply(
    row.id,
    patched,
    sent.then((done) => done !== null),
    contexts,
  )
  return sent
}

const valueRequest = (
  row: ViewRow,
  column: ResolvedColumn,
  value: PropertyValue | null,
): MutateRequest =>
  column.kind === 'context'
    ? {
        op: 'setContext',
        path: row.path,
        contextId: column.id,
        spaceIds: value?.kind === 'context' ? value.value : [],
      }
    : { op: 'setProperty', path: row.path, propertyId: column.id, value }

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
  const sent = send(w, target, column, value, valueRequest(target, column, value))
  if (!sent) return sent
  // Pushed now, so a sweep's group collects it; a refused write answers no record, which leaves nothing to revert.
  const undone = sent.then((done) => {
    const remember = done && rememberedAlias(value, prior)
    if (remember) void w.mutate(remember)
    return done?.undo ? [done.undo] : []
  })
  let reverts: MutateRequest[] | undefined
  void undone.then((r) => {
    reverts = r
  })
  const revert = (requests: MutateRequest[]): boolean => {
    const live = writer.current
    const current = live?.rowOf(row.id)
    if (!live || !current) return false
    let reverted = false
    for (const req of requests)
      if (req.op === 'putBack') {
        const entries = req.entries.map((e) =>
          e.file === target.path ? { ...e, file: current.path } : e,
        )
        reverted =
          send(live, current, column, prior, { op: 'putBack', entries }) !== undefined || reverted
      }
    return reverted
  }
  pushUndo(() => {
    if (reverts) return revert(reverts)
    void undone.then(revert)
    return true
  })
  return sent.then((done) => done !== null)
}
