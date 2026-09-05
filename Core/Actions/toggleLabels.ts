// The wording a two-state control wears, stated once per control.
//
// Most of these read in more than one place — a native menu row, an in-app menu model, and the
// button or aria-label for the same act — and each site would otherwise carry its own ternary over
// its own predicate. Two of them already had: one spelled the icon toggle over `iconShown` and the
// other over `iconHidden`, which agree only for as long as nobody edits one of them. The rest sit
// here so a menu built from several of them reads as one vocabulary rather than a mix of a shared
// call and a hand-written twin.
//
// Only wording lives here. Which state a control is in, and what it does about it, stay with the
// menu or the surface that knows.

/** A surface that cannot tell whether the target is already open passes nothing, and the row reads
 *  as the new tab it will land. */
export const openLabel = (alreadyOpen?: boolean): string => (alreadyOpen ? 'Open' : 'Open New Tab')

export const pinLabel = (pinned?: boolean): string => (pinned ? 'Unpin' : 'Pin')

export const favoriteLabel = (favorited: boolean): string => (favorited ? 'Unfavorite' : 'Favorite')

export const iconLabel = (iconShown: boolean): string => (iconShown ? 'Hide Icon' : 'Show Icon')

/** The lock verb, and the same verb naming what it acts on — a menu row says "Unlock", the button
 *  beside it announces "Unlock tile". */
export const lockLabel = (locked: boolean, noun?: string): string => {
  const verb = locked ? 'Unlock' : 'Lock'
  return noun ? `${verb} ${noun}` : verb
}

export const footerLabel = (shown: boolean): string => (shown ? 'Hide footer' : 'Show footer')

export const citationsLabel = (shown: boolean): string =>
  shown ? 'Hide Footnotes' : 'Show Footnotes'
