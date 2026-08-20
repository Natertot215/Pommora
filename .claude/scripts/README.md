## Scripts

`loc.py` counts the app's real code lines per area — TypeScript, TSX and CSS with comments, blank
lines, tests, type shims and the deployed showcase excluded. Run it bare for the working tree, or
with `--history` for one sample per day of the branch.

`Line-Ledger.html` reads that output and is published at
https://claude.ai/code/artifact/9172cda5-707d-4b69-aaed-d154dd2dd485. To refresh it: re-run
`loc.py --history`, replace the JSON blob in the page's trailing `<script id="data">` tag, and
republish to that same URL. The page's `baseline` field is frozen at `d5c4413d`, which is what its
Removed column measures against.

`loc-history.json` is the data the published page currently holds.
