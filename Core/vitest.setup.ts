import '../UIX/vitest.setup'
import { nodeMachine } from '@pommora/desktop/Platform/nodeMachine'
import { installMachine } from './Platform/machine'

installMachine(nodeMachine)
