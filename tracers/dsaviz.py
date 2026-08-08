"""
dsaviz.py — record a Python function's execution for DSAViz.

No dependencies. Python 3.8+.  Drop this file next to your script.

    from dsaviz import trace

    def bubble(a):
        for i in range(len(a)):
            for j in range(len(a) - i - 1):
                if a[j] > a[j + 1]:
                    a[j], a[j + 1] = a[j + 1], a[j]
        return a

    trace(bubble, [5, 3, 8, 4, 2])        # -> trace.json

Then open DSAViz.html, go to "My Code", and drop trace.json on the page.

What gets captured
------------------
* every executed line, with the full local variable state at that moment
* the call stack and its depth
* a control-flow graph built from the function's AST, so the flowchart view
  highlights which branch you are actually standing in

Options
-------
    trace(fn, *args, out="trace.json", max_frames=4000, follow=True, **kwargs)

    follow=True   also step into other functions defined in the same file
                  (set False to record only `fn` itself)
"""

import ast
import inspect
import json
import os
import sys
import textwrap

__all__ = ["trace", "Recorder", "watch", "step", "begin", "save"]

MAX_ITEMS = 80          # longest sequence captured
MAX_STR = 200           # longest string captured
MAX_VALUE_DEPTH = 4     # nesting depth before we bail to repr
MAX_LINKED = 60         # linked-list nodes to follow before assuming a cycle


# ══════════════════════════════════════════════════════════════════════
#  Value encoding
# ══════════════════════════════════════════════════════════════════════
def _is_node(o, *names):
    return all(hasattr(o, n) for n in names)


def _val_attr(o):
    for n in ("val", "value", "data", "key", "item"):
        if hasattr(o, n):
            return getattr(o, n)
    return None


def _encode_linked(o, depth):
    """Follow .next and return a flat list, detecting cycles."""
    vals, seen, cyc = [], {}, None
    cur, k = o, 0
    while cur is not None and k < MAX_LINKED:
        if id(cur) in seen:
            cyc = seen[id(cur)]
            break
        seen[id(cur)] = k
        vals.append(_safe(_val_attr(cur), depth + 1))
        cur = getattr(cur, "next", None)
        k += 1
    return {"__t": "linked", "v": vals, "cycle": cyc}


def _encode_tree(o, depth):
    nodes, order = {}, []

    def walk(n):
        if n is None or len(nodes) > 80:
            return None
        nid = "t%d" % id(n)
        if nid in nodes:
            return nid
        nodes[nid] = {"v": None, "l": None, "r": None}
        order.append(nid)
        nodes[nid]["v"] = _safe(_val_attr(n), depth + 1)
        nodes[nid]["l"] = walk(getattr(n, "left", None))
        nodes[nid]["r"] = walk(getattr(n, "right", None))
        return nid

    root = walk(o)
    return {"__t": "tree", "nodes": nodes, "root": root}


def _safe(v, depth=0):
    """Convert a runtime value into something JSON-serialisable and drawable."""
    if depth > MAX_VALUE_DEPTH:
        return {"__t": "obj", "v": "…"}
    if v is None or isinstance(v, bool) or isinstance(v, int):
        return v
    if isinstance(v, float):
        if v != v or v in (float("inf"), float("-inf")):
            return {"__t": "obj", "v": repr(v)}
        return v
    if isinstance(v, str):
        return v[:MAX_STR]
    if isinstance(v, (list, tuple)):
        out = [_safe(x, depth + 1) for x in list(v)[:MAX_ITEMS]]
        if len(v) > MAX_ITEMS:
            out.append({"__t": "obj", "v": "… +%d" % (len(v) - MAX_ITEMS)})
        return out
    if isinstance(v, (set, frozenset)):
        try:
            items = sorted(v, key=lambda x: (str(type(x)), str(x)))
        except Exception:
            items = list(v)
        return {"__t": "set", "v": [_safe(x, depth + 1) for x in items[:MAX_ITEMS]]}
    if isinstance(v, dict):
        pairs = []
        for i, (k, val) in enumerate(v.items()):
            if i >= MAX_ITEMS:
                break
            pairs.append([_safe(k, depth + 1), _safe(val, depth + 1)])
        return {"__t": "dict", "v": pairs}
    # user objects: try the two shapes that matter for DSA
    try:
        if _is_node(v, "left") or _is_node(v, "right"):
            return _encode_tree(v, depth)
        if _is_node(v, "next") and _val_attr(v) is not None:
            return _encode_linked(v, depth)
    except Exception:
        pass
    try:
        return {"__t": "obj", "v": repr(v)[:MAX_STR]}
    except Exception:
        return {"__t": "obj", "v": "<unrepresentable>"}


