import { createContext, useContext } from 'react'

/** A tab's view mounted in the content pane: `key` names what it shows, and a parked view stays mounted off screen while another is shown. */
export interface ContentHost {
  tabId: string
  key: string
  parked: boolean
}

export const ContentHostContext = createContext<ContentHost | null>(null)

export const useContentHost = (): ContentHost | null => useContext(ContentHostContext)
