/* ══════════════════════════════════════════════════════════════════════
   MY CODE — replay a trace.json produced by dsaviz.py / DsaViz.java
   ══════════════════════════════════════════════════════════════════════ */

/** Render an encoded value as a short display primitive. */
function disp(v){
  if (v == null) return 'None';
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return '[' + v.map(disp).join(',') + ']';
  if (v.__t === 'obj')    return String(v.v);
  if (v.__t === 'set')    return '{' + v.v.map(disp).join(',') + '}';
  if (v.__t === 'dict')   return '{' + v.v.map(p => disp(p[0]) + ':' + disp(p[1])).join(', ') + '}';
  if (v.__t === 'linked') return v.v.map(disp).join(' → ') + (v.cycle != null ? ' ↺' : '');
  if (v.__t === 'tree')   return '<tree>';
  return String(v);
}

/* isNum / isList / isStr come from pyrun.js, which is concatenated before this file */
const isFlatArr = v => Array.isArray(v) && v.every(x => x == null || typeof x !== 'object' || (x && x.__t === 'obj'));
const is2D = v => Array.isArray(v) && v.length > 0 && v.every(r => isFlatArr(r)) &&
                  v.some(r => Array.isArray(r) && r.length > 0);

/** Turn one frame's locals into drawable view specs. */
function mcViews(vars){
  const specs = [], arrays = [], ints = {};
  const keys = Object.keys(vars || {});

  keys.forEach(k => { if (isNum(vars[k]) && Number.isInteger(vars[k])) ints[k] = vars[k]; });

  keys.forEach(k => {
    const v = vars[k];
    if (v == null) return;
    if (is2D(v)){
      specs.push({ view:'table', cells:v.map(r => r.map(x => disp(x))),
        colLabels:v[0].map((_, c) => String(c)), rowLabels:v.map((_, r) => String(r)),
        corner:k, title:k, marks:{} });
    } else if (isFlatArr(v) && v.length){
      arrays.push([k, v.map(disp)]);
    } else if (typeof v === 'string' && v.length > 1 && v.length <= 40){
      arrays.push([k, Array.from(v)]);
    } else if (v && v.__t === 'linked'){
      specs.push({ view:'list', title:k, nodes:v.v.map(x => ({ val:disp(x) })),
        cycle: v.cycle != null ? { to:v.cycle } : null, marks:{}, emptyLabel:k + ' = None' });
    } else if (v && v.__t === 'tree'){
      const nodes = {};
      Object.keys(v.nodes || {}).forEach(id => {
        const nd = v.nodes[id];
        nodes[id] = { v:disp(nd.v), l:nd.l, r:nd.r };
      });
      specs.push({ view:'tree', title:k, nodes, root:v.root, marks:{} });
    } else if (v && v.__t === 'set' && v.v.length){
      arrays.push([k, v.v.map(disp)]);
    } else if (v && v.__t === 'dict' && v.v.length){
      arrays.push([k, v.v.map(p => disp(p[0]) + ':' + disp(p[1]))]);
    }
  });

  arrays.slice(0, 4).forEach(([k, vals]) => {
    const ptrs = {};
    let n = 0;
    Object.keys(ints).forEach(s => {
      if (n >= 4) return;
      const x = ints[s];
      if (s !== k && x >= 0 && x < vals.length){ ptrs[s] = x; n++; }
    });
    const allNum = vals.every(x => typeof x === 'number');
    specs.push({ view:'array', values:vals, marks:{}, pointers:ptrs,
      mode: allNum && vals.length <= 40 ? 'bars' : 'cells', title:k });
  });

  return specs.length ? specs : [{ view:'array', values:[], marks:{}, title:'no drawable structures in scope' }];
}

