import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@pommora/uix/Buttons/Button'
import { InputField } from '@pommora/uix/Fields/InputField'
import { placeholder } from '@pommora/uix/Fields/fields.css'
import { MenuRowView } from '@pommora/uix/Menus'
import type { Result } from '@pommora/core/Contract/result'
import type { SyncBinding, SyncState } from '@pommora/core/Sync/contract'
import { SettingsFieldRow } from './SettingsFieldRow'
import { useSession } from '../Session/store'
import * as x from './exclusion-rows.css'
import { host } from '../Platform/dialer'

const fingerprint = (id: string): string => id.slice(0, 12)

const captionFor = (binding: SyncBinding): string => {
  switch (binding.state) {
    case 'approved':
      return 'Approved'
    case 'pending':
      return 'Awaiting approval from an approved device'
    case 'unreachable':
      return `Unreachable: ${binding.why}`
  }
}

export function NexusRows(): React.JSX.Element | null {
  const nexusId = useSession((s) => s.tree?.nexus.id ?? '')
  const [state, setState] = useState<SyncState | null>(null)
  const [draft, setDraft] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false)

  // One channel in flight at a time: each reply is the whole state, so a second call would answer from a list the first has already replaced.
  const run = useCallback(async (ask: () => Promise<Result<SyncState>>): Promise<boolean> => {
    if (inFlight.current) return false
    inFlight.current = true
    setBusy(true)
    try {
      const r = await ask()
      if (r.ok) setState(r.value)
      else await host().ask('error:show', r.error.message)
      return r.ok
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }, [])

  const refresh = useCallback((): void => {
    void run(() => host().ask('sync:state'))
  }, [run])

  useEffect(() => {
    refresh()
  }, [refresh])

  if (state === null) return null

  const binding = state.binding
  const address = draft ?? binding?.address ?? ''
  const devices = binding?.state === 'approved' ? binding.devices : []

  const onConnect = async (): Promise<void> => {
    if (await run(() => host().ask('sync:connect', address))) setDraft(null)
  }

  const connect = (
    <Button
      type="filled"
      label="Connect"
      disabled={busy || address === ''}
      onClick={() => void onConnect()}
    />
  )

  return (
    <>
      <SettingsFieldRow label="This Device" hint={fingerprint(state.device.id)}>
        <InputField
          label="Device name"
          edit={{
            value: state.device.name,
            onCommit: (next) => void run(() => host().ask('sync:renameDevice', next)),
          }}
        >
          {state.device.name}
        </InputField>
      </SettingsFieldRow>
      <SettingsFieldRow label="Nexus ID">
        <span className={x.count}>{nexusId}</span>
      </SettingsFieldRow>
      <SettingsFieldRow label="Server" hint={binding ? captionFor(binding) : undefined}>
        <span className={x.manageCluster}>
          <InputField
            label="Server address"
            edit={{ value: address, onCommit: setDraft, renames: 'row', emptyCommits: true }}
          >
            {address === '' ? <span className={placeholder}>No server</span> : address}
          </InputField>
          {binding?.state !== 'approved' && connect}
          {binding !== null && (
            <>
              <Button type="base" label="Refresh" disabled={busy} onClick={refresh} />
              <Button
                type="base"
                label="Disconnect"
                disabled={busy}
                onClick={() => void run(() => host().ask('sync:disconnect'))}
              />
            </>
          )}
        </span>
      </SettingsFieldRow>
      {devices.map((device) => {
        const own = device.id === state.device.id
        const revoking = device.approved
        return (
          <MenuRowView
            key={device.id}
            row={{
              kind: 'item',
              label: device.name,
              caption: `${fingerprint(device.id)} · ${revoking ? 'Approved' : 'Pending'}`,
              trailing: own
                ? undefined
                : {
                    kind: 'field',
                    children: (
                      <Button
                        type={revoking ? 'destructive' : 'filled'}
                        label={revoking ? 'Revoke' : 'Approve'}
                        disabled={busy}
                        onClick={() =>
                          void run(() =>
                            revoking
                              ? host().ask('sync:revoke', device.id)
                              : host().ask('sync:approve', device.id),
                          )
                        }
                      />
                    ),
                  },
            }}
          />
        )
      })}
    </>
  )
}
