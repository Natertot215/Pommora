import { mkdtemp, realpath } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describeMachine } from '@pommora/core/Testing/machineContract'
import { nodeMachine } from './nodeMachine'

describeMachine('nodeMachine', async () => ({
  machine: nodeMachine,
  root: await realpath(await mkdtemp(join(tmpdir(), 'pom-node-machine-'))),
}))
