/* ══════════════════════════════════════════════════════════════════════
   ROADMAP TAB
   Ordered by dependency, not by popularity: a topic appears only after
   everything it needs is already behind you. Cross-referenced against
   Striver's A2Z (455 problems / 18 steps), NeetCode 150 (18 categories)
   and Blind 75.
   ══════════════════════════════════════════════════════════════════════ */

const ROADMAP = [
{
  id:'p0', n:0, name:'Foundations', weeks:'1–2 weeks',
  tag:'Before you solve a single problem',
  goal:'Read a problem\'s constraints and name the complexity you are allowed to spend — before you have finished reading the problem.',
  topics:[
    { id:'t-lang', name:'Commit to one language',
      why:'Switching languages halfway costs you the standard-library muscle memory that makes an interview survivable. You already use Python and Java — pick the one you will be assessed in and make the other your secondary.',
      ready:['You can write a hash map, a heap, a deque, and a sort with a custom key from memory in under a minute.',
             'You know your language\'s integer division rule for negative numbers.'],
      viz:[], ref:'Reference → Python ↔ Java translation table' },
    { id:'t-bigo', name:'Complexity analysis',
      why:'The highest-leverage topic in all of DSA. Constraints tell you the intended solution: n ≤ 20 means exponential is fine, n ≤ 10⁵ means O(n log n) or better. Most people learn this last; learn it first.',
      ready:['Given n ≤ 10⁵ you immediately say "O(n log n) or better".',
             'You can explain why appending to a dynamic array is O(1) amortised but O(n) worst case.',
             'You can state the difference between O, Θ and Ω without hedging.'],
      viz:[], ref:'Reference → what each complexity actually costs' },
    { id:'t-builtin', name:'Your language\'s built-in structures',
      why:'Most problems are solved by choosing the right built-in, not by implementing one. Knowing which operations are O(1) and which are secretly O(n) prevents the most common accidental-quadratic bug.',
      ready:['You know why list.pop(0) is O(n) and deque.popleft() is O(1).',
             'You can name the cost of every operation on list, dict, set, deque and heapq.'],
      viz:[], ref:'Reference → data structure operation costs' }
  ]
},
{
  id:'p1', n:1, name:'Arrays, hashing and the linear scans', weeks:'2–3 weeks',
  tag:'The patterns behind most easy and many medium problems',
  goal:'Recognise when a single pass is enough, and stop writing nested loops by reflex.',
  topics:[
    { id:'t-array', name:'Arrays and strings',
      why:'Traversal, in-place modification, and keeping two indices honest. Unglamorous, but every later topic assumes it is automatic.',
      ready:['You can modify an array in place without corrupting the part you have not read yet.',
             'You handle empty input, single element, and all-equal elements without thinking about it.'],
      viz:['linear-search'], ref:'Striver Step 3 (40) · NeetCode Arrays & Hashing (9)' },
    { id:'t-hash', name:'Hashing — the "seen" set and frequency map',
      why:'Converts nested loops into single passes more often than any other tool in DSA. Trading O(n) memory for an O(n²)→O(n) time win is the most common optimisation in interviews.',
      ready:['You reach for a dict/HashMap before writing a second nested loop.',
             'You can explain why hash lookup is O(1) average but O(n) worst case.'],
      viz:[], ref:'NeetCode Arrays & Hashing (9) · Blind 75 Array' },
    { id:'t-2ptr', name:'Two pointers',
      why:'On sorted data, each comparison eliminates an entire row or column of candidate pairs. That is how O(n²) collapses to O(n) — and understanding *why* it is safe to move a pointer matters more than memorising the template.',
      ready:['You can justify moving each pointer, not just recite the pattern.',
             'You see that 3-Sum is this loop nested inside one more.'],
      viz:['two-pointer-sum'], ref:'Striver Step 10 (12) · NeetCode Two Pointers (5)' },
    { id:'t-window', name:'Sliding window',
      why:'Fixed size: add one, drop one. Variable size: grow right, shrink left while invalid. Two templates that cover a large slice of all string and subarray problems.',
      ready:['You can state which condition makes a window invalid before writing any code.',
             'You understand why left never moves backwards, and why that makes it O(n).'],
      viz:['sliding-window-fixed','longest-unique'], ref:'Striver Step 10 (12) · NeetCode Sliding Window (6)' },
    { id:'t-prefix', name:'Prefix sums and precomputation',
      why:'Answer range queries in O(1) after one O(n) pass. More broadly: the habit of precomputing a table so a later loop can make a decision in constant time — the same idea powering the lookahead in LC 3302.',
      ready:['You can build a prefix array and answer sum(i..j) without an off-by-one.',
             'You notice when a repeated inner computation could be precomputed once.'],
      viz:['kadane','lc3302-valid-sequence'], ref:'Blind 75 Array' }
  ]
},
{
  id:'p2', n:2, name:'Sorting and binary search', weeks:'1–2 weeks',
  tag:'Where "sorted" becomes a superpower',
  goal:'Stop implementing sorts and start recognising when sorting first makes the real problem trivial.',
  topics:[
    { id:'t-sort', name:'Sorting algorithms',
      why:'You will almost never implement one in an interview. You learn them because merge sort teaches divide-and-conquer and quicksort teaches partitioning — and both come back in DP, quickselect, and every "kth largest" question.',
      ready:['You can explain why merge sort is stable and quicksort is not.',
             'You know why O(n log n) is the comparison-sort lower bound, and how counting sort escapes it.'],
      viz:['bubble-sort','selection-sort','insertion-sort','merge-sort','quick-sort'],
      ref:'Striver Step 2 (7) · Reference → sorting comparison' },
    { id:'t-bsearch', name:'Binary search',
      why:'Three boundary decisions cause nearly every binary-search bug ever written. Get them automatic here, because the pattern reappears constantly.',
      ready:['You write it without an off-by-one on the first attempt.',
             'You recognise "binary search on the answer" — searching a monotonic predicate, not a sorted array.',
             'You write lo + (hi - lo) // 2 out of habit.'],
      viz:['binary-search'], ref:'Striver Step 4 (32) · NeetCode Binary Search (7)' }
  ]
},
{
  id:'p3', n:3, name:'Linear structures with state', weeks:'2 weeks',
  tag:'Pointers, LIFO and FIFO',
  goal:'Manipulate structures whose shape changes as you walk them — without losing a reference.',
  topics:[
    { id:'t-ll', name:'Linked lists',
      why:'The value is not the data structure; it is pointer discipline. Reversal teaches you that order of operations is not negotiable, and fast/slow pointers teach O(1)-space structural tricks.',
      ready:['You can reverse a list on paper and say why nxt must be saved first.',
             'You can find the middle and detect a cycle in one pass with O(1) memory.'],
      viz:['reverse-list','floyd-cycle'], ref:'Striver Step 6 (31) · NeetCode Linked List (11)' },
    { id:'t-stackq', name:'Stacks and queues',
      why:'LIFO vs FIFO is the difference between DFS and BFS, so this is quietly a prerequisite for graphs. Also the natural home for nesting, matching and undo semantics.',
      ready:['You can say why nesting demands a stack and a counter is not enough.',
             'You use deque/ArrayDeque rather than a list for queue behaviour.'],
      viz:['valid-parens','level-order'], ref:'Striver Step 9 (30) · NeetCode Stack (6)' },
    { id:'t-monostack', name:'Monotonic stack',
      why:'The first genuinely non-obvious pattern. "Each element waits for the first later element that beats it" turns a family of O(n²) problems into O(n) — and teaches you amortised counting, since the nested while loop is a red herring.',
      ready:['You can explain why the inner while loop does not make it quadratic.',
             'You recognise the shape in histogram, daily-temperatures and stock-span problems.'],
      viz:['next-greater'], ref:'Striver Step 9 (30) · NeetCode Stack (6)' }
  ]
},
{
  id:'p4', n:4, name:'Recursion', weeks:'2 weeks', gate:true,
  tag:'The gate — nothing after this works without it',
  goal:'Trust a recursive call to return the right answer without tracing it in your head.',
  topics:[
    { id:'t-recursion', name:'Recursion and the call stack',
      why:'Trees, graphs, backtracking and DP are all unteachable until this is automatic. Most people who stall on DP actually stalled on recursion and did not notice.',
      ready:['You can write a recursive function by stating the base case and the leap of faith, without simulating the stack.',
             'You can convert a simple recursion to iteration with an explicit stack.',
             'You know Python\'s default recursion limit is 1000 and what to do about it.'],
      viz:['fib-recursion'], ref:'Striver Step 7 (25)' },
    { id:'t-backtrack', name:'Backtracking',
      why:'DFS plus undoing your choice on the way out. Subsets, permutations, combinations, N-Queens and sudoku are all one template with a different pruning rule.',
      ready:['You can generate all subsets and all permutations from scratch.',
             'You know where the "undo" line goes and why omitting it silently corrupts later branches.'],
      viz:[], ref:'NeetCode Backtracking (10)' },
    { id:'t-divide', name:'Divide and conquer',
      why:'Split, solve independently, combine. Once you see merge sort and quicksort as instances of one idea, quickselect and "kth largest in O(n) average" stop being tricks.',
      ready:['You can explain why merge sort is O(n log n) by counting work per level.',
             'You can describe quickselect and why it averages O(n).'],
      viz:['merge-sort','quick-sort'], ref:'Striver Step 2 (7)' }
  ]
},
{
  id:'p5', n:5, name:'Hierarchical structures', weeks:'2–3 weeks',
  tag:'Trees, heaps and tries',
  goal:'Move fluently between the recursive view of a tree and the iterative one.',
  topics:[
    { id:'t-tree', name:'Binary trees and traversals',
      why:'One recursion, three orders — and where you put the visit line is the whole difference. Postorder in particular is the shape of all tree DP, because a node needs its children\'s answers first.',
      ready:['You can write all three DFS orders and BFS without looking them up.',
             'You know inorder on a BST emits sorted values, and why that is useful.',
             'You can compute height, diameter and "is balanced" recursively.'],
      viz:['tree-traversals','level-order'], ref:'Striver Step 13 (39) · NeetCode Trees (15)' },
    { id:'t-bst', name:'Binary search trees',
      why:'One comparison discards an entire subtree — until the tree degenerates into a linked list and everything becomes O(n). Understanding that failure mode is why balanced trees exist.',
      ready:['You can state the BST property precisely (whole subtrees, not just children).',
             'You can show an insertion order that makes the tree degenerate.'],
      viz:['bst-insert'], ref:'Striver Step 14 (16)' },
    { id:'t-heap', name:'Heaps and priority queues',
      why:'The right answer to every "top k", "kth largest", "merge k lists" and "running median" question. A size-k heap gives top-k in O(n log k) instead of sorting everything.',
      ready:['You can explain why build-heap is O(n) and not O(n log n).',
             'You know how to fake a max-heap in Python by negating values.'],
      viz:['heapify'], ref:'Striver Step 11 (17) · NeetCode Heap (7)' },
    { id:'t-trie', name:'Tries',
      why:'Prefix queries in O(length) regardless of how many words you stored. Narrow, but when a problem says "prefix" or "autocomplete" nothing else comes close.',
      ready:['You can implement insert and search with a dict-of-dicts.',
             'You know why a trie beats a hash set for prefix matching.'],
      viz:[], ref:'Striver Step 17 (7) · NeetCode Tries (3)' }
  ]
},
{
  id:'p6', n:6, name:'Graphs', weeks:'2–3 weeks',
  tag:'Where trees generalise and cycles appear',
  goal:'See that a grid, a dependency list and a road network are the same object.',
  topics:[
    { id:'t-graphrep', name:'Representation',
      why:'Adjacency list versus matrix is a real decision: O(V+E) versus O(V²) memory. Most interview graphs are sparse, so the list wins — and grids are graphs whose edges are implied by adjacency.',
      ready:['You can build an adjacency list from an edge list in a few lines.',
             'You recognise a 2-D grid problem as a graph problem.'],
      viz:[], ref:'Striver Step 15 (54)' },
    { id:'t-bfsdfs', name:'BFS and DFS',
      why:'The same code with a different container. BFS gives shortest paths on unweighted graphs for free; DFS gives you the structural facts — components, cycles, ordering.',
      ready:['You mark visited on enqueue, never on dequeue, and can say why.',
             'You can do connected components, flood fill and cycle detection.'],
      viz:['graph-bfs','graph-dfs'], ref:'NeetCode Graphs (13) · Blind 75 Graph' },
    { id:'t-topo', name:'Topological sort',
      why:'Any "prerequisites", "build order" or "course schedule" problem. Kahn\'s algorithm detects cycles for free, which is usually half the question.',
      ready:['You can explain why a cycle prevents any node in it from reaching in-degree 0.',
             'You know the ordering is not unique, and how to get the lexicographically smallest one.'],
      viz:['topo-sort'], ref:'Striver Step 15 (54) · Blind 75 Graph' },
    { id:'t-dsu', name:'Union-Find (disjoint set union)',
      why:'Near-constant-time "are these connected?" with path compression and union by rank. The backbone of Kruskal\'s MST and a large family of connectivity problems.',
      ready:['You can implement find with path compression in five lines.',
             'You know what α(n) means and why it is effectively constant.'],
      viz:[], ref:'NeetCode Advanced Graphs (6)' },
    { id:'t-shortest', name:'Shortest paths',
      why:'Dijkstra when weights are non-negative, Bellman-Ford when they are not, BFS when they are all equal. Choosing wrongly is not a performance bug — it is a correctness bug.',
      ready:['You can explain exactly why a negative edge breaks Dijkstra.',
             'You know why the stale-entry check exists in the heap version.'],
      viz:['dijkstra'], ref:'NeetCode Advanced Graphs (6)' },
    { id:'t-mst', name:'Minimum spanning trees',
      why:'Kruskal (sort edges + union-find) and Prim (grow with a heap). Less common in interviews than shortest paths, but they consolidate everything from this phase.',
      ready:['You can describe both and say which suits a dense versus sparse graph.'],
      viz:[], ref:'NeetCode Advanced Graphs (6)' }
  ]
},
{
  id:'p7', n:7, name:'Dynamic programming', weeks:'3–4 weeks', gate:true,
  tag:'The longest phase — budget for it',
  goal:'State what one cell of your table means in a full English sentence. That sentence is the solution.',
  topics:[
    { id:'t-memo', name:'Memoisation → tabulation',
      why:'Start top-down: write the recursion, then cache it. That is a two-line change to code you already understand, and it is far easier than inventing a table from nothing. Convert to bottom-up afterwards.',
      ready:['You can take any recursion and memoise it mechanically.',
             'You can name the two conditions that make DP applicable: overlapping subproblems and optimal substructure.'],
      viz:['fib-recursion','fib-tab'], ref:'Striver Step 16 (56)' },
    { id:'t-dp1', name:'1-D DP',
      why:'Climbing stairs, house robber, coin change, longest increasing subsequence. One index, one decision per step. Get comfortable here before touching grids.',
      ready:['You can define dp[i] in one sentence before writing code.',
             'You spot when only the last two entries matter and collapse to O(1) space.'],
      viz:['fib-tab','kadane'], ref:'NeetCode 1-D DP (12) · Blind 75 DP' },
    { id:'t-dp2', name:'2-D and grid DP',
      why:'Two indices, usually two strings or a grid. Unique paths, edit distance, LCS. The traceback from the final cell recovers the actual answer, not just its length.',
      ready:['You can say what dp[i][j] means and which neighbours it reads.',
             'You can reconstruct the answer by walking backwards through the table.'],
      viz:['lcs'], ref:'NeetCode 2-D DP (11)' },
    { id:'t-knapsack', name:'The knapsack family',
      why:'Take-it-or-leave-it over a set of items. Subset sum, partition equal subset, coin change and target sum are all this one recurrence in costume.',
      ready:['You can explain why 0/1 knapsack reads row i−1 while unbounded reads row i.',
             'You know why O(n·W) is pseudo-polynomial and when that makes it useless.'],
      viz:['knapsack'], ref:'Striver Step 16 (56)' }
  ]
},
{
  id:'p8', n:8, name:'Finishing and interview shape', weeks:'2–3 weeks',
  tag:'The remaining categories, then timed practice',
  goal:'Turn knowledge into performance under a clock, with someone watching.',
  topics:[
    { id:'t-greedy', name:'Greedy',
      why:'Take the locally best option — but only when you can prove the rest still works out. The interesting greedy problems pair the greedy choice with a feasibility check, exactly like LC 3302 in the Visualize tab.',
      ready:['You can argue why a greedy choice is safe, not just that it passes the samples.',
             'You know when greedy fails and DP is required.'],
      viz:['lc3302-valid-sequence'], ref:'Striver Step 12 (16) · NeetCode Greedy (8)' },
    { id:'t-intervals', name:'Intervals',
      why:'Sort by start (or end), then sweep. Merge intervals, insert interval, meeting rooms, non-overlapping intervals — a small, high-frequency category you can finish in a couple of days.',
      ready:['You know when to sort by start versus by end, and why it changes the answer.'],
      viz:[], ref:'NeetCode Intervals (6) · Blind 75 Interval' },
    { id:'t-bits', name:'Bit manipulation',
      why:'XOR tricks, counting set bits, subset enumeration by bitmask. Narrow, but bitmask DP unlocks a class of n ≤ 20 problems that look impossible otherwise.',
      ready:['You know what x & (x-1) does and why.',
             'You can enumerate all subsets of a set with a bitmask loop.'],
      viz:[], ref:'Striver Step 8 (18) · NeetCode Bit Manipulation (7)' },
    { id:'t-math', name:'Math and geometry',
      why:'Matrix rotation, spiral traversal, primes, GCD, overflow handling. Rarely deep, occasionally decisive.',
      ready:['You can rotate a matrix in place and traverse one in spiral order.'],
      viz:[], ref:'NeetCode Math & Geometry (8)' },
    { id:'t-mock', name:'Timed mock practice',
      why:'The gap between "I can solve this" and "I can solve this in 35 minutes while explaining it out loud" is enormous, and it only closes by rehearsing the real thing.',
      ready:['You can talk continuously through your reasoning while coding.',
             'You state a brute force, then optimise, rather than jumping to the answer.',
             'You test on empty input, one element and duplicates without being prompted.'],
      viz:[], ref:'Blind 75 · NeetCode 150 as revision sets' }
  ]
}
];

