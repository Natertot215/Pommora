## Sync Groundwork — Implementation Plan

> **Status:** Closed 09-11-2026 · [[NexusSyncPM]] describes what stands.

### Context

This plan implements [[Sync Groundwork — Decision Log]] (converged 09-10-2026, every decision `[confirmed]`): the identity groundwork Pommora Sync and the mobile companion need regardless of their final shape. It touches `Desktop/Config` and `Desktop/main.ts` (the device key, its secret store, the two new host members), `Core/Contract` (two `HostContext` members, six bridge channels), a new `Core/Sync/` (the wire types, the canonical signing string, the client, the handlers), a new `Sync/server.ts` (the initial server with four verbs), `Core/Settings` (the Nexus heading in General), the gates that gain `Sync/`, and the documents the arc makes false.

It leaves alone the phone, content sync, the change feed, encryption of content and the Nexus password, Docker, TLS, deployment, Windows path handling ([[Cross-Platform Compatibility Checklist]]), aliases, the per-device settings file, and relocating the databases. The Mobile plan stays unratified and unrewritten beyond a Standing pointer.

### Summary

Every Pommora install gets a key of its own at first launch. The key's fingerprint is the device's id, its public half and a name sit in the app's own config, and its private half sits in the OS keychain. A small server, one Node file run on the Mac, keeps a list of which devices belong to which Nexus: a device connects, appears pending, is approved from an already-approved device, and can be revoked. Every request the app makes is signed by the device key, so the server needs no passwords and no accounts.

Settings › General gains a Nexus heading that shows this device, the Nexus id, the server the Nexus is bound to, and the device list with Approve and Revoke. The proof is two instances of the app on one Mac holding one Nexus id: the first connects and is approved by construction, the second connects, is approved from the first, then revoked, and every state survives restarts. The sync arc later adds content to the same server and the same identities.

#### Constraints

