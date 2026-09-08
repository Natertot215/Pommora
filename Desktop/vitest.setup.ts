import '../Core/vitest.setup'
import { installMachine } from '@pommora/core/Platform/machine'
import { nodeMachine } from './Platform/nodeMachine'

installMachine(nodeMachine)
