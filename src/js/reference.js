/* ══════════════════════════════════════════════════════════════════════
   REFERENCE TAB
   ══════════════════════════════════════════════════════════════════════ */
const PATTERNS = [
  { name:'Sliding Window', cx:'O(n)', open:'sliding-window-fixed',
    sig:'"contiguous subarray / substring", "of size k", "longest / shortest window such that…"',
    when:'A window that only ever moves <b>forward</b>. Fixed size → add one, drop one. Variable size → grow right, shrink left while invalid. Needs a condition that is monotonic as the window grows.' },
  { name:'Two Pointers', cx:'O(n)', open:'two-pointer-sum',
    sig:'sorted array, "find a pair/triplet", "remove duplicates in place", palindrome check',
    when:'Input is sorted or sortable and you would otherwise write a nested loop. Each comparison lets you discard an entire row or column of candidate pairs.' },
  { name:'Fast & Slow Pointers', cx:'O(n), O(1) space', open:'floyd-cycle',
    sig:'linked list cycle, find the middle, "n-th node from the end", happy number',
    when:'You need a structural property of a sequence without extra memory. Two speeds create a fixed relationship you can exploit.' },
  { name:'Binary Search', cx:'O(log n)', open:'binary-search',
    sig:'sorted input — or "minimise the maximum", "smallest k such that…"',
    when:'Any <b>monotonic predicate</b>, not just sorted arrays. If <code>check(x)</code> is false…false…true…true, you can binary-search the boundary. That is "binary search on the answer".' },
  { name:'Monotonic Stack', cx:'O(n)', open:'next-greater',
    sig:'"next greater/smaller element", "largest rectangle", stock span, daily temperatures',
    when:'Each element is waiting for the first later element that beats it. Keep a stack whose values stay sorted; pop when the new element resolves them.' },
  { name:'BFS', cx:'O(V+E)', open:'graph-bfs',
    sig:'shortest path in an <b>unweighted</b> graph, level order, "minimum number of steps"',
    when:'Distance is what matters. A queue explores strictly by distance, so the first arrival at a node is optimal. Mark visited on enqueue, never on dequeue.' },
  { name:'DFS / Backtracking', cx:'O(V+E) or O(branchingᵈ)', open:'graph-dfs',
    sig:'connected components, cycle detection, permutations, subsets, N-Queens, sudoku',
    when:'You must explore complete paths, or need a node\'s children resolved before the node itself. Backtracking = DFS plus undoing your choice on the way out.' },
  { name:'Topological Sort', cx:'O(V+E)', open:'topo-sort',
    sig:'"prerequisites", "build order", "course schedule", any dependency ordering',
    when:'A directed graph where edges mean "must come before". Kahn\'s algorithm also detects cycles for free — if output is shorter than the node count, a cycle exists.' },
  { name:"Dijkstra", cx:'O((V+E) log V)', open:'dijkstra',
    sig:'shortest path with <b>non-negative</b> weights, "cheapest route", network delay',
    when:'Weighted shortest path. If all weights are equal, use BFS instead. If any weight is negative, use Bellman-Ford — Dijkstra is simply wrong there.' },
  { name:'Dynamic Programming', cx:'states × work per state', open:'knapsack',
    sig:'"how many ways", "minimum/maximum cost", "is it possible" over a sequence of choices',
    when:'Overlapping subproblems <b>and</b> optimal substructure. Define what one cell means in a full sentence before writing any code — that sentence is the whole solution.' },
  { name:'Greedy + Lookahead', cx:'O(n)', open:'lc3302-valid-sequence',
    sig:'"lexicographically smallest", "earliest possible", one exception allowed',
    when:'Take the locally best option — but only when you can prove the rest still works out. A precomputed feasibility table is what makes the greedy choice safe.' },
  { name:'Heap / Priority Queue', cx:'O(log n) per op', open:'heapify',
    sig:'"top k", "k-th largest", "merge k sorted lists", running median',
    when:'You repeatedly need the extreme element from a changing set. Full sorting is O(n log n); a size-k heap gives top-k in O(n log k).' }
];

const DS_OPS = [
  ['Array / list',            'O(1)',      'O(n)',      'O(n)',      'O(n)',      'contiguous; index is instant, insert shifts'],
  ['Dynamic array (append)',  'O(1)',      'O(n)',      'O(1)*',     'O(1)*',     '*amortised — occasional O(n) resize'],
  ['Linked list',             'O(n)',      'O(n)',      'O(1)†',     'O(1)†',     '†given the node; finding it is O(n)'],
  ['Stack / Queue (deque)',   '—',         '—',         'O(1)',      'O(1)',      'ends only; use deque, never list.pop(0)'],
  ['Hash map / set',          '—',         'O(1)*',     'O(1)*',     'O(1)*',     '*average; O(n) worst on collisions; unordered'],
  ['Balanced BST (TreeMap)',  '—',         'O(log n)',  'O(log n)',  'O(log n)',  'keeps keys sorted; range queries'],
  ['Binary heap',             'O(1) min',  'O(n)',      'O(log n)',  'O(log n)',  'extreme element only; siblings unordered'],
  ['Trie',                    '—',         'O(L)',      'O(L)',      'O(L)',      'L = key length; prefix queries'],
  ['Union-Find',              '—',         'O(α(n))',   'O(α(n))',   '—',         'α is effectively constant']
];