_SKIP_TYPES = (type(sys), type(_safe), type(len))


def _locals_of(frame):
    out = {}
    for k, v in list(frame.f_locals.items()):
        if k.startswith("__"):
            continue
        if isinstance(v, _SKIP_TYPES) or isinstance(v, type):
            continue
        try:
            out[k] = _safe(v)
        except Exception:
            out[k] = {"__t": "obj", "v": "<error>"}
    return out


# ══════════════════════════════════════════════════════════════════════
#  Control-flow graph from the AST
# ══════════════════════════════════════════════════════════════════════
class _FlowBuilder:
    """Builds a readable, structured flowchart — not a strict compiler CFG."""

    SIMPLE_MAX = 3   # simple statements merged into one box

    def __init__(self, src_lines, line_offset):
        self.lines = src_lines
        self.off = line_offset
        self.nodes = []
        self.edges = []
        self.row = 0
        self.n = 0
        self.loops = []          # stack of (header_id, exits_list)

    def _text(self, lineno, end=None):
        i = lineno - self.off
        if 0 <= i < len(self.lines):
            t = self.lines[i].strip()
            return t[:60]
        return ""

    def _emit(self, title, sub, typ, col, lines):
        self.n += 1
        nid = "f%d" % self.n
        self.nodes.append({
            "id": nid, "title": title, "sub": sub or "", "type": typ,
            "r": self.row, "c": col, "lines": lines
        })
        self.row += 1
        return nid

    def _link(self, froms, to, label=None):
        for f in froms:
            if f is None:
                continue
            e = {"from": f, "to": to}
            if label:
                e["label"] = label
            self.edges.append(e)

    # ── main recursive walk ──────────────────────────────────────────
    def block(self, body, col):
        """Return (entry_id, exit_ids) for a list of statements."""
        entry, exits, run = None, [], []

        def flush():
            nonlocal entry, exits, run
            if not run:
                return
            first = run[0].lineno
            title = self._text(first)
            if len(run) > 1:
                title += "  …"
            sub = "line %d" % first if len(run) == 1 else "lines %d–%d" % (
                first, run[-1].lineno)
            lines = []
            for s in run:
                lines.extend(range(s.lineno, getattr(s, "end_lineno", s.lineno) + 1))
            nid = self._emit(title, sub, "act", col, sorted(set(lines)))
            if entry is None:
                entry = nid
            self._link(exits, nid)
            exits = [nid]
            run = []

        for st in body:
            if isinstance(st, (ast.If, ast.While, ast.For, ast.AsyncFor,
                               ast.Return, ast.Break, ast.Continue, ast.Try)):
                flush()
                e, x = self.stmt(st, col)
                if entry is None:
                    entry = e
                self._link(exits, e)
                exits = x
            else:
                run.append(st)
                if len(run) >= self.SIMPLE_MAX:
                    flush()
        flush()
        return entry, exits

    def stmt(self, st, col):
        if isinstance(st, ast.If):
            cond = self._cond_text(st.test, st.lineno)
            nid = self._emit(cond + " ?", "line %d" % st.lineno, "dec", col,
                             [st.lineno])
            te, tx = self.block(st.body, col)
            self._link([nid], te, "yes")
            if st.orelse:
                fe, fx = self.block(st.orelse, col + 1)
                self._link([nid], fe, "no")
                return nid, tx + fx
            return nid, tx + [nid]

        if isinstance(st, (ast.While, ast.For, ast.AsyncFor)):
            if isinstance(st, ast.While):
                title = self._cond_text(st.test, st.lineno) + " ?"
                yes = "yes"
            else:
                title = "for " + self._src(st.target) + " in " + self._src(st.iter)
                title = title[:52]
                yes = "next item"
            nid = self._emit(title, "loop header · line %d" % st.lineno,
                             "dec", col, [st.lineno])
            self.loops.append([nid, []])
            be, bx = self.block(st.body, col)
            self._link([nid], be, yes)
            self._link(bx, nid, "repeat")
            _, brk = self.loops.pop()
            return nid, [nid] + brk

        if isinstance(st, ast.Return):
            val = self._src(st.value) if st.value else ""
            nid = self._emit("Return " + val[:40], "line %d" % st.lineno,
                             "ok", col + 1, [st.lineno])
            return nid, []

        if isinstance(st, ast.Break):
            nid = self._emit("break", "leave the loop", "bad", col + 1, [st.lineno])
            if self.loops:
                self.loops[-1][1].append(nid)
            return nid, []

        if isinstance(st, ast.Continue):
            nid = self._emit("continue", "back to the loop header", "loop",
                             col + 1, [st.lineno])
            if self.loops:
                self._link([nid], self.loops[-1][0], "continue")
            return nid, []

        if isinstance(st, ast.Try):
            nid = self._emit("try", "line %d" % st.lineno, "act", col, [st.lineno])
            be, bx = self.block(st.body, col)
            self._link([nid], be)
            return nid, bx

        nid = self._emit(self._text(st.lineno), "line %d" % st.lineno,
                         "act", col, [st.lineno])
        return nid, [nid]

    # ── helpers ──────────────────────────────────────────────────────
    def _src(self, node):
        if node is None:
            return ""
        try:
            return ast.unparse(node)          # 3.9+
        except Exception:
            return self._text(getattr(node, "lineno", 0))

    def _cond_text(self, test, lineno):
        t = self._src(test)
        return t[:58] if t else self._text(lineno)