const CURRICULA = [
  ['Striver A2Z', '455 problems · 18 steps',
   'The most complete free path in this order. Best primary track if you want one list to follow start to finish.',
   'https://takeuforward.org/strivers-a2z-dsa-course/strivers-a2z-dsa-course-sheet-2'],
  ['NeetCode 150', '150 problems · 18 categories',
   'Tighter and pattern-first, with video explanations. Best second pass, or first pass if you are short on time.',
   'https://neetcode.io/practice'],
  ['Blind 75', '75 problems · 10 categories',
   'The original minimal set. Best used as a final revision sweep in the two weeks before interviews.',
   'https://www.teamblind.com/post/New-Year-Gift---Curated-List-of-Top-75-LeetCode-Questions-to-Save-Your-Time-OaM1orEU'],
  ['roadmap.sh DSA', 'concept map',
   'Concept coverage rather than problems — useful for checking you have not skipped a whole area.',
   'https://roadmap.sh/datastructures-and-algorithms']
];

/* ─────────────────────────── progress store ─────────────────────────── */
const Progress = {
  key:'dsaviz-progress',
  data:null,
  load(){
    if (this.data) return this.data;
    try { this.data = JSON.parse(localStorage.getItem(this.key)) || {}; }
    catch (e){ this.data = {}; }
    return this.data;
  },
  has(id){ return !!this.load()[id]; },
  set(id, on){
    const d = this.load();
    if (on) d[id] = 1; else delete d[id];
    try { localStorage.setItem(this.key, JSON.stringify(d)); } catch (e){}
  },
  reset(){ this.data = {}; try { localStorage.removeItem(this.key); } catch (e){} },
  count(){
    const d = this.load();
    let done = 0, total = 0;
    ROADMAP.forEach(p => p.topics.forEach(t => { total++; if (d[t.id]) done++; }));
    return { done, total };
  },
  phaseCount(p){
    const d = this.load();
    return { done: p.topics.filter(t => d[t.id]).length, total: p.topics.length };
  },
  /* problems are tracked by LeetCode number, so the same problem stays
     ticked wherever it appears across topics */
  solved(num){ return !!this.load()['lc' + num]; },
  setSolved(num, on){ this.set('lc' + num, on); },
  topicSolved(tid){
    const list = LC[tid] || [];
    return { done: list.filter(p => this.solved(p[0])).length, total: list.length };
  },
  solvedTotal(){
    const d = this.load();
    const seen = new Set();
    Object.values(LC).forEach(list => list.forEach(p => seen.add(p[0])));
    let done = 0;
    seen.forEach(n => { if (d['lc' + n]) done++; });
    return { done, total: seen.size };
  }
};

