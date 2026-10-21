import { pageKey } from '../Connections/pageIndex'
import type { BundleRow } from '../Bundles/rows'
import type { CascadeChange } from '../Nexus/cascade'
import type { PageDetail } from '../Pages/pageDetail'
import { matchKey } from '../Paths/caseFold'
import { machine } from '../Platform/machine'
import type { DeviceRecord } from '../Sync/Contract/wire'

export function deviceRecord(overrides: Partial<DeviceRecord> = {}): DeviceRecord {
  return {
    id: 'aaaaaaaaaaaaaaaa',
    publicKey: 'pk-a',
    name: 'Air',
    approved: true,
    role: 'editor',
    ...overrides,
  }
}

export function detail(overrides: Partial<PageDetail> = {}): PageDetail {
  const body = overrides.body ?? ''
  return {
    id: 'p1',
    title: 'Page',
    path: 'Notes/Page.md',
    frontmatter: {},
    body,
    bodyHash: machine().sha256Hex(body),
    ...overrides,
  }
}

export function bundleRow(over: Partial<BundleRow> = {}): BundleRow {
  const { title = 'Alpha', crumbs = [{ kind: 'collection', title: 'Notes' }] } = over
  return {
    bundlePath: `.trash/${over.title ?? 'x'}.deleted`,
    kind: 'page',
    title,
    crumbs,
    storedAt: 0,
    homeResolves: true,
    match: matchKey(title, crumbs.map((c) => c.title).join('/')),
    ...over,
  }
}

export function titled(title: string, to: string): CascadeChange {
  return { names: new Map([[pageKey(title), to]]), label: title }
}
