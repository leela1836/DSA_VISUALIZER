/* ══════════════════════════════════════════════════════════════════════
   GRAPHS
   ══════════════════════════════════════════════════════════════════════ */

/** Parse "A-B, B-C:4, A>D" into {nodes, edges, adj}. */
function parseGraph(str, opts){
  opts = opts || {};
  const edges = [], seen = {}, nodes = [];
  String(str).split(/[,\n;]+/).forEach(tok => {
    tok = tok.trim(); if (!tok) return;
    const m = tok.match(/^([A-Za-z0-9_]+)\s*(->|>|-)\s*([A-Za-z0-9_]+)\s*(?::\s*(-?\d+))?$/);
    if (!m) return;
    const u = m[1], v = m[3], w = m[4];
    [u, v].forEach(x => { if (!seen[x]){ seen[x] = 1; nodes.push({ id:x }); } });
    edges.push({ u, v, w: w != null ? +w : (opts.weighted ? 1 : null), dir: !!opts.directed });
  });
  const adj = {};
  nodes.forEach(n => adj[n.id] = []);
  edges.forEach(e => {
    adj[e.u].push({ to:e.v, w: e.w == null ? 1 : e.w });
    if (!opts.directed) adj[e.v].push({ to:e.u, w: e.w == null ? 1 : e.w });
  });
  Object.keys(adj).forEach(k => adj[k].sort((a, b) => a.to < b.to ? -1 : 1));
  return { nodes, edges, adj };
}
const G_DEF = 'A-B, A-C, B-D, C-D, C-E, D-F, E-F, B-E';

