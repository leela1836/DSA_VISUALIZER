/* ══════════════════════════════════════════════════════════════════════
   RECURSION & DYNAMIC PROGRAMMING
   ══════════════════════════════════════════════════════════════════════ */

DSA.register({
  id:'fib-recursion', group:'Recursion & DP', name:'Recursion Tree — Fibonacci',
  blurb:'See exactly why naive recursion is exponential: the same subproblem is recomputed over and over. Turn on memoisation and watch the tree collapse.',
  complexity:{ time:'O(2ⁿ) / O(n) memo', best:'O(n)', space:'O(n)', note:'depth = n' },
  inputs:[
    { key:'n',    label:'n', type:'text', def:'6' },
    { key:'memo', label:'Memoise?', type:'select', def:'no', options:['no','yes'] }
  ],
  flow:{ nodes:[
    { id:'call', title:'fib(n)', type:'start', r:0, c:0 },
    { id:'memo', title:'Already in the memo?', type:'dec', r:1, c:0 },
    { id:'hit',  title:'Return the cached value', sub:'the whole subtree is skipped', type:'ok', r:1, c:1 },
    { id:'base', title:'n ≤ 1 ?', type:'dec', r:2, c:0 },
    { id:'ret0', title:'Return n', type:'ok', r:2, c:1 },
    { id:'rec',  title:'fib(n−1) + fib(n−2)', sub:'two more calls — this is where it explodes', type:'act', r:3, c:0 },
    { id:'store',title:'Store in the memo, return', type:'act', r:4, c:0 }
  ], edges:[
    { from:'call', to:'memo' }, { from:'memo', to:'hit', label:'yes' },
    { from:'memo', to:'base', label:'no' }, { from:'base', to:'ret0', label:'yes' },
    { from:'base', to:'rec', label:'no' }, { from:'rec', to:'store' },
    { from:'store', to:'call', label:'return up' }
  ]},
  code:{ python:`
def fib(n, memo=None):                          §call
    if memo is None: memo = {}                  §call
    if n in memo:                               §memo
        return memo[n]                          §hit
    if n <= 1:                                  §base
        return n                                §ret0
    result = fib(n-1, memo) + fib(n-2, memo)    §rec
    memo[n] = result                            §store
    return result                               §store`,
    java:`
static int fib(int n, Map<Integer,Integer> memo) { §call
    if (memo.containsKey(n)) {                  §memo
        return memo.get(n);                     §hit
    }
    if (n <= 1) {                               §base
        return n;                               §ret0
    }
    int result = fib(n-1, memo) + fib(n-2, memo); §rec
    memo.put(n, result);                        §store
    return result;                              §store
}` },
  explain:`<p><b>Run it with memo = no first, then yes.</b> The node count in the corner tells the story: without memoisation the tree roughly doubles per level (O(φⁿ) ≈ O(1.618ⁿ)); with it, every distinct <code>n</code> is computed exactly once, so the tree becomes a thin spine — O(n).</p>
  <p><b>The two conditions that make DP applicable</b> are both visible in this tree:</p>
  <ul><li><b>Overlapping subproblems</b> — the same <code>fib(k)</code> box appears many times. That is what memoisation eliminates.</li>
  <li><b>Optimal substructure</b> — the answer for <code>n</code> is built from answers for smaller <code>n</code>, and those never need revising.</li></ul>
  <p>No overlap → memoising buys nothing (that is plain divide-and-conquer, like merge sort). No optimal substructure → DP is simply the wrong tool.</p>
  <p><b>Memoisation is top-down DP</b> — the recursion drives the order. Tabulation is bottom-up; see the next entry. They compute the same thing; tabulation avoids the call-stack limit, memoisation only computes states you actually reach.</p>`,
  run: function*(inp){
    const n = Math.max(0, Math.min(12, parseNums(inp.n, [6])[0]));
    const useMemo = (inp.memo || 'no') === 'yes';
    const memo = {}, tree = []; let id = 0, calls = 0, hits = 0;
    const view = () => [{ view:'calltree', nodes:tree.slice(), title: useMemo ? 'call tree with memoisation' : 'call tree (naive)' },
      { view:'array', values:Object.keys(memo).sort((a,b)=>a-b).map(k => 'f' + k + '=' + memo[k]),
        mode:'cells', showIndex:false, title:'memo', emptyLabel: useMemo ? '(empty)' : '(not used)' }];
    function* f(k, parent, depth){
      const me = id++;
      calls++;
      tree.push({ id:me, parent, label:'f(' + k + ')', mark:'cur' });
      yield { tag:'call', at:'call', note:'Call fib(' + k + ') at depth ' + depth + '.', data:view(),
              vars:{ n:k, depth }, stats:{ calls, memoHits:hits, nodes:tree.length } };
      const node = tree[tree.length - 1];
      if (useMemo && memo[k] != null){
        hits++; node.mark = 'done'; node.ret = memo[k];
        yield { tag:'hit', at:'hit', note:'fib(' + k + ') is already in the memo = ' + memo[k] + '. Return instantly — an entire subtree just disappeared.',
                data:view(), vars:{ n:k, cached:memo[k] }, stats:{ calls, memoHits:hits, nodes:tree.length } };
        return memo[k];
      }
      if (k <= 1){
        node.mark = 'done'; node.ret = k;
        yield { tag:'ret0', at:'ret0', note:'Base case: fib(' + k + ') = ' + k + '.', data:view(),
                vars:{ n:k }, stats:{ calls, memoHits:hits, nodes:tree.length } };
        if (useMemo) memo[k] = k;
        return k;
      }
      node.mark = 'cmp';
      yield { tag:'rec', at:'rec', note:'fib(' + k + ') needs fib(' + (k-1) + ') + fib(' + (k-2) + ') — two more calls.',
              data:view(), vars:{ n:k }, stats:{ calls, memoHits:hits, nodes:tree.length } };
      const a = yield* f(k - 1, me, depth + 1);
      const b = yield* f(k - 2, me, depth + 1);
      const r = a + b;
      if (useMemo) memo[k] = r;
      node.mark = 'done'; node.ret = r;
      yield { tag:'store', at:'store', note:'fib(' + k + ') = ' + a + ' + ' + b + ' = ' + r + (useMemo ? '. Cached.' : '. (Not cached — it will be recomputed if needed again.)'),
              data:view(), vars:{ n:k, result:r }, stats:{ calls, memoHits:hits, nodes:tree.length } };
      return r;
    }
    const res = yield* f(n, null, 0);
    yield { tag:'store', at:'store',
            note:'fib(' + n + ') = ' + res + ' using ' + calls + ' calls' + (useMemo ? ' and ' + hits + ' memo hits' : '') +
                 '.  ' + (useMemo ? 'Linear.' : 'Try switching Memoise to "yes" and compare the call count.'),
            data:view(), vars:{ result:res }, stats:{ calls, memoHits:hits, nodes:tree.length } };
  }
});

