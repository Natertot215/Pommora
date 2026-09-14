## Sync-Scaffolding-V2 — Implementation Plan

> **Status:** Drafted 09-13-2026 · implements [[Sync-Scaffolding-V2 — Decision Log]] · runs unattended.

### Context

This plan implements the content half of Pommora Sync on the identity layer the Sync Groundwork arc shipped: a star topology in which every device pushes encrypted whole-file items to one hub Pommora owns and pulls the change log back, with the hub's version counter detecting conflicts and recency resolving them, the loser captured on both ends, a landing merged into an open editor without a prompt, and every JSON configuration file merged key by key. It touches `Sync/` (the hub, from one file into a folder), `Core/Sync/` (the contract, keys, client, and arrival), the host seams in `Desktop/` (machine bytes, the sync transport, the device's second key, the watcher tap, two store tables), the renderer's page view and save scheduler, the Settings › General Nexus heading, and the documents the arc makes false.

It leaves alone the phone, accounts, other authentication methods, cloud hosting beyond a Dockerfile, direct device-to-device transfer, a Nexus password change (a Prospect: the ring re-wraps, no channel exists yet), content-key rotation beyond revoke, the File History frame's reading of hub versions, thumbnails travelling, the Windows machine, `Dashboard/`, and every Locked Decision. The retired decision logs are recoverable at `7c7a68f47^` and `5f4b07c0b^`; this plan cites the V2 log only.

### Summary

Today Pommora knows which devices belong to a Nexus and nothing crosses between them. When this plan is done, an edit on one Mac reaches another Mac holding the same Nexus within a few seconds through a small hub process: the file is encrypted on the device, sent to the hub as a numbered change, and pulled down by every other device, which decrypts it, writes it in place with the original edit time, and, if the page is open, merges it into the editor around the caret. If two devices edit the same file while apart, the hub notices, the newer edit wins, and the older one is kept in both places rather than lost. Settings and organization files merge one setting at a time instead of one side overwriting the other.

The proof runs on one MacBook: the hub plus two app instances each holding a copy of a Nexus, driven by an agent over the debugging port, measuring how long each kind of change takes to land and confirming that what must not travel never does. Nathan is not present for any of it, so every decision the run would have asked him is written here first, and anything it still has to guess it records for him to read in the morning.

#### Constraints