const SORTS = [
  ['Bubble',    'O(n)',        'O(n²)',       'O(n²)',   'O(1)',      'yes', 'teaching only'],
  ['Selection', 'O(n²)',       'O(n²)',       'O(n²)',   'O(1)',      'no',  'minimises writes'],
  ['Insertion', 'O(n)',        'O(n²)',       'O(n²)',   'O(1)',      'yes', 'great on small/nearly-sorted'],
  ['Merge',     'O(n log n)',  'O(n log n)',  'O(n log n)', 'O(n)',   'yes', 'stable, predictable, linked lists'],
  ['Quick',     'O(n log n)',  'O(n log n)',  'O(n²)',   'O(log n)',  'no',  'fastest in practice; random pivot'],
  ['Heap',      'O(n log n)',  'O(n log n)',  'O(n log n)', 'O(1)',   'no',  'in place, no worst case'],
  ['Counting',  'O(n + k)',    'O(n + k)',    'O(n + k)', 'O(k)',     'yes', 'small integer range only'],
  ['Timsort',   'O(n)',        'O(n log n)',  'O(n log n)', 'O(n)',   'yes', "Python sorted() / Java Arrays.sort(Object[])"]
];

const GROWTH = [
  ['O(1)',        '1',        '1',          '1',            'hash lookup, array index'],
  ['O(log n)',    '~10',      '~20',        '~30',          'binary search, balanced tree'],
  ['O(n)',        '1 000',    '1 000 000',  '10⁹',          'single scan'],
  ['O(n log n)',  '~10⁴',     '~2×10⁷',     '~3×10¹⁰',      'good sorting'],
  ['O(n²)',       '10⁶',      '10¹²',       '10¹⁸',         'nested loops — dead past ~10⁴'],
  ['O(2ⁿ)',       'beyond 10³⁰⁰', '—',      '—',            'subsets, naive recursion — dead past ~25'],
  ['O(n!)',       '—',        '—',          '—',            'permutations — dead past ~11']
];

const PYJAVA = [
  ['Dynamic array',    'a = []  /  a.append(x)',            'List&lt;Integer&gt; a = new ArrayList&lt;&gt;();  a.add(x);'],
  ['Fixed array',      'a = [0] * n',                       'int[] a = new int[n];'],
  ['2-D array',        'dp = [[0]*m for _ in range(n)]',    'int[][] dp = new int[n][m];'],
  ['Hash map',         'd = {}  /  d.get(k, 0)',            'Map&lt;K,V&gt; d = new HashMap&lt;&gt;();  d.getOrDefault(k,0);'],
  ['Counter',          'from collections import Counter',   'map.merge(k, 1, Integer::sum);'],
  ['Set',              's = set()  /  s.add(x)',            'Set&lt;T&gt; s = new HashSet&lt;&gt;();  s.add(x);'],
  ['Stack',            'st = []  /  st.append() / st.pop()','Deque&lt;T&gt; st = new ArrayDeque&lt;&gt;();  push/pop'],
  ['Queue',            'from collections import deque',     'Deque&lt;T&gt; q = new ArrayDeque&lt;&gt;();  add/poll'],
  ['Min-heap',         'import heapq; heapq.heappush(h,x)', 'PriorityQueue&lt;T&gt; pq = new PriorityQueue&lt;&gt;();'],
  ['Max-heap',         'push -x, negate on pop',            'new PriorityQueue&lt;&gt;(Collections.reverseOrder())'],
  ['Sort with key',    'a.sort(key=lambda x: x[1])',        'a.sort(Comparator.comparingInt(x -&gt; x[1]));'],
  ['Integer division', 'a // b   (floors toward −∞)',       'a / b   (truncates toward 0) — differs on negatives!'],
  ['Infinity',         "float('inf')",                      'Integer.MAX_VALUE  (watch for overflow when adding)'],
  ['String build',     "''.join(parts)",                    'StringBuilder sb; sb.append(...); sb.toString();'],
  ['Char of string',   's[i]',                              's.charAt(i)'],
  ['Substring',        's[i:j]',                            's.substring(i, j)']
];

