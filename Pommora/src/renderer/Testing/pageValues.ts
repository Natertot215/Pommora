import type { PageFrontmatter } from '@shared/schemas'
import { ok, type Result } from '@shared/result'
import type { PageValues } from '@shared/types'

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
