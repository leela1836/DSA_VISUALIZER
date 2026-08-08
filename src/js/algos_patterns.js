/* ══════════════════════════════════════════════════════════════════════
   PATTERNS — the shapes that show up over and over in interviews
   ══════════════════════════════════════════════════════════════════════ */
const C = (s, marks, ptrs, extra) => Object.assign(
  { view:'array', values: Array.isArray(s) ? s.slice() : Array.from(s),
    marks: marks || {}, pointers: ptrs || {}, mode:'cells' }, extra);

/* ───────────────────────── Sliding window, fixed size ───────────────────────── */
DSA.register({
  id:'sliding-window-fixed', group:'Patterns', name:'Sliding Window (fixed k)',
  blurb:'Maximum sum of any k consecutive elements — in one pass, by adding the entering element and subtracting the leaving one.',
  complexity:{ time:'O(n)', best:'O(n)', space:'O(1)', note:'brute force is O(n·k)' },
  inputs:[
    { key:'arr', label:'Array', type:'text', def:'2, 1, 5, 1, 3, 2, 8, 1' },
    { key:'k',   label:'Window k', type:'text', def:'3' }
  ],
  flow:{ nodes:[
    { id:'build', title:'Sum the first k elements', sub:'best = sum', type:'start', r:0, c:0 },
    { id:'slide', title:'More elements to bring in?', sub:'i < n', type:'dec', r:1, c:0 },
    { id:'roll',  title:'sum += a[i] − a[i−k]', sub:'one in, one out — O(1) per move', type:'act', r:2, c:0 },
    { id:'best',  title:'sum > best ?', type:'dec', r:3, c:0 },
    { id:'upd',   title:'best = sum', type:'act', r:4, c:0 },
    { id:'done',  title:'Return best', type:'ok', r:5, c:1 }
  ], edges:[
    { from:'build', to:'slide' }, { from:'slide', to:'roll', label:'yes' },
    { from:'roll', to:'best' }, { from:'best', to:'upd', label:'yes' },
    { from:'upd', to:'slide', label:'i++' }, { from:'best', to:'slide', label:'no, i++' },
    { from:'slide', to:'done', label:'no' }
  ]},
  code:{ python:`
def max_sum_k(a, k):                            §build
    total = sum(a[:k])                          §build
    best = total                                §build
    for i in range(k, len(a)):                  §slide
        total += a[i] - a[i - k]                §roll
        if total > best:                        §best
            best = total                        §upd
    return best                                 §done`,
    java:`
static int maxSumK(int[] a, int k) {            §build
    int total = 0;                              §build
    for (int i = 0; i < k; i++) total += a[i];  §build
    int best = total;                           §build
    for (int i = k; i < a.length; i++) {        §slide
        total += a[i] - a[i - k];               §roll
        if (total > best) {                     §best
            best = total;                       §upd
        }
    }
    return best;                                §done
}` },
  explain:`<p><b>The trick is the subtraction.</b> Recomputing the sum of every window costs O(k) each time → O(n·k). Because consecutive windows overlap in k−1 elements, you can go from one to the next in O(1): add the element entering on the right, subtract the one leaving on the left.</p>
  <p><b>Recognise it when</b> the problem says <i>contiguous</i> subarray/substring <i>of size k</i>. Fixed size → this template. Variable size → the two-pointer window (see "Longest substring without repeats").</p>`,
  run: function*(inp){
    const a = clampArr(parseNums(inp.arr, [2,1,5,1,3,2,8,1]), 30);
    const k = Math.max(1, Math.min(a.length, parseNums(inp.k, [3])[0] || 3));
    let total = 0;
    for (let i = 0; i < k; i++) total += a[i];
    let best = total, bestLo = 0;
    const M = (lo, hi, extra) => { const m = {};
      for (let x = lo; x <= hi; x++) m[x] = 'win'; return Object.assign(m, extra || {}); };
    yield { tag:'build', at:'build', note:'First window a[0..' + (k-1) + '] sums to ' + total + '. That is our starting best.',
            data:A(a, M(0, k - 1), {}, { windows:[{ lo:0, hi:k - 1, label:'sum = ' + total }] }),
            vars:{ k, total, best }, stats:{ windows:1 } };
    let w = 1;
    for (let i = k; i < a.length; i++){
      w++;
      const out = a[i - k], inn = a[i];
      total += inn - out;
      yield { tag:'roll', at:'roll',
              note:'Slide right: ' + inn + ' enters, ' + out + ' leaves → sum = ' + total + '  (one add, one subtract — no rescan).',
              data:A(a, M(i - k + 1, i, { [i - k]:'bad', [i]:'cmp' }), { i },
                     { windows:[{ lo:i - k + 1, hi:i, label:'sum = ' + total }] }),
              vars:{ i, total, best }, stats:{ windows:w } };
      if (total > best){
        best = total; bestLo = i - k + 1;
        yield { tag:'upd', at:'upd', note:'New best = ' + best + ' at window [' + bestLo + '..' + i + '].',
                data:A(a, M(bestLo, i), { i }, { windows:[{ lo:bestLo, hi:i, label:'best = ' + best }] }),
                vars:{ i, total, best }, stats:{ windows:w } };
      }
    }
    const m = {}; for (let x = bestLo; x < bestLo + k; x++) m[x] = 'done';
    yield { tag:'done', at:'done', note:'Answer: ' + best + ' from window [' + bestLo + '..' + (bestLo + k - 1) + ']. Every element was touched exactly twice.',
            data:A(a, m, {}, { windows:[{ lo:bestLo, hi:bestLo + k - 1, label:'best = ' + best }] }),
            vars:{ best }, stats:{ windows:w } };
  }
});

