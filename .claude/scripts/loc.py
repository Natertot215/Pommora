#!/usr/bin/env python3
"""Real code lines per area of the Pommora app.

Counts .ts / .tsx / .css across the workspaces, excluding blank lines, comment lines, test files,
type declaration shims, build configuration, and anything outside a workspace (node_modules, dist).
Beside the count, each area carries the import and export lines inside it, the comment lines it
dropped, and the code lines of its test files, so the dashboard can fold each back in on demand.

  loc.py            -> JSON for the working tree
  loc.py --history  -> JSON with one sample per day of main's history
  loc.py --update   -> fold HEAD into the dashboard's loc-history.json
  loc.py --rebuild  -> rewrite loc-history.json from the branch's history
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import tempfile
from typing import NamedTuple

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
WORKSPACES = ["Core", "UIX", "Desktop"]

# The pre-monorepo layout. Every area lists the old prefixes it was assembled from, so one map
# measures every commit on the branch and the earlier samples stay comparable.
LEGACY_ROOT = "Pommora/src"

# The dashboard is not the app: its lines are excluded here and at every prefix it ever sat under,
# so a legacy path does not fall through to App Chrome.
SKIP_PREFIX = ["Dashboard", "Showcase", "renderer/Showcase"]

# Ordered: the first matching prefix wins, so specific paths precede their parents. Each entry is
# (area, new prefixes, prefixes under the legacy root).
AREAS = [
    ("Editor — MarkdownPM", ["Core/MarkdownPM"], ["renderer/MarkdownPM"]),
    ("Pommora UIX", ["UIX"], ["renderer/DesignSystem"]),
    (
        "Surfaces & Embeds",
        ["Core/Tiles", "Core/Web"],
        ["renderer/Tiles", "renderer/SurfacePM", "renderer/Blocks", "renderer/Embeds", "renderer/PagePreview"],
    ),
    (
        "Views & Properties",
        ["Core/Views", "Core/Properties"],
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
    ("Shared Contract", ["Core/Contract", "Core/Platform", "Desktop/Bridge"], ["shared", "preload"]),
    (
        "Nexus & Data",
        [
            "Core/Actions",
            "Core/Assets",
            "Core/Connections",
            "Core/Contexts",
            "Core/Files",
            "Core/Index",
            "Core/Nexus",
            "Core/Pages",
            "Core/Paths",
            "Core/Trash",
        ],
        ["main"],
    ),
    ("App Chrome", ["Core"], ["renderer"]),
    ("Desktop Shell", ["Desktop"], []),
]

# Areas that changed name with the tree, so a stored sample keyed by the old name still reads.
RENAMED_FROM = {"Nexus & Data": "Main Process", "Pommora UIX": "Design System"}

# Stack order and swatch, bottom of the chart first.
ORDER = [
    "Desktop Shell",
    "Views & Properties",
    "Nexus & Data",
    "Editor — MarkdownPM",
    "Pommora UIX",
    "App Chrome",
    "Surfaces & Embeds",
    "Shared Contract",
]
COLORS = [
    "#0E7C86",
    "#1C7629",
    "#075CB2",
    "#8C7606",
    "#DC519F",
    "#B26F07",
    "#A24CCE",
    "#D93B31",
]

SKIP_DIR = {"node_modules", "dist", "out", ".git"}
EXT = (".ts", ".tsx", ".css")


def area_of(rel: str) -> str | None:
    if rel.startswith(LEGACY_ROOT + "/"):
        legacy = rel[len(LEGACY_ROOT) + 1 :]
        if legacy.startswith("renderer/src/"):
            legacy = "renderer/" + legacy[len("renderer/src/") :]
        if any(legacy == p or legacy.startswith(p + "/") for p in SKIP_PREFIX):
            return None
        for name, _, prefixes in AREAS:
            if any(legacy == p or legacy.startswith(p + "/") for p in prefixes):
                return name
        return None
    if any(rel == p or rel.startswith(p + "/") for p in SKIP_PREFIX):
        return None
    for name, prefixes, _ in AREAS:
        if any(rel == p or rel.startswith(p + "/") for p in prefixes):
            return name
    return None


# A file's kind, for the census beside the line count. Only `source` is measured in lines; the other
# two are counted so the page states what the line total leaves out rather than hiding it.
TEST_DIRS = {"Testing", "fixtures", "__tests__"}
# A harness is scaffolding a test imports, wherever it sits: it carries no product behavior and is
# named for what it stands in for, so the name is what places it rather than the folder.
TEST_SUFFIX = "Harness.ts"
CONFIG_NAMES = {"package.json", "biome.json", "vercel.json"}
CONFIG_EXT = (".yml", ".yaml")
# A manifest generated wholesale from a dependency's icon roster, not authored source; excluded from
# the ledger entirely so its bulk never reads as hand-written code.
GENERATED = {"UIX/Symbols/iconNames.ts"}


def classify(rel: str) -> str | None:
    base = os.path.basename(rel)
    if any(p in SKIP_DIR for p in rel.split("/")):
        return None
    if rel in GENERATED:
        return None
    if (
        any(p in TEST_DIRS for p in rel.split("/"))
        or ".test." in base
        or ".spec." in base
        or base.endswith(TEST_SUFFIX)
    ):
        return "tests"
    if (
        base.endswith((".d.ts", ".config.ts", ".setup.ts", *CONFIG_EXT))
        or base in CONFIG_NAMES
        or (base.startswith("tsconfig") and base.endswith(".json"))
    ):
        return "config"
    return "source" if rel.endswith(EXT) else None


BLOCK_OPEN = re.compile(r"/\*")
BLOCK_CLOSE = re.compile(r"\*/")
# An import statement, a re-export or export list, or a stylesheet import. Declarations that happen
# to be exported (`export const`) are code; a dynamic `import(` inside a body is too.
IO_START = re.compile(r"^(import\s(?!\()|import\{|export\s+(type\s+)?\{|export\s+(type\s+)?\*|@import\b)")


class Lines(NamedTuple):
    code: int
    io: int
    comments: int


def count_lines(text: str) -> Lines:
    """Non-blank, non-comment lines, with the import/export lines among them and the comment lines
    dropped counted beside. A multi-line import stays an import line until its specifier closes."""
    code = io = comments = 0
    in_block = False
    in_io = False
    for raw in text.split("\n"):
        line = raw.strip()
        if in_block:
            comments += 1
            if BLOCK_CLOSE.search(line):
                in_block = False
                line = line.split("*/", 1)[1].strip()
                if not line:
                    continue
                comments -= 1
            else:
                continue
        if not line:
            continue
        if line.startswith("//"):
            comments += 1
            continue
        if BLOCK_OPEN.match(line):
            if not BLOCK_CLOSE.search(line):
                in_block = True
                comments += 1
                continue
            line = line.split("*/", 1)[1].strip()
            if not line:
                comments += 1
                continue
        code += 1
        if in_io or IO_START.match(line):
            io += 1
            ends = line.endswith(("'", '"', ";")) or ("}" in line and "from" not in line)
            in_io = not ends
    return Lines(code, io, comments)


class Census(NamedTuple):
    lines: dict[str, int]
    io: dict[str, int]
    comments: dict[str, int]
    tests: dict[str, int]
    files: dict[str, int]
    kinds: dict[str, int]


def measure_tree(base: str) -> Census:
    """base holds a checkout: the workspaces at its root, or the pre-monorepo Pommora/src."""
    per_area = lambda: {name: 0 for name in ORDER}
    lines, io, comments, tests, files = per_area(), per_area(), per_area(), per_area(), per_area()
    kinds: dict[str, int] = {"source": 0, "tests": 0, "config": 0}
    for root in [*WORKSPACES, LEGACY_ROOT]:
        top = os.path.join(base, root)
        if not os.path.isdir(top):
            continue
        for dirpath, dirnames, filenames in os.walk(top):
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIR]
            for f in filenames:
                full = os.path.join(dirpath, f)
                rel = os.path.relpath(full, base)
                kind = classify(rel)
                area = area_of(rel)
                if kind is None or area is None:
                    continue
                kinds[kind] += 1
                if kind == "config" or not rel.endswith(EXT):
                    continue
                with open(full, encoding="utf-8", errors="ignore") as fh:
                    counted = count_lines(fh.read())
                if kind == "tests":
                    tests[area] += counted.code
                    continue
                files[area] += 1
                lines[area] += counted.code
                io[area] += counted.io
                comments[area] += counted.comments
    return Census(lines, io, comments, tests, files, kinds)


def git(*args: str) -> str:
    return subprocess.check_output(["git", "-C", ROOT, *args], text=True)


def archive_paths(rev: str) -> list[str]:
    """Only the roots that commit actually holds — git archive fails on a pathspec matching none."""
    top = set(git("ls-tree", "--name-only", rev).split())
    paths = [w for w in WORKSPACES if w in top]
    if LEGACY_ROOT.split("/")[0] in top:
        paths.append(LEGACY_ROOT)
    return paths


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
                    ["git", "-C", ROOT, "archive", sha, *archive_paths(sha)],
                    capture_output=True,
                    check=True,
                )
            except subprocess.CalledProcessError:
                continue
            subprocess.run(["tar", "-x", "-C", tmp], input=tar.stdout, check=True)
            census = measure_tree(tmp)
        if sum(census.lines.values()) == 0:
            continue
        out.append(sample(date, census))
        print(f"  {date}  {sum(census.lines.values()):>7}", file=sys.stderr)
    return out


def sample(date: str, census: Census) -> dict:
    """One day of the series: per area, the source lines, the import and export lines among them,
    the comment lines beside them, and the code lines of the area's tests."""
    return {
        "d": date,
        "v": [census.lines[a] for a in ORDER],
        "io": [census.io[a] for a in ORDER],
        "c": [census.comments[a] for a in ORDER],
        "t": [census.tests[a] for a in ORDER],
    }


