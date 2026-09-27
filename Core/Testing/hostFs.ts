import { mkdtempSync, realpathSync } from 'node:fs'
import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { contextsDir } from '../Paths/paths'
import { SPACE_SIDECAR } from '../Paths/nexusPaths'
import { dirname, join } from '../Paths/posix'

export const windows = process.platform === 'win32'

export const posixPath = (p: string): string => (windows ? p.replaceAll('\\', '/') : p)

export const realpathPosix = async (p: string): Promise<string> => posixPath(await realpath(p))

export const tempRoot = (prefix: string): string =>
  posixPath(realpathSync.native(mkdtempSync(`${tmpdir()}/${prefix}`)))

export const noModeBits = windows || process.getuid?.() === 0

export const readJsonAt = async (file: string): Promise<Record<string, unknown>> =>
  JSON.parse(await readFile(file, 'utf8'))

export const putJson = async (file: string, value: unknown): Promise<void> => {
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, JSON.stringify(value, null, 2))
}

export const seedSpaceSidecar = async (
  root: string,
  contextTitle: string,
  spaceName: string,
  raw: Record<string, unknown>,
): Promise<string> => {
  const file = join(contextsDir(root), contextTitle, spaceName, SPACE_SIDECAR)
  await putJson(file, raw)
  return file
}
