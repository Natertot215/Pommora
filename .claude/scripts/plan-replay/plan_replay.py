#!/usr/bin/env python3
"""usage: plan_replay.py check <plan.md> --out <dir> [--base <commit>] [--skip <task>:<n>[,<n>…] …] [--outcome <rule>=<outcome> …]
       plan_replay.py measure <plan.md> [--tasks] [--json <path>] [--base <commit>] [--skip <task>:<n>[,<n>…] …] [--outcome <rule>=<outcome> …]
       plan_replay.py apply <plan.md> <task-id> [--skip <n>[,<n>…] …] [--outcome <rule>=<outcome> …] [--dry-run] [--base <commit>]
"""
import argparse, collections, json, os, re, shutil, subprocess, sys, tempfile
from dataclasses import dataclass, field

FENCE = re.compile(r'^```(.+?)\s+(diff|\(.*\))\s*$')
PHASE = re.compile(r'^### Phase (\S+)')
TASK = re.compile(r'^#### Task (\S+)')
ONLY = re.compile(r"^\*Only on (.+)'s (.+):\*$")
LABEL = re.compile(r'^\*\*([A-Z][A-Z ]*[A-Z]):?\*\*')
MV = re.compile(r'git mv ([^\s`]+) ([^\s`]+)')
MV_ARROW = re.compile(r'`([\w./]+\.tsx?)` → `([\w./]+\.tsx?)`')
ELIDE = re.compile('[…⋯]')
SUMMARY = re.compile(r'^(.*?)….*?\([^)]*?:(\d+)[-–](\d+)[^)]*\)\s*$')
CITE = re.compile(r'(?:HEAD\s+|from\s+`?|`)([^`:()]+?\.(?:tsx?|jsx?|mjs|css|json))`?:(\d+)[-–](\d+)')
RANGE = re.compile(r':(\d+)[-–](\d+)')
PLURAL = re.compile(r'\b(again|each|every|both|all)\b|:\d+\D+:\d+')
SPEC = re.compile(r"""(from\s+|import\s*\(\s*|import\s+)(['"])([^'"]+)\2""")
DECL = r'^\s*(export )?(default )?(async )?(function|const|let|interface|type|class|enum) {}\b'
IMPORT = re.compile(r"""^\s*import\s+(type\s+)?([^'"]*?)\s+from\s+['"]([^'"]+)['"]""", re.M | re.S)
DECL_ANY = re.compile(r'^(?:export\s+)?(?:default\s+)?(?:declare\s+)?(?:async\s+)?(?:function\*?|const|let|var|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)', re.M)
TEST = re.compile(r'(\.|_|/)(test|spec)s?[./]')
CONTINUES = ('=>', '=', '(', '?', '&&', '||')
LEADS = ('.', '?', ':', '&&', '||')
CODE_EXT = ('.ts', '.tsx', '.mjs')
BIOME_EXT = ('.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css', '.json', '.jsonc')
COMMENTS = {ext: marks for exts, marks in (
    (('.py', '.sh', '.zsh', '.rb', '.toml', '.yml', '.yaml'), ('#',)),
    (('.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.swift', '.css', '.scss', '.jsonc'), ('//', '/*', '*')),
    (('.html', '.svg', '.xml'), ('<!--',)),
) for ext in exts}


@dataclass
class Block:
    n: int
    line: int
    path: str
    kind: str
    body: list
    outcome: tuple = None


@dataclass
class Task:
    id: str
    phase: str
    steps: list = field(default_factory=list)


@dataclass
class Outcome:
    task: str
    block: int
    line: int
    path: str
    ok: bool
    what: str
    anchor: str = None
    cause: str = None
    hunk: list = None
    snap: list = None


def parse(plan):
    tasks, phase, task, label, i, prev = [], None, None, None, 0, ''
    lines = open(plan).read().split('\n')
    while i < len(lines):
        line = lines[i]
        i += 1
        if line.startswith(('### ', '#### ')):
            m = PHASE.match(line)
            phase = m.group(1) if m else phase if line.startswith('#### ') else None
            m = TASK.match(line)
            task = Task(m.group(1), phase) if m and phase else None
            tasks += [task] if task else []
            label = None
            continue
        m = LABEL.match(line)
        label = m.group(1) if m else label
        m = FENCE.match(line)
        if m:
            start, body = i, []
            while i < len(lines) and lines[i] != '```':
                body.append(lines[i])
                i += 1
            i += 1
            if task:
                only = ONLY.match(prev)
                task.steps.append(Block(sum(isinstance(s, Block) for s in task.steps) + 1, start, m.group(1), m.group(2), body, only and only.groups()))
            line = '```'
        elif task and label == 'CHANGE':
            task.steps.append((i, line))
        prev = line if line.strip() else prev
    return tasks