const PITFALLS = [
  ['Off-by-one in binary search',   'Using <code>while lo &lt; hi</code> with <code>hi = n-1</code> skips the last element. Pick <code>hi = n-1</code> with <code>&lt;=</code>, or <code>hi = n</code> with <code>&lt;</code> — and never mix them.'],
  ['Integer overflow',              '<code>(lo + hi) / 2</code> overflows in Java/C++. Write <code>lo + (hi - lo) / 2</code>. Python is safe but keep the habit.'],
  ['Mutating while iterating',      'Removing from a list inside a <code>for</code> over it silently skips elements. Build a new list, or iterate backwards.'],
  ['Shallow 2-D array in Python',   '<code>[[0]*m]*n</code> creates n references to the SAME row. Use <code>[[0]*m for _ in range(n)]</code>.'],
  ['Mutable default argument',      '<code>def f(x, seen=[])</code> shares that list across every call. Use <code>None</code> and create it inside.'],
  ['list.pop(0)',                   'O(n) each time — turns an O(n) loop into O(n²). Use <code>collections.deque</code>.'],
  ['Marking visited on dequeue',    'In BFS, mark when you <b>enqueue</b>. Otherwise a node can be queued many times before being processed.'],
  ['Python `and` / `or` precedence','<code>a or b and c</code> parses as <code>a or (b and c)</code>. Parenthesise anything non-obvious.'],
  ['Java `/` on negatives',         '<code>-7 / 2 == -3</code> in Java but <code>-7 // 2 == -4</code> in Python. Bites when translating solutions.'],
  ['String concat in a loop',       'O(n²) in both languages. Use <code>join</code> / <code>StringBuilder</code>.'],
  ['Recursion depth',               "Python's default limit is 1000 frames. A deep DFS on 10⁴ nodes crashes — go iterative or raise the limit."],
  ['Forgetting the empty case',     'n = 0, empty string, single node, target absent. Most rejected submissions die here, not on the algorithm.']
];

const REPO_URL = 'https://github.com/leela1836/dsa-visualizer';
const SITE_FOOT = `
  <footer class="site-foot">
    <span>Everything runs in your browser. No account, no server, no tracking — your progress and your code stay on this device.</span>
    <span><a href="${REPO_URL}" target="_blank" rel="noopener">Source on GitHub</a> · Apache-2.0</span>
  </footer>`;

function buildReference(){
  const cls = s => s === 'O(1)' || s.indexOf('O(1)') === 0 || s.indexOf('α') >= 0 ? 'o1'
    : /log/.test(s) && !/n log/.test(s) ? 'olog'
    : /n log n|O\(n\)|O\(n \+|O\(V|O\(L\)|O\(k\)/.test(s) ? 'on'
    : /n²|2ⁿ|n!/.test(s) ? 'on2' : '';

  const tbl = (head, rows, cellCls) =>
    '<div class="tbl-wrap"><table><thead><tr>' + head.map(h => '<th>' + h + '</th>').join('') +
    '</tr></thead><tbody>' + rows.map(r => '<tr>' + r.map((c, i) =>
      '<td class="' + ((cellCls && cellCls(c, i)) || '') + '">' + c + '</td>').join('') + '</tr>').join('') +
    '</tbody></table></div>';

  return `
  <h1>Reference</h1>
  <p class="lede">The tables worth memorising, and the mistakes worth not repeating. Every pattern card jumps straight into the visualizer.</p>

  <h2>Pick the right pattern</h2>
  <p class="lede">Most interview problems are one of a dozen shapes wearing a costume. Match the signal, not the story.</p>
  <div class="pattern-grid">
    ${PATTERNS.map(p => `<div class="pcard">
      <h3>${p.name} <span class="cx">${p.cx}</span></h3>
      <p class="sig"><b>Signals:</b> ${p.sig}</p>
      <p class="when">${p.when}</p>
      <button class="try" data-open="${p.open}">Open in visualizer →</button>
    </div>`).join('')}
  </div>

  <h2>What each complexity actually costs</h2>
  <p class="lede">Rough operation counts. A modern CPU does roughly 10⁸–10⁹ simple operations per second, so anything above ~10⁸ in a one-second limit is out.</p>
  ${tbl(['Complexity', 'n = 1 000', 'n = 10⁶', 'n = 10⁹', 'Typical source'], GROWTH,
        (c, i) => i === 0 ? 'mono ' + cls(c) : (i < 4 ? 'mono' : ''))}
  <p class="lede" style="margin-top:10px">Reading a constraint backwards is the fastest way to guess the intended solution: n ≤ 20 → exponential/bitmask is fine. n ≤ 500 → O(n³). n ≤ 5 000 → O(n²). n ≤ 10⁵ → O(n log n). n ≤ 10⁷ → O(n) only.</p>

  <h2>Data structure operation costs</h2>
  ${tbl(['Structure', 'Access', 'Search', 'Insert', 'Delete', 'Notes'], DS_OPS,
        (c, i) => i > 0 && i < 5 ? 'mono ' + cls(c) : '')}

  <h2>Sorting algorithms compared</h2>
  ${tbl(['Algorithm', 'Best', 'Average', 'Worst', 'Space', 'Stable', 'Use it when'], SORTS,
        (c, i) => i > 0 && i < 5 ? 'mono ' + cls(c) : '')}
  <p class="lede" style="margin-top:10px"><b>Stable</b> means equal elements keep their original relative order — it matters whenever you sort by one key after already sorting by another.</p>

  <h2>Python ↔ Java quick translation</h2>
  <p class="lede">You write both, so here is the mapping that trips people up most often when moving a solution across.</p>
  ${tbl(['Need', 'Python', 'Java'], PYJAVA, (c, i) => i > 0 ? 'mono' : '')}

  <h2>Bugs that cost people offers</h2>
  ${tbl(['Trap', 'What actually happens'], PITFALLS, (c, i) => '')}

  ${SITE_FOOT}
  `;
}
