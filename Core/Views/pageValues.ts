import { localIso } from '@pommora/uix/Utilities/pad'
import { ID_KEY } from '../Nexus/identityMark'
import { idTime } from '../Nexus/ids'
import { pageFrontmatter } from '../Nexus/schemas'
import type { PageValues } from './viewRow'

export function pageValuesOf(
  id: string,
  fm: Record<string, unknown>,
  mtimeMs: number | null,
): PageValues {
  return {
    frontmatter: pageFrontmatter.parse({ ...fm, [ID_KEY]: id }),
    createdAt: localIso(idTime(id)),
    modifiedAt: localIso(mtimeMs),
  }
}
