// A minimal CDP client over Node's global WebSocket: one page target, request/response by id.
export async function connect(port) {
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
  const page = targets.find((t) => t.type === 'page')
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((ok, fail) => { ws.onopen = ok; ws.onerror = fail })
  let id = 0
  const pending = new Map()
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data)
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id) }
  }
  // Every call times out, so a wedged page fails the step that wedged it instead of hanging the run.
  const send = (method, params = {}) => new Promise((ok, fail) => {
    const n = ++id
    const timer = setTimeout(() => { pending.delete(n); fail(new Error(`${method}: no answer in 20 s`)) }, 20000)
    pending.set(n, (msg) => { clearTimeout(timer); msg.error ? fail(new Error(`${method}: ${msg.error.message}`)) : ok(msg.result) })
    ws.send(JSON.stringify({ id: n, method, params }))
  })
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (r.exceptionDetails) throw new Error(`eval: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`)
    return r.result.value
  }
  return { send, evaluate, close: () => ws.close() }
}
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// A real pointer click at the centre of the first element `selector` matches whose text is `text` (or any, when omitted).
export async function click(c, selector, text) {
  const box = await c.evaluate(`(() => {
    const el = [...document.querySelectorAll(${JSON.stringify(selector)})].filter((e) => ${text === undefined ? 'true' : `(e.textContent ?? '').trim() === ${JSON.stringify(text)}`}).pop()
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.left + Math.min(r.width / 2, 40), y: r.top + r.height / 2 }
  })()`)
  if (!box) throw new Error(`click: nothing matches ${selector} ${text ?? ''}`)
  for (const type of ['mousePressed', 'mouseReleased'])
    await c.send('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 })
}

// Opens a Collection A page from its card, the way a person would.
export async function openPage(c, title) {
  await click(c, 'button[aria-label=collections]')
  await sleep(300)
  await click(c, '.row', 'Collection A')
  await sleep(600)
  await click(c, 'body *', title)
  for (let i = 0; i < 40; i++) {
    const ok = await c.evaluate(`!!document.querySelector('.cm-content')?.cmTile?.root?.view && document.body.innerText.includes(${JSON.stringify(title)})`)
    if (ok) break
    await sleep(100)
  }
  await sleep(800)
}