def build_flow(fn):
    """Return (flow_dict, line_to_node_map, source_text, first_line)."""
    try:
        raw = inspect.getsource(fn)
    except (OSError, TypeError):
        return None, {}, "", 1
    first = fn.__code__.co_firstlineno
    dedented = textwrap.dedent(raw)
    src_lines = raw.split("\n")
    try:
        tree = ast.parse(dedented)
    except SyntaxError:
        return None, {}, raw, first

    fndef = None
    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            fndef = node
            break
    if fndef is None:
        return None, {}, raw, first

    # shift AST line numbers back onto the real file
    shift = first - 1
    for node in ast.walk(tree):
        if hasattr(node, "lineno") and node.lineno is not None:
            node.lineno += shift
        if getattr(node, "end_lineno", None) is not None:
            node.end_lineno += shift

    b = _FlowBuilder(src_lines, first)
    entry = b._emit(fn.__name__ + "(" + ", ".join(
        a.arg for a in fndef.args.args) + ")", "entry", "start", 0, [first])
    e, x = b.block(fndef.body, 0)
    if e:
        b._link([entry], e)
    if x:
        b._emit("Return (implicit None)", "", "ok", 1, [])
        b._link(x, b.nodes[-1]["id"])

    line_map = {}
    for nd in b.nodes:
        for ln in nd.get("lines", []):
            line_map.setdefault(str(ln), nd["id"])
        nd.pop("lines", None)

    return {"nodes": b.nodes, "edges": b.edges}, line_map, raw, first


# ══════════════════════════════════════════════════════════════════════
#  Recorder
# ══════════════════════════════════════════════════════════════════════
class Recorder:
    def __init__(self, max_frames=4000, follow=True):
        self.frames = []
        self.max_frames = max_frames
        self.follow = follow
        self.file = None
        self.root_name = None
        self.base_depth = 0
        self._full = False

    # ── sys.settrace plumbing ────────────────────────────────────────
    def _global(self, frame, event, arg):
        if event != "call":
            return None
        if self._full:
            return None
        if frame.f_code.co_filename != self.file:
            return None
        if not self.follow and frame.f_code.co_name != self.root_name:
            return None
        frame.f_trace_lines = True
        return self._local

    def _local(self, frame, event, arg):
        if self._full:
            return None
        if event == "line":
            self._record(frame, "line", None)
        elif event == "return":
            self._record(frame, "return", arg)
        return self._local

    def _depth(self, frame):
        d, f = 0, frame
        while f is not None:
            d += 1
            f = f.f_back
        return max(1, d - self.base_depth)

    def _stack(self, frame):
        out, f, k = [], frame, 0
        while f is not None and k < 24:
            if f.f_code.co_filename == self.file:
                out.append(f.f_code.co_name)
            f = f.f_back
            k += 1
        return out

    def _record(self, frame, event, ret):
        if len(self.frames) >= self.max_frames:
            self._full = True
            sys.settrace(None)
            return
        rec = {
            "line": frame.f_lineno,
            "event": event,
            "func": frame.f_code.co_name,
            "depth": self._depth(frame),
            "vars": _locals_of(frame),
            "stack": self._stack(frame),
        }
        if event == "return":
            rec["ret"] = _safe(ret)
        self.frames.append(rec)


