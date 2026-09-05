#!/usr/bin/env python3
"""Real code lines per area of the Pommora app.

Counts .ts / .tsx / .css under Pommora/src, excluding blank lines, comment lines,
test files, type declaration shims, and anything outside the app source tree
(node_modules, dist, the monorepo's own tooling).

  loc.py            -> JSON for the working tree
  loc.py --history  -> JSON with one sample per day of main's history
  loc.py --update   -> fold HEAD into loc-history.json and the Line-Ledger page
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = "Pommora/src"

# Ordered: the first matching prefix wins, so specific paths precede their parents. Paths are
# relative to Pommora/src with the renderer's old `renderer/src/` spelling folded into `renderer/`,
# so one map measures every commit on the branch; folders that were renamed list both names.
AREAS = [
    ("Editor — MarkdownPM", ["renderer/MarkdownPM"]),
    ("Design System", ["renderer/DesignSystem"]),
    (
        "Surfaces & Embeds",
        ["renderer/Tiles", "renderer/SurfacePM", "renderer/Blocks", "renderer/Embeds", "renderer/PagePreview"],
    ),
    (
        "Views & Properties",
        [
            "renderer/Views",
            "renderer/Tables",
            "renderer/Cards",
            "renderer/Properties",
            "renderer/Frames",
            "renderer/Components",
            "renderer/Detail",
        ],
    ),
    ("App Chrome", ["renderer"]),
    ("Main Process", ["main"]),
    ("Shared Contract", ["shared", "preload"]),
]

# Stack order and swatch, bottom of the chart first.
ORDER = [
    "Views & Properties",
    "Main Process",
    "Editor — MarkdownPM",
    "Design System",
    "App Chrome",
    "Surfaces & Embeds",
    "Shared Contract",
]
COLORS = ["#1C7629", "#075CB2", "#8C7606", "#DC519F", "#B26F07", "#A24CCE", "#D93B31"]

SKIP_DIR = {"node_modules", "dist", "out", ".git", "Showcase", "testing"}
EXT = (".ts", ".tsx", ".css")


def area_of(rel: str) -> str | None:
    if rel.startswith("renderer/src/"):
        rel = "renderer/" + rel[len("renderer/src/") :]
    for name, prefixes in AREAS:
        for p in prefixes:
            if rel == p or rel.startswith(p + "/"):
                return name
    return None


def countable(rel: str) -> bool:
    base = os.path.basename(rel)
    if not rel.endswith(EXT):
        return False
    if ".test." in base or ".spec." in base or base.endswith(".d.ts"):
        return False
    parts = rel.split("/")
    return not any(p in SKIP_DIR for p in parts)


BLOCK_OPEN = re.compile(r"/\*")
BLOCK_CLOSE = re.compile(r"\*/")


def code_lines(text: str) -> int:
    n = 0
    in_block = False
    for raw in text.split("\n"):
        line = raw.strip()
        if in_block:
            if BLOCK_CLOSE.search(line):
                in_block = False
                line = line.split("*/", 1)[1].strip()
                if not line:
                    continue
            else:
                continue
        if not line:
            continue
        if line.startswith("//"):
            continue
        if BLOCK_OPEN.match(line):
            if not BLOCK_CLOSE.search(line):
                in_block = True
                continue
            line = line.split("*/", 1)[1].strip()
            if not line:
                continue
        n += 1
    return n


def measure_tree(base: str) -> dict[str, int]:
    """base holds a checkout whose Pommora/src sits at <base>/Pommora/src."""
    totals: dict[str, int] = {name: 0 for name, _ in AREAS}
    src = os.path.join(base, SRC)
    if not os.path.isdir(src):
        return totals
    for dirpath, dirnames, filenames in os.walk(src):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIR]
        for f in filenames:
            full = os.path.join(dirpath, f)
            rel = os.path.relpath(full, src)
            if not countable(rel):
                continue
            area = area_of(rel)
            if area is None:
                continue
            with open(full, encoding="utf-8", errors="ignore") as fh:
                totals[area] += code_lines(fh.read())
    return totals


def git(*args: str) -> str:
    return subprocess.check_output(["git", "-C", ROOT, *args], text=True)


def history() -> list[dict]:
    log = git(
        "log", "--first-parent", "--reverse", "--format=%H %ad", "--date=short", "HEAD"
    ).strip().split("\n")
    per_day: dict[str, str] = {}
    for line in log:
        sha, date = line.split(" ", 1)
        per_day[date] = sha
    out = []
    for date in sorted(per_day):
        sha = per_day[date]
        with tempfile.TemporaryDirectory() as tmp:
            try:
                tar = subprocess.run(
                    ["git", "-C", ROOT, "archive", sha, SRC],
                    capture_output=True,
                    check=True,
                )
            except subprocess.CalledProcessError:
                continue
            subprocess.run(["tar", "-x", "-C", tmp], input=tar.stdout, check=True)
            totals = measure_tree(tmp)
        if sum(totals.values()) == 0:
            continue
        out.append({"d": date, "v": [totals[a] for a in ORDER]})
        print(f"  {date}  {sum(totals.values()):>7}", file=sys.stderr)
    return out


HERE = os.path.dirname(os.path.abspath(__file__))
HISTORY_JSON = os.path.join(HERE, "loc-history.json")
LEDGER_HTML = os.path.join(HERE, "Line-Ledger.html")
DATA_TAG = re.compile(r'(<script id="data" type="application/json">).*?(</script>)', re.S)
LEDGER_URL = "https://claude.ai/code/artifact/7840fc59-41d5-4692-b5b6-c45de4d11401"


def measure_commit(rev: str) -> dict[str, int]:
    """The tree as that commit recorded it — never the working one, which may hold anyone's
    uncommitted work and would attribute it to a commit that doesn't contain it."""
    with tempfile.TemporaryDirectory() as tmp:
        tar = subprocess.run(
            ["git", "-C", ROOT, "archive", rev, SRC], capture_output=True, check=True
        )
        subprocess.run(["tar", "-x", "-C", tmp], input=tar.stdout, check=True)
        return measure_tree(tmp)


