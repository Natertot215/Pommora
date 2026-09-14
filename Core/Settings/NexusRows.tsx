import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@pommora/uix/Buttons/Button'
import { InputField } from '@pommora/uix/Fields/InputField'
import { placeholder } from '@pommora/uix/Fields/fields.css'
import { MenuRowView } from '@pommora/uix/Menus'
import type { Result } from '@pommora/core/Contract/result'
import type { SyncBinding, SyncState, SyncStatus } from '@pommora/core/Sync/Contract/wire'
import type { TimeFormat } from '@pommora/core/Properties/columnStyles'
import { DEFAULT_TIME_FORMAT } from '@pommora/core/Settings/personalization'
import { clockOf } from '../Properties/formatValue'
import { SettingsFieldRow } from './SettingsFieldRow'
import { useTimedLabel } from './ClearActionRow'
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

const syncCaption = (status: SyncStatus, clock: TimeFormat): string => {
  switch (status.state) {
    case 'off':
      return status.why ?? 'Off'
    case 'idle':
      return `Last synced ${clockOf(new Date(status.lastAt ?? Date.now()), clock)}`
    case 'syncing':
      return 'Syncing…'
    case 'error':
      return `Error: ${status.why}`
  }
}

// Keyed on the nexus so a switch with Settings open mounts a body with its own fetch and its own in-flight gate.
export function NexusRows(): React.JSX.Element {
  const nexusId = useSession((s) => s.tree?.nexus.id ?? '')
  return <NexusBody key={nexusId} nexusId={nexusId} />
}

function NexusBody({ nexusId }: { nexusId: string }): React.JSX.Element | null {
  const [state, setState] = useState<SyncState | null>(null)
  const [draft, setDraft] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false)
  const heldReason = useRef<SyncStatus['reason']>(undefined)
  const clock = useSession((s) => s.personalization.timeFormat ?? DEFAULT_TIME_FORMAT)
  const [syncLabel, markSynced] = useTimedLabel('Sync Now', 'Synced')

  // One channel in flight at a time: each reply is the whole state, so a second call would answer from a list the first has already replaced.
  // `report` is what separates a user's action from the mount's own fetch: only an action the user took answers a refusal with a dialog.
  const run = useCallback(
    async (ask: () => Promise<Result<SyncState>>, report = true): Promise<boolean> => {
      if (inFlight.current) return false
      inFlight.current = true
      setBusy(true)
      try {
        const r = await ask()
        if (r.ok) setState(r.value)
        else if (report) await host().ask('error:show', r.error.message)
        return r.ok
      } finally {
        inFlight.current = false
        setBusy(false)
      }
    },
    [],
  )

  const refresh = useCallback(
    (report = true): void => {
      void run(() => host().ask('sync:state'), report)
    },
    [run],
  )

  useEffect(() => {
    refresh(false)
  }, [refresh])

  const pushed = useSession((s) => s.syncStatus)
  useEffect(() => {
    if (!pushed) return
    setState((s) => s && { ...s, status: pushed })
    if (heldReason.current === 'pending' && pushed.reason !== 'pending') refresh(false)
  }, [pushed, refresh])
  heldReason.current = state?.status.reason

  if (state === null) return null

  const binding = state.binding
  const address = draft ?? binding?.address ?? ''
  const devices = binding?.state === 'approved' ? binding.devices : []
  const needsPassword =
    binding === null || binding.state === 'pending' || state.status.reason === 'password'

  const onConnect = async (): Promise<void> => {
    const ok = await run(() => {
      const sent = host().ask('sync:connect', address, password || undefined, pin || undefined)
      setPassword('')
      return sent
    })
    if (ok) setDraft(null)
  }

  const onSyncNow = async (): Promise<void> => {
    if (await run(() => host().ask('sync:now'))) markSynced()
  }

  const connect = (
    <Button type="filled" label="Connect" disabled={busy} onClick={() => void onConnect()} />
  )

  return (
    <>
      <SettingsFieldRow label="This Device">
        <InputField
          label="Device name"
          edit={
            busy
              ? undefined
              : {
                  value: state.device.name,
                  onCommit: (next) => void run(() => host().ask('sync:renameDevice', next)),
                }
          }
        >
          {state.device.name}
        </InputField>
      </SettingsFieldRow>
      <SettingsFieldRow label="Nexus ID">
        <span className={x.count}>{nexusId}</span>
      </SettingsFieldRow>
      {needsPassword ? (
        <SettingsFieldRow label="Nexus Password">
          <InputField
            label="Nexus password"
            edit={{
              value: password,
              type: 'password',
              renames: 'row',
              emptyCommits: true,
              onCommit: setPassword,
            }}
          >
            {password === '' ? <span className={placeholder}>Not set</span> : '••••••••'}
          </InputField>
        </SettingsFieldRow>
      ) : (
        <MenuRowView
          row={{
            kind: 'item',
            inert: true,
            label: 'Nexus Password',
            caption: "Held in this device's keychain",
          }}
        />
      )}
      <SettingsFieldRow label="Server" hint={binding ? captionFor(binding) : undefined}>
        <span className={x.manageCluster}>
          <InputField
            label="Server address"
            edit={{ value: address, onCommit: setDraft, renames: 'row', emptyCommits: true }}
          >
            {address === '' ? <span className={placeholder}>No server</span> : address}
          </InputField>
          {address.startsWith('https:') && (
            <InputField
              label="Pin"
              edit={{ value: pin, onCommit: setPin, renames: 'row', emptyCommits: true }}
            >
              {pin === '' ? <span className={placeholder}>No pin</span> : pin}
            </InputField>
          )}
          {binding?.state !== 'approved' && connect}
          {binding !== null && (
            <>
              <Button type="base" label="Refresh" disabled={busy} onClick={() => refresh()} />
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
      <SettingsFieldRow label="Sync" hint={syncCaption(state.status, clock)}>
        <Button
          type="filled"
          label={syncLabel}
          disabled={busy || binding?.state !== 'approved'}
          onClick={() => void onSyncNow()}
        />
      </SettingsFieldRow>
      {devices.map((device) => {
        const own = device.id === state.device.id
        const revoking = device.approved
        return (
          <MenuRowView
            key={device.id}
            row={{
              kind: 'item',
              inert: true,
              label: device.name,
              caption: `${fingerprint(device.id)} · ${revoking ? 'Approved' : 'Pending'}${device.x25519 ? ' · paired' : ''}`,
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
