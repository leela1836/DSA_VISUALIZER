/* ══════════════════════════════════════════════════════════════════════
   TREES & HEAPS
   ══════════════════════════════════════════════════════════════════════ */

/** Build a BST from a list of values; returns {nodes, root}. */
function bstBuild(vals){
  const nodes = {}; let root = null, id = 0;
  vals.forEach(v => {
    const me = 'n' + (id++);
    nodes[me] = { v, l:null, r:null };
    if (root == null){ root = me; return; }
    let cur = root;
    while (true){
      if (v < nodes[cur].v){ if (nodes[cur].l == null){ nodes[cur].l = me; break; } cur = nodes[cur].l; }
      else                 { if (nodes[cur].r == null){ nodes[cur].r = me; break; } cur = nodes[cur].r; }
    }
  });
  return { nodes, root };
}

DSA.register({
  id:'bst-insert', group:'Trees', name:'BST Insert & Search',
  blurb:'Every node splits the remaining space in two. Inserting or searching is one root-to-leaf walk.',
  complexity:{ time:'O(h)', best:'O(log n)', space:'O(1)', note:'h = n if degenerate' },
  inputs:[
    { key:'vals',  label:'Insert in this order', type:'text', def:'50, 30, 70, 20, 40, 60, 80' },
    { key:'find',  label:'Then search for',      type:'text', def:'40' }
  ],
  flow:{ nodes:[
    { id:'start', title:'cur = root', type:'start', r:0, c:0 },
    { id:'empty', title:'cur is None ?', sub:'we fell off the tree', type:'dec', r:1, c:0 },
    { id:'place', title:'Put the new node here', type:'ok', r:1, c:1 },
    { id:'cmp',   title:'value < cur.val ?', type:'dec', r:2, c:0 },
    { id:'left',  title:'cur = cur.left', sub:'everything smaller lives left', type:'act', r:3, c:0 },
    { id:'right', title:'cur = cur.right', sub:'everything larger lives right', type:'act', r:3, c:1 }
  ], edges:[
    { from:'start', to:'empty' }, { from:'empty', to:'place', label:'yes' },
    { from:'empty', to:'cmp', label:'no' }, { from:'cmp', to:'left', label:'yes' },
    { from:'cmp', to:'right', label:'no' }, { from:'left', to:'empty' }, { from:'right', to:'empty' }
  ]},
  code:{ python:`
class Node:
    def __init__(self, v):
        self.val, self.left, self.right = v, None, None

def insert(root, v):                            §start
    if root is None:                            §empty
        return Node(v)                          §place
    if v < root.val:                            §cmp
        root.left = insert(root.left, v)        §left
    else:                                       §cmp
        root.right = insert(root.right, v)      §right
    return root

def search(root, v):                            §start
    while root:                                 §empty
        if v == root.val: return root           §cmp
        root = root.left if v < root.val else root.right §left`,
    java:`
static Node insert(Node root, int v) {          §start
    if (root == null) {                         §empty
        return new Node(v);                     §place
    }
    if (v < root.val) {                         §cmp
        root.left = insert(root.left, v);       §left
    } else {                                    §cmp
        root.right = insert(root.right, v);     §right
    }
    return root;
}

static Node search(Node root, int v) {          §start
    while (root != null) {                      §empty
        if (v == root.val) return root;         §cmp
        root = v < root.val ? root.left : root.right; §left
    }
    return null;
}` },
  explain:`<p><b>The BST property</b> is not "left child &lt; parent". It is stronger: <i>every</i> value in the left subtree is smaller, and every value in the right subtree is larger. That is what makes the search valid — one comparison discards an entire subtree.</p>
  <p><b>O(h), not O(log n).</b> Those are equal only if the tree is balanced. Insert <code>1,2,3,4,5</code> in order and you get a linked list with h = n — every operation degrades to O(n). Try it in the input box above and look at the shape.</p>
  <p><b>That degeneracy is why AVL and red-black trees exist:</b> they add rotations to keep h ≈ log n. Python's <code>dict</code>/<code>set</code> and Java's <code>HashMap</code> sidestep the issue with hashing; <code>TreeMap</code> is a red-black tree, which is why it keeps keys sorted while <code>HashMap</code> does not.</p>`,
  run: function*(inp){
    const vals = clampArr(parseNums(inp.vals, [50,30,70,20,40,60,80]), 15);
    const target = parseNums(inp.find, [40])[0];
    const nodes = {}; let root = null, id = 0, cmpN = 0;
    const T = (marks, labels, title) => ({ view:'tree', nodes, root, marks: marks || {}, labels: labels || {}, title: title || 'BST' });

    yield { tag:'start', at:'start', note:'Empty tree. Inserting: ' + vals.join(', '),
            data:T({}), vars:{}, stats:{ comparisons:0, height:0 } };

    const height = (r) => r == null ? 0 : 1 + Math.max(height(nodes[r].l), height(nodes[r].r));

    for (const v of vals){
      const me = 'n' + (id++);
      nodes[me] = { v, l:null, r:null };
      if (root == null){
        root = me;
        yield { tag:'place', at:'place', note:v + ' becomes the root.', data:T({ [me]:'done' }),
                vars:{ inserting:v }, stats:{ comparisons:cmpN, height:1 } };
        continue;
      }
      let cur = root, path = {};
      while (true){
        cmpN++; path[cur] = 'cmp';
        const goLeft = v < nodes[cur].v;
        yield { tag:'cmp', at:'cmp', note:'Insert ' + v + ': is ' + v + ' < ' + nodes[cur].v + '? ' + (goLeft ? 'yes → go left' : 'no → go right'),
                data:T(Object.assign({}, path, { [cur]:'cur' })), vars:{ inserting:v, at:nodes[cur].v },
                stats:{ comparisons:cmpN, height:height(root) } };
        const side = goLeft ? 'l' : 'r';
        if (nodes[cur][side] == null){
          nodes[cur][side] = me;
          yield { tag:'place', at:'place', note:'Empty slot on the ' + (goLeft ? 'left' : 'right') + ' of ' + nodes[cur].v + ' → place ' + v + ' there.',
                  data:T(Object.assign({}, path, { [me]:'done' })), vars:{ inserted:v },
                  stats:{ comparisons:cmpN, height:height(root) } };
          break;
        }
        cur = nodes[cur][side];
      }
    }

    /* search phase */
    let cur = root, path = {};
    yield { tag:'start', at:'start', note:'Tree built (height ' + height(root) + '). Now search for ' + target + '.',
            data:T({}), vars:{ target }, stats:{ comparisons:cmpN, height:height(root) } };
    while (cur != null){
      cmpN++; path[cur] = 'cmp';
      if (nodes[cur].v === target){
        yield { tag:'cmp', at:'place', note:'Found ' + target + '. The walk touched only ' + Object.keys(path).length + ' of ' + id + ' nodes.',
                data:T(Object.assign({}, path, { [cur]:'done' })), vars:{ found:target },
                stats:{ comparisons:cmpN, height:height(root) } };
        return;
      }
      const goLeft = target < nodes[cur].v;
      yield { tag:'cmp', at:'cmp', note:target + ' vs ' + nodes[cur].v + ' → go ' + (goLeft ? 'left' : 'right') + '; the whole ' + (goLeft ? 'right' : 'left') + ' subtree is eliminated.',
              data:T(Object.assign({}, path, { [cur]:'cur' })), vars:{ target, at:nodes[cur].v },
              stats:{ comparisons:cmpN, height:height(root) } };
      cur = goLeft ? nodes[cur].l : nodes[cur].r;
    }
    yield { tag:'empty', at:'empty', note:'Fell off the tree — ' + target + ' is not present.',
            data:T(path), vars:{ found:'None' }, stats:{ comparisons:cmpN, height:height(root) } };
  }
});