/* ───────────────────────── Variable window ───────────────────────── */
DSA.register({
  id:'longest-unique', group:'Patterns', name:'Longest Substring w/o Repeats',
  blurb:'A window that grows on the right and only shrinks when it becomes invalid — the variable-size sliding window template.',
  complexity:{ time:'O(n)', best:'O(n)', space:'O(min(n,Σ))', note:'each index enters/leaves once' },
  inputs:[{ key:'s', label:'String', type:'text', def:'abcabcbb' }],
  flow:{ nodes:[
    { id:'init', title:'left = 0, seen = { }', type:'start', r:0, c:0 },
    { id:'grow', title:'Extend right to s[right]', type:'act', r:1, c:0 },
    { id:'bad',  title:'s[right] already inside the window?', type:'dec', r:2, c:0 },
    { id:'shrink',title:'Move left past the old copy', sub:'window is valid again', type:'act', r:3, c:0 },
    { id:'rec',  title:'Record window length', sub:'best = max(best, right − left + 1)', type:'act', r:4, c:0 },
    { id:'more', title:'right < n ?', type:'dec', r:5, c:0 },
    { id:'done', title:'Return best', type:'ok', r:6, c:1 }
  ], edges:[
    { from:'init', to:'grow' }, { from:'grow', to:'bad' },
    { from:'bad', to:'shrink', label:'yes' }, { from:'shrink', to:'rec' },
    { from:'bad', to:'rec', label:'no' }, { from:'rec', to:'more' },
    { from:'more', to:'grow', label:'yes, right++' }, { from:'more', to:'done', label:'no' }
  ]},
  code:{ python:`
def longest_unique(s):                          §init
    seen = {}                                   §init
    left = best = 0                             §init
    for right, ch in enumerate(s):              §grow
        if ch in seen and seen[ch] >= left:     §bad
            left = seen[ch] + 1                 §shrink
        seen[ch] = right                        §rec
        best = max(best, right - left + 1)      §rec
    return best                                 §done`,
    java:`
static int longestUnique(String s) {            §init
    Map<Character,Integer> seen = new HashMap<>(); §init
    int left = 0, best = 0;                     §init
    for (int right = 0; right < s.length(); right++) { §grow
        char ch = s.charAt(right);              §grow
        if (seen.containsKey(ch) && seen.get(ch) >= left) §bad
            left = seen.get(ch) + 1;            §shrink
        seen.put(ch, right);                    §rec
        best = Math.max(best, right - left + 1); §rec
    }
    return best;                                §done
}` },
  explain:`<p><b>Why <code>seen[ch] >= left</code> and not just <code>ch in seen</code>:</b> the map remembers characters that have already fallen <i>outside</i> the window. Without the position check you would shrink for a duplicate that is no longer there — and <code>left</code> could even move backwards, breaking the O(n) bound.</p>
  <p><b>Why it is O(n) despite the nested feel:</b> <code>left</code> only ever increases. Across the whole run it advances at most n times, so total work is O(n) — this is amortised analysis, the same argument that makes the monotonic stack O(n).</p>
  <p><b>The template:</b> grow right unconditionally → while invalid, shrink left → record the answer. Swap the "invalid" test and you have solved a dozen other problems.</p>`,
  run: function*(inp){
    const s = String(inp.s || 'abcabcbb').slice(0, 30);
    const seen = {}; let left = 0, best = 0, bestLo = 0, bestHi = -1;
    yield { tag:'init', at:'init', note:'Empty window at the left edge.', data:C(s, {}),
            vars:{ left:0, best:0 }, stats:{ maxLen:0 } };
    for (let right = 0; right < s.length; right++){
      const ch = s[right];
      const winMarks = () => { const m = {};
        for (let x = left; x <= right; x++) m[x] = 'win'; return m; };
      const m1 = winMarks(); m1[right] = 'cmp';
      yield { tag:'grow', at:'grow', note:"Extend right to index " + right + " ('" + ch + "').",
              data:C(s, m1, { left, right }, { windows:[{ lo:left, hi:right, label:'window' }] }),
              vars:{ left, right, ch, best }, stats:{ maxLen:best } };
      const dup = seen[ch] != null && seen[ch] >= left;
      yield { tag:'bad', at:'bad',
              note: dup ? "'" + ch + "' is already inside the window at index " + seen[ch] + ' → the window is invalid.'
                        : "'" + ch + "' is new to this window → still valid.",
              data:C(s, Object.assign(winMarks(), dup ? { [seen[ch]]:'bad', [right]:'bad' } : { [right]:'done' }),
                     { left, right }, { windows:[{ lo:left, hi:right, label:'window' }] }),
              vars:{ left, right, ch, prev:seen[ch] }, stats:{ maxLen:best } };
      if (dup){
        const old = left; left = seen[ch] + 1;
        yield { tag:'shrink', at:'shrink', note:'Jump left from ' + old + ' to ' + left + ' — just past the old copy. Never move left backwards.',
                data:C(s, winMarks(), { left, right }, { windows:[{ lo:left, hi:right, label:'window' }] }),
                vars:{ left, right, ch }, stats:{ maxLen:best } };
      }
      seen[ch] = right;
      const len = right - left + 1;
      if (len > best){ best = len; bestLo = left; bestHi = right; }
      yield { tag:'rec', at:'rec', note:'Window "' + s.slice(left, right + 1) + '" has length ' + len + '. Best so far = ' + best + '.',
              data:C(s, winMarks(), { left, right }, { windows:[{ lo:left, hi:right, label:'len ' + len }] }),
              vars:{ left, right, len, best }, stats:{ maxLen:best } };
    }
    const mf = {}; for (let x = bestLo; x <= bestHi; x++) mf[x] = 'done';
    yield { tag:'done', at:'done', note:'Longest is "' + s.slice(bestLo, bestHi + 1) + '" with length ' + best + '.',
            data:C(s, mf, {}, { windows:[{ lo:bestLo, hi:bestHi, label:'best = ' + best }] }),
            vars:{ best }, stats:{ maxLen:best } };
  }
});