def git(repo, *args):
    return subprocess.run(['git', '-C', repo, *args], capture_output=True, text=True, check=True).stdout


class Source:
    def __init__(self, repo, base, live):
        self.repo, self.base, self.live, self.cache, self.cat = repo, base, live, {}, None
        self.tracked = set((git(repo, 'ls-files', '--cached', '--others', '--exclude-standard') if live else git(repo, 'ls-tree', '-r', '--name-only', base)).splitlines())

    def at_base(self, path):
        if path not in self.cache:
            if self.cat is None:
                self.cat = subprocess.Popen(['git', '-C', self.repo, 'cat-file', '--batch'], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
            self.cat.stdin.write(f'{self.base}:{path}\n'.encode())
            self.cat.stdin.flush()
            head = self.cat.stdout.readline().split()
            data = None if head[-1] in (b'missing', b'ambiguous') else self.cat.stdout.read(int(head[2]) + 1)[:-1]
            self.cache[path] = data.decode('utf-8', 'replace').split('\n') if data is not None else None
        return self.cache[path]

    def read(self, path):
        if not self.live:
            return self.at_base(path)
        full = os.path.join(self.repo, path)
        return open(full, errors='replace').read().split('\n') if os.path.isfile(full) else None

    def find(self, path, tree=None):
        known = tree.known() if tree else self.tracked
        if path in known:
            return path
        hits = [k for k in known if k.endswith('/' + path)]
        return hits[0] if len(hits) == 1 else None


class Tree:
    def __init__(self, src):
        self.src, self.state, self.snap, self.gone = src, {}, {}, set()

    def get(self, path):
        if path not in self.state:
            got = self.src.read(path)
            self.state[path] = list(got) if got is not None else None
        return self.state[path]

    def set(self, path, lines):
        self.snap.setdefault(path, self.get(path))
        if lines is None and self.get(path) is not None:
            self.gone.add(path)
        self.state[path] = lines

    def known(self):
        return (self.src.tracked | {k for k, v in self.state.items() if v is not None}) - {k for k, v in self.state.items() if v is None}


def resolve(importer, spec):
    if spec.startswith('@pommora/uix/'):
        return 'UIX/' + spec[len('@pommora/uix/'):]
    return os.path.normpath(os.path.join(os.path.dirname(importer), spec)) if spec.startswith('.') else None


def spec_for(importer, target):
    if target.startswith('UIX/') and not importer.startswith('UIX/'):
        return '@pommora/uix/' + target[4:]
    rel = os.path.relpath(target, os.path.dirname(importer))
    return rel if rel.startswith('.') else './' + rel


def strip_ext(path):
    return next((path[:-len(e)] for e in ('.tsx', '.ts', '.mjs') if path.endswith(e)), path)


def move(tree, a, b):
    if tree.get(a) is None:
        return f'`{a}` is absent'
    if tree.get(b) is not None:
        return f'`{b}` already exists'
    tree.set(b, tree.get(a))
    tree.set(a, None)
    if not a.endswith(CODE_EXT):
        return None
    old, new = strip_ext(a), strip_ext(b)
    for path in sorted(p for p in tree.known() if p.endswith(CODE_EXT)):
        lines, origin, changed = tree.get(path), a if path == b else path, False
        if lines is None:
            continue

        def sub(m):
            nonlocal changed
            target = resolve(origin, m.group(3))
            if path == b and target is not None and target != old:
                spec = spec_for(b, target)
            elif target == old:
                spec = spec_for(path, new)
            else:
                return m.group(0)
            changed |= spec != m.group(3)
            return m.group(1) + m.group(2) + spec + m.group(2)
        out = [SPEC.sub(sub, line) if ('from' in line or 'import' in line) else line for line in lines]
        if changed:
            tree.set(path, out)
    return None


def gone_paths(line, tree):
    paths = []
    for chunk in re.findall(r'git rm ([^`]+)`', line):
        paths += chunk.split()
    if re.match(r'\s*- (\[ \] )?', line):
        for lst in re.findall(r'(?:[Dd]eletes?|[Rr]emoves?)\b\s+((?:`[^`]+`(?!\s*["“]|\'s\b)(?:,\s*and\s+|,\s*|\s+and\s+)?)+)', line):
            paths += re.findall(r'`([^`]+)`', lst)
        paths += re.findall(r'`([^`\s]+)`\s+(?:leaves|is deleted|are deleted)\b', line)
    out, last_dir = [], None
    for g in paths:
        if not re.search(r'\.(tsx?|json|css)$', g):
            continue
        if '/' in g:
            last_dir = g.rsplit('/', 1)[0]
            out.append(g)
        elif last_dir and tree.get(last_dir + '/' + g) is not None:
            out.append(last_dir + '/' + g)
        elif tree.src.find(g, tree):
            out.append(tree.src.find(g, tree))
    return out


def norm(s):
    return re.sub(r'\s+', ' ', s.strip())


def spec_base(s):
    return re.sub(r"""(from\s*)(['"])[^'"]*\2""", r'\1<spec>', s) if ('from' in s or 'import' in s) else s


def matches(pattern, line):
    p, l = spec_base(norm(pattern)), spec_base(norm(line))
    if ELIDE.search(p):
        m = re.fullmatch('(.*)'.join(re.escape(x) for x in ELIDE.split(p)), l)
        return list(m.groups()) if m else None
    return [] if p == l else None


def split_tag(h):
    return (h[0], h[1:]) if h[:1] != '' and h[0] in ' +-' else (' ', h)


def is_gap(line):
    body = norm(line[1:] if line[:1] != '' and line[0] in ' -' else line)
    return line.startswith('~') or body.startswith(('…', '⋯', '// …')) or body == '...' or body.startswith('... (')


def summary(body):
    m = SUMMARY.match(body)
    if not m or not m.group(1).strip():
        return None
    return norm(m.group(1)), int(m.group(3)) - int(m.group(2)) + 1


def remark(path, body):
    return body.lstrip().startswith(COMMENTS.get(os.path.splitext(path)[1], ()))


def depth_of(line):
    t = re.sub(r"'[^']*'|\"[^\"]*\"|`[^`]*`", '', line)
    return sum(c in '{([' for c in t) - sum(c in '})]' for c in t), any(c in '{([' for c in t)


def balanced_end(lines, i):
    depth, opened = 0, False
    for j in range(i, len(lines)):
        d, o = depth_of(lines[j])
        depth, opened = depth + d, opened or o
        if depth <= 0 and (opened or j == i):
            return j
    return i


def block_end(lines, i):
    j = balanced_end(lines, i)
    while j + 1 < len(lines) and (lines[j].rstrip().endswith(CONTINUES) or lines[j + 1].lstrip().startswith(LEADS)):
        j = balanced_end(lines, j + 1)
    return j


def moved_key(path, body, tag):
    m = CITE.search(body) if tag == '+' else None
    if m:
        return os.path.basename(m.group(1)), int(m.group(2)), int(m.group(3))
    r = RANGE.findall(body) if tag == '-' and (summary(body) or ELIDE.match(norm(body))) else None
    return (os.path.basename(path), int(r[-1][0]), int(r[-1][1])) if r else None


class Ctx:
    def __init__(self, path, src, ledger):
        self.path, self.src, self.ledger = path, src, ledger


def added(body, ctx, covered):
    if not ELIDE.search(body) or ctx.path.endswith(('.md', '.mdx')) or remark(ctx.path, body):
        return [body], None
    key = moved_key(ctx.path, body, '+')
    if key and (summary(body) or ELIDE.match(norm(body))):
        if key in ctx.ledger:
            return ctx.ledger[key], None
        hit = ctx.src.find(CITE.search(body).group(1)) if summary(body) else None
        if hit and ctx.src.at_base(hit) is not None:
            return ctx.src.at_base(hit)[key[1] - 1:key[2]], None
        return None, f'elided: a moved-verbatim summary with no source in this run or at base: {body.strip()[:90]!r}'
    parts = ELIDE.split(body)
    if covered and len(parts) == len(covered) + 1:
        return [''.join(p + (covered[k] if k < len(covered) else '') for k, p in enumerate(parts))], None
    return None, f'elided: an addition the plan elides: {body.strip()[:90]!r}'


def try_apply(lines, hunk, start, ctx):
    out, i, gap, drop, gap_key, covered, taken, opened = [], start, False, False, None, None, {}, False
    for h in hunk:
        if is_gap(h):
            gap, drop = True, h[:1] == '-'
            gap_key = moved_key(ctx.path, h[1:], '-') if drop else None
            continue
        tag, body = split_tag(h)
        if tag == '+':
            got, why = added(body, ctx, covered)
            if got is None:
                return None, i, why
            out.extend(got)
            continue
        sm = summary(body)
        j = i
        if sm:
            if gap:
                while j < len(lines) and not norm(lines[j]).startswith(sm[0]):
                    j += 1
            if j >= len(lines) or not norm(lines[j]).startswith(sm[0]):
                return None, i, None
            end = j + sm[1]
        else:
            closer = gap and opened and norm(body)[:1] in '})]'
            depth, got = 0, matches(body, lines[j]) if j < len(lines) else None
            while got is None and gap and j < len(lines):
                depth += depth_of(lines[j])[0]
                j += 1
                got = matches(body, lines[j]) if j < len(lines) and not (closer and depth > 0) else None
            if got is None:
                return None, i, None
            covered = got or covered
            end = j + 1
        if gap and not drop:
            out.extend(lines[i:j])
        if gap_key:
            taken[gap_key] = lines[i:j]
        key = moved_key(ctx.path, body, tag)
        if key and tag == '-' and sm:
            taken[key] = lines[j:end]
        if tag == ' ':
            out.extend(lines[j:end])
        i, gap, gap_key, opened = end, False, None, depth_of(lines[end - 1])[0] > 0
    return (out, i, taken), i, None


def find_targets(lines, target):
    t = target.strip().strip('`')
    if re.fullmatch(r'[\w.]+', t):
        rx = re.compile(DECL.format(re.escape(t.split('.')[-1])))
        return [i for i, l in enumerate(lines) if rx.match(l)]
    head = re.sub(r'\)\s*$', '', t)
    return [i for i, l in enumerate(lines) if head and head in l]


def place_insert(lines, hunk, anchor, ctx, strict):
    adds = []
    for h in hunk:
        if h[:1] == '+':
            got, why = added(h[1:], ctx, None)
            if got is None:
                return None, None, why
            adds += got
    a = re.sub(r'^:[\d,-]+\s*·\s*', '', (anchor or '').strip())
    a = re.sub(r'\s*\(.*\)$', '', a) if not re.search(r"\('", a) else a
    if re.match(r'(at )?(the )?end( of (the )?file)?$', a) or a == 'eof':
        return lines + adds, len(lines) + 1, None
    if re.match(r'imports?$', a):
        last = -1
        for i, l in enumerate(lines):
            if l.startswith('import ') or l.startswith('} from '):
                last = block_end(lines, i) if l.startswith('import ') else i
        return lines[:last + 1] + adds + lines[last + 1:], last + 2, None
    m = re.search(r'(?:^|[,›;]\s*)(after|below|beside|before|above|inside|in)\s+([^,›;]+)', a) or re.match(r'()(.+)$', a)
    if not m:
        return None, None, 'anchor: an insertion with no before-text and no anchor'
    where, hits = m.group(1) or 'after', find_targets(lines, m.group(2))
    if not hits:
        return None, None, f'anchor: insertion with no before-text; anchor {a!r} not found in the file'
    many = f'ambiguous: anchor {a!r} names file lines {", ".join(str(h + 1) for h in hits)}' if len(hits) > 1 else None
    if strict and many:
        return None, None, many
    j = hits[0] - 1 if where in ('before', 'above') else block_end(lines, hits[0])
    return lines[:j + 1] + adds + lines[j + 1:], j + 2, many


def named(lines, anchor):
    names = re.findall(r'`([\w$.]+)`|\b([A-Za-z_$]*[a-z][A-Z_$\d][\w$]*)\b', anchor or '')
    found = [find_targets(lines, a or b) for a, b in names]
    return [(i, block_end(lines, i)) for hits in found if len(hits) == 1 for i in hits]


def apply_hunk(lines, hunk, anchor, ctx, strict):
    olds = [h for h in hunk if not is_gap(h) and h[:1] != '+']
    if not olds:
        return place_insert(lines, hunk, anchor, ctx, strict)
    first = split_tag(olds[0])[1]
    sm = summary(first)
    hits, best = [], (0, None)
    for s in range(len(lines)):
        if hits and s < hits[-1][1][1] or not (norm(lines[s]).startswith(sm[0]) if sm else matches(first, lines[s]) is not None):
            continue
        res, reached, why = try_apply(lines, hunk, s, ctx)
        if why:
            return None, None, why
        if res:
            hits.append((s, res))
        elif reached - s > best[0]:
            best = (reached - s, s)
    regions = named(lines, anchor)
    inside = [h for h in hits if any(a <= h[0] <= b for a, b in regions)]
    hits = inside or hits
    every = bool(anchor and PLURAL.search(anchor)) or len({r for r in regions for h in hits if r[0] <= h[0] <= r[1]}) > 1
    many = f'ambiguous: before-text matches at file lines {", ".join(str(s + 1) for s, _ in hits)}' if len(hits) > 1 and not every else None
    if many and strict:
        return None, None, many
    if not hits:
        if best[1] is None:
            return None, None, f'drift: first before-line not found: {first.strip()[:90]!r}'
        return None, None, f'drift: matched {best[0]} lines from file line {best[1] + 1}, then diverged at file line {sum(best) + 1}'
    chosen = hits if every else hits[:1]
    for s, (out, end, taken) in reversed(chosen):
        ctx.ledger.update(taken)
        lines = lines[:s] + out + lines[end:]
    return lines, ', '.join(str(s + 1) for s, _ in chosen), many


def split_hunks(body):
    hunks, cur, anchor, at = [], [], None, 0
    for k, line in enumerate(body):
        if line.startswith('@@'):
            if cur:
                hunks.append((anchor, cur, at))
            cur, anchor, at = [], line.strip('@ ').strip(), k + 1
        else:
            cur.append(line)
    if cur:
        hunks.append((anchor, cur, at))
    return [(a, h, at) for a, h, at in hunks if any(x.strip() for x in h)]


def keys(block, tag):
    return {k for h in block.body if h[:1] == tag for k in [moved_key(block.path, h[1:], tag)] if k}


def ordered(steps):
    blocks = [s for s in steps if isinstance(s, Block)]
    late = {b.n for k, b in enumerate(blocks) if keys(b, '+') & set().union(*(keys(c, '-') for c in blocks[k + 1:]))}
    return [s for s in steps if not (isinstance(s, Block) and s.n in late)] + [b for b in blocks if b.n in late]


def run_block(task, b, tree, ledger, strict):
    base = dict(task=task.id, block=b.n, line=b.line, path=b.path)
    if b.path.startswith('<') or 'throwaway' in b.kind:
        return [Outcome(ok=True, what='not applied (throwaway)', **base)]
    cur = tree.get(b.path)
    if b.kind != 'diff':
        if 'new' in b.kind and cur is not None and cur[:len(b.body)] != b.body:
            return [Outcome(ok=False, what='refused', cause='exists: a (new) block over a file that already exists', **base)]
        tree.set(b.path, b.body + [''])
        return [Outcome(ok=True, what='written whole', **base)]
    hunks = split_hunks(b.body)
    if any(re.match(r'~.*\b(whole file|the file after)', h) for h in b.body):
        tree.set(b.path, [h[1:] for h in b.body if h[:1] == '+'] + [''])
        return [Outcome(ok=True, what='written whole', **base)]
    if cur is None and hunks and all(h[:1] == '+' or not h.strip() for _, hk, _ in hunks for h in hk):
        tree.set(b.path, [h[1:] for _, hk, _ in hunks for h in hk if h[:1] == '+'] + [''])
        return [Outcome(ok=True, what='created', **base)]
    if cur is None and b.path in tree.gone and all(h[:1] in ('-', '@') or not h.strip() or is_gap(h) for h in b.body):
        return [Outcome(ok=True, what='already deleted', **base)]
    if cur is None:
        return [Outcome(ok=False, what='refused', cause='absent: the file is absent here (moved, removed, or never existed)', anchor=a, hunk=hk, line=b.line + at, **{k: v for k, v in base.items() if k != 'line'}) for a, hk, at in hunks]
    out, ctx = [], Ctx(b.path, tree.src, ledger)
    for anchor, hunk, at in hunks:
        snap = list(cur)
        new, where, why = apply_hunk(cur, hunk, anchor, ctx, strict)
        info = dict(task=task.id, block=b.n, line=b.line + at, path=b.path, anchor=anchor, hunk=hunk, snap=snap)
        if new is None:
            out.append(Outcome(ok=False, what='refused', cause=why, **info))
            continue
        cur = new
        out.append(Outcome(ok=True, what=f'applied at :{where}', cause=why, **info))
    tree.set(b.path, cur)
    return out


def run_task(task, tree, skip, strict, outcomes):
    out, ledger = [], {}
    for step in ordered(task.steps):
        if isinstance(step, Block):
            why = 'skipped' if step.n in skip else f"skipped, only on {step.outcome[0]}'s {step.outcome[1]}" if step.outcome and outcomes.get(step.outcome[0], 'Pass') != step.outcome[1] else None
            out += [Outcome(task.id, step.n, step.line, step.path, True, why)] if why else run_block(task, step, tree, ledger, strict)
            continue
        n, line = step
        pairs = MV.findall(line)
        if 'git mv' in line:
            for a, b in MV_ARROW.findall(line):
                src = tree.src.find(a, tree)
                pairs.append((src, src[:len(src) - len(a)] + b if '/' not in b else b) if src else (a, b))
        for a, b in pairs:
            why = move(tree, a, b)
            out.append(Outcome(task.id, 0, n, f'{a} → {b}', why is None, 'moved' if why is None else 'refused', cause=why and f'move: {why}'))
        for path in gone_paths(line, tree):
            had = tree.get(path) is not None
            tree.set(path, None)
            out.append(Outcome(task.id, 0, n, path, True, 'deleted' if had else 'already absent'))
    return out


def outcomes_of(args):
    return dict(o.split('=', 1) for o in args.outcome)


def parse_skips(items, task=None):
    skips = collections.defaultdict(set)
    for item in items or []:
        t, _, spec = item.rpartition(':')
        for part in spec.split(','):
            lo, _, hi = part.partition('-')
            skips[t or task].update(range(int(lo), int(hi or lo) + 1))
    return skips


def imports_of(text):
    names = []
    for m in IMPORT.finditer(text):
        clause = m.group(2)
        brace = re.search(r'\{([^}]*)\}', clause, re.S)
        for part in (brace.group(1).split(',') if brace else []):
            part = re.sub(r'^\s*type\s+', '', part.strip())
            names += [part.split(' as ')[-1].strip()] if part else []
        for part in re.sub(r'\{[^}]*\}', '', clause, flags=re.S).split(','):
            part = part.strip()
            names += [part[5:].strip()] if part.startswith('* as ') else [part] if re.fullmatch(r'[A-Za-z_$][\w$]*', part) else []
    return names


def import_flags(lines, removed):
    text = '\n'.join(lines)
    if ELIDE.search(text):
        return []
    names, declared = imports_of(text), DECL_ANY.findall(text)
    body = re.sub(r'(?m)//.*$', '', re.sub(r'/\*.*?\*/', '', IMPORT.sub('', text), flags=re.S)).replace('...', ' ')

    def used(n):
        for m in re.finditer(r'(?<![\w$.])' + re.escape(n) + r'(?![\w$])', body):
            if not (re.match(r'\s*\??\s*:(?!:)', body[m.end():m.end() + 4]) and body[:m.start()].rstrip()[-1:] in ('{', ',', '')):
                return True
        return False
    return [f'`{n}` imported twice' for n in sorted({x for x in names if names.count(x) > 1})] \
        + [f'`{n}` imported but unread' for n in sorted(set(names)) if not used(n)] \
        + [f'`{n}` declared twice at top level' for n in sorted({x for x in declared if declared.count(x) > 1})] \
        + [f'`{n}` read after its import left' for n in sorted(removed - set(names) - set(declared)) if used(n)]


def phases_of(tasks):
    return list(dict.fromkeys(t.phase for t in tasks))


def check(args, tasks, repo):
    tree, skips = Tree(Source(repo, args.base, False)), parse_skips(args.skip)
    rep, imp, totals, partial, marked = [], [], collections.Counter(), set(), []
    for phase in phases_of(tasks):
        outs, touched, removed = [], set(), collections.defaultdict(set)
        for task in (t for t in tasks if t.phase == phase):
            outs += run_task(task, tree, skips[task.id], False, outcomes_of(args))
            for b in (s for s in task.steps if isinstance(s, Block) and s.path.endswith(('.ts', '.tsx'))):
                touched.add(b.path)
                removed[b.path] |= set(imports_of('\n'.join(h[1:] for h in b.body if h[:1] == '-'))) - set(imports_of('\n'.join(h[1:] for h in b.body if h[:1] == '+')))
        kinds = collections.Counter((o.cause or '').split(':')[0] for o in outs if not o.ok)
        partial |= {o.path for o in outs if not o.ok}
        warned = [o for o in outs if o.ok and o.cause]
        totals.update(kinds)
        totals['ambiguous (first taken)'] += len(warned)
        totals['applied'] += sum(o.ok for o in outs)
        marked += [f'{o.task}:{o.block}' for o in outs if o.what.startswith('skipped, only')]
        rep += [f'#### P{phase} · {sum(o.ok for o in outs)} applied · ' + ' · '.join(f'{v} {k}' for k, v in sorted(kinds.items())) + (f' · {len(warned)} ambiguous' if warned else ''), '']
        for o in [o for o in outs if not o.ok] + warned:
            copy = ''
            if o.snap is not None:
                dest = os.path.join(args.out, 'replayed', f'P{phase}', f'{o.task}-{o.line}', o.path)
                os.makedirs(os.path.dirname(dest), exist_ok=True)
                open(dest, 'w').write('\n'.join(o.snap))
                copy = f' · replayed copy `{os.path.relpath(dest, args.out)}`'
            rep.append(f'- Task {o.task} · block {o.block} · plan line {o.line} · `{o.path}` · @@ {o.anchor or "—"} @@ · {o.cause}{copy}')
        rep.append('')
        flags = [f'- `{path}` · skipped, part-replayed' for path in sorted(touched & partial)]
        for path in sorted(touched - partial):
            if tree.get(path) is not None:
                known = set(import_flags(tree.src.at_base(path), set())) if tree.src.at_base(path) else set()
                flags += [f'- `{path}` · {f}' for f in import_flags(tree.get(path), removed[path]) if f not in known]
        imp += [f'#### P{phase}', '', *flags, ''] if flags else []
    counts = ' · '.join(f'{k}: {v}' for k, v in sorted(totals.items())) + (f' · skipped by outcome: {len(marked)} ({", ".join(marked)})' if marked else '')
    head = ['### Plan Replay Report', '', f'Every task\'s blocks replayed over `{args.base}` in plan order; a refused hunk leaves its file as it was. drift: the before-text matches nowhere at that point; absent: the file isn\'t there; anchor: an insertion whose anchor names no line; elided: an addition the plan elides that the replay can\'t spell; ambiguous: the before-text matches more than once (`apply` refuses it; the replay takes the first).', '',
            '- ' + counts, '']
    os.makedirs(args.out, exist_ok=True)
    open(os.path.join(args.out, 'report.md'), 'w').write('\n'.join(head + rep))
    open(os.path.join(args.out, 'imports.md'), 'w').write('\n'.join(['### Import Check at Each Phase\'s End', '', 'Each `.ts`/`.tsx` file a phase\'s blocks name, as replayed at the phase\'s end, against its own base form: a name imported twice, an import nothing reads, a top-level name declared twice, or a name read after its import left. A file holding an elision, or one a refused hunk left part-replayed, is skipped.', ''] + imp))
    print(counts)


def counted(path):
    return not path.startswith(('.claude/', '<')) and not path.endswith(('.md', '.mdx')) and not TEST.search(path)


def own_lines(path, hunk):
    add = rem = 0
    for h in hunk:
        if h[:1] not in ('+', '-') or remark(path, h[1:]):
            continue
        sm, r = summary(h[1:].strip()), RANGE.search(h)
        n = sm[1] if sm else (int(r.group(2)) - int(r.group(1)) + 1 if r else 0) if ELIDE.match(norm(h[1:])) else 1
        add, rem = add + n * (h[0] == '+'), rem + n * (h[0] == '-')
    return add, rem


def tally(repo, before, after):
    tmp = tempfile.mkdtemp()
    try:
        for side, files in (('a', before), ('b', after)):
            os.makedirs(os.path.join(tmp, side))
            for path, lines in files.items():
                if lines is not None and counted(path):
                    os.makedirs(os.path.dirname(os.path.join(tmp, side, path)), exist_ok=True)
                    open(os.path.join(tmp, side, path), 'w').write('\n'.join(lines).rstrip('\n') + '\n')
        r = subprocess.run([os.path.join(repo, 'node_modules/.bin/biome'), 'format', '--write', f'--config-path={os.path.join(repo, "biome.json")}', 'a', 'b'], cwd=tmp, capture_output=True, text=True)
        unformatted = sorted(set(re.findall(r'(?m)^([ab]/\S+) format ━', r.stdout + r.stderr)))
        raw = subprocess.run(['git', 'diff', '--no-index', '-M', '-U0', 'a', 'b'], cwd=tmp, capture_output=True).stdout.decode('utf-8', 'replace')
    finally:
        shutil.rmtree(tmp)
    add = rem = 0
    path = None
    for line in raw.split('\n'):
        if line.startswith('diff --git'):
            path = line.split(' b/', 1)[1][2:] if ' b/' in line else None
        elif path and line[:1] in ('+', '-') and not line.startswith(('+++', '---')) and not remark(path, line[1:]):
            add, rem = add + (line[0] == '+'), rem + (line[0] == '-')
    return add, rem, unformatted


def measure(args, tasks, repo):
    tree, skips = Tree(Source(repo, args.base, False)), parse_skips(args.skip)
    data, rows, cum, unformatted = {}, ['| Phase | Removed | Added | Net | Cumulative | Unreplayed hunks |', '|---|---|---|---|---|---|'], 0, []
    for phase in phases_of(tasks):
        per = {}
        for task in (t for t in tasks if t.phase == phase):
            tree.snap = {}
            outs = run_task(task, tree, skips[task.id], False, outcomes_of(args))
            moved = [own_lines(o.path, o.hunk) for o in outs if not o.ok and o.hunk and counted(o.path)]
            a, r, bad = tally(repo, tree.snap, {p: tree.get(p) for p in tree.snap})
            unformatted += [f'{task.id} {f}' for f in bad]
            per[task.id] = {'added': a + sum(x[0] for x in moved), 'removed': r + sum(x[1] for x in moved), 'unreplayed': len(moved)}
            per[task.id]['net'] = per[task.id]['added'] - per[task.id]['removed']
        a, r, u = (sum(v[k] for v in per.values()) for k in ('added', 'removed', 'unreplayed'))
        cum += a - r
        data[f'P{phase}'] = {'added': a, 'removed': r, 'net': a - r, 'tasks': per}
        rows.append(f'| P{phase} | −{r} | +{a} | {a - r:+d} | {cum:+d} | {u or ""} |')
        rows += [f'| · {t} | −{v["removed"]} | +{v["added"]} | {v["net"]:+d} | | {v["unreplayed"] or ""} |' for t, v in per.items()] if args.tasks else []
    A, R = sum(v['added'] for v in data.values()), sum(v['removed'] for v in data.values())
    rows.append(f'| **Total** | −{R} | +{A} | {A - R:+d} | | |')
    print('\n'.join(rows))
    if unformatted:
        print('\nTask states Biome could not parse, so measured unformatted:\n' + '\n'.join(f'- {u}' for u in unformatted))
    if args.json:
        json.dump(dict(data, unformatted=unformatted), open(args.json, 'w'), indent=1)


def apply(args, tasks, repo):
    task = next((t for t in tasks if t.id == args.task), None)
    if task is None:
        sys.exit(f'no Task {args.task} in the plan')
    tree = Tree(Source(repo, args.base, True))
    outs = run_task(task, tree, parse_skips(args.skip, task.id)[task.id], True, outcomes_of(args))
    print(f'Task {task.id} · {sum(isinstance(s, Block) for s in task.steps)} blocks')
    for o in outs:
        where = f'[{o.block}]' if o.block else 'prose'
        hunk = f' · @@ {o.anchor} @@' if o.anchor else ''
        print(f'{where} plan :{o.line} · {o.path}{hunk} · {o.what}' + (f' · {o.cause}' if o.cause else ''))
    failed = [o for o in outs if not o.ok]
    print(f'{sum(o.ok for o in outs)} applied · {len(failed)} not applied' + (' · dry run, nothing written' if args.dry_run else ''))
    if not args.dry_run:
        for path in tree.snap:
            full, lines = os.path.join(repo, path), tree.get(path)
            if lines is None:
                if os.path.isfile(full):
                    os.remove(full)
                continue
            os.makedirs(os.path.dirname(full), exist_ok=True)
            open(full, 'w').write('\n'.join(lines).rstrip('\n') + '\n')
        fmt = [p for p in tree.snap if tree.get(p) is not None and p.endswith(BIOME_EXT) and not p.startswith('.claude/')]
        if fmt:
            r = subprocess.run([os.path.join(repo, 'node_modules/.bin/biome'), 'format', '--write', *fmt], cwd=repo, capture_output=True, text=True)
            for bad in sorted(set(re.findall(r'(?m)^(\S+) format ━', r.stdout + r.stderr))):
                print(f'Biome could not format {bad}')
    sys.exit(1 if failed else 0)


def main():
    p = argparse.ArgumentParser(usage=__doc__.removeprefix('usage: '))
    sub = p.add_subparsers(dest='cmd', required=True)
    for name in ('check', 'measure', 'apply'):
        s = sub.add_parser(name)
        s.add_argument('plan')
        if name == 'apply':
            s.add_argument('task')
            s.add_argument('--dry-run', action='store_true')
        s.add_argument('--base', default='HEAD')
        s.add_argument('--skip', nargs='+', action='extend')
        s.add_argument('--outcome', action='append', default=[])
    sub.choices['check'].add_argument('--out', required=True)
    sub.choices['measure'].add_argument('--tasks', action='store_true')
    sub.choices['measure'].add_argument('--json')
    args = p.parse_args()
    repo = git(os.path.dirname(os.path.abspath(args.plan)), 'rev-parse', '--show-toplevel').strip()
    {'check': check, 'measure': measure, 'apply': apply}[args.cmd](args, parse(args.plan), repo)


if __name__ == '__main__':
    main()
