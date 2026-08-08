/* ══════════════════════════════════════════════════════════════════════
   SORTING
   ══════════════════════════════════════════════════════════════════════ */
const ARR_IN = { key:'arr', label:'Array', type:'text', def:'5, 3, 8, 4, 2, 7, 1, 6' };
const A = (values, marks, pointers, extra) =>
  Object.assign({ view:'array', values: values.slice(), marks: marks || {}, pointers: pointers || {} }, extra);

/* ───────────────────────────── Bubble ───────────────────────────── */
DSA.register({
  id:'bubble-sort', group:'Sorting', name:'Bubble Sort',
  blurb:'Repeatedly walk the array swapping adjacent out-of-order pairs. After pass k the largest k items have bubbled to the end.',
  complexity:{ time:'O(n²)', best:'O(n)', space:'O(1)', note:'stable' },
  inputs:[ARR_IN],
  flow:{ nodes:[
    { id:'start', title:'Begin a pass',        sub:'swapped = false', type:'start', r:0, c:0 },
    { id:'scan',  title:'More pairs to check?',sub:'j < n − i − 1',   type:'dec',   r:1, c:0 },
    { id:'cmp',   title:'a[j] > a[j+1] ?',     sub:'adjacent pair out of order',    type:'dec', r:2, c:0 },
    { id:'swap',  title:'Swap the pair',       sub:'swapped = true',  type:'act',   r:3, c:0 },
    { id:'passend',title:'Any swap this pass?',sub:'already sorted if none',        type:'dec', r:4, c:0 },
    { id:'done',  title:'Array is sorted',     type:'ok', r:5, c:1 }
  ], edges:[
    { from:'start', to:'scan' },
    { from:'scan',  to:'cmp',  label:'yes' },
    { from:'cmp',   to:'swap', label:'yes' },
    { from:'swap',  to:'scan', label:'j++' },
    { from:'cmp',   to:'scan', label:'no, j++' },
    { from:'scan',  to:'passend', label:'no' },
    { from:'passend', to:'start', label:'yes' },
    { from:'passend', to:'done',  label:'no' }
  ]},
  code:{ python:`
def bubble_sort(a):                             §start
    n = len(a)                                  §start
    for i in range(n):                          §start
        swapped = False                         §start
        for j in range(n - i - 1):              §scan
            if a[j] > a[j + 1]:                 §cmp
                a[j], a[j+1] = a[j+1], a[j]     §swap
                swapped = True                  §swap
        if not swapped:                         §passend
            break                               §passend
    return a                                    §done`,
    java:`
static void bubbleSort(int[] a) {               §start
    int n = a.length;                           §start
    for (int i = 0; i < n; i++) {               §start
        boolean swapped = false;                §start
        for (int j = 0; j < n - i - 1; j++) {   §scan
            if (a[j] > a[j + 1]) {              §cmp
                int t = a[j];                   §swap
                a[j] = a[j + 1];                §swap
                a[j + 1] = t;                   §swap
                swapped = true;                 §swap
            }
        }
        if (!swapped) break;                    §passend
    }
}                                               §done` },
  explain:`<p><b>The invariant:</b> after pass <code>i</code>, the last <code>i</code> elements are final. That is why the inner loop shrinks — you never re-check the tail.</p>
  <p><b>Why it can be O(n):</b> the <code>swapped</code> flag. If a whole pass makes no swap, nothing is out of order, so we stop. Without that flag it is always O(n²).</p>
  <p><b>Reality check:</b> almost never the right choice in practice. Learn it for the invariant, not the performance.</p>`,
  run: function*(inp){
    const a = clampArr(parseNums(inp.arr, [5,3,8,4,2,7,1,6]), 40);
    const n = a.length; let cmpN = 0, swN = 0;
    const sortedMark = k => { const m = {}; for (let x = n - k; x < n; x++) m[x] = 'done'; return m; };
    yield { tag:'start', at:'start', note:'Start. Nothing is known to be in place yet.',
            data:A(a, {}), vars:{ n }, stats:{ comparisons:0, swaps:0 } };
    for (let i = 0; i < n; i++){
      let swapped = false;
      for (let j = 0; j < n - i - 1; j++){
        cmpN++;
        const m = sortedMark(i); m[j] = 'cmp'; m[j+1] = 'cmp';
        yield { tag:'cmp', at:'cmp', note:'Compare a[' + j + ']=' + a[j] + ' and a[' + (j+1) + ']=' + a[j+1] +
                ' → ' + (a[j] > a[j+1] ? 'out of order' : 'fine, move on'),
                data:A(a, m, { j }), vars:{ i, j, swapped }, stats:{ comparisons:cmpN, swaps:swN } };
        if (a[j] > a[j+1]){
          [a[j], a[j+1]] = [a[j+1], a[j]]; swapped = true; swN++;
          const m2 = sortedMark(i); m2[j] = 'swap'; m2[j+1] = 'swap';
          yield { tag:'swap', at:'swap', note:'Swapped → ' + a[j] + ' now sits before ' + a[j+1] + '.',
                  data:A(a, m2, { j }), vars:{ i, j, swapped }, stats:{ comparisons:cmpN, swaps:swN } };
        }
      }
      yield { tag:'passend', at:'passend',
              note:'Pass ' + (i+1) + ' done. a[' + (n-i-1) + ']=' + a[n-i-1] + ' is now final.' +
                   (swapped ? '' : ' No swaps happened — the array is already sorted, stop early.'),
              data:A(a, sortedMark(i+1)), vars:{ i, swapped }, stats:{ comparisons:cmpN, swaps:swN } };
      if (!swapped) break;
    }
    const all = {}; for (let x = 0; x < n; x++) all[x] = 'done';
    yield { tag:'done', at:'done', note:'Sorted in ' + cmpN + ' comparisons and ' + swN + ' swaps.',
            data:A(a, all), vars:{}, stats:{ comparisons:cmpN, swaps:swN } };
  }
});

