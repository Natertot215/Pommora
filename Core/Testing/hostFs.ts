import { mkdtempSync, realpathSync } from 'node:fs'
import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { vi } from 'vitest'
import * as atomicWrite from '../Files/atomicWrite'
import { listFilesRecursive } from '../Files/walk'
import { contextsDir, nexusConfig, sidecarPath } from '../Paths/paths'
import { CONTEXTS_REGISTRY_REL, NEXUS_CONFIG_FILES, SPACE_SIDECAR } from '../Paths/nexusPaths'
import { basename, dirname, join } from '../Paths/posix'
import type { PropertyDefinition } from '../Properties/properties'

export const windows = process.platform === 'win32'

export const posixPath = (p: string): string => (windows ? p.replaceAll('\\', '/') : p)

export const realpathPosix = async (p: string): Promise<string> => posixPath(await realpath(p))

export const tempRoot = (prefix: string): string =>
  posixPath(realpathSync.native(mkdtempSync(`${tmpdir()}/${prefix}`)))

export const noModeBits = windows || process.getuid?.() === 0

export const readJsonAt = async <T = Record<string, unknown>>(file: string): Promise<T> =>
  JSON.parse(await readFile(file, 'utf8'))

export const putJson = async (file: string, value: unknown): Promise<void> => {
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, JSON.stringify(value, null, 2))
}

/** Each file under `dir` with its text, so a refused op shows the folder left byte-identical. */
export const bytesUnder = async (dir: string): Promise<Record<string, string>> =>
  Object.fromEntries(
    await Promise.all(
      (await listFilesRecursive(dir)).map(async (f) => [f, await readFile(f, 'utf8')]),
    ),
  )

const writers = {
  atomicWriteFile: atomicWrite.atomicWriteFile,
  rewritePreservingTimes: atomicWrite.rewritePreservingTimes,
  editJsonStrict: atomicWrite.editJsonStrict,
}

/** Refuses `name`'s write to each file `refuses` picks, and hands every other file to the real write. */
export const refuseWrites = (name: keyof typeof writers, refuses: (file: string) => boolean) => {
  const real = writers[name] as (file: string, ...rest: never[]) => Promise<unknown>
  return vi
    .spyOn(atomicWrite, name)
    .mockImplementation(((file: string, ...rest: never[]) =>
      refuses(file) ? Promise.reject(new Error('refused')) : real(file, ...rest)) as never)
}

/** A Space the tree holds: its sidecar, and its Context in the Context list when the list doesn't name it. */
export const seedSpaceSidecar = async (
  root: string,
  contextTitle: string,
  spaceName: string,
  raw: Record<string, unknown>,
): Promise<string> => {
  const registry = join(root, CONTEXTS_REGISTRY_REL)
  const { contexts } = await readJsonAt<{ contexts: { title: string }[] }>(registry).catch(() => ({
    contexts: [],
  }))
  if (!contexts.some((c) => c.title === contextTitle))
    await putJson(registry, {
      contexts: [...contexts, { id: `ctx_${contextTitle}`, title: contextTitle }],
    })
  const file = join(contextsDir(root), contextTitle, spaceName, SPACE_SIDECAR)
  await putJson(file, raw)
  return file
}

/** `assigned` maps a Collection folder, root-relative, to the property ids it assigns; its sidecar's id is the folder's own name. */
export async function seedNexus(
  root: string,
  opts: { defs?: PropertyDefinition[]; assigned?: Record<string, string[]> } = {},
): Promise<void> {
  if (opts.defs)
    await putJson(nexusConfig(root, NEXUS_CONFIG_FILES.properties), {
      order: opts.defs.map((d) => d.id),
      defs: Object.fromEntries(opts.defs.map((d) => [d.id, d])),
    })
  for (const [folder, properties] of Object.entries(opts.assigned ?? {}))
    await putJson(sidecarPath(join(root, folder), 'collection'), {
      id: basename(folder),
      properties,
    })
}
