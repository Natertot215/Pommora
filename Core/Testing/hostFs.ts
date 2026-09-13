import { mkdtempSync } from 'node:fs'
import { realpath } from 'node:fs/promises'
import { tmpdir } from 'node:os'

export const windows = process.platform === 'win32'

export const posixPath = (p: string): string => (windows ? p.replaceAll('\\', '/') : p)

export const realpathPosix = async (p: string): Promise<string> => posixPath(await realpath(p))

export const tempRoot = (prefix: string): string => posixPath(mkdtempSync(`${tmpdir()}/${prefix}`))

export const noModeBits = windows || process.getuid?.() === 0
