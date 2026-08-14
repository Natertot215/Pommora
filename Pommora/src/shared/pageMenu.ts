// The page context-menu meta block (Open · Rename · Change Icon · Delete) — shared by the table
// cell's title menu (cellMenu), the card's right-click menu (cardMenu), and the row grip's menu
// (rowGripMenu) so the page-meta actions stay single-sourced. An already-open page reads "Open"
// (focus its tab) rather than "Open New Tab". Each consumer names its item set explicitly —
// the extras render only where they're requested, so no menu carries an action its router
// doesn't serve.

/** What Copy Link puts on the clipboard: the connection syntax that reaches this page from any
 *  MarkdownPM surface, so a copied page pastes as a working link rather than as its name. */
export function pageLinkText(title: string): string {
  return `[[${title}]]`
}

/** What Copy Path puts on the clipboard: the page's location read from the nexus root, with the
 *  extension dropped — the form a person names a page by, not the form the disk stores it under. */
export function pagePathText(nexusRelativePath: string): string {
  return nexusRelativePath.replace(/\.md$/i, '')
}

export type PageMetaAction =
  | 'title:preview'
  | 'title:newtab'
  | 'title:rename'
  | 'title:icon'
  | 'title:newabove'
  | 'title:newbelow'
  | 'title:copylink'
  | 'title:copypath'
  | 'title:reveal'
  | 'title:delete'

/** The two actions a surface can offer for a page it only points at — a tab, a connection — since
 *  neither asks anything of the page but its name and where it sits. */
export type PageClipboardAction = Extract<PageMetaAction, 'title:copylink' | 'title:copypath'>

export const PAGE_CLIPBOARD_ACTIONS = [
  'title:copylink',
  'title:copypath',
] as const satisfies readonly PageClipboardAction[]

export function pageMetaMenuItems(
  alreadyOpen?: boolean,
  // `newPages`: 'pair' offers Above/Below (row surfaces); 'single' offers one "New Page" whose
  // action is the flow-after (Below) path — a grid has no above.
  // `clipboard` and `reveal` are separate because they cost different things: copying a page's link
  // or path needs nothing but the page, where revealing it needs the filesystem underneath.
  opts: {
    preview?: boolean
    newPages?: 'pair' | 'single'
    clipboard?: boolean
    reveal?: boolean
  } = {},
): Array<{ label: string; action: PageMetaAction; separatorBefore?: boolean }> {
  return [
    ...(opts.preview ? [{ label: 'Open Preview', action: 'title:preview' as const }] : []),
    { label: alreadyOpen ? 'Open' : 'Open New Tab', action: 'title:newtab' },
    { label: 'Rename', action: 'title:rename', separatorBefore: true },
    { label: 'Change Icon', action: 'title:icon' },
    ...(opts.newPages === 'pair'
      ? [
          { label: 'New Page Above', action: 'title:newabove' as const, separatorBefore: true },
          { label: 'New Page Below', action: 'title:newbelow' as const },
        ]
      : []),
    ...(opts.newPages === 'single'
      ? [{ label: 'New Page', action: 'title:newbelow' as const, separatorBefore: true }]
      : []),
    ...(opts.clipboard
      ? [
          { label: 'Copy Link', action: 'title:copylink' as const, separatorBefore: true },
          { label: 'Copy Path', action: 'title:copypath' as const },
        ]
      : []),
    ...(opts.reveal
      ? [
          {
            label: 'Reveal Location',
            action: 'title:reveal' as const,
            separatorBefore: !opts.clipboard,
          },
        ]
      : []),
    { label: 'Delete', action: 'title:delete', separatorBefore: true },
  ]
}

/** A narrower menu drawn from the same list — the actions stay in the order the full menu gives
 *  them, so a surface offering four of them can't come to disagree with one offering ten. A
 *  separator that would lead the result is dropped, since it separates nothing. */
export function pageMetaMenuSubset<A extends PageMetaAction>(
  actions: readonly A[],
  alreadyOpen?: boolean,
): Array<{ label: string; action: A; separatorBefore?: boolean }> {
  const kept = pageMetaMenuItems(alreadyOpen, {
    preview: true,
    newPages: 'pair',
    clipboard: true,
    reveal: true,
  }).filter((i): i is { label: string; action: A; separatorBefore?: boolean } =>
    (actions as readonly PageMetaAction[]).includes(i.action),
  )
  return kept.map((item, i) => (i === 0 ? { ...item, separatorBefore: undefined } : item))
}