# The dashboard imports the series at build time, so the data lives beside the page that reads it.
HISTORY_JSON = os.path.join(ROOT, "Dashboard", "Ledger", "loc-history.json")


def measure_commit(rev: str) -> Census:
    """The tree as that commit recorded it — never the working one, which may hold anyone's
    uncommitted work and would attribute it to a commit that doesn't contain it."""
    with tempfile.TemporaryDirectory() as tmp:
        tar = subprocess.run(
            ["git", "-C", ROOT, "archive", rev, *archive_paths(rev)], capture_output=True, check=True
        )
        subprocess.run(["tar", "-x", "-C", tmp], input=tar.stdout, check=True)
        return measure_tree(tmp)


def census_payload(census: Census) -> dict:
    """The file census as the page reads it: per-area source files, and the three kinds whole."""
    return {"files": [census.files[a] for a in ORDER], "kinds": census.kinds}


SERIES_KEYS = ("v", "io", "c", "t")


def migrate(payload: dict) -> dict:
    """Re-key a stored payload onto the current area list: a renamed area carries its samples over,
    an area the tree gained reads zero for every day before it existed."""
    stored = payload.get("areas", [])
    if stored == ORDER:
        return payload
    index = {name: i for i, name in enumerate(stored)}
    slots = [index.get(a, index.get(RENAMED_FROM.get(a, ""), -1)) for a in ORDER]
    payload["areas"] = ORDER
    payload["colors"] = COLORS
    payload["series"] = [
        {
            "d": s["d"],
            **{key: [s[key][k] if 0 <= k < len(s[key]) else 0 for k in slots] for key in SERIES_KEYS},
        }
        for s in payload["series"]
    ]
    return payload