- Gates, from the repo root with `set -o pipefail`: `npm run typecheck` (exits 0; after Phase 1 it covers six projects) · `npm run test` (Vitest; output ends in a passed count with no failures) · `npm run lint` (`biome check .` plus the comment hook; read the output, since warnings exit 0) · `npm run build` (exits 0). Never pipe the final command through `tail`.
- Formatting is Biome's through the PostToolUse hook; a shell-driven edit runs `npm run format` afterward. Comments are full-line `//` only, reserved for what the code can't say.
- **Core stays string-only in this arc:** `Core/Sync/` never handles key bytes, never base64-encodes, and never hashes anything but text through `machine().sha256Hex`. This is a review rule; no gate enforces it.
- **`Core/Sync/contract.ts` imports nothing and exports only types.** `Core/package.json` stays without `"type": "module"`; that is the mechanism by which `tsc -p Sync` refuses a value import from Core (TS1287 under `verbatimModuleSyntax`).
- **`Sync/server.ts` imports only `node:*` built-ins and `import type` from `@pommora/core/Sync/contract`.** No library enters any workspace; `package.json` dependency blocks do not change.
- `Core/Contract/engineGraph.test.ts` and `Desktop/hostGraph.test.ts` stay green: `Core/Sync/` reaches nothing outside `ulidx`, `yaml`, `zod` and imports no `.tsx`. No engine-reachable file imports `.json`; the walker would not catch it, so this is a review rule.
- `HostContext` gains exactly two members, `device` and `transport`; every other member keeps its shape. The `Result` envelope is applied in handlers, never inside host members.
- The device's private key never leaves `Desktop/`. Desktop signs; Core receives a base64url signature string.
- The Nexus heading is designed headlessly: Nathan cannot oversee it, so before Task 5.1 the executing session reads the brief in Phase 5's preamble, sweeps `UIX/` and `Core/Settings/` for the existing rows and controls, writes the design as a numbered list of decisions in-chat, and proceeds. The surface is minimally functional; it composes existing kit and adds no UIX kind.
- Placeholders are blank: an unbound or failed heading state shows no build or meta text.
- Every task's documentation rewrite lands in that task's commit, under the replace rule: change the sentence, never append an amendment.
- Every commit is scoped with `git commit --only -- <paths>` (new files `git add`ed first), since parallel sessions share one git index; each phase commits only its own FILES.
- Tasks are dispatched to background Opus agents, one tree-touching writer at a time (Development-Environment's rule), so phases run in sequence. Each gate runs the simplification review before the build-breaking review, both dual-briefed to flag bugs; gate agents are pre-approved by this plan's ratification. One smoke launch per gate that touched runtime code (Phases 2, 4, 5, 6); when Nathan is present, a numbered manual check list replaces it.
- Never delete: `Desktop/Web/linkTitles.ts` (the transport does not replace it), `Desktop/Bridge/ipc.test.ts`'s empty `HostContext` cast, any `local_state` scope, the Nexus Config Relocation arc's uncommitted files.

#### Baseline

Recorded at ratification on 09-10-2026.

- Gates: green at `2f5f20836` (typecheck exit 0; 364 files, 4415 tests passed), observed 09-10-2026 after the Nexus Config Relocation arc landed.
- `git ls-files Sync | wc -l` → 2 — becomes 5 (`package.json`, `tsconfig.json`, `vitest.config.ts`, `server.ts`, `server.test.ts`)
- `ls Core/Sync 2>/dev/null | wc -l` → 0 — becomes 8 (`contract.ts`, `authority.ts`, `authority.test.ts`, `vectors.json`, `client.ts`, `client.test.ts`, `handlers.ts`, `handlers.test.ts`)
- `grep -c "^  '" Core/Contract/bridge.ts` → 110 — becomes 116
- `grep -o "tsc -p" package.json | wc -l` → 5 — becomes 6
- `grep -c "case '" Core/Settings/SettingsWindow.tsx` → 9 — becomes 10
- `ls .claude/Features | wc -l` → 19 — becomes 20

**START:** 2026-09-11T02:14:28Z
**END:** 2026-09-11T06:11:37Z

#### Implementation Process

- [x] **Phase 1** — Workspace And Protocol
  - [x] Task 1.1 — `Sync/` wiring and gates
  - [x] Task 1.2 — `Core/Sync/contract.ts`
  - [x] Task 1.3 — `Core/Sync/authority.ts` and the test vectors
  - [x] Task 1.4 — Guideline and rule rewrites
  - [x] Review Checkpoint
- [x] **Phase 2** — Desktop Identity
  - [x] Task 2.1 — The secret store
  - [x] Task 2.2 — The device field in `pommora.json`
  - [x] Task 2.3 — The host device and transport types
  - [x] Task 2.4 — Minting the device
  - [x] Task 2.5 — The transport
  - [x] Task 2.6 — Wiring `main.ts`
  - [x] Review Checkpoint
- [x] **Phase 3** — The Initial Server
  - [x] Task 3.1 — `Sync/server.ts`
  - [x] Task 3.2 — `Sync/server.test.ts`
  - [x] Review Checkpoint
- [x] **Phase 4** — Client And Channels
  - [x] Task 4.1 — The client
  - [x] Task 4.2 — The handlers, the channels, the scope
  - [x] Review Checkpoint
- [x] `[Design pass: the session designs the Nexus heading from the brief in Phase 5's preamble, discloses its decisions in-chat, and proceeds]`
- [x] **Phase 5** — The Nexus Heading
  - [x] Task 5.1 — The `nexus` row kind
  - [x] Task 5.2 — `NexusRows`
  - [x] Review Checkpoint
- [x] **Phase 6** — Proof And Reconciliation
  - [x] Task 6.1 — The end-to-end proof
  - [x] Task 6.2 — `NexusSyncPM` and the sync claims
  - [x] Task 6.3 — The Mobile log and the closeout documents
  - [x] Review Checkpoint

### Phase 1 — Workspace And Protocol

**GOAL:** `Sync/` becomes a real workspace under every gate, and Core gains the type-only wire contract plus the executable canonical-string builder, proven by a fixture both later suites assert. Every later phase imports from this one, so it runs first and alone.

#### Task 1.1

**TASK:** Turn the `Sync/` stub into a gated workspace: module format, a `nodenext` tsconfig whose flags make type stripping and the type-only rule compile errors, a Vitest project, and the root scripts.

**FILES:** `Sync/package.json`, `Sync/tsconfig.json`, `Sync/vitest.config.ts`, `package.json`

**DEPENDENCIES:** Tasks 3.1 and 3.2 typecheck and test under this configuration; Task 3.2 adds the project to the root Vitest list once tests exist, so no empty project is ever run.

**NOW**

```json
// Sync/package.json
{ "name": "@pommora/sync", "private": true }
```

```json
// Sync/tsconfig.json
{ "compilerOptions": { "module": "ESNext", "moduleResolution": "Bundler", "target": "ES2022", "lib": ["ES2022"], "strict": true, "noEmit": true, "types": [] }, "include": ["**/*"], "exclude": ["node_modules"] }
```

`package.json` `"typecheck"` lists five `tsc -p` projects. No `Sync/vitest.config.ts` exists.

**CHANGE**

- [x] `Sync/package.json` gains `"type": "module"`.
- [x] `Sync/tsconfig.json` becomes: `module` and `moduleResolution` `"nodenext"`, `target` and `lib` `ES2024`, `strict`, `noEmit`, `types: ["node"]`, `erasableSyntaxOnly: true`, `verbatimModuleSyntax: true`, `allowImportingTsExtensions: true`, `skipLibCheck: true`; `include` and `exclude` unchanged.
- [x] Create `Sync/vitest.config.ts` as `defineProject({ test: { environment: 'node' } })` from `vitest/config`, with no setup file and no `ssr.noExternal`.
- [x] Root `package.json`: append ` && tsc -p Sync` to `"typecheck"`; add `"sync": "node Sync/server.ts"` to scripts.

**AFTER**

```json
// Sync/package.json
{ "name": "@pommora/sync", "private": true, "type": "module" }
```

`npm run typecheck` runs six projects; `npm run sync` starts the server from the root once Task 3.1 exists.

**VERIFY**

- [x] `grep -o "tsc -p" package.json | wc -l` → 6.
- [x] With `Sync/vitest.config.ts` in place, `npx tsc -p Sync` exits 0 (an empty workspace reports TS18003, so this runs after the file exists).
- [x] `npm run test` is unchanged by this task.

#### Task 1.2

**TASK:** Write the type-only wire contract: the device record, the four routes with their bodies and replies, the heading's state types, and the two recipes as prose.

**FILES:** `Core/Sync/contract.ts`

**DEPENDENCIES:** Tasks 1.3, 3.1, 4.1, 4.2, 5.2 import these types.

**NOW**

`Core/Sync/` does not exist.

**CHANGE**

- [x] Create `Core/Sync/contract.ts` with no import statement. Export only types:
  - `SyncDevice { id: string; publicKey: string; name: string }` and `DeviceRecord = SyncDevice & { approved: boolean }`; this is the one spelling of a device, which `Desktop/Config/appConfig.ts` and `Core/Contract/handlers.ts` import as a type.
  - `ConnectBody { nexusId: string; publicKey: string; name: string }`, `ConnectReply { approved: boolean }`
  - `NexusBody { nexusId: string }`, `DeviceBody { nexusId: string; deviceId: string }`, `DevicesReply { devices: DeviceRecord[] }`
  - `RouteTable` mapping `connect` → `{ method: 'POST'; path: '/connect'; body: ConnectBody; reply: ConnectReply }`, `devices` → `{ method: 'POST'; path: '/devices'; body: NexusBody; reply: DevicesReply }`, `approve` and `revoke` → `{ method: 'POST'; path: '/approve' | '/revoke'; body: DeviceBody; reply: DevicesReply }`.
  - `SyncBinding = { address: string } & ({ state: 'approved'; devices: DeviceRecord[] } | { state: 'pending' } | { state: 'unreachable'; why: string })`, `SyncState { device: SyncDevice; binding: SyncBinding | null }`.
  - `SignedHeaders { 'x-pommora-device': string; 'x-pommora-timestamp': string; 'x-pommora-signature': string }`, which Task 4.1 types its headers with.
- [x] Two `//` comment blocks state the recipes in full: the device id is the lowercase hex SHA-256 of the 32 raw Ed25519 public-key bytes, the public key travels as unpadded base64url (43 characters); the canonical string is the uppercased method, the path, the lowercase hex SHA-256 of the UTF-8 request body (of the empty string when there is none), and the integer millisecond timestamp, joined by `\n`; the signature is Ed25519 over the UTF-8 canonical string, base64url; the server refuses a timestamp more than five minutes from its clock.

**AFTER**

A file of interfaces and type aliases with two comment blocks, no `import`, no `export const`, no `export function`.

**VERIFY**

- [x] `grep -c "^import\|export const\|export function\|export class" Core/Sync/contract.ts` → 0.
- [x] `npm run typecheck` exits 0.
- [x] A scratch `Sync/x.ts` containing `import type { RouteTable } from '@pommora/core/Sync/contract'` and a `const r: RouteTable['connect']['path'] = '/connect'` typechecks under `npx tsc -p Sync`; the same file with `import { ok } from '@pommora/core/Contract/result'` reports TS1287 on Core's file, which is the gate F-1 rests on. Delete the scratch file; `git status --porcelain Sync` shows nothing unexpected.

#### Task 1.3

**TASK:** Write Core's executable half of the protocol, the canonical-string builder and the route paths, with a JSON fixture of test vectors both suites assert.

**FILES:** `Core/Sync/authority.ts`, `Core/Sync/authority.test.ts`, `Core/Sync/vectors.json`

**DEPENDENCIES:** Task 3.2 reads `vectors.json` from disk; Task 4.1 imports `authority.ts`.

**NOW**

Nothing. `Core/Testing/machines.ts` implements `sha256Hex` as UTF-8 SHA-256 hex, identical to `Desktop/Platform/nodeMachine.ts`.

**CHANGE**

- [x] Create `Core/Sync/authority.ts`:
  - `export const ROUTES = { connect: { method: 'POST', path: '/connect' }, devices: { method: 'POST', path: '/devices' }, approve: { method: 'POST', path: '/approve' }, revoke: { method: 'POST', path: '/revoke' } } as const satisfies { [K in keyof RouteTable]: Pick<RouteTable[K], 'method' | 'path'> }` with `import type { RouteTable } from './contract'`.
  - `export function canonicalString(method: string, path: string, bodySha256Hex: string, timestampMs: number): string` returning the four parts joined by `\n`, method uppercased, timestamp as `String(timestampMs)`.
- [x] Create `Core/Sync/vectors.json` as `{ "canonical": [...] }`: three entries of `{ method, path, body, timestampMs, bodySha256, canonical }` (an empty body, a JSON body with non-ASCII text, a body with a newline), each `bodySha256` and `canonical` computed once with `node -e` using `createHash('sha256').update(body, 'utf8')` and pinned.
- [x] Create `Core/Sync/authority.test.ts`: imports `vectors.json` and for each entry asserts `canonicalString(method, path, bodySha256, timestampMs) === canonical`; asserts `ROUTES.connect.path === '/connect'`. The ambient disk machine from `Core/vitest.setup.ts` is enough; nothing here hashes.

**AFTER**

`authority.ts` exports `ROUTES` and `canonicalString` and imports only `../contract` types. The fixture is imported by this test alone.

**VERIFY**

- [x] `npx vitest run Core/Sync` → 1 file, all tests passed.
- [x] `npm run test` green, including `Core/Contract/engineGraph.test.ts` (the fixture is reachable from no engine file).
- [x] Revert `canonicalString`'s join separator to `','` in a scratch edit: the test goes red; restore it.
- [x] Check the work for unnecessary code: no helper beyond the two exports.

#### Task 1.4

**TASK:** Rewrite the rule and guideline sentences this phase makes false: the first Hard Rule, the Desktop line in the structure tree, `Core/Sync` in the tree, the gate count, Core's module format, and the Server heading in Dependencies.

**FILES:** `.claude/CLAUDE.md`, `.claude/Guidelines/Development-Environment.md`, `.claude/Guidelines/Dependencies.md`

**NOW**

- CLAUDE.md Hard Rules: "**The host owns the machine.** Core reaches it only through `Core/Platform`; Desktop's implementation is the only place Node and Electron are called; UIX reaches nothing outside itself."
- CLAUDE.md structure tree: `// Desktop | • The Electron host — the only caller of Node`; no `Sync` line under Core.
- Development-Environment: "Core's own format is unconstrained: it is only ever bundled." and "covering all four tsconfig projects".
- Dependencies: no Server heading; `node:sqlite` described as shipping "inside Electron's own Node".

**CHANGE**

- [x] Hard Rule: "**The host owns the machine.** Core reaches it only through `Core/Platform`; Desktop's implementation is the only place the app calls Node and Electron; `Sync/` is a separate process on Node's built-ins alone; UIX reaches nothing outside itself."
- [x] Tree: `// Desktop | • The Electron host — the app's only caller of Node`; insert `├── // Sync | • The wire contract, the signing string, and the device client` between `Settings` and `Testing` under Core.
- [x] Development-Environment: replace the Core-format sentence with "Core stays CommonJS-format under `nodenext`: that is what makes a value import from `Sync/` a compile error, so `Core/package.json` never gains `type: module`." Replace "all four tsconfig projects" with "all six tsconfig projects".
- [x] Dependencies: add `### Server` after the Libraries list: "`Sync/server.ts` runs on Node's built-ins alone (`node:http`, `node:sqlite`, `node:crypto`), as plain `node` over the source with type stripping. No library enters it; a need that seems to want one is a design question first." Amend the `node:sqlite` entry so it names both hosts: "Ships inside Electron's own Node and in Node 24 for the server".

**AFTER**

Each sentence reads as if the arc had always been so; no "now", "previously", or "as of".

**VERIFY**

- [x] `grep -n "the only caller of Node\|only place Node" .claude/CLAUDE.md` → 0 lines.
- [x] `grep -n "unconstrained\|four tsconfig" .claude/Guidelines/Development-Environment.md` → 0 lines.
- [x] `grep -n "### Server" .claude/Guidelines/Dependencies.md` → 1 line.

#### Review Checkpoint

- [x] All four gates green from the root with `Sync` in typecheck (it enters test with Task 3.2).
- [x] The two scratch-file probes (TS1287 on a value import from Core, a type import resolving) each behaved as stated, and no scratch file remains.
- [x] `Core/Sync/contract.ts` has zero imports; `Core/Sync/authority.ts` imports only `../contract`.

### Phase 2 — Desktop Identity

**GOAL:** Desktop mints the device key once, holds the private half in the keychain and the public half in `pommora.json`, and exposes the device and an HTTP transport as two `HostContext` members.

#### Task 2.1

**TASK:** The secret store: one JSON file beside `pommora.json` holding `safeStorage`-encrypted values, with get and set by name.

**FILES:** `Desktop/Config/secrets.ts`, `Desktop/Config/secrets.test.ts`

**DEPENDENCIES:** Task 2.4 calls it.

**NOW**

`Desktop/Config/appConfig.ts` reads through `readJsonObject` and writes through `rmwJsonStrict` from `@pommora/core/Files/atomicWrite`, taking `userDataDir` as its first parameter and importing no Electron. No `safeStorage` reference exists in the repo.

**CHANGE**

- [x] Create `Desktop/Config/secrets.ts` importing `safeStorage` from `'electron'` and the two helpers from `@pommora/core/Files/atomicWrite`. `const FILE = 'secrets.json'`; `secretsPath(userDataDir)`.
  - `export async function getSecret(userDataDir: string, name: string): Promise<string | null>`: read the object; if absent or `name` missing return null; `safeStorage.decryptString(Buffer.from(value, 'base64'))`; a decrypt throw returns null.
  - `export async function setSecret(userDataDir, name, plain: string): Promise<void>`: refuse with a thrown Error when `!safeStorage.isEncryptionAvailable()`; `rmwJsonStrict` merging `{ [name]: safeStorage.encryptString(plain).toString('base64') }` over the current object; an unreadable file throws as `updateAppConfig` does.
- [x] Create `secrets.test.ts` mocking `'electron'` as `Desktop/Bridge/ipc.test.ts` does, with `safeStorage` faked as `isEncryptionAvailable: () => true`, `encryptString: (s) => Buffer.from(`enc:${s}`)`, `decryptString: (b) => b.toString().slice(4)`. Tests: set then get round-trips; get of a missing name is null; set of a second name leaves the first; set throws when availability is false.

**AFTER**

Two exported functions, one file, no class. `secrets.json` is `Record<string, string>` of base64 ciphertext.

**VERIFY**

- [x] `npx vitest run Desktop/Config/secrets` → all passed.
- [x] `grep -rn "safeStorage" Desktop --include='*.ts' | grep -v test | wc -l` → the count of references in `secrets.ts` only.
- [x] No injected encrypt/decrypt abstraction: `grep -n "interface\|type .*Crypt" Desktop/Config/secrets.ts` → 0.

#### Task 2.2

**TASK:** `AppConfig` gains the `device` field and `readAppConfig` narrows it.

**FILES:** `Desktop/Config/appConfig.ts`, `Desktop/Config/appConfig.test.ts`

**DEPENDENCIES:** Task 2.4 reads and writes the field.

**NOW**

```ts
interface AppConfig {
  lastNexusPath?: string
  recents?: string[]
  trashMode?: TrashMode
}
```

`readAppConfig` rebuilds the object from three typed ternaries; `updateAppConfig` spreads the raw object first so unknown keys survive.

**CHANGE**

- [x] `import type { SyncDevice } from '@pommora/core/Sync/contract'`; add `device?: SyncDevice` to `AppConfig`; export `AppConfig`.
- [x] In `readAppConfig`, add a local `readDevice(v: unknown): SyncDevice | undefined` that accepts an object whose three fields are non-empty strings and returns undefined otherwise; `device: readDevice(obj.device)`.
- [x] Tests: a config with a well-formed `device` reads it back; a `device` missing `publicKey` reads as undefined; `updateAppConfig` writing `device` keeps `trashMode` and an unknown top-level key.

**AFTER**

```ts
export interface AppConfig {
  lastNexusPath?: string
  recents?: string[]
  trashMode?: TrashMode
  device?: SyncDevice
}
```

**VERIFY**

- [x] `npx vitest run Desktop/Config/appConfig` → all passed, three new tests among them.
- [x] `appConfig.ts` still imports nothing from `electron` (`grep -c "from 'electron'" Desktop/Config/appConfig.ts` → 0).

#### Task 2.3

**TASK:** Declare the host device and transport types beside `HostContext` in their own green commit; the two members themselves land with Task 2.6.

**FILES:** `Core/Contract/handlers.ts`

**DEPENDENCIES:** Tasks 2.4 and 2.5 import the types; Task 2.6 adds the members. `Desktop/Bridge/ipc.test.ts`'s empty cast needs no change.

**NOW**

```ts
export interface HostContext {
  push<K extends keyof Pushes>(k: K, payload: Pushes[K]): void
  …
  fetchTitle(url: string): Promise<string | null>
  openStores(root: string): void
  adopted(root: string, path: string): Promise<void>
  watch(root: string): Promise<void>
  applyZoom(): Promise<void>
}
```

**CHANGE**

- [x] Above the interface add, with `import type { SyncDevice } from '../Sync/contract'`:
  - `export interface HostDevice extends SyncDevice { sign(canonical: string): Promise<string>; rename(name: string): Promise<void> }`
  - `export interface TransportRequest { url: string; method: string; headers: Record<string, string>; body?: string }`
  - `export interface TransportReply { status: number; body: string }`
- [x] Commit this alone; typecheck is green since nothing consumes the types yet. The two members, `device: HostDevice | null` (null when the keychain refused at mint, so the app still launches) and `transport(req: TransportRequest): Promise<TransportReply>`, are added after `fetchTitle` in Task 2.6's commit together with `main.ts`.

**AFTER**

`HostDevice`, `TransportRequest`, `TransportReply` exported from the same file; `HostContext` unchanged until Task 2.6.

**VERIFY**

- [x] `npm run typecheck` exits 0 at this commit.
- [x] `grep -c "HostContext" Desktop/Bridge/ipc.test.ts` unchanged.

#### Task 2.4

**TASK:** Mint the device once per install: an Ed25519 key through WebCrypto, the public half and fingerprint and hostname into `pommora.json`, the PKCS8 private half into the secret store, and a `HostDevice` that signs and renames.

**FILES:** `Desktop/Config/device.ts`, `Desktop/Config/device.test.ts`

**DEPENDENCIES:** Tasks 2.1, 2.2, 2.3. Task 2.6 calls `ensureDevice`.

**NOW**

Nothing. Verified by probe under `Desktop/tsconfig.node.json`: `globalThis.crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify'])` with the bare string form; every `crypto.subtle` call is spelled `globalThis.crypto.subtle` and `'privateKey' in pair` narrowing typechecks; the `{ name: 'Ed25519' }` object form does not. Raw public key 32 bytes, PKCS8 48 bytes, signature 64 bytes.

**CHANGE**

- [x] Create `Desktop/Config/device.ts` importing `hostname` from `node:os`, `readAppConfig`/`updateAppConfig` from `./appConfig`, `SyncDevice` type from `@pommora/core/Sync/contract`, `getSecret`/`setSecret` from `./secrets`, and `HostDevice` type from `@pommora/core/Contract/handlers`. `const SECRET = 'device-key'`.
  - `fingerprintOf(raw: ArrayBuffer): Promise<string>`: `globalThis.crypto.subtle.digest('SHA-256', raw)` → lowercase hex.
  - `mint(userDataDir)`: generate the pair; `raw = exportKey('raw', publicKey)`; `publicKey = Buffer.from(raw).toString('base64url')`; `id = await fingerprintOf(raw)`; `pkcs8 = exportKey('pkcs8', privateKey)`; `await setSecret(userDataDir, SECRET, Buffer.from(pkcs8).toString('base64'))`; `await updateAppConfig(userDataDir, () => ({ device: { id, publicKey, name: hostname() } }))`; return the config and the private `CryptoKey`.
  - `load(userDataDir, config: SyncDevice)`: `getSecret`; null → return null; `importKey('pkcs8', new Uint8Array(Buffer.from(secret, 'base64')), 'Ed25519', false, ['sign'])` (a bare `Buffer` fails the `BufferSource` overload under Desktop's tsconfig).
  - `export async function ensureDevice(userDataDir: string): Promise<HostDevice>`: read config; if `config.device` and `load` succeeds use them; if `config.device` exists but `load` returns null, `console.error('Device key missing from the secret store; minting a new identity')` and mint; if no `config.device`, mint. Build the `HostDevice` over module-free closure state: `sign(canonical)` = `Buffer.from(await globalThis.crypto.subtle.sign('Ed25519', key, new TextEncoder().encode(canonical))).toString('base64url')`; `rename(name)` = `updateAppConfig(userDataDir, () => ({ device: { ...current, name } }))` then updates the closure's `name`; `id`, `publicKey`, `name` as getters over that state.
- [x] `device.test.ts` (mocking `'electron'` as Task 2.1's test does): first call mints and writes both files; a second call on the same dir returns the same id and public key; `sign` of `'x'` verifies with `node:crypto` `verify(null, Buffer.from('x'), createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x: publicKey }, format: 'jwk' }), Buffer.from(sig, 'base64url'))` → true; `rename` persists; deleting `secrets.json` then calling again yields a different id (the lost-identity path) and the `console.error` is called once.

**AFTER**

One exported function `ensureDevice`; the private key exists only as a non-extractable `CryptoKey` inside the closure after load.

**VERIFY**

- [x] `npx vitest run Desktop/Config/device` → all passed.
- [x] The fingerprint of a generated key matches the recipe: in the test, `createHash('sha256').update(Buffer.from(publicKey, 'base64url')).digest('hex') === id`.
- [x] `grep -n "{ name: 'Ed25519' }" Desktop/Config/device.ts` → 0 (bare string form only).
- [x] Check for unnecessary code: no algorithm fallback to P-256 is written; C-3's fallback is a ruling for a host that lacks Ed25519, and this one has it.

#### Task 2.5

**TASK:** The transport: three lines over Electron's `net.fetch`.

**FILES:** `Desktop/Web/transport.ts`

**DEPENDENCIES:** Task 2.6 wires it.

**NOW**

`Desktop/Web/linkTitles.ts` streams over `net.request` because it aborts mid-body; the transport reads whole small JSON replies and needs none of that.

**CHANGE**

- [x] Create `Desktop/Web/transport.ts`:

```ts
import { net } from 'electron'
import type { TransportReply, TransportRequest } from '@pommora/core/Contract/handlers'

export async function transport(req: TransportRequest): Promise<TransportReply> {
  const r = await net.fetch(req.url, { method: req.method, headers: req.headers, body: req.body })
  return { status: r.status, body: await r.text() }
}
```

**AFTER**

As above. A network failure rejects; the handler layer (Task 4.2) turns that into the `unreachable` state or a failed `Result`.

**VERIFY**

- [x] `npx tsc -p Desktop/tsconfig.node.json` exits 0 at this commit (the types it imports landed in Task 2.3).
- [x] `linkTitles.ts` unchanged: `git diff --stat Desktop/Web/linkTitles.ts` → empty.

#### Task 2.6

**TASK:** Wire `main.ts`: mint the device after `whenReady` and before any Nexus opens, and hand `device` and `transport` to every `hostContext()`.

**FILES:** `Desktop/main.ts`, `Core/Contract/handlers.ts`

**DEPENDENCIES:** Tasks 2.3, 2.4, 2.5.

**NOW**

```ts
app
  .whenReady()
  .then(async () => {
    if (!app.hasSingleInstanceLock()) return
    // No picker here — a launch never blocks; a failed restore degrades to the empty state.
    try {
      const restore = await resolveRestorePath(await readAppConfig(userData()))
      if (restore) await openNexusSequence(hostContext(null), posixPath(restore), true)
    } catch (e) {
      console.error('Restore skipped (config unreadable):', e)
    }
```

`hostContext(win)` is a per-call factory; `fetchTitle: fetchPageTitle` sits among its members.

**CHANGE**

- [x] Module scope: `let device: HostDevice | null = null` beside the other module state; import `ensureDevice` from `./Config/device`, `transport` from `./Web/transport`, `HostDevice` type from `@pommora/core/Contract/handlers`.
- [x] Inside `whenReady().then`, after the single-instance guard and before the restore `try`: `try { device = await ensureDevice(userData()) } catch (e) { console.error('Device identity unavailable:', e) }`.
- [x] `Core/Contract/handlers.ts`: add the two members after `fetchTitle` (Task 2.3's deferred half); in `hostContext`, after `fetchTitle: fetchPageTitle`: `device,` and `transport,`.

**AFTER**

The mint runs once per launch between the lock check and the restore; `hostContext()` returns the live module-level device on every call, so a rename is visible to the next Ask.

**VERIFY**

- [x] `npm run typecheck` exits 0; `npm run test` green; `Desktop/hostGraph.test.ts` green.
- [x] Smoke launch with a scratch `POMMORA_USERDATA`: `pommora.json` gains `device` with a 64-hex `id`, a 43-char `publicKey`, and `name` equal to `hostname`; `secrets.json` exists beside it with one key; a second launch leaves both unchanged (`shasum` before and after).
- [x] Check for obvious mistakes: the mint is inside the ready callback, not at module scope.

#### Review Checkpoint

- [x] Gates green; one smoke launch confirmed the mint and its idempotence.
- [x] `git diff --stat` for the phase shows `Desktop/Config/`, `Desktop/Web/transport.ts`, `Desktop/main.ts`, `Core/Contract/handlers.ts`, and the three `.claude/Features/` documents below, and nothing else.
- [x] Documentation carried in this phase's commits: `Features/DesktopPM.md` §Config names `device.ts`, `secrets.ts` (keychain-backed through `safeStorage`, `secrets.json` beside `pommora.json`), and the two host members; `Features/CorePM.md` `:51`'s `pommora.json` line gains "the device's public key, fingerprint, and name"; `Features/ConfigurationPM.md` §App Configuration's enumeration gains the device fields and the sentence "The device's private key sits in the OS keychain through the same folder's `secrets.json`."

### Phase 3 — The Initial Server

**GOAL:** One Node file on built-ins alone, one SQLite file, four verbs, signature verification, tested in isolation against the shared fixture. Depends on Phase 1 only and follows Phase 2 in sequence.

#### Task 3.1

**TASK:** `Sync/server.ts`: schema, signature verification, the four handlers written `satisfies` the route table, a router, and an exported `start` under an `import.meta.main` guard.

**FILES:** `Sync/server.ts`

**DEPENDENCIES:** Task 1.1's configuration; Task 1.2's types.

**NOW**

`Sync/` holds configuration only. `Desktop/Store/ddl.ts` shows the pattern: one `CREATE TABLE IF NOT EXISTS` block applied on every open, a `meta` table with `schema_version`, `INSERT OR REPLACE` upserts. Verified by probe: `createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x }, format: 'jwk' })` imports a base64url public key with no re-encoding, and `verify(null, data, key, sig)` checks an Ed25519 signature.

**CHANGE**

- [x] Imports: `createServer` from `node:http`, `DatabaseSync` from `node:sqlite`, `createHash`, `createPublicKey`, `verify` from `node:crypto`, `mkdirSync` from `node:fs`, `join` from `node:path`, `homedir` from `node:os`, and `import type { ConnectBody, DeviceBody, DeviceRecord, NexusBody, RouteTable } from '@pommora/core/Sync/contract'`.
- [x] Constants: `PORT = Number(process.env.POMMORA_SYNC_PORT ?? 7473)`, `DATA_DIR = process.env.POMMORA_SYNC_DATA ?? join(homedir(), '.pommora-sync')`, `HOST = '127.0.0.1'`, `BODY_CAP = 8192`, `WINDOW_MS = 5 * 60_000`, `SCHEMA_VERSION = 1`.
- [x] Re-spelled validators (F-1's owned duplication): `ULID = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/`, `PUBLIC_KEY = /^[A-Za-z0-9_-]{43}$/`; `fingerprintOf(publicKey)` = SHA-256 hex of `Buffer.from(publicKey, 'base64url')`; `export function canonical(method, path, rawBody: Buffer, ts)` = the four parts joined by `\n` with `createHash('sha256').update(rawBody).digest('hex')`, exported so Task 3.2 asserts it against the fixture. A `deviceId` is validated as a non-empty string only; a wrong one finds no row.
- [x] `PATHS` re-spelled as `{ connect: '/connect', devices: '/devices', approve: '/approve', revoke: '/revoke' } as const satisfies { [K in keyof RouteTable]: RouteTable[K]['path'] }`; every route is `POST`, checked once in the router.
- [x] DDL: `meta(key TEXT PRIMARY KEY, value TEXT NOT NULL)`, `device(fingerprint TEXT PRIMARY KEY, public_key TEXT NOT NULL, name TEXT NOT NULL)`, `membership(nexus_id TEXT NOT NULL, fingerprint TEXT NOT NULL, approved INTEGER NOT NULL, PRIMARY KEY (nexus_id, fingerprint))`. `openDb(dir)`: `mkdirSync(dir, { recursive: true })`, open `join(dir, 'sync.db')`, `PRAGMA journal_mode = WAL`, apply the DDL, write `schema_version` when absent. Only version 1 exists, so no mismatch branch is written; the file is never dropped.
- [x] `verifySigned(req, rawBody, publicKey)`: read the three headers; refuse (401) a missing header, a non-integer timestamp, or one outside `WINDOW_MS`; `verify(null, Buffer.from(canonical(...)), createPublicKey(jwk), Buffer.from(sig, 'base64url'))` false → 401; a `createPublicKey` throw → 400. The order differs per route: `/connect` parses the body first (400 when unparseable or malformed) and verifies against `body.publicKey` after checking the header fingerprint equals `fingerprintOf(body.publicKey)`; the other three verify first against the `device` row's `public_key` for the header fingerprint (404 when absent), then parse (400).
- [x] Handlers, one per route, each `(caller: string, body: unknown) => { status: number; body: object }`, the map written `satisfies { [K in keyof RouteTable]: … }`:
  - `connect`: validate `nexusId` (ULID), `publicKey`, `name` (1–64 chars after trim); upsert `device`; if no `membership` row exists for `nexusId` insert `approved = 1`, else if none for this fingerprint insert `approved = 0`, else leave it; reply `{ approved }`.
  - `devices`, `approve`, `revoke`: validate `nexusId` and, for the latter two, `deviceId`; the caller must hold an approved membership for `nexusId` else 404; `approve` sets `approved = 1` where the target row exists (no target row is a 409, distinct from the caller's 404); `revoke` deletes the target row (idempotent), and refuses (400) a `deviceId` equal to the caller's own, since a Nexus whose last approved device revoked itself could never approve another; all three reply `{ devices }` from a join of `membership` and `device` ordered by name, mapped to `DeviceRecord` with `approved` as boolean.
- [x] Router: refuse a non-`POST` with 404; read the body into a `Buffer` with a 413 past `BODY_CAP`; switch on `new URL(req.url ?? '/', 'http://127.0.0.1').pathname` over `PATHS`; 404 default; each route follows its parse-and-verify order above; every reply `application/json`. A thrown error inside a handler answers 500 with `{ error: 'internal' }` and logs.
- [x] `export async function start(opts: { dataDir: string; port: number }): Promise<{ port: number; close(): Promise<void> }>` binds `HOST`; `if (import.meta.main) void start({ dataDir: DATA_DIR, port: PORT }).then(({ port }) => console.log(`Pommora Sync on http://127.0.0.1:${port}`))`.

**AFTER**

One file. `node Sync/server.ts` prints its address; the database lives at `~/.pommora-sync/sync.db` unless `POMMORA_SYNC_DATA` says otherwise.

**VERIFY**

- [x] `npx tsc -p Sync` exits 0; `npm run lint` clean.
- [x] `POMMORA_SYNC_DATA=$(mktemp -d) npm run sync` prints the address; `curl -s -o /dev/null -w '%{http_code}' -X POST http://127.0.0.1:7473/connect` → 401 (unsigned); stop it; the temp dir holds `sync.db`.
- [x] `grep -c "^import" Sync/server.ts` equals the count of `node:` imports plus one `import type`; `grep -n "from '@pommora/core" Sync/server.ts | grep -v "import type"` → 0.
- [x] Check for unnecessary code: no `nexus` table, no timestamps, no session table, no version-mismatch branch.

#### Task 3.2

**TASK:** Drive the server through the four verbs and the refusals with a real Ed25519 key over `fetch`, asserting the canonical string against the shared fixture.

**FILES:** `Sync/server.test.ts`, `vitest.config.ts`

**DEPENDENCIES:** Task 3.1; Task 1.3's `vectors.json`.

**NOW**

No Sync tests; root `vitest.config.ts` lists `projects: ['UIX', 'Core', 'Desktop']`. Vitest names a project by its package name, so the filter is `--project @pommora/sync`.

**CHANGE**

- [x] Root `vitest.config.ts`: `projects: ['UIX', 'Core', 'Desktop', 'Sync']`.
- [x] Create `Sync/server.test.ts` importing `{ start, canonical }` from `'./server.ts'` (the extension is required). `beforeAll` starts on `port: 0` in `mkdtempSync(join(tmpdir(), 'pommora-sync-'))`; `afterAll` closes. The first test asserts `import.meta.main` is falsy under Vitest, so importing the module never binds the real port.
- [x] A `signer(name)` helper: `generateKeyPairSync('ed25519')`, `publicKey` = JWK `x`, `id` = SHA-256 hex of its bytes, and `call(route, body)` that builds the canonical string, signs with `sign(null, …)`, sets the three headers, and `fetch`es.
- [x] Tests: the first connect on a fresh Nexus id answers `{ approved: true }`; a second device's connect answers `{ approved: false }` and appears in the first's `devices` with `approved: false`; the second's `devices` answers 404; `approve` from the first flips it and the second's `devices` then answers 200; `revoke` deletes it, a repeat `revoke` is 200 with the same list, `approve` of an unknown device id from an approved caller is 409, and the second's `devices` answers 404 again; a foreign Nexus id answers 404 from `devices`; a stale timestamp (six minutes old) answers 401; a tampered signature answers 401; a body over 8192 bytes answers 413; a device revoking itself answers 400; `canonical(method, path, Buffer.from(body, 'utf8'), timestampMs)` equals each `vectors.json` entry's `canonical`; the signer helper's `id` equals `createHash('sha256').update(Buffer.from(publicKey, 'base64url')).digest('hex')`; a restart on the same data dir keeps the memberships.

**AFTER**

One test file; the fixture is read with `readFileSync(fileURLToPath(new URL('../Core/Sync/vectors.json', import.meta.url)), 'utf8')`.

**VERIFY**

- [x] `npx vitest run --project @pommora/sync` → 1 file, all passed; `npx tsc -p Sync` exits 0; `npm run test` green across all four projects.
- [x] Change `WINDOW_MS` to `0` in a scratch edit: the happy-path tests go red; restore.

#### Review Checkpoint

- [x] All four gates green; `git ls-files Sync | wc -l` → 5.
- [x] `Development-Environment.md` §Running the GUI gains, in this phase's commit: "**The sync server:** `npm run sync` from the root starts `Sync/server.ts` on `http://127.0.0.1:7473`, its SQLite file under `~/.pommora-sync/` (`POMMORA_SYNC_DATA` and `POMMORA_SYNC_PORT` override both); it is a separate process, never started by the app."

### Phase 4 — Client And Channels

**GOAL:** Core talks to the server through the host members, and the renderer can reach it through six bridge channels. Depends on Phases 1, 2, and 3.

#### Task 4.1

**TASK:** The client: one function that signs and sends any route through `HostDevice` and `transport`, tested with a recording signer and a recording transport.

**FILES:** `Core/Sync/client.ts`, `Core/Sync/client.test.ts`

**DEPENDENCIES:** Tasks 1.2, 1.3, 2.3. Task 4.2 calls it.

**NOW**

`Core/MarkdownPM/api.ts` narrows the host as `clipboard: HostContext['clipboard']`; no Core code fakes a `HostContext`.

**CHANGE**

- [x] Create `Core/Sync/client.ts`: `export type SyncHost = { device: HostDevice; transport: HostContext['transport'] }`. `export async function call<K extends keyof RouteTable>(host: SyncHost, address: string, route: K, body: RouteTable[K]['body']): Promise<{ status: number; reply: RouteTable[K]['reply'] | null }>`: `json = JSON.stringify(body)`; `ts = Date.now()`; `canonical = canonicalString(ROUTES[route].method, ROUTES[route].path, machine().sha256Hex(json), ts)`; `signature = await host.device.sign(canonical)`; `headers: SignedHeaders & { 'content-type': string }` = `{ 'content-type': 'application/json', 'x-pommora-device': host.device.id, 'x-pommora-timestamp': String(ts), 'x-pommora-signature': signature }`; `transport({ url: address.replace(/\/$/, '') + ROUTES[route].path, method, headers, body: json })`; `reply` is the parsed body when `status` is 200, else null. A transport rejection is caught and answered as `{ status: 0, reply: null, error: String(e) }` (the `error` field present only then), so no caller needs its own try. No retry, no timeout beyond the transport's.
- [x] `client.test.ts`: build a `SyncHost` whose `device.sign` records its argument and answers `'sig'`, `rename` a no-op, and whose `transport` records the request and answers a canned `{ status: 200, body: '{"approved":true}' }`. Assert: the recorded url is `address + '/connect'`; the string handed to `sign` equals `canonicalString('POST', '/connect', machine().sha256Hex(recordedBody), Number(recordedHeaders['x-pommora-timestamp']))`; the signature header is `'sig'`; a non-200 answers `reply: null`; a rejecting transport answers `status: 0` with the error text and no throw. No key, no `node:crypto`.

**AFTER**

`client.ts` imports `../authority`, `../contract` types, `../Contract/handlers` types, and `../Platform/machine`. Nothing else.

**VERIFY**

- [x] `npx vitest run Core/Sync` → 2 files, all passed.
- [x] `Core/Contract/engineGraph.test.ts` green (the client is engine-reachable after Task 4.2 and imports nothing external).
- [x] `grep -n "Buffer\|btoa\|TextEncoder\|base64" Core/Sync/client.ts` → 0.

#### Task 4.2

**TASK:** Six bridge channels, their handlers in `Core/Sync/handlers.ts`, the `sync` scope, and the spread in `serve.ts`.

**FILES:** `Core/Contract/bridge.ts`, `Core/Contract/serve.ts`, `Core/Platform/localState.ts`, `Core/Sync/handlers.ts`, `Core/Sync/handlers.test.ts`

**DEPENDENCIES:** Task 4.1. Task 5.2 calls the channels.

**NOW**

`bridge.ts` declares `'devicePrefs:load': { args: []; reply: Result<DevicePrefs | null> }` among its Asks and imports reply types with `import type`. `serve.ts` spreads twelve domain handler objects into `handlers: Handlers`. `localState.ts`'s `Scope` union has fourteen members. `Core/Interface/handlers.ts` reads and writes a singleton scope with `readValue`/`writeValue`, refusing with `NO_NEXUS` when `sessionRoot()` is null. `getLiveTree()` in `Core/Nexus/liveTree.ts` answers the open tree.

**CHANGE**

- [x] `localState.ts`: add `| 'sync'` to `Scope`.
- [x] `bridge.ts`: `import type { SyncState } from '../Sync/contract'`; add after the `devicePrefs` pair:
  - `'sync:state': { args: []; reply: Result<SyncState> }`
  - `'sync:renameDevice': { args: [name: string]; reply: Result<SyncState> }`
  - `'sync:connect': { args: [address: string]; reply: Result<SyncState> }`
  - `'sync:disconnect': { args: []; reply: Result<SyncState> }`
  - `'sync:approve': { args: [deviceId: string]; reply: Result<SyncState> }`
  - `'sync:revoke': { args: [deviceId: string]; reply: Result<SyncState> }`
- [x] Create `Core/Sync/handlers.ts` exporting `syncHandlers` `satisfies Partial<Handlers>`:
  - A local `binding()` = `readValue<{ address: string }>('sync')`; `device(ctx)` projects `{ id, publicKey, name }` from `ctx.device` (never the host member itself, whose functions cannot cross IPC), with a refusal `fail('operation-failed', 'This device has no identity; the keychain refused at launch.')` when `ctx.device` is null.
  - `bindingFrom(address, outcome)`: maps a `devices`-shaped call outcome to a `SyncBinding`: 200 → `approved` with the list; 404 → `pending`; 0 → `unreachable` with the error text `call` attached; any other status → `unreachable` naming the status. `state(root, ctx): Promise<Result<SyncState>>` is the one place both refusals live: `NO_NEXUS` when `getLiveTree()` is null (a failed walk leaves the root set and the tree null), the no-identity `fail` when `ctx.device` is null; otherwise `ok({ device, binding })` where `binding` is null when unbound, else `bindingFrom(address, await call(host, address, 'devices', { nexusId }))`. Every handler returns `state(...)`'s `Result` directly, never wrapped in `ok` again. `withRoot`'s callback receives `(root, ctx, ...args)`.
  - `'sync:state'`: `withRoot` → `state(root, ctx)`.
  - `'sync:renameDevice'`: `withRoot`; trim; refuse an empty or over-64-char name; `await ctx.device.rename(name)`; if bound, re-issue `connect` (D-2) and ignore its status; `state(root, ctx)`.
  - `'sync:connect'`: `withRoot`; refuse a non-string or empty address; `call(...'connect', { nexusId, publicKey, name })`; 200 → `writeValue('sync', { address })` and `state(root, ctx)`; any other status, 0 included (a malformed address rejects in the transport and `call` absorbs it) → `fail('operation-failed', 'The server refused or did not answer: …')` with nothing written.
  - `'sync:disconnect'`: `withRoot`; `writeValue('sync', null)`; `state(root, ctx)`.
  - `'sync:approve'` / `'sync:revoke'`: `withRoot`; refuse a non-string or empty argument; refuse when unbound; `call(...)`; `ok({ device: device(ctx), binding: bindingFrom(address, outcome) })` from that one call's reply, which already carries the fresh list, so no second request is made.
- [x] `serve.ts`: `import { syncHandlers } from '../Sync/handlers'` and `...syncHandlers,` after `...settingsHandlers,`.
- [x] `handlers.test.ts`: with the memory machine and stores installed, a session root set (as `Core/Interface` tests do), and a tree seeded through `seedLiveTree` from `Core/Nexus/liveTree.ts` so `nexus.id` exists, a `HostContext` narrowed to `device` and `transport` (the `Pick`-shaped fake from Task 4.1), assert: `sync:state` unbound answers `binding: null` and its `device` has no function-valued field; `sync:connect` with a transport answering 200 writes the scope and answers `approved`; a transport answering 404 on `devices` yields `pending`; a rejecting transport yields `unreachable` with its text; a null tree answers `NO_NEXUS`; `sync:disconnect` deletes the row; `sync:approve` with an empty id is refused without a transport call; `sync:approve` makes exactly one transport call.

**AFTER**

Six new Asks, one new handler file spread into `serve.ts`, fifteen scopes.

**VERIFY**

- [x] `npm run typecheck` exits 0 (the `Handlers` total type proves every new Ask has a handler).
- [x] `npx vitest run Core/Sync` → 3 files, all passed; `npm run test` green.
- [x] `grep -c "'sync:" Core/Contract/bridge.ts` → 6.
- [x] Documentation in this commit: `Features/ConfigurationPM.md` §Pending drops the "Scopes without a renderer setter" bullet's first clause, since `sync:renameDevice` writes the app config from the renderer; `Features/CorePM.md` §The Device-Local Database's `local_state` list gains "the server binding".

#### Review Checkpoint

- [x] Smoke launch: with `POMMORA_SYNC_DATA=$(mktemp -d) npm run sync` running and a dev instance on a scratch `POMMORA_USERDATA` whose `pommora.json` names a scratch test Nexus as `lastNexusPath`, over CDP `window.nexus.ask('sync:connect', 'http://127.0.0.1:7473')` answers `ok` with `binding.state === 'approved'` and one device; `sync:disconnect` answers `binding: null`; `sync:connect` again answers `approved` (idempotent on the public key).
- [x] The server's `sync.db` holds one `device` row and one `membership` row with `approved = 1`.
- [x] Gates green; no `.json` import reachable from `Core/Contract/serve.ts`.

**`[Design pass]`** The session designs the heading from this brief before Task 5.1, discloses each decision in-chat as a numbered list, and proceeds without waiting; Nathan reviews the running surface afterward. Minimal and functional is the target: every row is one existing kit composition, nothing decorative, no new UIX kind, and `Core/Settings` keeps its React-free engine half untouched (the handlers and client are engine code; only the `.tsx` rows render). The brief:

- **Rows the heading needs:** this device's name (editable) and fingerprint; the Nexus id; a server address with Connect and its inverse Disconnect; the device list, each row with name, fingerprint, state, and Approve or Revoke, except this device's own row, which carries neither (the server refuses a self-revoke, since a Nexus whose last approved device left could never approve another); a Refresh action; and the three heading states (unbound; bound and approved, showing the list; bound and awaiting approval, showing the binding and a caption, with Connect still reachable, since a device another device revoked reads as pending and re-registers by connecting again, which is idempotent). Unreachable shows the binding and the failure. Every state renders without build or meta text.
- **What exists to compose from, no new UIX:** the section heading from `Section.title`; `SettingsFieldRow` for any row with a control in its trailing slot; `InputField` with `edit={{ value, onCommit }}` for the name and the address; `Button` with `label` (`filled`, `destructive`, `base`) for Connect, Disconnect, Approve, Revoke, Refresh, as `ClearActionRow` uses it; `MenuRow` `caption` for the pending or failure line; the `ExcludedDirectoriesRow` `fieldRow` shape (control left, button right) for each device row, inline or inside a `PickerMenu` pane if the list runs long; `TrashFrame`'s fetch-on-open plus refresh. `Trailing` `value` renders a chevron glyph and reads as a control, so read-only values use a field row with plain text or a caption.
- **The one structural fork:** the heading is a titled `Section` inside General rendered by one composite `nexus` row kind (recommended; General keeps its two picker rows), or General becomes a bespoke `Surface` Frame (rejected by the plan: it would hand-roll the existing rows).
- **A constraint the design is measured against:** `Features/PommoraUIX.md`'s trailing-control roster stays true, so no new trailing or menu-row kind.

### Phase 5 — The Nexus Heading

**GOAL:** Settings › General shows the Nexus heading as designed in the design pass, on the six channels, with no new UIX kinds.

#### Task 5.1

**TASK:** The `nexus` row kind and the titled section in General.

**FILES:** `Core/Settings/frames.ts`, `Core/Settings/SettingsWindow.tsx`

**DEPENDENCIES:** Task 5.2 provides the component.

**NOW**

`Row` is a union of fourteen members across nine kinds, ending in the `zoom` member; General is `FRAMES[0]` with one untitled section of two picker rows; `RowControl` switches on nine kinds.

**CHANGE**

- [x] `frames.ts`: add `| (RowText & { kind: 'nexus' })` to `Row`; add a second section to General: `{ title: 'Nexus', rows: [{ kind: 'nexus', label: 'Nexus' }] }` (the label is the row's React key in `FrameBody`).
- [x] `SettingsWindow.tsx`: `case 'nexus': return <NexusRows />` with the import.

**AFTER**

Ten row kinds; General has two sections.

**VERIFY**

- [x] `grep -c "case '" Core/Settings/SettingsWindow.tsx` → 10.
- [x] `npm run typecheck` exits 0 once Task 5.2 lands (shares its commit).

#### Task 5.2

**TASK:** `NexusRows`: one component owning the `sync:state` fetch and rendering the cluster the design pass produced.

**FILES:** `Core/Settings/NexusRows.tsx`, `Core/Settings/NexusRows.test.tsx`, and `Core/Settings/nexus-rows.css.ts` only if the design needs it

**DEPENDENCIES:** Task 4.2's channels; the design pass's disclosed decisions.

**NOW**

`TrashFrame.tsx` holds `useState(rows | null)`, a `useCallback` `refresh` awaiting `host().ask('trash:list')`, and a `useEffect` calling it on mount; `ExcludedDirectoriesRow.tsx` composes `SettingsFieldRow`, a `fieldRow` of control plus `Button`, and a `busy` guard; `exclusion-rows.css.ts` is the style module shape.

**CHANGE**

- [x] Create `NexusRows.tsx`: `state` from `host().ask('sync:state')` on mount and on Refresh; each action (`sync:renameDevice`, `sync:connect`, `sync:disconnect`, `sync:approve`, `sync:revoke`) awaits its channel, replaces `state` with the reply on `ok`, and reports a failure through `host().ask('error:show', …)` as `frames.ts`'s thunks do; a `busy` flag gates a second action while one is in flight. Render exactly the rows and states the design pass names, composing only the parts the brief lists; `state === null` renders nothing.
- [x] Reuse `exclusion-rows.css.ts`'s `paneRow`, `field`, and `paneList` for the device rows; create `nexus-rows.css.ts` only for what the design pass adds beyond them, and omit the file if nothing does.
- [x] `NexusRows.test.tsx`, opening with `// @vitest-environment jsdom` as every React test in Core does, with `stubDialer` from `Core/vitest.setup.ts`: an unbound state renders the device rows and the address field and no list; an approved state renders one row per device with Approve on pending rows and Revoke on approved ones; pressing Approve calls `sync:approve` with that id and re-renders from the reply; a pending state renders the caption and no list.

**AFTER**

One component, one test, a style module only if needed. No new `MenuRow` or `Trailing` kind.

**VERIFY**

- [x] `npx vitest run Core/Settings/NexusRows` → all passed; `npm run typecheck` and `npm run lint` clean.
- [x] `git diff --stat UIX/` → empty.
- [x] Smoke launch (dev instance, server running): open Settings › General; the Nexus heading shows this device and the Nexus id; Connect binds and lists the device as approved; Disconnect clears it; Refresh re-lists. When Nathan is present, this is his numbered check instead.
- [x] Documentation in this commit: `Features/ConfigurationPM.md` §General gains a Nexus subsection listing the rows and their three states and stating that none writes a `personalization` key; its §Settings preamble's "each row writes one key of the `personalization` object" becomes "most rows write one key of the `personalization` object; the Nexus heading reads and writes the device and the server binding instead"; `Features/InterfacePM.md`'s frame sentence gains "or, as the Nexus heading does, binds to the device and the server".

#### Review Checkpoint

- [x] The heading matches the disclosed design; no state shows build or meta text.
- [x] `Features/PommoraUIX.md` §Index's trailing roster is unchanged and still true.

### Phase 6 — Proof And Reconciliation

**GOAL:** The success criteria observed end to end on localhost, then every document the arc made false rewritten and the closeout records written.

#### Task 6.1

**TASK:** Two instances from built output, one Nexus id, approve then revoke, states surviving restarts, driven over CDP.

**FILES:** none in the repo; scratch under `~/pommora-sync-proof/`

**DEPENDENCIES:** Phases 1–5.

**NOW**

Two `npm run dev` processes share one renderer server through a stale port, so both instances launch from built output: `cd Desktop && POMMORA_USERDATA=<dir> POMMORA_DEBUG_PORT=<port> env -u ELECTRON_RUN_AS_NODE ../node_modules/.bin/electron .`. `POMMORA_USERDATA` is read at `Desktop/main.ts` module scope; the single-instance lock is per userData.

**CHANGE**

- [x] `npm run build`. Create `$HOME/pommora-sync-proof/{userA,userB,server}` and a test Nexus `$HOME/pommora-sync-proof/NexusA` holding one Markdown page; write `userA/pommora.json` as `{ "lastNexusPath": "<NexusA>" }`. Use `$HOME`, never `~`, inside every assignment.
- [x] Start the server: `POMMORA_SYNC_DATA=$HOME/pommora-sync-proof/server npm run sync`.
- [x] Launch instance A on `POMMORA_DEBUG_PORT=9333`; over CDP: `sync:connect('http://127.0.0.1:7473')` → `approved`, one device. Read `NexusA/.nexus/nexus.json`'s id.
- [x] Copy `NexusA` to `NexusB`; delete `NexusB/.nexus/*.db*`; write `userB/pommora.json` with `lastNexusPath` = `NexusB`; launch instance B on `9334`; `sync:connect` → `pending`.
- [x] A: `sync:state` lists B pending; `sync:approve(B.id)` → both approved; B: `sync:state` → `approved`.
- [x] Stop the server, quit both instances; restart all three; A and B each answer `approved`. A: `sync:revoke(B.id)`; B: `sync:state` → `pending`; B: `sync:connect` again → `pending` and A's list shows B pending once more; restart all three again; B still reads `pending`.
- [x] Tear down: quit both, stop the server, delete `$HOME/pommora-sync-proof/`.

**AFTER**

Nothing in the repo changes; the report carries the observed sequence.

**VERIFY**

- [x] Every ask above answered as stated, read from the CDP result, not inferred.
- [x] `$HOME/pommora-sync-proof/server/sync.db` held two `device` rows and, before the revoke, two `membership` rows for one `nexus_id` equal to `NexusA`'s id.
- [x] `git status --porcelain` is empty after teardown.

#### Task 6.2

**TASK:** Write `NexusSyncPM` and rewrite every sync claim in CorePM, DesktopPM, the PRD, and CLAUDE.md's Locked Decisions.

**FILES:** `.claude/Features/NexusSyncPM.md`, `.claude/Features/CorePM.md`, `.claude/Features/DesktopPM.md`, `.claude/Features/ConfigurationPM.md`, `.claude/PommoraPRD.md`, `.claude/CLAUDE.md`

**DEPENDENCIES:** Task 6.1 done, so the document describes what exists.

**NOW**

- CorePM `:8` "It can sit in iCloud Drive, Dropbox, or any synced folder for device-to-device sync."; `:11` "`<Nexus>` … canonical content; syncs with the cloud"; `:105`, `:113`, `:141` each say the databases "never sync"; `:184` "**Cross-device sync** — placing the Nexus in a synced folder gives device-to-device sync; real cloud sync is a long-term prospect."
- DesktopPM `:18` "Both sit inside the Nexus and travel with a moved one, and neither ever syncs."
- PRD `:25` "future cross-device and cloud sync stay viable, but neither is a v1 concern"; `:90` "A Nexus placed in iCloud Drive, Dropbox, or any synced folder already gets device-to-device sync for free."; `:205` lists "sync, mobile" under Out (post-v1).
- CLAUDE.md Locked Decisions has two entries.

**CHANGE**

- [x] Create `.claude/Features/NexusSyncPM.md`, encyclopedic, H4 headings: **What Travels** (the whole Nexus, `.nexus/` included; `nexus.db`, `versions.db`, and their journals excluded in code by the manifest rule, never by convention; Obsidian Sync is prior art, never a dependency; written without the phrases "synced folder" and "iCloud Drive", which Task 6.2's VERIFY greps to zero); **Three Identities** (a Nexus by its id in `nexus.json`; a device by the fingerprint of its Ed25519 key, public half and name in `pommora.json`, private half in the keychain; a server by the address a Nexus is bound to, per Nexus and per device in `local_state`); **The Device Model** (approved-device list per Nexus on the server; connect, approve, revoke; several people are several people's devices; accounts are a later grouping layer); **Signed Requests** (the canonical string, the headers, the five-minute window, no sessions); **The Server** (one file on built-ins, `sync.db`, four verbs, why it lives outside the app and outside the Nexus: a server inside the desktop app sleeps with the laptop and leaves the phone nothing to talk to; a desktop-hosted server is a trade Nathan may weigh later); **Pending** (the Nexus password wrapping one content key with a per-device X25519 entry; content sync; the phone).
- [x] CorePM: `:8` → "It syncs through Pommora Sync ([[NexusSyncPM]]), never through a third-party folder transport."; `:11` → "canonical content; travels through Pommora Sync"; `:105`, `:113`, `:141` → each "never syncs" becomes "is excluded from sync by the manifest rule"; `:184` → the bullet is removed from the OS list, since sync is Pommora's own.
- [x] DesktopPM `:18` → "Both sit inside the Nexus and travel with a moved one; the sync manifest excludes them."
- [x] ConfigurationPM `:4` → "Beneath all three sits a per-device layer: the app config beside the application, which is never part of a Nexus, and the machine-and-Nexus preferences in the Nexus's own database, which the sync manifest excludes."
- [x] PRD `:25` → "Cross-device sync is Pommora's own ([[NexusSyncPM]]); the mobile companion follows it."; `:90` → drop the iCloud sentence; `:205` → remove "sync, mobile" from the Out list.
- [x] CLAUDE.md Locked Decisions: add "- **What Syncs:** Pommora Sync carries the whole Nexus, `.nexus/` included; the two databases never travel, excluded in code. The model and its identities are [[NexusSyncPM]]."

**AFTER**

Twenty Features documents; no sentence anywhere says a synced folder gives sync.

**VERIFY**

- [x] `grep -rn "iCloud Drive\|synced folder" .claude/Features .claude/PommoraPRD.md .claude/CLAUDE.md` → 0 lines.
- [x] `grep -rn "never syncs" .claude/Features | grep -v "app-support\|never part of a Nexus"` → 0 lines (the app-support and `pommora.json` sentences stay true and stay).
- [x] `ls .claude/Features | wc -l` → 20.

#### Task 6.3

**TASK:** Rewrite the Mobile log's account-era entries under the replace rule, point both Mobile documents at this arc, and write the closeout records.

**FILES:** `.claude/Planning/Mobile Companion & Pommora Sync — Decision Log.md`, `.claude/Planning/Mobile Companion & Pommora Sync — Implementation Plan.md`, `.claude/Guidelines/Development-Environment.md`, `.claude/FrameworkPM.md`, `.claude/HistoryPM.md`, `.claude/ContextPM.md`, `.claude/HandoffPM.md`

**DEPENDENCIES:** Task 6.2.

**NOW**

Mobile log C-10 (email + password), G-1 (users, device tokens), G-2 (password hashing, tokens), H-1 (sync model in `Sync`), H-2 (app-level server address), H-3 (Account and Sync sections), I-1 ("sign in") describe the account model. The Mobile plan's Standing note names no successor. Development-Environment `:43` describes a second instance without the copy recipe.

**CHANGE**

- [x] Mobile log: rewrite C-10 to the device-key model and pairing; G-1 to "one SQLite file holding devices, memberships, Nexus', items, versions, and blobs"; G-2 to signed requests and the not-found rule; H-1 to "the client model is `Core/Sync`, the server is `Sync/`"; H-2 to per-Nexus binding in the `sync` scope; H-3 to the Nexus heading gaining the Sync rows (password, Sync Now, status); I-1's "sign in" to "pair this device"; the Core list's "sections to sign in and connect a remote Nexus" to "the Nexus heading to pair this device and bind the Nexus"; the OAuth Prospect's don't-foreclose to "the device key's signature seam". Its Standing note gains one sentence: "The identity groundwork shipped first under [[Sync Groundwork — Decision Log]]."
- [x] Mobile plan's Standing note gains: "Tasks 3–6, 12, 14, and 15 re-derive against [[Sync Groundwork — Decision Log]] at execution; the device model, the server's schema, and the Settings surface are already built there."
- [x] Development-Environment `:43` gains the copy-as-second-device recipe: build once; a second `POMMORA_USERDATA`; a copied Nexus with `.nexus/*.db*` deleted so it is a replica with the same id and its own per-machine state; both instances launched from built output because two dev processes share one renderer server through a stale port; distinct `POMMORA_DEBUG_PORT` values.
- [x] FrameworkPM: the Prospects sentence naming "the mobile companion and Pommora Sync" gains "; the identity groundwork shipped first". HistoryPM: one entry per `History-Format.md`. ContextPM: §Current Focus leads with the arc; the pending list gains Nathan's database-relocation exploration. HandoffPM: per the handoff skill's shape.

**AFTER**

Every Mobile entry reads as the device-key model; every living document names the arc.

**VERIFY**

- [x] `grep -n "Email and password\|device token\|sign in" ".claude/Planning/Mobile Companion & Pommora Sync — Decision Log.md"` → 0 lines outside Considered & Rejected.
- [x] `grep -c "Sync Groundwork" .claude/HistoryPM.md .claude/ContextPM.md .claude/FrameworkPM.md` → at least 1 each.

#### Review Checkpoint

- [x] The end-to-end sequence was observed, the heading's rows read from the DOM, the scratch dir deleted.
- [x] Every Reconciliation entry below opens to its rewritten sentence.

### Completion Criteria

**Conformance**

- [x] No duplicated mechanism beyond F-1's owned list: `grep -rn "createHash\|crypto\." Core/Sync` → 0 lines; the route paths and the canonical string appear once in Core and once in `Sync/server.ts`; the two validators appear in `Sync/server.ts` alone.
- [x] No dependency added: `git diff <baseline>..HEAD -- '**/package.json'` shows only `type`, `scripts`, and the workspace list.
- [x] Nothing changed outside the plan: `git diff --name-only <baseline>..HEAD` matches the union of every task's FILES plus the Reconciliation list.

**Correctness**

- [x] A fresh `POMMORA_USERDATA` gains a device with a 64-hex id, a 43-char base64url public key, the hostname, and a keychain-encrypted private key; a relaunch keeps all three.
- [x] `npm run sync` serves four verbs on `127.0.0.1:7473` and refuses unsigned, stale, tampered, and oversized requests.
- [x] Two instances holding one Nexus id: connect, pending, approve, revoke, and every state survives a server restart and an app relaunch (Task 6.1, observed).
- [x] Settings › General shows the Nexus heading in its three states as designed.

**Completeness**

- [x] Every task ticked; no scaffolding, debug output, or unauthorized TODO in `<baseline>..HEAD`; the scratch proof directory deleted.

**Confirmation**

- [x] Every VERIFY result read; `authority.test.ts` and `server.test.ts` each go red under the scratch edits named in their tasks.
- [ ] Nathan: the numbered check list at Phase 5 if present; the heading's design was disclosed in-chat, not requested.

**Continuity**

- [x] Reconciliation complete; the living documents read true; Deviations each fixed or ruled on.

**Confidence**

- [x] Gates green from clean on `<baseline>..HEAD`; every Baseline count moved as stated.
- [x] Diff size as implied: about +700 lines of code excluding tests and comments (server ~230, Desktop ~150, Core/Sync ~170, Settings ~150), reported exactly.

### Final Verification

**THE STANDARD:** The work is finished when a later review of it finds nothing to correct. Nothing is carried as a concern, nothing is deferred where the fix is known, and nothing is declared that wasn't watched happen. Where something genuinely couldn't get there, the report names which and why, and everything else is still finished. Ambiguity met during execution took the simplest reading and was recorded; it didn't stop the run. Edits found in adjacent files that no task made belong to Nathan, folded into the commit at hand, not reverted.

- [x] Phase review dispatched: Phase 1 · Phase 2 · Phase 3 · Phase 4 · Phase 5 · Phase 6 (simplification before build-breaking, both dual-briefed)
- [x] All findings fixed or ruled on
- [x] Neutral verification passed on `<baseline>..HEAD`
- [x] Final pass: gates · baseline · diff · deviations · criteria
- [x] Reconciliation walked; living documents read
- [x] Report delivered

#### Reconciliation

- `.claude/CLAUDE.md` — "Desktop's implementation is the only place Node and Electron are called" and "the only caller of Node"; no `Core/Sync` in the tree — Task 1.4
- `.claude/CLAUDE.md` — Locked Decisions lacks the sync entry — Task 6.2
- `.claude/Guidelines/Development-Environment.md` — "Core's own format is unconstrained"; "all four tsconfig projects" — Task 1.4; no server start command — Phase 3 checkpoint; second-instance recipe without the copy — Task 6.3
- `.claude/Guidelines/Dependencies.md` — no Server heading; `node:sqlite` as Electron-only — Task 1.4
- `.claude/Features/DesktopPM.md` — §Config names three `pommora.json` fields — Phase 2 checkpoint; "neither ever syncs" — Task 6.2
- `.claude/Features/CorePM.md` — `:51` `pommora.json` line — Phase 2 checkpoint; `local_state` list — Task 4.2; `:8`, `:11`, `:105`, `:113`, `:141`, `:184` — Task 6.2
- `.claude/Features/ConfigurationPM.md` — §App Configuration enumeration — Phase 2 checkpoint; §Pending "Scopes without a renderer setter" — Task 4.2; §General and the §Settings preamble — Task 5.2
- `.claude/Features/InterfacePM.md` — "each writing one key of the Nexus's personalization" — Task 5.2
- `.claude/PommoraPRD.md` — `:25`, `:90`, `:205` — Task 6.2
- `.claude/Planning/Mobile Companion & Pommora Sync — Decision Log.md` — C-10, G-1, G-2, H-1, H-2, H-3, I-1, Standing — Task 6.3
- `.claude/Planning/Mobile Companion & Pommora Sync — Implementation Plan.md` — Standing — Task 6.3
- `.claude/FrameworkPM.md`, `.claude/HistoryPM.md`, `.claude/ContextPM.md` (including its pending note's "'never syncs' is a physical fact" phrasing), `.claude/HandoffPM.md` — Task 6.3

#### Report & Closure

The orchestrator writes the report in the shape the planning skill's §5.5 gives: the feature paragraph, phase by phase, verification (phase review, neutral verification, final pass with each gate's real output, reconciliation, Nathan's own pass unticked), deviations, open items, the diff's +/- lines excluding comments and tests with START and END, and a closing stance.

### Open Items

- The plan assumes no dev instance runs during Task 6.1; both proof instances launch from built output.
- The working tree carries the uncommitted Nexus Config Relocation arc (Nathan's, left alone). The Baseline is recorded on the tree as it stands; if that arc lands during this plan, its commits are excluded from the `git diff --name-only` conformance check by path.
- Electron's `safeStorage` on the unsigned dev binary may prompt the macOS Keychain once at the first smoke launch; C-7 argues it won't, and the smoke launch settles it.

### Deviations

- `RouteTable` gives approve and revoke distinct path literals; `authority.ts` imports `./contract`.
- Development-Environment states the type-only gate's mechanism as Sync's `nodenext` program reading Core as CommonJS.
- `secrets.ts` exports `secretsAvailable` and `KEYCHAIN_UNAVAILABLE` beside its two functions; `mint` refuses before any write when the keychain is unavailable, and clears the config's device before writing the new secret so no crash leaves a mismatched pair.
- An undecryptable secret leaves the launch identity-less and reported; only an absent key re-mints (C-5 narrowed).
- `HostDevice` is a plain object, not getters; `load` takes no config parameter; the minted name is clamped to 64.
- The transport bounds a request at ten seconds.
- Server: `import type * as Wire`; the header gate runs before any per-route parse; a connect whose header fingerprint mismatches its body key answers 401; the device upsert is `ON CONFLICT DO UPDATE`; a failed listen prints one line and exits 1; the tautological signer test and the `import.meta.main` test were dropped.
- Handlers: `ready(root, ctx)` holds the one refusal (no identity) and re-walks a dropped tree instead of answering `NO_NEXUS`; a refused write answers `NO_STORE`; a refused approve or revoke re-fetches the list; `bindingFrom` requires an array; a bound rename against a silent server answers unreachable from its one call; `SignedHeaders` is a type alias.
- Heading: `NexusRows` keys a `NexusBody` on the Nexus id; the mount fetch reports no error; the busy gate is a ref; Connect is never disabled for an empty address; device rows are inert; the Nexus ID row reads the session tree; no `nexus-rows.css.ts`.
- NexusSyncPM has no Nexus Heading section (Nathan's plan edit) and uses H3 sections with an H4 Pending, matching the other Features docs.
- Added on Nathan's mid-run request: `.claude/Planning/Cross-Device Mutation Checklist.md` and three audit-report sentence updates; the proof gained three manual-modification checks.
- Several commits carry `Co-Authored-By: Claude Opus 5 (1M context)` (the implementing agents' own attribution) rather than the orchestrator's line.
- Reviews were run by Opus agents loading the `build-breaking` and `code-simplification` skills; the skills load inline rather than spawning agents.
