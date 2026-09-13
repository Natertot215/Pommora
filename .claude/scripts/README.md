## Scripts

`loc.py` counts the app's real code lines per area — TypeScript, TSX and CSS across the `Core`,
`UIX` and `Desktop` workspaces, with comments, blank lines, tests, type shims, build configuration
and the `Dashboard` excluded. Run it bare for the working tree, or with `--history` for one sample
per day of the branch. Both forms emit the eight areas in stack order alongside a file census —
per-area source files, and the whole tree split into source, tests and config — and `--history` also
carries the swatch colors and the head SHA. Each day's sample holds four arrays per area: the source
lines, the import and export lines among them (import statements, re-exports and export lists, and
stylesheet imports), the comment lines dropped beside them, and the code lines of the area's test
files, so the dashboard folds each group in or out without re-measuring. A file's kind is decided by
`classify`: a name carrying `.test.` or `.spec.`, or a path under a testing or fixtures folder, is a
test; build and tooling files, the Vite and Vitest configuration and setup, and the `.d.ts` shims
are config and stay out of every count; the rest of the TypeScript, TSX and CSS is source. Each area
lists the pre-monorepo paths it was assembled from as well as its current ones, so a single map
measures every commit on the branch and the earlier samples stay comparable; the one area that
changed name carries its stored samples over through `RENAMED_FROM`.

`loc.py --update` folds HEAD alone into `Dashboard/Ledger/loc-history.json`, the file the dashboard
page imports at build time. The series holds one sample per day, so a commit touches exactly one
row — measuring that commit's own archive answers it in a fraction of a second, where `--history`
re-walks every day of the branch. It reads the commit rather than the working tree, so uncommitted
work is never counted against a commit that doesn't contain it. A commit that moved no code leaves
the file untouched, so the refresh itself does not dirty the tree; where code did move, the refresh
lands in the working tree and the next commit carries it. `head` names the commit the numbers were
measured at.

`loc.py --rebuild` re-walks the branch and rewrites the JSON from scratch — the run for when the area
map or the counted groups change.

`comment-ledger.mjs` measures the comment mass of `Core`, `UIX` and `Desktop`'s TypeScript and
proves a stripping pass touched nothing else. `--snapshot` writes `comment-baseline.json` — per-file
comment characters, comment count, and a hash of the file's non-trivia token stream. `--verify`
re-measures against it, reports the reduction per directory, and exits non-zero naming any file
whose token stream moved; because whitespace is trivia and never enters the hash, a Biome reformat
cannot mask a real edit. It also pins the count of each tool-read directive (`biome-ignore`, `KNOB`,
`@vitest-environment`), whose deletion the token hash cannot see. `comment-units.json` divides the
tree into work units of roughly equal comment mass; `--unit N` prints one unit's file list and
character floor, and passing the same id to `--verify` scopes the check to it.

`comment-manifest.mjs` run bare is the comment-line census: every source and stylesheet file in the
three workspaces with the number of lines its comments occupy, and the list of any above the
twenty-line cap. Given a base revision it instead lists every substantial comment a stripping pass
deleted outright, so the deletions can be read rather than trusted, and reports the `{}` a deleted
JSX comment leaves behind. A second argument scopes it to a unit, a third raises the character floor
on what counts as substantial.

`check-atlas.mjs` verifies the token ledger: every `**SOURCE:**`-tagged table in `// Features` must
agree with the code files its SOURCE line names — each backticked token in a row's second column and
each literal value in its third must appear in those files. `UIX/Theme`'s `theme-vars.css.ts`,
`colors.ts` and `color.css.ts` are an implicit source for every `--var` handle, since the theme
republishes hashed tokens under stable names. Exit 0 means the tables agree; drift is listed per
table.

`loc.py` and `check-atlas.mjs` run after every commit through the versioned git hook
`../hooks/post-commit`, which runs `loc.py --update`, builds the two dashboard pages
(`npm run build:dashboard`), and runs `check-atlas.mjs`. Because it is a native git hook rather than
a tool-side one, it sees every commit — a terminal, an editor, or any agent — not only the ones made
through a particular tool. Git looks for hooks under `.git/hooks` by default, so one command per
clone points it at the versioned directory instead:

```
git config core.hooksPath .claude/hooks
```

The built pages under `Dashboard/dist` are published as two claude.ai artifacts — the Pommora
Dashboard (the ledger) and the Pommora Showcase (the design system); `Dashboard/README.md` carries
their URLs. The post-commit hook keeps the builds current on every commit; re-publishing them is a
separate step, because no shell hook can reach the publish API. `../hooks/republish-dashboard.mjs` —
a `PostToolUse` hook on the Bash tool, declared in `../settings.json` — bridges the gap during a
Claude session: after a commit, it compares each build against the hash recorded at its last
republish and asks Claude to republish the pages that moved, so the artifacts track the local build
while work is underway. The records sit at `dashboard-published` and `showcase-published` inside the
git dir. Commits made outside a session leave the artifacts to the next republish.