/* ───────────────────────────── Selection ───────────────────────────── */
DSA.register({
  id:'selection-sort', group:'Sorting', name:'Selection Sort',
  blurb:'Scan the unsorted tail for the minimum, then swap it into the current position. Exactly n−1 swaps, always.',
  complexity:{ time:'O(n²)', best:'O(n²)', space:'O(1)', note:'not stable' },
  inputs:[ARR_IN],
  flow:{ nodes:[
    { id:'outer', title:'Fill position i', sub:'min = i', type:'start', r:0, c:0 },
    { id:'scan',  title:'More of the tail to scan?', sub:'j < n', type:'dec', r:1, c:0 },
    { id:'cmp',   title:'a[j] < a[min] ?', type:'dec', r:2, c:0 },
    { id:'upd',   title:'New minimum found', sub:'min = j', type:'act', r:3, c:0 },
    { id:'swap',  title:'Swap a[i] ↔ a[min]', sub:'position i is now final', type:'act', r:4, c:0 },
    { id:'done',  title:'Array is sorted', type:'ok', r:5, c:1 }
  ], edges:[
    { from:'outer', to:'scan' }, { from:'scan', to:'cmp', label:'yes' },
    { from:'cmp', to:'upd', label:'yes' }, { from:'upd', to:'scan', label:'j++' },
    { from:'cmp', to:'scan', label:'no, j++' }, { from:'scan', to:'swap', label:'no' },
    { from:'swap', to:'outer', label:'i++' }, { from:'swap', to:'done', label:'i = n−1' }
  ]},
  code:{ python:`
def selection_sort(a):                          §outer
    n = len(a)                                  §outer
    for i in range(n - 1):                      §outer
        lo = i                                  §outer
        for j in range(i + 1, n):               §scan
            if a[j] < a[lo]:                    §cmp
                lo = j                          §upd
        a[i], a[lo] = a[lo], a[i]               §swap
    return a                                    §done`,
    java:`
static void selectionSort(int[] a) {            §outer
    int n = a.length;                           §outer
    for (int i = 0; i < n - 1; i++) {           §outer
        int lo = i;                             §outer
        for (int j = i + 1; j < n; j++) {       §scan
            if (a[j] < a[lo]) {                 §cmp
                lo = j;                         §upd
            }
        }
        int t = a[i]; a[i] = a[lo]; a[lo] = t;  §swap
    }
}                                               §done` },
  explain:`<p><b>The invariant:</b> the prefix <code>a[0..i-1]</code> is sorted <i>and</i> contains the i smallest values — so it never changes again.</p>
  <p><b>Trade-off:</b> comparisons are always O(n²) — no early exit exists, since you cannot know the minimum without looking at everything. But <b>writes are only O(n)</b>. That makes it interesting when writing is expensive (e.g. flash memory).</p>
  <p><b>Not stable:</b> the long-distance swap can jump an equal element over its twin.</p>`,
  run: function*(inp){
    const a = clampArr(parseNums(inp.arr, [5,3,8,4,2,7,1,6]), 40);
    const n = a.length; let cmpN = 0, swN = 0;
    const pre = k => { const m = {}; for (let x = 0; x < k; x++) m[x] = 'done'; return m; };
    yield { tag:'outer', at:'outer', note:'Start.', data:A(a, {}), vars:{ n }, stats:{ comparisons:0, swaps:0 } };
    for (let i = 0; i < n - 1; i++){
      let lo = i;
      const m0 = pre(i); m0[i] = 'cur';
      yield { tag:'outer', at:'outer', note:'Find the smallest value in a[' + i + '..' + (n-1) + '] to place at index ' + i + '.',
              data:A(a, m0, { i }), vars:{ i, lo }, stats:{ comparisons:cmpN, swaps:swN } };
      for (let j = i + 1; j < n; j++){
        cmpN++;
        const m = pre(i); m[lo] = 'pivot'; m[j] = 'cmp';
        yield { tag:'cmp', at:'cmp', note:'Is a[' + j + ']=' + a[j] + ' < current min a[' + lo + ']=' + a[lo] + '?  ' + (a[j] < a[lo] ? 'yes' : 'no'),
                data:A(a, m, { j, lo }), vars:{ i, j, lo }, stats:{ comparisons:cmpN, swaps:swN } };
        if (a[j] < a[lo]){
          lo = j;
          const m2 = pre(i); m2[lo] = 'pivot';
          yield { tag:'upd', at:'upd', note:'New minimum: ' + a[lo] + ' at index ' + lo + '.',
                  data:A(a, m2, { lo }), vars:{ i, j, lo }, stats:{ comparisons:cmpN, swaps:swN } };
        }
      }
      if (lo !== i){ [a[i], a[lo]] = [a[lo], a[i]]; swN++; }
      const m3 = pre(i + 1);
      yield { tag:'swap', at:'swap', note: lo === i ? 'a[' + i + '] was already the minimum — no swap needed.'
                : 'Swap a[' + i + '] and a[' + lo + ']. Index ' + i + ' is final.',
              data:A(a, m3), vars:{ i, lo }, stats:{ comparisons:cmpN, swaps:swN } };
    }
    const all = {}; for (let x = 0; x < n; x++) all[x] = 'done';
    yield { tag:'done', at:'done', note:'Sorted. ' + cmpN + ' comparisons but only ' + swN + ' swaps.',
            data:A(a, all), vars:{}, stats:{ comparisons:cmpN, swaps:swN } };
  }
});

