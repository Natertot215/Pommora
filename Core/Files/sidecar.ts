import type { z } from 'zod'
import { sidecarPath, type SidecarKind } from '../Paths/paths'
import { fail, type Result } from '../Contract/result'
import { readJsonObject, rmwJsonStrict } from './atomicWrite'

export async function readSidecar<S extends z.ZodType>(
  absFolder: string,
  kind: SidecarKind,
  schema: S,
): Promise<z.infer<S> | null> {
  const raw = await readJsonObject(sidecarPath(absFolder, kind))
  if (raw === null) return null
  const parsed = schema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

type Refuse = (why: Result<never>) => null

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
