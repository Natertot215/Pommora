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
import { useExperimental } from './experimental'
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
  const clock = useSession((s) => s.personalization.timeFormat ?? DEFAULT_TIME_FORMAT)
  const experimental = useExperimental()
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
  const bindingState = state?.binding?.state
  useEffect(() => {
    if (!pushed) return
    setState((s) => s && { ...s, status: pushed })
    if (bindingState === 'pending' && pushed.reason !== 'pending') refresh(false)
  }, [pushed, refresh, bindingState])

  // The nexus's own identity does not come from sync, so it stands even where no device identity exists to answer for one.
  const binding = state?.binding ?? null
  const address = draft ?? binding?.address ?? ''
  const devices = binding?.state === 'approved' ? binding.devices : []
  const secure = address.startsWith('https:')
  const needsPassword =
    binding === null || binding.state === 'pending' || state?.status.reason === 'password'

  const onConnect = async (): Promise<void> => {
    const ok = await run(() => {
      const sent = host().ask(
        'sync:connect',
        address,
        password || undefined,
        secure ? pin || undefined : undefined,
      )
      setPassword('')
      return sent
    })
    if (ok) setDraft(null)
  }

  return (
    <>
      {state && (
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
      )}
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
      {experimental && state && (
        <>
          <SettingsFieldRow label="Server" hint={binding ? captionFor(binding) : undefined}>
            <span className={x.manageCluster}>
              <InputField
                label="Server address"
                edit={{ value: address, onCommit: setDraft, renames: 'row', emptyCommits: true }}
              >
                {address === '' ? <span className={placeholder}>No server</span> : address}
              </InputField>
              {secure && (
                <InputField
                  label="Pin"
                  edit={{ value: pin, onCommit: setPin, renames: 'row', emptyCommits: true }}
                >
                  {pin === '' ? <span className={placeholder}>No pin</span> : pin}
                </InputField>
              )}
              {(binding?.state !== 'approved' || state.status.reason === 'password') && (
                <Button
                  type="filled"
                  label="Connect"
                  disabled={busy}
                  onClick={() => void onConnect()}
                />
              )}
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
              onClick={() =>
                void run(async () => {
                  const r = await host().ask('sync:now')
                  if (r.ok && r.value.status.state !== 'off') markSynced()
                  return r
                })
              }
            />
          </SettingsFieldRow>
          {devices.map((device) => {
            const own = device.id === state.device.id
            return (
              <MenuRowView
                key={device.id}
                row={{
                  kind: 'item',
                  inert: true,
                  label: device.name,
                  caption: `${fingerprint(device.id)} · ${device.approved ? 'Approved' : 'Pending'}${device.x25519 ? ' · paired' : ''}`,
                  trailing: own
                    ? undefined
                    : {
                        kind: 'field',
                        children: (
                          <Button
                            type={device.approved ? 'destructive' : 'filled'}
                            label={device.approved ? 'Revoke' : 'Approve'}
                            disabled={busy}
                            onClick={() =>
                              void run(() =>
                                device.approved
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
      )}
    </>
  )
}
