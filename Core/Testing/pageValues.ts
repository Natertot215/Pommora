// Per-page value fixtures for view and property suites: frontmatter keyed by the property NAME the file carries, and the loadValues reply a stubbed dialer answers with.

import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import type { PageFrontmatter } from '@pommora/core/Nexus/schemas'
import { ok, type Result } from '@pommora/core/Contract/result'
import type { PageValues } from '@pommora/core/Views/viewRow'

export const propsAtRoot = (
  props: Record<string, unknown>,
  defs: PropertyDefinition[],
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(props).map(([id, v]) => {
      const d = defs.find((x) => x.id === id)
      return [d ? d.name : id, v]
    }),
  )

export const pageValues = (fm: Record<string, PageFrontmatter>): Record<string, PageValues> =>
  Object.fromEntries(
    Object.entries(fm).map(([id, frontmatter]) => [
      id,
      { frontmatter, createdAt: null, modifiedAt: null },
    ]),
  )

export const valuesReply = (
  fm: Record<string, PageFrontmatter>,
): Result<Record<string, PageValues>> => ok(pageValues(fm))
