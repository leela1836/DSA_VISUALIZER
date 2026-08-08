/* ══════════════════════════════════════════════════════════════════════
   SEARCHING
   ══════════════════════════════════════════════════════════════════════ */

DSA.register({
  id:'linear-search', group:'Searching', name:'Linear Search',
  blurb:'Check every element until you find the target. The baseline every other search is measured against.',
  complexity:{ time:'O(n)', best:'O(1)', space:'O(1)', note:'any order' },
  inputs:[
    { key:'arr',    label:'Array',  type:'text', def:'9, 4, 7, 1, 8, 3, 6' },
    { key:'target', label:'Target', type:'text', def:'8' }
  ],
  flow:{ nodes:[
    { id:'start', title:'i = 0', type:'start', r:0, c:0 },
    { id:'bound', title:'i < n ?', type:'dec', r:1, c:0 },
    { id:'cmp',   title:'a[i] == target ?', type:'dec', r:2, c:0 },
    { id:'found', title:'Return i', type:'ok', r:3, c:1 },
    { id:'miss',  title:'Return −1', sub:'target is not present', type:'bad', r:4, c:1 }
  ], edges:[
    { from:'start', to:'bound' }, { from:'bound', to:'cmp', label:'yes' },
    { from:'cmp', to:'found', label:'yes' }, { from:'cmp', to:'bound', label:'no, i++' },
    { from:'bound', to:'miss', label:'no' }
  ]},
  code:{ python:`
def linear_search(a, target):                   §start
    for i in range(len(a)):                     §bound
        if a[i] == target:                      §cmp
            return i                            §found
    return -1                                   §miss`,
    java:`
static int linearSearch(int[] a, int target) {  §start
    for (int i = 0; i < a.length; i++) {        §bound
        if (a[i] == target) {                   §cmp
            return i;                           §found
        }
    }
    return -1;                                  §miss
}` },
  explain:`<p><b>When it is actually the right answer:</b> unsorted data, or n small enough that a sort would cost more than the scan. Sorting to enable binary search only pays off if you search many times.</p>
  <p><b>Note the return of −1:</b> a sentinel meaning "absent". Returning <code>None</code>/<code>null</code> or throwing are the other options — pick one and be consistent across your codebase.</p>`,
  run: function*(inp){
    const a = clampArr(parseNums(inp.arr, [9,4,7,1,8,3,6]), 40);
    const t = parseNums(inp.target, [8])[0];
    let cmpN = 0;
    yield { tag:'start', at:'start', note:'Looking for ' + t + '. Start at index 0.',
            data:A(a, {}), vars:{ target:t }, stats:{ comparisons:0 } };
    for (let i = 0; i < a.length; i++){
      cmpN++;
      const m = {}; for (let x = 0; x < i; x++) m[x] = 'dim';
      m[i] = a[i] === t ? 'done' : 'cmp';
      yield { tag:'cmp', at:'cmp', note:'a[' + i + ']=' + a[i] + ' == ' + t + ' ?  ' + (a[i] === t ? 'yes — found it' : 'no, keep going'),
              data:A(a, m, { i }), vars:{ i, target:t }, stats:{ comparisons:cmpN } };
      if (a[i] === t){
        yield { tag:'found', at:'found', note:'Found ' + t + ' at index ' + i + ' after ' + cmpN + ' comparisons.',
                data:A(a, m, { i }), vars:{ i, result:i }, stats:{ comparisons:cmpN } };
        return;
      }
    }
    const m = {}; for (let x = 0; x < a.length; x++) m[x] = 'dim';
    yield { tag:'miss', at:'miss', note:t + ' is not in the array. Return −1 after scanning all ' + a.length + ' elements.',
            data:A(a, m), vars:{ result:-1 }, stats:{ comparisons:cmpN } };
  }
});

