import { mkdtempSync } from 'node:fs'
import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { contextsDir, SPACE_SIDECAR } from '../Paths/paths'
import { join } from '../Paths/posix'

export const windows = process.platform === 'win32'

export const posixPath = (p: string): string => (windows ? p.replaceAll('\\', '/') : p)

export const realpathPosix = async (p: string): Promise<string> => posixPath(await realpath(p))

export const tempRoot = (prefix: string): string => posixPath(mkdtempSync(`${tmpdir()}/${prefix}`))

export const noModeBits = windows || process.getuid?.() === 0

export const seedSpaceSidecar = async (
  root: string,
  contextTitle: string,
  spaceName: string,
  raw: Record<string, unknown>,
): Promise<string> => {
  const dir = join(contextsDir(root), contextTitle, spaceName)
  await mkdir(dir, { recursive: true })
  const file = join(dir, SPACE_SIDECAR)
  await writeFile(file, JSON.stringify(raw))
  return file
}

export const readSpaceSidecar = async (file: string): Promise<Record<string, unknown>> =>
  JSON.parse(await readFile(file, 'utf8'))
