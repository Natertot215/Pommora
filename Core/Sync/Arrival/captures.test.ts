import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from '../../Paths/posix'
import { tempRoot } from '../../Testing/hostFs'
import { memoryStores } from '../../Testing/memoryStores'
import { dropLiveTree, refreshTree } from '../../Nexus/liveTree'
import { installStores, NO_STORES, snapshotStore } from '../../Platform/stores'
import { resetFileHistory } from '../../Pages/fileHistory'
import { captureLoser } from './captures'

const PAGE = '01ARZ3NDEKPSV4RRFFQ69G5FAV'

let root: string
let mem: ReturnType<typeof memoryStores>
const abs = (...segs: string[]): string => join(root, ...segs)
const utf8 = (text: string): Uint8Array => new TextEncoder().encode(text)
const page = (body: string): string => `---\nID: ${PAGE}\n---\n${body}`

const settle = async (personalization: Record<string, unknown> = {}): Promise<void> => {
  await writeFile(abs('.nexus', 'settings.json'), JSON.stringify({ personalization }))
  await refreshTree(root)
}

beforeEach(async () => {
  root = tempRoot('pom-captures-')
  await mkdir(abs('.nexus'), { recursive: true })
  await writeFile(abs('.nexus', 'nexus.json'), JSON.stringify({ id: 'nx1' }))
  await mkdir(abs('Notes'), { recursive: true })
  await writeFile(abs('Notes', '_pagecollection.json'), JSON.stringify({ id: 'c1' }))
  await settle()
  mem = memoryStores()
  installStores(mem.stores)
})

afterEach(async () => {
  resetFileHistory()
  installStores(NO_STORES)
  dropLiveTree()
  await rm(root, { recursive: true, force: true })
})

describe('captureLoser', () => {
  it('captures a sidecar with File History off', async () => {
    await settle({ fileHistory: false })
    const added = vi.spyOn(mem.stores.captures!, 'addCapture')
    await captureLoser(root, 'Notes/_pagecollection.json', utf8('{"id":"c1"}'), 'remote-lost')
    expect(added).toHaveBeenCalledTimes(1)
    expect(added.mock.calls[0][0]).toBe('Notes/_pagecollection.json')
    expect(added.mock.calls[0][2]).toBe('remote-lost')
  })

  it('captures a page into both stores with File History on', async () => {
    const added = vi.spyOn(mem.stores.captures!, 'addCapture')
    await captureLoser(root, 'Notes/A.md', utf8(page('lost body\n')), 'local-lost')
    expect(added).toHaveBeenCalledTimes(1)
    expect(snapshotStore()!.listSnapshots(PAGE).map((r) => r.source)).toEqual(['external'])
  })

  it('captures a page into captures alone with File History off', async () => {
    await settle({ fileHistory: false })
    const added = vi.spyOn(mem.stores.captures!, 'addCapture')
    await captureLoser(root, 'Notes/A.md', utf8(page('lost body\n')), 'merge-lost')
    expect(added).toHaveBeenCalledTimes(1)
    expect(snapshotStore()!.listSnapshots(PAGE)).toEqual([])
  })
})