DSA.register({
  id:'graph-bfs', group:'Graphs', name:'Breadth-First Search',
  blurb:'Explore by distance: all neighbours, then all of their neighbours. On an unweighted graph this gives shortest paths for free.',
  complexity:{ time:'O(V + E)', best:'O(V+E)', space:'O(V)', note:'queue + visited' },
  inputs:[
    { key:'g',     label:'Edges', type:'text', def:G_DEF },
    { key:'start', label:'Start', type:'text', def:'A' }
  ],
  flow:{ nodes:[
    { id:'init', title:'queue = [start]', sub:'mark start as visited immediately', type:'start', r:0, c:0 },
    { id:'loop', title:'Queue non-empty?', type:'dec', r:1, c:0 },
    { id:'pop',  title:'u = queue.popleft()', type:'act', r:2, c:0 },
    { id:'nb',   title:'For each neighbour v of u', type:'dec', r:3, c:0 },
    { id:'seen', title:'v already visited?', type:'dec', r:4, c:0 },
    { id:'push', title:'Mark v visited, enqueue it', sub:'dist[v] = dist[u] + 1', type:'act', r:5, c:0 },
    { id:'done', title:'All reachable nodes visited', type:'ok', r:6, c:1 }
  ], edges:[
    { from:'init', to:'loop' }, { from:'loop', to:'pop', label:'yes' },
    { from:'pop', to:'nb' }, { from:'nb', to:'seen', label:'next v' },
    { from:'seen', to:'nb', label:'yes, skip' }, { from:'seen', to:'push', label:'no' },
    { from:'push', to:'nb' }, { from:'nb', to:'loop', label:'no more' },
    { from:'loop', to:'done', label:'no' }
  ]},
  code:{ python:`
from collections import deque

def bfs(adj, start):                            §init
    visited = {start}                           §init
    dist = {start: 0}                           §init
    q = deque([start])                          §init
    while q:                                    §loop
        u = q.popleft()                         §pop
        for v in adj[u]:                        §nb
            if v in visited:                    §seen
                continue                        §seen
            visited.add(v)                      §push
            dist[v] = dist[u] + 1               §push
            q.append(v)                         §push
    return dist                                 §done`,
    java:`
static Map<String,Integer> bfs(Map<String,List<String>> adj, String start) { §init
    Set<String> visited = new HashSet<>();      §init
    Map<String,Integer> dist = new HashMap<>(); §init
    visited.add(start); dist.put(start, 0);     §init
    Queue<String> q = new ArrayDeque<>();       §init
    q.add(start);                               §init
    while (!q.isEmpty()) {                      §loop
        String u = q.poll();                    §pop
        for (String v : adj.get(u)) {           §nb
            if (visited.contains(v)) continue;  §seen
            visited.add(v);                     §push
            dist.put(v, dist.get(u) + 1);       §push
            q.add(v);                           §push
        }
    }
    return dist;                                §done
}` },
  explain:`<p><b>Mark visited when you ENQUEUE, not when you dequeue.</b> This is the bug that separates working BFS from quadratic BFS. If you only mark on dequeue, a node with three neighbours can be pushed three times before it is ever processed.</p>
  <p><b>Why BFS gives shortest paths</b> on unweighted graphs: the queue is ordered by distance. Everything at distance d is dequeued before anything at distance d+1, so the first time you reach a node is necessarily via a shortest path. Add weights and this breaks — that is exactly why Dijkstra needs a priority queue instead.</p>
  <p><b>O(V + E)</b>: each vertex is enqueued once, and each edge is examined once (twice if undirected). You cannot do better — you have to look at everything at least once.</p>`,
  run: function*(inp){
    const { nodes, edges, adj } = parseGraph(inp.g || G_DEF, {});
    const start = (inp.start || nodes[0].id).trim();
    if (!adj[start]){ yield { tag:'init', at:'init', note:'Start node "' + start + '" is not in the graph.',
      data:{ view:'graph', nodes, edges }, vars:{}, stats:{} }; return; }
    const visited = { [start]:1 }, dist = { [start]:0 }, q = [start];
    const em = {};
    const view = (marks) => [
      { view:'graph', nodes, edges, marks, edgeMarks:em,
        labels:Object.fromEntries(Object.keys(dist).map(k => [k, 'd=' + dist[k]])), title:'graph' },
      { view:'list', nodes:q.map(v => ({ val:v })), links:false, marks:{ 0:'cmp' },
        title:'queue (front → back)', emptyLabel:'queue empty' }
    ];
    const M = () => { const m = {}; Object.keys(visited).forEach(k => m[k] = 'done'); q.forEach(k => m[k] = 'win'); return m; };
    yield { tag:'init', at:'init', note:'Start at ' + start + ', distance 0. Marked visited before it is ever dequeued.',
            data:view(Object.assign(M(), { [start]:'cur' })), vars:{ start }, stats:{ visited:1, edgesSeen:0 } };
    let seenE = 0;
    while (q.length){
      const u = q.shift();
      yield { tag:'pop', at:'pop', note:'Dequeue ' + u + ' (distance ' + dist[u] + ').',
              data:view(Object.assign(M(), { [u]:'cur' })), vars:{ u, dist:dist[u] },
              stats:{ visited:Object.keys(visited).length, edgesSeen:seenE } };
      for (const { to:v } of adj[u]){
        seenE++;
        const already = !!visited[v];
        em[u + '-' + v] = already ? 'dim' : 'done';
        yield { tag:'seen', at:'seen', note:'Edge ' + u + ' → ' + v + ': ' + (already ? v + ' is already visited, skip it.' : v + ' is new.'),
                data:view(Object.assign(M(), { [u]:'cur', [v]: already ? 'dim' : 'cmp' })),
                vars:{ u, v, visited:already }, stats:{ visited:Object.keys(visited).length, edgesSeen:seenE } };
        if (already) continue;
        visited[v] = 1; dist[v] = dist[u] + 1; q.push(v);
        yield { tag:'push', at:'push', note:'Visit ' + v + ', dist=' + dist[v] + ', enqueue it. Marking now prevents a duplicate push later.',
                data:view(Object.assign(M(), { [v]:'win' })), vars:{ v, dist:dist[v], queue:'[' + q.join(',') + ']' },
                stats:{ visited:Object.keys(visited).length, edgesSeen:seenE } };
      }
    }
    const unreached = nodes.filter(n => !visited[n.id]).map(n => n.id);
    yield { tag:'done', at:'done',
            note:'Queue empty. Distances: ' + Object.keys(dist).map(k => k + '=' + dist[k]).join(', ') +
                 (unreached.length ? '.  Unreachable from ' + start + ': ' + unreached.join(', ') : '.'),
            data:view(M()), vars:{}, stats:{ visited:Object.keys(visited).length, edgesSeen:seenE } };
  }
});