def update() -> str:
    """Fold HEAD into the stored history and the page that reads it.

    The series holds one sample per day, so a new commit touches exactly one row — the last one on
    its own date. Re-walking every day of the branch to learn that costs seconds and answers the
    same thing the archive of a single commit does.
    """
    date = git("log", "-1", "--format=%ad", "--date=short", "HEAD").strip()
    head = git("rev-parse", "--short", "HEAD").strip()
    totals = measure_commit("HEAD")
    row = {"d": date, "v": [totals[a] for a in ORDER]}

    with open(HISTORY_JSON, encoding="utf-8") as fh:
        payload = json.load(fh)
    # A commit that moved no code leaves the page alone. Rewriting it just to stamp a new SHA would
    # dirty the tree on every commit forever — including the commit that carries the refresh — so
    # `head` means the commit these numbers were measured at, which is the truthful reading anyway.
    if any(s["d"] == date and s["v"] == row["v"] for s in payload["series"]):
        return f"{date}  {head}  unchanged"
    series = [s for s in payload["series"] if s["d"] != date]
    series.append(row)
    series.sort(key=lambda s: s["d"])
    payload["series"] = series
    payload["head"] = head

    write_payload(payload)
    return f"{date}  {head}  {sum(totals.values())} lines"


def write_payload(payload: dict) -> None:
    blob = json.dumps(payload, ensure_ascii=False)
    with open(HISTORY_JSON, "w", encoding="utf-8") as fh:
        fh.write(blob + "\n")
    with open(LEDGER_HTML, encoding="utf-8") as fh:
        page = fh.read()
    if not DATA_TAG.search(page):
        raise SystemExit("Line-Ledger.html has no <script id=\"data\"> tag to fill")
    with open(LEDGER_HTML, "w", encoding="utf-8") as fh:
        fh.write(DATA_TAG.sub(lambda m: m.group(1) + blob + m.group(2), page, count=1))


if __name__ == "__main__":
    if "--rebuild" in sys.argv:
        write_payload(
            {
                "areas": ORDER,
                "colors": COLORS,
                "series": history(),
                "head": git("rev-parse", "--short", "HEAD").strip(),
            }
        )
        print("line ledger: rebuilt from the branch's history")
        sys.exit(0)
    if "--update" in sys.argv:
        print(f"line ledger: {update()}")
        print(f"  republish {os.path.relpath(LEDGER_HTML, ROOT)} to {LEDGER_URL}")
        sys.exit(0)
    if "--history" in sys.argv:
        payload = {
            "areas": ORDER,
            "colors": COLORS,
            "series": history(),
            "head": git("rev-parse", "--short", "HEAD").strip(),
        }
    else:
        totals = measure_tree(ROOT)
        payload = {
            "areas": ORDER,
            "head": git("rev-parse", "--short", "HEAD").strip(),
            "totals": [totals[a] for a in ORDER],
            "total": sum(totals.values()),
        }
    print(json.dumps(payload))
