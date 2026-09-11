import { pathExists } from '../Files/atomicWrite'
import { recordWrite } from '../Files/writeEcho'
import { ASSETS_DIR_REL, CONTEXTS_DIR_REL, NEXUS_DIR } from '../Paths/nexusPaths'
import { NEXUS_CONFIG_FILES, contextsRegistryFile, nexusConfig, tileHostDir } from '../Paths/paths'
import { join } from '../Paths/posix'
import { machine } from '../Platform/machine'

async function migrateFile(oldAbs: string, newAbs: string): Promise<void> {
  if (!(await pathExists(oldAbs))) return
  if (await pathExists(newAbs)) {
    recordWrite(oldAbs)
    await machine().remove(oldAbs)
    return
  }
  recordWrite(oldAbs)
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
