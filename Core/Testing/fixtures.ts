import { pageKey } from '../Connections/pageIndex'
import { type BundleRow, matched } from '../Bundles/rows'
import { mintBundle } from '../Bundles/bundle'
import { type RecordFile, writeRecord } from '../Bundles/record'
import { join } from '../Paths/posix'
import type { CascadeChange } from '../Nexus/cascade'
import type { PageDetail } from '../Pages/pageDetail'
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
  const { title = 'Alpha' } = over
  return matched({
    bundlePath: `.trash/${title}.deleted`,
    kind: 'page',
    title,
    crumbs: [{ kind: 'collection', title: 'Notes' }],
    storedAt: 0,
    homeResolves: true,
    ...over,
  })
}

export async function seedPropertyBundle(
  root: string,
  record: Extract<RecordFile, { entity: 'property' }>,
): Promise<string> {
  const bundle = await mintBundle(root, { kind: 'trash' }, join(root, `property-${record.id}`))
  await writeRecord(bundle, record)
  return bundle
}

export function titled(title: string, to: string): CascadeChange {
  return { names: new Map([[pageKey(title), to]]), label: title }
}
