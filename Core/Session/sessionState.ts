import type { StateCreator } from 'zustand'
import type { CacheSlice } from './cacheSlice'
import type { ChromeSlice } from './chromeSlice'
import type { GlanceSlice } from './glanceSlice'
import type { LayoutSlice } from './layoutSlice'
import type { MatrixSlice } from './matrixSlice'
import type { ConfigSlice } from './configSlice'
import type { NavigationSlice } from './navigationSlice'
import type { NexusSlice } from './nexusSlice'
import type { WindowSlice } from './windowSlice'
import type { RenameSlice } from './renameSlice'
import type { ViewSearchSlice } from './viewSearchSlice'

/** Every slice sees the whole state, so features react to each other without private channels: any slice reads and may write any field, and `nexusSlice` seeds a Nexus's state in `load` and clears it through each slice's reset. */
export type SessionState = NexusSlice &
  NavigationSlice &
  WindowSlice &
  ChromeSlice &
  LayoutSlice &
  ConfigSlice &
  RenameSlice &
  CacheSlice &
  GlanceSlice &
  MatrixSlice &
  ViewSearchSlice

export type Slice<T> = StateCreator<SessionState, [], [], T>
