import { mkdtemp, realpath } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describeMachine } from './machineContract'
import { diskMachine, memoryMachine } from './machines'
import { memoryStores } from './memoryStores'
import {
  describeContentIndexStore,
  describeKeyValueStore,
  describeSnapshotStore,
} from './storesContract'

describeMachine('memoryMachine', async () => ({
  machine: memoryMachine().machine,
  root: join(tmpdir(), 'pom-mem-machine'),
}))

describeMachine('diskMachine', async () => ({
  machine: diskMachine(),
  root: await realpath(await mkdtemp(join(tmpdir(), 'pom-disk-machine-'))),
}))

describeKeyValueStore('memoryStores key-value', () => memoryStores().stores.keyValue!)
describeContentIndexStore('memoryStores content index', () => memoryStores().stores.contentIndex!)
describeSnapshotStore('memoryStores snapshots', () => memoryStores().stores.snapshots!)