def trace(fn, *args, **kwargs):
    """Run fn(*args) under the tracer and write a DSAViz trace file."""
    out = kwargs.pop("out", "trace.json")
    max_frames = kwargs.pop("max_frames", 4000)
    follow = kwargs.pop("follow", True)

    flow, line_map, source, first = build_flow(fn)

    rec = Recorder(max_frames=max_frames, follow=follow)
    rec.file = fn.__code__.co_filename
    rec.root_name = fn.__name__

    f = sys._getframe()
    d = 0
    while f is not None:
        d += 1
        f = f.f_back
    rec.base_depth = d

    old = sys.gettrace()
    sys.settrace(rec._global)
    result = None
    error = None
    try:
        result = fn(*args, **kwargs)
    except Exception as exc:            # keep whatever we captured
        error = "%s: %s" % (type(exc).__name__, exc)
    finally:
        sys.settrace(old)

    # whole-file source so the code panel shows real line numbers
    try:
        with open(rec.file, "r", encoding="utf-8") as fh:
            whole = fh.read()
        src, src_start = whole, 1
    except Exception:
        src, src_start = source, first

    doc = {
        "dsaviz": 1,
        "lang": "python",
        "name": fn.__name__,
        "file": os.path.basename(rec.file),
        "source": src,
        "sourceStart": src_start,
        "highlight": [first, first + source.count("\n")],
        "flow": flow,
        "lineToNode": line_map,
        "frames": rec.frames,
        "result": _safe(result),
        "error": error,
        "truncated": rec._full,
    }
    with open(out, "w", encoding="utf-8") as fh:
        json.dump(doc, fh)

    n = len(rec.frames)
    print("dsaviz: %d frames -> %s%s" % (
        n, out, "  (truncated)" if rec._full else ""))
    if error:
        print("dsaviz: the function raised %s — the trace up to that point was kept."
              % error)
    return result


# ══════════════════════════════════════════════════════════════════════
#  Manual mode — for when you want to control exactly what is captured
# ══════════════════════════════════════════════════════════════════════
_manual = {"frames": [], "vars": {}, "name": "trace", "source": "", "file": ""}


def begin(name="trace", source_file=None):
    _manual["frames"] = []
    _manual["vars"] = {}
    _manual["name"] = name
    if source_file and os.path.exists(source_file):
        with open(source_file, "r", encoding="utf-8") as fh:
            _manual["source"] = fh.read()
        _manual["file"] = os.path.basename(source_file)


def watch(name, value):
    _manual["vars"][name] = _safe(value)


def step(line=0, note=""):
    _manual["frames"].append({
        "line": line, "event": "line", "func": _manual["name"],
        "depth": 1, "vars": dict(_manual["vars"]), "stack": [_manual["name"]],
        "note": note,
    })


def save(out="trace.json"):
    doc = {
        "dsaviz": 1, "lang": "python", "name": _manual["name"],
        "file": _manual["file"], "source": _manual["source"], "sourceStart": 1,
        "flow": None, "lineToNode": {}, "frames": _manual["frames"],
    }
    with open(out, "w", encoding="utf-8") as fh:
        json.dump(doc, fh)
    print("dsaviz: %d frames -> %s" % (len(_manual["frames"]), out))


# ══════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    def demo(a):
        n = len(a)
        for i in range(n):
            swapped = False
            for j in range(n - i - 1):
                if a[j] > a[j + 1]:
                    a[j], a[j + 1] = a[j + 1], a[j]
                    swapped = True
            if not swapped:
                break
        return a

    trace(demo, [5, 3, 8, 4, 2, 7, 1], out="trace.json")
