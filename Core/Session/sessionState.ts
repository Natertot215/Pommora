import type { StateCreator } from 'zustand'
import type { CacheSlice } from './cacheSlice'
import type { ChromeSlice } from './chromeSlice'
import type { LayoutSlice } from './layoutSlice'
import type { ConfigSlice } from './configSlice'
import type { NavigationSlice } from './navigationSlice'
import type { NexusSlice } from './nexusSlice'
import type { WindowSlice } from './windowSlice'
import type { RenameSlice } from './mutationSlice'

/** Every slice sees the whole state, so features react to each other without private channels. A slice owns its fields and their writers; what it needs of another slice it asks for through that slice's actions. */
export type SessionState = NexusSlice &
  NavigationSlice &
  WindowSlice &
  ChromeSlice &
  LayoutSlice &
  ConfigSlice &
  RenameSlice &
  CacheSlice

export type Slice<T> = StateCreator<SessionState, [], [], T>