/* ───────────────────────────── Insertion ───────────────────────────── */
DSA.register({
  id:'insertion-sort', group:'Sorting', name:'Insertion Sort',
  blurb:'Grow a sorted prefix one element at a time, sliding each new value backwards into place — how you sort a hand of cards.',
  complexity:{ time:'O(n²)', best:'O(n)', space:'O(1)', note:'stable, adaptive' },
  inputs:[ARR_IN],
  flow:{ nodes:[
    { id:'take', title:'Take key = a[i]', sub:'j = i − 1', type:'start', r:0, c:0 },
    { id:'cmp',  title:'j ≥ 0 and a[j] > key ?', sub:'still too big — slide it right', type:'dec', r:1, c:0 },
    { id:'shift',title:'a[j+1] = a[j]', sub:'j−−', type:'act', r:2, c:0 },
    { id:'place',title:'a[j+1] = key', sub:'key has landed', type:'act', r:3, c:0 },
    { id:'done', title:'Array is sorted', type:'ok', r:4, c:1 }
  ], edges:[
    { from:'take', to:'cmp' }, { from:'cmp', to:'shift', label:'yes' },
    { from:'shift', to:'cmp' }, { from:'cmp', to:'place', label:'no' },
    { from:'place', to:'take', label:'i++' }, { from:'place', to:'done', label:'i = n' }
  ]},
  code:{ python:`
def insertion_sort(a):                          §take
    for i in range(1, len(a)):                  §take
        key = a[i]                              §take
        j = i - 1                               §take
        while j >= 0 and a[j] > key:            §cmp
            a[j + 1] = a[j]                     §shift
            j -= 1                              §shift
        a[j + 1] = key                          §place
    return a                                    §done`,
    java:`
static void insertionSort(int[] a) {            §take
    for (int i = 1; i < a.length; i++) {        §take
        int key = a[i];                         §take
        int j = i - 1;                          §take
        while (j >= 0 && a[j] > key) {          §cmp
            a[j + 1] = a[j];                    §shift
            j--;                                §shift
        }
        a[j + 1] = key;                         §place
    }
}                                               §done` },
  explain:`<p><b>The invariant:</b> <code>a[0..i-1]</code> is sorted — but unlike selection sort those values are <i>not</i> final; a later element can still slide in among them.</p>
  <p><b>Adaptive:</b> on nearly-sorted input the <code>while</code> exits immediately, giving O(n). This is why real library sorts (Timsort, introsort) switch to insertion sort for small or almost-ordered runs.</p>
  <p><b>Key insight:</b> the number of shifts equals the number of <i>inversions</i> in the array.</p>`,
  run: function*(inp){
    const a = clampArr(parseNums(inp.arr, [5,3,8,4,2,7,1,6]), 40);
    const n = a.length; let cmpN = 0, shN = 0;
    const pre = k => { const m = {}; for (let x = 0; x < k; x++) m[x] = 'done'; return m; };
    yield { tag:'take', at:'take', note:'a[0] alone counts as a sorted prefix.',
            data:A(a, { 0:'done' }), vars:{ n }, stats:{ comparisons:0, shifts:0 } };
    for (let i = 1; i < n; i++){
      const key = a[i]; let j = i - 1;
      const m0 = pre(i); m0[i] = 'cur';
      yield { tag:'take', at:'take', note:'Lift out key = ' + key + ' and find where it belongs in the sorted prefix.',
              data:A(a, m0, { i }), vars:{ i, key, j }, stats:{ comparisons:cmpN, shifts:shN } };
      while (j >= 0 && a[j] > key){
        cmpN++; shN++;
        const m = pre(i); m[j] = 'cmp'; m[j+1] = 'swap';
        yield { tag:'shift', at:'shift', note:'a[' + j + ']=' + a[j] + ' > key ' + key + ' → slide it one slot right.',
                data:A(a, m, { j, key:null }), vars:{ i, key, j }, stats:{ comparisons:cmpN, shifts:shN } };
        a[j + 1] = a[j]; j--;
      }
      if (j >= 0) cmpN++;
      a[j + 1] = key;
      const m2 = pre(i + 1); m2[j + 1] = 'done';
      yield { tag:'place', at:'place', note:'a[' + j + ']' + (j >= 0 ? '=' + a[j] : '') + ' is not greater than ' + key + ' → drop key at index ' + (j+1) + '.',
              data:A(a, m2, { i:j + 1 }), vars:{ i, key, j }, stats:{ comparisons:cmpN, shifts:shN } };
    }
    const all = {}; for (let x = 0; x < n; x++) all[x] = 'done';
    yield { tag:'done', at:'done', note:'Sorted with ' + shN + ' shifts (= number of inversions).',
            data:A(a, all), vars:{}, stats:{ comparisons:cmpN, shifts:shN } };
  }
});

