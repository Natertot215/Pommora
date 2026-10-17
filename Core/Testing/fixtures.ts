import { pageKey } from '../Connections/pageIndex'
import type { CascadeChange } from '../Connections/rewrite'
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

export function titled(title: string, to: string): CascadeChange {
  return { names: new Map([[pageKey(title), to]]), label: title }
}
