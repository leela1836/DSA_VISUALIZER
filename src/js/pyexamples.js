/* ══════════════════════════════════════════════════════════════════════
   Starter programs for the My Code editor.
   Each one runs end to end in the built-in interpreter.
   ══════════════════════════════════════════════════════════════════════ */
const PY_EXAMPLES = [
{ name:'Bubble sort', src:
`def bubble_sort(a):
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

bubble_sort([5, 3, 8, 4, 2, 7, 1])
` },

{ name:'Two sum (hash map)', src:
`def two_sum(nums, target):
    seen = {}
    for i, x in enumerate(nums):
        need = target - x
        if need in seen:
            return [seen[need], i]
        seen[x] = i
    return []

two_sum([2, 7, 11, 15, 3, 6], 9)
` },

{ name:'Binary search', src:
`def binary_search(a, target):
    lo, hi = 0, len(a) - 1
    while lo <= hi:
        mid = lo + (hi - lo) // 2
        if a[mid] == target:
            return mid
        elif a[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1

binary_search([1, 3, 5, 7, 9, 11, 13, 15], 13)
` },

{ name:'Sliding window — longest unique', src:
`def longest_unique(s):
    seen = {}
    left = 0
    best = 0
    for right in range(len(s)):
        ch = s[right]
        if ch in seen and seen[ch] >= left:
            left = seen[ch] + 1
        seen[ch] = right
        best = max(best, right - left + 1)
    return best

longest_unique("abcabcbb")
` },

{ name:'Reverse a linked list', src:
`class Node:
    def __init__(self, val):
        self.val = val
        self.next = None

def build(vals):
    head = None
    for v in reversed(vals):
        n = Node(v)
        n.next = head
        head = n
    return head

def reverse(head):
    prev = None
    cur = head
    while cur:
        nxt = cur.next
        cur.next = prev
        prev = cur
        cur = nxt
    return prev

head = build([1, 2, 3, 4, 5])
reverse(head)
` },

{ name:'BST insert and inorder', src:
`class TreeNode:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None

def insert(root, v):
    if root is None:
        return TreeNode(v)
    if v < root.val:
        root.left = insert(root.left, v)
    else:
        root.right = insert(root.right, v)
    return root

def inorder(node, out):
    if node is None:
        return
    inorder(node.left, out)
    out.append(node.val)
    inorder(node.right, out)

root = None
for v in [50, 30, 70, 20, 40, 60]:
    root = insert(root, v)

result = []
inorder(root, result)
print(result)
` },

{ name:'BFS on a graph', src:
`from collections import deque

def bfs(adj, start):
    visited = {start}
    dist = {start: 0}
    q = deque([start])
    order = []
    while q:
        u = q.popleft()
        order.append(u)
        for v in adj[u]:
            if v in visited:
                continue
            visited.add(v)
            dist[v] = dist[u] + 1
            q.append(v)
    return dist

graph = {
    "A": ["B", "C"],
    "B": ["A", "D"],
    "C": ["A", "D", "E"],
    "D": ["B", "C", "F"],
    "E": ["C", "F"],
    "F": ["D", "E"],
}
bfs(graph, "A")
` },

{ name:'0/1 knapsack (DP table)', src:
`def knapsack(weights, values, cap):
    n = len(weights)
    dp = [[0] * (cap + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for c in range(cap + 1):
            if weights[i - 1] > c:
                dp[i][c] = dp[i - 1][c]
            else:
                take = values[i - 1] + dp[i - 1][c - weights[i - 1]]
                dp[i][c] = max(dp[i - 1][c], take)
    return dp[n][cap]

knapsack([2, 3, 4, 5], [3, 4, 5, 6], 8)
` },

{ name:'Min-heap with heapq', src:
`import heapq

def k_largest(nums, k):
    heap = []
    for x in nums:
        heapq.heappush(heap, x)
        if len(heap) > k:
            heapq.heappop(heap)
    return sorted(heap, reverse=True)

k_largest([7, 2, 9, 4, 1, 8, 3, 6], 3)
` },

{ name:'LC 3302 — smallest valid sequence', src:
`def valid_sequence(word1, word2):
    n, m = len(word1), len(word2)

    # last[j] = latest index p where word2[j:] still fits in word1[p:]
    last = [-1] * (m + 1)
    last[m] = n
    j = m - 1
    for i in range(n - 1, -1, -1):
        if j >= 0 and word1[i] == word2[j]:
            last[j] = i
            j -= 1

    res = []
    j = 0
    skip = 0
    for i in range(n):
        if j == m:
            break
        c = word1[i]
        if c == word2[j] or (skip == 0 and (j == m - 1 or i < last[j + 1])):
            if c != word2[j]:
                skip += 1
            res.append(i)
            j += 1

    if j == m:
        return res
    return []

valid_sequence("vbcca", "abc")
` },

{ name:'Recursion — Fibonacci', src:
`def fib(n):
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)

fib(7)
` }
];

const PY_SUBSET_DOC = `
<p>This is a Python interpreter written in JavaScript, built for DSA code. It runs entirely in your browser — nothing is uploaded, nothing is installed — and records every statement so the visualizer can step through it.</p>
<div class="subset-cols">
  <div>
    <h4>Supported</h4>
    <ul>
      <li>functions, recursion, default arguments, <code>lambda</code>, decorators</li>
      <li><code>class</code> with <code>__init__</code>, methods, attributes, single inheritance</li>
      <li><code>if / elif / else</code>, <code>while</code>, <code>for</code>, <code>break</code>, <code>continue</code>, <code>else</code> on loops</li>
      <li>list, tuple, dict, set, str — with slicing, negative indices, unpacking</li>
      <li>comprehensions (list / dict / set), nested and with conditions</li>
      <li>f-strings, chained comparisons, ternary, augmented assignment</li>
      <li><code>heapq</code>, <code>collections</code> (deque, defaultdict, Counter), <code>math</code>, <code>functools.cache</code></li>
      <li>40+ builtins: <code>len range enumerate zip sorted min max sum any all map filter ord chr divmod isinstance print</code>…</li>
    </ul>
  </div>
  <div>
    <h4>Not supported</h4>
    <ul>
      <li>generators and <code>yield</code>, <code>async</code></li>
      <li><code>*args</code> / <code>**kwargs</code> in definitions</li>
      <li>most of the standard library, and any third-party package</li>
      <li>real exception classes — <code>try/except</code> catches everything</li>
      <li>arbitrary-precision integers (numbers are IEEE doubles, exact to 2⁵³)</li>
    </ul>
    <h4>Approximations</h4>
    <ul>
      <li><code>bytearray(n)</code> becomes a plain list of zeros — indexing, assignment,
          <code>len</code> and iteration match, but it prints as <code>[0, 0]</code> rather than
          <code>bytearray(b'\\x00\\x00')</code>, and it draws as an array, which is what you want here.</li>
      <li>Sets keep insertion order; CPython's iteration order is hash-based. Sort before
          printing if order matters.</li>
      <li><code>try/except</code> catches everything — exception <i>types</i> are not modelled.</li>
    </ul>
    <p class="muted">Hit one of these? Use <code>dsaviz.py</code> from the tracers folder — it runs real CPython with no subset limits, and the trace drops straight into the other tab.</p>
  </div>
</div>`;