/* ─────────────────────────── rendering ─────────────────────────── */
/** The practice list inside one topic card. */
function lcBlock(tid){
  const list = LC[tid] || [];
  if (!list.length) return '';
  const c = Progress.topicSolved(tid);
  return '<div class="lc" data-lc-topic="' + tid + '">' +
    '<div class="lc-head"><span class="ready-label">Practice</span>' +
    '<span class="lc-count"><b>' + c.done + '</b>/' + c.total + '</span></div>' +
    '<ul class="lc-list">' + list.map(p => {
      const on = Progress.solved(p[0]);
      return '<li class="lc-item' + (on ? ' is-solved' : '') + '">' +
        '<input type="checkbox" data-lc="' + p[0] + '"' + (on ? ' checked' : '') +
          ' aria-label="Mark ' + esc(p[1]) + ' as solved">' +
        '<a href="' + LC_URL(p) + '" target="_blank" rel="noopener">' +
          '<span class="lc-num">' + p[0] + '</span>' + esc(p[1]) + '</a>' +
        '<span class="lc-diff d-' + p[2] + '">' + LC_DIFF[p[2]] + '</span>' +
        (p[4] ? '<span class="lc-tag">' + (p[4] === 'BN' ? 'B75·NC' : p[4] === 'B' ? 'B75' : 'NC') + '</span>' : '') +
      '</li>';
    }).join('') + '</ul></div>';
}

