// On-demand single-page read for the detail view. Reuses splitFrontmatter from the nexus walk
// and adds body extraction. Read-only — never opens for writing.

import { readFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { contentId } from '@shared/identity'
import type { PageDetail } from '@shared/types'
import { splitFrontmatter } from './readNexus'
import { splitEnvelope } from './IO/pageFile'
import { basenameNoMd } from './coerce'
import { adoptedId } from './ids'

/** Read one page's full content. `relPath` is nexus-relative POSIX (as carried on
 *  PageNode.path). Callers must validate `relPath` stays under root before invoking
 *  (the IPC layer does this). */
export async function readPage(rootPath: string, relPath: string): Promise<PageDetail> {
  const absFile = join(rootPath, relPath)
  const content = await readFile(absFile, 'utf8')
  const frontmatter = splitFrontmatter(content)
  return {
    id: contentId(frontmatter) ?? adoptedId(relPath),
    title: basenameNoMd(basename(relPath)),
    path: relPath,
    frontmatter,
    body: splitEnvelope(content).body,
  }
}
