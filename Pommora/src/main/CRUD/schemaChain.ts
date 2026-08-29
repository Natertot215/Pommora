// One serialized chain for the schema-mutation ENTRY POINTS (assign / remove / reorder /
// delete). They read-modify-write collection sidecars with no per-file guard, so two
// overlapping IPC ops could land a stale sidecar snapshot over a fresh write. The ops are rare
// and human-paced, so global serialization costs nothing. Wrap entry points ONLY: a chained fn
// awaiting another chained fn deadlocks.

let chain: Promise<unknown> = Promise.resolve()

export function serializeSchemaOp<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn)
  chain = run.catch(() => undefined)
  return run
}
