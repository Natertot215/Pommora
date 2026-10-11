## Links Cleanup — Headless Drive

One Node process launches a scratch Pommora instance over CDP (its own userData and a copy of `~/Test` with seeded pages), runs scenario files, and prints PASS/FAIL per check with screenshots under `shots/<scenario>/`. The user's instance on port 9333 and the real `~/Test` are never touched.

```
node drive.mjs run phase4            # seed, launch, run, quit
node drive.mjs run phase1 phase3 --keep   # leave the instance up for another run
node drive.mjs run phase4 --attach 9345   # reuse a running scratch instance
node drive.mjs launch | quit | seed | actions | eval '<js>'
```

- **Renderer:** when the dev server is up on `:5173` the scratch instance borrows it (main is rebuilt first if `Desktop/out` is older than the sources); otherwise `npm run dev` starts with the scratch userData.
- **Actions:** `node drive.mjs actions` lists them. Settings go through the store (`d.setSetting(key, value)`), pages open by title (`d.openPage`), typing is real key events (`d.type`), native context menus pop from a real right-click (`d.rightClick`) and are walked with `d.menu('down', 'enter')`, in-renderer menus by label (`d.pickRow`), the editor through `d.editor()` (`doc`, `setDoc`, `caret`, `caretIn`, `select`), and the clipboard through `d.clipboard(text)` + `d.paste()`.
- **Scenarios:** `scenarios/<name>.mjs` exports `name` and `run(d)`; each phase's file holds the live checks its tasks' VERIFY steps and Review Checkpoint name. Seeded pages are in `seed.mjs` (`Alpha`, `Beta`, `Gamma`, `Scratch`, two `Dup`s); `Beta` carries every link form in its body, a table of them, and a Text value.
