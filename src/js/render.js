/* ══════════════════════════════════════════════════════════════════════
   DSAViz — renderers.  Every view is plain SVG using CSS custom properties
   for colour, so light/dark theming is automatic.
   ══════════════════════════════════════════════════════════════════════ */
const SVGNS = 'http://www.w3.org/2000/svg';
let _uid = 0;

function S(tag, attrs, text){
  const e = document.createElementNS(SVGNS, tag);
  if (attrs) for (const k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
  if (text != null) e.textContent = text;
  return e;
}
function mkSvg(w, h){
  const s = S('svg', { viewBox: '0 0 ' + w + ' ' + h, width: w, height: h,
                       'font-family': 'ui-sans-serif, system-ui, sans-serif' });
  s.style.maxWidth = '100%'; s.style.height = 'auto';
  return s;
}
function defsArrow(svg, color, id){
  const defs = S('defs');
  const m = S('marker', { id: id, viewBox: '0 0 10 10', refX: 9, refY: 5,
                          markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' });
  m.appendChild(S('path', { d: 'M 0 1 L 9 5 L 0 9 z', fill: color }));
  defs.appendChild(m); svg.appendChild(defs);
  return 'url(#' + id + ')';
}

/* mark → colours */
const MK = {
  base:  { f:'var(--bg-3)',      s:'var(--line-2)',  t:'var(--fg)'      },
  cmp:   { f:'var(--info-bg)',   s:'var(--info)',    t:'var(--info)'    },
  swap:  { f:'var(--warn-bg)',   s:'var(--warn)',    t:'var(--warn)'    },
  done:  { f:'var(--accent-bg)', s:'var(--accent)',  t:'var(--accent)'  },
  cur:   { f:'var(--accent)',    s:'var(--accent)',  t:'var(--bg-2)'    },
  pivot: { f:'var(--violet-bg)', s:'var(--violet)',  t:'var(--violet)'  },
  bad:   { f:'var(--bad-bg)',    s:'var(--bad)',     t:'var(--bad)'     },
  dim:   { f:'var(--bg-inset)',  s:'var(--line)',    t:'var(--fg-3)'    },
  win:   { f:'var(--accent-bg)', s:'var(--line-2)',  t:'var(--fg)'      }
};
const mk = m => MK[m] || MK.base;

function wrapText(str, per){
  const words = String(str).split(/\s+/), out = []; let cur = '';
  for (const w of words){
    if (cur && (cur + ' ' + w).length > per){ out.push(cur); cur = w; }
    else cur = cur ? cur + ' ' + w : w;
  }
  if (cur) out.push(cur);
  return out;
}

/* ═════════════════════════════  ARRAY  ═════════════════════════════ */
function renderArray(d){
  const vals = d.values || [];
  const n = vals.length || 1;
  const numeric = vals.every(v => typeof v === 'number');
  const cells = d.mode === 'cells' || !numeric;

  const cw   = Math.max(26, Math.min(cells ? 48 : 54, Math.floor(880 / n)));
  const gap  = n > 30 ? 2 : 4;
  const padL = 26, padT = d.pointers ? 46 : 18;
  const barH = cells ? 46 : 180;
  const idxH = 22;
  const W = padL * 2 + n * (cw + gap), H = padT + barH + idxH + 26;
  const svg = mkSvg(W, H);
  const ax  = defsArrow(svg, 'var(--accent)', 'ar' + (++_uid));

  const finite = vals.filter(v => typeof v === 'number' && isFinite(v));
  const maxV = Math.max(1, ...finite.map(Math.abs));
  const hasNeg = finite.some(v => v < 0);
  const zeroY = padT + (hasNeg ? barH / 2 : barH);

  /* sliding-window band */
  (d.windows || []).forEach(w => {
    const x1 = padL + w.lo * (cw + gap) - gap / 2;
    const x2 = padL + (w.hi + 1) * (cw + gap) - gap / 2;
    svg.appendChild(S('rect', { x:x1, y:padT - 8, width:Math.max(0, x2 - x1), height:barH + 16,
      rx:8, fill:'var(--accent-bg)', opacity:.55, stroke:'var(--accent)',
      'stroke-dasharray':'4 3', 'stroke-opacity':.6 }));
    if (w.label) svg.appendChild(S('text', { x:(x1 + x2) / 2, y:padT - 14, 'text-anchor':'middle',
      'font-size':11, 'font-weight':600, fill:'var(--accent)' }, w.label));
  });

  vals.forEach((v, i) => {
    const c = mk((d.marks || {})[i]);
    const x = padL + i * (cw + gap);
    if (cells){
      svg.appendChild(S('rect', { x, y:padT, width:cw, height:barH, rx:7,
        fill:c.f, stroke:c.s, 'stroke-width':1.6 }));
      svg.appendChild(S('text', { x:x + cw/2, y:padT + barH/2, 'text-anchor':'middle',
        'dominant-baseline':'central', 'font-size':Math.min(16, cw*0.42),
        'font-weight':600, fill:c.t, 'font-family':'ui-monospace,monospace' }, String(v)));
    } else {
      const h = Math.max(3, Math.abs(v) / maxV * (hasNeg ? barH/2 : barH) - 2);
      const y = v < 0 ? zeroY : zeroY - h;
      svg.appendChild(S('rect', { x, y, width:cw, height:h, rx:4, fill:c.f, stroke:c.s, 'stroke-width':1.5 }));
      if (cw >= 22) svg.appendChild(S('text', { x:x + cw/2, y: v < 0 ? y + h + 12 : y - 6,
        'text-anchor':'middle', 'font-size':11, 'font-weight':600, fill:c.t,
        'font-family':'ui-monospace,monospace' }, String(v)));
    }
    if (d.showIndex !== false && cw >= 20)
      svg.appendChild(S('text', { x:x + cw/2, y:padT + barH + 14, 'text-anchor':'middle',
        'font-size':10, fill:'var(--fg-3)', 'font-family':'ui-monospace,monospace' }, i));
  });

  if (hasNeg) svg.appendChild(S('line', { x1:padL - 6, y1:zeroY, x2:W - padL + 6, y2:zeroY,
    stroke:'var(--line-2)', 'stroke-dasharray':'3 3' }));

  /* pointer flags above */
  const ptrs = d.pointers || {};
  const byIdx = {};
  Object.keys(ptrs).forEach(k => {
    const i = ptrs[k]; if (i == null || i < 0 || i >= n) return;
    (byIdx[i] = byIdx[i] || []).push(k);
  });
  Object.keys(byIdx).forEach(i => {
    const x = padL + (+i) * (cw + gap) + cw / 2;
    const label = byIdx[i].join(',');
    svg.appendChild(S('line', { x1:x, y1:padT - 30, x2:x, y2:padT - 8,
      stroke:'var(--accent)', 'stroke-width':1.6, 'marker-end':ax }));
    svg.appendChild(S('text', { x, y:padT - 34, 'text-anchor':'middle', 'font-size':11.5,
      'font-weight':700, fill:'var(--accent)', 'font-family':'ui-monospace,monospace' }, label));
  });

  /* out-of-range pointers shown as a caption */
  const off = Object.keys(ptrs).filter(k => ptrs[k] != null && (ptrs[k] < 0 || ptrs[k] >= n));
  if (off.length) svg.appendChild(S('text', { x:padL, y:H - 6, 'font-size':11, fill:'var(--fg-3)',
    'font-family':'ui-monospace,monospace' }, off.map(k => k + '=' + ptrs[k] + ' (outside)').join('   ')));

  return wrapTitled(svg, d.title);
}

/* ═════════════════════════════  LINKED LIST / STACK / QUEUE  ═════════════════════════════ */
function renderList(d){
  const nodes = d.nodes || [];
  const vert = d.orient === 'v';
  const bw = 62, bh = 38, gapN = vert ? 10 : 40;
  const padX = 30, padT = 46;
  const W = vert ? 320 : padX * 2 + Math.max(1, nodes.length) * (bw + gapN) + 40;
  const H = vert ? padT + Math.max(1, nodes.length) * (bh + gapN) + 30 : padT + bh + 64;
  const svg = mkSvg(Math.max(W, 260), Math.max(H, 150));
  const ar  = defsArrow(svg, 'var(--fg-3)', 'lr' + (++_uid));
  const ap  = defsArrow(svg, 'var(--accent)', 'lp' + (++_uid));

  if (!nodes.length){
    svg.appendChild(S('text', { x:(Math.max(W,260))/2, y:80, 'text-anchor':'middle',
      'font-size':13, fill:'var(--fg-3)' }, d.emptyLabel || 'empty'));
    return wrapTitled(svg, d.title);
  }

  const pos = i => vert
    ? { x: 110, y: padT + i * (bh + gapN) }
    : { x: padX + i * (bw + gapN), y: padT };

  nodes.forEach((nd, i) => {
    const c = mk((d.marks || {})[i] || nd.mark);
    const p = pos(i);
    svg.appendChild(S('rect', { x:p.x, y:p.y, width:bw, height:bh, rx:7,
      fill:c.f, stroke:c.s, 'stroke-width':1.7 }));
    svg.appendChild(S('text', { x:p.x + bw/2, y:p.y + bh/2, 'text-anchor':'middle',
      'dominant-baseline':'central', 'font-size':14, 'font-weight':600, fill:c.t,
      'font-family':'ui-monospace,monospace' }, String(nd.val != null ? nd.val : nd)));

    if (i < nodes.length - 1 && d.links !== false && !vert){
      svg.appendChild(S('line', { x1:p.x + bw + 4, y1:p.y + bh/2, x2:p.x + bw + gapN - 6,
        y2:p.y + bh/2, stroke:'var(--fg-3)', 'stroke-width':1.6, 'marker-end':ar }));
    }
  });

  /* null terminator */
  if (!vert && d.links !== false && !d.cycle){
    const p = pos(nodes.length - 1);
    svg.appendChild(S('line', { x1:p.x + bw + 4, y1:p.y + bh/2, x2:p.x + bw + 26, y2:p.y + bh/2,
      stroke:'var(--fg-3)', 'stroke-width':1.6, 'marker-end':ar }));
    svg.appendChild(S('text', { x:p.x + bw + 42, y:p.y + bh/2, 'text-anchor':'middle',
      'dominant-baseline':'central', 'font-size':12, fill:'var(--fg-3)',
      'font-family':'ui-monospace,monospace' }, '∅'));
  }

  /* cycle back-edge */
  if (d.cycle){
    const a = pos(nodes.length - 1), b = pos(d.cycle.to);
    const ax1 = a.x + bw/2, ay = a.y + bh, bx = b.x + bw/2, by = b.y + bh;
    const dip = by + 34;
    svg.appendChild(S('path', { d:'M ' + ax1 + ' ' + ay + ' L ' + ax1 + ' ' + dip +
      ' L ' + bx + ' ' + dip + ' L ' + bx + ' ' + (by + 3),
      fill:'none', stroke:'var(--bad)', 'stroke-width':1.8, 'marker-end':defsArrow(svg,'var(--bad)','cy'+(++_uid)) }));
    svg.appendChild(S('text', { x:(ax1 + bx)/2, y:dip + 14, 'text-anchor':'middle',
      'font-size':11, fill:'var(--bad)', 'font-weight':600 }, 'cycle'));
  }

  /* pointers */
  const ptrs = d.pointers || {};
  const byIdx = {};
  Object.keys(ptrs).forEach(k => { const i = ptrs[k];
    if (i == null || i < 0 || i >= nodes.length) return; (byIdx[i] = byIdx[i] || []).push(k); });
  Object.keys(byIdx).forEach(i => {
    const p = pos(+i), label = byIdx[i].join('/');
    if (vert){
      svg.appendChild(S('line', { x1:p.x - 34, y1:p.y + bh/2, x2:p.x - 6, y2:p.y + bh/2,
        stroke:'var(--accent)', 'stroke-width':1.6, 'marker-end':ap }));
      svg.appendChild(S('text', { x:p.x - 40, y:p.y + bh/2, 'text-anchor':'end',
        'dominant-baseline':'central', 'font-size':11.5, 'font-weight':700,
        fill:'var(--accent)', 'font-family':'ui-monospace,monospace' }, label));
    } else {
      svg.appendChild(S('line', { x1:p.x + bw/2, y1:p.y - 28, x2:p.x + bw/2, y2:p.y - 6,
        stroke:'var(--accent)', 'stroke-width':1.6, 'marker-end':ap }));
      svg.appendChild(S('text', { x:p.x + bw/2, y:p.y - 32, 'text-anchor':'middle',
        'font-size':11.5, 'font-weight':700, fill:'var(--accent)',
        'font-family':'ui-monospace,monospace' }, label));
    }
  });

  /* side labels for stack/queue ends */
  (d.ends || []).forEach(e => {
    const p = pos(e.i); if (!p) return;
    svg.appendChild(S('text', { x:vert ? p.x + bw + 12 : p.x + bw/2,
      y:vert ? p.y + bh/2 : p.y + bh + 16,
      'text-anchor':vert ? 'start' : 'middle', 'dominant-baseline':vert ? 'central' : 'auto',
      'font-size':11, 'font-weight':600, fill:'var(--fg-3)' }, e.label));
  });

  return wrapTitled(svg, d.title);
}

/* ═════════════════════════════  BINARY TREE  ═════════════════════════════ */
function renderTree(d){
  const N = d.nodes || {};
  if (d.root == null || !N[d.root]){
    const svg = mkSvg(300, 120);
    svg.appendChild(S('text', { x:150, y:60, 'text-anchor':'middle', 'font-size':13,
      fill:'var(--fg-3)' }, d.emptyLabel || 'empty tree'));
    return wrapTitled(svg, d.title);
  }
  /* in-order x assignment */
  const xs = {}, ds = {}; let col = 0, maxD = 0;
  (function walk(id, dep){
    if (id == null || !N[id]) return;
    walk(N[id].l, dep + 1);
    xs[id] = col++; ds[id] = dep; maxD = Math.max(maxD, dep);
    walk(N[id].r, dep + 1);
  })(d.root, 0);

  const ids  = Object.keys(xs);
  const R    = 20;
  const colW = Math.max(46, Math.min(78, Math.floor(900 / Math.max(1, col))));
  const rowH = 74, padX = 34, padT = 30;
  const W = padX * 2 + Math.max(1, col) * colW;
  const H = padT * 2 + (maxD + 1) * rowH;
  const svg = mkSvg(W, H);
  const cx = id => padX + xs[id] * colW + colW / 2;
  const cy = id => padT + ds[id] * rowH + R;

  ids.forEach(id => {
    ['l','r'].forEach(side => {
      const ch = N[id][side];
      if (ch == null || xs[ch] == null) return;
      const em = (d.edgeMarks || {})[id + '>' + ch];
      svg.appendChild(S('line', { x1:cx(id), y1:cy(id) + R - 2, x2:cx(ch), y2:cy(ch) - R + 2,
        stroke: em ? mk(em).s : 'var(--line-2)', 'stroke-width': em ? 2.6 : 1.6 }));
    });
  });
  ids.forEach(id => {
    const c = mk((d.marks || {})[id]);
    svg.appendChild(S('circle', { cx:cx(id), cy:cy(id), r:R, fill:c.f, stroke:c.s, 'stroke-width':2 }));
    svg.appendChild(S('text', { x:cx(id), y:cy(id), 'text-anchor':'middle', 'dominant-baseline':'central',
      'font-size':13, 'font-weight':600, fill:c.t, 'font-family':'ui-monospace,monospace' },
      String(N[id].v != null ? N[id].v : id)));
    const lb = (d.labels || {})[id];
    if (lb) svg.appendChild(S('text', { x:cx(id), y:cy(id) + R + 12, 'text-anchor':'middle',
      'font-size':10.5, fill:'var(--fg-3)', 'font-family':'ui-monospace,monospace' }, lb));
  });
  return wrapTitled(svg, d.title);
}

/* ═════════════════════════════  GRAPH  ═════════════════════════════ */
function renderGraph(d){
  const nodes = d.nodes || [], edges = d.edges || [];
  const R = 21, pad = 44;
  const W = d.w || 620, H = d.h || 380;
  const svg = mkSvg(W, H);
  const arD = defsArrow(svg, 'var(--line-2)', 'gd' + (++_uid));
  const arA = defsArrow(svg, 'var(--accent)', 'ga' + (++_uid));

  const P = {};
  nodes.forEach((n, i) => {
    if (n.x != null) P[n.id] = { x: pad + n.x * (W - pad*2), y: pad + n.y * (H - pad*2) };
    else { const a = (i / nodes.length) * Math.PI * 2 - Math.PI/2;
           P[n.id] = { x: W/2 + Math.cos(a) * (W/2 - pad), y: H/2 + Math.sin(a) * (H/2 - pad) }; }
  });

  edges.forEach(e => {
    const a = P[e.u], b = P[e.v]; if (!a || !b) return;
    const m = (d.edgeMarks || {})[e.u + '-' + e.v] || (d.edgeMarks || {})[e.v + '-' + e.u];
    const c = m ? mk(m) : { s:'var(--line-2)' };
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
    const ox = dx / L * R, oy = dy / L * R;
    svg.appendChild(S('line', { x1:a.x + ox, y1:a.y + oy, x2:b.x - ox, y2:b.y - oy,
      stroke:c.s, 'stroke-width': m ? 3 : 1.7,
      'marker-end': e.dir ? (m ? arA : arD) : null }));
    if (e.w != null){
      const mx = (a.x + b.x)/2, my = (a.y + b.y)/2;
      svg.appendChild(S('rect', { x:mx - 12, y:my - 9, width:24, height:17, rx:5,
        fill:'var(--bg-2)', stroke:'var(--line)' }));
      svg.appendChild(S('text', { x:mx, y:my, 'text-anchor':'middle', 'dominant-baseline':'central',
        'font-size':10.5, fill: m ? mk(m).t : 'var(--fg-2)', 'font-weight':600,
        'font-family':'ui-monospace,monospace' }, e.w));
    }
  });

  nodes.forEach(n => {
    const c = mk((d.marks || {})[n.id]);
    const p = P[n.id];
    svg.appendChild(S('circle', { cx:p.x, cy:p.y, r:R, fill:c.f, stroke:c.s, 'stroke-width':2.2 }));
    svg.appendChild(S('text', { x:p.x, y:p.y, 'text-anchor':'middle', 'dominant-baseline':'central',
      'font-size':13, 'font-weight':650, fill:c.t, 'font-family':'ui-monospace,monospace' },
      String(n.label != null ? n.label : n.id)));
    const lb = (d.labels || {})[n.id];
    if (lb != null) svg.appendChild(S('text', { x:p.x, y:p.y + R + 13, 'text-anchor':'middle',
      'font-size':11, fill:'var(--accent)', 'font-weight':600,
      'font-family':'ui-monospace,monospace' }, lb));
  });
  return wrapTitled(svg, d.title);
}

/* ═════════════════════════════  DP / 2-D TABLE  ═════════════════════════════ */
function renderTable(d){
  const cells = d.cells || [];
  const rows = cells.length, cols = rows ? cells[0].length : 0;
  const cw = Math.max(30, Math.min(52, Math.floor(820 / Math.max(1, cols + 1))));
  const ch = 30, padL = d.rowLabels ? cw + 8 : 10, padT = d.colLabels ? ch + 8 : 10;
  const W = padL + cols * cw + 14, H = padT + rows * ch + 14;
  const svg = mkSvg(Math.max(W, 200), Math.max(H, 90));

  if (d.colLabels) d.colLabels.forEach((l, c) =>
    svg.appendChild(S('text', { x:padL + c*cw + cw/2, y:padT - 12, 'text-anchor':'middle',
      'font-size':11, 'font-weight':600, fill:'var(--fg-3)',
      'font-family':'ui-monospace,monospace' }, l)));
  if (d.rowLabels) d.rowLabels.forEach((l, r) =>
    svg.appendChild(S('text', { x:padL - 10, y:padT + r*ch + ch/2, 'text-anchor':'end',
      'dominant-baseline':'central', 'font-size':11, 'font-weight':600, fill:'var(--fg-3)',
      'font-family':'ui-monospace,monospace' }, l)));
  if (d.corner) svg.appendChild(S('text', { x:padL - 10, y:padT - 12, 'text-anchor':'end',
    'font-size':10.5, fill:'var(--fg-3)' }, d.corner));

  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++){
    const m = (d.marks || {})[r + ',' + c];
    const col = mk(m);
    svg.appendChild(S('rect', { x:padL + c*cw, y:padT + r*ch, width:cw - 2, height:ch - 2, rx:5,
      fill: m ? col.f : 'var(--bg-3)', stroke: m ? col.s : 'var(--line)',
      'stroke-width': m ? 1.8 : 1 }));
    const v = cells[r][c];
    if (v !== '' && v != null) svg.appendChild(S('text', { x:padL + c*cw + (cw-2)/2,
      y:padT + r*ch + (ch-2)/2, 'text-anchor':'middle', 'dominant-baseline':'central',
      'font-size':11.5, 'font-weight': m ? 700 : 500, fill: m ? col.t : 'var(--fg-2)',
      'font-family':'ui-monospace,monospace' }, String(v)));
  }
  return wrapTitled(svg, d.title);
}

/* ═════════════════════════════  RECURSION / CALL TREE  ═════════════════════════════ */
function renderCallTree(d){
  const ns = d.nodes || [];
  if (!ns.length){ const s = mkSvg(300, 90);
    s.appendChild(S('text', { x:150, y:45, 'text-anchor':'middle', 'font-size':13,
      fill:'var(--fg-3)' }, 'no calls yet')); return wrapTitled(s, d.title); }

  const kids = {}; ns.forEach(n => { if (n.parent != null) (kids[n.parent] = kids[n.parent] || []).push(n.id); });
  const byId = {}; ns.forEach(n => byId[n.id] = n);
  const roots = ns.filter(n => n.parent == null).map(n => n.id);

  let leaf = 0; const xs = {}, ds = {}; let maxD = 0;
  (function place(id, dep){
    ds[id] = dep; maxD = Math.max(maxD, dep);
    const ks = kids[id] || [];
    if (!ks.length){ xs[id] = leaf++; return; }
    ks.forEach(k => place(k, dep + 1));
    xs[id] = (xs[ks[0]] + xs[ks[ks.length - 1]]) / 2;
  })(roots[0], 0);
  roots.slice(1).forEach(r => place(r, 0));

  const bw = Math.max(48, Math.min(96, Math.floor(940 / Math.max(1, leaf)))), bh = 28;
  const rowH = 62, padX = 22, padT = 22;
  const W = padX*2 + Math.max(1, leaf) * bw, H = padT*2 + (maxD + 1) * rowH;
  const svg = mkSvg(W, H);
  const cx = id => padX + xs[id] * bw + bw/2, cy = id => padT + ds[id] * rowH;

  ns.forEach(n => { if (n.parent == null || xs[n.parent] == null) return;
    svg.appendChild(S('line', { x1:cx(n.parent), y1:cy(n.parent) + bh, x2:cx(n.id), y2:cy(n.id),
      stroke:'var(--line-2)', 'stroke-width':1.5 })); });
  ns.forEach(n => {
    const c = mk(n.mark);
    const x = cx(n.id) - bw/2 + 3;
    svg.appendChild(S('rect', { x, y:cy(n.id), width:bw - 6, height:bh, rx:6,
      fill:c.f, stroke:c.s, 'stroke-width':1.6 }));
    svg.appendChild(S('text', { x:cx(n.id), y:cy(n.id) + bh/2, 'text-anchor':'middle',
      'dominant-baseline':'central', 'font-size':Math.min(12, (bw-10)/(String(n.label).length*0.62)),
      'font-weight':600, fill:c.t, 'font-family':'ui-monospace,monospace' }, n.label));
    if (n.ret != null) svg.appendChild(S('text', { x:cx(n.id), y:cy(n.id) + bh + 11,
      'text-anchor':'middle', 'font-size':10, fill:'var(--accent)', 'font-weight':600,
      'font-family':'ui-monospace,monospace' }, '→ ' + n.ret));
  });
  return wrapTitled(svg, d.title);
}

/* ═════════════════════════════  FLOWCHART  ═════════════════════════════
   nodes: [{id,title,sub,type,r,c}]   type: start|dec|act|ok|bad|io
   edges: [{from,to,label}]
   Grid layout by (r,c); orthogonal routing with lanes for side/back edges.
   ═════════════════════════════════════════════════════════════════════ */
const FLOW_TYPE = {
  start:{ f:'var(--bg-2)',      s:'var(--line-2)', t:'var(--fg)'     },
  io:   { f:'var(--bg-2)',      s:'var(--line-2)', t:'var(--fg)'     },
  dec:  { f:'var(--bg-3)',      s:'var(--line-2)', t:'var(--fg)'     },
  act:  { f:'var(--accent-bg)', s:'var(--accent)', t:'var(--accent)' },
  ok:   { f:'var(--accent-bg)', s:'var(--accent)', t:'var(--accent)' },
  bad:  { f:'var(--bad-bg)',    s:'var(--bad)',    t:'var(--bad)'    },
  loop: { f:'var(--info-bg)',   s:'var(--info)',   t:'var(--info)'   }
};

function renderFlow(d, activeId){
  const nodes = (d.nodes || []).map(n => Object.assign({}, n));
  if (!nodes.length){
    const s = mkSvg(320, 90);
    s.appendChild(S('text', { x:160, y:45, 'text-anchor':'middle', 'font-size':13,
      fill:'var(--fg-3)' }, 'no flowchart for this step'));
    return wrapTitled(s, d.title);
  }
  const byId = {}; nodes.forEach(n => byId[n.id] = n);

  /* size each box from its text */
  nodes.forEach(n => {
    n.tl = wrapText(n.title, 30);
    n.sl = n.sub ? wrapText(n.sub, 34) : [];
    const wT = Math.max(...n.tl.map(s => s.length)) * 8.3;
    const wS = n.sl.length ? Math.max(...n.sl.map(s => s.length)) * 6.7 : 0;
    n.w = Math.max(150, Math.min(360, Math.max(wT, wS) + 40));
    n.h = 26 + n.tl.length * 20 + (n.sl.length ? n.sl.length * 16 + 4 : 0);
  });

  /* column geometry */
  const colsUsed = [...new Set(nodes.map(n => n.c || 0))].sort((a,b) => a - b);
  const colW = {}, colX = {};
  colsUsed.forEach(c => colW[c] = Math.max(...nodes.filter(n => (n.c||0) === c).map(n => n.w)));
  const LANE = 46, GUTTER = 62;
  let cursor = LANE * 2 + 20;
  colsUsed.forEach(c => { colX[c] = cursor + colW[c] / 2; cursor += colW[c] + GUTTER; });

  /* row geometry */
  const rowsUsed = [...new Set(nodes.map(n => n.r || 0))].sort((a,b) => a - b);
  const rowH = {}, rowY = {};
  rowsUsed.forEach(r => rowH[r] = Math.max(...nodes.filter(n => (n.r||0) === r).map(n => n.h)));
  let ry = 26;
  rowsUsed.forEach(r => { rowY[r] = ry + rowH[r] / 2; ry += rowH[r] + 54; });

  nodes.forEach(n => { n.cx = colX[n.c || 0]; n.cy = rowY[n.r || 0]; });

  const W = cursor + LANE * 2, H = ry + 16;
  const svg = mkSvg(W, H);
  const arN = defsArrow(svg, 'var(--fg-3)',   'fn' + (++_uid));
  const arA = defsArrow(svg, 'var(--accent)', 'fa' + (++_uid));

  /* ── edges ── */
  let backLane = 0, sideLane = 0;
  (d.edges || []).forEach(e => {
    const a = byId[e.from], b = byId[e.to];
    if (!a || !b) return;
    const on = activeId && (a.id === activeId);
    const col = on ? 'var(--accent)' : 'var(--fg-3)';
    const mkr = on ? arA : arN;
    const sw  = on ? 2.2 : 1.5;
    let path, lx, ly;

    const sameCol = (a.c || 0) === (b.c || 0);
    const down = b.cy > a.cy;
    /* does another box in this column sit between the two? then we must route around */
    const blocked = sameCol && down && nodes.some(n =>
      n !== a && n !== b && (n.c || 0) === (a.c || 0) && n.cy > a.cy && n.cy < b.cy);

    if (sameCol && down && !blocked){
      path = 'M ' + a.cx + ' ' + (a.cy + a.h/2) + ' L ' + b.cx + ' ' + (b.cy - b.h/2 - 2);
      lx = a.cx + 8; ly = (a.cy + a.h/2 + b.cy - b.h/2) / 2;
    } else if (sameCol && down && blocked){
      /* forward skip — hug the right lane */
      const lane = colX[a.c || 0] + colW[a.c || 0]/2 + 24 + (sideLane++ % 3) * 18;
      path = 'M ' + (a.cx + a.w/2) + ' ' + a.cy + ' L ' + lane + ' ' + a.cy +
             ' L ' + lane + ' ' + b.cy + ' L ' + (b.cx + b.w/2 + 2) + ' ' + b.cy;
      lx = lane + 8; ly = (a.cy + b.cy) / 2;
    } else if (sameCol && !down){
      /* back edge — route out the left into a lane */
      const lane = colX[a.c || 0] - colW[a.c || 0]/2 - 24 - (backLane++ % 3) * 20;
      path = 'M ' + (a.cx - a.w/2) + ' ' + a.cy + ' L ' + lane + ' ' + a.cy +
             ' L ' + lane + ' ' + b.cy + ' L ' + (b.cx - b.w/2 - 2) + ' ' + b.cy;
      lx = lane + 10; ly = (a.cy + b.cy) / 2;
    } else {
      const right = (b.c || 0) > (a.c || 0);
      const exitX = right ? a.cx + a.w/2 : a.cx - a.w/2;
      const lane = right
        ? Math.max(colX[a.c||0] + colW[a.c||0]/2, colX[b.c||0] - colW[b.c||0]/2) + 26 + (sideLane++ % 2) * 18
        : Math.min(colX[a.c||0] - colW[a.c||0]/2, colX[b.c||0] + colW[b.c||0]/2) - 26 - (sideLane++ % 2) * 18;
      const entryX = right ? b.cx - b.w/2 - 2 : b.cx + b.w/2 + 2;
      path = (Math.abs(a.cy - b.cy) < 1)
        ? 'M ' + exitX + ' ' + a.cy + ' L ' + entryX + ' ' + b.cy
        : 'M ' + exitX + ' ' + a.cy + ' L ' + lane + ' ' + a.cy +
          ' L ' + lane + ' ' + b.cy + ' L ' + entryX + ' ' + b.cy;
      lx = right ? exitX + 8 : exitX - 8; ly = a.cy - 9;
    }

    svg.appendChild(S('path', { d:path, fill:'none', stroke:col, 'stroke-width':sw,
      'marker-end':mkr, 'stroke-linejoin':'round' }));
    if (e.label){
      const t = S('text', { x:lx, y:ly, 'font-size':11, fill: on ? 'var(--accent)' : 'var(--fg-3)',
        'font-weight': on ? 700 : 500,
        'text-anchor': (lx < (a.cx || 0)) ? 'end' : 'start' }, e.label);
      svg.appendChild(t);
    }
  });

  /* ── boxes ── */
  nodes.forEach(n => {
    const st = FLOW_TYPE[n.type] || FLOW_TYPE.io;
    const on = n.id === activeId;
    const x = n.cx - n.w/2, y = n.cy - n.h/2;
    if (on) svg.appendChild(S('rect', { x:x-4, y:y-4, width:n.w+8, height:n.h+8, rx:14,
      fill:'none', stroke:'var(--accent)', 'stroke-width':2, opacity:.35 }));
    svg.appendChild(S('rect', { x, y, width:n.w, height:n.h, rx:10,
      fill: on ? 'var(--accent-bg)' : st.f,
      stroke: on ? 'var(--accent)' : st.s, 'stroke-width': on ? 2.4 : 1.5 }));
    let ty = y + 16 + (n.tl.length > 1 ? 2 : 3);
    n.tl.forEach(line => {
      svg.appendChild(S('text', { x:n.cx, y:ty, 'text-anchor':'middle', 'dominant-baseline':'central',
        'font-size':14, 'font-weight':650, fill: on ? 'var(--accent)' : st.t }, line));
      ty += 20;
    });
    n.sl.forEach(line => {
      svg.appendChild(S('text', { x:n.cx, y:ty + 2, 'text-anchor':'middle', 'dominant-baseline':'central',
        'font-size':12, fill: on ? 'var(--accent)' : 'var(--fg-2)', opacity:.9,
        'font-family':'ui-monospace,monospace' }, line));
      ty += 16;
    });
  });

  return wrapTitled(svg, d.title);
}

/* ═════════════════════════════  wrappers  ═════════════════════════════ */
function wrapTitled(svg, title){
  if (!title) return svg;
  const box = document.createElement('div');
  const h = document.createElement('div');
  h.textContent = title;
  h.style.cssText = 'font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;' +
                    'color:var(--fg-3);font-weight:700;margin-bottom:7px;text-align:center';
  box.appendChild(h); box.appendChild(svg);
  box.style.cssText = 'display:flex;flex-direction:column;align-items:center;min-width:0';
  return box;
}

const RENDERERS = {
  array: renderArray, cells: renderArray, list: renderList, tree: renderTree,
  graph: renderGraph, table: renderTable, calltree: renderCallTree, flow: renderFlow
};

/** Render one data view spec (or an array of them, stacked). */
function renderData(spec){
  if (!spec) return document.createTextNode('');
  if (Array.isArray(spec)){
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:20px;align-items:center;width:100%';
    spec.forEach(s => wrap.appendChild(renderData(s)));
    return wrap;
  }
  const fn = RENDERERS[spec.view];
  if (!fn){
    const p = document.createElement('div');
    p.style.cssText = 'color:var(--fg-3);font-size:13px';
    p.textContent = 'unknown view: ' + spec.view;
    return p;
  }
  return fn(spec);
}

/**
 * Paint the stage.
 * @param host  container element
 * @param frame current frame  {data, flow, at}
 * @param mode  'data' | 'flow' | 'both'
 * @param flowDef static flowchart definition for this algorithm
 */
function paintStage(host, frame, mode, flowDef){
  host.innerHTML = '';
  if (!frame){ host.textContent = ''; return; }
  const wantFlow = (mode === 'flow' || mode === 'both') && flowDef && flowDef.nodes && flowDef.nodes.length;
  const wantData = mode === 'data' || mode === 'both' || !wantFlow;

  if (mode === 'both' && wantFlow){
    const split = document.createElement('div');
    split.className = 'split';
    const a = document.createElement('div');
    a.style.cssText = 'display:flex;justify-content:center;overflow:auto';
    a.appendChild(renderData(frame.data));
    const b = document.createElement('div');
    b.style.cssText = 'display:flex;justify-content:center;overflow:auto';
    b.appendChild(renderFlow(Object.assign({ title:'Control flow' }, flowDef), frame.at));
    split.appendChild(a); split.appendChild(b);
    host.appendChild(split);
    return;
  }
  if (wantFlow && mode === 'flow'){
    host.appendChild(renderFlow(Object.assign({}, flowDef), frame.at));
    return;
  }
  if (wantData) host.appendChild(renderData(frame.data));
}
