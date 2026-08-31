## Scripts

`loc.py` counts the app's real code lines per system — TypeScript, TSX and CSS with comments, blank
lines, tests, type shims and the deployed showcase excluded. Run it bare for the working tree, or
with `--history` for one sample per day of the branch. Both forms emit the seven systems in stack
order; `--history` also carries the swatch colors and the head SHA.

`loc.py --update` folds HEAD alone into `loc-history.json` and into the ledger page's data tag. The
series holds one sample per day, so a commit touches exactly one row — measuring that commit's own
archive answers it in a fraction of a second, where `--history` re-walks every day of the branch.
It reads the commit rather than the working tree, so uncommitted work is never counted against a
commit that doesn't contain it. A commit that moved no code leaves the page untouched, so the
refresh itself does not dirty the tree; where code did move, the hook amends the refreshed files
into that same commit, so the numbers ship with the code they describe. `head` still names the
commit the numbers were measured at, which the amend leaves standing — it adds the ledger, not code.
A commit the remote already holds is never amended: the refresh is left in the tree for the next
one, and the hook says so.

`loc.py --rebuild` re-walks the branch and rewrites both the JSON and the page from scratch — the run for when the area map changes.

`check-atlas.mjs` verifies the token ledger: every `**SOURCE:**`-tagged table in `// Features` must agree with the code files its SOURCE line names — each backticked token in a row's second column and each literal value in its third must appear in those files. Exit 0 means the tables agree; drift is listed per table.

Both run after every commit through the versioned git hook `../hooks/post-commit`, which runs
`loc.py --update` and `check-atlas.mjs` and amends the refreshed ledger into the commit it measures.
Because it is a native git hook rather than a tool-side one, it sees every commit — a terminal, an
editor, or any agent — not only the ones made through a particular tool. Git looks for hooks under
`.git/hooks` by default, so one command per clone points it at the versioned directory instead:

```
git config core.hooksPath .claude/hooks
```

`Line-Ledger.html` reads that data and is published at
https://claude.ai/code/artifact/7840fc59-41d5-4692-b5b6-c45de4d11401. The post-commit hook keeps the
local file current on every commit; re-publishing it to that URL is a separate step, because no
shell hook can reach the publish API. `../hooks/republish-ledger.mjs` — a `PostToolUse` hook on the
Bash tool, declared in `../settings.json` — bridges the gap during a Claude session: when a commit
moves the page, it asks Claude to republish it, so the hosted URL tracks the local one while work is
underway. Commits made outside a session leave the URL to the next republish.

`loc-history.json` is the data the page currently holds.
