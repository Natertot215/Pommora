import { newContentId } from '../Nexus/ids'
import { createPage } from '../Nexus/page'

export const createTestPage = (
  parentDir: string,
  name: string,
  opts: Omit<Parameters<typeof createPage>[2], 'id'> = {},
): ReturnType<typeof createPage> =>
  createPage(parentDir, name, { id: newContentId('page'), ...opts })