- Gates, from the repo root, each preceded by `set -o pipefail`: `npm run typecheck` (exits 0; seven `tsc -p` projects) · `npm run test` (Vitest; the output ends in a `Tests N passed` line with no failures) · `npm run lint` (`biome check .` plus the comment hook; warnings exit 0, so the output is read) · `npm run build` (exits 0, prints `✓ built in`). Never pipe the final command through `tail`. The orchestrator runs each gate itself and reads its tail; an agent's "green" is a claim, not a result.
- Formatting is Biome's through the PostToolUse hook; a shell-driven edit runs `npm run format` afterward. Comments are full-line `//` only, reserved for what the code cannot say; a wrapped block comment fails the lint gate.
- **Stop policy (ruled 09-13-2026):** no user stops. A decision the mandate does not settle takes the simplest reading and is recorded under Deviations. 
- **In-flight decisions are disclosed in chat as they are made**, one line each, before the work that depends on them continues: the orchestrator writes "Ruling in flight: <what> — <the reading taken> — <why>" and copies the same line into Deviations when the reading is outside the mandate's letter. Nathan reads the chat in the morning; a decision he cannot find there is a defect.
- **Agents by phase.** Each phase is executed by one Opus agent that runs its tasks in order with one commit per task; Tasks 7.2 and 8.3 stay Opus with the executor briefed on their data-loss stakes. Reviewers and simplifiers are Opus; the neutral verifier is Opus. No subagent uses model inheritance and no subagent is Fable.
- **`Sync/` stays on Node built-ins.** Every import in `Sync/**/*.ts` is `node:*`, a relative `.ts` path, or an `import type` from `@pommora/core/Sync/Contract/*`; Task 3.1 turns that into a gate. `erasableSyntaxOnly` and `verbatimModuleSyntax` hold: no enums, no namespaces, no parameter properties, every type import spelled `import type`. A value the hub must execute (a validator, a route's cap or role) is re-spelled in `Sync/wire.ts` with `satisfies` against the Core type, as `PATHS` already is.
- **Core's engine graph stays `['ulidx', 'yaml', 'zod']`** (`Core/Contract/engineGraph.test.ts`, `Desktop/hostGraph.test.ts`). `Core/Sync/Keys/` reaches crypto only through `globalThis.crypto.subtle` with no import; `Core/Sync/Arrival/` writes every byte through `machine()`; the merge library is imported by the renderer alone.
- **The host owns the signing key and the agreement key.** `HostDevice.sign` and the new `HostDevice.agree` run in Desktop; Core receives a signature string or a 32-byte shared secret and never a private key. The Nexus password and the wrapped ring are stored through the host's `secrets` member; Core holds the unwrapped ring in memory only.
- **The hub never sees plaintext content, the password, or a content key.** Paths, versions, mtimes, sizes, and key ids are plaintext on the hub by decision; bodies are not.
- **The hub's request order is one sequence, stated once (Task 3.2):** match the path → look up the route's cap → read (JSON) or spool (bytes) the body under it → `identify` (the caller, the Nexus, the role) → `verify` (the signature over the body hash) → the handler.
- Frozen: the canonical signing string (`Core/Sync/Contract/canonical.ts`), the device id recipe, the four roster verbs' paths and bodies, `Core/Contract/result.ts`, `Core/Platform/localState.ts`'s scope union beyond the `sync` value's shape, `Core/Nexus/identity.ts`, the `Result` envelope on every channel. `HostContext` gains members additively and every existing member keeps its shape.
- `Desktop/FileWatch/watcher.ts`'s `SETTLE_MS` stays 200. The sync client's own debounce is 2,500 ms and lives in `Core/Sync/Client/tap.ts`.
- Never delete: `Desktop/Web/linkTitles.ts`, `Core/Sync/Contract/vectors.json` (moved, never dropped), any `local_state` scope, `Desktop/Bridge/ipc.test.ts`'s empty `HostContext` cast, `Dashboard/**`.
- Commit scoping: `git add` new files first, then `git commit --only -m "…" -- <paths>` (flags before `--`); check `git diff --cached` is empty before staging, since parallel sessions share one index. `Dashboard/Ledger/loc-history.json` is rewritten by the post-commit hook after every commit and is never part of a task's paths.
- One tree-touching writer at a time: phases run in sequence, each task executed by one agent; reviewers and simplifiers run report-only. No phase is declared parallel.
- Each phase's gate runs the simplification review before the build-breaking review, both dispatched as Opus agents that load the skill, both briefed to flag non-simplicity bugs. A `DONE_WITH_CONCERNS` report is unfinished work: the concern is fixed before the phase closes.
- One smoke launch per phase that touched runtime code (Phases 1, 2, 5–9): from built output with a scratch `POMMORA_USERDATA`, open the scratch Nexus, render the tree, open a page, save an edit, quit. Built output exposes `window.nexus.ask` and not `window.__pommora`; every console read goes through the bridge.
- Every task's documentation rewrite lands in that task's commit under the replace rule: change the sentence, never append an amendment.
- The Nexus heading (Phase 9) is designed headlessly from the brief in its preamble; the executor sweeps `UIX/` and `Core/Settings/` first for what already exists, writes its decisions as a numbered list in-chat, and proceeds.
- Tick the Implementation Process per bullet at completion; the ticks are the record a resumed session reads.

#### Rulings

Decisions Nathan made or delegated before the run, recorded so the executor never re-asks them.

- **Concurrency Locked Decision:** F-1 (the hub's version precondition detects, recency resolves) and F-6 (per-section merge) are honored in substance; the CLAUDE.md wording is Nathan's own edit.
- **Lint:** `Dashboard/Ledger/loc-history.json` is excluded from Biome in Task 1.1 so the gate can be green after the hook runs. *Awaiting Nathan's yes at ratification.*
- **Feed:** `pull` long-polls (E-2's one-directional intent, without a stream encoding). No `feed` route; `Sync/feed.ts` is the waiter registry the long-poll uses.
- **Blobs:** content-addressed. Bytes travel on `PUT /blob/<nexusId>/<sha256>` and `GET /blob/<nexusId>/<sha256>`; the signed body hash is the blob id; `store` and `pull` stay small JSON bodies referencing hashes (E-4 restated).
- **`.trash` feed:** the write funnel (`Core/Files/writeEcho.ts`) feeds the sync tap for `.trash`; the file watcher is widened for tile bodies only (G-1 narrowed). Every Trash writer that removes or moves a bundle records the write first.
- **JSON merge depth:** the per-file depth table ships now (the Prospect pulled in): `personalization`, `order`, `navigation`, `defs`, `byImage` merge one level down.
- **A merged landing is dirty by construction:** the base record holds the hub's plaintext hash and version, the disk holds the merged bytes, so the next tap cycle pushes the merge against the right base.
- **Undo:** a landing merged into an open editor carries `Transaction.addToHistory.of(false)`.
- **Body writes are compare-and-swap on the body:** `page:updateBody` carries the hash of the body the editor last loaded or saved and is refused when the body on disk differs; the refusal routes to the merge, never to a retry. A caller with no hash (restore, tests) writes unconditionally.
- **ID-less pages never push:** a Markdown file with no `ID` key waits until adoption stamps it; the stamp is an app write the tap sees.
- **A rename is what the app did:** the rename and move operations report `{ from, to }` to the sync client after their cascades settle, and push emits one `rename` change; an external rename is a delete and a write, pushed in that order.
- **Pull applies nothing over a dirty file:** before landing, the client compares the file's hash to its base; a difference pushes first, then re-evaluates.
- **Byte routes carry the Nexus id in the path**, so authority resolves before a byte is read.
- **Ring entries wrap under AES-GCM with an HKDF-derived key** (Electron's Web Crypto has no AES-KW); device wraps use an ephemeral X25519 pair.
- **Hub env:** `POMMORA_SYNC_DATA` (default `~/.pommora-sync`), `POMMORA_SYNC_HOST` (default `127.0.0.1`), `POMMORA_SYNC_PORT` (default `7473`); TLS is on when `<DATA>/hub-cert.pem` and `<DATA>/hub-key.pem` exist.
- **Hub schema:** the final DDL ships at once; the one migration that meets existing data (`role`, `x25519`) backfills `role = 'owner'` for every approved membership; defensible for a pre-release hub holding Nathan's devices alone.
- **Thumbnails stay home** (`.nexus/assets/<id>/thumbnails/`, lowercase on disk); `crops.json` travels.
- **UI:** the Nexus heading's rows are the executor's design under the Phase 9 brief, after a sweep of what the kit and the Settings folder already hold; Nathan tunes them afterward.
- **Proof data:** two copies of `/Users/nathantaichman/NexusOS` under the scratch directory with `nexus.db`, `versions.db`, and their `-wal`/`-shm` siblings removed; deleted at closeout. Never the live vault.
- **Docker:** when `docker` is absent from the PATH the image build is skipped and recorded, and the Dockerfile is verified lexically.

#### Baseline

Recorded at ratification, after the working tree is swept.

- Gates: typecheck exit 0, test 374 files / 4574 passed, lint **red** (`loc-history.json`), observed at `a5ca8a22e` on 09-13-2026 before ratification and re-run at ratification with the same result; every count below re-read at ratification and unchanged.
- `grep -c "^  '" Core/Contract/bridge.ts` → 119 — becomes 123 (`sync:now`, `sync:captureLocal`, `pages:changed`, `sync:changed`)
- `git ls-files Sync | wc -l` → 5 — becomes 15 after Task 3.1, ≥ 24 at the end
- `ls Core/Sync | wc -l` → 8 — becomes 6 (`Contract`, `Keys`, `Client`, `Arrival`, `handlers.ts`, `handlers.test.ts`)
- `grep -o "tsc -p" package.json | wc -l` → 7 — unchanged
- `ls .claude/Features | wc -l` → 20 — unchanged
- `test -f Sync/server.ts && echo 1 || echo 0` → 1 — becomes 0 (Task 3.1)
- `grep -c "atomic: true" Desktop/FileWatch/watcher.ts` → 1 — becomes 0 (Task 2.3)
- `grep -c "CREATE TABLE IF NOT EXISTS" Desktop/Store/ddl.ts` → 6 — becomes 7 (Task 1.4)
- `grep -c "recordWrite" Core/Trash/spend.ts` → 3 — becomes 8 (Task 2.3)

**START:** 2026-09-14T03:08:15Z
**END:** <same command, run as the report is given>

#### Implementation Process

The tag after each task names the executing agent's model. Tick per bullet at completion.

- [x] **Phase 0** — Ratification: sweep the tree, run the gates, record Baseline, commit the plan.
- [x] **Phase 1** — Host Seams
  - [x] Task 1.1 Lint exclusion and byte hashing `[Sonnet]`
  - [x] Task 1.2 Transport bytes, the sync transport with pinning, the test certificate `[Opus]`
  - [x] Task 1.3 The device's agreement key `[Opus]`
  - [x] Task 1.4 The `sync` and `captures` tables and their store members `[Opus]`
  - [ ] Review Checkpoint
- [x] **Phase 2** — Core Predicates and Structure
  - [x] Task 2.1 `Core/Sync` into `Contract/` and `Client/` `[Sonnet]`
  - [x] Task 2.2 The manifest predicate and the one walker `[Opus]`
  - [x] Task 2.3 Landing writes, the watch tap, the write tap, and Trash's writes `[Opus]`
  - [ ] Review Checkpoint
- [x] **Phase 3** — Hub Restructure and Authority
  - [x] Task 3.1 One file into a folder, the final schema, and the built-ins gate `[Opus]`
  - [x] Task 3.2 Roles, the migration proven, and one authority function `[Opus]`
  - [x] Task 3.3 Per-route caps and timeouts, TLS, and the bind address `[Opus]`
  - [ ] Review Checkpoint
- [x] **Phase 4** — Hub Content
  - [x] Task 4.1 The info record and the ring `[Opus]`
  - [x] Task 4.2 Blobs, content-addressed `[Opus]`
  - [x] Task 4.3 `store`: the change log `[Opus]`
  - [x] Task 4.4 `pull`: long-poll, cursor, resync, retention `[Opus]`
  - [ ] Review Checkpoint
- [x] **Phase 5** — Keys
  - [x] Task 5.1 KDF, ring, and item crypto `[Opus]`
  - [x] Task 5.2 Bind with a password, approve with a wrap, revoke with a rotation `[Opus]`
  - [ ] Review Checkpoint
- [x] **Phase 6** — Arrival
  - [x] Task 6.1 Key-level JSON merge `[Opus]`
  - [x] Task 6.2 Captures `[Opus]`
  - [x] Task 6.3 Landing items, tombstones, and renames `[Opus]`
  - [x] Review Checkpoint
- [x] **Phase 7** — Client
  - [x] Task 7.1 Base record, tap, debounce, and the rename report `[Opus]`
  - [x] Task 7.2 Push and the conflict path `[Opus]`
  - [x] Task 7.3 Pull loop, cursor, first bind, and rescope `[Opus]`
  - [x] Task 7.4 The session: status, `sync:now`, `sync:changed` `[Opus]`
  - [x] Review Checkpoint
- [x] **Phase 8** — Editor
  - [x] Task 8.1 `pages:changed`, one classification pass `[Opus]`
  - [x] Task 8.2 Compare-and-swap body writes `[Opus]`
  - [x] Task 8.3 Three-way merge in the page view `[Opus]`
  - [x] Review Checkpoint
- [x] **Phase 9** — The Nexus Heading
  - [x] Task 9.1 Rows and channels `[Opus]`
  - [x] Review Checkpoint
- [ ] **Phase 10** — Proof, Deploy, and Reconciliation
  - [ ] Task 10.1 Dockerfile, scripts, and Development-Environment `[Opus]`
  - [ ] Task 10.2 The two-instance proof over CDP `[Opus]`
  - [ ] Task 10.3 Documents `[Opus]`
  - [ ] Review Checkpoint
- [ ] Final Verification

### Phase 1 — Host Seams

**GOAL:** Every member the later phases call on the host exists and is tested: byte hashing, a byte-capable transport with certificate pinning over a committed test certificate, the device's X25519 key, and the two new store tables. Nothing here changes behavior a user can see, which is what lets it land first and alone.

#### Task 1.1

**TASK:** Exclude the ledger file the post-commit hook rewrites from Biome, and widen `sha256Hex` to accept bytes so one hash function serves text and blobs.

**FILES:** `biome.json`, `Core/Platform/machine.ts`, `Desktop/Platform/nodeMachine.ts`, `Core/Testing/machines.ts`, `Core/Testing/machineContract.ts`, `Core/Assets/assetMigrate.ts`

**NOW**

```json
"includes": ["**", "!**/dist", "!**/out", "!**/release", "!**/graphify-out", "!**/.claude"]
```

`Core/Platform/machine.ts`, in the `Machine` interface:

```ts
  sha256Hex(text: string): string
```

`Desktop/Platform/nodeMachine.ts`:

```ts
  sha256Hex: (text) => createHash('sha256').update(text).digest('hex'),
```

`Core/Testing/machines.ts`, shared by `memoryMachine()` and `diskMachine()`:

```ts
const sha256Hex = (text: string): string => createHash('sha256').update(text).digest('hex')
```

`Core/Assets/assetMigrate.ts`:

```ts
/** Latin-1 is a byte-for-byte bijection, so this digests the bytes — the machine's hash takes text. */
const hashOf = (bytes: Uint8Array): string =>
  machine().sha256Hex(new TextDecoder('latin1').decode(bytes))
```

`Core/Testing/machineContract.ts` holds the one hash case, `it('hashes the empty string to the known digest', …)`, run by `Core/Testing/contracts.test.ts`.

**CHANGE**

- [ ] Add `"!Dashboard/Ledger/loc-history.json"` as the last entry of `biome.json`'s `files.includes`.
- [ ] `Core/Platform/machine.ts`: the member becomes `sha256Hex(input: string | Uint8Array): string`. `nodeMachine.ts` and the two test machines rename the parameter to `input` with the widened type; `createHash('sha256').update(input)` accepts both, so no body changes.
- [ ] `Core/Testing/machineContract.ts`: add, after the empty-string case, `it('hashes bytes as the text they decode to', () => { expect(machine.sha256Hex(new Uint8Array([0x61, 0x62, 0x63]))).toBe(machine.sha256Hex('abc')) })`.
- [ ] `assetMigrate.ts`: `hashOf` becomes `const hashOf = (bytes: Uint8Array): string => machine().sha256Hex(bytes)` and its comment is deleted.

**AFTER**

```ts
  sha256Hex(input: string | Uint8Array): string
```

```ts
  sha256Hex: (input) => createHash('sha256').update(input).digest('hex'),
```

```ts
const sha256Hex = (input: string | Uint8Array): string =>
  createHash('sha256').update(input).digest('hex')
```

```ts
const hashOf = (bytes: Uint8Array): string => machine().sha256Hex(bytes)
```

**VERIFY**

- [ ] `set -o pipefail; npm run lint` exits 0 with zero errors in its output.
- [ ] `npm run test -- Core/Testing/` and `npm run test -- Core/Assets/` pass.
- [ ] `grep -c "latin1" Core/Assets/assetMigrate.ts` → 0.
- [ ] Check the work for unnecessary code or obvious mistakes.

#### Task 1.2

**TASK:** Let the transport carry bytes in both directions, move the sync transport onto `node:https` with certificate-fingerprint pinning, and commit the long-lived test certificate every TLS test uses.

**FILES:** `Core/Contract/handlers.ts`, `Desktop/Web/transport.ts` (deleted), `Desktop/Sync/transport.ts` (new), `Desktop/Sync/transport.test.ts` (new), `Desktop/main.ts`, `Desktop/tsconfig.node.json`, `Sync/Testing/cert.pem` (new), `Sync/Testing/key.pem` (new), `Core/Sync/client.test.ts`, `Core/Sync/handlers.test.ts`

**NOW**

```ts
export interface TransportRequest {
  url: string
  method: string
  headers: Record<string, string>
  body?: string
}

export interface TransportReply {
  status: number
  body: string
}
```

`Desktop/Web/transport.ts`, imported only by `Desktop/main.ts` (`import { transport } from './Web/transport'`, bound as the `transport` member of `hostContext()`):

```ts
import { net } from 'electron'
import type { TransportReply, TransportRequest } from '@pommora/core/Contract/handlers'

export async function transport(req: TransportRequest): Promise<TransportReply> {
  const r = await net.fetch(req.url, {
    method: req.method,
    headers: req.headers,
    body: req.body,
    signal: AbortSignal.timeout(10_000),
  })
  return { status: r.status, body: await r.text() }
}
```

`Desktop/tsconfig.node.json`'s `include` is an explicit list (`main.ts`, `Bridge/**/*`, `Platform/**/*`, `Store/**/*`, `FileWatch/**/*`, `Actions/**/*`, `Web/**/*.ts`, `Capture/**/*`, `Config/**/*`, and three root files); `Desktop/hostGraph.test.ts` reads that config's `fileNames`, so a folder absent from the list is typechecked by nothing and scanned by nothing. `openssl` on this Mac is LibreSSL 3.3.6 (`-nodes`, `-addext` supported; `-noenc` is not).

**CHANGE**

- [ ] `TransportRequest.body?: string | Uint8Array`; add `timeoutMs?: number` (default 10,000) and `pin?: string` (a `fingerprint256` in Node's colon-hex form). `TransportReply` gains `bytes: Uint8Array`; `body` stays the UTF-8 decode of `bytes`. The `TransportReply` literals in `Core/Sync/client.test.ts`'s `recorder()` and `Core/Sync/handlers.test.ts`'s `Answer` builder gain `bytes: new TextEncoder().encode(body)`.
- [ ] `Desktop/tsconfig.node.json`: add `"Sync/**/*"` to `include` after `"Config/**/*"`.
- [ ] Mint the test pair once with

```sh
openssl req -x509 -nodes -days 36500 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 \
  -subj "/CN=pommora-hub-test" -addext "subjectAltName=IP:127.0.0.1,DNS:localhost" \
  -keyout Sync/Testing/key.pem -out Sync/Testing/cert.pem
```

  and commit both files.
- [ ] Create `Desktop/Sync/transport.ts` as the AFTER block shows: `node:https.request` for an `https:` address and `node:http.request` otherwise; with a pin, `rejectUnauthorized: false` and a `secureConnect` check comparing `socket.getPeerCertificate().fingerprint256` to the pin, destroying the socket and rejecting on a mismatch; without a pin, `rejectUnauthorized: true`; the body written as bytes; the response collected into one `Uint8Array`; `req.timeoutMs ?? 10_000` through `request.setTimeout`. One export, `transport(req): Promise<TransportReply>`.
- [ ] Delete `Desktop/Web/transport.ts`; `Desktop/main.ts`'s import becomes `import { transport } from './Sync/transport'`.
- [ ] `Desktop/Sync/transport.test.ts`, over an `https.createServer({ cert, key })` reading the committed pair and answering the request body back as bytes: `it('carries bytes both ways under the right pin', …)` (the pin from `new X509Certificate(cert).fingerprint256`, status 200, `reply.bytes` equal to the sent bytes); `it('rejects a pin the certificate does not match', …)` (`await expect(transport({ …, pin: 'AA:' + … })).rejects.toThrow()`); `it('reaches an http: address without a pin', …)` over `http.createServer`.

**AFTER**

```ts
export interface TransportRequest {
  url: string
  method: string
  headers: Record<string, string>
  body?: string | Uint8Array
  timeoutMs?: number
  pin?: string
}

export interface TransportReply {
  status: number
  body: string
  bytes: Uint8Array
}
```

`Desktop/Sync/transport.ts`:

```ts
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import type { TLSSocket } from 'node:tls'
import type { TransportReply, TransportRequest } from '@pommora/core/Contract/handlers'

export function transport(req: TransportRequest): Promise<TransportReply> {
  const url = new URL(req.url)
  const secure = url.protocol === 'https:'
  const request = secure ? httpsRequest : httpRequest
  return new Promise((resolve, reject) => {
    const r = request(
      url,
      {
        method: req.method,
        headers: req.headers,
        ...(secure && { rejectUnauthorized: req.pin === undefined }),
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk: Buffer) => chunks.push(chunk))
        res.on('error', reject)
        res.on('end', () => {
          const bytes = new Uint8Array(Buffer.concat(chunks))
          resolve({ status: res.statusCode ?? 0, body: Buffer.from(bytes).toString('utf8'), bytes })
        })
      },
    )
    r.setTimeout(req.timeoutMs ?? 10_000, () => r.destroy(new Error('The request timed out.')))
    r.on('error', reject)
    if (req.pin !== undefined) {
      r.on('socket', (socket) => {
        socket.once('secureConnect', () => {
          const seen = (socket as TLSSocket).getPeerCertificate().fingerprint256
          if (seen !== req.pin) r.destroy(new Error('The hub certificate does not match the pin.'))
        })
      })
    }
    r.end(req.body)
  })
}
```

**VERIFY**

- [ ] `npm run typecheck` exits 0; `npm run test -- Desktop/Sync/` passes three cases.
- [ ] `test -f Desktop/Web/transport.ts && echo 1 || echo 0` → 0; `grep -rn "Web/transport" Desktop Core | wc -l` → 0.
- [ ] `grep -c '"Sync/\*\*/\*"' Desktop/tsconfig.node.json` → 1.
- [ ] `ls Sync/Testing` lists `cert.pem` and `key.pem`; `Desktop/hostGraph.test.ts` still passes.
- [ ] Check the work for unnecessary code or obvious mistakes.

#### Task 1.3

**TASK:** Give every device an X25519 agreement key beside its Ed25519 signing key, minted additively on existing installs, exposed to Core as a public key and an `agree` member that returns a shared secret.

**FILES:** `Core/Sync/contract.ts`, `Core/Contract/handlers.ts`, `Desktop/Config/device.ts`, `Desktop/Config/device.test.ts`, `Desktop/Config/appConfig.ts`, `Core/Sync/handlers.test.ts`, `Core/Sync/client.test.ts`

**NOW**

```ts
export interface SyncDevice {
  id: string
  publicKey: string
  name: string
}
```

```ts
export interface HostDevice extends SyncDevice {
  sign(canonical: string): Promise<string>
  rename(name: string): Promise<void>
}
```

`Desktop/Config/device.ts` (`const SECRET = 'device-key'`): `mint(userDataDir)` generates Ed25519 only, clears `device` in the config, `setSecret(userDataDir, SECRET, pkcs8Base64)`, then writes `{ device }`; `load(userDataDir)` imports the PKCS8 as a non-extractable `sign` key. `ensureDevice`:

```ts
export async function ensureDevice(userDataDir: string): Promise<HostDevice> {
  const stored = (await readAppConfig(userDataDir)).device
  const loaded = stored ? await load(userDataDir) : null
  if (stored && !loaded) {
    console.error('Device key missing from the secret store; minting a new identity')
  }
  const { device, key } =
    stored && loaded ? { device: stored, key: loaded } : await mint(userDataDir)
  const host: HostDevice = {
    ...device,
    async sign(canonical: string): Promise<string> {
      const signature = await globalThis.crypto.subtle.sign(
        'Ed25519',
        key,
        new TextEncoder().encode(canonical),
      )
      return Buffer.from(signature).toString('base64url')
    },
    async rename(name: string): Promise<void> {
      await updateAppConfig(userDataDir, () => ({
        device: { id: host.id, publicKey: host.publicKey, name },
      }))
      host.name = name
    },
  }
  return host
}
```

`Desktop/Config/appConfig.ts`:

```ts
function readDevice(v: unknown): SyncDevice | undefined {
  if (typeof v !== 'object' || v === null) return undefined
  const { id, publicKey, name } = v as Record<string, unknown>
  if (typeof id !== 'string' || !id) return undefined
  if (typeof publicKey !== 'string' || !publicKey) return undefined
  if (typeof name !== 'string' || !name) return undefined
  return { id, publicKey, name }
}
```

`Core/Sync/handlers.test.ts` lines 26 to 35 build the fake `HostDevice` with `sign: async () => 'sig'` and a `rename` that records the name; `Core/Sync/client.test.ts`'s `recorder()` builds another with `rename: async () => {}`.

**CHANGE**

- [ ] `SyncDevice` gains `x25519?: string` (the raw 32-byte X25519 public key, base64url). `readDevice()` reads it when it is a non-empty string: `const { id, publicKey, name, x25519 } = …` and `return { id, publicKey, name, ...(typeof x25519 === 'string' && x25519 && { x25519 }) }`.
- [ ] `HostDevice` gains `agree(peerPublicKey: string): Promise<Uint8Array>` between `sign` and `rename`.
- [ ] `device.ts`: `const AGREEMENT_SECRET = 'device-x25519'` beside `SECRET`; `ensureAgreementKey(userDataDir, stored: SyncDevice)` as the AFTER block shows; `ensureDevice` calls it after the Ed25519 half resolves, so an existing install gains the key on its next launch without re-minting. `rename()` writes `device: { ...current, name }` where `current` is `{ id: host.id, publicKey: host.publicKey, name: host.name, x25519: host.x25519 }`.
- [ ] `device.test.ts`: `it('gives an existing device its agreement key without re-minting', …)` (write `pommora.json` with a device lacking `x25519` through a first `ensureDevice`, delete the key from the config with `updateAppConfig(dir, () => ({ device: { id, publicKey, name } }))`, call `ensureDevice` again: `x25519` present and 43 characters, `id` unchanged); `it('agrees on one secret from either side', …)` (two userData dirs, `a.agree(b.x25519!)` equals `b.agree(a.x25519!)`, 32 bytes); `it('keeps the agreement key across a rename', …)`. The first test's existing `expect(stored).toEqual({ id, publicKey, name })` becomes `toMatchObject` with `x25519` asserted as a 43-character string. `Core/Sync/handlers.test.ts`'s fake `HostDevice` and `Core/Sync/client.test.ts`'s `recorder()` device each gain `agree: async () => new Uint8Array(32)`.

**AFTER**

```ts
export interface SyncDevice {
  id: string
  publicKey: string
  name: string
  x25519?: string
}

export interface HostDevice extends SyncDevice {
  sign(canonical: string): Promise<string>
  agree(peerPublicKey: string): Promise<Uint8Array>
  rename(name: string): Promise<void>
}
```

`device.ts` gains, and `ensureDevice` uses:

```ts
const AGREEMENT_SECRET = 'device-x25519'

async function ensureAgreementKey(
  userDataDir: string,
  stored: SyncDevice,
): Promise<{ x25519: string; key: CryptoKey }> {
  const secret = stored.x25519 ? await getSecret(userDataDir, AGREEMENT_SECRET) : null
  if (stored.x25519 && secret !== null) {
    const key = await globalThis.crypto.subtle.importKey(
      'pkcs8',
      new Uint8Array(Buffer.from(secret, 'base64')),
      'X25519',
      false,
      ['deriveBits'],
    )
    return { x25519: stored.x25519, key }
  }
  const pair = await globalThis.crypto.subtle.generateKey('X25519', true, ['deriveBits'])
  if (!('privateKey' in pair)) throw new Error('X25519 generated no key pair.')
  const raw = await globalThis.crypto.subtle.exportKey('raw', pair.publicKey)
  const pkcs8 = await globalThis.crypto.subtle.exportKey('pkcs8', pair.privateKey)
  const x25519 = Buffer.from(raw).toString('base64url')
  await setSecret(userDataDir, AGREEMENT_SECRET, Buffer.from(pkcs8).toString('base64'))
  await updateAppConfig(userDataDir, () => ({ device: { ...stored, x25519 } }))
  return { x25519, key: pair.privateKey }
}
```

Inside `ensureDevice`, after the `{ device, key }` line: `const agreement = await ensureAgreementKey(userDataDir, device)`; the `host` literal spreads `...device, x25519: agreement.x25519` and gains

```ts
    async agree(peerPublicKey: string): Promise<Uint8Array> {
      const peer = await globalThis.crypto.subtle.importKey(
        'raw',
        new Uint8Array(Buffer.from(peerPublicKey, 'base64url')),
        'X25519',
        false,
        [],
      )
      const bits = await globalThis.crypto.subtle.deriveBits(
        { name: 'X25519', public: peer },
        agreement.key,
        256,
      )
      return new Uint8Array(bits)
    },
```

and `rename` writes `device: { id: host.id, publicKey: host.publicKey, name, x25519: host.x25519 }`.

**VERIFY**

- [ ] `npm run test -- Desktop/Config/` passes with three new cases; `npm run test -- Core/Sync/` passes.
- [ ] `grep -c "device-x25519" Desktop/Config/device.ts` → 1 (the constant; every use goes through it).
- [ ] Check the work for unnecessary code or obvious mistakes.

#### Task 1.4

**TASK:** Add the device-local `sync` base-record table to `nexus.db` and the `captures` table to `versions.db`, each behind a store member, without a schema-version bump.

**FILES:** `Desktop/Store/ddl.ts`, `Desktop/Store/versionsDb.ts`, `Desktop/Store/stores.ts`, `Desktop/Store/stores.test.ts`, `Desktop/Store/sessionDb.ts`, `Core/Platform/stores.ts`, `Core/Testing/memoryStores.ts`, `Core/Testing/storesContract.ts`

**NOW**

`ddl.ts` holds one `DDL` string with six `CREATE TABLE IF NOT EXISTS` statements (`meta`, `local_state`, `mentions`, `page_values`, `memberships`, `indexed_files`) re-applied idempotently by `open.ts` on every open whose `schema_version` matches, `SCHEMA_VERSION = 1`; its header comment begins "Nothing here is content — the filesystem stays canonical — so a version mismatch drops the file and starts clean rather than migrating in place." `versionsDb.ts`:

```ts
const DDL = `
  CREATE TABLE IF NOT EXISTS snapshots (
    page_id TEXT NOT NULL,
    ts INTEGER NOT NULL,
    source TEXT NOT NULL,
    blob BLOB NOT NULL,
    PRIMARY KEY (page_id, ts)
  );`
```

with `addSnapshot(db, pageId, ts, source, text)` writing `deflateSync(text)`, `inflate = (blob) => inflateSync(blob).toString('utf8')`, `removed = (run) => Number(run.changes)`, and `latestSnapshot`, `listSnapshots`, `readSnapshot`, `deleteSnapshots`, `clearSnapshots`, `sweepSnapshots(db, cutoffMs)`. `Core/Platform/stores.ts`:

```ts
export interface Stores {
  keyValue: KeyValueStore | null
  contentIndex: ContentIndexStore | null
  snapshots: SnapshotStore | null
}

export const NO_STORES: Stores = { keyValue: null, contentIndex: null, snapshots: null }

let installed: Stores = NO_STORES

export function installStores(stores: Stores): void {
  installed = stores
}

export const keyValueStore = (): KeyValueStore | null => installed.keyValue
export const contentIndexStore = (): ContentIndexStore | null => installed.contentIndex
export const snapshotStore = (): SnapshotStore | null => installed.snapshots
```

`Desktop/Store/sessionDb.ts` `openSessionDb(root)` installs `{ keyValue: db && keyValueStore(db), contentIndex: db && contentIndexStore(db), snapshots: versionsDb && snapshotStore(versionsDb) }`; `Desktop/Store/stores.test.ts` line 46 builds the same three-field literal; `memoryStores()` returns `{ stores: { keyValue: keyValue(), contentIndex: contentIndex(index), snapshots: snapshots() }, index }`.

**CHANGE**

- [ ] Append to `DDL` in `ddl.ts`:

```sql
CREATE TABLE IF NOT EXISTS sync (
  path TEXT PRIMARY KEY,
  mtime_ms REAL NOT NULL,
  size INTEGER NOT NULL,
  hash TEXT NOT NULL,
  blob_sha TEXT NOT NULL,
  version INTEGER NOT NULL,
  base_bytes BLOB
);
```

  and one sentence at the end of the header comment: "The `sync` table is the device's base record per item and is rebuilt from the hub by the first-bind reconcile." Do not bump `SCHEMA_VERSION`.
- [ ] Append to `versionsDb.ts`'s `DDL`:

```sql
CREATE TABLE IF NOT EXISTS captures (
  path TEXT NOT NULL,
  ts INTEGER NOT NULL,
  reason TEXT NOT NULL,
  blob BLOB NOT NULL,
  PRIMARY KEY (path, ts)
);
```

  with two exports below `sweepSnapshots`: `addCapture(db, path, ts, reason, bytes)` running `INSERT OR REPLACE INTO captures (path, ts, reason, blob) VALUES (?, ?, ?, ?)` with `deflateSync(bytes)`, and `sweepCaptures(db, cutoffMs)` as `removed(db.prepare('DELETE FROM captures WHERE ts < ?').run(cutoffMs))`. Nothing in the app reads a capture back; the proof (Task 10.2) reads the table with `node -e` over `node:sqlite`.
- [ ] `Core/Platform/stores.ts`:

```ts
export interface BaseRecord {
  path: string
  mtimeMs: number
  size: number
  hash: string
  blobSha: string
  version: number
  baseBytes: Uint8Array | null
}
export interface SyncStore {
  readBase(path: string): BaseRecord | null
  readAllBases(): BaseRecord[]
  upsertBase(record: BaseRecord): void
  renameBase(oldPath: string, newPath: string): void
  deleteBase(path: string): void
}
export type CaptureReason = 'local-lost' | 'remote-lost' | 'tombstone-lost' | 'merge-lost'
export interface CaptureStore {
  addCapture(path: string, ts: number, reason: CaptureReason, bytes: Uint8Array): void
  sweepCaptures(cutoffMs: number): number
}
```

  `Stores` gains `sync: SyncStore | null` and `captures: CaptureStore | null`; `NO_STORES` gains `sync: null, captures: null`; two accessors follow the three existing ones: `export const syncStore = (): SyncStore | null => installed.sync` and `export const captureStore = (): CaptureStore | null => installed.captures`.
- [ ] `Desktop/Store/stores.ts`: `export const syncStore = (db: Db): SyncStore` over `nexus.db` (`readBase` selects `path, mtime_ms, size, hash, blob_sha, version, base_bytes` and maps to `BaseRecord` with `baseBytes: row.base_bytes === null ? null : new Uint8Array(row.base_bytes)`; `upsertBase` is `INSERT OR REPLACE INTO sync (path, mtime_ms, size, hash, blob_sha, version, base_bytes) VALUES (?, ?, ?, ?, ?, ?, ?)`; `renameBase` is `UPDATE OR REPLACE sync SET path = ? WHERE path = ?`) and `export const captureStore = (db: Db): CaptureStore` over `versions.db` binding the two `versionsDb.ts` functions.
- [ ] `Desktop/Store/sessionDb.ts` `openSessionDb`: the `installStores` literal gains `sync: db && syncStore(db)` and `captures: versionsDb && captureStore(versionsDb)`; `Desktop/Store/stores.test.ts` line 46's literal gains `sync: syncStore(db), captures: captureStore(versionsDb)` and the file gains `describeSyncStore('SQLite sync bases', () => syncStore(db))` and `describeCaptureStore('SQLite captures', () => captureStore(versionsDb))`.
- [ ] `Core/Testing/memoryStores.ts`: `sync()` over a `Map<string, BaseRecord>` and `captures()` over a `Map<string, Map<number, { reason: CaptureReason; bytes: Uint8Array }>>`; `memoryStores()` returns both. `Core/Testing/storesContract.ts` gains `describeSyncStore(name, make)` with `it('round-trips a base record and lists every row', …)`, `it('renames one path and deletes one path', …)`, `it('keeps base bytes as bytes and null as null', …)`; and `describeCaptureStore(name, make)` with `it('adds a capture and sweeps it past the cutoff', …)` (the sweep's returned count is the only read: 1 after the add, 0 once swept). `Core/Testing/contracts.test.ts` runs both against `memoryStores()`.

**AFTER**

```ts
export interface Stores {
  keyValue: KeyValueStore | null
  contentIndex: ContentIndexStore | null
  snapshots: SnapshotStore | null
  sync: SyncStore | null
  captures: CaptureStore | null
}

export const NO_STORES: Stores = {
  keyValue: null,
  contentIndex: null,
  snapshots: null,
  sync: null,
  captures: null,
}
```

A pre-existing `nexus.db` gains the `sync` table on its next open with no data loss.

**VERIFY**

- [ ] `npm run test -- Desktop/Store/` and `npm run test -- Core/Testing/` pass; the contract suite exercises both new stores against both implementations.
- [ ] `grep -c "CREATE TABLE IF NOT EXISTS" Desktop/Store/ddl.ts` → 7; `grep -c "CREATE TABLE IF NOT EXISTS" Desktop/Store/versionsDb.ts` → 2.
- [ ] Smoke launch on a scratch copy of NexusOS whose `nexus.db` predates this task: its `tabs` scope survives (`node -e` over `node:sqlite` counts `local_state` rows before and after) and `sqlite_master` lists `sync`.
- [ ] Check the work for unnecessary code or obvious mistakes.

#### Review Checkpoint

- [ ] All four gates green; the lint gate is green after a commit (the hook has run).
- [ ] Smoke launch from built output on a scratch Nexus: tree renders, a page opens, an edit saves, the app quits clean.
- [ ] `Core/Contract/engineGraph.test.ts` and `Desktop/hostGraph.test.ts` pass unchanged.

### Phase 2 — Core Predicates and Structure

**GOAL:** `Core/Sync` takes its final folder shape, the manifest predicate exists beside the watcher's, one walker serves both the corpus and the manifest, landing writes exist by name, the watcher and the write funnel can hand events to a sink the sync client installs later, and every Trash writer reports its removals. Still no visible behavior change.

#### Task 2.1

**TASK:** Move the existing `Core/Sync` files into `Contract/` and `Client/` and re-point every importer.

**FILES:** `Core/Sync/contract.ts` → `Core/Sync/Contract/wire.ts`, `Core/Sync/authority.ts` → `Core/Sync/Contract/canonical.ts`, `Core/Sync/authority.test.ts` → `Core/Sync/Contract/canonical.test.ts`, `Core/Sync/vectors.json` → `Core/Sync/Contract/vectors.json`, `Core/Sync/client.ts` → `Core/Sync/Client/call.ts`, `Core/Sync/client.test.ts` → `Core/Sync/Client/call.test.ts`, `Core/Sync/handlers.ts`, `Core/Contract/handlers.ts`, `Core/Contract/bridge.ts`, `Core/Settings/NexusRows.tsx`, `Core/Settings/NexusRows.test.tsx`, `Desktop/Config/device.ts`, `Desktop/Config/appConfig.ts`, `Sync/server.ts`, `Sync/server.test.ts`

**NOW**

`Core/Sync/` holds eight files flat. The importers of the three moving modules, verbatim:

```
Core/Settings/NexusRows.tsx:7:import type { SyncBinding, SyncState } from '@pommora/core/Sync/contract'
Core/Settings/NexusRows.test.tsx:5:import type { DeviceRecord, SyncDevice, SyncState } from '@pommora/core/Sync/contract'
Core/Contract/bridge.ts:23:import type { SyncState } from '../Sync/contract'
Core/Contract/handlers.ts:7:import type { SyncDevice } from '../Sync/contract'
Core/Sync/client.ts:3:import { canonicalString, ROUTES } from './authority'
Core/Sync/client.ts:4:import type { RouteTable, SignedHeaders } from './contract'
Core/Sync/handlers.ts:5:import { call, type CallOutcome, type SyncHost } from './client'
Core/Sync/handlers.ts:6:import type { SyncBinding, SyncDevice, SyncState } from './contract'
Core/Sync/authority.test.ts:2:import { ROUTES, canonicalString } from './authority'
Core/Sync/authority.test.ts:3:import vectors from './vectors.json'
Core/Sync/authority.ts:1:import type { RouteTable } from './contract'
Core/Sync/client.test.ts:4:import { canonicalString } from './authority'
Core/Sync/client.test.ts:5:import { call, type SyncHost } from './client'
Desktop/Config/appConfig.ts:9:import type { SyncDevice } from '@pommora/core/Sync/contract'
Desktop/Config/device.ts:5:import type { SyncDevice } from '@pommora/core/Sync/contract'
Sync/server.ts:9:import type * as Wire from '@pommora/core/Sync/contract'
```

`Sync/server.test.ts` line 84 reads the vectors from disk: `new URL('../Core/Sync/vectors.json', import.meta.url)`.

**CHANGE**

- [ ] `git mv` each file to its new path.
- [ ] Rewrite the imports above: `'../Sync/contract'` → `'../Sync/Contract/wire'` in `Core/Contract/bridge.ts` and `Core/Contract/handlers.ts`; `'@pommora/core/Sync/contract'` → `'@pommora/core/Sync/Contract/wire'` in `NexusRows.tsx`, `NexusRows.test.tsx`, `appConfig.ts`, `device.ts`, and `Sync/server.ts`; in `Client/call.ts`, `'./authority'` → `'../Contract/canonical'` and `'./contract'` → `'../Contract/wire'`; in `Client/call.test.ts`, `'./authority'` → `'../Contract/canonical'` and `'./client'` → `'./call'`; in `Core/Sync/handlers.ts`, `'./client'` → `'./Client/call'` and `'./contract'` → `'./Contract/wire'`; in `Contract/canonical.ts`, `'./contract'` → `'./wire'`; `Contract/canonical.test.ts` keeps `'./authority'` → `'./canonical'` and its `'./vectors.json'` unchanged; `Sync/server.test.ts` line 84 becomes `new URL('../Core/Sync/Contract/vectors.json', import.meta.url)`.

**AFTER**

`Core/Sync/` holds `Contract/{wire.ts, canonical.ts, canonical.test.ts, vectors.json}`, `Client/{call.ts, call.test.ts}`, `handlers.ts`, `handlers.test.ts`.

**VERIFY**

- [ ] `npm run typecheck` exits 0; `npm run test -- Core/Sync/` and `npm run test -- Sync/` pass with the same counts as before.
- [ ] `git status --porcelain Core/Sync | grep -c "^R"` → 6.
- [ ] `grep -rn "Sync/contract'\|Sync/authority'\|Sync/client'" Core Desktop Sync --include='*.ts' --include='*.tsx' | wc -l` → 0.

#### Task 2.2

**TASK:** Write the manifest predicate beside `neverWatched`, hoist the journal filenames to `nexusPaths.ts`, and generalize `corpusFilesUnder` into one walker that takes an admit predicate.

**FILES:** `Core/Paths/exclusion.ts`, `Core/Paths/exclusion.test.ts`, `Core/Paths/nexusPaths.ts`, `Core/Properties/propertyJournal.ts`, `Core/Contexts/contextJournal.ts`, `Core/Nexus/watchSettle.ts`, `Core/Files/walk.ts`, `Core/Files/walk.test.ts`

**NOW**

```ts
export function neverWatched(seg: string): boolean {
  return (
    seg === TRASH_DIR ||
    seg === 'node_modules' ||
    STORE_FILE.test(seg) ||
    (seg.startsWith('.') && seg !== NEXUS_DIR)
  )
}
```

`ignoredUnder` in `Core/Nexus/watchSettle.ts`:

```ts
export function ignoredUnder(root: string, scope: WatchScope): (path: string) => boolean {
  const isExcluded = excludedMatcher(scope.excluded)
  const isAsset = assetMatcher(scope.assetDir)
  const assetDepth = rootSegs(scope.assetDir).length
  return (path) => {
    const rel = relative(root, path)
    if (!rel || escapes(rel)) return false
    const segs = rel.split('/')
    if (isAsset(segs)) return segs.slice(assetDepth).some(neverWatched)
    return (
      segs.some(neverWatched) ||
      // Tile bodies load through tiles:get, never the tree walk — a debounced body write must not cost a re-walk. The host's document stays watched, and so does the folder entry itself, since chokidar never descends into an ignored directory.
      (segs[0] === NEXUS_DIR &&
        segs[1] === HOMEPAGE_HOST_DIRNAME &&
        segs.length >= 3 &&
        segs[2] !== TILE_DOC_FILENAME &&
        rel !== `${NEXUS_DIR}/${NEXUS_CONFIG_FILES.homepage}`) ||
      // Space hosts get the same treatment file-granularly: a tile `.md` inside a Space never walks, while `_space.json` (the tree reads banner/color/tags) stays watched.
      (segs[0] === NEXUS_DIR &&
        segs[1] === CONTEXTS_DIRNAME &&
        segs.length >= 5 &&
        isMarkdownFile(segs[segs.length - 1])) ||
      isExcluded(segs)
    )
  }
}
```

`corpusFilesUnder` in `Core/Files/walk.ts` returns nexus-relative POSIX paths:

```ts
export async function corpusFilesUnder(
  root: string,
  absDir: string,
  scope: WatchScope,
): Promise<string[]> {
  const isExcluded = excludedMatcher(scope.excluded)
  const isAsset = assetMatcher(scope.assetDir)
  const out: string[] = []
  // Descended by hand so an out-of-corpus subtree is never entered: `.trash` only grows, and the prefix match makes pruning a directory identical to filtering its files.
  const walk = async (dir: string, segs: string[]): Promise<void> => {
    for (const entry of await listEntries(dir)) {
      const next = [...segs, entry.name]
      if (NON_CORPUS_TOP.has(next[0]) || isAsset(next) || isExcluded(next)) continue
      if (entry.kind === 'dir') await walk(join(dir, entry.name), next)
      else if (isMarkdownFile(entry.name)) out.push(next.join('/'))
    }
  }
  await walk(absDir, relative(root, absDir).split('/').filter(Boolean))
  return out
}
```

`journalSlot(file, decode, same, supersedes?)` in `Core/Properties/journalSlot.ts` takes a bare filename and resolves it through `nexusConfig(root, file)`; the two call sites are `journalSlot<SchemaJournal>('property-cascade.json', decode, sameRecord)` (`propertyJournal.ts` line 42) and `journalSlot<RenameJournal>('context-rename.json', decode, same, sameEntity)` (`contextJournal.ts` line 41). `nexusPaths.ts` spells the registry the same two ways (`CONTEXTS_REGISTRY_FILENAME`, `CONTEXTS_REGISTRY_REL`). `Core/Paths/exclusion.ts` is imported by `paths.ts`, `walk.ts`, and `watchSettle.ts`, so it may import none of them; `Core/Paths/pathSafety.ts` (`escapes`) imports none of them either. Thumbnails under `.nexus/assets/<id>/thumbnails/` emit watcher events today.

**CHANGE**

- [ ] `nexusPaths.ts` exports, after `CONTEXTS_DIR_REL`: `PROPERTY_JOURNAL_FILENAME = 'property-cascade.json'`, `CONTEXT_JOURNAL_FILENAME = 'context-rename.json'`, `PROPERTY_JOURNAL_REL = \`${NEXUS_DIR}/${PROPERTY_JOURNAL_FILENAME}\``, `CONTEXT_JOURNAL_REL = \`${NEXUS_DIR}/${CONTEXT_JOURNAL_FILENAME}\``; the two `journalSlot(...)` call sites take the `_FILENAME` constants.
- [ ] `watchSettle.ts`: extract the two tile-body clauses into `export function tileBodyUnder(segs: string[], rel: string): boolean`; the closure body becomes `segs.some(neverWatched) || tileBodyUnder(segs, rel) || isExcluded(segs)` with the two comments moving onto `tileBodyUnder`.
- [ ] `exclusion.ts` exports `manifestAdmits` as the AFTER block shows: an empty or escaping path refuses; a top segment of `.trash` admits (the directory itself and everything under it, so a walk descends it whole); a name matching `STORE_FILE`, the thumbnail directory `thumbsRel(nexusId)` itself or anything under it (so a walk never descends the cache), either journal path, or a `write-file-atomic` temp (`/\.\d+$/`, the name without that suffix present in `siblings`) refuses; under the asset root only `neverWatched` segments below the root refuse; otherwise `neverWatched` segments and excluded prefixes refuse. Tile bodies pass because nothing names them. The predicate answers for a directory the same way it answers for a file, which is what lets one walker take it as its admit policy.
- [ ] `walk.ts`: add

```ts
export async function listPathsUnder(
  root: string,
  absDir: string,
  admit: (rel: string, kind: 'file' | 'dir', siblings: ReadonlySet<string>) => boolean,
): Promise<string[]>
```

  in `corpusFilesUnder`'s hand-descended shape (`siblings` is the set of entry names in the directory being listed; an admitted directory is descended, an admitted file is listed, and nothing is stat'ed, so the seed walk costs what it costs today); `corpusFilesUnder` becomes `listPathsUnder(root, absDir, (rel, kind) => { const segs = rel.split('/'); if (NON_CORPUS_TOP.has(segs[0]) || isAsset(segs) || isExcluded(segs)) return false; return kind === 'dir' || isMarkdownFile(segs[segs.length - 1]) })`. The pruning comment moves onto `listPathsUnder`.
- [ ] `Core/Paths/exclusion.test.ts` gains `describe('manifestAdmits', …)` with `it('admits the trash, the config set, and a tile body', …)` (`.trash/Notes/2026__A.md.deleted/_record.json`, `.nexus/assets/crops.json`, `.nexus/settings.json`, `.nexus/homepage/t1.md`), `it('refuses thumbnails, journals, databases, and foreign dot-entries', …)` (`.nexus/assets/<nexusId>/thumbnails` and `.nexus/assets/<nexusId>/thumbnails/a.jpg`, `.nexus/property-cascade.json`, `.nexus/context-rename.json`, `.nexus/nexus.db-wal`, `.obsidian/x`), `it('refuses an atomic-write temp while its target is a sibling', …)` (`Notes/Page.md.123` with siblings `{ 'Page.md' }` refuses; with siblings `{}` admits), `it('refuses an excluded folder and admits the asset root', …)`. `Core/Files/walk.test.ts` gains `describe('listPathsUnder', …)` with `it('returns each admitted path and never a pruned one', …)`.

**AFTER**

```ts
export function manifestAdmits(
  nexusId: string,
  scope: WatchScope,
): (rel: string, siblings?: ReadonlySet<string>) => boolean {
  const isExcluded = excludedMatcher(scope.excluded)
  const isAsset = assetMatcher(scope.assetDir)
  const assetDepth = rootSegs(scope.assetDir).length
  const thumbs = thumbsRel(nexusId)
  return (rel, siblings) => {
    if (!rel || escapes(rel)) return false
    const segs = rel.split('/')
    const name = segs[segs.length - 1]
    if (STORE_FILE.test(name)) return false
    if (segs[0] === TRASH_DIR) return true
    if (rel === thumbs || rel.startsWith(`${thumbs}/`)) return false
    if (rel === PROPERTY_JOURNAL_REL || rel === CONTEXT_JOURNAL_REL) return false
    if (TEMP_SUFFIX.test(name) && siblings?.has(name.replace(TEMP_SUFFIX, ''))) return false
    if (isAsset(segs)) return !segs.slice(assetDepth).some(neverWatched)
    return !segs.some(neverWatched) && !isExcluded(segs)
  }
}
```

with `const TEMP_SUFFIX = /\.\d+$/` beside `STORE_FILE`. Two predicates sharing `neverWatched` and the matchers; one walker with two admit policies; the journal names spelled once.

**VERIFY**

- [ ] `npm run test -- Core/Paths/`, `npm run test -- Core/Files/`, `npm run test -- Core/Nexus/`, and `npm run test -- Core/Index/` pass.
- [ ] `grep -rln "property-cascade.json\|context-rename.json" Core --include='*.ts' | grep -v test` → exactly `Core/Paths/nexusPaths.ts`.
- [ ] Check the work for unnecessary code or obvious mistakes.

#### Task 2.3

**TASK:** Name the raw landing writes, give the watcher and the write funnel a sink the sync client installs, and make every Trash removal and move record its write.

**FILES:** `Core/Files/atomicWrite.ts`, `Core/Files/atomicWrite.test.ts`, `Core/Files/writeEcho.ts`, `Core/Files/writeEcho.test.ts`, `Core/Nexus/watchSettle.ts`, `Core/Nexus/watchSettle.test.ts` (new), `Desktop/FileWatch/watcher.ts`, `Core/Trash/spend.ts`, `Core/Trash/bundle.ts`

**NOW**

```ts
export async function atomicWriteFile(filePath: string, data: string): Promise<void> {
  recordWrite(filePath)
  await machine().writeText(filePath, data)
}

export async function rewritePreservingTimes(filePath: string, data: string): Promise<void> {
  const before = await machine().stat(filePath)
  if (!before) throw new Error(`${basename(filePath)} vanished before its rewrite.`)
  await atomicWriteFile(filePath, data)
  // A volume that refuses utimes leaves the page dated now; the write itself already landed.
  await machine()
    .utimes(filePath, before.mtimeMs)
    .catch(() => {})
  forgetParse(filePath)
}
```

`writeEcho.ts`:

```ts
export function recordWrite(absPath: string): void {
  recent.set(absPath, Date.now())
  if (recent.size > 256) {
    const cutoff = Date.now() - WINDOW_MS
    for (const [p, t] of recent) if (t < cutoff) recent.delete(p)
  }
}
```

`watcher.ts` `startWatcher`, from the arming through `onEvent`:

```ts
  const ignored = ignoredUnder(root, scope)
  watcher = chokidar.watch(root, {
    ignored: (path: string) => ignored(posixPath(path)),
    ignoreInitial: true,
    persistent: true,
    awaitWriteFinish: { stabilityThreshold: SETTLE_MS, pollInterval: 50 },
    atomic: true, // coalesce the mv-_tmp atomic writes our writers use
  })
  const onEvent =
    (event: WatchEventName) =>
    (hostPath: string): void => {
      const path = posixPath(hostPath)
      // The app's own writes echo back and confirm through their own channels; state.json skips that suppression because both its lanes settle to no push when nothing moved, so a hand-edit landing right after the app's own write is not swallowed.
      if (isStatePath(root, path)) {
        if (navDebounce) clearTimeout(navDebounce)
        navDebounce = setTimeout(() => void pushNav(root, win), SETTLE_MS)
      } else if (isRecentWrite(path)) return
      batch.push({ event, absPath: path })
      if (debounce) clearTimeout(debounce)
      debounce = setTimeout(() => void settle(root, win, scope), SETTLE_MS)
    }
```

The `atomic: true` comment misdescribes the mechanism (`awaitWriteFinish` is what hides the temp). `Core/Trash/spend.ts` calls `machine().remove` at five sites (`emptyBundle`: the property bundle, the artifact under `permanentDelete`, the bundle; `restoreArtifact`: the property bundle, the bundle after the move) and hands the artifact to `deps.trashToSystem(artifactAbs)` on the other `emptyBundle` branch, none recorded; `restoreArtifact` already records both ends of its `machine().rename(artifactAbs, targetAbs)`, so `grep -c "recordWrite" Core/Trash/spend.ts` is 3 today. `Core/Trash/bundle.ts` `settleBundle` comments `// The source's unlink echo is our own write (the .trash destination is unwatched).` `Core/Nexus/watchSettle.test.ts` does not exist.

**CHANGE**

- [ ] `atomicWrite.ts`: add, after `rewritePreservingTimes`, the one landing writer the AFTER block shows: no `recordWrite`, the mtime stamped as `rewritePreservingTimes` stamps it, then `forgetParse`. Every landing is bytes (a decrypted blob or a merged JSON encoded once), so no text variant exists.
- [ ] `writeEcho.ts`: `let tap: ((absPath: string) => void) | null = null`; `export function setWriteTap(fn: ((absPath: string) => void) | null): void { tap = fn }`; `recordWrite` ends with `tap?.(absPath)`.
- [ ] `watchSettle.ts`: `let tap: ((ev: WatchEvent) => void) | null = null`; `export function setWatchTap(fn: ((ev: WatchEvent) => void) | null): void`; `export const watchTap = (): ((ev: WatchEvent) => void) | null => tap`. The closure `ignoredUnder` builds moves into `function ignoreUnder(root, scope, tileBodies: boolean)`, whose body reads `segs.some(neverWatched) || (tileBodies && tileBodyUnder(segs, rel)) || isExcluded(segs)`; `export const ignoredUnder = (root, scope) => ignoreUnder(root, scope, true)` and `export const syncIgnoredUnder = (root, scope) => ignoreUnder(root, scope, false)`.
- [ ] `watcher.ts`: import `syncIgnoredUnder` and `watchTap` beside `ignoredUnder`; chokidar's `ignored` becomes `const skip = syncIgnoredUnder(root, scope)` with `ignored: (path: string) => skip(posixPath(path))` (both predicates answer true for a path the watcher skips); delete the `atomic: true` line; `onEvent` becomes the AFTER block.
- [ ] `spend.ts`: `recordWrite(bundleAbs)` before each of the four `machine().remove(bundleAbs)` calls, and in `emptyBundle` `recordWrite(artifactAbs)` before the `if (deps.permanentDelete === true)` line so both the permanent and the system-trash branch report the artifact's departure. `bundle.ts`'s comment becomes `// The source's unlink echo is our own write; the .trash destination is unwatched by the tree, and the write funnel reports both paths to sync.`
- [ ] `Core/Files/atomicWrite.test.ts` gains `describe('landBytes', …)` with `it('records no echo and stamps the given mtime', …)` (`isRecentWrite` false after the write, `stat(...).mtimeMs` equal to the argument, the bytes read back equal). `Core/Files/writeEcho.test.ts` gains `describe('setWriteTap', …)` with `it('hands every recorded path to the tap until it is cleared', …)`. `Core/Nexus/watchSettle.test.ts` (new) with `describe('syncIgnoredUnder', …)`: `it('admits a tile body the tree ignores', …)` (`.nexus/homepage/t1.md` and `.nexus/contexts/Areas/Home/t1.md`: `ignoredUnder` true, `syncIgnoredUnder` false), `it('still refuses .trash', …)`; and `describe('the watch tap', …)`: `it('is handed an event the echo check would drop', …)` (install a recording tap, `recordWrite` a path, call the tap through `watchTap()` and assert it recorded; `setWatchTap(null)` afterward).

**AFTER**

```ts
// The only writer that skips the echo: a landing must classify as external so the tree reads it.
export async function landBytes(
  filePath: string,
  bytes: Uint8Array,
  mtimeMs: number,
): Promise<void> {
  await machine().writeBytes(filePath, bytes)
  await machine()
    .utimes(filePath, mtimeMs)
    .catch(() => {})
  forgetParse(filePath)
}
```

`watcher.ts` `onEvent`:

```ts
  const onEvent =
    (event: WatchEventName) =>
    (hostPath: string): void => {
      const path = posixPath(hostPath)
      watchTap()?.({ event, absPath: path })
      if (ignored(path)) return
      // The app's own writes echo back and confirm through their own channels; state.json skips that suppression because both its lanes settle to no push when nothing moved, so a hand-edit landing right after the app's own write is not swallowed.
      if (isStatePath(root, path)) {
        if (navDebounce) clearTimeout(navDebounce)
        navDebounce = setTimeout(() => void pushNav(root, win), SETTLE_MS)
      } else if (isRecentWrite(path)) return
      batch.push({ event, absPath: path })
      if (debounce) clearTimeout(debounce)
      debounce = setTimeout(() => void settle(root, win, scope), SETTLE_MS)
    }
```

Every watched event reaches the tap before the echo check; tile bodies reach the tap and never the tree; `.trash` writes, removals, and restores reach the tap through the write funnel; a landing is a write with no echo and the writer's mtime.

**VERIFY**

- [ ] `npm run test -- Core/Files/`, `npm run test -- Core/Nexus/`, and `npm run test -- Core/Trash/` pass.
- [ ] `grep -c "atomic: true" Desktop/FileWatch/watcher.ts` → 0; `grep -c "recordWrite" Core/Trash/spend.ts` → 8.
- [ ] Smoke launch: an external edit (`echo >> page.md` from the shell) still reaches the tree; an in-app save still does not re-walk.
- [ ] Check the work for unnecessary code or obvious mistakes.

#### Review Checkpoint

- [ ] Gates green; smoke launch clean.
- [ ] Engine and host graph tests pass; `Core/Sync/Contract/wire.ts` still imports nothing.

### Phase 3 — Hub Restructure and Authority

**GOAL:** The hub becomes a folder with the built-ins rule as a gate and its final schema with one migration for the roster columns, one authority function that yields a device and a role, per-route caps and timeouts, TLS, and a configurable bind address. The four roster verbs answer exactly as before.

#### Task 3.1

**TASK:** Split `Sync/server.ts` into `hub.ts`, `wire.ts`, `authority.ts`, `Store/`, and `Routes/`, ship the final DDL with its one migration, and add the graph test that makes the built-ins rule mechanical.

**FILES:** `Sync/server.ts` (deleted), `Sync/hub.ts`, `Sync/wire.ts`, `Sync/authority.ts`, `Sync/Store/open.ts`, `Sync/Store/roster.ts`, `Sync/Routes/roster.ts`, `Sync/Testing/hub.ts`, `Sync/hubGraph.test.ts`, `Sync/server.test.ts` → `Sync/roster.test.ts`, `Sync/wire.test.ts`, `package.json`

**NOW**

`server.ts` (316 lines) holds, in order, with the line each begins on:

- 11–16: `PORT`, `DATA_DIR`, `HOST = '127.0.0.1'`, `BODY_CAP = 8192`, `WINDOW_MS = 5 * 60_000`, `SCHEMA_VERSION = 1`
- 19–24: `ULID`, `PUBLIC_KEY`, `fingerprintOf(publicKey)`
- 26: `export function canonical(method: string, path: string, rawBody: Buffer, ts: number): string`, which hashes `rawBody` itself
- 31–38: `PATHS … as const satisfies { [K in keyof Wire.RouteTable]: Wire.RouteTable[K]['path'] }` and `ROUTES = Object.keys(PATHS)`
- 40–70: `DDL` (`meta`, `device`, `membership`) and `openDb(dir)`, which applies it and inserts `schema_version` when absent
- 72–76: `type Reply = { status: number; body: object }` and `refuse(status, error)`
- 78–168: `verbs(db)` closing over `listStatement` and `approvedStatement`, with `list`, `nexusOf`, `targetOf`, and the four handlers typed `(caller: string, body: unknown) => Reply`
- 170–205: `type Signature = { device: string; ts: number; sig: string }`, `header(req, name)`, `signatureOf(req)` (the three headers and the five-minute window), `verifySigned(path, rawBody, signed, publicKey)` (builds the JWK, calls `canonical('POST', path, rawBody, signed.ts)`, answers `null`, 401 `unauthorized`, or 400 `bad-key`)
- 207–229: `readBody(req)` (null over `BODY_CAP`), `MALFORMED`, `parseBody(raw)`
- 231–267: `route(db, handlers, req)`: POST only → `readBody` → path match → `signatureOf` → the `connect` branch (key from the body, `fingerprintOf(publicKey) !== signed.device` → 401) or the stored-key branch (`SELECT public_key FROM device WHERE fingerprint = ?`, absent → 404) → `verifySigned` → `parseBody` → handler
- 269–305: `start(opts: { dataDir: string; port: number })` returning `{ port, close() }`, `res.end(JSON.stringify(reply.body))` for every reply
- 307–316: the `import.meta.main` entry printing `Pommora Sync on http://${HOST}:${port}`

`server.test.ts` holds 13 `it` blocks: the vector case (`matches the shared canonical vectors`, reading `../Core/Sync/Contract/vectors.json` after Task 2.1 and hashing `Buffer.from(vector.body, 'utf8')` through `canonical`) and twelve roster cases; `signer(name)` mints an Ed25519 pair and signs `canonical('POST', path, raw, ts)`; `boot()` runs `start({ dataDir, port: 0 })` into the module-level `running` and `base`, and the restart case calls `running.close()` then `boot()` against the same `dataDir`. `Sync/tsconfig.json` is `nodenext` with `allowImportingTsExtensions`, so every relative import carries `.ts`; a value import of any Core file pulls that file into the Sync program as CommonJS and fails under `verbatimModuleSyntax`. `package.json`'s `"sync": "node Sync/server.ts"`.

**CHANGE**

- [ ] `Sync/wire.ts`: `ULID`, `PUBLIC_KEY`, `fingerprintOf`, `PATHS`, `ROUTES`, `Reply`, `refuse`, `MALFORMED`, `parseBody`, moved verbatim, plus `canonical` re-spelled as `export function canonical(method: string, path: string, bodySha256Hex: string, ts: number): string { return [method.toUpperCase(), path, bodySha256Hex, String(ts)].join('\n') }` and `export const sha256Hex = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex')`.
- [ ] `Sync/Store/open.ts`: `openStore(dir): Store` returning `{ db, roster }` with the **final** `DDL` for the whole arc, applied idempotently on every open:

```sql
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS device (fingerprint TEXT PRIMARY KEY, public_key TEXT NOT NULL, name TEXT NOT NULL, x25519 TEXT);
CREATE TABLE IF NOT EXISTS membership (nexus_id TEXT NOT NULL, fingerprint TEXT NOT NULL, approved INTEGER NOT NULL, role TEXT NOT NULL DEFAULT 'editor', PRIMARY KEY (nexus_id, fingerprint));
CREATE TABLE IF NOT EXISTS nexus (nexus_id TEXT PRIMARY KEY, version INTEGER NOT NULL, protocol INTEGER NOT NULL, kdf TEXT NOT NULL, history_days INTEGER NOT NULL, seq INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS ring (nexus_id TEXT NOT NULL, key_id TEXT NOT NULL, holder TEXT NOT NULL, wrapped BLOB NOT NULL, created_ms INTEGER NOT NULL, PRIMARY KEY (nexus_id, key_id, holder));
CREATE TABLE IF NOT EXISTS item (nexus_id TEXT NOT NULL, path TEXT NOT NULL, version INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (nexus_id, path));
CREATE TABLE IF NOT EXISTS change (nexus_id TEXT NOT NULL, seq INTEGER NOT NULL, kind TEXT NOT NULL, path TEXT NOT NULL, from_path TEXT, record TEXT, device TEXT NOT NULL, at_ms INTEGER NOT NULL, PRIMARY KEY (nexus_id, seq));
CREATE TABLE IF NOT EXISTS blob (id INTEGER PRIMARY KEY, nexus_id TEXT NOT NULL, sha256 TEXT NOT NULL, key_id TEXT NOT NULL, size INTEGER NOT NULL, bytes BLOB NOT NULL, at_ms INTEGER NOT NULL, UNIQUE (nexus_id, sha256));
CREATE TABLE IF NOT EXISTS capture (nexus_id TEXT NOT NULL, path TEXT NOT NULL, at_ms INTEGER NOT NULL, record TEXT NOT NULL, PRIMARY KEY (nexus_id, path, at_ms));
CREATE TABLE IF NOT EXISTS request (nexus_id TEXT NOT NULL, request_id TEXT NOT NULL, reply TEXT NOT NULL, at_ms INTEGER NOT NULL, PRIMARY KEY (nexus_id, request_id));
```

  plus `SCHEMA_VERSION = 2` and `const MIGRATIONS: Record<number, string[]> = { 2: ["ALTER TABLE membership ADD COLUMN role TEXT NOT NULL DEFAULT 'editor'", "UPDATE membership SET role = 'owner' WHERE approved = 1", "ALTER TABLE device ADD COLUMN x25519 TEXT"] }`, applied inside one `BEGIN … COMMIT` for every version above the stored `schema_version` up to `SCHEMA_VERSION`, then `schema_version` written; a store the final DDL creates is written at version 2 and never runs the entry, and a store at version 1 lacks both columns, so no `pragma_table_info` check precedes the `ALTER`s. `DatabaseSync` opens with `{ timeout: 5000 }`. `export interface Store { db: DatabaseSync; roster: ReturnType<typeof rosterStore> }`. `Sync/Store/roster.ts`: `export function rosterStore(db: DatabaseSync)` returning `{ list(nexusId), upsertDevice(fingerprint, publicKey, name), publicKeyOf(fingerprint), hasMembers(nexusId), addMembership(nexusId, fingerprint, approved), isApproved(nexusId, fingerprint), approve(nexusId, fingerprint), revoke(nexusId, fingerprint) }`, each one of today's statements with the SQL moved verbatim (`list` keeps `ORDER BY d.name`).
- [ ] `Sync/Routes/roster.ts`: `export function rosterRoutes(store: Store)` returning the four handlers with today's bodies over `store.roster`, typed `(id: Identity, body: unknown) => Reply` and `satisfies { [K in keyof Wire.RouteTable]: … }`; `nexusOf` and `targetOf` move with them. This task's `Identity` is `{ device: string; publicKey: string }`; 3.2 widens it.
- [ ] `Sync/authority.ts`: `Signature`, `header`, `signatureOf`, and `verifySigned(path: string, bodySha256Hex: string, signed: Signature, publicKey: string): Reply | null` (today's body with `canonical('POST', path, bodySha256Hex, signed.ts)`), plus `export interface Identity { device: string; publicKey: string; signed: Signature }` and `identify(store: Store, req: IncomingMessage, route: keyof Wire.RouteTable, body: unknown): Identity | Reply`: today's two branches lifted from `route()` (`signatureOf` null → 401 `unauthorized`; on `connect`, the body's `publicKey` validated by `PUBLIC_KEY` and `fingerprintOf(publicKey) !== signed.device` → 401; otherwise `store.roster.publicKeyOf(signed.device)` absent → 404 `not-found`), returning `{ device: signed.device, publicKey, signed }` so `hub.ts` can hand `signed` to `verifySigned`.
- [ ] `Sync/hub.ts`: `PORT`, `DATA_DIR`, `HOST`, `WINDOW_MS` stays in `authority.ts`; `readCapped(req: IncomingMessage, cap: number): Promise<Buffer | null>` (today's `readBody` with the cap as an argument; this task passes `8192` for every route); `route(store, routes, req)` in the Constraint's order: `req.method !== 'POST'` → 404; path match against `PATHS` → 404; `readCapped` → 413 `too-large`; `parseBody` → 400 `malformed`; `identify` → its refusal; `verifySigned(path, sha256Hex(raw), id.signed, id.publicKey)` → its refusal; `routes[name](id, body)`. `start(opts: { dataDir: string; port: number })` and the entry move with today's bodies. `package.json`: `"sync": "node Sync/hub.ts"`.
- [ ] `Sync/Testing/hub.ts`: `export async function boot(dataDir = mkdtempSync(join(tmpdir(), 'pommora-sync-'))): Promise<{ base: string; dataDir: string; close(): Promise<void> }>` (today's `beforeAll` body) and `export function signer(name: string)` (today's helper, returning `{ id, publicKey, name, x25519, call }` with `x25519` from `generateKeyPairSync('x25519')`'s raw public key as base64url, and `call` hashing `raw` with `sha256Hex` before `canonical`).
- [ ] `Sync/hubGraph.test.ts`: `import ts from 'typescript'`; walk every `Sync/**/*.ts` except `*.test.ts`, `vitest.config.ts`, and `Testing/` with `readdirSync(…, { recursive: true })`; for each file, `ts.createSourceFile` and collect every `ImportDeclaration` and `ExportDeclaration` with a string module specifier as `{ spec, typeOnly: node.importClause?.isTypeOnly === true }`; `it('reaches nothing beyond Node, its own files, and Core types', …)` asserts every `spec` is `node:*`, a relative path ending in `.ts`, or `@pommora/core/Sync/Contract/*` with `typeOnly` true.
- [ ] `git mv server.test.ts roster.test.ts`; its `signer`, `boot`, and the vector case leave it (`Sync/wire.test.ts` gains `it('matches the shared canonical vectors', …)` hashing `Buffer.from(vector.body, 'utf8')` with `sha256Hex` before `canonical`); the twelve roster cases import `boot` and `signer` from `./Testing/hub.ts`.

**AFTER**

```
Sync/
  hub.ts  wire.ts  authority.ts
  Store/open.ts  Store/roster.ts
  Routes/roster.ts
  Testing/hub.ts  Testing/cert.pem  Testing/key.pem
  hubGraph.test.ts  roster.test.ts  wire.test.ts
  package.json  tsconfig.json  vitest.config.ts
```

**VERIFY**

- [ ] `npm run typecheck` exits 0; `npm run test -- Sync/` passes 14 cases: the twelve roster cases in `roster.test.ts`, the vector case in `wire.test.ts`, and the graph case in `hubGraph.test.ts`.
- [ ] `node --input-type=module -e 'await import("./Sync/hub.ts")'` from the root exits 0.
- [ ] `git ls-files Sync | wc -l` → 15; `test -f Sync/server.ts && echo 1 || echo 0` → 0.
- [ ] `grep -c "CREATE TABLE IF NOT EXISTS" Sync/Store/open.ts` → 10; `grep -c "@pommora/core" Sync/hubGraph.test.ts` → 1 (the allowed prefix, spelled once in the assertion).
- [ ] Check the work for unnecessary code or obvious mistakes.

#### Task 3.2

**TASK:** Roles on the roster, the migration Task 3.1 shipped proven against a version-one store, and `identify()` finished so every route receives a device and a role and no route reads a signature.

**FILES:** `Sync/Store/roster.ts`, `Sync/authority.ts`, `Sync/Routes/roster.ts`, `Sync/hub.ts`, `Sync/wire.ts`, `Sync/roster.test.ts`, `Sync/store.test.ts` (new), `Core/Sync/Contract/wire.ts`, `Core/Testing/fixtures.ts` (new), `Core/Settings/NexusRows.test.tsx`

**NOW**

After Task 3.1, `Sync/authority.ts` holds:

```ts
type Signature = { device: string; ts: number; sig: string }

function header(req: IncomingMessage, name: string): string | null {
  const value = req.headers[name]
  return typeof value === 'string' && value.length > 0 ? value : null
}

function signatureOf(req: IncomingMessage): Signature | null {
  const device = header(req, 'x-pommora-device')
  const rawTs = header(req, 'x-pommora-timestamp')
  const sig = header(req, 'x-pommora-signature')
  if (!device || !rawTs || !sig) return null
  const ts = Number(rawTs)
  if (!Number.isInteger(ts) || Math.abs(Date.now() - ts) > WINDOW_MS) return null
  return { device, ts, sig }
}

function verifySigned(
  path: string,
  bodySha256Hex: string,
  signed: Signature,
  publicKey: string,
): Reply | null {
  try {
    const key = createPublicKey({
      key: { kty: 'OKP', crv: 'Ed25519', x: publicKey },
      format: 'jwk',
    })
    const data = Buffer.from(canonical('POST', path, bodySha256Hex, signed.ts), 'utf8')
    return verify(null, data, key, Buffer.from(signed.sig, 'base64url'))
      ? null
      : refuse(401, 'unauthorized')
  } catch {
    return refuse(400, 'bad-key')
  }
}
```

and `identify(store, req, route, body)` resolving the device in two branches; approval is `store.roster.isApproved(nexusId, id.device)` inside three handlers of `Sync/Routes/roster.ts`; nothing reads a role. `ConnectBody` is `{ nexusId, publicKey, name }`; `DeviceRecord` is `SyncDevice & { approved: boolean }`; `rosterStore(db).list` selects `d.fingerprint AS id, d.public_key AS publicKey, d.name AS name, m.approved AS approved`.

**CHANGE**

- [ ] `Core/Sync/Contract/wire.ts`: `export type Role = 'owner' | 'editor' | 'reader'`; `export interface RouteMeta { requires: Role | 'none'; cap: number }`; `DeviceRecord` becomes `SyncDevice & { approved: boolean; role: Role }` (`x25519?` arrives through `SyncDevice`); `ConnectBody` gains `x25519?: string`. `Core/Testing/fixtures.ts` (new; the sibling `Core/Testing/fixtures/` folder holds JSON data alone) exports `deviceRecord(overrides?: Partial<DeviceRecord>): DeviceRecord` (a fixed id and key, `approved: true`, `role: 'editor'`), and `Core/Settings/NexusRows.test.tsx`'s `DeviceRecord` literals (`OTHER` and the spreads over `THIS_DEVICE`) build through it; Task 8.2 adds the page fixture beside it.
- [ ] `Sync/wire.ts`: `export const META = { connect: { requires: 'none', cap: 8192 }, devices: { requires: 'reader', cap: 8192 }, approve: { requires: 'editor', cap: 8192 }, revoke: { requires: 'owner', cap: 8192 } } as const satisfies { [K in keyof Wire.RouteTable]: Wire.RouteMeta }` and `export const ROLE_ORDER = ['reader', 'editor', 'owner'] as const`.
- [ ] `Sync/Store/roster.ts`: `list` selects `d.x25519 AS x25519, m.role AS role` as well and maps `x25519: r.x25519 ?? undefined`; `upsertDevice(fingerprint, publicKey, name, x25519: string | null)` writes `x25519 = COALESCE(excluded.x25519, device.x25519)` on conflict; `addMembership(nexusId, fingerprint, approved, role)`; `membership(nexusId, fingerprint): { approved: boolean; role: Wire.Role } | null`.
- [ ] `authority.ts`: `Identity` becomes `{ device: string; publicKey: string; nexusId: string; role: Wire.Role | null; approved: boolean; signed: Signature }`; `identify(store: Store, req: IncomingMessage, route: keyof Wire.RouteTable, body: unknown): Identity | Reply` as the AFTER block shows; `verify(id: Identity, path: string, bodySha256Hex: string): Reply | null` is `verifySigned(path, bodySha256Hex, id.signed, id.publicKey)` renamed with the identity as its first argument.
- [ ] `Routes/roster.ts`: `connect` calls `store.roster.upsertDevice(id.device, publicKey, name, x25519 ?? null)` and `addMembership(nexusId, id.device, seeded ? 0 : 1, seeded ? 'editor' : 'owner')`; the three `isApproved` checks in `devices`, `approve`, and `revoke` are deleted, since `identify` already refused an unapproved or under-role caller.
- [ ] `roster.test.ts` gains `it('refuses a reader the approve route', …)` (a third signer approved then `UPDATE membership SET role = 'reader'` through a `DatabaseSync` opened on `<dataDir>/sync.db`; its approve answers 404), `it('refuses an editor the revoke route', …)`, `it('lets the owner revoke', …)`, `it('lists the agreement key connect carried', …)` (`x25519` in the `devices` reply equals the signer's); `Sync/store.test.ts` (new) with `it('migrates a version-one store and makes its approved rows owners', …)` (build `sync.db` inline from the three-table DDL of `server.ts` with `schema_version = 1` and one approved membership row, `openStore`, read `role`).

**AFTER**

```ts
export function identify(
  store: Store,
  req: IncomingMessage,
  route: keyof Wire.RouteTable,
  body: unknown,
): Identity | Reply {
  const signed = signatureOf(req)
  if (!signed) return refuse(401, 'unauthorized')
  const nexusId = (body as Partial<Wire.NexusBody> | null)?.nexusId
  if (typeof nexusId !== 'string' || !ULID.test(nexusId)) return refuse(400, 'malformed')
  let publicKey: string
  if (route === 'connect') {
    const claimed = (body as Partial<Wire.ConnectBody> | null)?.publicKey
    if (typeof claimed !== 'string' || !PUBLIC_KEY.test(claimed)) return refuse(400, 'malformed')
    if (fingerprintOf(claimed) !== signed.device) return refuse(401, 'unauthorized')
    publicKey = claimed
  } else {
    const stored = store.roster.publicKeyOf(signed.device)
    if (stored === null) return refuse(404, 'not-found')
    publicKey = stored
  }
  const membership = store.roster.membership(nexusId, signed.device)
  const id: Identity = {
    device: signed.device,
    publicKey,
    nexusId,
    role: membership?.role ?? null,
    approved: membership?.approved ?? false,
    signed,
  }
  const requires = META[route].requires
  if (requires === 'none') return id
  if (!id.approved || id.role === null) return refuse(404, 'not-found')
  if (ROLE_ORDER.indexOf(id.role) < ROLE_ORDER.indexOf(requires)) return refuse(404, 'not-found')
  return id
}
```

The dispatcher in `hub.ts` reads `readCapped(req, META[name].cap)`, then `identify`, then `verify(id, path, sha256Hex(raw))`, then the handler. Every route is `(id: Identity, body: unknown) => Reply`; the hub has one function that says who is calling and what they may do.

**VERIFY**

- [ ] `npm run test -- Sync/` passes with the five new cases.
- [ ] `grep -c "isApproved" Sync/Routes/roster.ts` → 0; `grep -c "x-pommora-signature" Sync/Routes/roster.ts` → 0; `grep -c "x-pommora-" Sync/authority.ts` → 3.
- [ ] Check the work for unnecessary code or obvious mistakes.

#### Task 3.3

**TASK:** Per-route body caps and timeouts, TLS from a certificate in the data directory, a configurable bind address, and a dev-certificate script.

**FILES:** `Sync/hub.ts`, `Sync/wire.ts`, `Core/Sync/Contract/wire.ts`, `Sync/Testing/hub.ts`, `Sync/tls.test.ts` (new), `Sync/scripts/cert.sh` (new), `package.json`

**NOW**

`hub.ts` after Task 3.1 holds `const HOST = '127.0.0.1'` and, moved from `server.ts`:

```ts
function readCapped(req: IncomingMessage, cap: number): Promise<Buffer | null> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size <= cap) chunks.push(chunk)
    })
    req.on('end', () => resolve(size > cap ? null : Buffer.concat(chunks)))
    req.on('error', reject)
  })
}
```

```ts
export async function start(opts: {
  dataDir: string
  port: number
}): Promise<{ port: number; close(): Promise<void> }> {
  const store = openStore(opts.dataDir)
  const routes = rosterRoutes(store)
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    route(store, routes, req)
      .catch((e) => {
        console.error('Sync request failed:', e)
        return refuse(500, 'internal')
      })
      .then((reply) => {
        res.writeHead(reply.status, { 'content-type': 'application/json' })
        res.end(JSON.stringify(reply.body))
      })
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(opts.port, HOST, () => {
      server.off('error', reject)
      resolve()
    })
  })
  return {
    port: (server.address() as AddressInfo).port,
    close: () =>
      new Promise<void>((resolve, reject) => {
        closeAll()
        server.closeAllConnections()
        server.close((e) => {
          store.db.close()
          if (e) reject(e)
          else resolve()
        })
      }),
  }
}
```

Every route shares Node's default request timeout.

**CHANGE**

- [ ] `Core/Sync/Contract/wire.ts`: `RouteMeta` gains `timeoutMs: number`. `Sync/wire.ts`: `export const JSON_TIMEOUT_MS = 10_000`, and every `META` entry gains `timeoutMs: JSON_TIMEOUT_MS` (Task 4.4's `pull` is the one route with a longer figure).
- [ ] `hub.ts`: `route()` calls `req.setTimeout(META[name].timeoutMs)` after the path match, and `start()`'s handler attaches `req.on('timeout', …)` answering `refuse(408, 'timeout')` through the same reply writer, so a slow body is refused rather than the socket destroyed silently. `const HOST = process.env.POMMORA_SYNC_HOST ?? '127.0.0.1'`. `start(opts: { dataDir: string; port: number; host?: string; tls?: { cert: string; key: string } })`: `opts.tls ? httpsCreateServer(opts.tls, handler) : createServer(handler)`, listening on `opts.host ?? '127.0.0.1'`; the return gains `pin: string | null` (`new X509Certificate(opts.tls.cert).fingerprint256` or null). The entry reads `<DATA>/hub-cert.pem` and `<DATA>/hub-key.pem` with `existsSync`, passes both as `tls` when both exist, and prints `Pommora Sync on ${scheme}://${host}:${port}` followed by ` · pin ${pin}` when TLS is on.
- [ ] `Sync/scripts/cert.sh`:

```sh
DATA="${POMMORA_SYNC_DATA:-$HOME/.pommora-sync}"
mkdir -p "$DATA"
openssl req -x509 -nodes -days 3650 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 \
  -subj "/CN=pommora-hub" -addext "subjectAltName=IP:127.0.0.1,DNS:localhost" \
  -keyout "$DATA/hub-key.pem" -out "$DATA/hub-cert.pem"
```

  `package.json` gains `"sync:cert": "sh Sync/scripts/cert.sh"`.
- [ ] `Sync/tls.test.ts`: `it('serves the roster over TLS to a client pinning its fingerprint', …)`: `start({ dataDir, port: 0, tls: { cert, key } })` over the committed pair from Task 1.2 (`readFileSync(new URL('./Testing/cert.pem', import.meta.url))`), a signer's `connect` sent through `node:https.request` with `rejectUnauthorized: false` and a `secureConnect` check that `getPeerCertificate().fingerprint256` equals the returned `pin`, answering 200. The 408 answer has no case of its own: proving it means waiting out `JSON_TIMEOUT_MS` on every test run, and the handler is two lines read at review. `Sync/Testing/hub.ts`'s `boot` gains `tls?: { cert: string; key: string }` and its `call` uses `node:https` with `rejectUnauthorized: false` when `base` starts with `https:`.

**AFTER**

`npm run sync` prints `Pommora Sync on https://127.0.0.1:7473 · pin AB:CD:…` when certificates exist and `Pommora Sync on http://127.0.0.1:7473` otherwise; a 9 KiB `connect` body is refused as before; every route names its own cap and timeout in one table.

**VERIFY**

- [ ] `npm run test -- Sync/` passes.
- [ ] `POMMORA_SYNC_DATA=$(mktemp -d) sh Sync/scripts/cert.sh` exits 0 and both PEM files exist in that directory.
- [ ] Check the work for unnecessary code or obvious mistakes.

#### Review Checkpoint

- [ ] Gates green; `Sync/hubGraph.test.ts` green.
- [ ] `npm run sync` in the background, then the existing Settings › General Nexus heading (built output, scratch userData) connects, lists, approves, and revokes exactly as before; the hub is killed afterward.

### Phase 4 — Hub Content

**GOAL:** The hub holds an info record and a key ring per Nexus, content-addressed encrypted blobs, a change log with one counter per Nexus, and a long-polling pull. Nothing in Core calls it yet; every route is proven by the hub's own tests.

#### Task 4.1

**TASK:** The per-Nexus info record with a create-once rule and a version precondition, and the ring route.

**FILES:** `Core/Sync/Contract/wire.ts`, `Core/Sync/Contract/canonical.ts`, `Sync/wire.ts`, `Sync/Store/nexus.ts` (new), `Sync/Routes/nexus.ts` (new), `Sync/Routes/roster.ts`, `Sync/hub.ts`, `Sync/nexus.test.ts` (new)

**NOW**

The `nexus` and `ring` tables exist (Task 3.1) with no reader or writer. `Core/Sync/Contract/canonical.ts`:

```ts
export const ROUTES = {
  connect: { method: 'POST', path: '/connect' },
  devices: { method: 'POST', path: '/devices' },
  approve: { method: 'POST', path: '/approve' },
  revoke: { method: 'POST', path: '/revoke' },
} as const satisfies { [K in keyof RouteTable]: Pick<RouteTable[K], 'method' | 'path'> }
```

`Sync/wire.ts` holds `PATHS` (the four paths, `satisfies { [K in keyof Wire.RouteTable]: Wire.RouteTable[K]['path'] }`) and `META` (Task 3.2); `Sync/hub.ts`'s `start` builds `rosterRoutes(store)` alone.

**CHANGE**

- [ ] `Core/Sync/Contract/wire.ts`:

```ts
export interface KdfParams { hash: 'SHA-256'; iterations: number; salt: string }
export interface RingEntry { keyId: string; holder: 'password' | string; wrapped: string; createdMs: number }
export interface InfoRecord { version: number; protocol: 1; kdf: KdfParams; historyDays: number; ring: RingEntry[] }
export interface InfoBody { nexusId: string; create?: Omit<InfoRecord, 'version'> }
export interface InfoReply { info: InfoRecord }
export interface RingBody { nexusId: string; base: number; add: RingEntry[] }
```

  `RouteTable` gains `info: { method: 'POST'; path: '/info'; body: InfoBody; reply: InfoReply }` and `ring: { method: 'POST'; path: '/ring'; body: RingBody; reply: InfoReply }`; `canonical.ts`'s `ROUTES` gains `info: { method: 'POST', path: '/info' }` and `ring: { method: 'POST', path: '/ring' }`; `Sync/wire.ts`'s `PATHS` gains both paths and `META` gains `info: { requires: 'reader', cap: 65536, timeoutMs: JSON_TIMEOUT_MS }` and `ring: { requires: 'editor', cap: 65536, timeoutMs: JSON_TIMEOUT_MS }`.
- [ ] `Sync/Store/nexus.ts`: `export function nexusStore(db: DatabaseSync)` returning `readInfo(nexusId): Wire.InfoRecord | null` (the `nexus` row joined with its `ring` rows ordered by `created_ms`), `createInfo(nexusId, record: Omit<Wire.InfoRecord, 'version'>): Wire.InfoRecord | null` (null when a row exists; inserts the row at `version = 1`, `seq = 0`, and each ring entry), `appendRing(nexusId, base, add: Wire.RingEntry[]): { ok: true; info: Wire.InfoRecord } | { ok: false; info: Wire.InfoRecord }` in one transaction that refuses with the current record when `base !== version` and otherwise inserts the entries and bumps `version`, and `dropHolder(nexusId, holder): void`. `Store` gains `nexus: ReturnType<typeof nexusStore>`.
- [ ] `Sync/Routes/nexus.ts`: `export function nexusRoutes(store: Store)` returning `info` (reads; when absent and `create` is present, creates; when absent and no `create`, 404 `not-found`; when present and `create` is present, 409 `exists`) and `ring` (a stale `base` answers 409 `stale` with `{ error: 'stale', info }`), both `(id: Identity, body: unknown) => Reply`. `Routes/roster.ts`'s `revoke` calls `store.nexus.dropHolder(nexusId, deviceId)` after the membership delete. `hub.ts` spreads `{ ...rosterRoutes(store), ...nexusRoutes(store) }`.
- [ ] `Sync/nexus.test.ts`: `it('creates the info record once', …)`, `it('refuses a stale ring base with the current record', …)`, `it('drops the revoked device from the ring', …)`, `it('lets a reader read the record and refuses it the ring', …)`.

**AFTER**

A Nexus on the hub is a row carrying its protocol, KDF parameters, retention, and counter, with a ring of wrapped keys beside it.

**VERIFY**

- [ ] `npm run test -- Sync/` passes with the new suite; `npm run typecheck` exits 0.
- [ ] Check the work for unnecessary code or obvious mistakes.

#### Task 4.2

**TASK:** Content-addressed blob routes: bytes up under their own hash, bytes down by hash, both streamed under the byte cap.

**FILES:** `Core/Sync/Contract/wire.ts`, `Core/Sync/Contract/canonical.ts`, `Sync/wire.ts`, `Sync/Store/open.ts`, `Sync/Store/log.ts` (new), `Sync/Routes/blobs.ts` (new), `Sync/hub.ts`, `Sync/authority.ts`, `Sync/Testing/hub.ts`, `Sync/blobs.test.ts` (new)

**NOW**

The dispatcher answers JSON only: `start()`'s handler ends every reply with `res.writeHead(reply.status, { 'content-type': 'application/json' })` and `res.end(JSON.stringify(reply.body))`, and `route()` refuses any method but POST. `Core/Sync/Contract/wire.ts` opens with the comment lines

```ts
// The canonical string is the uppercased method, the path, the lowercase hex SHA-256 of the UTF-8
// request body (of the empty string when there is none), and the integer millisecond timestamp,
// joined by \n. The signature is Ed25519 over the UTF-8 canonical string, base64url. The server
// refuses a timestamp more than five minutes from its clock.
```

`identify` (Task 3.2) reads `nexusId` from the JSON body.

**CHANGE**

- [ ] `Core/Sync/Contract/canonical.ts` exports `export const blobPath = (nexusId: string, sha256: string): string => \`/blob/${nexusId}/${sha256}\``; the second comment line of `wire.ts` becomes `// request body, or of the raw bytes on a byte route (of the empty string when there is none), and the integer millisecond timestamp,` re-wrapped so each line stays full (the file stays type-only).
- [ ] `Sync/wire.ts`: `export const BLOB_ROUTE = /^\/blob\/([0-7][0-9A-HJKMNP-TV-Z]{25})\/([0-9a-f]{64})$/`, `export const BLOB_CAP = 50 * 1024 * 1024`, `export const BLOB_TIMEOUT_MS = 300_000` (the byte routes have no `META` entry, so their cap and timeout are two constants beside the route pattern).
- [ ] `hub.ts`: `spoolBody(req: IncomingMessage, cap: number, dir: string): Promise<{ path: string; size: number; sha256Hex: string } | null>` streaming to `join(dir, 'spool', randomUUID())` through `createWriteStream` (the directory made with `mkdirSync(…, { recursive: true })` at start), updating one `createHash('sha256')` per chunk, and on overflow destroying the request, unlinking the file, and resolving null; the PUT branch below unlinks the file in `finally`.
- [ ] `Sync/Store/log.ts`: `export function logStore(db: DatabaseSync)` returning `putBlob(nexusId, sha256, keyId, bytes: Buffer, atMs): void` (`INSERT OR IGNORE`), `readBlob(nexusId, sha256): Buffer | null`, `hasBlob(nexusId, sha256): boolean`; `Store` gains `log`.
- [ ] `Sync/authority.ts`: `identify`'s third parameter becomes `route: keyof Wire.RouteTable | null` (null on the blob path, which has no `META` entry); it takes `nexusId` as a fifth argument, `nexusId?: string`, used in place of the body's when given; the role it requires comes from a sixth, `requires?: Wire.Role | 'none'`, read as `requires ?? META[route].requires`, so a null `route` always arrives with `requires`, and the blob dispatcher passes `'editor'` for PUT and `'reader'` for GET.
- [ ] `hub.ts`: `route()` first tries `BLOB_ROUTE.exec(path)`; on a match with method PUT or GET, `identify(store, req, null, null, nexusId, method === 'PUT' ? 'editor' : 'reader')`, then for PUT `spoolBody(req, BLOB_CAP, opts.dataDir)` (null → 413 `too-large`), `verify(id, path, spool.sha256Hex)`, `spool.sha256Hex !== sha256` → 400 `hash-mismatch`, then `blobRoutes(store).put(id, params, spool)` with the spool file unlinked in `finally`; for GET, `verify(id, path, sha256Hex(Buffer.alloc(0)))` then `blobRoutes(store).get(id, params, res)`. Byte routes are typed `(id: Identity, params: { nexusId: string; sha256: string }, …) => Promise<Reply | 'streamed'>`; a `'streamed'` return means the handler wrote the response itself. `req.setTimeout(BLOB_TIMEOUT_MS)` on a blob match. The key id rides in an `x-pommora-key` header, read with `header(req, 'x-pommora-key')` and stored beside the blob; the AAD binds it inside the ciphertext.
- [ ] `Sync/Routes/blobs.ts`: `export function blobRoutes(store: Store)` returning `put` (reads the spool file, `store.log.putBlob(…)`, answers `{ status: 200, body: { sha256, size } }`) and `get` (404 `not-found` or `res.writeHead(200, { 'content-type': 'application/octet-stream', 'content-length': bytes.length })`, `res.end(bytes)`, returns `'streamed'`).
- [ ] `Sync/blobs.test.ts`: `it('round-trips a one-mebibyte blob under its own hash', …)`, `it('refuses bytes whose hash is not the path', …)` (400), `it('refuses a body over the cap and leaves no spool file', …)` (413, `readdirSync(join(dataDir, 'spool'))` empty), `it('lets a reader read and refuses it a put', …)` (200 then 404). `Sync/Testing/hub.ts`'s `signer` gains `put(nexusId, keyId, bytes): Promise<Outcome>` and `get(nexusId, sha256): Promise<{ status: number; bytes: Buffer }>` signing `blobPath`.

**AFTER**

Two streamed routes; the signed body hash is the blob's name; retry is idempotent by construction.

**VERIFY**

- [ ] `npm run test -- Sync/` passes with the blob suite; `ls <dataDir>/spool` is empty after the suite.
- [ ] Check the work for unnecessary code or obvious mistakes.

#### Task 4.3

**TASK:** `store`: a JSON batch of changes against the log with a per-item version precondition, rename as one entry, captures as non-head versions, and a request id for idempotent retry.

**FILES:** `Core/Sync/Contract/wire.ts`, `Core/Sync/Contract/canonical.ts`, `Sync/wire.ts`, `Sync/Store/log.ts`, `Sync/Routes/items.ts` (new), `Sync/hub.ts`, `Sync/items.test.ts` (new)

**NOW**

`item`, `change`, `capture`, and `request` tables exist with no writer.

**CHANGE**

- [ ] `Core/Sync/Contract/wire.ts`:

```ts
export interface ItemRecord { path: string; mtimeMs: number; size: number; keyId: string; sha256: string }
export type StoreChange =
  | { kind: 'write'; base: number | null; record: ItemRecord }
  | { kind: 'delete'; base: number; path: string }
  | { kind: 'rename'; base: number; from: string; path: string }
  | { kind: 'capture'; record: ItemRecord }
export interface StoreBody { nexusId: string; requestId: string; changes: StoreChange[] }
export interface Change { seq: number; kind: 'write' | 'delete' | 'rename'; path: string; from?: string; record?: ItemRecord; device: string; atMs: number }
export type StoreOutcome =
  | { path: string; ok: true; version: number }
  | { path: string; ok: false; why: 'stale'; head: Change | null }
  | { path: string; ok: false; why: 'missing-blob' }
export interface StoreReply { outcomes: StoreOutcome[]; seq: number }
```

  `RouteTable` gains `store: { method: 'POST'; path: '/store'; body: StoreBody; reply: StoreReply }`; `canonical.ts`'s `ROUTES`, `Sync/wire.ts`'s `PATHS`, and `META` (`store: { requires: 'editor', cap: 262144, timeoutMs: JSON_TIMEOUT_MS }`) gain it.
- [ ] `Sync/Store/log.ts` gains `applyStore(nexusId, device, body: Wire.StoreBody, atMs): Wire.StoreReply` in one transaction: a known `requestId` returns the reply stored in `request.reply`; per change in order: `write` requires `item.version === base` (or no live row when `base` is null) and `hasBlob(record.sha256)`, then bumps `nexus.seq`, inserts `change` (`record` as JSON), upserts `item`; `delete` and `rename` likewise (`rename` moves the `item` row's path, writes `from_path`, and stores as the change's `record` the head record of `from` with `path` set to the new path, so a rename's `Change` carries the content at the moved path and a client can land it without a second lookup); `capture` inserts a `capture` row and no `change`; the reply is stored under the request id. A stale outcome's `head` is `readHead(nexusId, path)`: the `change` row with the greatest `seq` whose `path = ?` or `from_path = ?` decoded as `Wire.Change`, or null; a path whose latest change is a rename away therefore answers that rename, and the client follows it. The item's version after a write is the change's `seq`.
- [ ] `Sync/Routes/items.ts`: `export function itemRoutes(store: Store)` returning `store`, which validates every path lexically (no leading `/`, no `..` segment, no empty segment, equal to its own `normalize('NFC')`) and refuses the whole body 400 `malformed` on a bad one, calls `store.log.applyStore(id.nexusId, id.device, body, Date.now())`, and `wake(id.nexusId, reply.seq)` when any outcome is `ok`; `hub.ts` spreads it into the route map.
- [ ] `Sync/items.test.ts` (after each blob is put through `signer.put`): `it('writes a fresh path at version one and the next write at two', …)`, `it('refuses a stale base with the head', …)` (`why: 'stale'`, `head.seq === 2`), `it('moves the head on a rename and carries the record at the new path', …)`, `it('answers a write against the old path with the rename as its head', …)`, `it('refuses a delete on a stale base', …)`, `it('stores a capture without advancing the sequence', …)`, `it('answers a replayed request id from the stored reply', …)` (identical reply, `SELECT COUNT(*) FROM change` unchanged), `it('refuses a write whose blob is absent', …)` (`why: 'missing-blob'`).

**AFTER**

Every accepted change has a sequence number; every path has one head; a refused push says what the head is.

**VERIFY**

- [ ] `npm run test -- Sync/` passes with the items suite.
- [ ] Check the work for unnecessary code or obvious mistakes.

#### Task 4.4

**TASK:** `pull`: changes since a cursor, long-polling when there are none, a typed resync when the cursor is unknown, and the retention sweep from the info record.

**FILES:** `Core/Sync/Contract/wire.ts`, `Core/Sync/Contract/canonical.ts`, `Sync/wire.ts`, `Sync/Store/log.ts`, `Sync/Routes/items.ts`, `Sync/feed.ts` (new), `Sync/hub.ts`, `Sync/items.test.ts`

**NOW**

No waiter registry exists; `start().close` closes connections and the store. Route handlers are typed `(id: Identity, body: unknown) => Reply`.

**CHANGE**

- [ ] `Core/Sync/Contract/wire.ts`: `export interface PullBody { nexusId: string; cursor: number; waitMs?: number }`, `export interface PullReply { changes: Change[]; cursor: number; hasMore: boolean }`; `RouteTable` gains `pull: { method: 'POST'; path: '/pull'; body: PullBody; reply: PullReply }`; `ROUTES`, `PATHS`, and `META` (`pull: { requires: 'reader', cap: 8192, timeoutMs: 35_000 }`, the one route whose timeout outlasts the 25 s wait below) gain it. A cursor above `nexus.seq` answers 409 with `{ error: 'resync', seq }`.
- [ ] `Sync/feed.ts` (new): `wait(nexusId: string, cursor: number, timeoutMs: number): Promise<void>` resolves when `wake(nexusId: string, seq: number): void` arrives with `seq > cursor` or on timeout (`Math.min(timeoutMs, 25_000)`, the timer `unref`'d); `closeAll(): void` resolves every waiter, and `start().close` in `hub.ts` calls it before closing connections.
- [ ] `Sync/Store/log.ts` gains `readChanges(nexusId, cursor, limit = 200): Wire.PullReply` (`SELECT … FROM change WHERE nexus_id = ? AND seq > ? ORDER BY seq LIMIT ?` with `limit + 1` rows read to set `hasMore`) and `sweep(nexusId, historyDays, nowMs): void`: delete `blob` rows referenced by no live `item` head (through `change.record`'s `sha256`), by no `capture` row, and whose `at_ms` is older than `nowMs - historyDays * 86_400_000`; delete `capture` rows older than that cutoff; `change` rows are never deleted.
- [ ] `Sync/Routes/items.ts` gains `pull`, typed `(id: Identity, body: unknown) => Promise<Reply>`: `readChanges`; when `changes` is empty and `waitMs > 0`, `await wait(id.nexusId, cursor, waitMs)` then `readChanges` once more. The route map's value type widens to `Reply | Promise<Reply>` and `route()` awaits it. `hub.ts` runs `sweep` for every `nexus` row at start and every hour through `setInterval(…, 3_600_000).unref()`.
- [ ] `Sync/items.test.ts` gains `it('pulls two stored changes in order', …)`, `it('wakes a waiting pull within a hundred milliseconds of a store', …)` (`performance.now()` around the pull, the delta printed and asserted under 100), `it('pages a third store of 250 changes across two pulls', …)`, `it('answers resync to a cursor past the head', …)`, `it('sweeps an old orphaned blob and keeps the head, a fresh orphan, and a captured blob', …)` (rows aged by `UPDATE blob SET at_ms = ?` through a `DatabaseSync` on the store).

**AFTER**

A client holds one connection open per Nexus and learns of a change within a network round-trip; nothing deleted resurrects; a prior version stays recoverable for the History Timeframe.

**VERIFY**

- [ ] `npm run test -- Sync/` passes; the long-poll case's printed timing is under 100 ms.
- [ ] `Sync/roster.test.ts`'s restart-mid-suite case still passes.
- [ ] Check the work for unnecessary code or obvious mistakes.

#### Review Checkpoint

- [ ] Gates green; `Sync/hubGraph.test.ts` green.
- [ ] `npm run sync` boots against a schema-1 `sync.db` (built by the Task 3.2 fixture) and logs the migration; killed afterward.

### Phase 5 — Keys

**GOAL:** Core can derive a wrapping key from a password, mint and unwrap a ring, wrap the ring to a device, and encrypt and decrypt an item; Desktop stores the password and the wrapped ring in the keychain; bind, approve, and revoke exercise all of it. Files still do not travel.

#### Task 5.1

**TASK:** The crypto seam over `globalThis.crypto.subtle`: KDF, ring, agreement wrap, item blobs, with shared test vectors.

**FILES:** `Core/Sync/Keys/kdf.ts`, `Core/Sync/Keys/ring.ts`, `Core/Sync/Keys/item.ts`, `Core/Sync/Keys/keys.test.ts`, `Core/Sync/Contract/vectors.json`, `Sync/wire.test.ts`

**NOW**

No crypto exists in Core; `vectors.json` holds three canonical-string vectors. In the Electron binary (electron 42.4.0, node 24.16.0, BoringSSL): X25519 generate/deriveBits/export raw and pkcs8, AES-GCM with `additionalData`, PBKDF2 (600k iterations in 37 ms), HKDF, and Ed25519 all work; AES-KW does not; `subtle.supports` is absent.

**CHANGE**

- [ ] `kdf.ts`: `deriveWrappingKey(password: string, params: KdfParams): Promise<CryptoKey>`: `password.normalize('NFKC')` → PBKDF2-HMAC-SHA256 `deriveKey` → non-extractable AES-GCM-256; `freshKdfParams(): KdfParams` with 600,000 iterations and a 16-byte base64url salt.
- [ ] `ring.ts`:

```ts
export interface RingKey {
  keyId: string
  key: CryptoKey
  createdMs: number
}
export interface Ring {
  keys: RingKey[]
}
export interface RawKey {
  keyId: string
  raw: Uint8Array
  createdMs: number
}
export function newest(ring: Ring): RingKey
export function mintKey(): RawKey
export async function wrapForPassword(raws: RawKey[], kek: CryptoKey): Promise<RingEntry[]>
export async function unwrapWithPassword(entries: RingEntry[], kek: CryptoKey): Promise<Ring>
export async function wrapForDevice(
  raws: RawKey[],
  target: { deviceId: string; x25519: string },
): Promise<RingEntry[]>
export async function unwrapForDevice(
  entries: RingEntry[],
  deviceId: string,
  agree: (peerPublicKey: string) => Promise<Uint8Array>,
): Promise<Ring>
export async function exportRaw(ring: Ring): Promise<RawKey[]>
```

  `mintKey` is `{ keyId: ulid(), raw: crypto.getRandomValues(new Uint8Array(32)), createdMs: Date.now() }`; `newest` is the key with the greatest `createdMs`. A password wrap is `iv(12) || AES-GCM(kek, raw, aad = utf8('pommora-ring/1\n' + keyId + '\npassword'))` base64url, with `holder: 'password'`; a device wrap is `ephemeralPub(32) || iv(12) || AES-GCM(HKDF-SHA256(shared, salt = empty, info = utf8('pommora-ring-wrap/1')), raw, aad = utf8('pommora-ring/1\n' + keyId + '\n' + deviceId))` base64url, with `holder: deviceId`. The ephemeral pair is minted inside `wrapForDevice` with `generateKey('X25519', false, ['deriveBits'])` and its `deriveBits` against the target's public key; it is never stored. The unwrap side's `agree` is the host's member. `unwrapWithPassword` rejects with `new Error('wrong-password')` when a decrypt fails. Ring keys are imported as extractable AES-GCM keys so `exportRaw` can re-wrap them on approve and revoke; nothing else exports them.
- [ ] `item.ts`: `export async function encryptItem(k: RingKey, path: string, plaintext: Uint8Array): Promise<Uint8Array>` → `[0x01] || iv(12) || AES-GCM(k.key, plaintext, aad = utf8('pommora-item/1\n' + k.keyId + '\n' + path.normalize('NFC')))`; `export async function decryptItem(ring: Ring, keyId: string, path: string, blob: Uint8Array): Promise<Uint8Array>`, rejecting on an unknown key id, a version byte other than `0x01`, or a failed decrypt.
- [ ] `vectors.json` gains `"item": { "keyId", "keyHex", "path", "ivHex", "plaintext", "blobHex" }` computed once by the executor with `node:crypto` (`createCipheriv('aes-256-gcm', key, iv)` with `setAAD` over the AAD above, the 16-byte tag appended after the ciphertext, which is where Web Crypto puts it). `encryptItem` takes the IV as an optional fourth parameter, `iv = crypto.getRandomValues(new Uint8Array(12))`, so `keys.test.ts` asserts `it('reproduces the shared item vector', …)` by passing the vector's IV and comparing the hex; `Sync/wire.test.ts` gains `it('reads the shared item vector', …)` decrypting `blobHex` with `createDecipheriv('aes-256-gcm')` so the hub's tests and Core agree on the format without sharing code.
- [ ] `keys.test.ts` also holds `it('round-trips a ring through the password', …)`, `it('round-trips a ring through a device wrap', …)` (two X25519 pairs minted in the test with `crypto.subtle.generateKey`, `agree` built from one private half), `it('unwraps a two-entry ring and names the later key newest', …)`, `it('rejects a blob whose path was moved', …)` (decrypt under another path), `it('rejects a wrong password as wrong-password', …)`.

**AFTER**

`Core/Sync/Keys/` is three files with no import beyond Core's own types and `ulidx`.

**VERIFY**

- [ ] `npm run test -- Core/Sync/Keys/` passes; `Core/Contract/engineGraph.test.ts` still reports `['ulidx', 'yaml', 'zod']`.
- [ ] `grep -hn "^import" Core/Sync/Keys/*.ts | grep -v "from '\.\.\?/" | grep -vc "ulidx"` → 0.
- [ ] Check the work for unnecessary code or obvious mistakes.

#### Task 5.2

**TASK:** Bind with a Nexus password (creating the info record on the first device, joining on the rest), approve by wrapping the ring to the new device, revoke by rotating the ring forward; the password and the ring live in the keychain through a new host member.

**FILES:** `Core/Contract/bridge.ts`, `Core/Contract/handlers.ts`, `Core/Sync/Contract/wire.ts`, `Core/Sync/handlers.ts`, `Core/Sync/handlers.test.ts`, `Core/Sync/Client/call.ts`, `Core/Sync/Client/call.test.ts`, `Core/Sync/Client/keyring.ts` (new), `Core/Sync/Client/keyring.test.ts` (new), `Core/Settings/NexusRows.test.tsx`, `Desktop/Config/secrets.ts`, `Desktop/main.ts`

**NOW**

```ts
  'sync:connect': { args: [address: string]; reply: Result<SyncState> }
```

`Core/Sync/handlers.ts`, the parts every handler shares:

```ts
interface Ready {
  nexusId: string
  device: SyncDevice
  host: SyncHost
  address: string | null
}

// THE one session refusal, in one place: every handler reaches the server through here.
// `device` is a projection, never the host member, whose functions cannot cross IPC.
async function ready(root: string, ctx: HostContext): Promise<Result<Ready>> {
  const tree = getLiveTree() ?? (await refreshTree(root))
  const device = ctx.device
  if (device === null) return NO_DEVICE
  return ok({
    nexusId: tree.nexus.id,
    device: { id: device.id, publicKey: device.publicKey, name: device.name },
    host: { device, transport: ctx.transport },
    address: readValue<{ address: string }>('sync')?.address ?? null,
  })
}

function bindingFrom(
  address: string,
  outcome: CallOutcome<'devices' | 'approve' | 'revoke'>,
): SyncBinding {
  if (Array.isArray(outcome.reply?.devices))
    return { address, state: 'approved', devices: outcome.reply.devices }
  if (outcome.status === 404) return { address, state: 'pending' }
  const why = outcome.error ?? `The server answered ${outcome.status}.`
  return { address, state: 'unreachable', why }
}

async function state(root: string, ctx: HostContext): Promise<Result<SyncState>> {
  const r = await ready(root, ctx)
  if (!r.ok) return r
  const { nexusId, device, host, address } = r.value
  if (address === null) return ok({ device, binding: null })
  return ok({
    device,
    binding: bindingFrom(address, await call(host, address, 'devices', { nexusId })),
  })
}

// An answered approve or revoke carries the fresh list, so it needs no second round trip; a refusal carries nothing true about the list, so the list is fetched rather than guessed at.
const act = (route: 'approve' | 'revoke') =>
  withRoot(async (root: string, ctx: HostContext, raw: unknown): Promise<Result<SyncState>> => {
    const r = await ready(root, ctx)
    if (!r.ok) return r
    const deviceId = typeof raw === 'string' ? raw.trim() : ''
    if (deviceId.length === 0) return fail('operation-failed', 'A device id is required.')
    const { nexusId, device, host, address } = r.value
    if (address === null) return fail('operation-failed', 'This nexus is bound to no server.')
    const outcome = await call(host, address, route, { nexusId, deviceId })
    if (outcome.status !== 200 && outcome.status !== 0) return state(root, ctx)
    return ok({ device, binding: bindingFrom(address, outcome) })
  })
```

and the connect handler:

```ts
  'sync:connect': withRoot(async (root, ctx, raw: unknown) => {
    const r = await ready(root, ctx)
    if (!r.ok) return r
    const address = typeof raw === 'string' ? raw.trim() : ''
    if (address.length === 0) return fail('operation-failed', 'A server address is required.')
    const { nexusId, device, host } = r.value
    const outcome = await call(host, address, 'connect', {
      nexusId,
      publicKey: device.publicKey,
      name: device.name,
    })
    if (outcome.status !== 200)
      return fail(
        'operation-failed',
        `The server refused or did not answer: ${outcome.error ?? outcome.status}.`,
      )
    return writeValue('sync', { address }) ? state(root, ctx) : NO_STORE
  }),
```

`sync:approve` is `act('approve')` and `sync:revoke` is `act('revoke')`. `Core/Settings/NexusRows.tsx` calls `ask('sync:connect', address)`. `Desktop/Config/secrets.ts`: `getSecret(userDataDir, name): Promise<string | null>` and `setSecret(userDataDir, name, plain: string): Promise<void>`, the latter merging `{ [name]: value }` through `rmwJsonStrict`; nothing deletes a secret. `Core/Contract/result.ts`'s `ErrorCode` is a closed union (`not-found | exists | invalid-name | invalid-path | invalid-property | reserved | lossy-change-requires-confirmation | operation-failed | no-nexus | busy`) and is Frozen, so a refusal's kind rides in its message.

**CHANGE**

- [ ] `bridge.ts`: `'sync:connect': { args: [address: string, password?: string, pin?: string]; reply: Result<SyncState> }` (optional, so `NexusRows.tsx` compiles unchanged until Phase 9). `Core/Sync/Contract/wire.ts`: `export interface SyncStatus { state: 'off' | 'idle' | 'syncing' | 'error'; reason?: 'password' | 'pending' | 'revoked' | 'no-db'; why?: string; lastAt?: number }` (`reason` is what a surface switches on; `why` is the sentence it shows, and every writer of a `why` that one of the four names sets the matching `reason` beside it); `SyncState` gains `status: SyncStatus`; `export interface SyncScope { address: string; pin?: string; cursor: number }` names the `sync` scope's value. This task answers `status: { state: 'off' }` from every handler. `Core/Settings/NexusRows.test.tsx`'s `SyncState` literals (`unbound`, `approved(…)`, `pending`) gain `status: { state: 'off' }`.
- [ ] `HostContext` gains `secrets: { get(name: string): Promise<string | null>; set(name: string, value: string | null): Promise<void> }` after `device`. `Desktop/Config/secrets.ts`: `setSecret`'s third parameter becomes `plain: string | null`; a null removes the key (`const { [name]: _dropped, ...rest } = cur; return rest`) and skips the `secretsAvailable()` check. `Desktop/main.ts`'s `hostContext()` gains `secrets: { get: (name) => getSecret(userData(), name), set: (name, value) => setSecret(userData(), name, value) }`. Core's names: `sync:${nexusId}:password` and `sync:${nexusId}:ring` (the device's own wrapped entries as JSON, so a session that opens with the hub unreachable still holds its keys).
- [ ] `Client/call.ts`: `SyncHost` becomes `{ device: HostDevice; transport: HostContext['transport']; secrets: HostContext['secrets']; push: HostContext['push'] }`, the four `HostContext` members sync reads with `device` present, and gains `export function syncHost(ctx: HostContext): SyncHost | null` (null when `ctx.device` is null), the one place the projection is built. `call.test.ts`'s `recorder()` host gains `secrets` over a `Map` and `push: () => {}`.
- [ ] `Client/keyring.ts`: `export async function loadRing(host: SyncHost, nexusId: string, info: Pick<InfoRecord, 'ring' | 'kdf'> | null): Promise<Ring | null>`: from the per-session `Map<string, Ring>` when held; else the entries whose `holder === host.device.id` (from `info.ring`, or from the cached JSON when `info` is null) through `unwrapForDevice(own, host.device.id, host.device.agree)`, caching the JSON through `host.secrets` on success; else, when `info` is given and a stored password exists, the entries with `holder === 'password'` through `unwrapWithPassword(…, await deriveWrappingKey(password, info.kdf))`; else null. A null `info` therefore answers from the cache alone; Task 7.4's `startSession` fetches `info` when the cache is empty. `export async function forgetKeys(host: SyncHost, nexusId: string)` sets both secrets to null and deletes the map entry. `export function heldRing(nexusId): Ring | null`.
- [ ] `ready()`: `host` comes from `syncHost(ctx)` (null → `NO_DEVICE`), and `address` becomes `binding: readValue<SyncScope>('sync')`; the four `call(host, address, …)` sites pass `binding.address` (Task 7.2 passes the whole binding). `bindingFrom(address, …)` is unchanged. `state()` answers `status: { state: 'off' }`.
- [ ] `sync:connect`, in order: `ready`; the address, `password` (`typeof raw2 === 'string' && raw2.length ? raw2 : null`), and `pin` read from the three arguments; `connect` with `x25519: host.device.x25519`; a non-200 refuses as today; `info` with `{ nexusId }`: on 200, `ring = await loadRing(host, nexusId, reply.info)` after storing the password when given (a null ring with a password → `host.secrets.set(password name, null)` and `fail('operation-failed', 'The Nexus password is wrong.')`, no binding written; a null ring without one → `fail('operation-failed', 'A Nexus password is required.')`, no binding written); on 404 with the `connect` reply `approved: true`, this device creates: no password → `fail('operation-failed', 'A Nexus password is required.')`; else `kdf = freshKdfParams()`, `kek = await deriveWrappingKey(password, kdf)`, `raw = mintKey()`, `entries = [...(await wrapForPassword([raw], kek)), ...(await wrapForDevice([raw], { deviceId: host.device.id, x25519: host.device.x25519 }))]` (the creator's own device wrap, so its ring reloads from the cache after a restart), `info` again with `create: { protocol: 1, kdf, historyDays: (await readFileHistoryConfig(root)).keepMs / 86_400_000, ring: entries }`, a non-200 refuses, a 200 runs `ring = await loadRing(host, nexusId, { ring: entries, kdf })` to fill the cache; on 404 with `approved: false`, the device is pending and the ring arrives after approval. Then `writeValue('sync', { address, pin, cursor: 0 })` (false → `NO_STORE`), `host.secrets.set(password name, password)` when one was given, and `state(root, ctx)`.
- [ ] `sync:approve`: `act('approve')` gains, after a 200: `info`, then `ring` with `base: info.version` and `add: await wrapForDevice(await exportRaw(ring), { deviceId, x25519 })` for the target's `x25519` from the reply's device list; a target without `x25519` is approved without a wrap and the returned `status.why` is `'That device holds no agreement key; it needs the Nexus password.'`.
- [ ] `sync:revoke`: `act('revoke')` first reads this device's stored password; none → `fail('operation-failed', 'The Nexus password is needed to rotate the ring.')` before the `revoke` call, so the ring is never rotated to a key the password cannot open. Then, after a 200: `info`; `raw = mintKey()`; `add` = `wrapForPassword([raw], kek)` (the KEK re-derived from the password and `info.kdf`) plus `wrapForDevice([raw], { deviceId, x25519 })` for every approved device in the reply list with an `x25519`; `ring` with `base: info.version`; the cached ring gains the key.
- [ ] `sync:state`: when the `devices` call answers 404 while `(await host.secrets.get(ring name)) !== null` (the cached ring is written only after a device unwrap, so its presence means this device was approved; a pending device never holds one), `forgetKeys(host, nexusId)` and answer `status: { state: 'off', reason: 'revoked', why: 'This device was revoked.' }` (Task 7.4 adds the session stop to this branch). The read path writes nothing else.
- [ ] `handlers.test.ts`: the fake `HostContext` gains `agree` and an in-memory `secrets`; `it('creates the info record with one password entry on the first connect', …)`, `it('wraps the ring to an approved device that then unwraps it', …)`, `it('refuses a wrong password and writes no binding', …)`, `it('rotates the ring on revoke for the remaining device alone', …)`, `it('refuses a revoke when this device holds no password', …)`, `it('forgets its keys and reports the revoked reason when the hub reports it revoked', …)`. `keyring.test.ts`: `it('prefers the device entry, falls back to the password, and answers null with neither', …)`, `it('forgets both secrets and the held ring', …)`.

**AFTER**

```ts
interface Ready {
  nexusId: string
  device: SyncDevice
  host: SyncHost
  binding: SyncScope | null
}
```

A Nexus on the hub carries a ring every approved device can open without the password, and a revoked device can open nothing stored after its revocation.

**VERIFY**

- [ ] `npm run test -- Core/Sync/` passes with the new cases; `npm run typecheck` exits 0.
- [ ] `grep -c "password is wrong\|password is required" Core/Sync/handlers.ts` → 3.
- [ ] `grep -c "string | null" Desktop/Config/secrets.ts` → 2 (the `getSecret` return and the `setSecret` parameter).
- [ ] Check the work for unnecessary code or obvious mistakes.

#### Review Checkpoint

- [ ] Gates green; engine and host graph tests unchanged.
- [ ] Smoke launch: with the hub running, `window.nexus.ask('sync:connect', 'http://127.0.0.1:7473', 'pw')` from the console creates the info record (read `sync.db`'s `nexus` table with `node -e`); the heading still lists devices.

### Phase 6 — Arrival

**GOAL:** Given a decrypted change, the device lands it: the JSON merge for the configuration set, a capture for what loses, and a write with the writer's mtime under the file's lock, a tombstone, or a rename as one move. Pure functions over `machine()` and the stores, proven by tests over the test tree.

#### Task 6.1

**TASK:** The key-level three-way merge for the JSON set, with a per-file depth table.

**FILES:** `Core/Sync/Arrival/jsonMerge.ts`, `Core/Sync/Arrival/jsonMerge.test.ts`

**NOW**

Every JSON file the log names is a plain object at its top level. Read from NexusOS on 09-13-2026: `.nexus/settings.json` holds `asset_directory`, `excluded_folders` (array), `navViewModes`, `personalization` (object), `profile_image`, `profile_subtitle`, `subfield`; `.nexus/state.json` holds `navigation` (object: `banner`, `pinned`) and `order` (object: `collections`, `spaces`); `.nexus/properties.json` holds `defs` (object keyed by property id) and `order` (array); `.nexus/assets/crops.json` holds `byImage` (object keyed by asset path); `contexts/contexts.json` holds `contexts` (array); `homepage/homepage.json` holds `banner`; `homepage/_tiles.json` holds `layout`, `locked`, `tiles` (array). `export function stableStringify(value: unknown): string` lives in `Core/Files/stableJson.ts`; `export function isPlainObject(v: unknown): v is Record<string, unknown>` in `Core/Properties/propertyValue.ts`; `NEXUS_DIR` and `NEXUS_CONFIG_FILES` (`settings: 'settings.json'`, `state: 'state.json'`, `properties: 'properties.json'`, `crops: 'assets/crops.json'`) in `Core/Paths/nexusPaths.ts` and `Core/Paths/paths.ts`.

**CHANGE**

- [ ] `jsonMerge.ts`:

```ts
export type Json = Record<string, unknown>
export type Depth = Record<string, number>

// Every JSON under `.nexus/` and every `_*.json` sidecar anywhere.
export function isMergedJson(rel: string): boolean

export function mergeDepthFor(rel: string): Depth

export function mergeKeys(
  base: Json,
  local: Json,
  remote: Json,
  depth: Depth,
  pick: () => 'local' | 'remote',
): Json
```

  `isMergedJson` is `rel.endsWith('.json') && (rel.startsWith(\`${NEXUS_DIR}/\`) || basename(rel).startsWith('_'))`. `mergeDepthFor` is one `switch` on `rel`: `.nexus/settings.json` → `{ personalization: 1 }`, `.nexus/state.json` → `{ order: 1, navigation: 1 }`, `.nexus/properties.json` → `{ defs: 1 }`, `.nexus/assets/crops.json` → `{ byImage: 1 }`, default `{}`, the four paths spelled through `NEXUS_DIR` and `NEXUS_CONFIG_FILES`. `mergeKeys`, for each key in the union of the three: unchanged on both sides (`same(base[k], local[k]) && same(base[k], remote[k])`) → base; changed on one side → that side (absence on the changed side deletes); changed on both → when `(depth[k] ?? 0) > 0` and all three are plain objects, recurse with a depth of `{}` at `depth[k] - 1` for every child; else `pick()`. `same` is `stableStringify(a) === stableStringify(b)`; arrays are one value.
- [ ] `jsonMerge.test.ts`: `it('keeps two different personalization changes from two sides', …)`, `it('deletes a key one side removed and the other left alone', …)`, `it('takes pick() for a key both sides changed', …)`, `it('takes an array inside a key whole', …)`, `it('yields remote when base is empty and local is unchanged', …)`, `it('names the merged set and the depth table', …)` (`isMergedJson` true for `.nexus/settings.json`, `Notes/_pagecollection.json`, `.nexus/homepage/_tiles.json`; false for `Notes/A.md` and `assets/x.json`; `mergeDepthFor` for the four files and `{}` for `.nexus/homepage/homepage.json`).

**AFTER**

One pure function and one table.

**VERIFY**

- [ ] `npm run test -- Core/Sync/Arrival/` passes.
- [ ] Check the work for unnecessary code or obvious mistakes.

#### Task 6.2

**TASK:** Captures on the device: the losing bytes written to `versions.db` for every file kind regardless of the File History toggle, and a page's capture also recorded as an `external` snapshot when File History is on.

**FILES:** `Core/Sync/Arrival/captures.ts` (new), `Core/Sync/Arrival/captures.test.ts` (new), `Core/Pages/fileHistory.ts`, `Core/Pages/fileHistory.test.ts`

**NOW**

`captureStore()` exists with no writer. `Core/Pages/fileHistory.ts`:

```ts
export const captureIfDue = (
  root: string,
  pageId: string,
  text: string,
  source: SnapshotSource,
  hash?: string,
): Promise<boolean> => capture(root, pageId, text, source, source === 'edit', hash)
```

where `capture(root, pageId, text, source, gated, hash = bodyHash(text))` refuses a non-page id (`kindOf(pageId) !== 'page'`), applies `SNAPSHOT_MAX_BYTES` to `'edit'` alone, reads `readFileHistoryConfig(root)` and refuses when `enabled` is false, applies the interval only when `gated`, and skips the write when `bodyHash(latest.text) === hash`; `hash` is therefore a body hash (`machine().sha256Hex(splitEnvelope(text).body)`), never a whole-file hash. The sweep:

```ts
export async function sweepFileHistory(root: string): Promise<void> {
  const db = snapshotStore()
  if (!db) return
  try {
    const { keepMs } = await readFileHistoryConfig(root)
    db.sweepSnapshots(Date.now() - keepMs)
  } catch (e) {
    console.error('file history: the sweep failed:', errText(e))
  }
}
```

`contentId(fm)` in `Core/Nexus/identityMark.ts` reads the `ID` key of a parsed frontmatter; `splitFrontmatter(content)` in `Core/Files/pageFile.ts` parses it.

**CHANGE**

- [ ] `captures.ts`: `export async function captureLoser(root: string, rel: string, bytes: Uint8Array, reason: CaptureReason): Promise<void>`: `captureStore()?.addCapture(rel, Date.now(), reason, bytes)`; when `isMarkdownFile(rel)`, decode the bytes as UTF-8, `const pageId = contentId(splitFrontmatter(text))`, and when defined `await captureIfDue(root, pageId, text, 'external')` (no hash argument; `capture` derives the body hash).
- [ ] `fileHistory.ts` `sweepFileHistory`: after `db.sweepSnapshots(…)`, `captureStore()?.sweepCaptures(cutoff)` over the same cutoff, with `const cutoff = Date.now() - keepMs` hoisted; the early return on a null `snapshotStore()` becomes a guard around the snapshot line alone so captures sweep when snapshots cannot.
- [ ] `captures.test.ts` over `memoryStores()` and the test tree: `it('captures a sidecar with File History off', …)`, `it('captures a page into both stores with File History on', …)`, `it('captures a page into captures alone with File History off', …)`. `Core/Pages/fileHistory.test.ts` (existing) gains `it('sweeps old captures beside old snapshots', …)`.

**AFTER**

Nothing that loses a conflict is dropped on the device.

**VERIFY**

- [ ] `npm run test -- Core/Sync/Arrival/` and `npm run test -- Core/Pages/` pass.
- [ ] `grep -c "sweepCaptures" Core/Pages/fileHistory.ts` → 1.
- [ ] Check the work for unnecessary code or obvious mistakes.

#### Task 6.3

**TASK:** Landing items, tombstones, and renames through the raw writes, with the base record updated in the same lock, and the JSON set landed through the merge.

**FILES:** `Core/Sync/Arrival/land.ts` (new), `Core/Sync/Arrival/land.test.ts` (new), `Core/Nexus/watchPatch.ts`

**NOW**

`landBytes` exists (Task 2.3); `syncStore()` with `readBase`, `readAllBases`, `upsertBase`, `renameBase`, `deleteBase` exists (Task 1.4); `mergeKeys`, `mergeDepthFor`, `isMergedJson`, and `captureLoser` exist; nothing calls them. `SyncHost` (Task 5.2) carries `device`, `transport`, `secrets`, and `push`. `machine().lock(key, fn)` serializes on the absolute path, the same key `updatePageBody` takes. `Core/Nexus/watchPatch.ts` line 88 holds the unexported `function findSpace(tree: NexusTree, dirRel: string): SpaceNode | null` and reads a homepage host as `segs[1] === HOMEPAGE_HOST_DIRNAME`; `TileHostRef` is `{ kind: 'homepage' } | { kind: 'space'; id: string }`. `Wire.Change` (Task 4.3) carries `seq`, `kind`, `path`, `from?`, `record?: ItemRecord`, `device`, `atMs`, with `record` present on every write and rename.

**CHANGE**

- [ ] `land.ts` exports `newerSide(localMtimeMs: number, localDeviceId: string, remoteMtimeMs: number, remoteDeviceId: string): 'local' | 'remote'`: a difference over 2,000 ms names the newer side; within it, the side whose device id sorts first lexically. The window and the tie live here alone; Task 7.2's stale path calls it too.
- [ ] `land.ts` exports three landing functions, each taking `(host: SyncHost, root: string, change: Change, …)` and running under `machine().lock(join(root, change.path), …)` (a rename locks `change.from`):
  - `landWrite(host, root, change, plaintext: Uint8Array)`, in order: (1) `abs = join(root, change.path)`, `record = change.record`; (2) `await machine().mkdir(dirname(abs))`; (3) when `isMergedJson(change.path)`: `local = await machine().readBytes(abs)`, `base = readBase(change.path)?.baseBytes ?? null`; when `local`, `base`, and the three parse as plain objects and `sha256Hex(local) !== sha256Hex(base)`: `merged = mergeKeys(parse(base), parse(local), parse(plaintext), mergeDepthFor(change.path), pick)` where `localMtimeMs = (await machine().stat(abs)).mtimeMs` is read before the merge and `pick` is `() => newerSide(localMtimeMs, host.device.id, record.mtimeMs, change.device)`; `bytes = utf8(\`${stableStringify(merged)}\n\`)`; otherwise `bytes = plaintext`; when not merged JSON, `bytes = plaintext`; (4) `await landBytes(abs, bytes, record.mtimeMs)`; (5) `upsertBase({ path: change.path, mtimeMs: record.mtimeMs, size: plaintext.length, hash: sha256Hex(plaintext), blobSha: record.sha256, version: change.seq, baseBytes: isMergedJson(change.path) ? plaintext : null })`, the remote's hash and bytes in every case, so a merge that differs from the remote reads dirty and the next tap cycle pushes it against `change.seq`; (6) when `change.path` names a tile body (`tileBodyUnder(change.path.split('/'), change.path)`), `host.push('tiles:changed', ref)` where `ref` is `{ kind: 'homepage' }` under `.nexus/homepage/` or `{ kind: 'space', id: space.id }` for `space = findSpace(tree, relDirname(change.path))` over `getLiveTree()`, skipped when no tree or Space is found. `watchPatch.ts` exports its existing `findSpace`.
  - `landDelete(host, root, change)`: `stat = await machine().stat(abs)`; when `stat`, `await machine().remove(abs)` and then, when `dirname(abs) !== root` and `listEntries(dirname(abs))` is empty, `await machine().remove(dirname(abs))`; `deleteBase(change.path)` in every case. A folder that empties out disappears with its last file, since a tombstone names a file and never a directory (Task 7.2 expands a removed folder into one tombstone per base row).
  - `landRename(host, root, change)`: `from = join(root, change.from)`, `to = join(root, change.path)`; when `from` exists, `await machine().mkdir(dirname(to))` and `await machine().rename(from, to)`; `renameBase(change.from, change.path)` in every case, and for a directory also every base row under `${change.from}/` through `readAllBases()`, one `renameBase` per row; `upsertBase` on the moved row with `version: change.seq`.
- [ ] `land.test.ts` over the test tree with `memoryStores()` and a fake `SyncHost` recording pushes: `it('names the newer side and breaks a tie on the smaller device id', …)`, `it('lands bytes with the writer mtime and a base row at the change seq', …)`, `it('removes the file and its base row on a tombstone', …)`, `it('removes an emptied parent directory after a tombstone and keeps the root', …)`, `it('moves the file and the base row on a rename', …)`, `it('moves every base row under a renamed folder', …)`, `it('merges a JSON landing over a local change and records the remote as base', …)` (both keys on disk, `hash(disk) !== readBase(path).hash`, `readBase(path).baseBytes` equal to the remote bytes), `it('pushes tiles:changed for a landed tile body', …)`, `it('records no echo', …)` (`isRecentWrite(abs)` false after every landing).

**AFTER**

One recency rule and three landing functions, each a lock, a machine call, and a base-record update; no walk, no tree patch.

**VERIFY**

- [ ] `npm run test -- Core/Sync/Arrival/` passes; the engine graph test is unchanged.
- [ ] `grep -c "recordWrite\|atomicWriteFile" Core/Sync/Arrival/land.ts` → 0.
- [ ] Check the work for unnecessary code or obvious mistakes.

#### Review Checkpoint

- [ ] Gates green; engine graph unchanged.
- [ ] Smoke launch: unchanged behavior (nothing calls Arrival yet).

### Phase 7 — Client

**GOAL:** The device syncs: it watches, debounces, encrypts, pushes, handles a refused push, pulls, decrypts, lands, keeps its cursor, reconciles on first bind, and reports its state. After this phase two instances on one Mac hold one Nexus in step.

#### Task 7.1

**TASK:** The base record over the store, the tap over both feeds with a 2,500 ms per-path debounce, the manifest filter, and the rename report from the app's own rename and move operations.

**FILES:** `Core/Sync/Client/base.ts` (new), `Core/Sync/Client/tap.ts` (new), `Core/Sync/Client/tap.test.ts` (new), `Core/Nexus/rename.ts`, `Core/Nexus/move.ts`, `Core/Nexus/mutate.test.ts`

**NOW**

`setWatchTap` and `setWriteTap` exist with no installer; `syncStore()` exists. `renameOp` in `Core/Nexus/rename.ts` ends its folder branch with `await moveIndexPaths(root, abs, r.value.path); return ok({})` and its page branch with `await moveIndexPaths(root, abs, r.value.path); return renamedReply(r.value.path)` after `renameCascade` and `rewriteTileConnections` settle (the `fromCreate` branch returns the same way after `createDisambiguated`); `abs` is the source and `r.value.path` the landed absolute path. `movePageOp` and `moveSetOp` in `Core/Nexus/move.ts` each end with `await moveIndexPaths(root, at.value.src, r.value.path); noteValueWrite(root, r.value.path); return ok({})`. `relative(root, abs)` in `Core/Paths/posix.ts` gives the nexus-relative POSIX path.

**CHANGE**

- [ ] `base.ts`: `export interface Snapshot { mtimeMs: number; size: number; hash: string; bytes: Uint8Array; version: number | null }`; `readBase(rel): BaseRecord | null` (`syncStore()?.readBase(rel) ?? null`), `readAllBases(): BaseRecord[]`, `readSnapshot(root, rel): Promise<Snapshot | null>` (under `machine().lock(abs)`: one `stat`, one `readBytes`, the hash of those bytes, and `readBase(rel)?.version ?? null`, so what a push sends and the base it claims are one read of one file; null when the file is absent), `recordBase(rel, snapshot: Pick<Snapshot, 'mtimeMs' | 'size' | 'hash' | 'bytes'>, version, blobSha): void` (`upsertBase` from the snapshot, with `baseBytes` the bytes when `isMergedJson(rel)`, else null; it never re-reads the file), `hashFile(abs): Promise<string | null>`, `isDirty(root, rel): Promise<boolean>` (true when no base row, when a base row exists and the file is absent, or when `hashFile(abs) !== base.hash`), `stampedId(root, rel): Promise<string | null>` (`contentId(splitFrontmatter(text))` for a Markdown file, else null).
- [ ] `tap.ts`: `export const DEBOUNCE_MS = 2500`; `installTap(root: string, nexusId: string, scope: WatchScope, sinks: { onDirty(rels: string[]): void; onRename(from: string, to: string): void }): void` installs `setWatchTap` (ignoring an event whose relative path starts with `.trash/`, since the write tap owns `.trash`) and `setWriteTap`; each event reduces to `relative(root, absPath)`, is filtered by `manifestAdmits(nexusId, scope)(rel)`, and is held in a per-path timer of `DEBOUNCE_MS`; timers that fire in one tick batch into one `onDirty`. `.nexus/settings.json` passes the predicate like any configuration file, so a change to the exclusion list reaches `onDirty` as that path; Task 7.4's handler reads it there and rescopes before it pushes. `reportRename(from: string, to: string): void` clears both paths' timers and calls `onRename` (a no-op with no sinks installed). `uninstallTap(): void` clears both taps, every timer, and the sinks. `dirtyPending(): Set<string>` exposes the paths with a live timer.
- [ ] `rename.ts`: before each of the two `return` lines that follow `moveIndexPaths` (the folder branch and the page branch; not the `fromCreate` branch, whose page has no base row yet and reaches the tap as a plain write), `reportRename(relative(root, abs), relative(root, r.value.path))`. `move.ts`: the same line before `noteValueWrite` in `movePageOp` and `moveSetOp`, with `at.value.src` as the source. A folder rename reports once with the folder paths; push expands it (Task 7.2).
- [ ] `tap.test.ts` with `vi.useFakeTimers()` and recording sinks: `it('batches two events on one path into one onDirty', …)`, `it('never reports a thumbnail', …)`, `it('reports a .trash write from the write tap', …)`, `it('clears pending timers on a rename report and reaches onRename', …)`, `it('cancels every timer on uninstall', …)`. `Core/Nexus/mutate.test.ts` gains `it('reports a page rename and a page move to the sync tap', …)` through a `vi.spyOn` on the tap module's `reportRename`.

**AFTER**

A dirty set arrives at the loop every 2.5 s of quiet per path, already filtered to what travels; a rename arrives as what the app did.

**VERIFY**

- [ ] `npm run test -- Core/Sync/Client/` and `npm run test -- Core/Nexus/` pass.
- [ ] `grep -c "2500" Core/Sync/Client/tap.ts` → 1; `grep -l "reportRename" Core/Nexus/rename.ts Core/Nexus/move.ts | wc -l` → 2.
- [ ] Check the work for unnecessary code or obvious mistakes.

#### Task 7.2

**TASK:** Push: hash, skip the unchanged, encrypt, put the blob, store the changes in batches, and on a stale outcome run the conflict path.

**FILES:** `Core/Sync/Client/session.ts` (new), `Core/Sync/Client/status.ts` (new), `Core/Sync/Client/push.ts` (new), `Core/Sync/Client/push.test.ts` (new), `Core/Sync/Client/call.ts`, `Core/Sync/Client/call.test.ts`, `Core/Sync/handlers.ts`

**NOW**

`Core/Sync/Client/call.ts`:

```ts
export interface SyncHost {
  device: HostDevice
  transport: HostContext['transport']
}

/** `error` is present only on a status of 0: a refusal before any reply was read, by the transport, the signer, or an unparseable body. */
export interface CallOutcome<K extends keyof RouteTable> {
  status: number
  reply: RouteTable[K]['reply'] | null
  error?: string
}

export async function call<K extends keyof RouteTable>(
  host: SyncHost,
  address: string,
  route: K,
  body: RouteTable[K]['body'],
): Promise<CallOutcome<K>> {
  const { method, path } = ROUTES[route]
  const json = JSON.stringify(body)
  const ts = Date.now()
  try {
    const canonical = canonicalString(method, path, machine().sha256Hex(json), ts)
    const headers: SignedHeaders & { 'content-type': string } = {
      'content-type': 'application/json',
      'x-pommora-device': host.device.id,
      'x-pommora-timestamp': String(ts),
      'x-pommora-signature': await host.device.sign(canonical),
    }
    const reply = await host.transport({
      url: address.replace(/\/$/, '') + path,
      method,
      headers,
      body: json,
    })
    return {
      status: reply.status,
      reply: reply.status === 200 ? (JSON.parse(reply.body) as RouteTable[K]['reply']) : null,
    }
  } catch (e) {
    return { status: 0, reply: null, error: String(e) }
  }
}
```

`Core/Sync/handlers.ts` calls it at four sites as `call(host, binding.address, route, body)` (Task 5.2); after Task 5.2, `SyncHost` also carries `secrets` and `push`, and `syncHost(ctx)` builds it. `call.test.ts` holds four cases over `recorder()`. Nothing puts bytes.

**CHANGE**

- [ ] `call.ts`: `async function signedHeaders(host: SyncHost, method: string, path: string, bodySha256Hex: string): Promise<SignedHeaders>` builds the three `x-pommora-*` headers over `canonicalString` and `host.device.sign` once; `call`, `putBlob`, and `getBlob` each add their own `content-type` (and `putBlob` its `x-pommora-key`) to what it returns. The second parameter of `call` becomes `target: SyncTarget` with `export interface SyncTarget { address: string; pin?: string }`, and a fifth, `opts?: { timeoutMs?: number }`; the transport request gains `pin: target.pin` and `timeoutMs: opts?.timeoutMs ?? JSON_TIMEOUT_MS` (`export const JSON_TIMEOUT_MS = 10_000`, `export const BLOB_TIMEOUT_MS = 300_000` beside it, the client's own figures since Core imports nothing from `Sync/`); the four `handlers.ts` sites pass `binding` (a `SyncScope`, structurally a `SyncTarget`); `call.test.ts`'s calls pass `{ address }`. The body is parsed on every status: `CallOutcome` gains `refusal?: { error: string } & Record<string, unknown>`, set when the status is not 200 and the body parses to an object whose `error` is a string (so `409 { error: 'resync', seq }` and `409 { error: 'stale', info }` reach their callers), while `reply` stays 200-only and `error` stays status-0-only; `call.test.ts` gains `it('carries a refusal body to the caller', …)` and `it('sends the timeout a caller names', …)`. Add `export async function putBlob(host: SyncHost, target: SyncTarget, nexusId: string, keyId: string, bytes: Uint8Array): Promise<{ status: number; error?: string }>` over `signedHeaders(host, 'PUT', blobPath(nexusId, sha), machine().sha256Hex(bytes))` with `x-pommora-key: keyId` and `content-type: application/octet-stream`, `body: bytes`, `timeoutMs: BLOB_TIMEOUT_MS`; and `export async function getBlob(host, target, nexusId, sha256): Promise<Uint8Array | null>` over `signedHeaders(host, 'GET', blobPath(nexusId, sha256), machine().sha256Hex(''))`, returning `reply.bytes` on 200, null otherwise. `call.test.ts` gains `it('sends bytes under the blob path with the pin and the byte timeout', …)` and `it('reads bytes back from the blob path', …)`.
- [ ] `session.ts` holds one declaration and nothing else: `export interface Session { host: SyncHost; ctx: HostContext; root: string; nexusId: string; target: SyncScope; ring: Ring; scope: WatchScope; failed: Set<string> }` (`host` is what reaches the hub and the disk, `ctx` is what reaches the renderer with a status, `failed` holds the paths of a batch the hub never answered). Task 7.4 adds the session's behavior beside it.
- [ ] `status.ts`: `let status: SyncStatus = { state: 'off' }`; `export const currentStatus = (): SyncStatus => status`; `export function setStatus(ctx: Pick<HostContext, 'push'>, next: SyncStatus): void` assigns and `ctx.push('sync:changed', next)`. Push, pull, and the session all write the status through it.
- [ ] `push.ts`, over `Session`:
  - `export const BATCH = 200`; `export const ITEM_CAP = 50 * 1024 * 1024`.
  - `storeChanges(session, changes)`: the batches of `BATCH`, each with `requestId: ulid()`, sent through `call(host, target, 'store', …)`; a status of 0 is retried once immediately with the identical body and `requestId` (the hub's `request` table answers a replay from the stored reply, so a reply lost in transit costs nothing); a status of 0 after the retry or of 500 or above adds the batch's paths to `session.failed` and sets status `error` with the outcome's `error` or `\`The hub answered ${status}.\`` as `why`; `putBlob` answering 0 or 500 or above does the same for its one path. Every `store` and `putBlob` below goes through this.
  - `pushRename(session, from, to)`: (1) `rows = readBase(from) ? [readBase(from)] : readAllBases().filter((r) => r.path.startsWith(\`${from}/\`))`; (2) no rows → `pushDirty(session, [to])` (a page renamed before its first push) and return; (3) one `rename` change per row with `base: row.version`, `from: row.path`, `path: to + row.path.slice(from.length)`; (4) `storeChanges`; (5) per outcome `ok` → `renameBase(row.path, newPath)` then `upsertBase({ ...row, path: newPath, version })`; `stale` → `resolveStale(session, newPath, head)` after `renameBase`.
  - `pushDirty(session, rels)`: (1) per path, `stat = await machine().stat(abs)`; a directory expands to the base rows under `${rel}/` and to `listPathsUnder(root, abs, (rel, _kind, siblings) => admits(rel, siblings))` entries with `admits = manifestAdmits(session.nexusId, session.scope)`, each re-entering this step; (2) absent with a base row → `{ kind: 'delete', base: row.version, path: rel }`; absent with no base row → one `delete` per base row whose `path` starts with `${rel}/`, each with `base: row.version` (a removed folder or bundle arrives from the tap as its own path, and its rows are what the hub must tombstone); no such rows → drop; (3) present: `snapshot = await readSnapshot(root, rel)` (one locked read; null → treat as absent); `snapshot.hash === readBase(rel)?.hash` → drop; `snapshot.size > ITEM_CAP` → drop and set status `why` to `\`${rel} is over 50 MB and stays home.\``; `isMarkdownFile(rel) && (await stampedId(root, rel)) === null` → drop (stays dirty); else `blob = await encryptItem(newest(ring), rel, snapshot.bytes)`, `sha = sha256Hex(blob)`, `putBlob` (a refused put returns), then `{ kind: 'write', base: snapshot.version, record: { path: rel, mtimeMs: snapshot.mtimeMs, size: snapshot.size, keyId, sha256: sha } }` with the snapshot kept beside the change; (4) order deletes first, then writes; (5) `storeChanges`; (6) per outcome: `ok` → `recordBase(rel, snapshot, version, record.sha256)` (a delete → `deleteBase(rel)`); `stale` → `resolveStale(session, rel, head)`; `missing-blob` → `putBlob` once more and re-`store` that one change.
  - `resolveStale(session, rel, head: Change | null)`, in order: (1) `head === null` (the hub never held the path, so the local row is stale) → `deleteBase(rel)` and `pushDirty(session, [rel])`, return; (2) `head.kind === 'rename' && head.path !== rel` (the hub's head for this path is its move elsewhere, which Task 4.3's `readHead` answers through `from_path`) → `landRename(host, root, head)`, then `resolveStale(session, head.path, head)` once with the same head, whose `path` now equals the argument so it takes the steps below as a write (Task 4.3 gives a rename change the record at its new path), and return; (3) `snapshot = await readSnapshot(root, rel)`; (4) `head.kind === 'delete'`: `snapshot === null` → `deleteBase(rel)`, return; `newerSide(snapshot.mtimeMs, host.device.id, head.atMs, head.device) === 'local'` → re-`store` the write with `base: head.seq`; else `captureLoser(root, rel, snapshot.bytes, 'tombstone-lost')` and `landDelete(host, root, head)`, return; (5) `remote = await decryptItem(ring, head.record.keyId, rel, await getBlob(…, head.record.sha256))`; (6) `snapshot !== null && sha256Hex(remote) === snapshot.hash` → `recordBase(rel, snapshot, head.seq, head.record.sha256)` (the same bytes already at the head, which is what a re-push after a dropped reply looks like), return; (7) `snapshot === null` (removed here, written there) → `landWrite(host, root, head, remote)`, return; (8) `isMergedJson(rel)` → `landWrite(host, root, head, remote)` (the merge lands and the file reads dirty against `head.seq`, so the next cycle pushes the merge), return; (9) `newerSide(snapshot.mtimeMs, host.device.id, head.record.mtimeMs, head.device)`: `'local'` → `captureLoser(root, rel, remote, 'remote-lost')` and re-`store` the write with `base: head.seq`; `'remote'` → `captureLoser(root, rel, snapshot.bytes, 'local-lost')`, `putBlob` the local ciphertext and `store` one `{ kind: 'capture', record }` for it, then `landWrite(host, root, head, remote)`.
- [ ] `push.test.ts` over a fake `transport` answering per route from an in-memory log: `it('never puts an unchanged file', …)`, `it('never stores a page without an ID', …)`, `it('tombstones every row under a removed folder', …)`, `it('re-stores a stale write whose local file is newer and captures the remote', …)`, `it('captures a stale write whose local file is older, ships the capture, and lands the remote', …)`, `it('records the base when the stale head already holds the same bytes', …)`, `it('lands a merged JSON over a stale head and leaves it dirty', …)`, `it('follows a rename head to the new path', …)`, `it('ships one rename per base row and moves the rows', …)`, `it('sends 450 dirty paths in three batches, deletes first', …)`, `it('replays a dropped store once under the same request id', …)`, `it('holds a batch the hub never answered in failed', …)`.

**AFTER**

One push per quiet path, each read once under the file's lock; every refusal ends in both sides holding both versions and the newer at the head; a batch the hub never answered waits in `failed` for the next quiet moment.

**VERIFY**

- [ ] `npm run test -- Core/Sync/Client/` passes with the push suite; `npm run test -- Core/Sync/` passes.
- [ ] `grep -c "BATCH = 200" Core/Sync/Client/push.ts` → 1; `grep -c "binding.address" Core/Sync/handlers.ts` → 0 (every call passes the binding).
- [ ] `grep -rln "2000\|2_000" Core/Sync --include='*.ts' | grep -v test` → exactly `Core/Sync/Arrival/land.ts` (the window is spelled once); `grep -c "x-pommora-signature" Core/Sync/Client/call.ts` → 1 (the headers are built once).
- [ ] Check the work for unnecessary code or obvious mistakes.

#### Task 7.3

**TASK:** Pull: the long-poll loop, cursor after apply, dirty-file precedence, first-bind reconcile, resync, and rescope on an exclusion change.

**FILES:** `Core/Sync/Client/pull.ts` (new), `Core/Sync/Client/reconcile.ts` (new), `Core/Sync/Client/pull.test.ts` (new), `Core/Sync/Client/reconcile.test.ts` (new)

**NOW**

The `sync` scope holds a `SyncScope` (`{ address, pin?, cursor }`, Task 5.2). `readWatchScope(root)` in `Core/Settings/settings.ts` reads the exclusion list and the asset directory from `.nexus/settings.json`, and `sameScope(a, b)` in `Core/Paths/exclusion.ts` compares two readings; the tap (Task 7.1) reports that file as a dirty path whenever any of its keys changes.

**CHANGE**

- [ ] `pull.ts`: `export async function pullOnce(session: Session, waitMs = 25_000): Promise<'applied' | 'idle' | 'resync' | 'revoked' | 'error'>`, in order: (1) `outcome = await call(host, target, 'pull', { nexusId, cursor: binding.cursor, waitMs }, { timeoutMs: waitMs + 5_000 })` (the transport waits out the hub's long poll and five seconds more); (2) status 409 with `error: 'resync'` → `writeValue('sync', { ...binding, cursor: 0 })` and return `'resync'`; `refusal?.error === 'not-found'` while `(await host.secrets.get(ring name)) !== null` (this device once unwrapped the ring, so the hub has revoked it) → `forgetKeys(host, nexusId)` and return `'revoked'`; a status other than 200 → return `'error'`; (3) for each `change` in `reply.changes`, in order: (a) `base = readBase(change.path)`; `base && change.seq <= base.version` → skip (this device already holds it, its own pushes included); (b) `dirtyPending().has(change.path) || (await isDirty(root, change.path))` → `await pushDirty(session, [change.path])`, re-read the base, and repeat (a) once; (c) by `change.kind`: `write` → `plaintext = await decryptItem(ring, record.keyId, change.path, await getBlob(…, record.sha256))` (a null blob → return `'error'`) then `landWrite(host, root, change, plaintext)`; `delete` → `landDelete(host, root, change)`; `rename` → `landRename(host, root, change)`; (d) `writeValue('sync', { ...binding, cursor: change.seq })`; (4) return `reply.changes.length ? 'applied' : 'idle'`. The loop in `session.ts` (Task 7.4) calls `pullOnce` repeatedly, runs `reconcile` on `'resync'`, stops on `'revoked'`, and backs off on `'error'` (1 s, 2 s, 4 s, capped at 30 s).
- [ ] `reconcile.ts`: `export async function reconcile(session: Session): Promise<void>`, in order: (1) `admits = manifestAdmits(nexusId, scope)`, `local = await listPathsUnder(root, root, (rel, _kind, siblings) => admits(rel, siblings))`; (2) `heads = new Map<string, Change>()` filled by `pull` from cursor 0 with `waitMs: 0`, page after page until `hasMore` is false, applying each change in `seq` order: a `write` sets its path; a `rename` deletes the `from` entry and sets the new path; a `delete` sets its path to the tombstone (kept, never dropped, so a local file the hub has since deleted meets its tombstone below); `top` is the highest `seq` seen; (3) for each local entry: no head → collect into `toPush`; a `write` or `rename` head whose `record.sha256` equals the `blobSha` of an existing base row → nothing; any other head, a tombstone included → `resolveStale(session, rel, head)`, whose steps record the base on matching bytes, land a tombstone or a merge, and push or capture on a true conflict (never a push with `base: null`); (4) `pushDirty(session, toPush)`; (5) for each non-tombstone head with no local entry → `landWrite` / `landRename` as in `pullOnce`; (6) `writeValue('sync', { ...binding, cursor: top })`.
- [ ] `rescope(session: Session, scope: WatchScope): Promise<void>` in `reconcile.ts`: returns at once when `sameScope(scope, session.scope)` (`Core/Paths/exclusion.ts`), since the settings file is also written by personalization, the profile fields, and the view modes, and none of those may cost a walk; otherwise `admits = manifestAdmits(nexusId, scope)`; every base row whose `path` fails `admits` is `deleteBase`d with no tombstone; `session.scope = scope`; then `reconcile(session)` for what newly passes. Task 7.4's dirty handler calls it when the settings file is among the dirty paths.
- [ ] `pull.test.ts` over a fake transport and `memoryStores()`: `it('lands two pulled writes in order and advances the cursor per change', …)`, `it('lands nothing for a change the base already holds', …)`, `it('pushes a dirty path before landing over it', …)`, `it('answers resync when the cursor is past the head', …)`, `it('waits out the long poll before the transport times out', …)` (the recorded request's `timeoutMs` is `waitMs + 5_000`), `it('forgets its keys and answers revoked on not-found with a cached ring', …)`. `reconcile.test.ts`: `it('pushes everything to an empty hub', …)`, `it('lands everything into an empty copy', …)`, `it('writes nothing and seeds every base when both sides match', …)`, `it('follows a rename in the log to the new path', …)`, `it('lands a tombstone over a local file the hub deleted', …)`, `it('drops base rows on an exclusion change and stores no delete', …)`, `it('walks nothing when the settings change leaves the scope alone', …)`.

**AFTER**

A device that was away catches up in order and never lands over an unpushed edit; a copy bound for the first time neither re-uploads nor re-downloads what matches; a revoked device stops itself.

**VERIFY**

- [ ] `npm run test -- Core/Sync/Client/` passes.
- [ ] `grep -c "writeValue('sync'" Core/Sync/Client/pull.ts` → 2; `grep -c "resolveStale" Core/Sync/Client/reconcile.ts` → 2 (the import and the one call).
- [ ] Check the work for unnecessary code or obvious mistakes.

#### Task 7.4

**TASK:** The session that ties it together: start on bind and on opening a bound Nexus, wait for approval while pending, stop on disconnect, switch, or revocation, one chain for every push and pull, status, `sync:now`, and the no-database case.

**FILES:** `Core/Sync/Client/session.ts`, `Core/Sync/Client/session.test.ts` (new), `Core/Sync/handlers.ts`, `Core/Sync/handlers.test.ts`, `Core/Contract/bridge.ts`, `Core/Nexus/handlers.ts`

**NOW**

`sync:state` fetches the device list; no loop runs. `Core/Nexus/handlers.ts` `openNexusSequence`:

```ts
  const priorRoot = sessionRoot()
  if (priorRoot !== null) await retireFileHistory(priorRoot)
  await openSession(path)
  // openSession canonicalized the root; every step below keys off that string.
  const root = sessionRoot() ?? path
  await prepareOpenedNexus(root)
  await replayPendingRename(root)
  ctx.openStores(root)
  if (root !== priorRoot) {
    void sweepFileHistory(root)
    dropLiveTree()
    if (latchRecord) {
      await runOpenLedger(root)
    } else {
      try {
        await refreshTree(root)
      } catch (e) {
        console.error('adopt: the seed walk failed; reads will retry:', errText(e))
      }
    }
    await seedContentIndex(root)
    if (await replaySchemaCascade(root)) await refreshAfterWrite(root)
    void runRepairSweep(root).then(() => pushValueChanges(ctx, root))
  }
  return root
```

`Desktop/main.ts` runs `openNexusSequence(hostContext(null), posixPath(restore), true)` inside `app.whenReady()` before `createWindow()`; `hostContext().push` is `(k, payload) => { if (mainWindow) push(mainWindow, k, payload) }`, so a push during restore is dropped, which costs nothing here: the heading fetches `sync:state` on mount (Task 9.1's NOW), and that answers `currentStatus()`. `Session` (Task 7.2) and `status.ts` exist; `session.ts` holds the interface alone. `Pushes` in `bridge.ts` ends with `'web:popup': string`.

**CHANGE**

- [ ] `bridge.ts`: `'sync:now': { args: []; reply: Result<SyncState> }` after `'sync:revoke'`; `Pushes` gains `'sync:changed': SyncStatus` after `'tiles:changed'`. The payload is the status alone, since a full `SyncState` would cost a `devices` round trip per transition.
- [ ] `session.ts` gains, beside the `Session` interface, the module state `let session: Session | null`, `let loop: Promise<void> | null`, `let retry: ReturnType<typeof setTimeout> | null`, and `let chain: Promise<void> = Promise.resolve()`. `run<T>(work: () => Promise<T>): Promise<T>` is `const next = chain.then(work); chain = next.then(() => {}, () => {}); return next`, so the caller gets `work`'s value and one rejection never poisons the chain; every `pushDirty`, `pushRename`, `pullOnce`, `reconcile`, and `rescope` the session makes goes through `run`, so no push and no landing ever overlap on this device, which is what G-3 (the decision log: one sync loop per device, so no item is pushed or landed twice at once) asks for. `export async function startSession(ctx: HostContext, root: string, nexusId: string): Promise<void>`, in order: (1) `stopSession()`; (2) `host = syncHost(ctx)`; null → `setStatus(ctx, { state: 'off', why: 'This device has no identity.' })` and return; (3) `binding = readValue<SyncScope>('sync')`; null → return; (4) `!syncStore()` → `setStatus(ctx, { state: 'off', reason: 'no-db', why: "This nexus's database is unavailable; sync is off for this session." })` and return; (5) `ring = await loadRing(host, nexusId, null)`; null → `outcome = await call(host, binding, 'info', { nexusId })`: on 200, `ring = await loadRing(host, nexusId, outcome.reply.info)` (a device approved while pending, or a creator whose cache was cleared, gets its entries here); on 404, this device is pending → `setStatus(ctx, { state: 'off', reason: 'pending', why: 'Waiting for approval from another device.' })`, install nothing, and `retry = setTimeout(…, delay).unref()` re-running this step with `delay` at 5 s, then 10 s, 20 s, capped at 60 s, until `info` answers 200, after which the retry continues through steps (6) to (8) itself; still null after a 200 → `setStatus(ctx, { state: 'off', reason: 'password', why: 'The Nexus password is needed.' })` and return; (6) `session = { host, ctx, root, nexusId, target: binding, ring, scope: await readWatchScope(root), failed: new Set() }`, `installTap(root, nexusId, session.scope, { onDirty, onRename: (from, to) => void run(() => pushRename(session, from, to)) })` where `onDirty(rels)` is `run(async () => { if (rels.includes(SETTINGS_REL)) await rescope(session, await readWatchScope(root)); await pushDirty(session, rels) })` with `SETTINGS_REL` spelled as `` `${NEXUS_DIR}/${NEXUS_CONFIG_FILES.settings}` ``; (7) `readAllBases().length === 0` → `await run(() => reconcile(session))`; else `await run(() => pushDirty(session, [...dirtyPending()]))`; (8) `loop = pulling()`, which captures `self = session` and, while `currentSession() === self` (a stop nulls the session and a restart replaces it, so an old loop ends on its next turn with no flag), runs `outcome = await run(() => pullOnce(self))` and then: `'applied'` or `'idle'`, when `session.failed.size > 0` → `paths = [...session.failed]`, `session.failed.clear()`, `await run(() => pushDirty(session, paths))` (the batch the hub never answered goes again once the hub has answered anything); `'resync'` → `await run(() => reconcile(session))`; `'revoked'` → `stopSession()` then `setStatus(ctx, { state: 'off', reason: 'revoked', why: 'This device was revoked.' })` and return; `'error'` → wait `Math.min(1000 * 2 ** failures, 30_000)`. Status through `status.ts`: `'syncing'` around a push or an applied pull, `'idle'` with `lastAt: Date.now()` afterward, `'error'` with `why` from the last refusal. `export function stopSession(): void` (`clearTimeout(retry)`, `uninstallTap()`, `setStatus(session.ctx, { state: 'off' })` when a session was running, then `session = null`, which is what ends the loop), `export async function syncNow(): Promise<void>` (returns at once with no session; else `paths = [...dirtyPending(), ...session.failed]`, `session.failed.clear()`, `run(() => pushDirty(session, paths))` then `run(() => pullOnce(session, 0))`), `export const currentSession = (): Session | null => session`.
- [ ] `handlers.ts`: `state()` answers `status: currentStatus()` (from `./Client/status`); its revoked branch (Task 5.2) calls `stopSession()` before `forgetKeys` and then `setStatus(ctx, …)` with the revoked status, so `currentStatus()` reads revoked afterward rather than plain `off`; `'sync:now': withRoot(async (root, ctx) => { await syncNow(); return state(root, ctx) })`; `sync:connect` ends with `await startSession(ctx, root, nexusId)` before `state`; `sync:disconnect` calls `stopSession()` first. `Core/Nexus/handlers.ts` `openNexusSequence`: `void startSession(ctx, root, (getLiveTree() ?? (await refreshTree(root))).nexus.id)` after `seedContentIndex(root)` inside the `root !== priorRoot` block, and nothing outside it (`startSession` step (1) stops the prior root's session; a re-point to the same root keeps its loop).
- [ ] `session.test.ts` over a fake transport, `memoryStores()`, and a recording `ctx.push`: `it('reports off with the database reason when no store is installed', …)`, `it('reconciles once when the base table is empty', …)`, `it('starts once a pending device is approved', …)` (`vi.useFakeTimers()`; `info` answers 404 twice then 200; the status is `pending` after the first, the tap is installed after the third), `it('serializes a push and a pull through one chain', …)` (a pull that resolves late never overlaps a push begun after it), `it('re-pushes a failed batch after the next answered pull', …)`, `it('rescopes before pushing when the settings file is dirty', …)`, `it('pushes then pulls on syncNow, failed paths included', …)`, `it('stops and reports revoked when a pull answers revoked', …)`, `it('pushes sync:changed on every transition', …)`. `handlers.test.ts` gains `it('answers the loop status from sync:state', …)`.

**AFTER**

Opening a bound Nexus syncs it, a pending device waits for its approval, and every push and landing runs one after another on one chain; the heading shows the state.

**VERIFY**

- [ ] `npm run test -- Core/Sync/` passes; `npm run typecheck` exits 0.
- [ ] `grep -c "^  '" Core/Contract/bridge.ts` → 121; `grep -c "startSession\|stopSession" Core/Nexus/handlers.ts` → 2 (the import line and the one call).
- [ ] Smoke launch, then the two-instance recipe once: bind A with a password, copy the Nexus to B with the six database files stripped, bind B, approve B from A, `mutate/createPage` on A, confirm the file on B's disk within five seconds by polling `stat` from a shell loop; record the time under this task.
- [ ] Check the work for unnecessary code or obvious mistakes.

#### Review Checkpoint

- [ ] Gates green; engine and host graph unchanged.
- [ ] The Task 7.4 two-instance check passed and its time is recorded.

### Phase 8 — Editor

**GOAL:** A landing under an open page reaches the editor as a merge around the caret, a clean tab reloads, an in-flight save can no longer overwrite a landing, and the renderer holds the base text every merge needs.

#### Task 8.1

**TASK:** Declare and emit `pages:changed` from one classification pass shared with the two existing collectors.

**FILES:** `Core/Contract/bridge.ts`, `Core/Nexus/watchSettle.ts`, `Core/Nexus/watchSettle.test.ts`, `Core/Nexus/watchPatch.ts`, `Desktop/FileWatch/watcher.ts`

**NOW**

```ts
  'nexus:changed': NexusTree
  'values:changed': ValueChange[]
  'tiles:changed': TileHostRef
```

`Core/Nexus/watchSettle.ts`:

```ts
export function valueChangesOf(
  events: WatchEvent[],
  root: string,
  scope: WatchScope,
  tree: NexusTree | null,
): ValueChange[] {
  const held = getLiveTree()
  if (!held) return []
  const byPath = pageIdIndex(tree)
  const byContainer = new Map<string, Set<string>>()
  for (const ev of events) {
    const c = classifyEvent(held, root, ev, scope)
    if (c.kind !== 'page-upsert') continue
    const container = relDirname(c.rel)
    const ids = byContainer.get(container) ?? new Set<string>()
    byContainer.set(container, ids)
    const id = byPath.get(c.rel)
    if (id) ids.add(id)
  }
  return [...byContainer].map(([rel, ids]) => ({ rel, pageIds: [...ids] }))
}

export function tilesChangedIn(
  events: WatchEvent[],
  root: string,
  scope: WatchScope,
): TileHostRef[] {
  const held = getLiveTree()
  if (!held) return []
  const hosts = new Map<string, TileHostRef>()
  for (const ev of events) {
    const c = classifyEvent(held, root, ev, scope)
    if (c.kind === 'tiles-leaf') hosts.set(tileHostKey(c.host), c.host)
  }
  return [...hosts.values()]
}
```

`classifyEvent(tree, root, ev, scope): WatchClass` in `Core/Nexus/watchPatch.ts` returns a union whose type, `WatchClass`, is not exported. `Desktop/FileWatch/watcher.ts` `settle()`:

```ts
    if (tree && tree !== before) pushToWindow(win, 'nexus:changed', tree)
    const changed = valueChangesOf(events, root, scope, outcome === 'refresh' ? null : tree)
    if (changed.length) pushToWindow(win, 'values:changed', changed)
    for (const host of tilesChangedIn(events, root, scope)) pushToWindow(win, 'tiles:changed', host)
```

**CHANGE**

- [ ] `bridge.ts` `Pushes` gains `'pages:changed': string[]` after `'tiles:changed'` (relative paths whose body or frontmatter landed from outside the app).
- [ ] `watchPatch.ts`: `export type WatchClass`.
- [ ] `watchSettle.ts`: `export function classifyBatch(events: WatchEvent[], root: string, scope: WatchScope): WatchClass[]` returning `[]` with no live tree and otherwise `events.map((ev) => classifyEvent(held, root, ev, scope))`; `valueChangesOf(classified: WatchClass[], tree: NexusTree | null)` and `tilesChangedIn(classified: WatchClass[])` iterate the given array; `export function pagesChangedIn(classified: WatchClass[]): string[]` returns the `rel` of every `page-upsert`, deduplicated in order.
- [ ] `watcher.ts` `settle()`: `const classified = classifyBatch(events, root, scope)` once after the tree push; `valueChangesOf(classified, outcome === 'refresh' ? null : tree)`, `tilesChangedIn(classified)`, and `const pages = pagesChangedIn(classified); if (pages.length) pushToWindow(win, 'pages:changed', pages)`.
- [ ] `watchSettle.test.ts` gains `describe('classifyBatch', …)` with `it('names a written page in pages:changed and its container in values:changed', …)` and `it('classifies each event once', …)` (`vi.spyOn(watchPatch, 'classifyEvent')` called `events.length` times across the three collectors).

**AFTER**

```ts
    const classified = classifyBatch(events, root, scope)
    const changed = valueChangesOf(classified, outcome === 'refresh' ? null : tree)
    if (changed.length) pushToWindow(win, 'values:changed', changed)
    for (const host of tilesChangedIn(classified)) pushToWindow(win, 'tiles:changed', host)
    const pages = pagesChangedIn(classified)
    if (pages.length) pushToWindow(win, 'pages:changed', pages)
```

One pass, three pushes.

**VERIFY**

- [ ] `npm run test -- Core/Nexus/` passes; `grep -c "classifyEvent(" Core/Nexus/watchSettle.ts` → 1.
- [ ] Check the work for unnecessary code or obvious mistakes.

#### Task 8.2

**TASK:** Compare-and-swap body writes: `page:open` returns the body's hash, `page:updateBody` carries the base hash and answers the new one, a stale write is refused, the base lives in the page cache entry, and the scheduler routes a refusal to the merge rather than a retry.

**FILES:** `Core/Contract/bridge.ts`, `Core/Pages/pageDetail.ts`, `Core/Files/pageFile.ts`, `Core/Pages/handlers.ts`, `Core/Nexus/page.ts`, `Core/Nexus/page.test.ts`, `Core/Files/writePathRace.test.ts`, `Core/Pages/fileHistory.ts`, `Core/Pages/fileHistory.test.ts`, `Core/Session/saveScheduler.ts`, `Core/Session/saveScheduler.test.ts` (new), `Core/Session/pageDetailCache.ts`, `Core/Session/pageDetailCache.test.ts`, `Core/Testing/fixtures.ts`, `Core/Interface/Glance/GlancePane.test.tsx`, `Core/Interface/Windows/useWindowWarm.test.tsx`, `Core/Tiles/Surfaces/PageTile.test.tsx`, `Core/Properties/PropertyPanel.test.tsx`, `Core/Pages/editorHost.test.ts`, `Core/Pages/PageView.test.tsx`, `Core/Session/replaceBody.test.ts`, `Core/Session/store.test.tsx`

**NOW**

```ts
  'page:updateBody': { args: [relPath: string, body: string]; reply: Result<null> }
```

`Core/Pages/pageDetail.ts` is the whole type:

```ts
export interface PageDetail {
  id: string
  title: string
  path: string
  frontmatter: Record<string, unknown>
  body: string
}
```

`Core/Files/pageFile.ts`:

```ts
export async function readPageDetail(rootPath: string, relPath: string): Promise<PageDetail> {
  const absFile = join(rootPath, relPath)
  const content = await machine().readText(absFile)
  if (content === null) throw new Error(`Page not found: ${relPath}`)
  const frontmatter = splitFrontmatter(content)
  return {
    id: contentId(frontmatter) ?? adoptedId(relPath),
    title: basenameNoMd(basename(relPath)),
    path: relPath,
    frontmatter,
    body: splitEnvelope(content).body,
  }
}
```

`Core/Nexus/page.ts`:

```ts
export async function updatePageBody(absFile: string, body: string): Promise<Result<PageWrite>> {
  return machine().lock(absFile, async () => {
    if (!(await pathExists(absFile))) return fail('not-found', 'Page not found.')
    try {
      return ok(await writePageFile(absFile, {}, [], body))
    } catch (e) {
      return fail('operation-failed', errText(e))
    }
  })
}
```

where `writePageFile(absPath, modeled, modeledKeys, body): Promise<PageWrite>` reads `previous`, merges, writes through `atomicWriteFile`, and returns `{ previous, written }`. Its one non-test caller is `writeBody` in `Core/Pages/fileHistory.ts`:

```ts
export async function writeBody(
  root: string,
  absPath: string,
  body: string,
  source: 'edit' | 'restore',
): Promise<Result<null>> {
  const r = await updatePageBody(absPath, body)
  if (!r.ok) return r
  const { previous, written } = r.value
  const pageId = liveIdOf(root, absPath)
  const known = pageId ? lastWritten.get(pageId) : undefined
  const writtenHash = bodyHash(written)
  if (pageId) lastWritten.set(pageId, writtenHash)
  await indexWrittenPage(root, absPath)
  noteValueWrite(root, absPath)
  if (pageId) {
    const previousHash = previous === null ? writtenHash : bodyHash(previous)
    if (previous !== null && previousHash !== writtenHash) {
      const foreign = known !== undefined && known !== previousHash
      const offered: SnapshotSource =
        source === 'restore' ? 'restore' : foreign ? 'external' : 'edit'
      await captureIfDue(root, pageId, previous, offered, previousHash)
    }
    if (source === 'edit') await arm(root, pageId, 'edit')
    else disarm(pageId)
  }
  return ok(null)
}
```

with `const bodyHash = (text: string): string => machine().sha256Hex(splitEnvelope(text).body)`; the channel in `Core/Pages/handlers.ts` calls `writeBody(root, resolved.value, body, 'edit')` and `restoreSnapshot` calls it with `'restore'`. `Core/Nexus/page.test.ts` (three `updatePageBody` cases) and `Core/Files/writePathRace.test.ts` (three) call `updatePageBody(path, body)` with two arguments. `Core/Session/saveScheduler.ts`:

```ts
type Ack = { ok: boolean }
type Save = () => Promise<Ack>
```

```ts
  const flush = (key: string): Promise<void> => {
    const p = pending.get(key)
    if (!p) return Promise.resolve()
    clearTimeout(p.timer)
    pending.delete(key)
    return p.save().then((ack) => {
      if (!ack.ok && !pending.has(key)) schedule(key, p.body, p.save)
    })
  }
```

```ts
export function schedulePageSave(path: string, body: string): void {
  // Write through to the warm detail slot immediately, so a remounting embed inside the debounce window can never seed on pre-edit prose; re-asserted inside the write so cache and disk still converge across a failed write's requeue.
  writeThroughBody(path, body)
  pageWriter.schedule(path, body, () => {
    writeThroughBody(path, body)
    return host().ask('page:updateBody', path, body)
  })
}

/** A body replaced from outside the editor must not be overwritten by the text it replaced. */
export function cancelPageSave(path: string): void {
  pageWriter.cancel(path)
}
```

`pageDetailCache.ts` holds `detailByPath: Map<string, PageDetail>` capped at `DETAIL_CAP = 50` through `cachePageDetail`, read by `readPageDetail(path)`, filled by `fetchPageDetail(path)` (one shared `page:open` per path), written through by `writeThroughBody`, and evicted by `dropPageDetail`, `dropCacheDetail`, `dropDetailsWhere`, `clearCache`; nothing holds the text the editor loaded. `ErrorCode` is Frozen and has no `stale` member, so a refused write is an `ok` reply whose value says so.

**CHANGE**

- [ ] `pageDetail.ts`: `PageDetail` gains `bodyHash: string` after `body`; `readPageDetail` sets `bodyHash: machine().sha256Hex(body)` over the same `splitEnvelope(content).body`. `bridge.ts`: `'page:updateBody': { args: [relPath: string, body: string, baseHash: string]; reply: Result<BodyWrite> }` with `export interface BodyWrite { hash: string; stale: boolean }` in `pageDetail.ts`: `stale: false` with the written body's hash, or `stale: true` with the on-disk body's hash and the file untouched.
- [ ] `page.ts`: `updatePageBody(absFile: string, body: string, baseHash?: string): Promise<Result<PageWrite | { stale: string }>>`: inside the lock, after the existence check, when `baseHash !== undefined`: `const current = splitEnvelope((await machine().readText(absFile)) ?? '').body; if (machine().sha256Hex(current) !== baseHash) return ok({ stale: current })`; otherwise as today. Restore and the six test calls pass no hash.
- [ ] `fileHistory.ts` `writeBody(root, absPath, body, source, baseHash?)` returns `Promise<Result<BodyWrite>>`: `'stale' in r.value` → `ok({ hash: machine().sha256Hex(r.value.stale), stale: true })` before anything else runs; the success path ends `return ok({ hash: writtenHash, stale: false })`. `restoreSnapshot` reads `r.ok` as today. The channel reads `baseHash` as its third argument (`isString` or `fail('operation-failed', 'A base hash is required.')`) and passes it through.
- [ ] `pageDetailCache.ts`: `const baseByPath = new Map<string, { text: string; hash: string }>()`; `cachePageDetail` seeds `baseByPath` from `detail.body` and `detail.bodyHash` only when the path holds no base yet (a refresh after a save must not move the base back to disk prose the editor has since edited past); `export const readBodyBase = (path: string) => baseByPath.get(path) ?? null`; `export function setBodyBase(path: string, base: { text: string; hash: string }): void` sets the base and patches the cached detail's `bodyHash` to `base.hash` when a detail is held, so the two never disagree; `writeThroughBody` touches the detail's `body` alone and never the base; every eviction that deletes from `detailByPath` deletes from `baseByPath` too.
- [ ] `saveScheduler.ts`: `type Ack = Result<BodyWrite>` and `flush` re-schedules only when `!ack.ok`; `schedulePageSave`'s save closure becomes, at flush time: `let base = readBodyBase(path); if (!base) { await fetchPageDetail(path); writeThroughBody(path, body); base = readBodyBase(path) }; const r = await host().ask('page:updateBody', path, body, base?.hash ?? ''); if (r.ok && !r.value.stale) setBodyBase(path, { text: body, hash: r.value.hash }); else if (r.ok) staleSink?.(path); return r` (the write-through after the fetch keeps a remounting embed on the live buffer rather than the disk prose the fetch brought in). `export function setStaleSaveSink(fn: ((path: string) => void) | null): void` (installed in Task 8.3). `cancelPageSave`'s comment stays true and stays.
- [ ] `Core/Testing/fixtures.ts` (Task 3.2) gains `detail(overrides?: Partial<PageDetail>): PageDetail` (id `p1`, title `Page`, path `Notes/Page.md`, empty frontmatter, empty body, `bodyHash` the machine's hash of that body). The nine tests that build a `PageDetail` literal build it through `detail()` instead: `GlancePane.test.tsx`'s `detail` constant, `useWindowWarm.test.tsx`'s two `cachePageDetail` literals, `PageTile.test.tsx`'s and `editorHost.test.ts`'s local `detail(...)` helpers and `PropertyPanel.test.tsx`'s `detailWith(...)` (each deleted in favor of the fixture), `PageView.test.tsx`'s slot detail, `replaceBody.test.ts`'s `detail` constant, and the literals in `pageDetailCache.test.ts` and `store.test.tsx`.
- [ ] `page.test.ts` gains `it('refuses a body whose base hash is not the disk body and leaves the file', …)`, `it('writes under the right base hash and answers the new hash', …)`, `it('writes unconditionally with no base hash', …)`. `saveScheduler.test.ts` gains `it('does not requeue a stale ack and calls the sink once', …)`, `it('opens the page once when no base is held before saving', …)`, `it('writes the live body through after the opening fetch', …)`. `fileHistory.test.ts` gains `it('answers stale without recording a snapshot', …)`. `pageDetailCache.test.ts` gains `it('holds the body base beside the detail and drops both together', …)`, `it('keeps the body base across write-through and refresh', …)` (a `writeThroughBody` then a `cachePageDetail` of the disk detail leave `readBodyBase(path)` as it was set), and `it('patches the cached bodyHash when the base is set', …)`.

**AFTER**

```ts
export interface PageDetail {
  id: string
  title: string
  path: string
  frontmatter: Record<string, unknown>
  body: string
  bodyHash: string
}

export interface BodyWrite {
  hash: string
  stale: boolean
}
```

```ts
  'page:updateBody': { args: [relPath: string, body: string, baseHash: string]; reply: Result<BodyWrite> }
```

A save is an assertion about the body it started from; a landing between two keystrokes is never overwritten; a property write that changes only frontmatter never trips it.

**VERIFY**

- [ ] `npm run test -- Core/Pages/`, `npm run test -- Core/Session/`, `npm run test -- Core/Nexus/`, and `npm run test -- Core/Files/` pass; `npm run typecheck` exits 0.
- [ ] `grep -rn "updatePageBody(" Core --include='*.ts' | grep -v "\.test\." | wc -l` → 2 (the definition and `writeBody`).
- [ ] Check the work for unnecessary code or obvious mistakes.

#### Task 8.3

**TASK:** The three-way merge in the page view on `pages:changed` and on a stale save, over a diff3 built on `@codemirror/merge`'s `diff`, dispatched as one changes-only transaction annotated so the guards pass it through and it stays out of undo; tiles and parked tabs remount.

**FILES:** `Core/package.json`, `package-lock.json`, `Core/Pages/merge3.ts` (new), `Core/Pages/merge3.test.ts` (new), `Core/Pages/PageView.tsx`, `Core/Pages/PageView.test.tsx`, `Core/Session/pageDetailCache.ts`, `Core/Session/saveScheduler.ts`, `Core/Session/useBridgeSubscriptions.ts`, `Core/MarkdownPM/Guards/calloutGuard.ts`, `Core/MarkdownPM/api.ts`, `Core/Contract/bridge.ts`, `Core/Sync/handlers.ts`, `.claude/Guidelines/Dependencies.md`, `.claude/Guidelines/Editor-Internals.md`

**NOW**

`Core/Session/pageDetailCache.ts`:

```ts
// A body replaced from outside the editor bumps its path's epoch; every host keyed on it remounts.
const bodyEpochs = new Map<string, number>()
const epochListeners = new Set<() => void>()

export function bumpBodyEpoch(path: string): void {
  bodyEpochs.set(path, (bodyEpochs.get(path) ?? 0) + 1)
  for (const fn of epochListeners) fn()
}

export const readBodyEpoch = (path: string): number => bodyEpochs.get(path) ?? 0

export function subscribeBodyEpoch(fn: () => void): () => void {
  epochListeners.add(fn)
  return () => epochListeners.delete(fn)
}

export const useBodyEpoch = (path: string): number =>
  useSyncExternalStore(subscribeBodyEpoch, () => readBodyEpoch(path))
```

The listener set is global; the path enters only through `readBodyEpoch`. `Core/Session/navigationSlice.ts`'s store action:

```ts
    replaceBody: async (path) => {
      cancelPageSave(path)
      dropCacheDetail(path)
      const detail = await fetchPageDetail(path)
      if (!detail) return false
      get().setPageBody(path, detail.body)
      bumpBodyEpoch(path)
      return true
    },
```

`Core/Pages/PageView.tsx` mounts `<MarkdownEditor key={\`${pageDetail.path}:${bodyEpoch}\`} initialBody={slot.body} … />`, holds the view in `const editorRef = useRef<EditorView | null>(null)` set through `register={(view) => { editorRef.current = view; if (!parked) registerPageEditor(view) }}`, and saves through `onChange={(body) => { pushLiveBody(pageDetail.path, body); schedulePageSave(pageDetail.path, body) }}`; `MarkdownEditor.tsx` line 385 comments `// Mount once per page — the host keys on path; initialBody is the seed, not a live binding.` and its `updateListener` calls `onChangeRef.current(doc)` on any `docChanged`. `Core/Tiles/Surfaces/PageTile.tsx` line 62 reads `useBodyEpoch(path)` for its remount. One transaction filter exists, `verdictFilter` in `Core/MarkdownPM/Guards/calloutGuard.ts`, which `citationGuard` reuses (`export const citationGuard = verdictFilter(…)`); `aliasGuard.ts` is an input predicate (`refusedInAlias`), not a filter:

```ts
/** A filter rebuilds its transaction from the start state, so a construct's own annotation is gone unless named here — and a downstream guard would read that write as a user edit. CM exposes no way to enumerate them. */
function carriedAnnotations(tr: Transaction): Annotation<unknown>[] {
  const out: Annotation<unknown>[] = []
  const userEvent = tr.annotation(Transaction.userEvent)
  if (userEvent !== undefined) out.push(Transaction.userEvent.of(userEvent))
  const selfEdit = tr.annotation(tableSelfEdit)
  if (selfEdit !== undefined) out.push(tableSelfEdit.of(selfEdit))
  return out
}

export function verdictFilter(
  verdict: (
    doc: string,
    fromA: number,
    toA: number,
    inserted: string,
    state: EditorState,
  ) => GuardVerdict,
): Extension {
  return EditorState.transactionFilter.of((tr) => {
    if (!tr.docChanged) return tr
```

`tableSelfEdit = Annotation.define<boolean>()` lives in `Core/MarkdownPM/Tables/sync.ts`. `Core/MarkdownPM/api.ts` imports `Facet` from `@codemirror/state` and exports the `EditorHost` facet. `Transaction.addToHistory` is an `AnnotationType<boolean>` (`TransactionSpec` has no such field). `useBridgeSubscriptions.ts` is the one shell hook (its first line: "Every push the host bridge makes into the running session. One place a non-Electron host re-implements, so no shell surface subscribes on its own."). `@codemirror/merge` is not installed; it exports `diff(a: string, b: string): readonly Change[]` with `Change = { fromA, toA, fromB, toB }`.

**CHANGE**

- [ ] `npm install @codemirror/merge@^6 -w Core` from the root, which writes the `^6` pin into `Core/package.json` dependencies (its peers `@codemirror/state` and `@codemirror/view` are present) and updates `package-lock.json`. `Dependencies.md`'s State · Data · Search list gains `- **@codemirror/merge** — the \`diff\` behind the three-way merge a landing makes in an open page, imported by \`Core/Pages/merge3.ts\` alone, which the engine and host graph tests keep out of the engine. **Decided.**`, and its line 39 "`Sync/server.ts` runs on Node's built-ins alone (`node:http`, `node:sqlite`, `node:crypto`), as plain `node` over the source with type stripping." names `Sync/hub.ts` and adds `node:https` to the list.
- [ ] `merge3.ts`: `export function merge3(base: string, local: string, remote: string): { text: string; conflicted: boolean }`: `L = diff(base, local)`, `R = diff(base, remote)`; walk both hunk lists in base order building `text` from `base` slices: a hunk from one side whose `[fromA, toA)` overlaps no hunk on the other side applies its `[fromB, toB)` text; a run of overlapping hunks (merged transitively by overlap in base coordinates) applies the remote's replacement for the run's base span and sets `conflicted`; identical replacements on both sides apply once. `merge3.test.ts`: `it('keeps disjoint edits from both sides', …)`, `it('applies the same edit once', …)`, `it('takes remote on an overlap and reports the conflict', …)`, `it('yields remote when local equals base', …)`.
- [ ] `api.ts`: `import { Annotation, Facet } from '@codemirror/state'` and `export const syncLanding = Annotation.define<boolean>()`. `calloutGuard.ts`: `verdictFilter`'s callback begins `if (!tr.docChanged || tr.annotation(syncLanding)) return tr`, and `carriedAnnotations` gains `const landing = tr.annotation(syncLanding); if (landing !== undefined) out.push(syncLanding.of(landing))`.
- [ ] `bridge.ts`: `'sync:captureLocal': { args: [relPath: string, text: string]; reply: Result<null> }` after `'sync:now'`; `Core/Sync/handlers.ts`: `'sync:captureLocal': withRoot(async (root, _ctx, rel: unknown, text: unknown) => { if (!isString(rel) || !isString(text)) return fail('operation-failed', 'A path and its text are required.'); await captureLoser(root, rel, new TextEncoder().encode(text), 'merge-lost'); return ok(null) })`.
- [ ] `pageDetailCache.ts`: `const landingListeners = new Map<string, Set<() => void>>()`; `export function subscribeLanding(path: string, fn: () => void): () => void`; `export function notifyLanding(path: string): boolean` runs the path's listeners and returns whether any ran.
- [ ] `useBridgeSubscriptions.ts`: `const absorb = (path: string): void => { if (readPageDetail(path) && !notifyLanding(path)) void replaceBody(path) }` with `replaceBody = useSession((s) => s.replaceBody)`; `useEffect(() => dialer().on('pages:changed', (paths) => paths.forEach(absorb)), [replaceBody])` and, in the same effect, `setStaleSaveSink(absorb)` with `setStaleSaveSink(null)` on cleanup.
- [ ] `PageView.tsx`: `useEffect(() => subscribeLanding(pageDetail.path, onLanding), [pageDetail.path])` for the mounted editor (parked editors do not subscribe, so a parked tab takes `replaceBody`). `onLanding`, in order: (1) `view = editorRef.current`; null → `void replaceBody(path)` and return; `base = readBodyBase(path)?.text` and `local = view.state.doc.toString()`, both read before anything is dropped or fetched (the drop below evicts the base with the detail); (2) `dropPageDetail(path)` (the detail alone, so the warm editor state stays) then `fresh = await fetchPageDetail(path)`; null → return; (3) `merged = merge3(base ?? local, local, fresh.body)`; (4) `merged.conflicted` → `void host().ask('sync:captureLocal', path, local)`, the whole pre-merge buffer once, so what the merge set aside is recoverable in one piece; (5) `merged.text !== local` → `view.dispatch({ changes: { from: 0, to: local.length, insert: merged.text }, annotations: [syncLanding.of(true), Transaction.addToHistory.of(false)] })` with no selection given, then `setPageBody(path, merged.text)`; (6) `setBodyBase(path, { text: fresh.body, hash: fresh.bodyHash })`; (7) no explicit save: the dispatch in (5) reaches `updateListener`, whose `onChange` runs `pushLiveBody` and `schedulePageSave(path, merged.text)`, and the debounced flush reads the base set in (6). `PageTile.tsx` keeps its epoch remount.
- [ ] `Editor-Internals.md` gains one bullet: `- **A landing is one changes-only transaction carrying \`syncLanding\`.** \`verdictFilter\` passes it through and re-carries the annotation; \`Transaction.addToHistory.of(false)\` keeps it out of undo; no selection is given, so the default mapping keeps the caret where the edit left it.`
- [ ] `PageView.test.tsx` gains `it('merges a landing around the caret without an undo entry', …)` and `it('routes a stale save through the same merge', …)`.

**AFTER**

A remote edit appears in the open page a beat after it lands, the caret stays where it was, undo ignores it, and an overlap keeps the remote text with the whole local buffer captured.

**VERIFY**

- [ ] `npm run test -- Core/Pages/` passes with the `merge3` suite; both graph tests still report `['ulidx', 'yaml', 'zod']`.
- [ ] `npm ls @codemirror/merge -w Core` prints one entry.
- [ ] Smoke launch, then from the dev instance's console: open a page, place the caret mid-body, append a line to the file from a shell; within two seconds the editor shows the line and the selection head is unchanged; ⌘Z (dispatched as `undo` from `@codemirror/commands` through the console) does not remove the line.
- [ ] `grep -c "syncLanding" Core/MarkdownPM/Guards/calloutGuard.ts` → 4 (the import, the early return, the carry's read and its re-annotation); `grep -rc "syncLanding" Core/MarkdownPM/Guards/citationGuard.ts Core/MarkdownPM/Guards/aliasGuard.ts` → 0 for each.
- [ ] Check the work for unnecessary code or obvious mistakes.

#### Review Checkpoint

- [ ] Gates green; both graph tests unchanged.
- [ ] Smoke launch with the Task 8.3 console check recorded.

### Phase 9 — The Nexus Heading

**GOAL:** Settings › General's Nexus heading gains the password at bind, a sync status line, Sync Now, the pin field, and the paired indicator, composed from existing kit with one three-line UIX touch.

**BRIEF (headless design; before writing, the executor sweeps `UIX/Fields/`, `UIX/Menus/menu-index.tsx`, `Core/Settings/*.tsx`, and `Core/Settings/frames.ts` for what exists, then writes its numbered decisions in-chat and proceeds):** rows today are This Device, Nexus ID, Server (address field, Connect / Refresh / Disconnect), and one `item` row per device with Approve / Revoke, all in `Core/Settings/NexusRows.tsx` through `NexusBody`, which serializes calls through one `inFlight` ref and renders the Server caption from `captionFor(binding)`. Kit available: `MenuRow` kinds `heading | separator | caption | action | item`, `Trailing` slots `chevron | value | switch | button | slider | picker | color | field`, `SettingsFieldRow` (`{ label, hint?, children }` over an `item` row with a `field` trailing), `ClearActionRow` (`{ label, hint?, clear: () => Promise<boolean> }`, a `destructive` Button reading "Clear" then "Cleared" for `CLEARED_MS = 1500`), `InputField` (`edit?: FieldEdit` with `value`, `onCommit`, `renames?`, `emptyCommits?`, `editing?`, `onEditingChange?`). No new UIX kind. The one gap: `InputField` renders its edit through `RenamableLabel`, which renders `EditableInput`, whose `<input>` carries no `type`; an optional `type?: 'text' | 'password'` passes through all three. Rows the mandate needs: **Nexus Password** (`SettingsFieldRow`, masked, shown only while unbound or pending; on commit it rides `sync:connect` with the address and pin and is never held past the call; once approved the row is an inert caption "Held in this device's keychain"); **Pin** (a second field on the Server row shown when the address starts with `https:`); **Sync** (a `caption` row under Server driven by `status`: `off` with its reason, `idle` as "Last synced N s ago", `syncing`, `error` with its reason); **Sync Now** (`SettingsFieldRow` + `Button`, disabled unless approved, "Syncing…" then "Synced" on the `ClearActionRow` timer); the device rows gain "· paired" in the caption when `x25519` is present. The heading subscribes to `sync:changed`; no polling.

#### Task 9.1

**TASK:** The rows and the one field prop.

**FILES:** `Core/Settings/NexusRows.tsx`, `Core/Settings/NexusRows.test.tsx`, `UIX/Fields/InputField.tsx`, `UIX/Fields/RenamableLabel.tsx`, `UIX/Fields/EditableInput.tsx`, `Core/Session/nexusSlice.ts`, `Core/Session/useBridgeSubscriptions.ts`, `.claude/Features/ConfigurationPM.md`, `.claude/Features/InterfacePM.md`

**NOW**

`NexusBody` in `NexusRows.tsx` holds `const [state, setState] = useState<SyncState | null>(null)`, `const [draft, setDraft] = useState<string | null>(null)`, `const [busy, setBusy] = useState(false)`, serializes every ask through `run(ask, report = true)` over an `inFlight` ref, fetches `sync:state` on mount through `refresh(false)`, and renders This Device (`InputField` with `edit` on `sync:renameDevice`), Nexus ID, Server (`SettingsFieldRow` with `hint={binding ? captionFor(binding) : undefined}`, the address `InputField`, and Connect / Refresh / Disconnect Buttons), and one `MenuRowView` `item` row per device with `caption: \`${fingerprint(device.id)} · ${revoking ? 'Approved' : 'Pending'}\`` and an Approve or Revoke Button in a `field` trailing; `onConnect` is `run(() => host().ask('sync:connect', address))`. `UIX/Fields/EditableInput.tsx` renders `<input ref={inputRef} className={…} defaultValue={initialText ?? value} … />` with no `type`; `RenamableLabel` passes `value`, `initialText`, `className`, `autoSize`, `boxed`, `ariaLabel`, `caretAtEnd`, `onCommit`, `onCancel` to it; `InputField`'s `FieldEdit` is `{ value, onCommit, renames?, emptyCommits?, editing?, onEditingChange? }`. `Core/Session/nexusSlice.ts`'s `NexusSlice` holds `status`, `tree`, `load`, `applyTree`, `choose`, `openDropped`, `mutate`, …; `useBridgeSubscriptions.ts` subscribes every push in one hook and hands each to a store action (`applyTree`, `applyNavChanged`, `applyAssetMap`, `bumpContainerValues`). `NexusRows.test.tsx` renders `<NexusRows />` under jsdom against `stubDialer(channels)` and drives fields through `commit(label, text)` and buttons through `button(label)`.

**CHANGE**

- [x] `EditableInput` gains `type?: 'text' | 'password'` rendered as the `<input>`'s `type` attribute; `RenamableLabel` gains the same prop and passes it through; `FieldEdit` gains `type?: 'text' | 'password'` and `InputField` passes `edit.type` to `RenamableLabel`.
- [x] `nexusSlice.ts`: `NexusSlice` gains `syncStatus: SyncStatus | null` (initial null) and `applySyncStatus: (status: SyncStatus) => void` (`set({ syncStatus: status })`). `useBridgeSubscriptions.ts`: `const applySyncStatus = useSession((s) => s.applySyncStatus)` and `useEffect(() => dialer().on('sync:changed', applySyncStatus), [applySyncStatus])`.
- [x] `NexusRows.tsx`, the rows per the brief: `const pushed = useSession((s) => s.syncStatus)` merged into the held state through `useEffect(() => { if (pushed) setState((s) => s && { ...s, status: pushed }) }, [pushed])`; the Nexus Password row (`SettingsFieldRow` with an `InputField` whose `edit` is `{ value: '', type: 'password', renames: 'row', onCommit: setPassword }` and whose children read `<span className={placeholder}>Not set</span>` or a masked `••••••••` while a draft is held; shown while `binding === null`, `binding.state === 'pending'`, or `state.status.reason === 'password'`, never by reading the sentence; once approved with no such reason, a `caption` row reading "Held in this device's keychain"); the Pin field (a second `InputField` in the Server cluster, shown when `address.startsWith('https:')`, `edit: { value: pin, renames: 'row', emptyCommits: true, onCommit: setPin }`); the Sync caption (`MenuRowView` `caption` row under Server whose text follows `state.status.state`: `off` → `status.why ?? 'Off'`, `idle` → `\`Last synced ${Math.round((Date.now() - (status.lastAt ?? Date.now())) / 1000)} s ago\``, `syncing` → `'Syncing…'`, `error` → `\`Error: ${status.why}\``); Sync Now (`SettingsFieldRow` with a `filled` Button, `disabled={busy || binding?.state !== 'approved'}`, label "Syncing…" while `state.status.state === 'syncing'`, "Synced" for `CLEARED_MS` after a run through the `ClearActionRow` timer pattern hoisted into a `useTimedLabel(idle, active)` hook in the same file, else "Sync Now", `onClick: run(() => host().ask('sync:now'))`); the device caption gains `· paired` when `device.x25519` is present. `onConnect` becomes `run(() => host().ask('sync:connect', address, password || undefined, pin || undefined))`, and `setPassword('')` after the call whether it succeeded or not.
- [x] `NexusRows.test.tsx` gains `it('shows the password row unbound and hides it once approved', …)`, `it('disables Sync Now while pending', …)`, `it('captions each of the four sync states', …)`, `it('marks a device carrying an agreement key as paired', …)`, `it('shows the pin field for an https address', …)`, `it('sends the password and the pin with connect and never holds the password', …)`.
- [x] `ConfigurationPM.md` line 19 (the Nexus heading paragraph) and line 21 (the states paragraph) are rewritten to the rows above; `InterfacePM.md` line 67's clause "as the Nexus heading does, binding to the device and the server" becomes "as the Nexus heading does, binding to the device, the hub, and the Nexus password".

**AFTER**

Nine rows and a device list, all existing kinds; one optional prop on three fields in one chain.

**VERIFY**

- [x] `npm run test -- Core/Settings/` and `npm run test -- UIX/Fields/` pass; `npm run typecheck` exits 0.
- [x] `grep -c "'password'" Core/Settings/NexusRows.tsx` → ≥ 1.
- [x] Smoke launch: the heading renders unbound with the password row; after `sync:connect` over the console the row becomes the caption and Sync Now enables.
- [x] Check the work for unnecessary code or obvious mistakes.

#### Review Checkpoint

- [x] Gates green; the smoke check recorded with the executor's numbered design decisions in-chat.

### Phase 10 — Proof, Deploy, and Reconciliation

**GOAL:** The hub can be built into a container, the developer guide describes what now exists, the mandate is observed end to end on one Mac with real data, the timeline is measured, what must not travel is shown not to, and every document the arc made false reads true.

#### Task 10.1

**TASK:** A Dockerfile for the hub, its scripts, and Development-Environment rewritten to what stands.

**FILES:** `Sync/Dockerfile` (new), `Sync/Dockerfile.dockerignore` (new), `package.json`, `.claude/Guidelines/Development-Environment.md`

**NOW**

Nothing container-shaped exists. `docker build -f Sync/Dockerfile .` takes the repository root as its context, where a `.dockerignore` is read from the root or, under BuildKit, from `<Dockerfile>.dockerignore` beside the Dockerfile. Development-Environment line 12 reads "**The sync server:** `npm run sync` from the root starts `Sync/server.ts` on `http://127.0.0.1:7473`, its SQLite file under `~/.pommora-sync/` (`POMMORA_SYNC_DATA` and `POMMORA_SYNC_PORT` override both); it is a separate process, never started by the app."; line 39 ("The commit hook's ledger amend swallows whatever the index holds …") describes a `git commit --amend` that `.claude/hooks/post-commit` no longer performs (it runs `loc.py --update`, `build:dashboard`, and `check-atlas.mjs`); line 44's two-instance recipe has no hub step.

**CHANGE**

- [ ] `Sync/Dockerfile`:

```dockerfile
FROM node:24.15-slim
RUN apt-get update && apt-get install -y --no-install-recommends tini && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --chown=node:node Sync/ ./Sync/
ENV POMMORA_SYNC_DATA=/data POMMORA_SYNC_HOST=0.0.0.0 NODE_ENV=production
VOLUME /data
EXPOSE 7473
USER node
ENTRYPOINT ["tini", "--"]
CMD ["node", "Sync/hub.ts"]
```

  `Sync/Dockerfile.dockerignore`, root-relative since the context is the repository root: `**/node_modules`, `Sync/**/*.test.ts`, `Sync/Testing/`, `Sync/scripts/`. Root `package.json` gains `"sync:image": "docker build -f Sync/Dockerfile -t pommora-hub ."`.
- [ ] Development-Environment: the sync paragraph (`Sync/hub.ts`, `npm run sync:cert`, the printed pin, the three env names, TLS when the PEM files exist); the two-instance recipe gains the hub start, the bind with a password, the six stripped database files, approve from A, and the note that built output exposes `window.nexus.ask` only; the `--amend` paragraph replaced with what the hook does (rewrites `loc-history.json`, excluded from Biome, and rebuilds the dashboard; the `--only` rule stays for the shared index); one line under the watcher notes on `awaitWriteFinish` and the over-200 ms rename surfacing `Name.md.<digits>`, which the manifest predicate drops.

**AFTER**

`docker run -v hub-data:/data -p 7473:7473 pommora-hub` serves the hub; a new session can start the hub, mint a certificate, and stand up two instances from the guide alone.

**VERIFY**

- [ ] `grep -c "ENTRYPOINT \[\"tini\"\|^USER node\|POMMORA_SYNC_DATA=/data" Sync/Dockerfile` → 3.
- [ ] `which docker && npm run sync:image` exits 0; when `which docker` fails, the skip is written to Deviations.
- [ ] `grep -c "server.ts\|--amend" .claude/Guidelines/Development-Environment.md` → 0; `grep -c "sync:cert\|hub.ts\|window.nexus.ask" .claude/Guidelines/Development-Environment.md` → ≥ 3.

#### Task 10.2

**TASK:** The two-instance proof over CDP against two stripped copies of NexusOS, running the closeout list with expected-versus-observed recorded in the plan.

**FILES:** this plan (results table appended under this task), the scratch directory

**NOW**

Task 7.4 proved one landing. The channels the rows drive, as `Core/Contract/bridge.ts` and `Core/Nexus/mutateRequest.ts` spell them: `'nexus:openPath': { args: [path: string] }`; `mutate: { args: [req: MutateRequest] }` with `{ op: 'createPage'; parentPath; name; seeds?; order? }`, `{ op: 'setProperty'; path; propertyId; value }`, `{ op: 'setContext'; path; contextId; spaceIds }`, `{ op: 'setIcon'; path; kind; icon }`, `{ op: 'reorderChildren'; parentPath; key: 'set_order'; order }`, `{ op: 'reorderTop'; order }`, `{ op: 'createContainer'; parentPath; kind; name }`, `{ op: 'rename'; path; kind; newName }`, `{ op: 'delete'; path; kind }`, `{ op: 'restore'; bundlePath; destination? }`, `{ op: 'emptyBundle'; bundlePath }`; `'views:save': { args: [containerPath, kind: 'collection' | 'set', view: SavedView] }`; `'personalization:set': { args: [key, value] }`; `'nav:write': { args: [patch: Partial<NavigationState>] }`; `'assets:adopt': { args: [source, subfolder?] }`; `'tiles:save': { args: [host: TileHostRef, patch: TileDocPatch] }`; `'schema:rename': { args: [containerPath, propertyId, newName] }`; `'trash:list': { args: [] }`; `'capture:thumbnail': { args: [navKey, rect: ThumbRect, scaleFactor] }`; `'sync:revoke': { args: [deviceId] }`. No `trash:restore` or `trash:empty` channel exists; restore and empty are `mutate` ops. `page:open` answers `bodyHash` (Task 8.2) and `page:updateBody` takes it as its third argument.

**CHANGE**

- [ ] Setup: `npm run build`; `POMMORA_SYNC_DATA=<scratch>/hub npm run sync:cert && POMMORA_SYNC_DATA=<scratch>/hub npm run sync` in the background (note the printed pin); copy `/Users/nathantaichman/NexusOS` to `<scratch>/A` and `<scratch>/B`, deleting `.nexus/nexus.db`, `.nexus/versions.db`, and their `-wal`/`-shm` siblings in both; launch A and B from built output with separate `POMMORA_USERDATA` and `POMMORA_DEBUG_PORT` (9333, 9334) per the recipe; `ask('nexus:openPath', '<scratch>/A')` and the B counterpart; bind A (`ask('sync:connect', 'https://127.0.0.1:7473', '<password>', '<pin>')`), bind B the same way, approve B from A (`ask('sync:approve', '<B id>')`); wait for B's `ask('sync:state')` to answer `status.state === 'idle'`.
- [ ] A measurement harness: one Node script per instance polling `stat` and a content hash of a named path every 50 ms, printing the first-change timestamp; a reading through `window.nexus.ask('nexus:state')` for the tree; the delta is B's disk reading minus A's ask return. Every `page:updateBody` in the rows first reads `page:open`'s `bodyHash` and passes it as the third argument.
- [ ] Run the rows, each driven through `window.nexus.ask` over `Runtime.evaluate` on A unless the row says otherwise, recording expected, observed, and delta:
  1. `mutate` `{ op: 'createPage', parentPath, name }` → new `.md` on B
  2. `page:updateBody` → body on B
  3. `mutate` `{ op: 'setProperty', … }` with a number value → frontmatter on B
  4. `mutate` `{ op: 'setProperty', … }` with a new select option → page and `.nexus/properties.json` on B
  5. `mutate` `{ op: 'setContext', path, contextId, spaceIds }` → frontmatter on B
  6. `mutate` `{ op: 'setIcon', path, kind: 'page', icon }` → `icon` on B
  7. `mutate` `{ op: 'reorderChildren', parentPath, key: 'set_order', order }` → sidecar `set_order` on B
  8. `mutate` `{ op: 'reorderTop', order }` → `.nexus/state.json` on B
  9. `mutate` `{ op: 'createContainer', parentPath, kind: 'set', name }` → folder and sidecar on B
  10. `views:save` → sidecar `views` on B
  11. `personalization:set` → `.nexus/settings.json` on B
  12. `nav:write` with `{ pinned: [...] }` → `.nexus/state.json` on B
  13. `assets:adopt` an image → the asset on B
  14. `tiles:save` with `{ kind: 'homepage' }` → `.nexus/homepage/_tiles.json` on B and B's tile host re-renders
  15. `mutate` `{ op: 'rename', path, kind: 'page', newName }` on a page carrying `[[Title]]` connections → one `rename` change in the hub's `change` table, the rename and every rewritten page on B; delta at the last landing
  16. `schema:rename` a property → every holder on B; `.nexus/property-cascade.json` never on B
  17. `page:open` on B, then `page:updateBody` on A → B's editor shows the text with its selection head unchanged (read through the console before and after)
  18. Hub stopped; `personalization:set` of two different keys on A and B; hub started → both keys on both sides
  19. Hub stopped; `page:updateBody` on the same page on A then B; hub started → the newer body on both; the older in both `captures` tables (`node -e` over `node:sqlite`) and as a `capture` row on the hub
  20. `mutate` `{ op: 'delete', path, kind: 'page' }` on A → B's `trash:list` names the bundle and the page is gone; `mutate` `{ op: 'restore', bundlePath }` on A → the page is back on B and the bundle gone; `mutate` `{ op: 'emptyBundle', bundlePath }` on A → the bundle gone on B
  21. Negative: `capture:thumbnail` on A → no thumbnail file on B; `nexus.db` never on B
  22. `sync:revoke` B from A → B's next `sync:state` reports `status.state === 'off'` with `reason === 'revoked'` and `why` "This device was revoked."; the hub's `ring` holds no row whose `holder` is B
- [ ] Teardown: quit both instances, kill the hub, delete `<scratch>/A`, `<scratch>/B`, `<scratch>/hub`, and both userData directories.
- [ ] Append the results table under this task: row, expected, observed, delta ms, pass/fail. Any row over five seconds or failing is a Deviation with the mechanism named; a failing row the executor can fix inside the mandate is fixed and re-run before the phase closes.

**AFTER**

Twenty-two observed rows in the plan; the scratch directory empty.

**VERIFY**

- [ ] Every row's observed column was written after the executor watched the harness output for it.
- [ ] `ls <scratch>` shows none of the five directories; `pgrep -f "Sync/hub.ts" | wc -l` → 0.

#### Task 10.3

**TASK:** Every document the arc made false reads true.

**FILES:** `.claude/Features/NexusSyncPM.md`, `.claude/Features/CorePM.md`, `.claude/Features/DesktopPM.md`, `.claude/Planning/Cross-Device Mutation Checklist.md`, `.claude/Planning/Codebase Audit — Report.md`, `.claude/FrameworkPM.md`, `.claude/ContextPM.md`, `.claude/HistoryPM.md`, .claude/Planning/Sync-Scaffolding-V2 — Decision Log.md`

**CHANGE**

- [ ] `NexusSyncPM.md`: rewritten as a whole: the manifest rule with its exclusions; the three identities plus the agreement key; the ring and the password; the hub's folder, its routes, caps, TLS, and pin; the change log and the long-poll; the conflict rule with captures on both ends; the landing and the two merges; the timeline as measured in Task 10.2; the `versions.db` exception to the Database decision in one sentence; a password change named as a Prospect. Its Pending list is deleted.
- [ ] `CorePM.md`: `local_state` gains the base-record table; `versions.db` gains `captures`; the exclusion paragraph gains the manifest as a second consumer defined from the first; the File History paragraph carries the capture carve-out.
- [ ] `DesktopPM.md`: the watcher paragraph (tap above the echo check, tile bodies admitted, `.trash` fed from the write funnel); the secret store's new names; the sync transport.
- [ ] `Cross-Device Mutation Checklist.md`: the Frame cites C-1 of the V2 log; "thumbnails and journals included" inverted; the `.trash` and `versions.db` lines; the `sync` scope's shape; a "Measured" column added from Task 10.2.
- [ ] `Codebase Audit — Report.md`: D-2 and D-3 marked ruled with a pointer to F-3 and F-7 of the V2 log; the "Focus next" lines and change items 1 and 2 rewritten.
- [ ] `FrameworkPM.md`: line 13's clause "and the Sync Groundwork arc, which gives every install its own Ed25519 device key, stands up a one-file server holding which devices a Nexus admits, and adds the Nexus heading to Settings › General" gains the content arc after it; line 41's sentence "The mobile companion and Pommora Sync have their own plan and decision log in `// Planning`; the identity groundwork shipped first." becomes "Pommora Sync's decision log is [[Sync-Scaffolding-V2 — Decision Log]]; the identity groundwork and the content arc have shipped, and the mobile companion is its open Prospect."
- [ ] `ContextPM.md`: Current Focus rewritten as a whole per Context-Format; Recent Work gains the arc's entry above `PM-137 || One Drag Engine`.
- [ ] `HistoryPM.md`: one entry, PM-138, above `PM-137 || One Drag Engine`, per History-Format. Reframing the initial scaffolding entry as Sync Scaffolding - Part 1, with PM-138 AMAs Sync Scaffolding - Part 2
- [ ] The V2 decision log's Standing line becomes "Closed <date> · [[NexusSyncPM]] describes what stands"; the Rulings that refined confirmed entries (feed, blobs, `.trash` feed, depth table, undo, compare-and-swap, ID-less rule, the rename report, dirty-file precedence, the merged-landing base rule, a password change as a Prospect) are folded into the corresponding entries under the replace rule; D-2's clause "today that resolution is inline across two branches of `route()` (`Sync/server.ts:245-261`)" becomes "that resolution was inline across two branches of the one-file server's `route()`"; the `### Sources` entry for `Sync/server.ts` is rewritten to name `Sync/hub.ts` and the `Sync/` folder as what now stands, keeping the one-file name as what the log was drafted against.

**VERIFY**

- [ ] `grep -rln "four verbs\|Sync/server.ts\|thumbnails and journals included\|string-only" .claude/Features .claude/Guidelines .claude/FrameworkPM.md ".claude/Planning/Cross-Device Mutation Checklist.md" ".claude/Planning/Codebase Audit — Report.md" | wc -l` → 0 (`HistoryPM.md` and the archived `Sync Groundwork — Implementation Plan.md` keep their historical wording). `.claude/ContextPM.md` and the decision log are read by two narrower greps, since each keeps one historical mention the file-level grep cannot see past: `grep -c "Sync/server.ts" .claude/ContextPM.md` → 1 (its Recent Work entry for the identity arc; Current Focus holds none), and `grep -c "Sync/server.ts" ".claude/Planning/Sync-Scaffolding-V2 — Decision Log.md"` → 1 (the `### Sources` entry alone; D-2's citation is gone).
- [ ] Each rewritten paragraph read once in place for a contradiction with its neighbors.

#### Review Checkpoint

- [ ] The results table is complete; every Deviation carries a fix or a mechanism.
- [ ] Gates green from a clean checkout of HEAD.

### Completion Criteria

**Conformance**

- [ ] No duplicated mechanism: `grep -rln "crypto.subtle" Core --include='*.ts' | grep -v test` → only `Core/Sync/Keys/*`; one walker in `walk.ts`; one authority function in `Sync/authority.ts`; one classification pass in `watchSettle.ts`.
- [ ] Nothing changed outside what the plan named: `git diff --name-only <baseline>..HEAD | grep -v loc-history.json` is a subset of the union of every task's FILES.
- [ ] `Sync/hubGraph.test.ts`, `Core/Contract/engineGraph.test.ts`, and `Desktop/hostGraph.test.ts` pass with their externals unchanged.

**Correctness**

- [ ] A page created on A exists on B's disk within five seconds (Task 10.2 row 1).
- [ ] A remote edit lands in B's open editor with the selection head unmoved and outside undo (row 17).
- [ ] Two devices' settings changes both survive a reconnect (row 18); a same-page conflict leaves the newer body on both and the older in both `captures` tables and on the hub (row 19).
- [ ] The hub's `blob` table holds no plaintext: `node -e` over `node:sqlite` reads one blob; its first byte is `0x01` and no `---` appears in its first 64 bytes.
- [ ] A thumbnail, `nexus.db`, and a cascade journal never appear on B (rows 16 and 21).
- [ ] A revoked device reports `off` and holds no ring row (row 22).
- [ ] Trash deletion, restore, and empty each reach B (row 20).

**Completeness**

- [ ] Every task ticked; `git diff <baseline>..HEAD | grep -c "TODO\|console.log("` → 0 beyond lines the tree already had.

**Confirmation**

- [ ] Every VERIFY result read by the orchestrator from the command's own output; `Core/Sync/Arrival/jsonMerge.test.ts` and `Core/Pages/merge3.test.ts` go red with their implementations reverted.
- [ ] User: none (unattended; the Task 10.2 table is the user's read in the morning).

**Continuity**

- [ ] Reconciliation complete; the living documents read true; every Deviation fixed or carrying the mechanism for Nathan's ruling.

**Confidence**

- [ ] Gates green from clean on `<baseline>..HEAD`; Baseline counts moved as planned.
- [ ] Diff size as the plan implied: roughly +2,800 / −350 lines excluding tests and comments; a figure outside ±40% is reported in the closing note, not tidied.

### Final Verification

**THE STANDARD:** The work is finished when a later review of it finds nothing to correct. Nothing is carried as a concern, nothing is deferred where the fix is known, and nothing is declared that wasn't watched happen. Where something genuinely couldn't get there, the report names which and why, and everything else is still finished. Ambiguity met during execution took the simplest reading and was recorded; it didn't stop the run. Edits found in adjacent files that no task made belong to Nathan, folded into the commit at hand, not reverted.

- [ ] Phase review dispatched, all phases at once: Phases 1–10, two Opus agents each (correctness, simplification), scoped to the phase's commit range and FILES, briefed with the tasks, the Constraints, the decision log, and the Rulings as the do-not-re-raise list
- [ ] All findings fixed or ruled on; a fix touching another phase's files re-runs that phase's pair
- [ ] Neutral verification passed on `<baseline commit>..HEAD`: one Opus agent that did none of the work reads each Completion Criteria item against the tree and the Task 10.2 table
- [ ] Final pass: gates from clean · Baseline re-run · the diff read once for leftovers · Deviations each fixed or carrying a mechanism · Completion Criteria ticked as observed
- [ ] Reconciliation walked; living documents read
- [ ] Report delivered

#### Reconciliation

- `.claude/Features/NexusSyncPM.md` — "one file, `Sync/server.ts`", "four verbs", "eight kilobytes", "ten seconds", the manifest rule at `:10`, "a server is the address", the Pending list — Task 10.3
- `.claude/Features/CorePM.md` — `local_state` "two roles"; "one table, `snapshots`"; the exclusion predicate's consumer list; "nothing lands while the toggle is off" — Task 10.3
- `.claude/Features/DesktopPM.md` — "Every in-app write records itself and the watcher skips recorded paths"; the ignored-at-intake list — Task 10.3
- `.claude/Features/ConfigurationPM.md` — the Nexus rows; the `pommora.json` device fields; `secrets.json` names — Task 9.1
- `.claude/Features/InterfacePM.md` — the Settings Window sentence on what the Nexus heading binds — Task 9.1
- `.claude/Planning/Cross-Device Mutation Checklist.md` — "thumbnails and journals included"; "nothing here is measured yet"; "`.trash` … outside the watcher"; the `sync` scope; the decision B-1 citation — Task 10.3
- `.claude/Planning/Codebase Audit — Report.md` — D-2 and D-3 open; "the open page never finds out"; change items 1–2; "Focus next" — Task 10.3
- `.claude/Guidelines/Development-Environment.md` — `Sync/server.ts` (line 12), the `--amend` paragraph (line 39), the two-instance recipe (line 44) — Task 10.1
- `.claude/Guidelines/Dependencies.md` — no merge library; "`Sync/server.ts` runs on Node's built-ins alone" (line 39) — Task 8.3
- `.claude/Guidelines/Editor-Internals.md` — gains the landing annotation rule — Task 8.3
- `.claude/FrameworkPM.md` — the retired logs' pointer; the baseline sentence — Task 10.3
- `.claude/ContextPM.md` — Current Focus; Recent Work — Task 10.3
- `.claude/Planning/Sync-Scaffolding-V2 — Decision Log.md` — Standing line; the refined entries; D-2's line citation; the `### Sources` entry for the one-file server — Task 10.3
- `Desktop/FileWatch/watcher.ts` — the `atomic: true` comment — Task 2.3
- `Desktop/Store/ddl.ts` — "a version mismatch drops the file" header — Task 1.4
- `Core/Sync/Contract/wire.ts` — the canonical-string prose "of the UTF-8 request body" — Task 4.2
- `Core/Session/pageDetailCache.ts` — "every host keyed on it remounts" — Task 8.3
- `Core/MarkdownPM/MarkdownEditor.tsx` — "initialBody is the seed, not a live binding" — Task 8.3
- `Core/Session/saveScheduler.ts` — `cancelPageSave`'s comment and the unconditional requeue — Task 8.2
- `Core/Trash/bundle.ts` — "the `.trash` destination is unwatched" — Task 2.3
- `.claude/CLAUDE.md` — the `Sync/` Hard Rule wording, the structure tree's two `Sync` lines, the Concurrency Locked Decision wording — Nathan's own edits, listed in the report
- `.claude/HistoryPM.md` — PM-138 || Sync Scaffolding - Part 2

#### Report & Closure

Written by the orchestrator once the chain above is confirmed, in the shape the skill defines: the feature, phase by phase, verification (phase review, neutral verification, final pass, reconciliation, the user's own pass listing the Task 10.2 table and the CLAUDE.md edits), Deviations, Open Items, the diff with lines and run time, and a closing stance.

### Open Items

- The Biome exclusion (Rulings) — taken as yes at ratification: the run is unattended, the gate is red without it, and Task 1.1 ships it; Nathan may reverse it in the morning.

### Deviations

Session one (09-14-2026, Phases 0–5) — every ruling below was written in chat as it was made.

- **Agents:** one Opus agent per phase instead of one per task; no Fable subagents (Nathan's instruction). Nathan edited the neutral verifier to Opus in the plan himself.
- **Comments:** none added unless the code cannot say it (Nathan's instruction mid-run); the comment rewrites Tasks 2.3 named in `bundle.ts` and `watcher.ts` became deletions, and every comment Phases 1–2 had added was purged in `12b567b33`.
- **Documentation:** `.claude/**/*.md` edits accumulate uncommitted and land in one commit at the session's end; code comments land with their task.
- **Trash manifest:** a bundle from a folder the user excluded is refused by the manifest (`!isExcluded` on the `.trash` branch); the temp-suffix rule stays sibling-gated per spec.
- **Info record:** creating it requires `owner`; `META.info` stays `reader` for reads.
- **Capture rows** are keyed `(nexus_id, path, sha256)` in the final DDL directly — no schema 3, since no store outside tonight's scratch dirs reached schema 2. A capture's retention clock is its arrival time; a bulk history upload is retained `historyDays` from upload — Nathan's call whether a client-supplied timestamp should travel.
- **Unknown signer → 401** on the hub; 404 is reserved for a known device without membership, so `sync:state` forgets keys only on a real revoke.
- **Approve/revoke order:** the key work (wrap or rotate, ring append) lands before the roster change, so a failed hand-off leaves the row and its button intact.
- **`SyncStatus.reason` gained `'server'`** for hub refusals; a pending device stores no password (nothing to prove it against).
- **`waitMs` clamps** to 25 000 rather than refusing above it; `historyDays < 1` refused.
- **Task 1.4's FILES omitted `Core/Testing/contracts.test.ts`**, which the task body names; Task 4.3's omitted `Sync/feed.ts` (landed in 4.4).
- **Two VERIFY literals** read differently from the plan: Task 5.1's import grep matches the test file and a wrapped import (source-only form → 0); Task 5.2's `grep -c` of the password refusals → 2 lines carrying 3 matches.
- **Phase 4 exposes to the client:** an over-cap or unauthorized PUT is reset mid-stream (`connection: close` after the 413/404), and `change` rows are never swept so a cursor below head never answers `resync` while the blobs it names may be gone — Task 7.3's pull loop must treat a 404 blob as a resync trigger.

Session two (09-14-2026, Phases 6–10) — every ruling below was written in chat as it was made.

- **A change missing its `record` (write) or `from` (rename) throws** in Arrival rather than skipping: both are optional in `wire.ts` and mandatory by protocol, and a silent skip would hide a push-side bug.
- **`landDelete` and `landRename` take no `host`:** neither reads the device nor pushes, and an unused parameter fails the lint gate; Task 7.2 and 7.3's call sites use the two-argument form.
- **`landRename` moves every base row under `${from}/` unconditionally** — no row ever sits under a file path, so a directory check changes nothing.
- **One path → `TileHostRef` resolver:** `tileHostAt` in `watchPatch.ts` serves both the watcher's tiles arm and a landing's `tiles:changed` push; Task 6.3's "export `findSpace`" produced a second writer that had already drifted on depth, so `findSpace` stays unexported.
- **`mergeKeys` treats an absent base key as `{}`** for the recursion: `personalization`, `order`, and `navigation` are created lazily, so the plan's "all three are plain objects" gate dropped one side's whole sub-object when both devices first wrote the key after the base was recorded.
- **Task 6.1 and 6.2 commits are not gate-clean in isolation** (formatting and one test narrowing error, repaired inside Task 6.3's commit); HEAD is clean and history was not rewritten. Later executors run typecheck and lint before each commit.
- **Phase 6 smoke launch** ran over CDP on a scratch copy of NexusOS with built output: tree of 208 pages, a page opened, an edit saved to disk, clean quit.
- **A blob stays sealed under the path it was written at:** `itemAad` binds the NFC path, so the hub's rename keeps the item's record unchanged instead of rewriting `record.path`; `record.path` is the AAD path for every decrypt and `change.path` is where the file lives. The alternative, re-sealing every file under a renamed folder, costs one upload per file per rename, and chained renames make the `from` path unusable. `Sync/Store/log.ts` and `Sync/items.test.ts` are outside Task 7's FILES.
- **A `rename` whose source is absent locally lands as a write** of its record's blob after the base rows move; a device that never held the source otherwise never receives the file.
- **`Pushes['sync:changed']` landed in Task 7.2** with `status.ts`, which pushes it; `bridge.ts` is a 7.2 FILES omission. The count reads 120 after 7.2 and 121 after 7.4.
- **A null blob in `pullOnce` answers `resync`;** in `resolveStale` and `reconcile` it is an error status, never a re-entry into `reconcile`.
- **The long poll waits outside the chain;** only applying a reply runs under it, so a push queued during the 25 s wait runs at once (the plan's shape held the chain for the whole wait and would have missed the five-second target). A thrown pull is an error with backoff; a landing under an unknown key fetches `/info` and reloads the ring once.
- **A write over a delete head resurrects with `base: null`**, since the hub treats a non-null base over a tombstoned item as stale; the plan's `base: head.seq` recursed forever.
- **A snapshot's `mtimeMs` is floored** at `readSnapshot`: the hub's record validator requires an integer and macOS stat reports fractional milliseconds for app-written files, which answered 400 for whole batches on the first two-instance run.
- **A session starting over existing base rows sweeps every local path and base row through `pushDirty`**, which skips a path whose floored mtime and size match its base row before reading it; the plan's `[...dirtyPending()]` is empty at start, so an edit made while the app was closed never pushed.
- **A landing over a path in `failed` answers `error` and keeps the cursor;** `session === self` guards the apply, `settled`, `working`, and the retry handle; `stopSession(ctx)` always pushes `off` and runs before the store swap in `openNexusSequence`; the over-cap and non-NFC notices are error statuses without a `failed` entry; a 400 on `store` never requeues its batch.
- **Merged JSON bytes land under the current time**, not the writer's mtime, so the stat short-circuit cannot mistake a merge for the remote; a bind to a different address and a disconnect delete every base row; `pushRename` ends with a `pushDirty` of the destination; a rename the hub never answered fails both paths.
- **`CallOutcome` is a partial union** (`status: 200` carries `reply`, `status: 0` carries `error`, the rest an optional `refusal`), and its doc comment is gone; `installTap` takes no `nexusId` (`manifestAdmits` is one-argument); `.unref()` and the `loop` variable are gone; `LONG_POLL_MS` lives in `pull.ts`.
- **Three VERIFY literals** read differently from the plan: Task 7.2's `grep -c "binding.address"` → 2 (two non-call sites), Task 7.3's `grep -c "writeValue('sync'"` → 1 (`advance` is the one writer); Task 7.1–7.4 test names carry two deliberate renames and several additions.
- **`Core/Testing/syncHub.ts`** is the one route-level fake hub every client suite shares, a port of the hub's `apply` with its record validation; a FILES omission across 7.2–7.4.
- **Two-instance check (Task 7.4):** hub on a scratch data dir, two built instances on scratch userData over scratch copies of NexusOS; bind A with a password, bind B pending, approve B from A, B `syncing` within 5 s, a page created on A on B's disk in **2.8 s**, both `idle` after; observed twice, at `730cdf847` and `3adc7afd4`.
- **`pages:changed` is pushed before `values:changed`** in the watcher's settle, since the `values:changed` handler evicts the detail a landing merges against; `absorb` asks `notifyLanding` before `readPageDetail` for the same reason.
- **The landing dispatch is diff-minimal** (`changesTo` in `merge3.ts`, the one importer of the merge library) rather than a whole-span replace, which would have mapped every caret to the end of the insert; the caret keeps its logical position, shifting by the length of any insertion before it. `local` is read after the fetch and the base before it; touching hunks count as an overlap.
- **`Ack` stays `{ ok: boolean }`** on the shared body writer; stale routing lives in the save closure.
- **The body base lives as long as the open page:** a cache refresh and the LRU cap never delete it; `replaceBody` re-seats it from the fetched detail; a cached detail seats it whenever no editor is mounted on the path; a landing drops the detail alone before its fetch. The plan's "every eviction that deletes from `detailByPath` deletes from `baseByPath` too" evicted the base on the page's own save (`values:changed` → `dropDetailsWhere`), so the next landing merged with no base and the next save adopted disk as its base.
- **A save never fetches a base:** it sends what it holds (an empty hash when none), and a refusal routes to the merge; the plan's fetch inside the closure could not complete during a `beforeunload` flush. A landing with no base is a conflict — the buffer is captured, then the remote text lands — and the merged text is re-saved whenever it differs from disk, so local-only text reaches disk even when the dispatch is a no-op.
- **A captured body without a frontmatter envelope resolves its page id from the live tree**, so a merge-lost buffer reaches File History; the body-only `sync:captureLocal` text has no `ID` key. With File History off, a conflict's losing buffer sits in the `captures` table alone, which no surface reads — Nathan's call whether a reader is due.
- **`setBodyBase` no longer patches the cached detail's `bodyHash`** (no reader); `absorbLanding` reads the store through `useSession.getState()`; `subscribeLanding`'s map is not cleared by `clearCache`, since a Nexus swap must not detach a mounted editor.
- **`Desktop/FileWatch/watcher.test.ts`** asserts the push sequence and is a Task 8.1 FILES omission; `Core/Session/navigationSlice.ts` and `Core/Session/useBridgeSubscriptions.test.tsx` (new) are Task 8.3 omissions.
- **Comment deletions** named by Tasks 8.2 and 8.3 (`cancelPageSave`, the write-through comment, "every host keyed on it remounts", "initialBody is the seed") landed in the 8.3 commit through an amend of the tip.
- **Task 8.3's console check** is Nathan's manual check (he is present this session); the file-level behavior is proven by the two-instance rig and the suites.
- **Task 9.1's smoke check** is Nathan's manual check, as 8.3's was; its numbered design decisions were written in chat before the rows were built, and the `Dependencies.md` and `Editor-Internals.md` entries for the merge library and the landing transaction (Phase 8 omissions) ride in its documents commit.
