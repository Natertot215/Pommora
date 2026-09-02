import type { PageFrontmatter } from '@shared/schemas'
import type { Result } from '@shared/result'
import type { PageValues } from '@shared/types'

export const pageValues = (fm: Record<string, PageFrontmatter>): Record<string, PageValues> =>
  Object.fromEntries(
    Object.entries(fm).map(([id, frontmatter]) => [
      id,
      { frontmatter, createdAt: null, modifiedAt: null },
    ]),
  )

/** What a mocked `loadValues` answers. */
export const valuesReply = (
  fm: Record<string, PageFrontmatter>,
): Result<Record<string, PageValues>> => ({ ok: true, value: pageValues(fm) })
