/* ══════════════════════════════════════════════════════════════════════
   LINKED LISTS, STACKS & QUEUES
   ══════════════════════════════════════════════════════════════════════ */

DSA.register({
  id:'reverse-list', group:'Linked Lists', name:'Reverse a Linked List',
  blurb:'Re-point every next pointer backwards using three cursors. The one function everybody is asked to write on a whiteboard.',
  complexity:{ time:'O(n)', best:'O(n)', space:'O(1)', note:'iterative' },
  inputs:[{ key:'vals', label:'Values', type:'text', def:'1, 2, 3, 4, 5' }],
  flow:{ nodes:[
    { id:'init', title:'prev = None, cur = head', type:'start', r:0, c:0 },
    { id:'loop', title:'cur is not None ?', type:'dec', r:1, c:0 },
    { id:'save', title:'nxt = cur.next', sub:'save it — we are about to destroy the link', type:'act', r:2, c:0 },
    { id:'flip', title:'cur.next = prev', sub:'the actual reversal', type:'act', r:3, c:0 },
    { id:'adv',  title:'prev = cur, cur = nxt', sub:'shuffle both cursors forward', type:'act', r:4, c:0 },
    { id:'done', title:'Return prev', sub:'prev is the new head', type:'ok', r:5, c:1 }
  ], edges:[
    { from:'init', to:'loop' }, { from:'loop', to:'save', label:'yes' },
    { from:'save', to:'flip' }, { from:'flip', to:'adv' },
    { from:'adv', to:'loop' }, { from:'loop', to:'done', label:'no' }
  ]},
  code:{ python:`
def reverse_list(head):                         §init
    prev = None                                 §init
    cur = head                                  §init
    while cur:                                  §loop
        nxt = cur.next                          §save
        cur.next = prev                         §flip
        prev = cur                              §adv
        cur = nxt                               §adv
    return prev                                 §done`,
    java:`
static Node reverseList(Node head) {            §init
    Node prev = null;                           §init
    Node cur = head;                            §init
    while (cur != null) {                       §loop
        Node nxt = cur.next;                    §save
        cur.next = prev;                        §flip
        prev = cur;                             §adv
        cur = nxt;                              §adv
    }
    return prev;                                §done
}` },
  explain:`<p><b>Why three pointers, not two.</b> The moment you execute <code>cur.next = prev</code> you have thrown away the only reference to the rest of the list. <code>nxt</code> is the lifeline you save one line earlier. Forget it and you have leaked the tail — the single most common bug here.</p>
  <p><b>Order matters and is not negotiable:</b> save → flip → advance. Any other order loses a node.</p>
  <p><b>Why return <code>prev</code>, not <code>cur</code>:</b> the loop exits when <code>cur</code> is <code>None</code>, one step past the end. <code>prev</code> is standing on the last real node — which is the new head.</p>
  <p><b>Recursive version</b> is O(n) stack space; the iterative one is O(1). In an interview, mention both and say why you chose iterative.</p>`,
  run: function*(inp){
    const vals = clampArr(parseNums(inp.vals, [1,2,3,4,5]), 12);
    const rev = [];       // reversed prefix, head first
    const rest = vals.slice();
    const view = (o) => {
      o = o || {};
      return [
        { view:'list', title:'reversed so far  (prev →)', nodes: rev.map(v => ({ val:v })),
          marks:o.mrev || {}, pointers: rev.length ? { prev:0 } : {}, emptyLabel:'prev = None' },
        { view:'list', title:'not yet processed  (cur →)', nodes: rest.map(v => ({ val:v })),
          marks:o.mrest || {}, pointers:o.prest || (rest.length ? { cur:0 } : {}), emptyLabel:'cur = None' }
      ];
    };
    yield { tag:'init', at:'init', note:'prev = None, cur = head. Nothing reversed yet.',
            data:view({ mrest:{ 0:'cur' } }), vars:{ prev:'None', cur: rest[0] }, stats:{ steps:0 } };
    let steps = 0;
    while (rest.length){
      steps++;
      const cur = rest[0], nxt = rest.length > 1 ? rest[1] : null;
      yield { tag:'save', at:'save', note:'nxt = cur.next = ' + (nxt == null ? 'None' : nxt) + '. Saved before we overwrite cur.next.',
              data:view({ mrest:{ 0:'cur', 1: nxt != null ? 'cmp' : undefined },
                          prest: nxt != null ? { cur:0, nxt:1 } : { cur:0 } }),
              vars:{ prev: rev.length ? rev[0] : 'None', cur, nxt: nxt == null ? 'None' : nxt }, stats:{ steps } };
      yield { tag:'flip', at:'flip', note:'cur.next = prev — node ' + cur + ' now points ' + (rev.length ? 'back at ' + rev[0] : 'at None (it becomes the new tail)') + '.',
              data:view({ mrest:{ 0:'swap' }, mrev: rev.length ? { 0:'cmp' } : {} }),
              vars:{ prev: rev.length ? rev[0] : 'None', cur, nxt: nxt == null ? 'None' : nxt }, stats:{ steps } };
      rest.shift(); rev.unshift(cur);
      yield { tag:'adv', at:'adv', note:'prev = ' + cur + ', cur = ' + (nxt == null ? 'None' : nxt) + '. Both cursors move up one.',
              data:view({ mrev:{ 0:'done' } }),
              vars:{ prev:cur, cur: nxt == null ? 'None' : nxt }, stats:{ steps } };
    }
    yield { tag:'done', at:'done', note:'cur is None → the list is exhausted. prev = ' + rev[0] + ' is the new head.',
            data:view({ mrev:Object.fromEntries(rev.map((_, i) => [i, 'done'])) }),
            vars:{ newHead: rev[0] }, stats:{ steps } };
  }
});

