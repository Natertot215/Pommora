import type { z } from 'zod'
import { sidecarPath, type SidecarKind } from '../Paths/paths'
import { parseJsonText, readTextOrNull, writeJson } from './atomicWrite'
import { machine } from '../Platform/machine'

/** Reads FRESH inside the lock. Views, container config, within-folder orders, property assignment and the Remove cache all rewrite the same file whole, so they queue on one key or the last writer back silently drops whatever the others just set. */
export function withSidecarLock<T>(
  absFolder: string,
  kind: SidecarKind,
  fn: () => Promise<T>,
): Promise<T> {
  return machine().lock(sidecarPath(absFolder, kind), fn)
}

export async function readSidecar<S extends z.ZodType>(
  absFolder: string,
  kind: SidecarKind,
  schema: S,
): Promise<z.infer<S> | null> {
  const text = await readTextOrNull(sidecarPath(absFolder, kind))
  if (text === null) return null
  let raw: unknown
  try {
    raw = parseJsonText(text)
  } catch {
    return null
  }
  const parsed = schema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

export async function writeSidecar(
  absFolder: string,
  kind: SidecarKind,
  value: unknown,
): Promise<void> {
  await writeJson(sidecarPath(absFolder, kind), value)
}