function buildRoadmap(){
  const { done, total } = Progress.count();
  const pct = total ? Math.round(100 * done / total) : 0;
  const solved = Progress.solvedTotal();
  const st = lcStats();

  const phaseHtml = ROADMAP.map(p => {
    const pc = Progress.phaseCount(p);
    const ppct = Math.round(100 * pc.done / pc.total);
    return `
    <section class="phase${pc.done === pc.total ? ' is-complete' : ''}" id="${p.id}">
      <header class="phase-head">
        <div class="phase-mark">${p.n}</div>
        <div class="phase-title">
          <h3>${esc(p.name)}${p.gate ? '<span class="gate-flag">gate</span>' : ''}</h3>
          <p class="phase-tag">${esc(p.tag)}</p>
        </div>
        <div class="phase-meta">
          <span class="weeks">${esc(p.weeks)}</span>
          <span class="phase-prog"><b>${pc.done}</b>/${pc.total}</span>
        </div>
      </header>
      <div class="phase-bar"><span style="width:${ppct}%"></span></div>
      <p class="phase-goal"><b>Goal:</b> ${esc(p.goal)}</p>
      <div class="topic-grid">
        ${p.topics.map(t => {
          const on = Progress.has(t.id);
          return `
          <article class="tcard${on ? ' is-done' : ''}" data-topic="${t.id}">
            <label class="tcard-head">
              <input type="checkbox" data-check="${t.id}"${on ? ' checked' : ''}>
              <span class="tcard-name">${esc(t.name)}</span>
            </label>
            <p class="tcard-why">${esc(t.why)}</p>
            <div class="ready">
              <span class="ready-label">Move on when</span>
              <ul>${t.ready.map(r => '<li>' + esc(r) + '</li>').join('')}</ul>
            </div>
            ${t.viz.length ? '<div class="viz-chips">' + t.viz.map(v => {
              const a = DSA.get(v);
              return a ? '<button class="viz-chip" data-open="' + v + '">' + esc(a.name) + '</button>' : '';
            }).join('') + '</div>' : ''}
            ${lcBlock(t.id)}
            <p class="tcard-ref">${esc(t.ref)}</p>
          </article>`;
        }).join('')}
      </div>
    </section>`;
  }).join('');

  return `
  <div class="rm-head">
    <div class="rm-head-main">
      <h1>Roadmap</h1>
      <p class="lede">Ordered by <b>dependency, not popularity</b> — each topic appears only once everything it needs is behind you. That is why hashing comes before two pointers, recursion sits in the middle as a hard gate, and dynamic programming is near the end. Skipping ahead is the single most common reason people stall.</p>
    </div>
    <div class="rm-progress">
      <div class="ring" style="--pct:${pct}">
        <span>${pct}<small>%</small></span>
      </div>
      <div class="rm-progress-txt">
        <b>${done} of ${total}</b> topics
        <span id="rmSolved"><b>${solved.done} of ${solved.total}</b> problems</span>
        <button class="link-btn" id="rmReset">reset</button>
      </div>
    </div>
  </div>

  <div class="rm-callout">
    <div class="rm-callout-item"><b>16–20 weeks</b><span>at 8–14 focused hours per week</span></div>
    <div class="rm-callout-item"><b>1 : 2</b><span>hours reading theory to hours writing code</span></div>
    <div class="rm-callout-item"><b>60–90 min</b><span>on weekdays, one longer block at the weekend</span></div>
    <div class="rm-callout-note">Focused hours matter more than calendar months. Twelve serious hours a week with review beats an irregular six-month grind — and the phases below overlap in practice, since you should keep revising earlier topics while learning new ones.</div>
  </div>

  <div class="lc-summary">
    <div><b>${st.unique}</b><span>LeetCode problems, mapped to the topic that teaches them</span></div>
    <div><b>${st.easy} · ${st.medium} · ${st.hard}</b><span>easy · medium · hard</span></div>
    <div><b>${st.blind}</b><span>are in Blind 75 <span class="lc-tag">B75</span></span></div>
    <div><b>${st.neet}</b><span>are in NeetCode 150 <span class="lc-tag">NC</span></span></div>
    <p>Tick a problem once you can re-solve it from a blank editor. Problems are tracked by their LeetCode number, so one that appears under two topics stays ticked in both.</p>
  </div>

  ${phaseHtml}

  <h2>Which problem list to follow</h2>
  <p class="lede">This roadmap is the sequence; these are the problem sets to solve inside it. Pick one as your primary and do not try to run two at once.</p>
  <div class="tbl-wrap"><table><thead><tr>
    <th>List</th><th>Size</th><th>Where it fits</th>
  </tr></thead><tbody>
    ${CURRICULA.map(c => `<tr>
      <td><a href="${c[3]}" target="_blank" rel="noopener">${esc(c[0])}</a></td>
      <td class="mono">${esc(c[1])}</td>
      <td>${esc(c[2])}</td>
    </tr>`).join('')}
  </tbody></table></div>

  <h2>How to actually use a phase</h2>
  <div class="howuse">
    <div class="howuse-step"><b>Watch it move.</b> Open the topic in the Visualize tab, step through it slowly, and read the Idea panel. Use the side-by-side flowchart to see why the branches are arranged that way.</div>
    <div class="howuse-step"><b>Write it from memory.</b> Close the tab and implement it. If you cannot, you recognised it rather than learned it — go back.</div>
    <div class="howuse-step"><b>Trace your own version.</b> Run it through the tracer and replay it in My Code. Watching your variables move is where the off-by-one you did not know about shows up.</div>
    <div class="howuse-step"><b>Solve until the pattern is boring.</b> Work down the practice list on each card, easy to hard, then tick the topic only when the "Move on when" checks are honestly true.</div>
  </div>

  ${SITE_FOOT}`;
}