def update() -> str:
    """Fold HEAD into the stored history.

    The series holds one sample per day, so a new commit touches exactly one row — the last one on
    its own date. Re-walking every day of the branch to learn that costs seconds and answers the
    same thing the archive of a single commit does.
    """
    date = git("log", "-1", "--format=%ad", "--date=short", "HEAD").strip()
    head = git("rev-parse", "--short", "HEAD").strip()
    census = measure_commit("HEAD")
    row = sample(date, census)
    counts = census_payload(census)

    with open(HISTORY_JSON, encoding="utf-8") as fh:
        payload = migrate(json.load(fh))
    # A commit that moved no code leaves the file alone. Rewriting it just to stamp a new SHA would
    # dirty the tree on every commit forever — including the commit that carries the refresh — so
    # `head` means the commit these numbers were measured at, which is the truthful reading anyway.
    if (
        payload["areas"] == ORDER
        and all(payload.get(k) == v for k, v in counts.items())
        and any(s == row for s in payload["series"])
    ):
        return f"{date}  {head}  unchanged"
    series = [s for s in payload["series"] if s["d"] != date]
    series.append(row)
    series.sort(key=lambda s: s["d"])
    payload["series"] = series
    payload["head"] = head
    payload.update(counts)

    write_payload(payload)
    return f"{date}  {head}  {sum(census.lines.values())} lines"


def write_payload(payload: dict) -> None:
    with open(HISTORY_JSON, "w", encoding="utf-8") as fh:
        fh.write(json.dumps(payload, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    if "--rebuild" in sys.argv:
        write_payload(
            {
                "areas": ORDER,
                "colors": COLORS,
                "series": history(),
                "head": git("rev-parse", "--short", "HEAD").strip(),
                **census_payload(measure_commit("HEAD")),
            }
        )
        print("line ledger: rebuilt from the branch's history")
        sys.exit(0)
    if "--update" in sys.argv:
        print(f"line ledger: {update()}")
        sys.exit(0)
    if "--history" in sys.argv:
        payload = {
            "areas": ORDER,
            "colors": COLORS,
            "series": history(),
            "head": git("rev-parse", "--short", "HEAD").strip(),
            **census_payload(measure_commit("HEAD")),
        }
    else:
        census = measure_tree(ROOT)
        payload = {
            "areas": ORDER,
            "head": git("rev-parse", "--short", "HEAD").strip(),
            **sample("working tree", census),
            "total": sum(census.lines.values()),
            **census_payload(census),
        }
    print(json.dumps(payload))