DSA.register({
  id:'graph-dfs', group:'Graphs', name:'Depth-First Search',
  blurb:'Follow one path as deep as it goes, then back up and try the next branch. The backbone of cycle detection, topological sort and backtracking.',
  complexity:{ time:'O(V + E)', best:'O(V+E)', space:'O(V)', note:'recursion depth' },
  inputs:[
    { key:'g',     label:'Edges', type:'text', def:G_DEF },
    { key:'start', label:'Start', type:'text', def:'A' }
  ],
  flow:{ nodes:[
    { id:'call', title:'dfs(u)', type:'start', r:0, c:0 },
    { id:'mark', title:'Mark u visited', type:'act', r:1, c:0 },
    { id:'nb',   title:'For each neighbour v of u', type:'dec', r:2, c:0 },
    { id:'seen', title:'v already visited?', type:'dec', r:3, c:0 },
    { id:'rec',  title:'dfs(v)', sub:'go deeper before trying the next neighbour', type:'act', r:4, c:0 },
    { id:'back', title:'Backtrack', sub:'u has no unexplored neighbours left', type:'ok', r:5, c:1 }
  ], edges:[
    { from:'call', to:'mark' }, { from:'mark', to:'nb' },
    { from:'nb', to:'seen', label:'next v' }, { from:'seen', to:'nb', label:'yes, skip' },
    { from:'seen', to:'rec', label:'no' }, { from:'rec', to:'call', label:'recurse' },
    { from:'nb', to:'back', label:'no more' }
  ]},
  code:{ python:`
def dfs(adj, u, visited=None):                  §call
    if visited is None: visited = set()         §call
    visited.add(u)                              §mark
    for v in adj[u]:                            §nb
        if v not in visited:                    §seen
            dfs(adj, v, visited)                §rec
    return visited                              §back`,
    java:`
static void dfs(Map<String,List<String>> adj,   §call
                String u, Set<String> visited) { §call
    visited.add(u);                             §mark
    for (String v : adj.get(u)) {               §nb
        if (!visited.contains(v)) {             §seen
            dfs(adj, v, visited);               §rec
        }
    }
}                                               §back` },
  explain:`<p><b>DFS is BFS with a stack instead of a queue</b> — and the recursion <i>is</i> the stack. Writing it iteratively with an explicit stack gives the same traversal (modulo neighbour order) and avoids stack-overflow on deep graphs.</p>
  <p><b>Watch the backtracking</b> in the step notes. Depth-first means a node's entire subtree of unexplored paths finishes before its sibling is touched. That property is what makes DFS the right tool for: cycle detection, topological ordering, connected components, bridges/articulation points, and every backtracking puzzle (N-Queens, sudoku, permutations).</p>
  <p><b>The recursion-depth trap:</b> a path graph with 10 000 nodes will blow Python's default 1000-frame limit. Either raise <code>sys.setrecursionlimit</code> or write it iteratively — mention this in an interview and you sound like someone who has shipped code.</p>`,
  run: function*(inp){
    const { nodes, edges, adj } = parseGraph(inp.g || G_DEF, {});
    const start = (inp.start || nodes[0].id).trim();
    if (!adj[start]){ yield { tag:'call', at:'call', note:'Start node "' + start + '" is not in the graph.',
      data:{ view:'graph', nodes, edges }, vars:{}, stats:{} }; return; }
    const visited = {}, stack = [], order = [], em = {};
    const view = (marks) => [
      { view:'graph', nodes, edges, marks, edgeMarks:em, title:'graph' },
      { view:'list', orient:'v', links:false, nodes:stack.slice().reverse().map(v => ({ val:v })),
        marks:{ 0:'cur' }, title:'call stack (top first)', emptyLabel:'empty' },
      { view:'array', values:order.slice(), mode:'cells', showIndex:false, title:'visit order', emptyLabel:'(none)' }
    ];
    const M = () => { const m = {}; Object.keys(visited).forEach(k => m[k] = 'done'); stack.forEach(k => m[k] = 'win'); return m; };
    let edgesSeen = 0;
    function* go(u, depth){
      stack.push(u);
      yield { tag:'call', at:'call', note:'dfs(' + u + ') — depth ' + depth + '. Stack: ' + stack.join(' → '),
              data:view(Object.assign(M(), { [u]:'cur' })), vars:{ u, depth },
              stats:{ visited:order.length, edgesSeen } };
      visited[u] = 1; order.push(u);
      yield { tag:'mark', at:'mark', note:'Mark ' + u + ' visited. Order so far: ' + order.join(' → '),
              data:view(Object.assign(M(), { [u]:'cur' })), vars:{ u }, stats:{ visited:order.length, edgesSeen } };
      for (const { to:v } of adj[u]){
        edgesSeen++;
        const already = !!visited[v];
        yield { tag:'seen', at:'seen', note:'From ' + u + ', try ' + v + ': ' + (already ? 'already visited → skip.' : 'unvisited → dive in.'),
                data:view(Object.assign(M(), { [u]:'cur', [v]: already ? 'dim' : 'cmp' })),
                vars:{ u, v, visited:already }, stats:{ visited:order.length, edgesSeen } };
        if (already) continue;
        em[u + '-' + v] = 'done';
        yield* go(v, depth + 1);
      }
      stack.pop();
      yield { tag:'back', at:'back', note:'No unexplored neighbours left at ' + u + ' → backtrack' + (stack.length ? ' to ' + stack[stack.length - 1] + '.' : ' (done).'),
              data:view(M()), vars:{ u, depth }, stats:{ visited:order.length, edgesSeen } };
    }
    yield* go(start, 0);
    const unreached = nodes.filter(n => !visited[n.id]).map(n => n.id);
    yield { tag:'back', at:'back', note:'DFS order: ' + order.join(' → ') + (unreached.length ? '.  Not reachable: ' + unreached.join(', ') : '.'),
            data:view(M()), vars:{ order:order.join('') }, stats:{ visited:order.length, edgesSeen } };
  }
});

