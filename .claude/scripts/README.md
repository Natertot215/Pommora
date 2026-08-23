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
refresh itself does not dirty the tree.

`post-commit` runs `--update` after every commit; `install-hooks.sh` copies it into `.git/hooks`,
which isn't versioned and so starts empty in a fresh clone.

`Line-Ledger.html` reads that data and is published at
https://claude.ai/code/artifact/9172cda5-707d-4b69-aaed-d154dd2dd485. The hook keeps the local file
current; publishing it to that URL is a separate step, and the hook's output says so.

`loc-history.json` is the data the page currently holds.
