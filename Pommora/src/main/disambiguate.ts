import type { Result } from '@shared/result'

/** Retry `attempt` under ` 2`, ` 3` … while it answers `exists`. The one place the app decides
 *  what a stepped-aside name looks like, so a page, a folder and an adopted file all read the
 *  same way. Bounded: a name that has collided fifty times is a caller's problem, not a loop's. */
export async function createDisambiguated<T>(
  baseName: string,
  attempt: (name: string) => Promise<Result<T>>,
): Promise<Result<T>> {
  let last = await attempt(baseName)
  for (let n = 2; n <= 50 && !last.ok && last.error.code === 'exists'; n++) {
    last = await attempt(`${baseName} ${n}`)
  }
  return last
}
