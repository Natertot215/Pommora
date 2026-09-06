// Mirrors the IPC envelope shape so a handler can return a Result straight across the boundary.

/** A closed union so the renderer can switch on it exhaustively, and a typo'd code is a compile error rather than a silent runtime miss. */
type ErrorCode =
  | 'not-found'
  | 'exists'
  | 'invalid-name'
  | 'invalid-path'
  | 'invalid-property'
  | 'lossy-change-requires-confirmation'
  | 'operation-failed'
  | 'no-nexus'
  | 'busy'

export interface PommoraError {
  code: ErrorCode
  message: string
}

export type Result<T, E = PommoraError> = { ok: true; value: T } | { ok: false; error: E }

/** A caught value is only guaranteed to be `unknown`, and every envelope reports it the same way. */
export function errText(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

export function caught(e: unknown): PommoraError {
  return { code: 'operation-failed', message: errText(e) }
}

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value }
}

export function fail(code: ErrorCode, message: string): Result<never> {
  return { ok: false, error: { code, message } }
}

export const fault = (message: string): Result<never> => fail('operation-failed', message)

/** THE two session refusals — one spelling, one code, everywhere. A handler refuses through these or not at all. */
export const NO_NEXUS = fail('no-nexus', 'No nexus is open.')
export const BUSY = fail('busy', 'Nexus switching.')
