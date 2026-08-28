import type { StateCreator } from 'zustand'
import type { CacheSlice } from './CacheSlice'
import type { ChromeSlice } from './ChromeSlice'
import type { ConfigSlice } from './ConfigSlice'
import type { NavigationSlice } from './NavigationSlice'
import type { NexusSlice } from './NexusSlice'
import type { PreviewSlice } from './PreviewSlice'
import type { RenameSlice } from './RenameSlice'

/** The renderer's one shared room: every slice sees the whole state, so features react to each
 *  other without private channels. A slice owns its fields and their writers; what it needs of
 *  another slice it asks for through that slice's actions. */
export type SessionState = NexusSlice &
  NavigationSlice &
  PreviewSlice &
  ChromeSlice &
  ConfigSlice &
  RenameSlice &
  CacheSlice

export type Slice<T> = StateCreator<SessionState, [], [], T>
