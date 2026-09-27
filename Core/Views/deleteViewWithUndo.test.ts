// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { rm, writeFile } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { readJsonAt, tempRoot } from '../Testing/hostFs'
import type { CollectionNode } from '../Nexus/tree'
import type { RemovedView, SavedView } from './views'
import { deleteView, restoreView } from './viewsFile'
import { deleteViewWithUndo } from './deleteViewWithUndo'
import { currentNotification } from '../Interface/Notifications/notifications'
import { useSession } from '../Session/store'
import { stubDialer } from '../vitest.setup'

const view = (id: string): SavedView => ({
  id,
  name: id.toUpperCase(),
  type: 'table',
  property_order: [],
  hidden_properties: [],
})

let folder: string
beforeEach(async () => {
  folder = tempRoot('pom-view-undo-')
  await writeFile(
    join(folder, '_pagecollection.json'),
    JSON.stringify({ id: 'col', views: [view('view_a'), view('view_b')], active_view: 'view_a' }),
  )
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    'views:delete': (_p: string, _k: string, id: string) => deleteView(folder, 'collection', id),
    'views:restore': (_p: string, _k: string, removed: RemovedView) =>
      restoreView(folder, 'collection', removed),
  })
  useSession.setState({ askConfirm: vi.fn(async () => true) as never })
})
afterEach(async () => {
  await rm(folder, { recursive: true, force: true })
})

const source = { kind: 'collection', id: 'col', path: 'Col' } as CollectionNode
const sidecar = async () =>
  (await readJsonAt(join(folder, '_pagecollection.json'))) as {
    views: SavedView[]
    active_view?: string
  }

describe('deleteViewWithUndo', () => {
  it("the notice's Undo seats the view back in its place and re-selects it", async () => {
    expect(await deleteViewWithUndo(source, view('view_a'))).toBe(true)
    expect((await sidecar()).views.map((v) => v.id)).toEqual(['view_b'])
    currentNotification()?.action?.run()
    await vi.waitFor(async () => {
      const back = await sidecar()
      expect(back.views.map((v) => v.id)).toEqual(['view_a', 'view_b'])
      expect(back.active_view).toBe('view_a')
    })
  })

  it('deletes nothing when the confirmation is declined', async () => {
    useSession.setState({ askConfirm: vi.fn(async () => false) as never })
    expect(await deleteViewWithUndo(source, view('view_a'))).toBe(false)
    expect((await sidecar()).views).toHaveLength(2)
  })
})
