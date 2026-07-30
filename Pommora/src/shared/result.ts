// The data layer's internal result contract. Mirrors the IPC envelope shape so a
// handler can return a Result straight across the boundary. No fs, no React.

/** The finite vocabulary of failure codes — a closed union so the renderer can switch on
 *  it exhaustively (and a typo'd code is a compile error, not a silent runtime miss). */
export type ErrorCode =
  | 'not-found'
  | 'exists'
  | 'invalid-name'
  | 'invalid-path'
  | 'invalid-property'
  | 'invalid-event'
  | 'not-agenda'
  | 'lossy-change-requires-confirmation'
  | 'operation-failed'
  | 'no-nexus'
  | 'busy'

/** A structured, serializable error. `scope` names the entity/kind domain (free-form: an
 *  entity name like "page"/"agenda" or a SidecarKind), used for message context only. */
export interface PommoraError {
  code: ErrorCode
  message: string
  scope?: string
}

export type Result<T, E = PommoraError> = { ok: true; value: T } | { ok: false; error: E }

/** The one narrowing of an unknown throw to a message — a caught value is only
 *  guaranteed to be `unknown`, and every envelope reports it the same way. */
export function errText(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value }
}

/** Terse failure constructor. Omits `scope` when absent so the on-wire shape stays minimal. */
export function fail(code: ErrorCode, message: string, scope?: string): Result<never> {
  return { ok: false, error: scope === undefined ? { code, message } : { code, message, scope } }
}
