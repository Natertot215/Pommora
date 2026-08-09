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
  | 'lossy-change-requires-confirmation'
  | 'operation-failed'
  | 'no-nexus'
  | 'busy'

/** A structured, serializable error, the same shape internally and on the wire. */
export interface PommoraError {
  code: ErrorCode
  message: string
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

/** Terse failure constructor. */
export function fail(code: ErrorCode, message: string): Result<never> {
  return { ok: false, error: { code, message } }
}