DSA.register({
  id:'dijkstra', group:'Graphs', name:"Dijkstra's Shortest Path",
  blurb:'BFS with a priority queue: always finalise the closest unfinished node, then relax its outgoing edges.',
  complexity:{ time:'O((V+E) log V)', best:'—', space:'O(V)', note:'no negative weights' },
  inputs:[
    { key:'g',     label:'Weighted edges', type:'text', def:'A-B:4, A-C:2, B-C:5, B-D:10, C-E:3, E-D:4, D-F:11' },
    { key:'start', label:'Start', type:'text', def:'A' }
  ],
  flow:{ nodes:[
    { id:'init', title:'dist[start] = 0, everything else = ∞', type:'start', r:0, c:0 },
    { id:'loop', title:'Priority queue non-empty?', type:'dec', r:1, c:0 },
    { id:'pop',  title:'u = closest unfinished node', sub:'dist[u] is now final', type:'act', r:2, c:0 },
    { id:'stale',title:'Already finalised u?', type:'dec', r:3, c:0 },
    { id:'relax',title:'For each edge u→v: is dist[u] + w < dist[v] ?', type:'dec', r:4, c:0 },
    { id:'upd',  title:'dist[v] = dist[u] + w, push v', sub:'a shorter route was found', type:'act', r:5, c:0 },
    { id:'done', title:'All distances final', type:'ok', r:6, c:1 }
  ], edges:[
    { from:'init', to:'loop' }, { from:'loop', to:'pop', label:'yes' },
    { from:'pop', to:'stale' }, { from:'stale', to:'loop', label:'yes, discard' },
    { from:'stale', to:'relax', label:'no' }, { from:'relax', to:'upd', label:'yes' },
    { from:'upd', to:'relax', label:'next edge' }, { from:'relax', to:'loop', label:'no more edges' },
    { from:'loop', to:'done', label:'no' }
  ]},
  code:{ python:`
import heapq

def dijkstra(adj, start):                       §init
    dist = {u: float('inf') for u in adj}       §init
    dist[start] = 0                             §init
    pq = [(0, start)]                           §init
    done = set()                                §init
    while pq:                                   §loop
        d, u = heapq.heappop(pq)                §pop
        if u in done:                           §stale
            continue                            §stale
        done.add(u)                             §stale
        for v, w in adj[u]:                     §relax
            if d + w < dist[v]:                 §relax
                dist[v] = d + w                 §upd
                heapq.heappush(pq, (dist[v], v)) §upd
    return dist                                 §done`,
    java:`
static Map<String,Integer> dijkstra(Map<String,List<int[]>> adj, String start) { §init
    Map<String,Integer> dist = new HashMap<>(); §init
    for (String u : adj.keySet()) dist.put(u, Integer.MAX_VALUE); §init
    dist.put(start, 0);                         §init
    PriorityQueue<Object[]> pq = new PriorityQueue<>(  §init
        (x, y) -> (int)x[0] - (int)y[0]);       §init
    pq.add(new Object[]{0, start});             §init
    Set<String> done = new HashSet<>();         §init
    while (!pq.isEmpty()) {                     §loop
        Object[] top = pq.poll();               §pop
        int d = (int) top[0]; String u = (String) top[1]; §pop
        if (!done.add(u)) continue;             §stale
        for (int[] e : adj.get(u)) {            §relax
            if (d + e[1] < dist.get(v)) {       §relax
                dist.put(v, d + e[1]);          §upd
                pq.add(new Object[]{dist.get(v), v}); §upd
            }
        }
    }
    return dist;                                §done
}` },
  explain:`<p><b>The greedy claim:</b> the unfinished node with the smallest tentative distance already has its final answer. Nothing can improve it, because any other route would have to leave through a node that is <i>already further away</i> — and adding a non-negative weight only makes it worse.</p>
  <p><b>That is precisely why negative weights break it.</b> A later negative edge could undercut a distance you already declared final. Use Bellman-Ford (O(V·E)) when negatives are possible.</p>
  <p><b>The "stale entry" check.</b> A standard binary heap has no decrease-key, so you push a <i>new</i> entry each time you improve a distance and leave the old one to rot. When it eventually pops, <code>u</code> is already finalised and you skip it. Forgetting that check does not give wrong answers, but it does redundant work.</p>
  <p><b>With all weights equal, Dijkstra degenerates to BFS.</b> If your graph is unweighted, use BFS — same answer, no log factor.</p>`,
  run: function*(inp){
    const { nodes, edges, adj } = parseGraph(inp.g || 'A-B:4, A-C:2, B-C:5, B-D:10, C-E:3, E-D:4, D-F:11', { weighted:true });
    const start = (inp.start || nodes[0].id).trim();
    if (!adj[start]){ yield { tag:'init', at:'init', note:'Start node "' + start + '" is not in the graph.',
      data:{ view:'graph', nodes, edges }, vars:{}, stats:{} }; return; }
    const INF = Infinity, dist = {}, done = {}, em = {};
    nodes.forEach(n => dist[n.id] = INF);
    dist[start] = 0;
    let pq = [[0, start]], pops = 0, relax = 0;
    const lab = () => Object.fromEntries(nodes.map(n => [n.id, dist[n.id] === INF ? '∞' : String(dist[n.id])]));
    const M = () => { const m = {}; nodes.forEach(n => m[n.id] = done[n.id] ? 'done' : (dist[n.id] < INF ? 'win' : 'dim')); return m; };
    const view = (marks) => [
      { view:'graph', nodes, edges, marks: marks || M(), edgeMarks:em, labels:lab(), title:'graph (labels = best known distance)' },
      { view:'list', links:false, nodes:pq.slice().sort((a, b) => a[0] - b[0]).map(p => ({ val:p[1] + ':' + p[0] })),
        marks:{ 0:'cmp' }, title:'priority queue (smallest first)', emptyLabel:'empty' }
    ];
    yield { tag:'init', at:'init', note:'dist[' + start + '] = 0, all others ∞. Push (0, ' + start + ').',
            data:view(Object.assign(M(), { [start]:'cur' })), vars:{ start }, stats:{ pops:0, relaxations:0 } };
    while (pq.length){
      pq.sort((a, b) => a[0] - b[0]);
      const [d, u] = pq.shift(); pops++;
      if (done[u]){
        yield { tag:'stale', at:'stale', note:'Popped a stale entry for ' + u + ' (distance ' + d + ' — already finalised at ' + dist[u] + '). Discard it.',
                data:view(Object.assign(M(), { [u]:'dim' })), vars:{ u, d }, stats:{ pops, relaxations:relax } };
        continue;
      }
      done[u] = 1;
      yield { tag:'pop', at:'pop', note:u + ' is the closest unfinished node at distance ' + d + ' → this is now FINAL. Nothing can beat it.',
              data:view(Object.assign(M(), { [u]:'cur' })), vars:{ u, dist:d }, stats:{ pops, relaxations:relax } };
      for (const { to:v, w } of adj[u]){
        const cand = d + w, better = cand < dist[v];
        em[u + '-' + v] = better ? 'done' : 'dim';
        yield { tag:'relax', at:'relax',
                note:'Relax ' + u + '→' + v + ' (weight ' + w + '): ' + d + ' + ' + w + ' = ' + cand + ' vs current ' + (dist[v] === INF ? '∞' : dist[v]) + ' → ' + (better ? 'improvement!' : 'no improvement.'),
                data:view(Object.assign(M(), { [u]:'cur', [v]: better ? 'cmp' : 'dim' })),
                vars:{ u, v, w, candidate:cand, current: dist[v] === INF ? '∞' : dist[v] },
                stats:{ pops, relaxations:relax } };
        if (better){
          relax++; dist[v] = cand; pq.push([cand, v]);
          yield { tag:'upd', at:'upd', note:'dist[' + v + '] = ' + cand + '. Push (' + cand + ', ' + v + ') — any older entry for ' + v + ' becomes stale.',
                  data:view(Object.assign(M(), { [v]:'win' })), vars:{ v, dist:cand }, stats:{ pops, relaxations:relax } };
        }
      }
    }
    yield { tag:'done', at:'done', note:'Final distances from ' + start + ': ' + nodes.map(n => n.id + '=' + (dist[n.id] === INF ? '∞' : dist[n.id])).join(', '),
            data:view(Object.fromEntries(nodes.map(n => [n.id, dist[n.id] === INF ? 'dim' : 'done']))),
            vars:{}, stats:{ pops, relaxations:relax } };
  }
});

