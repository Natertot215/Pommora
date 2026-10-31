import { type RefObject, useEffect, useRef } from 'react'
import type { MutateOutcome, MutateRequest } from '../Nexus/mutateRequest'
import { isBlankValue, NULL_VALUE, type PropertyValue } from './propertyValue'
import { patchOverride, type SetOverrides } from './valueOverride'
import type { Picked, ResolvedColumn, ViewRow } from '../Views/viewRow'
import { resolveFieldValue } from './fieldValue'
import { shownAlias } from '../Connections/linkValue'
import { livePath, pageIndexOf } from '../Nexus/record'
import type { ConnPage } from '../Connections/pageIndex'
import { pushUndo } from '../Session/undo'
import { useSession } from '../Session/store'

export interface ValueWriter {
  rowOf: (id: string) => ViewRow | undefined
  apply: (pageId: string, picked: Picked, write: Promise<boolean>) => void
}

// Rebuilt after every render, so an undo reads the surface's newest rows, and emptied on unmount, so an undo after it reverts nothing.
export function useValueWriter(
  host: Pick<ValueWriter, 'rowOf'> & { setOverride: SetOverrides },
): RefObject<ValueWriter | null> {
  const writer = useRef<ValueWriter | null>(null)
  useEffect(() => {
    writer.current = {
      rowOf: host.rowOf,
      apply: (pageId, picked, write) => patchOverride(host.setOverride, pageId, picked, write),
    }
    return () => {
      writer.current = null
    }
  })
  return writer
}

/** A writer for one row no surface shows, as the native menu's pick writes it; the row it keeps takes each pick, so its undo reads what was written. */
export function oneShotWriter(opened: ViewRow): RefObject<ValueWriter> {
  let row = opened
  return {
    current: {
      rowOf: (id) => (id === row.id ? row : undefined),
      apply: (_, picked) => {
        row = { ...row, picked: { ...row.picked, ...picked } }
      },
    },
  }
}

/** Sends `req` with `value` laid over the row while it's in flight; `retry` is its Try Again. */
function send(
  w: ValueWriter,
  row: ViewRow,
  column: ResolvedColumn,
  value: PropertyValue | null,
  req: MutateRequest,
  retry?: () => void,
): Promise<MutateOutcome | null> {
  const sent = useSession.getState().mutate(req, { retry })
  w.apply(
    row.id,
    { [column.id]: value ?? NULL_VALUE },
    sent.then((done) => done !== null && !done.missed),
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

// A landed Link value newly showing an alias for a page gives that page the alias, as authoring one in a body does, and its undo takes the alias back.
function rememberedAlias(
  value: PropertyValue | null,
  prior: PropertyValue | null,
): { page: ConnPage; req: MutateRequest } | null {
  const tree = useSession.getState().tree
  if (value?.kind !== 'link' || !tree) return null
  const was = prior?.kind === 'link' ? prior.value : undefined
  const shown = shownAlias(value.value, pageIndexOf(tree), was)
  if (!shown) return null
  const { page, alias } = shown
  return { page, req: { op: 'editAliases', path: page.path, edit: { op: 'add', alias } } }
}

/** An alias's undo lands where its page stands now, since a rename may have moved it since the write. */
const atPageNow = (req: MutateRequest, page: ConnPage | undefined): MutateRequest =>
  req.op === 'editAliases' && page
    ? { ...req, path: livePath(useSession.getState().tree, page) }
    : req

export function assignValue(
  writer: RefObject<ValueWriter | null>,
  row: ViewRow,
  column: ResolvedColumn,
  value: PropertyValue | null,
): Promise<boolean> | undefined {
  const w = writer.current
  if (!w) return undefined
  const target = w.rowOf(row.id) ?? row
  const resolved = resolveFieldValue(target, column)
  const prior = isBlankValue(resolved) ? null : resolved
  // A value write sets the whole value, so sending it again is safe, and a file it couldn't reach may read the next time.
  const retry = (): void =>
    void assignValue(writer.current ? writer : oneShotWriter(target), row, column, value)
  const sent = send(w, target, column, value, valueRequest(target, column, value), retry)
  // Pushed now, so a sweep's group collects it; a refused write answers no record, which leaves nothing to revert.
  let aliasPage: ConnPage | undefined
  const undone = sent.then(async (done) => {
    const remember = done && rememberedAlias(value, prior)
    aliasPage = remember?.page
    const aliased = remember ? await useSession.getState().mutate(remember.req) : null
    return [done?.undo, aliased?.undo].filter((r): r is MutateRequest => r !== undefined)
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
        void send(live, current, column, prior, { op: 'putBack', entries })
        reverted = true
      } else if (reverted) void useSession.getState().mutate(atPageNow(req, aliasPage))
    return reverted
  }
  pushUndo(() => {
    if (reverts) return revert(reverts)
    void undone.then(revert)
    return true
  })
  return sent.then((done) => done !== null)
}
