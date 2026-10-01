import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { tempRoot } from '../Testing/hostFs'
import { dropLiveTree, getLiveTree, refreshTree } from './liveTree'
import { patchContainerFromDisk } from './watchPatch'
import { findContainerWhere } from './treePatch'
import type { CollectionNode, SetNode } from './tree'
import { openSession } from './session'

const ULID_A = '01ARZ3NDEKPSV4RRFFQ69G5FAV'
const ULID_B = '01BX5ZZKBKPCTAV9WEVGEMMVRZ'

let root: string

const abs = (...segs: string[]): string => join(root, ...segs)

// A sidecar-mode nexus with one Collection (one page), one Context group with one Space, an empty folder, and a loose note at the Nexus root — the live tree's whole vocabulary in miniature.
beforeEach(async () => {
  root = tempRoot('pom-watch-')
  await openSession(root)
  await mkdir(abs('.nexus', 'contexts', 'Areas', 'Home'), { recursive: true })
  await mkdir(abs('.nexus', 'assets'), { recursive: true })
  await mkdir(abs('.nexus', 'homepage'), { recursive: true })
  await writeFile(abs('.nexus', 'nexus.json'), JSON.stringify({ id: 'nx1' }))
  await writeFile(
    abs('.nexus', 'contexts', 'contexts.json'),
    JSON.stringify({ contexts: [{ id: 'ctx1', title: 'Areas' }] }),
  )
  await writeFile(
    abs('.nexus', 'contexts', 'Areas', 'Home', '_space.json'),
    JSON.stringify({ id: 'sp1' }),
  )
  await mkdir(abs('Notes'), { recursive: true })
  await writeFile(abs('Notes', '_pagecollection.json'), JSON.stringify({ id: 'c1' }))
  await writeFile(abs('Notes', 'A.md'), `---\nID: ${ULID_A}\n---\n\nalpha\n`)
  await mkdir(abs('Loose'), { recursive: true })
  await writeFile(abs('note.md'), 'links [[A]]\n')
})
afterEach(async () => {
  dropLiveTree()
  await rm(root, { recursive: true, force: true })
})

// The walk and the watch patch each decode a container sidecar's meta. A field added to one alone would go red here.
describe('the two container mappers agree', () => {
  const SET_A = '01ARZ3NDEKPSV4RRFFQ69G5S0A'
  const SET_B = '01ARZ3NDEKPSV4RRFFQ69G5S0B'
  const view = (id: string): Record<string, unknown> => ({
    id,
    name: id,
    type: 'table',
    property_order: ['_title'],
    hidden_properties: [],
  })
  const nine = (node: CollectionNode | SetNode | null): Record<string, unknown> | null =>
    node && {
      icon: node.icon,
      banner: node.banner,
      headingIconHidden: node.headingIconHidden,
      sets: node.sets,
      pages: node.pages,
      views: node.views,
      viewButton: node.viewButton,
      disclosureLocked: node.disclosureLocked,
      activeView: node.activeView,
    }
  const notes = (): CollectionNode | SetNode | null => {
    const tree = getLiveTree()
    return tree ? findContainerWhere(tree, (n) => n.path === 'Notes') : null
  }

  beforeEach(async () => {
    await mkdir(abs('Notes', 'One'), { recursive: true })
    await mkdir(abs('Notes', 'Two'), { recursive: true })
    await writeFile(abs('Notes', 'One', '_pageset.json'), JSON.stringify({ id: SET_A }))
    await writeFile(abs('Notes', 'Two', '_pageset.json'), JSON.stringify({ id: SET_B }))
    await writeFile(abs('Notes', 'B.md'), `---\nID: ${ULID_B}\n---\n\nbeta\n`)
    await writeFile(
      abs('Notes', '_pagecollection.json'),
      JSON.stringify({
        id: 'c1',
        icon: 'folder',
        banner: 'Loose/b.png',
        heading_icon_hidden: true,
        set_order: [SET_B, SET_A],
        page_order: [ULID_B, ULID_A],
        views: [view('view_x'), view('view_y')],
        view_button: 'labeled',
        disclosure_locked: true,
        active_view: 'view_y',
        property_cache: { prop_related: { values: { [ULID_B]: '[[Alpha]]' } } },
      }),
    )
  })

  it('the walk decodes every field the sidecar carries', async () => {
    await refreshTree(root)
    expect(nine(notes())).toEqual({
      icon: 'folder',
      banner: 'Loose/b.png',
      headingIconHidden: true,
      sets: [expect.objectContaining({ id: SET_B }), expect.objectContaining({ id: SET_A })],
      pages: [expect.objectContaining({ id: ULID_B }), expect.objectContaining({ id: ULID_A })],
      views: [expect.objectContaining({ id: 'view_x' }), expect.objectContaining({ id: 'view_y' })],
      viewButton: 'labeled',
      disclosureLocked: true,
      activeView: 'view_y',
    })
  })

  // Whole nodes rather than a projection: a field added to one mapper alone is only caught by comparing everything the node carries.
  it('the watch patch decodes to exactly what the walk produced, field for field', async () => {
    await refreshTree(root)
    const walked = structuredClone(notes())
    expect(await patchContainerFromDisk(root, 'Notes')).toBe('ok')
    const patched = notes()
    expect(patched?.activeView).toBe('view_y')
    expect(patched).toMatchObject({ cached: ['prop_related'] })
    expect(patched).toEqual(walked)
  })
})