/* ───────────────────────── Two pointers ───────────────────────── */
DSA.register({
  id:'two-pointer-sum', group:'Patterns', name:'Two Pointers — Pair Sum',
  blurb:'On a sorted array, converge two pointers from both ends. Every comparison eliminates a whole column of pairs.',
  complexity:{ time:'O(n)', best:'O(1)', space:'O(1)', note:'requires sorted input' },
  inputs:[
    { key:'arr',    label:'Sorted array', type:'text', def:'1, 3, 4, 6, 8, 10, 13' },
    { key:'target', label:'Target sum',   type:'text', def:'12' }
  ],
  flow:{ nodes:[
    { id:'init', title:'lo = 0, hi = n − 1', type:'start', r:0, c:0 },
    { id:'loop', title:'lo < hi ?', type:'dec', r:1, c:0 },
    { id:'sum',  title:'s = a[lo] + a[hi]', type:'act', r:2, c:0 },
    { id:'eq',   title:'s == target ?', type:'dec', r:3, c:0 },
    { id:'small',title:'s < target ?', type:'dec', r:4, c:0 },
    { id:'up',   title:'lo++', sub:'need a bigger sum', type:'act', r:5, c:0 },
    { id:'down', title:'hi−−', sub:'need a smaller sum', type:'act', r:5, c:1 },
    { id:'hit',  title:'Return (lo, hi)', type:'ok', r:3, c:1 },
    { id:'none', title:'No such pair', type:'bad', r:6, c:1 }
  ], edges:[
    { from:'init', to:'loop' }, { from:'loop', to:'sum', label:'yes' },
    { from:'sum', to:'eq' }, { from:'eq', to:'hit', label:'yes' },
    { from:'eq', to:'small', label:'no' }, { from:'small', to:'up', label:'yes' },
    { from:'small', to:'down', label:'no' }, { from:'up', to:'loop' },
    { from:'down', to:'loop' }, { from:'loop', to:'none', label:'no' }
  ]},
  code:{ python:`
def pair_sum(a, target):                        §init
    lo, hi = 0, len(a) - 1                      §init
    while lo < hi:                              §loop
        s = a[lo] + a[hi]                       §sum
        if s == target:                         §eq
            return (lo, hi)                     §hit
        elif s < target:                        §small
            lo += 1                             §up
        else:                                   §small
            hi -= 1                             §down
    return None                                 §none`,
    java:`
static int[] pairSum(int[] a, int target) {     §init
    int lo = 0, hi = a.length - 1;              §init
    while (lo < hi) {                           §loop
        int s = a[lo] + a[hi];                  §sum
        if (s == target) {                      §eq
            return new int[]{lo, hi};           §hit
        } else if (s < target) {                §small
            lo++;                               §up
        } else {                                §small
            hi--;                               §down
        }
    }
    return null;                                §none
}` },
  explain:`<p><b>Why moving a pointer is safe</b> — this is the part worth understanding, not memorising. If <code>a[lo] + a[hi] &lt; target</code>, then pairing <code>a[lo]</code> with anything <i>smaller</i> than <code>a[hi]</code> is even further below target. So <code>a[lo]</code> can never be part of a solution and the entire row is eliminated. Symmetrically for <code>hi</code>.</p>
  <p>That is how O(n²) pairs collapse into O(n) steps: each move discards a whole row or column of the pair matrix.</p>
  <p><b>Recognise it when</b> the input is sorted (or you can afford to sort) and you are looking for a pair/triple meeting a numeric condition. 3-Sum is just this loop nested inside one more.</p>`,
  run: function*(inp){
    const a = clampArr(parseNums(inp.arr, [1,3,4,6,8,10,13]), 30).sort((x, y) => x - y);
    const t = parseNums(inp.target, [14])[0];
    let lo = 0, hi = a.length - 1, steps = 0;
    const band = extra => { const m = {};
      for (let x = 0; x < a.length; x++) m[x] = (x < lo || x > hi) ? 'dim' : 'base';
      return Object.assign(m, extra || {}); };
    yield { tag:'init', at:'init', note:'Sorted input, target = ' + t + '. Pointers at both ends.',
            data:A(a, band(), { lo, hi }), vars:{ lo, hi, target:t }, stats:{ steps:0 } };
    while (lo < hi){
      steps++;
      const s = a[lo] + a[hi];
      yield { tag:'sum', at:'sum', note:'a[' + lo + ']+a[' + hi + '] = ' + a[lo] + ' + ' + a[hi] + ' = ' + s + ' vs target ' + t + '.',
              data:A(a, band({ [lo]:'cmp', [hi]:'cmp' }), { lo, hi }), vars:{ lo, hi, sum:s }, stats:{ steps } };
      if (s === t){
        yield { tag:'hit', at:'hit', note:'Match — indices (' + lo + ', ' + hi + ') sum to ' + t + '.',
                data:A(a, band({ [lo]:'done', [hi]:'done' }), { lo, hi }), vars:{ lo, hi, sum:s }, stats:{ steps } };
        return;
      }
      if (s < t){
        yield { tag:'up', at:'up', note:s + ' < ' + t + ' → too small. a[' + lo + ']=' + a[lo] + ' cannot pair with anything, drop it. lo → ' + (lo+1) + '.',
                data:A(a, band({ [lo]:'bad' }), { lo, hi }), vars:{ lo, hi, sum:s }, stats:{ steps } };
        lo++;
      } else {
        yield { tag:'down', at:'down', note:s + ' > ' + t + ' → too big. a[' + hi + ']=' + a[hi] + ' cannot pair with anything, drop it. hi → ' + (hi-1) + '.',
                data:A(a, band({ [hi]:'bad' }), { lo, hi }), vars:{ lo, hi, sum:s }, stats:{ steps } };
        hi--;
      }
    }
    yield { tag:'none', at:'none', note:'Pointers met — no pair sums to ' + t + '.',
            data:A(a, band()), vars:{ lo, hi }, stats:{ steps } };
  }
});

