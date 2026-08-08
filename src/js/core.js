/* ══════════════════════════════════════════════════════════════════════
   DSAViz — core: registry, code rendering, frame player
   ══════════════════════════════════════════════════════════════════════ */
const DSA = {
  algos: {},
  order: [],
  register(def){
    if (DSA.algos[def.id]) console.warn('duplicate algo id', def.id);
    DSA.algos[def.id] = def;
    DSA.order.push(def.id);
  },
  get(id){ return DSA.algos[id]; }
};

/* ─────────────────────────────  DOM helpers  ───────────────────────────── */
const $  = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function toast(msg, ms){
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), ms || 2200);
}

/* ─────────────────────────────  input parsing  ───────────────────────────── */
function parseNums(s, fallback){
  const out = String(s).split(/[\s,]+/).filter(Boolean).map(Number).filter(n => !Number.isNaN(n));
  return out.length ? out : (fallback || []);
}
function clampArr(a, max){ return a.length > max ? a.slice(0, max) : a; }

/* ══════════════════════════════════════════════════════════════════════
   CODE PANEL
   A source line may end with " §tag" — the tag is stripped from display
   and used to highlight that line when the current frame carries it.
   Multiple tags: " §tag1,tag2"
   ══════════════════════════════════════════════════════════════════════ */
function parseCode(src){
  return String(src).replace(/^\n/, '').replace(/\s+$/, '').split('\n').map(raw => {
    const m = raw.match(/\s+§([\w,.-]+)\s*$/);
    return {
      text: m ? raw.slice(0, m.index) : raw,
      tags: m ? m[1].split(',') : []
    };
  });
}

const KW = {
  python: 'def return if elif else for while in range len not and or None True False break continue class self import from as with try except raise yield lambda global nonlocal pass is del assert',
  java:   'public private protected static void int long double float boolean char String return if else for while new class this null true false break continue import package final abstract extends implements try catch throw throws interface enum instanceof do switch case default'
};
const KWSET = {
  python: new Set(KW.python.split(' ')),
  java:   new Set(KW.java.split(' '))
};

function highlight(text, lang){
  const set = KWSET[lang] || KWSET.python;
  const re = /(#[^\n]*|\/\/[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b\d+\.?\d*\b)|([A-Za-z_]\w*)/g;
  let out = '', last = 0, m;
  while ((m = re.exec(text)) !== null){
    out += esc(text.slice(last, m.index));
    if (m[1])      out += '<span class="tok-com">' + esc(m[1]) + '</span>';
    else if (m[2]) out += '<span class="tok-str">' + esc(m[2]) + '</span>';
    else if (m[3]) out += '<span class="tok-num">' + esc(m[3]) + '</span>';
    else {
      const w = m[4];
      if (set.has(w))                              out += '<span class="tok-kw">' + esc(w) + '</span>';
      else if (text[re.lastIndex] === '(')         out += '<span class="tok-fn">' + esc(w) + '</span>';
      else                                          out += esc(w);
    }
    last = re.lastIndex;
  }
  return out + esc(text.slice(last));
}

/** Render parsed code. `hot` = Set of active tags, or a 1-based line number. */
function renderCode(el, lines, hot, lang){
  const isNum = typeof hot === 'number';
  const tags = hot instanceof Set ? hot : new Set(hot ? (Array.isArray(hot) ? hot : [hot]) : []);
  el.innerHTML = lines.map((l, i) => {
    const on = isNum ? (i + 1 === hot) : l.tags.some(t => tags.has(t));
    return '<span class="cl' + (on ? ' hot' : '') + '">' +
           '<span class="ln">' + (i + 1) + '</span>' + highlight(l.text, lang) + '</span>';
  }).join('');
  const hotEl = el.querySelector('.cl.hot');
  if (hotEl){
    const top = hotEl.offsetTop - el.clientHeight / 2 + hotEl.offsetHeight / 2;
    el.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }
}

/* ══════════════════════════════════════════════════════════════════════
   PLAYER — collects frames from a generator, then scrubs through them
   ══════════════════════════════════════════════════════════════════════ */
const MAX_FRAMES = 6000;

class Player {
  constructor(ui, onFrame){
    this.ui = ui;              // {play,prev,next,first,last,scrub,count,speed}
    this.onFrame = onFrame;
    this.frames = [];
    this.i = 0;
    this.timer = null;
    this.playing = false;
    this.bind();
  }
  bind(){
    const u = this.ui;
    u.play .addEventListener('click', () => this.toggle());
    u.prev .addEventListener('click', () => { this.pause(); this.go(this.i - 1); });
    u.next .addEventListener('click', () => { this.pause(); this.go(this.i + 1); });
    u.first.addEventListener('click', () => { this.pause(); this.go(0); });
    u.last .addEventListener('click', () => { this.pause(); this.go(this.frames.length - 1); });
    u.scrub.addEventListener('input', e => { this.pause(); this.go(+e.target.value); });
    u.speed.addEventListener('input', () => { if (this.playing){ this.pause(); this.play(); } });
  }
  load(frames){
    this.pause();
    this.frames = frames;
    this.ui.scrub.max = Math.max(0, frames.length - 1);
    this.go(0);
  }
  delay(){
    const v = +this.ui.speed.value;                 // 1..12
    return Math.round(1100 * Math.pow(0.72, v - 1)); // 1100ms → ~24ms
  }
  go(i){
    if (!this.frames.length) return;
    this.i = Math.max(0, Math.min(this.frames.length - 1, i));
    this.ui.scrub.value = this.i;
    this.ui.count.textContent = (this.i + 1) + ' / ' + this.frames.length;
    this.ui.prev.disabled = this.ui.first.disabled = this.i === 0;
    this.ui.next.disabled = this.ui.last.disabled  = this.i === this.frames.length - 1;
    this.onFrame(this.frames[this.i], this.i, this.frames);
  }
  toggle(){ this.playing ? this.pause() : this.play(); }
  play(){
    if (!this.frames.length) return;
    if (this.i >= this.frames.length - 1) this.go(0);
    this.playing = true;
    this.ui.play.textContent = '❚❚';
    const tick = () => {
      if (!this.playing) return;
      if (this.i >= this.frames.length - 1){ this.pause(); return; }
      this.go(this.i + 1);
      this.timer = setTimeout(tick, this.delay());
    };
    this.timer = setTimeout(tick, this.delay());
  }
  pause(){
    this.playing = false;
    this.ui.play.textContent = '▶';
    clearTimeout(this.timer);
  }
}

/** Drain a generator into a frame array, with a hard cap. */
function collect(gen){
  const frames = [];
  let n = 0;
  for (const f of gen){
    frames.push(f);
    if (++n >= MAX_FRAMES){
      frames.push({ ...frames[frames.length - 1], note: '⚠ Frame limit reached — try a smaller input.' });
      break;
    }
  }
  return frames;
}

/** Deep-ish clone so frames don't share mutable state with the algorithm. */
const snap = v => (v == null ? v : JSON.parse(JSON.stringify(v)));