DSA.register({
  id:'floyd-cycle', group:'Linked Lists', name:"Floyd's Cycle Detection",
  blurb:'Two pointers, one twice as fast. If a loop exists they must eventually collide inside it — using O(1) memory.',
  complexity:{ time:'O(n)', best:'O(1)', space:'O(1)', note:'"tortoise & hare"' },
  inputs:[
    { key:'vals', label:'Values',        type:'text', def:'1, 2, 3, 4, 5, 6' },
    { key:'link', label:'Tail links to index (−1 = no cycle)', type:'text', def:'2' }
  ],
  flow:{ nodes:[
    { id:'init', title:'slow = head, fast = head', type:'start', r:0, c:0 },
    { id:'guard',title:'fast and fast.next exist?', sub:'if not, we hit the end', type:'dec', r:1, c:0 },
    { id:'move', title:'slow = slow.next, fast = fast.next.next', type:'act', r:2, c:0 },
    { id:'meet', title:'slow == fast ?', type:'dec', r:3, c:0 },
    { id:'cycle',title:'Cycle exists', type:'ok', r:3, c:1 },
    { id:'none', title:'No cycle — return False', type:'bad', r:4, c:1 }
  ], edges:[
    { from:'init', to:'guard' }, { from:'guard', to:'move', label:'yes' },
    { from:'move', to:'meet' }, { from:'meet', to:'cycle', label:'yes' },
    { from:'meet', to:'guard', label:'no' }, { from:'guard', to:'none', label:'no' }
  ]},
  code:{ python:`
def has_cycle(head):                            §init
    slow = fast = head                          §init
    while fast and fast.next:                   §guard
        slow = slow.next                        §move
        fast = fast.next.next                   §move
        if slow is fast:                        §meet
            return True                         §cycle
    return False                                §none`,
    java:`
static boolean hasCycle(Node head) {            §init
    Node slow = head, fast = head;              §init
    while (fast != null && fast.next != null) { §guard
        slow = slow.next;                       §move
        fast = fast.next.next;                  §move
        if (slow == fast) {                     §meet
            return true;                        §cycle
        }
    }
    return false;                               §none
}` },
  explain:`<p><b>Why they must meet.</b> Once both pointers are inside the loop, the gap between them shrinks by exactly one node per step (fast gains 1 net per step). A gap that decreases by 1 every step and wraps around a finite loop must reach 0. It cannot "jump over" — that is the whole proof.</p>
  <p><b>Why <code>fast.next</code> must be checked too:</b> <code>fast = fast.next.next</code> dereferences twice. On an even-length list without a cycle, skipping that guard is a null-pointer crash.</p>
  <p><b>The follow-up</b> ("find where the cycle starts") uses the same setup: after they meet, reset one pointer to the head and advance both one step at a time — they meet at the loop entrance. That falls out of the algebra: distance from head to entry equals distance from meeting point to entry, modulo the loop length.</p>`,
  run: function*(inp){
    const vals = clampArr(parseNums(inp.vals, [1,2,3,4,5,6]), 12);
    const n = vals.length;
    let link = parseNums(inp.link, [2])[0];
    if (link == null || link < 0 || link >= n) link = -1;
    const nxt = i => (i === n - 1) ? (link >= 0 ? link : null) : i + 1;
    const view = (s, f, mark) => ({
      view:'list', nodes: vals.map(v => ({ val:v })), marks: mark || {},
      pointers: Object.assign({}, s != null ? { slow:s } : {}, f != null ? { fast:f } : {}),
      cycle: link >= 0 ? { to:link } : null, title:'linked list'
    });
    let slow = 0, fast = 0, steps = 0;
    yield { tag:'init', at:'init', note:'Both pointers start at the head' + (link >= 0 ? '. (This list loops: the tail points back to index ' + link + '.)' : '. (This list ends normally.)'),
            data:view(slow, fast, { 0:'cur' }), vars:{ slow:vals[0], fast:vals[0] }, stats:{ steps:0 } };
    while (true){
      const f1 = fast == null ? null : nxt(fast);
      if (fast == null || f1 == null){
        yield { tag:'none', at:'none', note:'fast ran off the end → the list is null-terminated, so there is no cycle.',
                data:view(slow, null, {}), vars:{ slow:vals[slow] }, stats:{ steps } };
        return;
      }
      yield { tag:'guard', at:'guard', note:'fast and fast.next both exist — safe to take a double step.',
              data:view(slow, fast, { [fast]:'cmp' }), vars:{ slow:vals[slow], fast:vals[fast] }, stats:{ steps } };
      steps++;
      slow = nxt(slow); fast = nxt(f1);
      yield { tag:'move', at:'move', note:'slow → ' + vals[slow] + ' (1 step), fast → ' + vals[fast] + ' (2 steps). The gap closes by one each round.',
              data:view(slow, fast, { [slow]:'win', [fast]:'cmp' }),
              vars:{ slow:vals[slow], fast:vals[fast] }, stats:{ steps } };
      if (slow === fast){
        yield { tag:'cycle', at:'cycle', note:'They collided at node ' + vals[slow] + ' → a cycle exists. Detected in ' + steps + ' steps, O(1) memory.',
                data:view(slow, fast, { [slow]:'done' }), vars:{ meetAt:vals[slow] }, stats:{ steps } };
        return;
      }
      if (steps > 200) return;
    }
  }
});