/* ───────────────────────────── Merge ───────────────────────────── */
DSA.register({
  id:'merge-sort', group:'Sorting', name:'Merge Sort',
  blurb:'Split the array in half, sort each half recursively, then merge two sorted runs in one linear pass.',
  complexity:{ time:'O(n log n)', best:'O(n log n)', space:'O(n)', note:'stable' },
  inputs:[{ key:'arr', label:'Array', type:'text', def:'38, 27, 43, 3, 9, 82, 10' }],
  flow:{ nodes:[
    { id:'call',  title:'sort(lo, hi)', type:'start', r:0, c:0 },
    { id:'base',  title:'lo ≥ hi ?', sub:'0 or 1 element = already sorted', type:'dec', r:1, c:0 },
    { id:'split', title:'mid = (lo+hi) / 2', sub:'sort(lo,mid) then sort(mid+1,hi)', type:'act', r:2, c:0 },
    { id:'merge', title:'Merge the two sorted halves', sub:'take the smaller front element each time', type:'act', r:3, c:0 },
    { id:'ret',   title:'Return', type:'ok', r:4, c:1 }
  ], edges:[
    { from:'call', to:'base' }, { from:'base', to:'ret', label:'yes' },
    { from:'base', to:'split', label:'no' }, { from:'split', to:'merge' },
    { from:'merge', to:'ret' }
  ]},
  code:{ python:`
def merge_sort(a, lo=0, hi=None):               §call
    if hi is None: hi = len(a) - 1              §call
    if lo >= hi:                                §base
        return                                  §base
    mid = (lo + hi) // 2                        §split
    merge_sort(a, lo, mid)                      §split
    merge_sort(a, mid + 1, hi)                  §split
    left  = a[lo:mid + 1]                       §merge
    right = a[mid + 1:hi + 1]                   §merge
    i = j = 0                                   §merge
    for k in range(lo, hi + 1):                 §merge
        if j >= len(right) or (i < len(left)    §merge
                and left[i] <= right[j]):       §merge
            a[k] = left[i]; i += 1              §merge
        else:                                   §merge
            a[k] = right[j]; j += 1             §merge`,
    java:`
static void mergeSort(int[] a, int lo, int hi) {        §call
    if (lo >= hi) return;                               §base
    int mid = (lo + hi) / 2;                            §split
    mergeSort(a, lo, mid);                              §split
    mergeSort(a, mid + 1, hi);                          §split
    int[] L = Arrays.copyOfRange(a, lo, mid + 1);       §merge
    int[] R = Arrays.copyOfRange(a, mid + 1, hi + 1);   §merge
    int i = 0, j = 0;                                   §merge
    for (int k = lo; k <= hi; k++) {                    §merge
        if (j >= R.length ||                            §merge
           (i < L.length && L[i] <= R[j]))              §merge
            a[k] = L[i++];                              §merge
        else                                            §merge
            a[k] = R[j++];                              §merge
    }
}` },
  explain:`<p><b>Divide and conquer:</b> log n levels of splitting, and each level does O(n) merging work → O(n log n) regardless of input order.</p>
  <p><b>Why <code>&lt;=</code> matters:</b> taking from the left half on ties is exactly what makes merge sort <b>stable</b>. Flip it to <code>&lt;</code> and equal elements can swap relative order.</p>
  <p><b>The cost:</b> O(n) extra space for the temporary halves. That is the main reason quicksort is often preferred in memory-tight settings — and why merge sort wins for linked lists, where merging needs no extra space at all.</p>`,
  run: function*(inp){
    const a = clampArr(parseNums(inp.arr, [38,27,43,3,9,82,10]), 24);
    let writes = 0, cmpN = 0;
    const range = (lo, hi, mark) => { const m = {}; for (let x = lo; x <= hi; x++) m[x] = mark; return m; };
    function* ms(lo, hi, depth){
      yield { tag:'call', at:'call', note:'sort(' + lo + ', ' + hi + ')  —  depth ' + depth,
              data:A(a, range(lo, hi, 'cmp')), vars:{ lo, hi, depth }, stats:{ comparisons:cmpN, writes } };
      if (lo >= hi){
        yield { tag:'base', at:'base', note:'Range of ' + (hi - lo + 1) + ' element — already sorted, return.',
                data:A(a, range(lo, hi, 'done')), vars:{ lo, hi }, stats:{ comparisons:cmpN, writes } };
        return;
      }
      const mid = (lo + hi) >> 1;
      yield { tag:'split', at:'split', note:'Split at mid=' + mid + ' → left [' + lo + '..' + mid + '], right [' + (mid+1) + '..' + hi + '].',
              data:A(a, Object.assign(range(lo, mid, 'cmp'), range(mid + 1, hi, 'pivot'))),
              vars:{ lo, mid, hi }, stats:{ comparisons:cmpN, writes } };
      yield* ms(lo, mid, depth + 1);
      yield* ms(mid + 1, hi, depth + 1);
      const L = a.slice(lo, mid + 1), R = a.slice(mid + 1, hi + 1);
      let i = 0, j = 0;
      for (let k = lo; k <= hi; k++){
        const takeL = (j >= R.length) || (i < L.length && L[i] <= R[j]);
        if (i < L.length && j < R.length) cmpN++;
        const m = Object.assign(range(lo, hi, 'dim'));
        for (let x = lo; x < lo + i; x++) m[x] = 'done';
        m[k] = 'swap';
        a[k] = takeL ? L[i++] : R[j++]; writes++;
        yield { tag:'merge', at:'merge',
                note:'Merge [' + lo + '..' + hi + ']: take ' + a[k] + ' from the ' + (takeL ? 'LEFT' : 'RIGHT') + ' run → a[' + k + '].',
                data:[A(a, m, { k }), { view:'array', values:L, marks:{ [i-1]:'done' }, pointers:{ i }, mode:'cells', title:'left run', showIndex:false },
                      { view:'array', values:R, marks:{}, pointers:{ j }, mode:'cells', title:'right run', showIndex:false }],
                vars:{ lo, mid, hi, k, i, j }, stats:{ comparisons:cmpN, writes } };
      }
      yield { tag:'merge', at:'ret', note:'[' + lo + '..' + hi + '] is now a single sorted run.',
              data:A(a, range(lo, hi, 'done')), vars:{ lo, hi }, stats:{ comparisons:cmpN, writes } };
    }
    yield* ms(0, a.length - 1, 0);
    const all = {}; for (let x = 0; x < a.length; x++) all[x] = 'done';
    yield { tag:'merge', at:'ret', note:'Sorted. ' + cmpN + ' comparisons, ' + writes + ' writes.',
            data:A(a, all), vars:{}, stats:{ comparisons:cmpN, writes } };
  }
});

