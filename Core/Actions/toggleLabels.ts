// Wording only: which state a control is in stays with the menu or surface that knows.

export const openLabel = (alreadyOpen?: boolean): string => (alreadyOpen ? 'Open' : 'New Tab')

export const pinLabel = (pinned?: boolean): string => (pinned ? 'Unpin' : 'Pin')

export const shownLabel = (shown: boolean, noun: string): string =>
  `${shown ? 'Hide' : 'Show'} ${noun}`

export const lockLabel = (locked: boolean, noun?: string): string => {
  const verb = locked ? 'Unlock' : 'Lock'
  return noun ? `${verb} ${noun}` : verb
}