DSA.register({
  id:'binary-search', group:'Searching', name:'Binary Search',
  blurb:'On sorted data, halve the search space each step by comparing against the middle element.',
  complexity:{ time:'O(log n)', best:'O(1)', space:'O(1)', note:'requires sorted input' },
  inputs:[
    { key:'arr',    label:'Sorted array', type:'text', def:'1, 3, 5, 7, 9, 11, 13, 15, 17' },
    { key:'target', label:'Target',       type:'text', def:'13' }
  ],
  flow:{ nodes:[
    { id:'init', title:'lo = 0, hi = n − 1', type:'start', r:0, c:0 },
    { id:'loop', title:'lo ≤ hi ?', sub:'search space non-empty', type:'dec', r:1, c:0 },
    { id:'mid',  title:'mid = lo + (hi − lo) / 2', type:'act', r:2, c:0 },
    { id:'eq',   title:'a[mid] == target ?', type:'dec', r:3, c:0 },
    { id:'less', title:'a[mid] < target ?', type:'dec', r:4, c:0 },
    { id:'right',title:'lo = mid + 1', sub:'discard the left half', type:'act', r:5, c:0 },
    { id:'left', title:'hi = mid − 1', sub:'discard the right half', type:'act', r:5, c:1 },
    { id:'found',title:'Return mid', type:'ok', r:3, c:1 },
    { id:'miss', title:'Return −1', type:'bad', r:6, c:1 }
  ], edges:[
    { from:'init', to:'loop' }, { from:'loop', to:'mid', label:'yes' },
    { from:'mid', to:'eq' }, { from:'eq', to:'found', label:'yes' },
    { from:'eq', to:'less', label:'no' },
    { from:'less', to:'right', label:'yes' }, { from:'less', to:'left', label:'no' },
    { from:'right', to:'loop' }, { from:'left', to:'loop' },
    { from:'loop', to:'miss', label:'no' }
  ]},
  code:{ python:`
def binary_search(a, target):                   §init
    lo, hi = 0, len(a) - 1                      §init
    while lo <= hi:                             §loop
        mid = lo + (hi - lo) // 2               §mid
        if a[mid] == target:                    §eq
            return mid                          §found
        elif a[mid] < target:                   §less
            lo = mid + 1                        §right
        else:                                   §less
            hi = mid - 1                        §left
    return -1                                   §miss`,
    java:`
static int binarySearch(int[] a, int target) {  §init
    int lo = 0, hi = a.length - 1;              §init
    while (lo <= hi) {                          §loop
        int mid = lo + (hi - lo) / 2;           §mid
        if (a[mid] == target) {                 §eq
            return mid;                         §found
        } else if (a[mid] < target) {           §less
            lo = mid + 1;                       §right
        } else {                                §less
            hi = mid - 1;                       §left
        }
    }
    return -1;                                  §miss
}` },
  explain:`<p><b>Write <code>lo + (hi - lo) // 2</code>, not <code>(lo + hi) // 2</code>.</b> In Java/C++ the second overflows for large indices — a real bug that sat in the JDK for nine years. In Python ints are unbounded so it does not matter, but the habit is worth keeping.</p>
  <p><b>The three boundary decisions</b> that cause almost every binary-search bug:</p>
  <ul><li><code>while lo &lt;= hi</code> vs <code>&lt;</code> — with <code>hi = n-1</code> you need <code>&lt;=</code>, or the last element is never checked.</li>
  <li><code>mid ± 1</code> — you must exclude <code>mid</code>, which you have already tested, or the loop never terminates.</li>
  <li>What to return when absent.</li></ul>
  <p><b>The bigger idea:</b> binary search works on any <i>monotonic predicate</i>, not just sorted arrays — "smallest x where f(x) is true". That is "binary search on the answer".</p>`,
  run: function*(inp){
    const a = clampArr(parseNums(inp.arr, [1,3,5,7,9,11,13,15,17]), 40).sort((x, y) => x - y);
    const t = parseNums(inp.target, [13])[0];
    let lo = 0, hi = a.length - 1, steps = 0;
    const band = (lo, hi, extra) => { const m = {};
      for (let x = 0; x < a.length; x++) m[x] = (x < lo || x > hi) ? 'dim' : 'base';
      return Object.assign(m, extra || {}); };
    yield { tag:'init', at:'init', note:'Search for ' + t + ' in a sorted array of ' + a.length + '. Space = [0, ' + hi + '].',
            data:A(a, band(lo, hi), { lo, hi }), vars:{ lo, hi, target:t }, stats:{ steps:0 } };
    while (lo <= hi){
      steps++;
      const mid = lo + ((hi - lo) >> 1);
      yield { tag:'mid', at:'mid', note:'mid = ' + mid + ', a[' + mid + '] = ' + a[mid] + '.  Search space is ' + (hi - lo + 1) + ' wide.',
              data:A(a, band(lo, hi, { [mid]:'cmp' }), { lo, mid, hi }), vars:{ lo, mid, hi, target:t }, stats:{ steps } };
      if (a[mid] === t){
        yield { tag:'found', at:'found', note:'a[' + mid + '] == ' + t + ' → found at index ' + mid + ' in ' + steps + ' steps.',
                data:A(a, band(lo, hi, { [mid]:'done' }), { mid }), vars:{ result:mid }, stats:{ steps } };
        return;
      }
      if (a[mid] < t){
        yield { tag:'right', at:'right', note:a[mid] + ' < ' + t + ' → target must be to the RIGHT. Discard indices ' + lo + '..' + mid + '.',
                data:A(a, band(lo, hi, { [mid]:'bad' }), { lo, mid, hi }), vars:{ lo, mid, hi }, stats:{ steps } };
        lo = mid + 1;
      } else {
        yield { tag:'left', at:'left', note:a[mid] + ' > ' + t + ' → target must be to the LEFT. Discard indices ' + mid + '..' + hi + '.',
                data:A(a, band(lo, hi, { [mid]:'bad' }), { lo, mid, hi }), vars:{ lo, mid, hi }, stats:{ steps } };
        hi = mid - 1;
      }
    }
    yield { tag:'miss', at:'miss', note:'lo (' + lo + ') > hi (' + hi + ') — the space is empty, so ' + t + ' is absent. Return −1.',
            data:A(a, band(0, -1)), vars:{ lo, hi, result:-1 }, stats:{ steps } };
  }
});
