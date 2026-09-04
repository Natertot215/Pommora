## Web Guest Gotchas

Hard-won traps around Electron `<webview>` guests and the React surfaces that host them. Read before touching any web surface.

### Mounting & Attributes

- **React drops boolean values for attributes it doesn't recognize.** A bare `allowpopups` JSX prop lands as a property the webview never consults — Blink then kills every guest `window.open` before main's handler is consulted, silently. Only string values reach unknown attributes: write `allowpopups={'' as unknown as boolean}` (the cast rides React's own typing, which claims boolean). `partition` works untouched because it's a string prop.
- **A guest mounting inside a hidden subtree may never attach.** Under a `visibility: hidden` or `opacity: 0` ancestor, Chromium defers guest attach erratically — observed at four seconds, or never. Never hide a *mounting* guest to stage a reveal; mount it visible and cover it with host DOM instead (the glance pane's load cover is the standing pattern). An *already-attached* guest survives `visibility: hidden` fine — that's what retention rides on; `display: none` tears it down.
- **`will-attach-webview` is a validator, not a rewriter.** Edits to `params` never reach the attach. Required attributes ride the elements; the hook's job is to deny what shouldn't attach.

### Guest Methods & Events

- **Webview methods exist on the prototype before the guest does, and throw synchronously pre-attach.** An existence check (`el.capturePage?.`) never trips for the unattached case, and `.then(onRejected)` catches nothing — the throw is sync. Wrap the call in try/catch and arm any fallback timer *before* calling.
- **A hidden guest captures an empty frame.** `capturePage` on a page Chromium considers hidden returns nothing useful. Capture before the hiding class reaches the compositor — a layout effect that holds the guest painted through the capture is the tile's standing shape.
- **Webview event listeners are invisible to DevTools.** `getEventListeners` shows `[]` for listeners that are attached and firing — Electron dispatches through its own element internals. Don't diagnose from that.

### Hosting Surfaces

- **PickerMenu's portal lands a render after `open` flips.** A same-commit effect reading a ref to portal content sees null and never re-runs — content loads unobserved. Track portal-mounted elements as *state* (a callback ref into `useState`) so dependent effects re-run when the element actually exists.
- **Guests scroll internally.** Host chrome never sees page content pass beneath it, backdrop filters can't sample guest pixels, and a pane's clip-path doesn't reach the composited guest surface — a guest clips its own corners (`border-radius` + `overflow: hidden` on its own box works; the tile and glance pane both do this).
