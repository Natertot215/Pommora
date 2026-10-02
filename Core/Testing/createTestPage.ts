import { ok, type Result } from '../Contract/result'
import { newContentId } from '../Nexus/ids'
import { createPage } from '../Nexus/page'

export const createTestPage = async (
  parentDir: string,
  name: string,
  opts: Omit<Parameters<typeof createPage>[2], 'id'> = {},
): Promise<Result<{ id: string; path: string }>> => {
  const id = newContentId('page')
  const r = await createPage(parentDir, name, { id, ...opts })
  return r.ok ? ok({ id, ...r.value }) : r
}