DSA.register({
  id:'fib-tab', group:'Recursion & DP', name:'Tabulation — Fibonacci',
  blurb:'Bottom-up DP: fill a table from the base cases forward, so every value you need is already there when you need it.',
  complexity:{ time:'O(n)', best:'O(n)', space:'O(n) → O(1)', note:'no recursion' },
  inputs:[{ key:'n', label:'n', type:'text', def:'10' }],
  flow:{ nodes:[
    { id:'init', title:'dp[0] = 0, dp[1] = 1', sub:'the base cases', type:'start', r:0, c:0 },
    { id:'loop', title:'i ≤ n ?', type:'dec', r:1, c:0 },
    { id:'fill', title:'dp[i] = dp[i−1] + dp[i−2]', sub:'both are already computed', type:'act', r:2, c:0 },
    { id:'done', title:'Return dp[n]', type:'ok', r:3, c:1 }
  ], edges:[
    { from:'init', to:'loop' }, { from:'loop', to:'fill', label:'yes' },
    { from:'fill', to:'loop', label:'i++' }, { from:'loop', to:'done', label:'no' }
  ]},
  code:{ python:`
def fib(n):                                     §init
    if n <= 1: return n                         §init
    dp = [0] * (n + 1)                          §init
    dp[1] = 1                                   §init
    for i in range(2, n + 1):                   §loop
        dp[i] = dp[i-1] + dp[i-2]               §fill
    return dp[n]                                §done

# O(1) space — only the last two matter
def fib_fast(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a`,
    java:`
static long fib(int n) {                        §init
    if (n <= 1) return n;                       §init
    long[] dp = new long[n + 1];                §init
    dp[1] = 1;                                  §init
    for (int i = 2; i <= n; i++) {              §loop
        dp[i] = dp[i-1] + dp[i-2];              §fill
    }
    return dp[n];                               §done
}

// O(1) space
static long fibFast(int n) {
    long a = 0, b = 1;
    for (int i = 0; i < n; i++) { long t = a + b; a = b; b = t; }
    return a;
}` },
  explain:`<p><b>Same recurrence, opposite direction.</b> Memoisation asks "what do I need?" and recurses down. Tabulation says "what can I build next?" and iterates up. No call stack, no recursion limit, and iteration is faster in practice.</p>
  <p><b>The rolling-variable trick.</b> <code>dp[i]</code> only ever reads <code>dp[i-1]</code> and <code>dp[i-2]</code>, so the whole array is wasteful — two variables suffice, dropping space from O(n) to O(1). Watch for this in any DP whose recurrence looks back a fixed number of rows; 0/1 knapsack collapses from a 2-D table to a single row the same way.</p>
  <p><b>Order matters.</b> Tabulation only works if you visit states in an order where every dependency is already filled. Getting that order wrong is the classic tabulation bug — and it is why some problems are far easier to write top-down.</p>`,
  run: function*(inp){
    const n = Math.max(0, Math.min(25, parseNums(inp.n, [10])[0]));
    const dp = new Array(n + 1).fill('');
    const view = (marks) => ({ view:'table', cells:[dp.map(v => v === '' ? '·' : v)],
      colLabels:Array.from({ length:n + 1 }, (_, i) => String(i)), rowLabels:['dp'], corner:'i',
      marks: marks || {}, title:'dp table' });
    dp[0] = 0; if (n >= 1) dp[1] = 1;
    yield { tag:'init', at:'init', note:'Base cases seeded: dp[0]=0' + (n >= 1 ? ', dp[1]=1' : '') + '.',
            data:view({ '0,0':'done', '0,1': n >= 1 ? 'done' : undefined }), vars:{ n }, stats:{ filled: n >= 1 ? 2 : 1 } };
    for (let i = 2; i <= n; i++){
      yield { tag:'fill', at:'fill', note:'dp[' + i + '] = dp[' + (i-1) + '] + dp[' + (i-2) + '] = ' + dp[i-1] + ' + ' + dp[i-2] + ' = ' + (dp[i-1] + dp[i-2]) + '. Both inputs were filled on earlier iterations — never a cache miss.',
              data:view({ ['0,' + i]:'cur', ['0,' + (i-1)]:'cmp', ['0,' + (i-2)]:'cmp' }),
              vars:{ i, 'dp[i-1]':dp[i-1], 'dp[i-2]':dp[i-2] }, stats:{ filled:i + 1 } };
      dp[i] = dp[i-1] + dp[i-2];
    }
    yield { tag:'done', at:'done', note:'fib(' + n + ') = ' + dp[n] + ', computed in ' + Math.max(0, n - 1) + ' additions.',
            data:view(Object.fromEntries(dp.map((_, i) => ['0,' + i, i === n ? 'cur' : 'done']))),
            vars:{ result:dp[n] }, stats:{ filled:n + 1 } };
  }
});