DSA.register({
  id:'tree-traversals', group:'Trees', name:'DFS Traversals (in/pre/post)',
  blurb:'One recursion, three orders. Where you place the "visit" line relative to the two recursive calls is the entire difference.',
  complexity:{ time:'O(n)', best:'O(n)', space:'O(h)', note:'call stack' },
  inputs:[
    { key:'vals',  label:'BST values', type:'text', def:'50, 30, 70, 20, 40, 60, 80' },
    { key:'order', label:'Order', type:'select', def:'inorder', options:['inorder','preorder','postorder'] }
  ],
  flow:{ nodes:[
    { id:'call', title:'visit(node)', type:'start', r:0, c:0 },
    { id:'base', title:'node is None ?', type:'dec', r:1, c:0 },
    { id:'ret',  title:'Return', type:'ok', r:1, c:1 },
    { id:'pre',  title:'PRE:  record node', sub:'before descending', type:'act', r:2, c:0 },
    { id:'left', title:'Recurse left', type:'act', r:3, c:0 },
    { id:'in',   title:'IN:  record node', sub:'between the two calls', type:'act', r:4, c:0 },
    { id:'right',title:'Recurse right', type:'act', r:5, c:0 },
    { id:'post', title:'POST: record node', sub:'after both children', type:'act', r:6, c:0 }
  ], edges:[
    { from:'call', to:'base' }, { from:'base', to:'ret', label:'yes' },
    { from:'base', to:'pre', label:'no' }, { from:'pre', to:'left' },
    { from:'left', to:'in' }, { from:'in', to:'right' }, { from:'right', to:'post' },
    { from:'post', to:'ret' }
  ]},
  code:{ python:`
def traverse(node, out):                        §call
    if node is None:                            §base
        return                                  §ret
    # PREORDER  — root, left, right
    out.append(node.val)                        §pre
    traverse(node.left, out)                    §left
    # INORDER   — left, root, right
    out.append(node.val)                        §in
    traverse(node.right, out)                   §right
    # POSTORDER — left, right, root
    out.append(node.val)                        §post`,
    java:`
static void traverse(Node node, List<Integer> out) { §call
    if (node == null) {                         §base
        return;                                 §ret
    }
    // PREORDER  — root, left, right
    out.add(node.val);                          §pre
    traverse(node.left, out);                   §left
    // INORDER   — left, root, right
    out.add(node.val);                          §in
    traverse(node.right, out);                  §right
    // POSTORDER — left, right, root
    out.add(node.val);                          §post
}` },
  explain:`<p><b>All three visit the same nodes in the same recursion.</b> Only the position of the record line changes:</p>
  <ul><li><b>Preorder</b> (root first) — copying/serialising a tree, since you create the parent before its children.</li>
  <li><b>Inorder</b> (root in the middle) — on a BST this emits values in <b>sorted order</b>. That is the single most useful fact about BSTs.</li>
  <li><b>Postorder</b> (root last) — deleting/freeing a tree, or any computation where a node needs its children's results first (heights, subtree sums, most tree DP).</li></ul>
  <p><b>Space is O(h), not O(n)</b> — you only hold one root-to-current path on the call stack at a time. On a degenerate tree that becomes O(n) and can blow the stack; Python's default limit is 1000 frames.</p>`,
  run: function*(inp){
    const vals = clampArr(parseNums(inp.vals, [50,30,70,20,40,60,80]), 15);
    const order = inp.order || 'inorder';
    const { nodes, root } = bstBuild(vals);
    const out = [], stack = [];
    const tagFor = { preorder:'pre', inorder:'in', postorder:'post' }[order];
    const view = (marks, note) => [
      { view:'tree', nodes, root, marks, labels:{}, title:order + ' traversal' },
      { view:'array', values:out.slice(), marks:{}, mode:'cells', showIndex:false, title:'output so far', emptyLabel:'(empty)' }
    ];
    const visited = {};
    function* go(id, depth){
      if (id == null){
        yield { tag:'base', at:'base', note:'Hit a None child — return immediately.',
                data:view(Object.assign({}, visited)), vars:{ depth }, stats:{ visited:out.length } };
        return;
      }
      stack.push(nodes[id].v);
      yield { tag:'call', at:'call', note:'Enter node ' + nodes[id].v + ' (depth ' + depth + '). Call stack: ' + stack.join(' → '),
              data:view(Object.assign({}, visited, { [id]:'cur' })), vars:{ node:nodes[id].v, depth }, stats:{ visited:out.length } };
      if (order === 'preorder'){
        out.push(nodes[id].v); visited[id] = 'done';
        yield { tag:'pre', at:'pre', note:'PREORDER records ' + nodes[id].v + ' now — before touching either child.',
                data:view(Object.assign({}, visited, { [id]:'cur' })), vars:{ node:nodes[id].v }, stats:{ visited:out.length } };
      }
      yield* go(nodes[id].l, depth + 1);
      if (order === 'inorder'){
        out.push(nodes[id].v); visited[id] = 'done';
        yield { tag:'in', at:'in', note:'INORDER records ' + nodes[id].v + ' now — the entire left subtree is finished, the right has not started.',
                data:view(Object.assign({}, visited, { [id]:'cur' })), vars:{ node:nodes[id].v }, stats:{ visited:out.length } };
      }
      yield* go(nodes[id].r, depth + 1);
      if (order === 'postorder'){
        out.push(nodes[id].v); visited[id] = 'done';
        yield { tag:'post', at:'post', note:'POSTORDER records ' + nodes[id].v + ' now — both children are completely done.',
                data:view(Object.assign({}, visited, { [id]:'cur' })), vars:{ node:nodes[id].v }, stats:{ visited:out.length } };
      }
      stack.pop();
      yield { tag:'ret', at:'ret', note:'Return from ' + nodes[id].v + '.',
              data:view(Object.assign({}, visited)), vars:{ depth }, stats:{ visited:out.length } };
    }
    yield* go(root, 0);
    yield { tag:'ret', at:'ret',
            note:'Result: [' + out.join(', ') + ']' + (order === 'inorder' ? '  —  note that it comes out sorted, because this is a BST.' : ''),
            data:view(Object.fromEntries(Object.keys(nodes).map(k => [k, 'done']))),
            vars:{ result:'[' + out.join(',') + ']' }, stats:{ visited:out.length } };
  }
});

