import type { MutateRequest } from '@pommora/core/Pages/mutateRequest'
import type { PageFrontmatter } from '@pommora/core/Nexus/schemas'
import type { ViewRow } from '@pommora/core/Views/viewRow'
import { patchOverride, type SetOverrides } from './useValuesEpoch'

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
  setValueOverride: SetOverrides,
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
  patchOverride(
    setValueOverride,
    row.id,
    patched,
    mutate({ op: 'setContext', path: row.path, contextId, spaceIds: ids }),
  )
}