DSA.register({
  id:'valid-parens', group:'Stacks & Queues', name:'Valid Parentheses',
  blurb:'The canonical stack problem: every closer must match the most recently opened bracket.',
  complexity:{ time:'O(n)', best:'O(1)', space:'O(n)', note:'stack depth' },
  inputs:[{ key:'s', label:'Brackets', type:'text', def:'{[()]}([])' }],
  flow:{ nodes:[
    { id:'init', title:'stack = [ ]', type:'start', r:0, c:0 },
    { id:'loop', title:'More characters?', type:'dec', r:1, c:0 },
    { id:'open', title:'Is it an opener?', type:'dec', r:2, c:0 },
    { id:'push', title:'push it', type:'act', r:3, c:0 },
    { id:'chk',  title:'Stack empty, or top does not match?', type:'dec', r:4, c:0 },
    { id:'fail', title:'Return False', type:'bad', r:4, c:1 },
    { id:'pop',  title:'pop the matching opener', type:'act', r:5, c:0 },
    { id:'end',  title:'Stack empty at the end?', type:'dec', r:6, c:0 },
    { id:'ok',   title:'Return True', type:'ok', r:6, c:1 }
  ], edges:[
    { from:'init', to:'loop' }, { from:'loop', to:'open', label:'yes' },
    { from:'open', to:'push', label:'yes' }, { from:'push', to:'loop' },
    { from:'open', to:'chk', label:'no' }, { from:'chk', to:'fail', label:'yes' },
    { from:'chk', to:'pop', label:'no' }, { from:'pop', to:'loop' },
    { from:'loop', to:'end', label:'no' }, { from:'end', to:'ok', label:'yes' },
    { from:'end', to:'fail', label:'no' }
  ]},
  code:{ python:`
def is_valid(s):                                §init
    pairs = {')': '(', ']': '[', '}': '{'}      §init
    stack = []                                  §init
    for ch in s:                                §loop
        if ch not in pairs:                     §open
            stack.append(ch)                    §push
        elif not stack or stack.pop() != pairs[ch]: §chk
            return False                        §fail
    return not stack                            §end`,
    java:`
static boolean isValid(String s) {              §init
    Map<Character,Character> pairs = Map.of(    §init
        ')','(', ']','[', '}','{');             §init
    Deque<Character> stack = new ArrayDeque<>(); §init
    for (char ch : s.toCharArray()) {           §loop
        if (!pairs.containsKey(ch)) {           §open
            stack.push(ch);                     §push
        } else if (stack.isEmpty()              §chk
                || stack.pop() != pairs.get(ch)) { §chk
            return false;                       §fail
        }
    }
    return stack.isEmpty();                     §end
}` },
  explain:`<p><b>Why a stack and not a counter.</b> Counting openers and closers works for one bracket type, but <code>([)]</code> would pass. Nesting demands last-in-first-out: a closer must match the <i>most recent</i> unclosed opener. That is literally the definition of a stack.</p>
  <p><b>Three failure modes</b>, and all three must be handled:</p>
  <ul><li>a closer with an empty stack — <code>)</code> alone;</li>
  <li>a closer whose top does not match — <code>(]</code>;</li>
  <li>leftovers at the end — <code>((</code>. Forgetting this last check is the usual bug.</li></ul>
  <p>The maximum stack depth equals the deepest nesting level — that is your O(n) worst case, hit by <code>((((((</code>.</p>`,
  run: function*(inp){
    const s = String(inp.s || '{[()]}([])').replace(/[^\(\)\[\]\{\}]/g, '').slice(0, 26) || '()';
    const pairs = { ')':'(', ']':'[', '}':'{' };
    const st = [];
    const view = (i, mark, stMark) => [
      C(s, mark || {}, i != null ? { i } : {}, { title:'input' }),
      { view:'list', orient:'v', links:false, title:'stack (top first)',
        nodes: st.slice().reverse().map(c => ({ val:c })), marks: stMark || {}, emptyLabel:'empty' }
    ];
    yield { tag:'init', at:'init', note:'Empty stack.', data:view(null, {}), vars:{}, stats:{ depth:0, maxDepth:0 } };
    let maxD = 0;
    for (let i = 0; i < s.length; i++){
      const ch = s[i];
      const done = {}; for (let x = 0; x < i; x++) done[x] = 'dim';
      if (!pairs[ch]){
        st.push(ch); maxD = Math.max(maxD, st.length);
        yield { tag:'push', at:'push', note:"'" + ch + "' is an opener → push. Stack depth " + st.length + '.',
                data:view(i, Object.assign(done, { [i]:'win' }), { 0:'win' }),
                vars:{ i, ch, depth:st.length }, stats:{ depth:st.length, maxDepth:maxD } };
      } else {
        const top = st.length ? st[st.length - 1] : null;
        const bad = !st.length || top !== pairs[ch];
        yield { tag:'chk', at:'chk',
                note: !st.length ? "'" + ch + "' closes nothing — the stack is empty."
                     : "'" + ch + "' needs '" + pairs[ch] + "' on top; top is '" + top + "' → " + (bad ? 'mismatch' : 'match'),
                data:view(i, Object.assign(done, { [i]: bad ? 'bad' : 'cmp' }), { 0: bad ? 'bad' : 'cmp' }),
                vars:{ i, ch, needs:pairs[ch], top: top || 'None' }, stats:{ depth:st.length, maxDepth:maxD } };
        if (bad){
          yield { tag:'fail', at:'fail', note:'Invalid — return False.',
                  data:view(i, Object.assign(done, { [i]:'bad' })), vars:{ result:false }, stats:{ depth:st.length, maxDepth:maxD } };
          return;
        }
        st.pop();
        yield { tag:'chk', at:'pop', note:"Matched pair closed — the pop happens inside that same condition. Stack depth " + st.length + '.',
                data:view(i, Object.assign(done, { [i]:'done' })), vars:{ i, depth:st.length },
                stats:{ depth:st.length, maxDepth:maxD } };
      }
    }
    const all = {}; for (let x = 0; x < s.length; x++) all[x] = st.length ? 'bad' : 'done';
    yield { tag:'end', at: st.length ? 'fail' : 'ok',
            note: st.length ? st.length + ' opener(s) were never closed → False.'
                            : 'Every bracket matched and the stack is empty → True. Max nesting depth was ' + maxD + '.',
            data:view(null, all), vars:{ result: st.length === 0 }, stats:{ depth:st.length, maxDepth:maxD } };
  }
});
