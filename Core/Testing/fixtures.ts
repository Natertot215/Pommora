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
