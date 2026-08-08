/* ══════════════════════════════════════════════════════════════════════
   APP SHELL — routing, catalog, input bar, wiring
   ══════════════════════════════════════════════════════════════════════ */
const App = {
  algo: null, lang: 'python', mode: 'data', player: null, inputs: {},

  /* ─────────────── theme ─────────────── */
  initTheme(){
    const saved = localStorage.getItem('dsaviz-theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
    $('#themeBtn').addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme');
      const sysDark = matchMedia('(prefers-color-scheme: dark)').matches;
      const next = cur ? (cur === 'dark' ? 'light' : 'dark') : (sysDark ? 'light' : 'dark');
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('dsaviz-theme', next);
    });
  },

  /* ─────────────── tabs ─────────────── */
  initTabs(){
    $$('.tab').forEach(t => t.addEventListener('click', () => this.show(t.dataset.view)));
  },
  show(view){
    $$('.tab').forEach(t => t.classList.toggle('is-active', t.dataset.view === view));
    $$('.view').forEach(v => v.classList.toggle('is-active', v.id === 'view-' + view));
    if (this.player) this.player.pause();
    if (MyCode.player) MyCode.player.pause();
  },

  /* ─────────────── catalog ─────────────── */
  buildCatalog(filter){
    const q = (filter || '').toLowerCase().trim();
    const groups = {};
    DSA.order.forEach(id => {
      const a = DSA.get(id);
      if (q && !(a.name + ' ' + a.group + ' ' + a.blurb).toLowerCase().includes(q)) return;
      (groups[a.group] = groups[a.group] || []).push(a);
    });
    const host = $('#catalogList');
    const names = Object.keys(groups);
    host.innerHTML = names.length
      ? names.map(g => '<div class="cat-group">' + esc(g) + '</div>' +
          groups[g].map(a => '<button class="cat-item' + (a.id === (this.algo && this.algo.id) ? ' is-active' : '') +
            '" data-id="' + a.id + '">' + esc(a.name) + '</button>').join('')).join('')
      : '<div class="cat-group">no match</div>';
    $$('.cat-item', host).forEach(b => b.addEventListener('click', () => this.select(b.dataset.id)));
  },

  /* ─────────────── algorithm selection ─────────────── */
  select(id){
    const a = DSA.get(id);
    if (!a) return;
    this.algo = a;
    localStorage.setItem('dsaviz-last', id);
    this.buildCatalog($('#catalogSearch').value);

    $('#algoName').textContent = a.name;
    $('#algoBlurb').textContent = a.blurb;
    const cx = a.complexity || {};
    $('#algoCx').innerHTML =
      (cx.time  ? '<span class="chip t">time <b>' + esc(cx.time) + '</b></span>' : '') +
      (cx.best && cx.best !== cx.time ? '<span class="chip">best <b>' + esc(cx.best) + '</b></span>' : '') +
      (cx.space ? '<span class="chip s">space <b>' + esc(cx.space) + '</b></span>' : '') +
      (cx.note  ? '<span class="chip">' + esc(cx.note) + '</span>' : '');
    $('#explainBox').innerHTML = a.explain || '';

    /* input controls */
    this.inputs = {};
    const bar = $('#inputBar');
    bar.innerHTML = (a.inputs || []).map(inp => {
      const v = inp.def;
      if (inp.type === 'select')
        return '<div class="field"><label>' + esc(inp.label) + '</label><select data-key="' + inp.key + '">' +
          inp.options.map(o => '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>').join('') +
          '</select></div>';
      return '<div class="field"><label>' + esc(inp.label) + '</label>' +
        '<input data-key="' + inp.key + '" value="' + esc(v) + '" spellcheck="false"></div>';
    }).join('') +
      '<button class="go-btn" id="runBtn">Run ▸</button>' +
      '<button class="ghost-btn" id="shuffleBtn">Shuffle</button>';

    $('#runBtn').addEventListener('click', () => this.run());
    $('#shuffleBtn').addEventListener('click', () => this.shuffle());
    $$('#inputBar input').forEach(el => el.addEventListener('keydown', e => {
      if (e.key === 'Enter') this.run();
    }));
    $$('#inputBar select').forEach(el => el.addEventListener('change', () => this.run()));

    /* flow tab availability */
    const hasFlow = a.flow && a.flow.nodes && a.flow.nodes.length;
    $$('#stageTabs .stage-tab').forEach(b => {
      const needsFlow = b.dataset.mode !== 'data';
      b.disabled = needsFlow && !hasFlow;
      b.style.opacity = b.disabled ? .4 : '';
    });
    if (!hasFlow && this.mode !== 'data') this.setMode('data');

    this.run();
  },

  readInputs(){
    const o = {};
    $$('#inputBar [data-key]').forEach(el => o[el.dataset.key] = el.value);
    return o;
  },

  shuffle(){
    const a = this.algo;
    (a.inputs || []).forEach(inp => {
      const el = $('#inputBar [data-key="' + inp.key + '"]');
      if (!el || inp.type === 'select') return;
      const cur = el.value;
      if (/^[\d\s,.-]+$/.test(cur)){
        const parts = parseNums(cur, []);
        if (parts.length > 2){
          const lo = Math.min(...parts), hi = Math.max(...parts);
          const fresh = parts.map(() => Math.floor(lo + Math.random() * (hi - lo + 1)));
          el.value = (inp.label || '').toLowerCase().includes('sorted')
            ? fresh.sort((x, y) => x - y).join(', ') : fresh.join(', ');
        }
      } else if (/^[A-Za-z]+$/.test(cur)){
        const pool = 'abcabcbbxyz';
        el.value = Array.from({ length:cur.length }, () => pool[Math.floor(Math.random() * pool.length)]).join('');
      }
    });
    this.run();
  },

  run(){
    const a = this.algo;
    if (!a) return;
    let frames;
    try {
      frames = collect(a.run(this.readInputs()));
    } catch (err){
      console.error(err);
      toast('That input broke the algorithm: ' + err.message, 4000);
      return;
    }
    if (!frames.length) return toast('No steps produced — check the input.');
    this.player.load(frames);
  },

  /* ─────────────── stage mode ─────────────── */
  setMode(m){
    this.mode = m;
    $$('#stageTabs .stage-tab').forEach(b => b.classList.toggle('is-active', b.dataset.mode === m));
    localStorage.setItem('dsaviz-mode', m);
    if (this.player) this.player.go(this.player.i);
  },

  /* ─────────────── per-frame paint ─────────────── */
  paint(f){
    if (!f) return;
    const a = this.algo;
    paintStage($('#stage'), f, this.mode, a.flow);
    $('#note').innerHTML = f.note ? esc(f.note).replace(/`([^`]+)`/g, '<code>$1</code>') : '';

    const code = (a.code || {})[this.lang];
    if (code){
      if (!a._parsed) a._parsed = {};
      if (!a._parsed[this.lang]) a._parsed[this.lang] = parseCode(code);
      renderCode($('#codeBox'), a._parsed[this.lang], new Set(f.tag ? [f.tag] : []), this.lang);
    } else $('#codeBox').textContent = '';

    const stats = f.stats || {}, vars = f.vars || {};
    const sk = Object.keys(stats), vk = Object.keys(vars);
    $('#varsBox').innerHTML =
      (sk.length ? '<div class="stat-grid">' + sk.map(k =>
        '<div class="stat"><span class="stat-v">' + esc(String(stats[k])) + '</span>' +
        '<span class="stat-k">' + esc(k) + '</span></div>').join('') + '</div>' : '') +
      (vk.length ? vk.map(k =>
        '<div class="var-row"><span class="var-k">' + esc(k) + '</span>' +
        '<span class="var-v">' + esc(String(vars[k])) + '</span></div>').join('')
        : '<div class="muted">—</div>');
  },

  /* ─────────────── roadmap ─────────────── */
  renderRoadmap(){
    const host = $('#roadmapBody');
    host.innerHTML = buildRoadmap();

    /* ticking a topic only repaints the counters, so the page does not jump */
    $$('[data-check]', host).forEach(cb => cb.addEventListener('change', () => {
      Progress.set(cb.dataset.check, cb.checked);
      const card = cb.closest('.tcard');
      if (card) card.classList.toggle('is-done', cb.checked);
      this.refreshRoadmapCounts();
    }));

    /* a problem may appear under several topics — keep every copy in sync */
    $$('[data-lc]', host).forEach(cb => cb.addEventListener('change', () => {
      const num = cb.dataset.lc;
      Progress.setSolved(num, cb.checked);
      $$('[data-lc="' + num + '"]', host).forEach(other => {
        other.checked = cb.checked;
        const li = other.closest('.lc-item');
        if (li) li.classList.toggle('is-solved', cb.checked);
      });
      this.refreshRoadmapCounts();
    }));

    $$('.viz-chip', host).forEach(b => b.addEventListener('click', () => {
      this.show('visualize');
      this.select(b.dataset.open);
      window.scrollTo(0, 0);
    }));

    const reset = $('#rmReset', host);
    if (reset) reset.addEventListener('click', () => {
      if (!Progress.count().done) return toast('Nothing to reset yet.');
      Progress.reset();
      this.renderRoadmap();
      toast('Progress cleared');
    });
  },

  refreshRoadmapCounts(){
    const host = $('#roadmapBody');
    const { done, total } = Progress.count();
    const pct = total ? Math.round(100 * done / total) : 0;
    const ring = $('.ring', host);
    if (ring){
      ring.style.setProperty('--pct', pct);
      $('span', ring).innerHTML = pct + '<small>%</small>';
    }
    const txt = $('.rm-progress-txt b', host);
    if (txt) txt.textContent = done + ' of ' + total;
    const sv = Progress.solvedTotal();
    const svEl = $('#rmSolved b', host);
    if (svEl) svEl.textContent = sv.done + ' of ' + sv.total;

    $$('[data-lc-topic]', host).forEach(el => {
      const c = Progress.topicSolved(el.dataset.lcTopic);
      const n = $('.lc-count', el);
      if (n) n.innerHTML = '<b>' + c.done + '</b>/' + c.total;
    });

    ROADMAP.forEach(p => {
      const sec = document.getElementById(p.id);
      if (!sec) return;
      const c = Progress.phaseCount(p);
      sec.classList.toggle('is-complete', c.done === c.total);
      const bar = $('.phase-bar span', sec);
      if (bar) bar.style.width = Math.round(100 * c.done / c.total) + '%';
      const pp = $('.phase-prog', sec);
      if (pp) pp.innerHTML = '<b>' + c.done + '</b>/' + c.total;
    });
  },

  /* ─────────────── keyboard ─────────────── */
  initKeys(){
    document.addEventListener('keydown', e => {
      if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
      const p = $('#view-visualize').classList.contains('is-active') ? this.player
              : $('#view-mycode').classList.contains('is-active') ? MyCode.player : null;
      if (!p) return;
      const k = e.key;
      if (k === ' '){ e.preventDefault(); p.toggle(); }
      else if (k === 'ArrowRight'){ e.preventDefault(); p.pause(); p.go(p.i + 1); }
      else if (k === 'ArrowLeft'){ e.preventDefault(); p.pause(); p.go(p.i - 1); }
      else if (k === 'Home'){ e.preventDefault(); p.pause(); p.go(0); }
      else if (k === 'End'){ e.preventDefault(); p.pause(); p.go(p.frames.length - 1); }
      else if (k === 'f' || k === 'F'){
        if (p === this.player) this.setMode(this.mode === 'data' ? 'flow' : this.mode === 'flow' ? 'both' : 'data');
      }
    });
  },

  /* ─────────────── boot ─────────────── */
  start(){
    this.initTheme();
    this.initTabs();

    this.player = new Player({
      play:$('#btnPlay'), prev:$('#btnPrev'), next:$('#btnNext'),
      first:$('#btnFirst'), last:$('#btnLast'), scrub:$('#scrub'),
      count:$('#frameCount'), speed:$('#speed')
    }, f => this.paint(f));

    $('#catalogSearch').addEventListener('input', e => this.buildCatalog(e.target.value));

    $$('#langSwitch .lang').forEach(b => b.addEventListener('click', () => {
      $$('#langSwitch .lang').forEach(x => x.classList.remove('is-active'));
      b.classList.add('is-active');
      this.lang = b.dataset.lang;
      localStorage.setItem('dsaviz-lang', this.lang);
      this.player.go(this.player.i);
    }));
    const savedLang = localStorage.getItem('dsaviz-lang');
    if (savedLang === 'java'){
      this.lang = 'java';
      $$('#langSwitch .lang').forEach(x => x.classList.toggle('is-active', x.dataset.lang === 'java'));
    }

    $$('#stageTabs .stage-tab').forEach(b =>
      b.addEventListener('click', () => { if (!b.disabled) this.setMode(b.dataset.mode); }));
    const savedMode = localStorage.getItem('dsaviz-mode');
    if (savedMode) this.mode = savedMode;
    $$('#stageTabs .stage-tab').forEach(b => b.classList.toggle('is-active', b.dataset.mode === this.mode));

    $('#referenceBody').innerHTML = buildReference();
    $$('#referenceBody .try').forEach(b => b.addEventListener('click', () => {
      this.show('visualize');
      this.select(b.dataset.open);
      window.scrollTo(0, 0);
    }));

    this.renderRoadmap();

    MyCode.init();
    this.initKeys();

    this.buildCatalog('');
    const last = localStorage.getItem('dsaviz-last');
    this.select(DSA.get(last) ? last : DSA.order[0]);
  }
};

document.addEventListener('DOMContentLoaded', () => App.start());
