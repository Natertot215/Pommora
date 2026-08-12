// The page context-menu meta block (Open · Rename · Change Icon · Delete) — shared by the table
// cell's title menu (cellMenu), the card's right-click menu (cardMenu), and the row grip's menu
// (rowGripMenu) so the page-meta actions stay single-sourced. An already-open page reads "Open"
// (focus its tab) rather than "Open New Tab". Each consumer names its item set explicitly —
// the extras render only where they're requested, so no menu carries an action its router
// doesn't serve.

export type PageMetaAction =
  | 'title:preview'
  | 'title:newtab'
  | 'title:rename'
  | 'title:icon'
  | 'title:newabove'
  | 'title:newbelow'
  | 'title:delete'

export function pageMetaMenuItems(
  alreadyOpen?: boolean,
  // `newPages`: 'pair' offers Above/Below (row surfaces); 'single' offers one "New Page" whose
  // action is the flow-after (Below) path — a grid has no above.
  opts: { preview?: boolean; newPages?: 'pair' | 'single' } = {},
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
    { label: 'Delete', action: 'title:delete', separatorBefore: true },
  ]
}
