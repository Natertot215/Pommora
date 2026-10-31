import { machine } from '../Platform/machine'
import { readLiveSetting } from '../Settings/settings'
import { noteOwn, recordWrite } from '../Files/writeEcho'

/** Gives a file or folder up for good: to the system trash, or erased while Permanently Delete Files is on. */
export async function discard(root: string, abs: string): Promise<void> {
  recordWrite(abs)
  if (await readLiveSetting(root, 'permanentDelete')) await machine().remove(abs)
  else
    await (machine().trashToSystem?.(abs) ??
      Promise.reject(new Error('This host has no system trash.')))
  await noteOwn({ event: 'unlink', absPath: abs, origin: 'own' })
}