DSA.register({
  id:'topo-sort', group:'Graphs', name:"Topological Sort (Kahn's)",
  blurb:'Repeatedly take a task with no remaining prerequisites. If you get stuck with tasks left over, the graph has a cycle.',
  complexity:{ time:'O(V + E)', best:'O(V+E)', space:'O(V)', note:'DAGs only' },
  inputs:[{ key:'g', label:'Directed edges (u > v means u before v)', type:'text',
            def:'A>C, B>C, B>D, C>E, D>F, E>F' }],
  flow:{ nodes:[
    { id:'deg',  title:'Count incoming edges for every node', type:'start', r:0, c:0 },
    { id:'seed', title:'Queue every node with in-degree 0', sub:'no prerequisites', type:'act', r:1, c:0 },
    { id:'loop', title:'Queue non-empty?', type:'dec', r:2, c:0 },
    { id:'take', title:'u = queue.popleft(); output u', type:'act', r:3, c:0 },
    { id:'dec',  title:'For each u→v: in_degree[v]−−', type:'act', r:4, c:0 },
    { id:'zero', title:'in_degree[v] == 0 ?', type:'dec', r:5, c:0 },
    { id:'push', title:'Enqueue v', sub:'all its prerequisites are done', type:'act', r:6, c:0 },
    { id:'chk',  title:'Output contains every node?', type:'dec', r:7, c:0 },
    { id:'ok',   title:'Valid topological order', type:'ok', r:7, c:1 },
    { id:'cyc',  title:'Cycle detected', sub:'the leftovers depend on each other', type:'bad', r:8, c:1 }
  ], edges:[
    { from:'deg', to:'seed' }, { from:'seed', to:'loop' },
    { from:'loop', to:'take', label:'yes' }, { from:'take', to:'dec' },
    { from:'dec', to:'zero' }, { from:'zero', to:'push', label:'yes' },
    { from:'push', to:'dec', label:'next edge' }, { from:'zero', to:'loop', label:'no' },
    { from:'loop', to:'chk', label:'no' }, { from:'chk', to:'ok', label:'yes' },
    { from:'chk', to:'cyc', label:'no' }
  ]},
  code:{ python:`
from collections import deque

def topo_sort(adj):                             §deg
    indeg = {u: 0 for u in adj}                 §deg
    for u in adj:                               §deg
        for v in adj[u]:                        §deg
            indeg[v] += 1                       §deg
    q = deque(u for u in adj if indeg[u] == 0)  §seed
    out = []                                    §seed
    while q:                                    §loop
        u = q.popleft()                         §take
        out.append(u)                           §take
        for v in adj[u]:                        §dec
            indeg[v] -= 1                       §dec
            if indeg[v] == 0:                   §zero
                q.append(v)                     §push
    return out if len(out) == len(adj) else []  §chk`,
    java:`
static List<String> topoSort(Map<String,List<String>> adj) { §deg
    Map<String,Integer> indeg = new HashMap<>();§deg
    for (String u : adj.keySet()) indeg.putIfAbsent(u, 0); §deg
    for (String u : adj.keySet())               §deg
        for (String v : adj.get(u))             §deg
            indeg.merge(v, 1, Integer::sum);    §deg
    Deque<String> q = new ArrayDeque<>();       §seed
    for (String u : indeg.keySet())             §seed
        if (indeg.get(u) == 0) q.add(u);        §seed
    List<String> out = new ArrayList<>();       §seed
    while (!q.isEmpty()) {                      §loop
        String u = q.poll();                    §take
        out.add(u);                             §take
        for (String v : adj.get(u)) {           §dec
            indeg.merge(v, -1, Integer::sum);   §dec
            if (indeg.get(v) == 0) {            §zero
                q.add(v);                       §push
            }
        }
    }
    return out.size() == adj.size() ? out : List.of(); §chk
}` },
  explain:`<p><b>What in-degree means here:</b> the number of prerequisites a task still has. Zero means "ready to run right now". Removing a finished task decrements its dependents — exactly how a build system or course planner works.</p>
  <p><b>Cycle detection comes free.</b> If a cycle exists, every node in it permanently has in-degree ≥ 1 (each waits on another member of the cycle), so nothing ever reaches zero and they never enter the queue. Compare output length to node count — shorter means cyclic.</p>
  <p><b>The order is not unique.</b> Whenever the queue holds more than one node, any of them is a legal next choice. Swap the queue for a min-heap and you get the lexicographically smallest topological order — a common follow-up.</p>
  <p><b>Real uses:</b> build dependency resolution (make, Maven, npm), course scheduling, spreadsheet recalculation order, and task pipelines.</p>`,
  run: function*(inp){
    const { nodes, edges, adj } = parseGraph(inp.g || 'A>C, B>C, B>D, C>E, D>F, E>F', { directed:true });
    const indeg = {}; nodes.forEach(n => indeg[n.id] = 0);
    edges.forEach(e => indeg[e.v]++);
    const out = [], em = {};
    let q = nodes.filter(n => indeg[n.id] === 0).map(n => n.id);
    const lab = () => Object.fromEntries(nodes.map(n => [n.id, 'in=' + indeg[n.id]]));
    const M = () => { const m = {}; nodes.forEach(n => m[n.id] = out.includes(n.id) ? 'done' : (indeg[n.id] === 0 ? 'win' : 'base')); return m; };
    const view = (marks) => [
      { view:'graph', nodes, edges, marks: marks || M(), edgeMarks:em, labels:lab(), title:'graph (labels = remaining prerequisites)' },
      { view:'list', links:false, nodes:q.map(v => ({ val:v })), marks:{ 0:'cmp' }, title:'ready queue', emptyLabel:'empty' },
      { view:'array', values:out.slice(), mode:'cells', showIndex:false, title:'topological order', emptyLabel:'(none yet)' }
    ];
    yield { tag:'deg', at:'deg', note:'In-degrees: ' + nodes.map(n => n.id + '=' + indeg[n.id]).join(', '),
            data:view(), vars:{}, stats:{ output:0 } };
    yield { tag:'seed', at:'seed', note:'Nodes with no prerequisites: ' + (q.length ? q.join(', ') : 'none — that already means a cycle') + '.',
            data:view(), vars:{ queue:'[' + q.join(',') + ']' }, stats:{ output:0 } };
    while (q.length){
      const u = q.shift();
      out.push(u);
      yield { tag:'take', at:'take', note:'Take ' + u + ' — it has no unmet prerequisites. Output: ' + out.join(' → '),
              data:view(Object.assign(M(), { [u]:'cur' })), vars:{ u }, stats:{ output:out.length } };
      for (const { to:v } of adj[u]){
        indeg[v]--; em[u + '-' + v] = 'done';
        yield { tag:'dec', at:'dec', note:u + ' is done, so ' + v + ' loses a prerequisite → in-degree ' + indeg[v] + '.',
                data:view(Object.assign(M(), { [u]:'cur', [v]:'cmp' })), vars:{ v, indeg:indeg[v] },
                stats:{ output:out.length } };
        if (indeg[v] === 0){
          q.push(v);
          yield { tag:'push', at:'push', note:v + ' is now unblocked → enqueue it.',
                  data:view(Object.assign(M(), { [v]:'win' })), vars:{ v, queue:'[' + q.join(',') + ']' },
                  stats:{ output:out.length } };
        }
      }
    }
    const ok = out.length === nodes.length;
    const left = nodes.filter(n => !out.includes(n.id)).map(n => n.id);
    yield { tag:'chk', at: ok ? 'ok' : 'cyc',
            note: ok ? 'All ' + nodes.length + ' nodes emitted → valid order: ' + out.join(' → ')
                     : 'Stuck with ' + left.join(', ') + ' still blocked — they form a cycle, so no topological order exists.',
            data:view(Object.assign(M(), Object.fromEntries(left.map(k => [k, 'bad'])))),
            vars:{ result: ok ? out.join('') : '[]' }, stats:{ output:out.length } };
  }
});