/* ───────────────────────── Kadane ───────────────────────── */
DSA.register({
  id:'kadane', group:'Patterns', name:"Kadane — Max Subarray",
  blurb:'At each index, decide: extend the previous subarray, or start fresh here. One pass, O(1) memory.',
  complexity:{ time:'O(n)', best:'O(n)', space:'O(1)', note:'DP in disguise' },
  inputs:[{ key:'arr', label:'Array (negatives welcome)', type:'text', def:'-2, 1, -3, 4, -1, 2, 1, -5, 4' }],
  flow:{ nodes:[
    { id:'init', title:'cur = best = a[0]', type:'start', r:0, c:0 },
    { id:'loop', title:'More elements?', type:'dec', r:1, c:0 },
    { id:'pick', title:'a[i] > cur + a[i] ?', sub:'is the past baggage worth carrying?', type:'dec', r:2, c:0 },
    { id:'restart', title:'cur = a[i]', sub:'abandon the prefix, start here', type:'act', r:3, c:0 },
    { id:'extend',  title:'cur = cur + a[i]', sub:'extend the running subarray', type:'act', r:3, c:1 },
    { id:'best', title:'best = max(best, cur)', type:'act', r:4, c:0 },
    { id:'done', title:'Return best', type:'ok', r:5, c:1 }
  ], edges:[
    { from:'init', to:'loop' }, { from:'loop', to:'pick', label:'yes' },
    { from:'pick', to:'restart', label:'yes' }, { from:'pick', to:'extend', label:'no' },
    { from:'restart', to:'best' }, { from:'extend', to:'best' },
    { from:'best', to:'loop', label:'i++' }, { from:'loop', to:'done', label:'no' }
  ]},
  code:{ python:`
def max_subarray(a):                            §init
    cur = best = a[0]                           §init
    for i in range(1, len(a)):                  §loop
        if a[i] > cur + a[i]:                   §pick
            cur = a[i]                          §restart
        else:                                   §pick
            cur = cur + a[i]                    §extend
        best = max(best, cur)                   §best
    return best                                 §done`,
    java:`
static int maxSubarray(int[] a) {               §init
    int cur = a[0], best = a[0];                §init
    for (int i = 1; i < a.length; i++) {        §loop
        if (a[i] > cur + a[i]) {                §pick
            cur = a[i];                         §restart
        } else {                                §pick
            cur = cur + a[i];                   §extend
        }
        best = Math.max(best, cur);             §best
    }
    return best;                                §done
}` },
  explain:`<p><b>The state that makes it work:</b> <code>cur</code> = the best sum of a subarray <i>that must end exactly at index i</i>. That constraint is what turns a hard global question into a trivial local one.</p>
  <p><b>The decision:</b> a subarray ending at i is either just <code>a[i]</code>, or <code>a[i]</code> glued onto the best subarray ending at i−1. If that previous best is negative, carrying it can only hurt — so drop it.</p>
  <p><b>Two variables, not two loops.</b> <code>cur</code> is the local answer, <code>best</code> is the global one. Confusing them is the classic bug: returning <code>cur</code> gives you the best subarray ending at the <i>last</i> index, not the best overall.</p>`,
  run: function*(inp){
    const a = clampArr(parseNums(inp.arr, [-2,1,-3,4,-1,2,1,-5,4]), 30);
    let cur = a[0], best = a[0], lo = 0, bLo = 0, bHi = 0;
    const M = (l, r, extra) => { const m = {};
      for (let x = l; x <= r; x++) m[x] = 'win'; return Object.assign(m, extra || {}); };
    yield { tag:'init', at:'init', note:'cur = best = a[0] = ' + a[0] + '.',
            data:A(a, M(0, 0), { i:0 }), vars:{ cur, best }, stats:{ best } };
    for (let i = 1; i < a.length; i++){
      const restart = a[i] > cur + a[i];
      yield { tag:'pick', at:'pick',
              note:'At a[' + i + ']=' + a[i] + ': extend gives ' + (cur + a[i]) + ', start fresh gives ' + a[i] + ' → ' +
                   (restart ? 'the running prefix (' + cur + ') is dead weight, restart.' : 'extending wins.'),
              data:A(a, M(lo, i - 1, { [i]:'cmp' }), { i }, { windows:[{ lo, hi:i - 1, label:'cur = ' + cur }] }),
              vars:{ i, cur, 'cur+a[i]':cur + a[i], 'a[i]':a[i] }, stats:{ best } };
      if (restart){ cur = a[i]; lo = i; } else cur = cur + a[i];
      yield { tag: restart ? 'restart' : 'extend', at: restart ? 'restart' : 'extend',
              note: restart ? 'Restart at index ' + i + '. cur = ' + cur + '.' : 'Extend. cur = ' + cur + '.',
              data:A(a, M(lo, i), { i }, { windows:[{ lo, hi:i, label:'cur = ' + cur }] }),
              vars:{ i, cur, lo }, stats:{ best } };
      if (cur > best){ best = cur; bLo = lo; bHi = i; }
      yield { tag:'best', at:'best', note:'best = max(best, cur) = ' + best + '.',
              data:A(a, M(bLo, bHi), { i }, { windows:[{ lo:bLo, hi:bHi, label:'best = ' + best }] }),
              vars:{ i, cur, best }, stats:{ best } };
    }
    const mf = {}; for (let x = bLo; x <= bHi; x++) mf[x] = 'done';
    yield { tag:'done', at:'done', note:'Maximum subarray sum = ' + best + ', from index ' + bLo + ' to ' + bHi + '.',
            data:A(a, mf, {}, { windows:[{ lo:bLo, hi:bHi, label:'answer = ' + best }] }),
            vars:{ best }, stats:{ best } };
  }
});

