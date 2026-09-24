// Wording only: which state a control is in stays with the menu or surface that knows.

export const openLabel = (alreadyOpen?: boolean): string => (alreadyOpen ? 'Open' : 'New Tab')

export const pinLabel = (pinned?: boolean): string => (pinned ? 'Unpin' : 'Pin')

export const iconLabel = (iconShown: boolean): string => (iconShown ? 'Hide Icon' : 'Show Icon')

export const viewsLabel = (viewsShown: boolean): string =>
  viewsShown ? 'Hide Views' : 'Show Views'

export const lockLabel = (locked: boolean, noun?: string): string => {
  const verb = locked ? 'Unlock' : 'Lock'
  return noun ? `${verb} ${noun}` : verb
}

export const footerLabel = (shown: boolean): string => (shown ? 'Hide Footer' : 'Show Footer')

export const citationsLabel = (shown: boolean): string =>
  shown ? 'Hide Footnotes' : 'Show Footnotes'
