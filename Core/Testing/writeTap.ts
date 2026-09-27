import { afterEach, beforeEach } from 'vitest'
import { setWriteTap } from '../Files/writeEcho'

export function captureWriteTap(): { wrote: string[]; renames: [string, string][] } {
  const seen = { wrote: [] as string[], renames: [] as [string, string][] }
  beforeEach(() => {
    seen.wrote.length = 0
    seen.renames.length = 0
    setWriteTap({
      wrote: (path) => seen.wrote.push(path),
      renamed: (from, to) => seen.renames.push([from, to]),
    })
  })
  afterEach(() => setWriteTap(null))
  return seen
}
