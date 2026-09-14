import { realpathPosix, tempRoot } from './hostFs'
import { describeMachine } from './machineContract'
import { diskMachine, memoryMachine } from './machines'
import { memoryStores } from './memoryStores'
import {
  describeCaptureStore,
  describeContentIndexStore,
  describeKeyValueStore,
  describeSnapshotStore,
  describeSyncStore,
} from './storesContract'

describeMachine('memoryMachine', async () => ({
  machine: memoryMachine().machine,
  root: tempRoot('pom-mem-machine-'),
}))

describeMachine('diskMachine', async () => ({
  machine: diskMachine(),
  root: await realpathPosix(tempRoot('pom-disk-machine-')),
}))

describeKeyValueStore('memoryStores key-value', () => memoryStores().stores.keyValue!)
describeContentIndexStore('memoryStores content index', () => memoryStores().stores.contentIndex!)
describeSnapshotStore('memoryStores snapshots', () => memoryStores().stores.snapshots!)
describeSyncStore('memoryStores sync bases', () => memoryStores().stores.sync!)
describeCaptureStore('memoryStores captures', () => memoryStores().stores.captures!)
