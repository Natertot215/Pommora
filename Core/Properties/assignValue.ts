import { type RefObject, useEffect, useRef } from 'react'
import type { MutateOutcome, MutateRequest } from '../Nexus/mutateRequest'
import { isBlankValue, NULL_VALUE, type PropertyValue } from './propertyValue'
import { patchOverride, type SetOverrides } from './valueOverride'
import type { Picked, ResolvedColumn, ViewRow } from '../Views/viewRow'
import { resolveFieldValue } from './fieldValue'
import { shownAlias } from '../Connections/linkValue'
import { pageIndexOf } from '../Nexus/record'
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

/** Sends `req` with each row's value laid over it while it's in flight. */
function send(
  w: ValueWriter,
  rows: readonly ViewRow[],
  column: ResolvedColumn,
  values: readonly (PropertyValue | null)[],
  req: MutateRequest,
): Promise<MutateOutcome | null> {
  const sent = useSession.getState().mutate(req)
  const landed = sent.then((done) => done !== null && !done.missed)
  rows.forEach((r, i) => {
    w.apply(r.id, { [column.id]: values[i] ?? NULL_VALUE }, landed)
  })
  return sent
}

const valueRequest = (
  rows: readonly ViewRow[],
  column: ResolvedColumn,
  value: PropertyValue | null,
): MutateRequest => {
  const paths = rows.map((r) => r.path)
  return column.kind === 'context'
    ? {
        op: 'setContext',
        paths,
        contextId: column.id,
        spaceIds: value?.kind === 'context' ? value.value : [],
      }
    : { op: 'setProperty', paths, propertyId: column.id, value }
}

// A landed Link value newly showing an alias for a page gives that page the alias, as authoring one in a body does, and its undo takes the alias back.
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
  rows: readonly ViewRow[],
  column: ResolvedColumn,
  value: PropertyValue | null,
): Promise<boolean> | undefined {
  const w = writer.current
  if (!w) return undefined
  const targets = rows.map((r) => w.rowOf(r.id) ?? r)
  const priors = targets.map((t) => {
    const resolved = resolveFieldValue(t, column)
    return isBlankValue(resolved) ? null : resolved
  })
  const sent = send(
    w,
    targets,
    column,
    targets.map(() => value),
    valueRequest(targets, column, value),
  )
  // Pushed now, so a sweep's group collects it; a refused write answers no record, which leaves nothing to revert.
  const undone = sent.then(async (done) => {
    const remember = done && rememberedAlias(value, priors[0])
    const aliased = remember ? await useSession.getState().mutate(remember) : null
    return [done?.undo, aliased?.undo].filter((r): r is MutateRequest => r !== undefined)
  })
  let reverts: MutateRequest[] | undefined
  void undone.then((r) => {
    reverts = r
  })
  const revert = (requests: MutateRequest[]): boolean => {
    const live = writer.current
    if (!live) return false
    // A row that has left since takes no put-back, as one row's undo finds nothing today.
    const now = targets.flatMap((t, i) => {
      const current = live.rowOf(t.id)
      return current ? [{ from: t.path, current, prior: priors[i] }] : []
    })
    if (!now.length) return false
    const moved = new Map(now.map((n) => [n.from, n.current.path]))
    const left = new Set(targets.map((t) => t.path).filter((p) => !moved.has(p)))
    let reverted = false
    for (const req of requests)
      if (req.op === 'putBack') {
        const entries = req.entries.flatMap((e) =>
          left.has(e.file) ? [] : [{ ...e, file: moved.get(e.file) ?? e.file }],
        )
        const back: MutateRequest = { op: 'putBack', entries }
        void send(
          live,
          now.map((n) => n.current),
          column,
          now.map((n) => n.prior),
          back,
        )
        reverted = true
      } else if (reverted) void useSession.getState().mutate(req)
    return reverted
  }
  pushUndo(() => {
    if (reverts) return revert(reverts)
    void undone.then(revert)
    return true
  })
  return sent.then((done) => done !== null)
}