/* ───────────────────────── Monotonic stack ───────────────────────── */
DSA.register({
  id:'next-greater', group:'Patterns', name:'Monotonic Stack — Next Greater',
  blurb:'For each element find the next strictly greater one to its right, in O(n), using a stack that stays decreasing.',
  complexity:{ time:'O(n)', best:'O(n)', space:'O(n)', note:'each index pushed & popped once' },
  inputs:[{ key:'arr', label:'Array', type:'text', def:'2, 1, 2, 4, 3, 1, 5' }],
  flow:{ nodes:[
    { id:'init', title:'stack = [ ], ans = −1 everywhere', type:'start', r:0, c:0 },
    { id:'loop', title:'More elements?', type:'dec', r:1, c:0 },
    { id:'pop',  title:'stack top < a[i] ?', sub:'a[i] is the answer for that index', type:'dec', r:2, c:0 },
    { id:'res',  title:'ans[stack.pop()] = a[i]', type:'act', r:3, c:0 },
    { id:'push', title:'push i', sub:'still waiting for its answer', type:'act', r:4, c:0 },
    { id:'done', title:'Leftovers keep −1', type:'ok', r:5, c:1 }
  ], edges:[
    { from:'init', to:'loop' }, { from:'loop', to:'pop', label:'yes' },
    { from:'pop', to:'res', label:'yes' }, { from:'res', to:'pop', label:'check again' },
    { from:'pop', to:'push', label:'no' }, { from:'push', to:'loop', label:'i++' },
    { from:'loop', to:'done', label:'no' }
  ]},
  code:{ python:`
def next_greater(a):                            §init
    ans = [-1] * len(a)                         §init
    stack = []          # indices, values desc  §init
    for i, x in enumerate(a):                   §loop
        while stack and a[stack[-1]] < x:       §pop
            ans[stack.pop()] = x                §res
        stack.append(i)                         §push
    return ans                                  §done`,
    java:`
static int[] nextGreater(int[] a) {             §init
    int[] ans = new int[a.length];              §init
    Arrays.fill(ans, -1);                       §init
    Deque<Integer> stack = new ArrayDeque<>();  §init
    for (int i = 0; i < a.length; i++) {        §loop
        while (!stack.isEmpty() && a[stack.peek()] < a[i]) §pop
            ans[stack.pop()] = a[i];            §res
        stack.push(i);                          §push
    }
    return ans;                                 §done
}` },
  explain:`<p><b>What the stack holds:</b> indices whose answer is still unknown — and their values are always in decreasing order from bottom to top. That ordering is the invariant; the moment a bigger value arrives, everything smaller on top has just found its answer.</p>
  <p><b>Why O(n) despite the inner while:</b> every index is pushed exactly once and popped at most once, so the total number of pops across the entire run is ≤ n. The nested loop is a red herring — count total work, not loop nesting.</p>
  <p><b>Same skeleton solves:</b> next smaller (flip the comparison), previous greater (scan right-to-left), largest rectangle in a histogram, daily temperatures, and stock span.</p>`,
  run: function*(inp){
    const a = clampArr(parseNums(inp.arr, [2,1,2,4,3,1,5]), 22);
    const ans = new Array(a.length).fill(-1), st = [];
    const view = (extra, stMark) => [
      A(a, Object.assign({}, extra), {}, { title:'input' }),
      { view:'list', orient:'v', links:false, title:'stack (top first)',
        nodes: st.slice().reverse().map(i => ({ val:'a[' + i + ']=' + a[i] })),
        marks: stMark || {}, emptyLabel:'stack is empty' },
      A(ans, {}, {}, { title:'answer', mode:'cells' })
    ];
    yield { tag:'init', at:'init', note:'Empty stack. Every answer starts at −1.', data:view({}),
            vars:{}, stats:{ pushes:0, pops:0 } };
    let pu = 0, po = 0;
    for (let i = 0; i < a.length; i++){
      yield { tag:'loop', at:'loop', note:'Arrive at a[' + i + '] = ' + a[i] + '.',
              data:view({ [i]:'cmp' }), vars:{ i, 'a[i]':a[i], stack:'[' + st.join(',') + ']' },
              stats:{ pushes:pu, pops:po } };
      while (st.length && a[st[st.length - 1]] < a[i]){
        const t = st[st.length - 1];
        yield { tag:'pop', at:'pop', note:'Top of stack is index ' + t + ' (value ' + a[t] + ') and ' + a[t] + ' < ' + a[i] + ' → ' + a[i] + ' is its next greater element.',
                data:view({ [i]:'cmp', [t]:'swap' }, { 0:'swap' }), vars:{ i, top:t },
                stats:{ pushes:pu, pops:po } };
        st.pop(); po++;
        ans[t] = a[i];
        yield { tag:'res', at:'res', note:'ans[' + t + '] = ' + a[i] + '. Pop it — its job is done.',
                data:view({ [i]:'cmp', [t]:'done' }), vars:{ i, resolved:t },
                stats:{ pushes:pu, pops:po } };
      }
      st.push(i); pu++;
      yield { tag:'push', at:'push', note:'Push index ' + i + '; its own next-greater is still unknown. Stack values stay decreasing: [' + st.map(k => a[k]).join(' > ') + '].',
              data:view({ [i]:'win' }, { 0:'win' }), vars:{ i, stack:'[' + st.join(',') + ']' },
              stats:{ pushes:pu, pops:po } };
    }
    const mf = {}; st.forEach(i => mf[i] = 'bad');
    yield { tag:'done', at:'done', note: st.length
              ? 'Indices ' + st.join(', ') + ' never found a greater element — they keep −1.'
              : 'Every element found its next greater. ' + pu + ' pushes, ' + po + ' pops for n=' + a.length + '.',
            data:view(mf), vars:{}, stats:{ pushes:pu, pops:po } };
  }
});

