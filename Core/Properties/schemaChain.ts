// The schema-mutation entry points read-modify-write collection sidecars with no per-file guard, so two overlapping IPC ops could land a stale snapshot over a fresh write. Wrap entry points ONLY: a chained fn awaiting another chained fn deadlocks.

let chain: Promise<unknown> = Promise.resolve()

export function serializeSchemaOp<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn)
  chain = run.catch(() => undefined)
  return run
}
