#!/usr/bin/env python3
"""Real code lines per area of the Pommora app.

Counts .ts / .tsx / .css under Pommora/src, excluding blank lines, comment lines,
test files, type declaration shims, and anything outside the app source tree
(node_modules, dist, the monorepo's own tooling).

  loc.py            -> JSON for the working tree
  loc.py --history  -> JSON with one sample per day of main's history
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

# Ordered: the first matching prefix wins, so specific paths precede their parents.
AREAS = [
    ("Editor — MarkdownPM", ["renderer/src/MarkdownPM"]),
    ("Design System", ["renderer/src/design-system"]),
    (
        "Surfaces & Embeds",
        [
            "renderer/src/SurfacePM",
            "renderer/src/Blocks",
            "renderer/src/PagePreview",
            "renderer/src/Embeds",
        ],
    ),
    ("Views & Detail Pane", ["renderer/src/Detail", "renderer/src/Components"]),
    (
        "App Chrome",
        [
            "renderer/src/Navigation",
            "renderer/src/Sidebar",
            "renderer/src/Tabs",
            "renderer/src/Toolbar",
            "renderer/src/NavWindow",
            "renderer/src/Settings",
            "renderer",
        ],
    ),
    ("Main Process", ["main"]),
    ("Shared Contract", ["shared", "preload"]),
]

# Stack order and swatch, bottom of the chart first.
ORDER = [
    "Views & Detail Pane",
    "Main Process",
    "Editor — MarkdownPM",
    "Design System",
    "App Chrome",
    "Surfaces & Embeds",
    "Shared Contract",
]
COLORS = ["#1C7629", "#075CB2", "#8C7606", "#DC519F", "#B26F07", "#A24CCE", "#D93B31"]

SKIP_DIR = {"node_modules", "dist", "out", ".git", "showcase", "testing"}
EXT = (".ts", ".tsx", ".css")


def area_of(rel: str) -> str | None:
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


if __name__ == "__main__":
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
