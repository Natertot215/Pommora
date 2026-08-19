## Weblink

Pommora renders the web inside the Nexus. A web address alone on its own line becomes a live webpage tile in the page body, and every surface that hosts a guest webpage — tiles today, with further surfaces to follow — shares one governed web session, so a site signed into once is signed in everywhere Pommora shows it.

### Webpage Embeds

A **webpage embed** is a Markdown line of the form `![Label](url)` standing alone — trailing whitespace tolerated, never indented, never inside a fence, table, or math region. The label may be empty; the address must carry an explicit `http`/`https` scheme and name a host a link could open. The syntax is CommonMark's image form, so a shared vault reads the line as an image reference pointing at a URL — a legible, translatable shape. An ordinary link on its own line (no leading `!`) stays a link.

**Formation.** A valid line becomes a tile when the document opens, when an edit lands one away from the caret, or when the selection leaves it — never while the selection still sits on it, so an address being typed stays ordinary text until the author moves on. Once formed, a tile persists wherever the selection goes; undo restores a removed tile directly.

**The tile.** Webpage tiles ride the same chassis as page embeds: the rounded frame, the fencing blanks, the bottom-edge resize strip, and the same editing protections — the line can be removed whole but never eroded in place, boundary insertions repair onto their own line, and deleting a tile's lone fencing blank is refused. Tile heights persist per page, keyed by address, and a stored height is capped to what the scrollport can hold.

**Live at full visibility.** The guest webpage exists only while its tile is fully visible inside the page's scrollport, with a small pre-arm margin — a partially clipped guest cannot be clipped correctly, so the tile swaps to a static face just before it touches the edge and returns to the live site once fully back. Inside nested surfaces (a page embed's body), the face renders unconditionally. While no guest is attached, or while one is loading, the face is the quiet chassis surface; a page that fails to load or whose renderer dies shows the site's bare domain and re-attaches on the next visibility transition.

### The Web Session

Every guest webpage lives on one persistent session partition owned by the main process. An attach that does not declare that partition — or that carries a non-web address or its own web preferences — is denied outright, and a guest can never navigate itself to anything but a web address. Signing into a site in one tile signs it in for every web surface, per machine, surviving restarts.

The session presents a cleaned browser identity, and requests to Google's sign-in host carry a further-adjusted form; embedded Google sign-in remains best-effort by nature. A guest's `window.open` never opens a system window: the request is handed back to the renderer, which decides where the link goes. Guests track the window's zoom — the default view scale, ⌘0, and ⌘+/⌘− all reach them.
