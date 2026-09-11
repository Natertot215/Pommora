import { useCallback, useEffect, useState } from 'react'
import { Button } from '@pommora/uix/Buttons/Button'
import { InputField } from '@pommora/uix/Fields/InputField'
import { placeholder } from '@pommora/uix/Fields/fields.css'
import { MenuRowView } from '@pommora/uix/Menus'
import type { Result } from '@pommora/core/Contract/result'
import type { DeviceRecord, SyncBinding, SyncState } from '@pommora/core/Sync/contract'
import { SettingsFieldRow } from './SettingsFieldRow'
import { useSession } from '../Session/store'
import * as x from './exclusion-rows.css'
import { host } from '../Platform/dialer'

const FINGERPRINT = 12

const fingerprint = (id: string): string => id.slice(0, FINGERPRINT)

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

  // One channel in flight at a time: each reply is the whole state, so a second call would answer from a list the first has already replaced.
  const run = useCallback(async (ask: () => Promise<Result<SyncState>>): Promise<void> => {
    setBusy(true)
    try {
      const r = await ask()
      if (r.ok) {
        setState(r.value)
        setDraft(null)
      } else await host().ask('error:show', r.error.message)
    } finally {
      setBusy(false)
    }
  }, [])

  const refresh = useCallback((): void => {
    void run(() => host().ask('sync:state'))
  }, [run])

  useEffect(refresh, [refresh])

  if (state === null) return null

  const binding = state.binding
  const address = draft ?? binding?.address ?? ''
  const devices: DeviceRecord[] = binding?.state === 'approved' ? binding.devices : []

  const connect = (
    <Button
      type="filled"
      label="Connect"
      disabled={busy || address === ''}
      onClick={() => void run(() => host().ask('sync:connect', address))}
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
          {binding === null || binding.state !== 'approved' ? connect : null}
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
      {devices.map((device) => (
        <MenuRowView
          key={device.id}
          row={{
            kind: 'item',
            label: device.name,
            caption: `${fingerprint(device.id)} · ${device.approved ? 'Approved' : 'Pending'}`,
            ...(device.id === state.device.id
              ? {}
              : {
                  trailing: {
                    kind: 'field',
                    children: device.approved ? (
                      <Button
                        type="destructive"
                        label="Revoke"
                        disabled={busy}
                        onClick={() => void run(() => host().ask('sync:revoke', device.id))}
                      />
                    ) : (
                      <Button
                        type="filled"
                        label="Approve"
                        disabled={busy}
                        onClick={() => void run(() => host().ask('sync:approve', device.id))}
                      />
                    ),
                  },
                }),
          }}
        />
      ))}
    </>
  )
}