DSA.register({
  id:'level-order', group:'Trees', name:'BFS / Level Order',
  blurb:'A queue instead of recursion: visit the tree layer by layer, nearest nodes first.',
  complexity:{ time:'O(n)', best:'O(n)', space:'O(w)', note:'w = widest level' },
  inputs:[{ key:'vals', label:'BST values', type:'text', def:'50, 30, 70, 20, 40, 60, 80' }],
  flow:{ nodes:[
    { id:'init', title:'queue = [root]', type:'start', r:0, c:0 },
    { id:'loop', title:'Queue non-empty?', type:'dec', r:1, c:0 },
    { id:'pop',  title:'node = queue.popleft()', sub:'FIFO — oldest first', type:'act', r:2, c:0 },
    { id:'visit',title:'Record node.val', type:'act', r:3, c:0 },
    { id:'push', title:'Enqueue left, then right', sub:'they are one level deeper', type:'act', r:4, c:0 },
    { id:'done', title:'Return the visit order', type:'ok', r:5, c:1 }
  ], edges:[
    { from:'init', to:'loop' }, { from:'loop', to:'pop', label:'yes' },
    { from:'pop', to:'visit' }, { from:'visit', to:'push' },
    { from:'push', to:'loop' }, { from:'loop', to:'done', label:'no' }
  ]},
  code:{ python:`
from collections import deque

def level_order(root):                          §init
    if not root: return []                      §init
    q = deque([root])                           §init
    out = []                                    §init
    while q:                                    §loop
        node = q.popleft()                      §pop
        out.append(node.val)                    §visit
        if node.left:  q.append(node.left)      §push
        if node.right: q.append(node.right)     §push
    return out                                  §done`,
    java:`
static List<Integer> levelOrder(Node root) {    §init
    List<Integer> out = new ArrayList<>();      §init
    if (root == null) return out;               §init
    Queue<Node> q = new LinkedList<>();         §init
    q.add(root);                                §init
    while (!q.isEmpty()) {                      §loop
        Node node = q.poll();                   §pop
        out.add(node.val);                      §visit
        if (node.left != null)  q.add(node.left);  §push
        if (node.right != null) q.add(node.right); §push
    }
    return out;                                 §done
}` },
  explain:`<p><b>Queue vs stack is the whole difference between BFS and DFS.</b> Swap <code>popleft()</code> for <code>pop()</code> and this exact code becomes a preorder DFS. FIFO explores by distance; LIFO explores by depth.</p>
  <p><b>Use <code>deque</code>, not a list.</b> <code>list.pop(0)</code> is O(n) because every remaining element shifts — turning your O(n) traversal into O(n²). In Java, <code>ArrayDeque</code> over <code>LinkedList</code> for the same reason (cache locality).</p>
  <p><b>To process one level at a time</b> (very common: "right side view", "level averages", "zigzag"), record <code>len(q)</code> at the top of the loop and pop exactly that many — everything then in the queue is precisely one level.</p>
  <p><b>Space is O(w)</b>, the widest level — which for a complete tree is n/2. BFS is not the memory-cheap option; DFS at O(h) usually is.</p>`,
  run: function*(inp){
    const vals = clampArr(parseNums(inp.vals, [50,30,70,20,40,60,80]), 15);
    const { nodes, root } = bstBuild(vals);
    const q = [root], out = [], visited = {};
    const view = (marks) => [
      { view:'tree', nodes, root, marks, title:'tree' },
      { view:'list', nodes:q.map(k => ({ val:nodes[k].v })), links:false, marks:{ 0:'cmp' },
        title:'queue (front → back)', emptyLabel:'queue empty',
        ends:q.length ? [{ i:0, label:'front' }, { i:q.length - 1, label:'back' }] : [] },
      { view:'array', values:out.slice(), mode:'cells', showIndex:false, title:'visit order', emptyLabel:'(empty)' }
    ];
    yield { tag:'init', at:'init', note:'Queue starts with just the root.', data:view({ [root]:'cmp' }),
            vars:{ queueSize:1 }, stats:{ visited:0, maxQueue:1 } };
    let maxQ = 1;
    while (q.length){
      const id = q.shift();
      yield { tag:'pop', at:'pop', note:'Dequeue ' + nodes[id].v + ' from the front.',
              data:view(Object.assign({}, visited, { [id]:'cur' })), vars:{ node:nodes[id].v, queueSize:q.length },
              stats:{ visited:out.length, maxQueue:maxQ } };
      out.push(nodes[id].v); visited[id] = 'done';
      yield { tag:'visit', at:'visit', note:'Record ' + nodes[id].v + '. Output: [' + out.join(', ') + ']',
              data:view(Object.assign({}, visited, { [id]:'cur' })), vars:{ node:nodes[id].v },
              stats:{ visited:out.length, maxQueue:maxQ } };
      const kids = [nodes[id].l, nodes[id].r].filter(Boolean);
      kids.forEach(k => q.push(k));
      maxQ = Math.max(maxQ, q.length);
      yield { tag:'push', at:'push',
              note: kids.length ? 'Enqueue its ' + kids.length + ' child(ren): ' + kids.map(k => nodes[k].v).join(', ') + ' — they sit behind everything already waiting, so this level finishes first.'
                                : nodes[id].v + ' is a leaf — nothing to enqueue.',
              data:view(Object.assign({}, visited, Object.fromEntries(kids.map(k => [k, 'cmp'])))),
              vars:{ queueSize:q.length }, stats:{ visited:out.length, maxQueue:maxQ } };
    }
    yield { tag:'done', at:'done', note:'Queue empty. Level order: [' + out.join(', ') + ']. Peak queue size was ' + maxQ + '.',
            data:view(Object.fromEntries(Object.keys(nodes).map(k => [k, 'done']))),
            vars:{ result:'[' + out.join(',') + ']' }, stats:{ visited:out.length, maxQueue:maxQ } };
  }
});

