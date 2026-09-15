import type { HostContext } from '../../Contract/handlers'
import { errText } from '../../Contract/result'
import { NEXUS_DIR } from '../../Paths/nexusPaths'
import { NEXUS_CONFIG_FILES } from '../../Paths/paths'
import type { WatchScope } from '../../Paths/exclusion'
import { readValue } from '../../Platform/localState'
import { readWatchScope } from '../../Settings/settings'
import type { SyncScope } from '../Contract/wire'
import type { Ring } from '../Keys/ring'
import { readAllBases } from './base'
import { call, type SyncHost, syncHost } from './call'
import { forgetKeys, loadRing } from './keyring'
import { applyPull, LONG_POLL_MS, type PullOutcome, pullOnce, pullWait, setCursor } from './pull'
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
let generation = 0
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

function working<T>(self: Session, work: () => Promise<T>): Promise<T | undefined> {
  setStatus(self.ctx, { state: 'syncing' })
  return run(async () => (session === self ? await work() : undefined))
    .catch((e: unknown) => {
      setStatus(self.ctx, { state: 'error', why: errText(e) })
      return undefined
    })
    .finally(() => settled(self))
}

async function revoked(self: Session): Promise<void> {
  if (session !== self) return
  await stopSession(self.ctx)
  await forgetKeys(self.host, self.nexusId)
  setStatus(self.ctx, { state: 'off', reason: 'revoked', why: 'This device was revoked.' })
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
    if (session !== self) return
    if (outcome === 'revoked') {
      await revoked(self)
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
  token: number,
): Promise<void> {
  const scope = await readWatchScope(root)
  if (token !== generation) return
  const self: Session = {
    host,
    ctx,
    root,
    nexusId,
    target: binding,
    ring,
    scope,
    failed: new Set(),
  }
  session = self
  installTap(root, self.scope, {
    onDirty: (rels) => {
      void working(self, async () => {
        try {
          if (rels.includes(SETTINGS_REL)) await rescope(self, await readWatchScope(root))
          await pushDirty(self, rels)
        } catch (e) {
          for (const rel of rels) self.failed.add(rel)
          throw e
        }
      })
    },
    onRename: (from, to) => {
      void working(self, () => pushRename(self, from, to))
    },
  })
  if (readAllBases().length === 0) {
    setCursor(self, 0)
    await working(self, () => reconcile(self))
  } else {
    await working(self, async () =>
      pushDirty(
        self,
        [...new Set([...(await admittedPaths(self)), ...readAllBases().map((row) => row.path)])],
        true,
      ),
    )
  }
  void pulling(self)
}

async function withKeys(
  ctx: HostContext,
  host: SyncHost,
  root: string,
  nexusId: string,
  binding: SyncScope,
  delay: number,
  token: number,
): Promise<void> {
  const again = (): void => {
    retry = setTimeout(() => {
      if (token !== generation) return
      retry = null
      void withKeys(ctx, host, root, nexusId, binding, Math.min(delay * 2, LAST_RETRY_MS), token)
    }, delay)
  }
  const outcome = await call(host, binding, 'info', { nexusId })
  if (outcome.status === 404) {
    setStatus(ctx, {
      state: 'off',
      reason: 'pending',
      why: 'Waiting for approval from another device.',
    })
    return again()
  }
  const info = outcome.reply?.info ?? null
  const ring = await loadRing(host, nexusId, info, null)
  if (ring !== null) return begin(ctx, host, root, nexusId, binding, ring, token)
  if (info !== null) {
    setStatus(ctx, { state: 'off', reason: 'password', why: 'The Nexus password is needed.' })
    return
  }
  setStatus(ctx, { state: 'off', reason: 'server', why: answered(outcome) })
  again()
}

export async function startSession(ctx: HostContext, root: string, nexusId: string): Promise<void> {
  await stopSession(ctx)
  generation += 1
  const token = generation
  const host = syncHost(ctx)
  if (host === null) {
    setStatus(ctx, { state: 'off', why: 'This device has no identity.' })
    return
  }
  const binding = readValue<SyncScope>('sync')
  if (binding === null) return
  await withKeys(ctx, host, root, nexusId, binding, FIRST_RETRY_MS, token)
}

export function stopSession(ctx: Pick<HostContext, 'push'>): Promise<void> {
  generation += 1
  if (retry !== null) clearTimeout(retry)
  retry = null
  uninstallTap()
  session = null
  setStatus(ctx, { state: 'off' })
  return chain
}

export async function syncNow(): Promise<void> {
  const self = session
  if (self === null) return
  const paths = [...dirtyPending(), ...self.failed]
  self.failed.clear()
  await working(self, () => pushDirty(self, paths))
  const outcome = await working(self, () => pullOnce(self, 0))
  if (outcome === 'resync') await working(self, () => reconcile(self))
  else if (outcome === 'revoked') await revoked(self)
}
