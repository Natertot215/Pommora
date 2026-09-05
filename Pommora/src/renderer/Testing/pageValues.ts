import type { PageFrontmatter } from '@pommora/core/Nexus/schemas'
import { ok, type Result } from '@pommora/core/Contract/result'
import type { PageValues } from '@pommora/core/Views/viewRow'

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
