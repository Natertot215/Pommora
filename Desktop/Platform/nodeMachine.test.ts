import { realpathPosix, tempRoot } from '@pommora/core/Testing/hostFs'
import { describeMachine } from '@pommora/core/Testing/machineContract'
import { nodeMachine } from './nodeMachine'

describeMachine('nodeMachine', async () => ({
  machine: nodeMachine,
  root: await realpathPosix(tempRoot('pom-node-machine-')),
}))