/* ───────────────────────────── Quick ───────────────────────────── */
DSA.register({
  id:'quick-sort', group:'Sorting', name:'Quick Sort (Lomuto)',
  blurb:'Pick a pivot, partition everything smaller to its left and larger to its right, then recurse on each side.',
  complexity:{ time:'O(n log n)', best:'O(n log n)', space:'O(log n)', note:'worst O(n²)' },
  inputs:[{ key:'arr', label:'Array', type:'text', def:'7, 2, 9, 4, 1, 8, 3, 6' }],
  flow:{ nodes:[
    { id:'call', title:'quick(lo, hi)', type:'start', r:0, c:0 },
    { id:'base', title:'lo ≥ hi ?', type:'dec', r:1, c:0 },
    { id:'pivot',title:'pivot = a[hi]', sub:'i = lo  (boundary of the "small" zone)', type:'act', r:2, c:0 },
    { id:'scan', title:'More elements to scan?', sub:'j < hi', type:'dec', r:3, c:0 },
    { id:'cmp',  title:'a[j] < pivot ?', type:'dec', r:4, c:0 },
    { id:'grow', title:'Swap a[i] ↔ a[j], i++', sub:'grow the "small" zone', type:'act', r:5, c:0 },
    { id:'place',title:'Swap a[i] ↔ a[hi]', sub:'pivot lands in its final index', type:'act', r:6, c:0 },
    { id:'rec',  title:'quick(lo, i−1) and quick(i+1, hi)', type:'act', r:7, c:0 },
    { id:'ret',  title:'Return', type:'ok', r:8, c:1 }
  ], edges:[
    { from:'call', to:'base' }, { from:'base', to:'ret', label:'yes' },
    { from:'base', to:'pivot', label:'no' }, { from:'pivot', to:'scan' },
    { from:'scan', to:'cmp', label:'yes' }, { from:'cmp', to:'grow', label:'yes' },
    { from:'grow', to:'scan', label:'j++' }, { from:'cmp', to:'scan', label:'no, j++' },
    { from:'scan', to:'place', label:'no' }, { from:'place', to:'rec' }, { from:'rec', to:'ret' }
  ]},
  code:{ python:`
def quick_sort(a, lo=0, hi=None):               §call
    if hi is None: hi = len(a) - 1              §call
    if lo >= hi:                                §base
        return                                  §base
    pivot = a[hi]                               §pivot
    i = lo                                      §pivot
    for j in range(lo, hi):                     §scan
        if a[j] < pivot:                        §cmp
            a[i], a[j] = a[j], a[i]             §grow
            i += 1                              §grow
    a[i], a[hi] = a[hi], a[i]                   §place
    quick_sort(a, lo, i - 1)                    §rec
    quick_sort(a, i + 1, hi)                    §rec`,
    java:`
static void quickSort(int[] a, int lo, int hi) {    §call
    if (lo >= hi) return;                           §base
    int pivot = a[hi];                              §pivot
    int i = lo;                                     §pivot
    for (int j = lo; j < hi; j++) {                 §scan
        if (a[j] < pivot) {                         §cmp
            int t = a[i]; a[i] = a[j]; a[j] = t;    §grow
            i++;                                    §grow
        }
    }
    int t = a[i]; a[i] = a[hi]; a[hi] = t;          §place
    quickSort(a, lo, i - 1);                        §rec
    quickSort(a, i + 1, hi);                        §rec
}` },
  explain:`<p><b>The partition invariant</b> is the whole trick. At every moment: <code>a[lo..i-1]</code> &lt; pivot, <code>a[i..j-1]</code> ≥ pivot, and <code>a[j..hi-1]</code> is unexamined. <code>i</code> is the wall between the two zones.</p>
  <p><b>Why the final swap works:</b> after the loop, <code>a[i]</code> is the first element ≥ pivot, so swapping the pivot there puts it exactly where it belongs — and it never moves again.</p>
  <p><b>The O(n²) trap:</b> always taking the last element as pivot degrades to O(n²) on already-sorted input. Real implementations use a random or median-of-three pivot.</p>`,
  run: function*(inp){
    const a = clampArr(parseNums(inp.arr, [7,2,9,4,1,8,3,6]), 24);
    let cmpN = 0, swN = 0; const fixed = {};
    const base = (lo, hi) => { const m = {}; for (const k in fixed) m[k] = 'done';
      for (let x = lo; x <= hi; x++) if (!fixed[x]) m[x] = 'dim'; return m; };
    function* qs(lo, hi, depth){
      yield { tag:'call', at:'call', note:'quick(' + lo + ', ' + hi + ')  —  depth ' + depth,
              data:A(a, base(lo, hi)), vars:{ lo, hi, depth }, stats:{ comparisons:cmpN, swaps:swN } };
      if (lo >= hi){
        if (lo === hi) fixed[lo] = 1;
        yield { tag:'base', at:'base', note:(lo === hi ? 'Single element — already in place.' : 'Empty range.'),
                data:A(a, base(lo, hi)), vars:{ lo, hi }, stats:{ comparisons:cmpN, swaps:swN } };
        return;
      }
      const pivot = a[hi]; let i = lo;
      const mp = base(lo, hi); mp[hi] = 'pivot';
      yield { tag:'pivot', at:'pivot', note:'Pivot = a[' + hi + '] = ' + pivot + '. Wall i starts at ' + lo + '.',
              data:A(a, mp, { i }), vars:{ lo, hi, pivot, i }, stats:{ comparisons:cmpN, swaps:swN } };
      for (let j = lo; j < hi; j++){
        cmpN++;
        const m = base(lo, hi); m[hi] = 'pivot'; m[j] = 'cmp';
        for (let x = lo; x < i; x++) m[x] = 'done';
        yield { tag:'cmp', at:'cmp', note:'a[' + j + ']=' + a[j] + ' < pivot ' + pivot + ' ?  ' + (a[j] < pivot ? 'yes — belongs left of the wall' : 'no — leave it right'),
                data:A(a, m, { i, j }), vars:{ lo, hi, pivot, i, j }, stats:{ comparisons:cmpN, swaps:swN } };
        if (a[j] < pivot){
          if (i !== j) swN++;
          [a[i], a[j]] = [a[j], a[i]]; i++;
          const m2 = base(lo, hi); m2[hi] = 'pivot';
          for (let x = lo; x < i; x++) m2[x] = 'done';
          yield { tag:'grow', at:'grow', note:'Move it into the "small" zone; wall advances to i=' + i + '.',
                  data:A(a, m2, { i, j }), vars:{ lo, hi, pivot, i, j }, stats:{ comparisons:cmpN, swaps:swN } };
        }
      }
      [a[i], a[hi]] = [a[hi], a[i]]; swN++; fixed[i] = 1;
      const m3 = base(lo, hi); m3[i] = 'done';
      yield { tag:'place', at:'place', note:'Pivot ' + pivot + ' swaps into index ' + i + ' — its final resting place.',
              data:A(a, m3, { i }), vars:{ lo, hi, pivot, i }, stats:{ comparisons:cmpN, swaps:swN } };
      yield* qs(lo, i - 1, depth + 1);
      yield* qs(i + 1, hi, depth + 1);
    }
    yield* qs(0, a.length - 1, 0);
    const all = {}; for (let x = 0; x < a.length; x++) all[x] = 'done';
    yield { tag:'rec', at:'ret', note:'Sorted. ' + cmpN + ' comparisons, ' + swN + ' swaps.',
            data:A(a, all), vars:{}, stats:{ comparisons:cmpN, swaps:swN } };
  }
});
