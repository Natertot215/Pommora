import type { MutateRequest } from '@pommora/core/Pages/mutateRequest'
import type { PageFrontmatter } from '@pommora/core/Nexus/schemas'
import type { ViewRow } from '@pommora/core/Views/viewRow'
import { patchOverride, type SetOverrides } from './useValuesEpoch'

/** loadValues never re-reads mid-session, so the resolved ids are patched onto the value-override layer's `contextValues` rider, which wins while the commit is in flight. */
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