DSA.register({
  id:'knapsack', group:'Recursion & DP', name:'0/1 Knapsack',
  blurb:'For every item and every capacity, decide: take it or leave it. The table is the decision record.',
  complexity:{ time:'O(n·W)', best:'O(n·W)', space:'O(n·W) → O(W)', note:'pseudo-polynomial' },
  inputs:[
    { key:'w',   label:'Weights', type:'text', def:'2, 3, 4, 5' },
    { key:'v',   label:'Values',  type:'text', def:'3, 4, 5, 6' },
    { key:'cap', label:'Capacity', type:'text', def:'8' }
  ],
  flow:{ nodes:[
    { id:'init', title:'dp[0][*] = 0', sub:'no items → zero value', type:'start', r:0, c:0 },
    { id:'cell', title:'For item i, capacity c', type:'act', r:1, c:0 },
    { id:'fit',  title:'Does item i fit? w[i] ≤ c', type:'dec', r:2, c:0 },
    { id:'skip', title:'dp[i][c] = dp[i−1][c]', sub:'no choice — leave it', type:'act', r:3, c:1 },
    { id:'pick', title:'max( leave it , take it )', sub:'dp[i−1][c]  vs  v[i] + dp[i−1][c−w[i]]', type:'act', r:3, c:0 },
    { id:'done', title:'dp[n][W] is the answer', type:'ok', r:4, c:0 }
  ], edges:[
    { from:'init', to:'cell' }, { from:'cell', to:'fit' },
    { from:'fit', to:'skip', label:'no' }, { from:'fit', to:'pick', label:'yes' },
    { from:'pick', to:'cell', label:'next cell' }, { from:'skip', to:'cell', label:'next cell' },
    { from:'pick', to:'done', label:'table full' }
  ]},
  code:{ python:`
def knapsack(w, v, W):                          §init
    n = len(w)                                  §init
    dp = [[0] * (W + 1) for _ in range(n + 1)]  §init
    for i in range(1, n + 1):                   §cell
        for c in range(W + 1):                  §cell
            if w[i-1] > c:                      §fit
                dp[i][c] = dp[i-1][c]           §skip
            else:                               §fit
                dp[i][c] = max(                 §pick
                    dp[i-1][c],                 §pick
                    v[i-1] + dp[i-1][c - w[i-1]]) §pick
    return dp[n][W]                             §done`,
    java:`
static int knapsack(int[] w, int[] v, int W) {  §init
    int n = w.length;                           §init
    int[][] dp = new int[n + 1][W + 1];         §init
    for (int i = 1; i <= n; i++) {              §cell
        for (int c = 0; c <= W; c++) {          §cell
            if (w[i-1] > c) {                   §fit
                dp[i][c] = dp[i-1][c];          §skip
            } else {                            §fit
                dp[i][c] = Math.max(            §pick
                    dp[i-1][c],                 §pick
                    v[i-1] + dp[i-1][c - w[i-1]]); §pick
            }
        }
    }
    return dp[n][W];                            §done
}` },
  explain:`<p><b>What a cell means:</b> <code>dp[i][c]</code> = the best value using only the first <code>i</code> items with capacity exactly <code>c</code> available. Saying that sentence out loud before writing code is 80% of solving any DP.</p>
  <p><b>Every cell reads only the row above</b> — either straight up (leave it) or up-and-left by <code>w[i]</code> (take it). Watch the two highlighted source cells as it steps.</p>
  <p><b>"0/1" means each item is take-once.</b> That is why the "take" branch reads row <code>i−1</code>: after taking item i you may not consider it again. Unbounded knapsack reads row <code>i</code> instead — a one-character change with a completely different meaning.</p>
  <p><b>O(n·W) is pseudo-polynomial, not polynomial</b> — W is a <i>value</i>, not an input length. Capacity 10⁹ makes this table impossible even with 3 items. Knapsack is NP-hard; this DP is only efficient when W is small.</p>
  <p><b>Space:</b> only the previous row is ever read, so a single array iterated <i>backwards</i> over capacity suffices — O(W). Iterate forwards by mistake and you have silently written unbounded knapsack.</p>`,
  run: function*(inp){
    const w = clampArr(parseNums(inp.w, [2,3,4,5]), 8);
    const v = clampArr(parseNums(inp.v, [3,4,5,6]), 8);
    const W = Math.max(1, Math.min(14, parseNums(inp.cap, [8])[0]));
    const n = Math.min(w.length, v.length);
    const dp = Array.from({ length:n + 1 }, () => new Array(W + 1).fill(0));
    const view = (marks) => [
      { view:'table', cells:dp.map(r => r.slice()), marks: marks || {},
        colLabels:Array.from({ length:W + 1 }, (_, c) => String(c)),
        rowLabels:['—'].concat(Array.from({ length:n }, (_, i) => 'w' + w[i] + ' v' + v[i])),
        corner:'cap →', title:'dp[item][capacity]' }
    ];
    yield { tag:'init', at:'init', note:'Row 0 = no items available → value 0 at every capacity. These are the base cases.',
            data:view(Object.fromEntries(Array.from({ length:W + 1 }, (_, c) => ['0,' + c, 'done']))),
            vars:{ n, W }, stats:{ cells:W + 1 } };
    let cells = W + 1;
    for (let i = 1; i <= n; i++){
      for (let c = 0; c <= W; c++){
        cells++;
        const fits = w[i-1] <= c;
        if (!fits){
          dp[i][c] = dp[i-1][c];
          yield { tag:'skip', at:'skip', note:'Item ' + i + ' weighs ' + w[i-1] + ' > capacity ' + c + ' → it cannot fit. Copy straight down: dp[' + i + '][' + c + '] = ' + dp[i][c] + '.',
                  data:view({ [i + ',' + c]:'cur', [(i-1) + ',' + c]:'cmp' }),
                  vars:{ i, c, 'w[i]':w[i-1] }, stats:{ cells } };
        } else {
          const leave = dp[i-1][c], take = v[i-1] + dp[i-1][c - w[i-1]];
          dp[i][c] = Math.max(leave, take);
          yield { tag:'pick', at:'pick',
                  note:'Capacity ' + c + ', item ' + i + ' (w=' + w[i-1] + ', v=' + v[i-1] + '): leave it → ' + leave +
                       ', take it → ' + v[i-1] + ' + dp[' + (i-1) + '][' + (c - w[i-1]) + ']=' + dp[i-1][c-w[i-1]] + ' = ' + take +
                       '.  Best = ' + dp[i][c] + (take > leave ? '  (take)' : '  (leave)'),
                  data:view({ [i + ',' + c]:'cur', [(i-1) + ',' + c]: take > leave ? 'dim' : 'cmp',
                              [(i-1) + ',' + (c - w[i-1])]: take > leave ? 'cmp' : 'dim' }),
                  vars:{ i, c, leave, take }, stats:{ cells } };
        }
      }
    }
    /* reconstruct */
    const chosen = []; let c = W;
    for (let i = n; i >= 1; i--){ if (dp[i][c] !== dp[i-1][c]){ chosen.unshift(i); c -= w[i-1]; } }
    const m = { [n + ',' + W]:'cur' };
    let cc = W;
    for (let i = n; i >= 1; i--){ if (dp[i][cc] !== dp[i-1][cc]){ m[i + ',' + cc] = 'done'; cc -= w[i-1]; } }
    yield { tag:'done', at:'done',
            note:'Best value = ' + dp[n][W] + ' using item(s) ' + (chosen.length ? chosen.join(', ') : 'none') +
                 '. Walk backwards from dp[n][W]: whenever a cell differs from the one above it, that item was taken.',
            data:view(m), vars:{ result:dp[n][W], items:'[' + chosen.join(',') + ']' }, stats:{ cells } };
  }
});

