# DSAViz

**[▶ Open the app](https://leela1836.github.io/dsa-visualizer/)** — free, no sign-up, works offline.

A tool for learning data structures and algorithms by *watching them run*.

[![Licence](https://img.shields.io/badge/licence-Apache--2.0-blue.svg)](LICENSE)
[![No dependencies](https://img.shields.io/badge/dependencies-none-brightgreen.svg)](#how-it-is-built)
[![Offline](https://img.shields.io/badge/works-offline-brightgreen.svg)](#how-it-is-built)

It does four things:

1. **Animates 28 algorithms** step by step, with side-by-side Python and Java and the executing line highlighted.
2. **Draws the control-flow chart** of each one, with your current position lit up as you step.
3. **Runs your own Python in the browser** — paste a solution, press Run, watch your variables move.
4. **Lays out a learning roadmap** ordered by dependency, with 145 LeetCode problems mapped onto the topics that teach them.

Everything runs client-side. No account, no server, no tracking, no network requests of
any kind — your code and your progress never leave your device.

---

## The four tabs

| Tab | What it does |
|---|---|
| **Visualize** | 28 built-in algorithms. Play or step through them; the Python and Java listings highlight in sync. |
| **My Code** | Write Python and press Run, or drop a `trace.json` from the tracers to replay real CPython or Java. |
| **Reference** | Complexity tables, a pattern-picker, a Python↔Java translation table, and the bugs that actually cost people offers. |
| **Roadmap** | A 9-phase path with progress tracking and a practice list on every topic. |

**Keyboard:** `Space` play/pause · `←` `→` step · `Home` `End` jump · `F` cycle data / flowchart / side-by-side.

---

## The flowchart view

Every algorithm has a control-flow diagram, and the box you are standing in lights up as
you step. Use it when you understand *what* the code does but not *why the branches are
arranged that way*.

Three modes, via the tabs above the stage (or press `F`):

- **Data view** — the array, tree, graph or DP table changing
- **Flowchart** — the decision structure, with the live position highlighted
- **Side by side** — both, which is where most of the insight comes from

---

## Running your own code

### Option 1 — write Python in the browser (no setup)

**My Code → Write & run Python.** Type or paste a solution, press **Run** (or `Ctrl+Enter`).
It executes in a Python interpreter written in JavaScript and bundled into the page: no
install, no download, works offline.

You get a frame per executed statement, your variables drawn live, printed output replayed
in step, and **a flowchart built from your code's own structure** — one per function,
switching automatically as you step into a call.

Deliberately a subset, but a large one: classes, recursion, decorators, comprehensions,
slicing, f-strings, unpacking, `heapq`, `collections` (deque / defaultdict / Counter),
`math`, `functools.cache`, and 40+ builtins.

**Not supported:** generators and `yield`, `*args`/`**kwargs` in definitions, real exception
classes, arbitrary-precision integers, and most of the standard library. Hit an edge and
the error says so and points you at the tracer.

**Guard rails:** infinite loops stop at 4,000 recorded steps, runaway recursion is caught at
depth 120, and if your code raises, the steps that ran *before* the error stay replayable.

### Option 2 — trace real CPython or Java

For anything the built-in interpreter will not run.

#### Python — fully automatic

Put [`tracers/dsaviz.py`](tracers/dsaviz.py) next to your script:

```python
from dsaviz import trace

def valid_sequence(word1, word2):
    ...

trace(valid_sequence, "vbcca", "abc")      # writes trace.json
```

Open **My Code → Load a trace file** and drop `trace.json` on the page.

Every executed line is captured via `sys.settrace`, with all locals and the call stack, and
a flowchart is generated from your function's AST.

```
trace(fn, *args, out="trace.json", max_frames=4000, follow=True, **kwargs)
```

#### Java — explicit snapshots

Java has no portable per-line hook, so you mark the moments that matter. Compile
[`tracers/DsaViz.java`](tracers/DsaViz.java) alongside your solution — no flags, no dependencies:

```java
static void bubble(int[] a) {
    for (int i = 0; i < a.length; i++)
        for (int j = 0; j < a.length - i - 1; j++) {
            DsaViz.watch("a", a).watch("i", i).watch("j", j);
            DsaViz.step(12, "compare " + a[j] + " vs " + a[j + 1]);
            if (a[j] > a[j + 1]) { int t = a[j]; a[j] = a[j+1]; a[j+1] = t; }
        }
}

public static void main(String[] args) {
    DsaViz.begin("Solution.java");   // embeds the source so line highlighting works
    bubble(new int[]{5, 3, 8, 4, 2});
    DsaViz.save("trace.json");
}
```

```
javac DsaViz.java Solution.java && java Solution
```

DSAViz infers a flowchart from the lines your run actually visited.

### What gets drawn automatically

| Your variable | Rendered as |
|---|---|
| `list` of numbers | bar chart, with in-range integer variables shown as pointers |
| `list` of strings/chars, or a `str` | labelled cells |
| 2-D list | DP-style grid |
| object with `.next` | linked list, with cycles detected and drawn |
| object with `.left` / `.right` | binary tree |
| `dict` / `set` / `Map` / `Set` | key–value cells |

Any integer variable whose value is a valid index into a list appears as a pointer above
it — so `i`, `j`, `lo`, `hi` show up where you expect, with no annotation.

---

## The roadmap

35 topics across 9 phases, ordered by **dependency rather than popularity** — a topic
appears only once everything it needs is behind you. Hashing before two pointers; recursion
in the middle as an explicit gate; dynamic programming near the end.

Each topic card carries:

- **why it earns its place** — what it unlocks, not a restatement of the name
- **"Move on when…"** — concrete self-tests. *"You can explain why a negative edge breaks
  Dijkstra"* is a check you can fail; *"studied Dijkstra"* is not.
- **a practice list** — LeetCode problems ordered easiest-first, difficulty-tagged, showing
  whether each is in Blind 75 or NeetCode 150
- **links into the visualizer** — all 28 built-in algorithms are reachable from a card

145 unique problems (33 easy · 96 medium · 16 hard). Progress lives in `localStorage`, and
problems are tracked by LeetCode number, so one appearing under two topics stays ticked in
both.

Sequencing is cross-checked against
[Striver's A2Z](https://takeuforward.org/strivers-a2z-dsa-course/strivers-a2z-dsa-course-sheet-2),
[NeetCode 150](https://neetcode.io/practice),
[Blind 75](https://www.teamblind.com/blog/the-blind-75-guide-the-ultimate-coding-interview-prep-resource/)
and [roadmap.sh](https://roadmap.sh/datastructures-and-algorithms).

---

## What is built in

| Group | Algorithms |
|---|---|
| **Sorting** | Bubble · Selection · Insertion · Merge · Quick (Lomuto) |
| **Searching** | Linear · Binary |
| **Patterns** | Sliding window (fixed k) · Longest substring without repeats · Two pointers · Kadane · Monotonic stack · Greedy + lookahead (LC 3302) |
| **Linked lists** | Reverse · Floyd's cycle detection |
| **Stacks & queues** | Valid parentheses |
| **Trees** | BST insert/search · DFS traversals · BFS level order · Build min-heap |
| **Graphs** | BFS · DFS · Dijkstra · Topological sort (Kahn's) |
| **Recursion & DP** | Recursion tree (toggle memoisation and watch it collapse) · Tabulation · 0/1 knapsack · LCS |

Each carries real Python **and** Java, a complexity summary, and an "Idea" panel explaining
the invariant — the thing worth remembering, not the syntax.

---

## How it is built

No framework, no build tool, no dependencies. Sources in `src/` are inlined into one
self-contained HTML file.

```powershell
.\build.ps1            # regenerate index.html + DSAViz.html
.\build.ps1 -Watch     # rebuild on every save
```

`build.ps1` replaces each `<!--INCLUDE:...-->` marker in `src/index.template.html`, then
syntax-checks the merged bundle with `node --check`.

**Why a single file:** `file://` blocks ES modules, so a bundle is the only thing that works
offline by double-clicking *and* as a hosted page. It also means the whole app is one
artifact you can email, put on a USB stick, or open on a plane.

### Adding an algorithm

Drop a `DSA.register({...})` call into any `src/js/algos_*.js`:

```js
DSA.register({
  id:'my-algo', group:'Patterns', name:'My Algorithm',
  blurb:'One sentence on what it does.',
  complexity:{ time:'O(n)', space:'O(1)', note:'' },
  inputs:[{ key:'arr', label:'Array', type:'text', def:'3, 1, 4' }],

  // flowchart: r = row, c = column; the router handles loops and skips
  flow:{ nodes:[{ id:'a', title:'Start', type:'start', r:0, c:0 }], edges:[] },

  // " §tag" marks a line; frames carrying that tag highlight it.
  // Python and Java use the same tags, so both listings stay in sync.
  code:{ python:`
def f(a):            §a
    return a         §a`,
         java:`
int f(int[] a) {     §a
    return a;        §a
}` },

  explain:`<p>Why it works.</p>`,

  // a generator — yield one frame per step
  run: function*(inp){
    const a = parseNums(inp.arr, [3,1,4]);
    yield { tag:'a', at:'a', note:'What just happened',
            data:{ view:'array', values:a, marks:{ 0:'cur' }, pointers:{ i:0 } },
            vars:{ i:0 }, stats:{ steps:1 } };
  }
});
```

Views: `array` · `list` · `tree` · `graph` · `table` · `calltree` · `flow`. Pass an array of
specs to stack several. Marks: `cur` `cmp` `swap` `done` `pivot` `bad` `dim` `win`.

### Files

```
index.html               the built app — this is what GitHub Pages serves
DSAViz.html              identical copy, for opening locally by double-click
build.ps1                regenerates both from src/
src/
  index.template.html    page skeleton with <!--INCLUDE--> markers
  style.css              theme tokens (light/dark), layout
  js/core.js             registry, code panel, frame player
  js/render.js           all SVG renderers, including the flowchart router
  js/algos_*.js          the algorithm library
  js/reference.js        reference-tab content
  js/lcproblems.js       LeetCode problems mapped to roadmap topics
  js/roadmap.js          roadmap content + progress tracking
  js/pyrun.js            Python tokenizer + parser (AST)
  js/pyeval.js           interpreter, builtins, stdlib subset, AST flowchart
  js/pyexamples.js       starter programs for the editor
  js/mycode.js           editor UI + trace replay
  js/app.js              routing and wiring
tracers/
  dsaviz.py              Python tracer (sys.settrace + AST flowchart)
  DsaViz.java            Java tracer (manual snapshots, zero dependencies)
```

Both tracers emit the same JSON schema, so anything producing it can drive the viewer.

---

## Correctness

The Python interpreter is checked against CPython by **differential testing**: twelve suites
covering arithmetic, strings, lists, dicts, sets, control flow, functions, classes, stdlib
and complete algorithms, each required to produce **byte-identical stdout**. That caught
three real bugs — `in` being swallowed as a comparison operator when parsing `for i in xs`,
semicolon-separated statements being parsed then discarded, and sets being treated as dicts.

The algorithm library is checked separately: every frame must render, every flowchart
reference must resolve, every highlighted code tag must exist in *both* the Python and Java
listings, and no flowchart box may overlap another or fall off the canvas.

---

## Contributing

Issues and pull requests are welcome — especially new algorithms, better explanations, and
corrections.

- Edit files in `src/`, never `index.html` or `DSAViz.html` (both are generated).
- Run `.\build.ps1` and commit the regenerated `index.html` along with your source change.
- Keep it dependency-free. No frameworks, no CDNs, no build step beyond the inliner.

---

## Licence

[Apache License 2.0](LICENSE) — free to use, modify and redistribute, including
commercially, provided you keep the notices. See [NOTICE](NOTICE).

Not affiliated with LeetCode, takeuforward, NeetCode or roadmap.sh; the Roadmap tab links to
their publicly available material for reference.
