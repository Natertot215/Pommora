import { tempRoot } from '@pommora/core/Testing/hostFs'
import { describeMachine } from '@pommora/core/Testing/machineContract'
import { nodeMachine } from './nodeMachine'

describeMachine('nodeMachine', async () => ({
  machine: nodeMachine,
  root: tempRoot('pom-node-machine-'),
}))