DSA.register({
  id:'heapify', group:'Trees', name:'Build a Min-Heap (heapify)',
  blurb:'Turn an arbitrary array into a heap in O(n) — not O(n log n) — by sifting down from the last parent backwards.',
  complexity:{ time:'O(n)', best:'O(n)', space:'O(1)', note:'in place' },
  inputs:[{ key:'arr', label:'Array', type:'text', def:'9, 4, 7, 1, 8, 3, 6, 2' }],
  flow:{ nodes:[
    { id:'start', title:'i = last parent', sub:'i = n/2 − 1 — leaves are already heaps', type:'start', r:0, c:0 },
    { id:'loop',  title:'i ≥ 0 ?', type:'dec', r:1, c:0 },
    { id:'sift',  title:'sift_down(i)', sub:'compare with both children', type:'act', r:2, c:0 },
    { id:'small', title:'A child is smaller?', type:'dec', r:3, c:0 },
    { id:'swap',  title:'Swap with the smaller child', sub:'then continue sifting from there', type:'act', r:4, c:0 },
    { id:'done',  title:'Array satisfies the heap property', type:'ok', r:5, c:1 }
  ], edges:[
    { from:'start', to:'loop' }, { from:'loop', to:'sift', label:'yes' },
    { from:'sift', to:'small' }, { from:'small', to:'swap', label:'yes' },
    { from:'swap', to:'small', label:'keep sifting' },
    { from:'small', to:'loop', label:'no, i−−' }, { from:'loop', to:'done', label:'no' }
  ]},
  code:{ python:`
def heapify(a):                                 §start
    n = len(a)                                  §start
    for i in range(n // 2 - 1, -1, -1):         §loop
        sift_down(a, i, n)                      §sift

def sift_down(a, i, n):                         §sift
    while True:                                 §small
        smallest = i                            §small
        l, r = 2*i + 1, 2*i + 2                 §small
        if l < n and a[l] < a[smallest]:        §small
            smallest = l                        §small
        if r < n and a[r] < a[smallest]:        §small
            smallest = r                        §small
        if smallest == i:                       §small
            return                              §small
        a[i], a[smallest] = a[smallest], a[i]   §swap
        i = smallest                            §swap`,
    java:`
static void heapify(int[] a) {                  §start
    int n = a.length;                           §start
    for (int i = n / 2 - 1; i >= 0; i--) {      §loop
        siftDown(a, i, n);                      §sift
    }
}

static void siftDown(int[] a, int i, int n) {   §sift
    while (true) {                              §small
        int smallest = i, l = 2*i + 1, r = 2*i + 2; §small
        if (l < n && a[l] < a[smallest]) smallest = l; §small
        if (r < n && a[r] < a[smallest]) smallest = r; §small
        if (smallest == i) return;              §small
        int t = a[i]; a[i] = a[smallest]; a[smallest] = t; §swap
        i = smallest;                           §swap
    }
}` },
  explain:`<p><b>The array IS the tree.</b> No pointers: node <code>i</code> has children at <code>2i+1</code> and <code>2i+2</code>, and parent at <code>(i−1)//2</code>. Watch both views above move together.</p>
  <p><b>Why start at <code>n//2 − 1</code>:</b> everything past that index is a leaf, and a single node is trivially a valid heap. So half the array needs no work at all.</p>
  <p><b>Why it is O(n), not O(n log n)</b> — the classic surprise. Nodes near the leaves (most of them) sift down only a step or two; only the root can sift the full log n. Summing height × count over all levels gives Σ n/2^h · h ≈ 2n. Building by n repeated inserts really would be O(n log n).</p>
  <p><b>Heap ≠ BST.</b> A heap only guarantees parent ≤ children; siblings are unordered. You get the min in O(1), but you cannot binary-search it.</p>`,
  run: function*(inp){
    const a = clampArr(parseNums(inp.arr, [9,4,7,1,8,3,6,2]), 16);
    const n = a.length; let swaps = 0, cmpN = 0;
    const asTree = (marks) => {
      const nodes = {};
      for (let i = 0; i < n; i++) nodes['h' + i] = { v:a[i], l: 2*i+1 < n ? 'h' + (2*i+1) : null, r: 2*i+2 < n ? 'h' + (2*i+2) : null };
      const tm = {}; for (const k in marks) tm['h' + k] = marks[k];
      return { view:'tree', nodes, root:'h0', marks:tm, title:'same array, viewed as a tree' };
    };
    const view = (marks) => [A(a, marks, {}, { title:'array' }), asTree(marks)];
    const start = (n >> 1) - 1;
    yield { tag:'start', at:'start', note:'Indices ' + (start + 1) + '..' + (n-1) + ' are leaves — already valid heaps. Start sifting at index ' + start + '.',
            data:view(Object.fromEntries(Array.from({ length:n - start - 1 }, (_, k) => [start + 1 + k, 'done']))),
            vars:{ n, i:start }, stats:{ comparisons:0, swaps:0 } };
    for (let i = start; i >= 0; i--){
      yield { tag:'sift', at:'sift', note:'sift_down from index ' + i + ' (value ' + a[i] + ').',
              data:view({ [i]:'cur' }), vars:{ i, 'a[i]':a[i] }, stats:{ comparisons:cmpN, swaps } };
      let k = i;
      while (true){
        let small = k; const l = 2*k + 1, r = 2*k + 2;
        if (l < n){ cmpN++; if (a[l] < a[small]) small = l; }
        if (r < n){ cmpN++; if (a[r] < a[small]) small = r; }
        const marks = { [k]:'cur' };
        if (l < n) marks[l] = 'cmp';
        if (r < n) marks[r] = 'cmp';
        yield { tag:'small', at:'small',
                note:'Node ' + a[k] + ' vs children ' + [l, r].filter(x => x < n).map(x => a[x]).join(' & ') +
                     ' → ' + (small === k ? 'parent is already smallest, stop.' : 'smallest is ' + a[small] + ' at index ' + small + '.'),
                data:view(marks), vars:{ i:k, left: l < n ? a[l] : '-', right: r < n ? a[r] : '-' },
                stats:{ comparisons:cmpN, swaps } };
        if (small === k) break;
        [a[k], a[small]] = [a[small], a[k]]; swaps++;
        yield { tag:'swap', at:'swap', note:'Swap so the smaller value rises. Continue sifting from index ' + small + '.',
                data:view({ [k]:'swap', [small]:'swap' }), vars:{ i:small }, stats:{ comparisons:cmpN, swaps } };
        k = small;
      }
    }
    yield { tag:'loop', at:'done', note:'Heap built: every parent ≤ its children. Root a[0] = ' + a[0] + ' is the minimum. ' + cmpN + ' comparisons, ' + swaps + ' swaps for n=' + n + '.',
            data:view(Object.fromEntries(Array.from({ length:n }, (_, k) => [k, 'done']))),
            vars:{ min:a[0] }, stats:{ comparisons:cmpN, swaps } };
  }
});
