import type { HostContext } from '../../Contract/handlers'
import { errText } from '../../Contract/result'
import { NEXUS_DIR } from '../../Paths/nexusPaths'
import { NEXUS_CONFIG_FILES } from '../../Paths/paths'
import type { WatchScope } from '../../Paths/exclusion'
import { readValue } from '../../Platform/localState'
import { syncStore } from '../../Platform/stores'
import { readWatchScope } from '../../Settings/settings'
import type { SyncScope } from '../Contract/wire'
import type { Ring } from '../Keys/ring'
import { readAllBases } from './base'
import { call, type SyncHost, syncHost } from './call'
import { loadRing } from './keyring'
import { applyPull, LONG_POLL_MS, type PullOutcome, pullOnce, pullWait } from './pull'
import { answered, pushDirty, pushRename } from './push'
import { admittedPaths, reconcile, rescope } from './reconcile'
import { currentStatus, setStatus } from './status'
import { dirtyPending, installTap, uninstallTap } from './tap'

export interface Session {
  host: SyncHost
  ctx: HostContext
  root: string
  nexusId: string
  target: SyncScope
  ring: Ring
  scope: WatchScope
  failed: Set<string>
}

const SETTINGS_REL = `${NEXUS_DIR}/${NEXUS_CONFIG_FILES.settings}`
const FIRST_RETRY_MS = 5_000
const LAST_RETRY_MS = 60_000
const LONGEST_BACKOFF_MS = 30_000

let session: Session | null = null
let retry: ReturnType<typeof setTimeout> | null = null
let chain: Promise<void> = Promise.resolve()

export const currentSession = (): Session | null => session

function run<T>(work: () => Promise<T>): Promise<T> {
  const next = chain.then(work)
  chain = next.then(
    () => {},
    () => {},
  )
  return next
}

function settled(self: Session): void {
  if (session !== self) return
  if (currentStatus().state !== 'error') setStatus(self.ctx, { state: 'idle', lastAt: Date.now() })
}

function working<T>(self: Session, work: () => Promise<T>): Promise<T> {
  setStatus(self.ctx, { state: 'syncing' })
  return run(work).finally(() => settled(self))
}

const sleep = (ms: number): Promise<void> => new Promise((wake) => setTimeout(wake, ms))

async function polled(self: Session): Promise<PullOutcome> {
  try {
    const waited = await pullWait(self, LONG_POLL_MS)
    if (waited.kind !== 'reply') return waited.outcome
    return session === self ? await run(() => applyPull(self, waited.reply)) : 'idle'
  } catch (e) {
    setStatus(self.ctx, { state: 'error', why: errText(e) })
    return 'error'
  }
}

async function pulling(self: Session): Promise<void> {
  let failures = 0
  while (session === self) {
    const outcome = await polled(self)
    if (outcome === 'revoked') {
      stopSession(self.ctx)
      setStatus(self.ctx, { state: 'off', reason: 'revoked', why: 'This device was revoked.' })
      return
    }
    if (outcome === 'error') {
      await sleep(Math.min(1000 * 2 ** failures, LONGEST_BACKOFF_MS))
      failures += 1
      continue
    }
    failures = 0
    if (outcome === 'resync') {
      await working(self, () => reconcile(self))
      continue
    }
    if (outcome === 'applied') settled(self)
    if (self.failed.size > 0) {
      const paths = [...self.failed]
      self.failed.clear()
      await working(self, () => pushDirty(self, paths))
    }
  }
}

async function begin(
  ctx: HostContext,
  host: SyncHost,
  root: string,
  nexusId: string,
  binding: SyncScope,
  ring: Ring,
): Promise<void> {
  const self: Session = {
    host,
    ctx,
    root,
    nexusId,
    target: binding,
    ring,
    scope: await readWatchScope(root),
    failed: new Set(),
  }
  session = self
  installTap(root, self.scope, {
    onDirty: (rels) => {
      void working(self, async () => {
        if (rels.includes(SETTINGS_REL)) await rescope(self, await readWatchScope(root))
        await pushDirty(self, rels)
      })
    },
    onRename: (from, to) => {
      void working(self, () => pushRename(self, from, to))
    },
  })
  if (readAllBases().length === 0) await working(self, () => reconcile(self))
  else
    await working(self, async () =>
      pushDirty(self, [
        ...new Set([...(await admittedPaths(self)), ...readAllBases().map((row) => row.path)]),
      ]),
    )
  void pulling(self)
}

async function withKeys(
  ctx: HostContext,
  host: SyncHost,
  root: string,
  nexusId: string,
  binding: SyncScope,
  delay: number,
): Promise<void> {
  let ring = await loadRing(host, nexusId, null, null)
  if (ring === null) {
    const outcome = await call(host, binding, 'info', { nexusId })
    if (outcome.reply === null) {
      setStatus(
        ctx,
        outcome.status === 404
          ? { state: 'off', reason: 'pending', why: 'Waiting for approval from another device.' }
          : { state: 'off', reason: 'server', why: answered(outcome) },
      )
      const armed: ReturnType<typeof setTimeout> = setTimeout(() => {
        if (retry !== armed) return
        retry = null
        void withKeys(ctx, host, root, nexusId, binding, Math.min(delay * 2, LAST_RETRY_MS))
      }, delay)
      retry = armed
      return
    }
    ring = await loadRing(host, nexusId, outcome.reply.info, null)
    if (ring === null) {
      setStatus(ctx, { state: 'off', reason: 'password', why: 'The Nexus password is needed.' })
      return
    }
  }
  await begin(ctx, host, root, nexusId, binding, ring)
}

export async function startSession(ctx: HostContext, root: string, nexusId: string): Promise<void> {
  stopSession(ctx)
  const host = syncHost(ctx)
  if (host === null) {
    setStatus(ctx, { state: 'off', why: 'This device has no identity.' })
    return
  }
  const binding = readValue<SyncScope>('sync')
  if (binding === null) return
  if (syncStore() === null) {
    setStatus(ctx, {
      state: 'off',
      reason: 'no-db',
      why: "This nexus's database is unavailable; sync is off for this session.",
    })
    return
  }
  await withKeys(ctx, host, root, nexusId, binding, FIRST_RETRY_MS)
}

export function stopSession(ctx: Pick<HostContext, 'push'>): void {
  if (retry !== null) clearTimeout(retry)
  retry = null
  uninstallTap()
  session = null
  setStatus(ctx, { state: 'off' })
}

export async function syncNow(): Promise<void> {
  const self = session
  if (self === null) return
  const paths = [...dirtyPending(), ...self.failed]
  self.failed.clear()
  await working(self, () => pushDirty(self, paths))
  await run(() => pullOnce(self, 0))
}