/* ───────────────────────── LeetCode 3302 ───────────────────────── */
DSA.register({
  id:'lc3302-valid-sequence', group:'Patterns', name:'Greedy + Lookahead (LC 3302)',
  blurb:'Lexicographically smallest index sequence matching word2 in word1, allowing at most one character change. Greedy forward pass guarded by a backward-computed lookahead table.',
  complexity:{ time:'O(n + m)', best:'O(n)', space:'O(m)', note:'two passes' },
  inputs:[
    { key:'w1', label:'word1', type:'text', def:'vbcca' },
    { key:'w2', label:'word2', type:'text', def:'abc' }
  ],
  flow:{ nodes:[
    { id:'pre',  title:'Phase 1 — build the lookahead table', sub:'scan word1 right→left; last[j] = latest start where word2[j:] still fits', type:'act', r:0, c:0 },
    { id:'next', title:'Next character in word1', type:'io', r:1, c:0 },
    { id:'jm',   title:'Already matched word2?', sub:'j == m', type:'dec', r:2, c:0 },
    { id:'match',title:'Char matches, or safe to skip?', sub:'exact match, or unused free pass and word2[j+1:] still fits after i', type:'act', r:3, c:0 },
    { id:'take', title:'Take this index', sub:'res.append(i); j++; spend skip if it was a mismatch', type:'act', r:4, c:0 },
    { id:'final',title:'Matched all of word2?', sub:'check j == m', type:'dec', r:5, c:0 },
    { id:'ok',   title:'Return indices', type:'ok', r:5, c:1 },
    { id:'bad',  title:'Return empty list', type:'bad', r:6, c:1 }
  ], edges:[
    { from:'pre',  to:'next' },
    { from:'next', to:'jm' },
    { from:'jm',   to:'final', label:'yes, loop ends' },
    { from:'jm',   to:'match', label:'no' },
    { from:'match',to:'take',  label:'yes' },
    { from:'match',to:'next',  label:'no, skip char' },
    { from:'take', to:'next',  label:'i++' },
    { from:'final',to:'ok',    label:'yes' },
    { from:'final',to:'bad',   label:'no' }
  ]},
  code:{ python:`
def valid_sequence(word1, word2):                           §pre
    n, m = len(word1), len(word2)                           §pre
    # last[j] = LATEST index p such that word2[j:]          §pre
    #           is still a subsequence of word1[p:]         §pre
    last = [-1] * (m + 1)                                   §pre
    last[m] = n                                             §pre
    j = m - 1                                               §pre
    for i in range(n - 1, -1, -1):                          §pre
        if j >= 0 and word1[i] == word2[j]:                 §pre
            last[j] = i                                     §pre
            j -= 1                                          §pre

    res, j, skip = [], 0, 0                                 §next
    for i, c in enumerate(word1):                           §next
        if j == m:                                          §jm
            break                                           §jm
        if c == word2[j] or skip == 0 and (                 §match
                j == m - 1 or i < last[j + 1]):             §match
            skip += c != word2[j]                           §take
            res.append(i)                                   §take
            j += 1                                          §take
    return res if j == m else []                            §final`,
    java:`
static List<Integer> validSequence(String w1, String w2) {  §pre
    int n = w1.length(), m = w2.length();                   §pre
    int[] last = new int[m + 1];                            §pre
    Arrays.fill(last, -1);                                  §pre
    last[m] = n;                                            §pre
    int j = m - 1;                                          §pre
    for (int i = n - 1; i >= 0; i--) {                      §pre
        if (j >= 0 && w1.charAt(i) == w2.charAt(j)) {       §pre
            last[j] = i;                                    §pre
            j--;                                            §pre
        }
    }
    List<Integer> res = new ArrayList<>();                  §next
    j = 0; int skip = 0;                                    §next
    for (int i = 0; i < n; i++) {                           §next
        if (j == m) break;                                  §jm
        char c = w1.charAt(i);                              §jm
        if (c == w2.charAt(j) || (skip == 0 &&              §match
             (j == m - 1 || i < last[j + 1]))) {            §match
            if (c != w2.charAt(j)) skip++;                  §take
            res.add(i);                                     §take
            j++;                                            §take
        }
    }
    return j == m ? res : new ArrayList<>();                §final
}` },
  explain:`<p><b>The problem:</b> pick increasing indices in <code>word1</code> so the chosen characters equal <code>word2</code> after changing <b>at most one</b> character. Among all valid choices, return the lexicographically smallest index list.</p>
  <p><b>Why plain greedy fails.</b> Lexicographically smallest means "take the earliest index you possibly can". But spending your one free mismatch early can strand you — the rest of <code>word2</code> may no longer fit in what remains of <code>word1</code>. So you need to know, before committing, whether the tail still fits.</p>
  <p><b>That is exactly what <code>last[]</code> buys you.</b> <code>last[j]</code> is the <i>latest</i> position in <code>word1</code> from which <code>word2[j:]</code> can still be matched exactly. Built in one backward pass, greedily matching <code>word2</code> from its end.</p>
  <p><b>Reading the condition</b> <code>c == word2[j] or skip == 0 and (j == m-1 or i &lt; last[j+1])</code>:</p>
  <ul>
    <li><code>c == word2[j]</code> — a free exact match. Always take it; it costs nothing and earlier is better.</li>
    <li>otherwise, a mismatch is only allowed if <code>skip == 0</code> (the free pass is unused)…</li>
    <li>…<b>and</b> the rest still fits: <code>i &lt; last[j+1]</code> means <code>word2[j+1:]</code> can still be matched starting after <code>i</code>. (<code>j == m-1</code> is the trivial case — nothing left to match.)</li>
  </ul>
  <p><b>Note the Python precedence:</b> <code>and</code> binds tighter than <code>or</code>, so it parses as <code>match or (skip==0 and (…))</code> — which is what you want. Adding those parentheses yourself makes the intent obvious to a reader.</p>
  <p><b>And <code>skip += c != word2[j]</code></b> is the bool-as-int trick: adds 1 on a mismatch, 0 on a match. Compact, but <code>if c != word2[j]: skip += 1</code> reads better in an interview.</p>`,
  run: function*(inp){
    const w1 = String(inp.w1 || 'vbcca').slice(0, 22);
    const w2 = String(inp.w2 || 'abc').slice(0, 12);
    const n = w1.length, m = w2.length;
    const last = new Array(m + 1).fill(-1);
    last[m] = n;

    const show = (o) => {
      o = o || {};
      return [
        C(w1, o.m1 || {}, o.p1 || {}, { title:'word1' }),
        C(w2, o.m2 || {}, o.p2 || {}, { title:'word2' }),
        { view:'array', values:last.map(v => v < 0 ? '∅' : v), marks:o.ml || {}, mode:'cells',
          showIndex:true, title:'last[j] — latest start for word2[j:]' },
        { view:'array', values: o.res || [], marks:o.mr || {}, mode:'cells', showIndex:false,
          title:'result indices', emptyLabel:'(none yet)' }
      ];
    };

    /* ── Phase 1: backward lookahead ── */
    yield { tag:'pre', at:'pre',
            note:'Phase 1. Walk word1 right-to-left, greedily matching word2 from its END. last[m] = ' + n + ' (an empty tail fits anywhere).',
            data:show({ ml:{ [m]:'done' } }), vars:{ n, m }, stats:{ pass:1 } };
    let jb = m - 1;
    for (let i = n - 1; i >= 0; i--){
      const hit = jb >= 0 && w1[i] === w2[jb];
      yield { tag:'pre', at:'pre',
              note:'i=' + i + ": word1[" + i + "]='" + w1[i] + "'" + (jb >= 0 ? " vs word2[" + jb + "]='" + w2[jb] + "' → " + (hit ? 'match' : 'no match') : ' — word2 fully covered'),
              data:show({ m1:{ [i]: hit ? 'done' : 'cmp' }, p1:{ i },
                          m2: jb >= 0 ? { [jb]: hit ? 'done' : 'cmp' } : {}, p2: jb >= 0 ? { j:jb } : {},
                          ml:{ [m]:'done' } }),
              vars:{ i, j:jb }, stats:{ pass:1 } };
      if (hit){
        last[jb] = i;
        yield { tag:'pre', at:'pre',
                note:'last[' + jb + '] = ' + i + ' — word2[' + jb + ':] = "' + w2.slice(jb) + '" can start no later than index ' + i + '.',
                data:show({ m1:{ [i]:'done' }, p1:{ i }, ml:{ [jb]:'swap' } }),
                vars:{ i, j:jb, ['last[' + jb + ']']:i }, stats:{ pass:1 } };
        jb--;
      }
    }
    yield { tag:'pre', at:'pre', note:'Lookahead table complete. ∅ means that suffix cannot be matched at all.',
            data:show({ ml:Object.fromEntries(last.map((_, k) => [k, 'done'])) }), vars:{}, stats:{ pass:1 } };

    /* ── Phase 2: greedy forward ── */
    const res = []; let j = 0, skip = 0;
    const chosen = {};
    yield { tag:'next', at:'next', note:'Phase 2. Walk word1 left-to-right taking the earliest index we can afford.',
            data:show({ res, p2:{ j } }), vars:{ j, skip, res:'[]' }, stats:{ pass:2 } };

    for (let i = 0; i < n; i++){
      if (j === m){
        yield { tag:'jm', at:'jm', note:'j == m — word2 is fully matched, stop scanning.',
                data:show({ res, m1:chosen, mr:Object.fromEntries(res.map((_, k) => [k, 'done'])) }),
                vars:{ i, j, skip }, stats:{ pass:2 } };
        break;
      }
      yield { tag:'next', at:'next', note:"i=" + i + ": word1[" + i + "]='" + w1[i] + "', looking to match word2[" + j + "]='" + w2[j] + "'.",
              data:show({ res, m1:Object.assign({}, chosen, { [i]:'cmp' }), p1:{ i },
                          m2:{ [j]:'cmp' }, p2:{ j } }),
              vars:{ i, j, skip, ch:w1[i], need:w2[j] }, stats:{ pass:2 } };

      const exact = w1[i] === w2[j];
      const tailFits = (j === m - 1) || (i < last[j + 1]);
      const canSkip = skip === 0 && tailFits;
      const take = exact || canSkip;

      let why;
      if (exact) why = "Exact match ('" + w1[i] + "') — free, and earlier is always lexicographically better. Take it.";
      else if (skip !== 0) why = "Mismatch, but the free pass is already spent (skip=1). Cannot take index " + i + ".";
      else if (!tailFits) why = 'Mismatch, free pass available — but last[' + (j+1) + '] = ' + (last[j+1] < 0 ? '∅' : last[j+1]) +
              ', so word2[' + (j+1) + ':] = "' + w2.slice(j+1) + '" would NOT fit after index ' + i + '. Spending the skip here strands us. Skip this char.';
      else why = 'Mismatch, but skip is unused AND last[' + (j+1) + '] = ' + last[j+1] + ' > ' + i +
              ' so the rest still fits. Spend the one free change here — earliest possible index wins.';

      yield { tag:'match', at:'match', note:why,
              data:show({ res, m1:Object.assign({}, chosen, { [i]: take ? 'done' : 'bad' }), p1:{ i },
                          m2:{ [j]: take ? 'done' : 'cmp' }, p2:{ j },
                          ml: j + 1 <= m ? { [j+1]: exact ? 'base' : 'cmp' } : {} }),
              vars:{ i, j, skip, exact, 'last[j+1]': j + 1 <= m ? last[j+1] : '-', take }, stats:{ pass:2 } };

      if (take){
        if (!exact) skip++;
        res.push(i); chosen[i] = exact ? 'done' : 'swap';
        j++;
        yield { tag:'take', at:'take',
                note:'Take index ' + i + (exact ? '' : ' (this is the one changed character — skip is now spent)') +
                     '. res = [' + res.join(', ') + '], j → ' + j + '.',
                data:show({ res, m1:chosen, p1:{ i }, m2:{ [j-1]:'done' }, p2: j < m ? { j } : {},
                            mr:{ [res.length - 1]: exact ? 'done' : 'swap' } }),
                vars:{ i, j, skip, res:'[' + res.join(',') + ']' }, stats:{ pass:2 } };
      }
    }

    const okAll = j === m;
    yield { tag:'final', at: okAll ? 'ok' : 'bad',
            note: okAll
              ? 'j == m → every character of word2 was matched. Answer: [' + res.join(', ') + ']' +
                (skip ? '  (index ' + res[res.findIndex((ix, k) => w1[ix] !== w2[k])] + ' is the changed one)' : '  (no change needed)')
              : 'Loop ended with j = ' + j + ' < m = ' + m + ' — word2 could not be matched even with one free change. Return [].',
            data:show({ res, m1:chosen, mr: okAll ? Object.fromEntries(res.map((_, k) => [k, 'done'])) : Object.fromEntries(res.map((_, k) => [k, 'bad'])) }),
            vars:{ j, m, skip, result: okAll ? '[' + res.join(',') + ']' : '[]' }, stats:{ pass:2 } };
  }
});