/** Build a flowchart from observed line transitions (used when the trace has none). */
function flowFromFrames(doc){
  const frames = doc.frames || [];
  const src = (doc.source || '').split('\n');
  const withLines = frames.filter(f => f.line > 0);
  if (withLines.length < 2) return null;

  const order = [], seen = {}, edges = {}, lineToNode = {};
  withLines.forEach(f => { if (!seen[f.line]){ seen[f.line] = 1; order.push(f.line); } });
  if (order.length > 40) return null;
  order.sort((a, b) => a - b);

  const nodes = order.map((ln, i) => {
    const text = (src[ln - 1] || '').trim().slice(0, 58) || 'line ' + ln;
    const type = /^(if|elif|while|for|switch|case)\b|^\}?\s*(else\s+)?if\s*\(|^\s*(while|for)\s*\(/.test(text) ? 'dec'
               : /^return\b|^\s*return\b/.test(text) ? 'ok'
               : /^break\b/.test(text) ? 'bad' : 'act';
    const id = 'L' + ln;
    lineToNode[String(ln)] = id;
    return { id, title:text, sub:'line ' + ln, type, r:i, c:0 };
  });

  for (let i = 1; i < withLines.length; i++){
    const a = withLines[i-1].line, b = withLines[i].line;
    if (a === b) continue;
    edges['L' + a + '>' + 'L' + b] = { from:'L' + a, to:'L' + b };
  }
  return { flow:{ nodes, edges:Object.values(edges) }, lineToNode };
}

/* ─────────────────────────── controller ─────────────────────────── */
const MyCode = {
  doc: null, player: null, mode: 'data', codeLines: null,

  init(){
    this.player = new Player({
      play:$('#mcPlay'), prev:$('#mcPrev'), next:$('#mcNext'),
      first:$('#mcFirst'), last:$('#mcLast'), scrub:$('#mcScrub'),
      count:$('#mcCount'), speed:$('#mcSpeed')
    }, (f, i, all) => this.paint(f, i, all));

    $$('#mcStageTabs .stage-tab').forEach(b => b.addEventListener('click', () => {
      $$('#mcStageTabs .stage-tab').forEach(x => x.classList.remove('is-active'));
      b.classList.add('is-active');
      this.mode = b.dataset.mode;
      this.player.go(this.player.i);
    }));

    this.initEditor();

    const drop = $('#drop'), input = $('#fileInput');
    $('#pickBtn').addEventListener('click', () => input.click());
    input.addEventListener('change', e => { if (e.target.files[0]) this.readFile(e.target.files[0]); });
    ['dragenter','dragover'].forEach(ev => drop.addEventListener(ev, e => {
      e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave','drop'].forEach(ev => drop.addEventListener(ev, e => {
      e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', e => {
      const f = e.dataTransfer.files[0];
      if (f) this.readFile(f);
    });
    $('#mcClear').addEventListener('click', () => {
      $('#mycodeStageWrap').hidden = true;
      $('#drop').scrollIntoView({ behavior:'smooth', block:'center' });
    });
  },

  /* ─────────────── in-browser Python editor ─────────────── */
  initEditor(){
    const ta = $('#pyCode'), gutter = $('#pyGutter'), sel = $('#pyExample');

    $$('#srcTabs .src-tab').forEach(b => b.addEventListener('click', () => {
      $$('#srcTabs .src-tab').forEach(x => x.classList.remove('is-active'));
      b.classList.add('is-active');
      $$('.src-pane').forEach(p => p.classList.toggle('is-active', p.id === 'pane-' + b.dataset.src));
    }));

    sel.innerHTML = PY_EXAMPLES.map((e, i) => '<option value="' + i + '">' + esc(e.name) + '</option>').join('');
    sel.addEventListener('change', () => {
      ta.value = PY_EXAMPLES[+sel.value].src;
      this.syncGutter();
      this.runEditor();
    });

    $('#subsetBody').innerHTML = PY_SUBSET_DOC;

    const saved = localStorage.getItem('dsaviz-pycode');
    ta.value = saved || PY_EXAMPLES[0].src;
    this.syncGutter();

    ta.addEventListener('input', () => {
      this.syncGutter();
      try { localStorage.setItem('dsaviz-pycode', ta.value); } catch (e){}
    });
    ta.addEventListener('scroll', () => { gutter.scrollTop = ta.scrollTop; });
    ta.addEventListener('keydown', e => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)){ e.preventDefault(); this.runEditor(); return; }
      if (e.key === 'Tab'){                       // indent instead of leaving the field
        e.preventDefault();
        const s = ta.selectionStart, t = ta.selectionEnd;
        if (s === t){
          ta.value = ta.value.slice(0, s) + '    ' + ta.value.slice(t);
          ta.selectionStart = ta.selectionEnd = s + 4;
        } else {
          const before = ta.value.slice(0, s), sel2 = ta.value.slice(s, t), after = ta.value.slice(t);
          const shifted = e.shiftKey
            ? sel2.replace(/^ {1,4}/gm, '')
            : sel2.replace(/^/gm, '    ');
          ta.value = before + shifted + after;
          ta.selectionStart = s; ta.selectionEnd = s + shifted.length;
        }
        this.syncGutter();
      }
    });

    $('#pyRun').addEventListener('click', () => this.runEditor());
    $('#pyHint').textContent = (navigator.platform || '').indexOf('Mac') >= 0
      ? '⌘+Enter to run' : 'Ctrl+Enter to run';
  },

  syncGutter(errLine){
    const ta = $('#pyCode');
    const n = ta.value.split('\n').length;
    let html = '';
    for (let i = 1; i <= n; i++) html += '<span' + (i === errLine ? ' class="err"' : '') + '>' + i + '</span>';
    $('#pyGutter').innerHTML = html;
    $('#pyGutter').scrollTop = ta.scrollTop;
  },

  runEditor(){
    const src = $('#pyCode').value;
    const errBox = $('#pyError');
    errBox.hidden = true;
    errBox.className = 'py-error';

    let doc;
    const t0 = performance.now();
    try { doc = runPython(src, 'your code'); }
    catch (err){
      console.error(err);
      errBox.hidden = false;
      errBox.innerHTML = '<b>The interpreter crashed</b>' + esc(err.message) +
        ' — please report this, it is a bug in DSAViz rather than in your code.';
      return;
    }
    const ms = Math.round(performance.now() - t0);

    this.syncGutter(doc.errorLine);

    if (doc.error){
      errBox.hidden = false;
      errBox.innerHTML = '<b>' + (doc.phase === 'parse' ? 'Could not parse your code' : 'Error while running') +
        '</b>' + esc(doc.error);
      if (!doc.frames.length) return;              // nothing to show
      errBox.innerHTML += '<br><span class="muted">Showing the ' + doc.frames.length +
        ' step(s) that ran before the error.</span>';
    } else if (doc.truncated){
      errBox.hidden = false;
      errBox.className = 'py-error py-warn';
      errBox.innerHTML = '<b>Stopped early</b>' + esc(doc.haltReason || 'frame limit reached');
    }

    if (!doc.frames.length){
      errBox.hidden = false;
      errBox.innerHTML = '<b>Nothing executed</b>Define a function and then <i>call</i> it — ' +
        'a file that only contains <code>def</code> statements never runs any code.';
      return;
    }

    doc.name = 'your code';
    doc.file = doc.flowFn ? doc.flowFn + '()' : '';
    this.load(doc, ms);
  },

  readFile(file){
    const r = new FileReader();
    r.onload = () => {
      try { this.load(JSON.parse(r.result)); }
      catch (err){ toast('Could not read that file: ' + err.message, 4000); }
    };
    r.onerror = () => toast('Could not read that file.');
    r.readAsText(file);
  },

  load(doc, ms){
    if (!doc || doc.dsaviz !== 1 || !Array.isArray(doc.frames))
      return toast('That is not a DSAViz trace file.', 3500);
    if (!doc.frames.length)
      return toast('That trace contains no frames.', 3500);

    /* fall back to a dynamic flowchart when the tracer did not supply one */
    if (!doc.flow || !doc.flow.nodes || !doc.flow.nodes.length){
      const gen = flowFromFrames(doc);
      if (gen){ doc.flow = gen.flow; doc.lineToNode = gen.lineToNode; doc.flowGenerated = true; }
    }

    this.doc = doc;
    this.codeLines = parseCode(doc.source || '');
    $('#mcName').textContent = (doc.name || 'trace') + (doc.file ? '  ·  ' + doc.file : '');
    $('#mcSrcName').textContent = doc.file || 'Source';
    $('#mcBlurb').innerHTML =
      doc.frames.length + ' steps · ' + (doc.lang === 'java' ? 'Java' : 'Python') +
      (doc.engine === 'pyrun' ? ' · ran in your browser' + (ms != null ? ' in ' + ms + ' ms' : '') : '') +
      (doc.truncated ? ' · <b style="color:var(--warn)">stopped early</b>' : '') +
      (doc.error ? ' · <b style="color:var(--bad)">' + esc(doc.error) + '</b>' : '') +
      (doc.flowGenerated ? ' · flowchart inferred from executed lines'
                         : (doc.flow ? ' · flowchart from your code’s structure' : ''));
    $('#mycodeStageWrap').hidden = false;

    const hasOut = doc.stdout && doc.stdout.length;
    $('#mcOutHead').hidden = !hasOut;
    $('#mcOut').hidden = !hasOut;

    this.player.load(doc.frames);
    if (doc.engine !== 'pyrun')
      $('#mycodeStageWrap').scrollIntoView({ behavior:'smooth', block:'start' });
    toast(doc.engine === 'pyrun'
      ? 'Ran ' + doc.frames.length + ' steps'
      : 'Loaded ' + doc.frames.length + ' frames');
  },

  paint(f, i, all){
    if (!f) return;
    const doc = this.doc;

    /* show the chart for the function we are actually standing in */
    let flow = doc.flow, map = doc.lineToNode || {};
    if (doc.flows && doc.flows[f.func]){
      flow = doc.flows[f.func].flow;
      map = doc.flows[f.func].lineToNode;
    }
    const at = map[String(f.line)];
    paintStage($('#mcStage'), { data:mcViews(f.vars), at }, this.mode, flow);

    const noteBits = [];
    if (f.note) noteBits.push('<b>' + esc(f.note) + '</b>');
    noteBits.push('<code>' + esc(f.func || '') + '</code> line <b>' + f.line + '</b>');
    if (f.event === 'return') noteBits.push('returns <code>' + esc(disp(f.ret)) + '</code>');
    if (f.depth > 1) noteBits.push('depth ' + f.depth);
    $('#mcNote').innerHTML = noteBits.join(' &nbsp;·&nbsp; ');

    if (this.codeLines && this.codeLines.length)
      renderCode($('#mcCode'), this.codeLines, f.line, doc.lang === 'java' ? 'java' : 'python');

    /* variables, with changes highlighted */
    const prev = i > 0 ? (all[i-1].vars || {}) : {};
    const vars = f.vars || {};
    const keys = Object.keys(vars);
    $('#mcVars').innerHTML = keys.length
      ? keys.map(k => {
          const now = JSON.stringify(vars[k]);
          const changed = i > 0 && JSON.stringify(prev[k]) !== now;
          return '<div class="var-row' + (changed ? ' changed' : '') + '">' +
                 '<span class="var-k">' + esc(k) + '</span>' +
                 '<span class="var-v">' + esc(String(disp(vars[k])).slice(0, 160)) + '</span></div>';
        }).join('')
      : '<div class="muted">no locals in scope</div>';

    const st = f.stack || [];
    $('#mcStack').innerHTML = st.length
      ? st.map((fn, k) => '<div class="frame-row' + (k === 0 ? ' top' : '') + '">' + esc(fn) + '()</div>').join('')
      : '<div class="muted">—</div>';

    /* printed output, only as far as this step */
    if (doc.stdout && doc.stdout.length){
      const upto = f.outLen != null ? f.outLen : doc.stdout.length;
      const text = doc.stdout.slice(0, upto).join('');
      $('#mcOut').textContent = text || '(nothing printed yet)';
    }
  }
};