DSA.register({
  id:'lcs', group:'Recursion & DP', name:'Longest Common Subsequence',
  blurb:'Two strings, one grid. Characters match → extend the diagonal; they do not → inherit the better neighbour.',
  complexity:{ time:'O(n·m)', best:'O(n·m)', space:'O(n·m) → O(m)', note:'basis of diff' },
  inputs:[
    { key:'a', label:'String A', type:'text', def:'AGGTAB' },
    { key:'b', label:'String B', type:'text', def:'GXTXAYB' }
  ],
  flow:{ nodes:[
    { id:'init', title:'Row 0 and column 0 are all zero', sub:'an empty string shares nothing', type:'start', r:0, c:0 },
    { id:'cell', title:'Compare a[i−1] with b[j−1]', type:'act', r:1, c:0 },
    { id:'eq',   title:'Characters equal?', type:'dec', r:2, c:0 },
    { id:'diag', title:'dp[i][j] = dp[i−1][j−1] + 1', sub:'extend the common subsequence', type:'act', r:3, c:0 },
    { id:'max',  title:'dp[i][j] = max(dp[i−1][j], dp[i][j−1])', sub:'drop one character, keep the better result', type:'act', r:3, c:1 },
    { id:'done', title:'dp[n][m] is the LCS length', type:'ok', r:4, c:0 }
  ], edges:[
    { from:'init', to:'cell' }, { from:'cell', to:'eq' },
    { from:'eq', to:'diag', label:'yes' }, { from:'eq', to:'max', label:'no' },
    { from:'diag', to:'cell', label:'next cell' }, { from:'max', to:'cell', label:'next cell' },
    { from:'diag', to:'done', label:'grid full' }
  ]},
  code:{ python:`
def lcs(a, b):                                  §init
    n, m = len(a), len(b)                       §init
    dp = [[0]*(m+1) for _ in range(n+1)]        §init
    for i in range(1, n + 1):                   §cell
        for j in range(1, m + 1):               §cell
            if a[i-1] == b[j-1]:                §eq
                dp[i][j] = dp[i-1][j-1] + 1     §diag
            else:                               §eq
                dp[i][j] = max(dp[i-1][j],      §max
                               dp[i][j-1])      §max
    return dp[n][m]                             §done`,
    java:`
static int lcs(String a, String b) {            §init
    int n = a.length(), m = b.length();         §init
    int[][] dp = new int[n + 1][m + 1];         §init
    for (int i = 1; i <= n; i++) {              §cell
        for (int j = 1; j <= m; j++) {          §cell
            if (a.charAt(i-1) == b.charAt(j-1)) { §eq
                dp[i][j] = dp[i-1][j-1] + 1;    §diag
            } else {                            §eq
                dp[i][j] = Math.max(dp[i-1][j], §max
                                    dp[i][j-1]); §max
            }
        }
    }
    return dp[n][m];                            §done
}` },
  explain:`<p><b>Subsequence ≠ substring.</b> A subsequence may skip characters but must keep order. "ACE" is a subsequence of "ABCDE"; "AEC" is not.</p>
  <p><b>The cell meaning:</b> <code>dp[i][j]</code> = LCS length of the first <code>i</code> characters of A and first <code>j</code> of B. The +1 offset (index <code>i−1</code> in the string for row <code>i</code>) exists so row/column 0 can represent the empty prefix — that is what gives you free base cases.</p>
  <p><b>Why the two branches are exactly right:</b> if the last characters match, they can always be paired in some optimal LCS, so the answer is 1 + the answer for both prefixes shortened. If they differ, at least one of them is unusable — try dropping each and keep the better.</p>
  <p><b>This grid is the diff algorithm.</b> Git, <code>diff</code>, and every code-review pane are running a descendant of this table (Myers' algorithm is the fast variant). Trace back from the bottom-right to recover the actual alignment.</p>`,
  run: function*(inp){
    const a = String(inp.a || 'AGGTAB').slice(0, 10);
    const b = String(inp.b || 'GXTXAYB').slice(0, 10);
    const n = a.length, m = b.length;
    const dp = Array.from({ length:n + 1 }, () => new Array(m + 1).fill(0));
    const view = (marks) => [
      { view:'table', cells:dp.map(r => r.slice()), marks: marks || {},
        colLabels:['·'].concat(Array.from(b)), rowLabels:['·'].concat(Array.from(a)),
        corner:'B →', title:'dp[i][j] = LCS of prefixes' }
    ];
    yield { tag:'init', at:'init', note:'Row 0 and column 0 are zero: an empty prefix shares nothing with anything.',
            data:view(Object.assign(
              Object.fromEntries(Array.from({ length:m + 1 }, (_, j) => ['0,' + j, 'done'])),
              Object.fromEntries(Array.from({ length:n + 1 }, (_, i) => [i + ',0', 'done'])))),
            vars:{ n, m }, stats:{ cells:n + m + 1 } };
    let cells = n + m + 1;
    for (let i = 1; i <= n; i++){
      for (let j = 1; j <= m; j++){
        cells++;
        const eq = a[i-1] === b[j-1];
        if (eq){
          dp[i][j] = dp[i-1][j-1] + 1;
          yield { tag:'diag', at:'diag', note:"'" + a[i-1] + "' == '" + b[j-1] + "' → extend the diagonal: " + dp[i-1][j-1] + ' + 1 = ' + dp[i][j] + '.',
                  data:view({ [i + ',' + j]:'cur', [(i-1) + ',' + (j-1)]:'done' }),
                  vars:{ i, j, 'a[i-1]':a[i-1], 'b[j-1]':b[j-1] }, stats:{ cells } };
        } else {
          const up = dp[i-1][j], left = dp[i][j-1];
          dp[i][j] = Math.max(up, left);
          yield { tag:'max', at:'max', note:"'" + a[i-1] + "' ≠ '" + b[j-1] + "' → best of dropping one character: max(up=" + up + ', left=' + left + ') = ' + dp[i][j] + '.',
                  data:view({ [i + ',' + j]:'cur', [(i-1) + ',' + j]: up >= left ? 'cmp' : 'dim',
                              [i + ',' + (j-1)]: left > up ? 'cmp' : 'dim' }),
                  vars:{ i, j, up, left }, stats:{ cells } };
        }
      }
    }
    /* traceback */
    let i = n, j = m; const path = {}, seq = [];
    while (i > 0 && j > 0){
      if (a[i-1] === b[j-1]){ path[i + ',' + j] = 'done'; seq.unshift(a[i-1]); i--; j--; }
      else if (dp[i-1][j] >= dp[i][j-1]){ path[i + ',' + j] = 'dim'; i--; }
      else { path[i + ',' + j] = 'dim'; j--; }
    }
    yield { tag:'done', at:'done', note:'LCS length = ' + dp[n][m] + ', one such subsequence is "' + seq.join('') + '". The highlighted path is the traceback from the bottom-right corner.',
            data:view(Object.assign(path, { [n + ',' + m]:'cur' })),
            vars:{ length:dp[n][m], lcs:seq.join('') }, stats:{ cells } };
  }
});
