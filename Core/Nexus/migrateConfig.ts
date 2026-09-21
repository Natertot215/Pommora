import { pathExists, rmwJsonStrict } from '../Files/atomicWrite'
import { listPathsUnder } from '../Files/walk'
import { recordWrite } from '../Files/writeEcho'
import { ASSETS_DIR_REL, CONTEXTS_DIR_REL, NEXUS_DIR, NON_CORPUS_TOP } from '../Paths/nexusPaths'
import {
  NEXUS_CONFIG_FILES,
  SIDECARS,
  contextsRegistryFile,
  nexusConfig,
  tileHostDir,
} from '../Paths/paths'
import { join } from '../Paths/posix'
import { machine } from '../Platform/machine'

async function migrateFile(oldAbs: string, newAbs: string): Promise<void> {
  if (!(await pathExists(oldAbs))) return
  recordWrite(oldAbs)
  if (await pathExists(newAbs)) {
    await machine().remove(oldAbs)
    return
  }
  recordWrite(newAbs)
  await machine().rename(oldAbs, newAbs)
}

export async function ensureConfigLayout(root: string): Promise<void> {
  await machine().mkdir(join(root, ASSETS_DIR_REL))
  await machine().mkdir(join(root, CONTEXTS_DIR_REL))
  await machine().mkdir(tileHostDir(root))
  await migrateFile(
    join(root, NEXUS_DIR, 'crops.json'),
    nexusConfig(root, NEXUS_CONFIG_FILES.crops),
  )
  await migrateFile(
    join(root, NEXUS_DIR, 'homepage.json'),
    nexusConfig(root, NEXUS_CONFIG_FILES.homepage),
  )
  await migrateFile(join(root, NEXUS_DIR, 'contexts.json'), contextsRegistryFile(root))
}

// A one-time normalization: `card_banner` spelled its banner mode `image` before the key and the mode were told apart.
// The parser reads the old spelling through, so this only settles what is written down; it can go once no nexus carries it.
function renamedBanner(meta: Record<string, unknown>): Record<string, unknown> | null {
  const views = meta.views
  if (!Array.isArray(views)) return null
  let found = false
  const next = views.map((v) => {
    if (!v || typeof v !== 'object' || (v as Record<string, unknown>).card_banner !== 'image')
      return v
    found = true
    return { ...(v as Record<string, unknown>), card_banner: 'banner' }
  })
  return found ? { ...meta, views: next } : null
}

export async function normalizeSavedViews(root: string): Promise<void> {
  const sidecars = await listPathsUnder(root, root, (rel, kind) => {
    const segs = rel.split('/')
    if (NON_CORPUS_TOP.has(segs[0])) return false
    return kind === 'dir' || SIDECARS.has(segs[segs.length - 1])
  })
  for (const rel of sidecars) {
    const abs = join(root, rel)
    await rmwJsonStrict(abs, (meta) => {
      const next = renamedBanner(meta)
      if (next !== null) recordWrite(abs)
      return next
    })
  }
}
