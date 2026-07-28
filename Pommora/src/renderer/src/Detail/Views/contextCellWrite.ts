import type { Dispatch, SetStateAction } from 'react'
import type { MutateRequest } from '@shared/mutate'
import type { PageFrontmatter } from '@shared/schemas'
import type { ViewRow } from '@shared/types'

type ValueOverride = Record<string, PageFrontmatter> | null

/**
 * The optimistic context write both container views share: patch the row's resolved ids into
 * the `contextValues` rider on the value-override layer, since loadValues never re-reads
 * mid-session — the rider wins over the tree's own resolution while the commit is in flight.
 * Then fire setContext (ids out; main resolves titles at the write boundary). `base` is the
 * frontmatter to patch over, so each caller keeps its own resolved shape.
 */
export function writeContextValue(
  row: Pick<ViewRow, 'id' | 'path' | 'contextValues'>,
  contextId: string,
  ids: string[],
  base: PageFrontmatter,
  setValueOverride: Dispatch<SetStateAction<ValueOverride>>,
  mutate: (req: MutateRequest) => Promise<boolean>,
): void {
  const current =
    ((base as Record<string, unknown>).contextValues as Record<string, string[]> | undefined) ??
    row.contextValues ??
    {}
  const patched = {
    ...base,
    contextValues: { ...current, [contextId]: ids },
  } as PageFrontmatter
  setValueOverride((prev) => ({ ...prev, [row.id]: patched }))
  void mutate({ op: 'setContext', path: row.path, contextId, spaceIds: ids })
}
