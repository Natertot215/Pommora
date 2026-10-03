import { sidecarPath } from '../Paths/paths'
import type { SidecarKind } from '../Paths/nexusPaths'
import { fail, type Result } from '../Contract/result'
import { asString } from '../Nexus/coerce'
import { readJsonObject, rmwJsonStrict } from './atomicWrite'

export const sidecarId = async (
  absFolder: string,
  kind: SidecarKind,
): Promise<string | undefined> => asString((await readJsonObject(sidecarPath(absFolder, kind)))?.id)

export type Refuse = (why: Result<never>) => null

export async function patchSidecar(
  absFolder: string,
  kind: SidecarKind,
  fn: (cur: Record<string, unknown>, refuse: Refuse) => Record<string, unknown> | null,
): Promise<Result<Record<string, unknown>>> {
  let refused: Result<never> | null = null
  const refuse: Refuse = (why) => {
    refused = why
    return null
  }
  const written = await rmwJsonStrict(sidecarPath(absFolder, kind), (cur) =>
    typeof cur.id === 'string'
      ? fn(cur, refuse)
      : refuse(fail('not-found', 'That item has no id.')),
  )
  return refused ?? written
}
