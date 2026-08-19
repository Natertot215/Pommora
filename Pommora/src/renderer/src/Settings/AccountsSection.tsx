// The General ▸ Accounts rows: the recorded web accounts, Add Account, and the one honest
// clear-everything. Rows are recorded at Add Account (the cookie store cannot distinguish
// signed-in from visited), so an abandoned sign-in leaves an unauthenticated row Sign Out
// removes. Add Account summons the in-app browser directly — knob-independent, because a
// default install must not route sign-in to a browser whose cookies miss the partition.
import { useEffect, useRef, useState } from 'react'
import { cx } from '@renderer/design-system/cx'
import { text } from '@renderer/design-system/tokens'
import { AccessoryButton } from '@renderer/design-system/components/menu/Menu'
import { TextPicker } from '@renderer/design-system/components/TextPicker/TextPicker'
import type { WebAccount } from '@shared/types'
import { openInAppBrowser } from '../PagePreview/BrowserWindow'

export function AccountsSection(): React.JSX.Element {
  const [accounts, setAccounts] = useState<WebAccount[]>([])
  const [adding, setAdding] = useState(false)
  const addRef = useRef<HTMLDivElement | null>(null)

  const refresh = (): void => {
    void window.nexus.webAccounts.list().then((r) => {
      if (r.ok) setAccounts(r.value)
    })
  }
  useEffect(refresh, [])

  const add = (raw: string): void => {
    const typed = raw.trim()
    if (!typed) return
    const url = /^https?:\/\//i.test(typed) ? typed : `https://${typed}`
    setAdding(false)
    void window.nexus.webAccounts.add(url).then((r) => {
      if (!r.ok) return
      refresh()
      openInAppBrowser(url)
    })
  }

  const signOut = (domain: string): void => {
    void window.nexus.webAccounts.signOut(domain).then(refresh)
  }

  const clearBrowsing = (): void => {
    void window.nexus.webAccounts.clearBrowsing().then(refresh)
  }

  return (
    <>
      {accounts.map((a) => (
        <div key={a.domain} className="settings-row">
          <div className="settings-row-text">
            <span className={cx('settings-row-label', text.body.standard)}>{a.name}</span>
            <span className={cx('settings-row-hint', text.footnote.standard)}>{a.domain}</span>
          </div>
          <button
            type="button"
            className={cx('settings-action', text.footnote.standard)}
            onClick={() => signOut(a.domain)}
          >
            Sign Out
          </button>
        </div>
      ))}
      <div className="settings-row" ref={addRef}>
        <div className="settings-row-text">
          <span className={cx('settings-row-label', text.body.standard)}>Add Account</span>
          <span className={cx('settings-row-hint', text.footnote.standard)}>
            Sign into a site once; every embedded page shares the session.
          </span>
        </div>
        <AccessoryButton
          icon="plus"
          size={12}
          box={20}
          create
          ariaLabel="Add Account"
          onClick={() => setAdding(true)}
        />
        <TextPicker
          open={adding}
          onDismiss={() => setAdding(false)}
          triggerRef={addRef}
          value=""
          onCommit={add}
        />
      </div>
      <div className="settings-row">
        <div className="settings-row-text">
          <span className={cx('settings-row-label', text.body.standard)}>Clear Browsing Data</span>
          <span className={cx('settings-row-hint', text.footnote.standard)}>
            Wipes every embedded page's storage — accounts and their rows included.
          </span>
        </div>
        <button
          type="button"
          className={cx('settings-action', text.footnote.standard)}
          onClick={clearBrowsing}
        >
          Clear
        </button>
      </div>
    </>
  )
}
