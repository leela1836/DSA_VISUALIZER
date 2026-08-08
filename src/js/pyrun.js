/* ══════════════════════════════════════════════════════════════════════
   pyrun — a Python subset interpreter in JavaScript.

   Purpose-built for DSA code so the My Code tab can run what you type,
   with no toolchain and no download. It records one frame per executed
   statement, producing exactly the same trace document that dsaviz.py
   emits — so the whole replay UI works unchanged.

   Deliberately a subset. When code hits an edge, we say so and point at
   the tracer, which runs real CPython.
   ══════════════════════════════════════════════════════════════════════ */

class PyErr extends Error {
  constructor(msg, line){ super(msg); this.line = line; this.py = true; }
}
class BreakSig    { }
class ContinueSig { }
class ReturnSig   { constructor(v){ this.v = v; } }
class HaltSig     { constructor(why){ this.why = why; } }

/* ─────────────────────────── runtime values ─────────────────────────── */
class PyTuple { constructor(items){ this.items = items; } }
class PySlice { constructor(a, b, c){ this.start = a; this.stop = b; this.step = c; } }
class PyFunc {
  constructor(name, params, defaults, body, closure, isMethod){
    this.name = name; this.params = params; this.defaults = defaults;
    this.body = body; this.closure = closure; this.isMethod = isMethod;
  }
}
class PyClass {
  constructor(name, methods, base){ this.name = name; this.methods = methods; this.base = base; }
  find(n){ let c = this; while (c){ if (c.methods[n]) return c.methods[n]; c = c.base; } return null; }
}
class PyObj {
  constructor(cls){ this.cls = cls; this.attrs = new Map(); }
}
class PyDeque { constructor(items){ this.items = items || []; } }
class PyNative { constructor(name, fn){ this.name = name; this.fn = fn; } }

/* Both dict and set are Map-backed so non-string keys work and insertion order
   is kept. A set carries __isSet and stores key -> value; a dict stores
   key -> [originalKey, value]. */
const isList  = v => Array.isArray(v);
const isDict  = v => v instanceof Map && v.__isSet !== true && v.__isModule !== true;
const isSet   = v => v instanceof Map && v.__isSet === true;
const isStr   = v => typeof v === 'string';
const isNum   = v => typeof v === 'number';

/* ══════════════════════════════════════════════════════════════════════
   TOKENIZER
   ══════════════════════════════════════════════════════════════════════ */
const PY_KW = new Set(['def','return','if','elif','else','for','while','in','not','and','or',
  'None','True','False','break','continue','class','pass','import','from','as','lambda',
  'global','nonlocal','is','del','yield','with','try','except','finally','raise','assert','elif']);

const OPS = ['**=','//=','>>=','<<=','**','//','<<','>>','<=','>=','==','!=','+=','-=','*=',
  '/=','%=','&=','|=','^=','->',':=','(',')','[',']','{','}',',',':','.',';','@','=','+','-',
  '*','/','%','&','|','^','~','<','>'];

function tokenize(src){
  const toks = [];
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const indents = [0];
  let depth = 0, cont = false;

  for (let ln = 0; ln < lines.length; ln++){
    let line = lines[ln];
    const lineNo = ln + 1;
    let i = 0;

    if (depth === 0 && !cont){
      // measure indentation
      let ind = 0;
      while (i < line.length && (line[i] === ' ' || line[i] === '\t')){
        ind += line[i] === '\t' ? 8 - (ind % 8) : 1; i++;
      }
      const rest = line.slice(i).trim();
      if (rest === '' || rest[0] === '#') continue;      // blank / comment-only
      if (ind > indents[indents.length - 1]){
        indents.push(ind); toks.push({ t:'INDENT', line:lineNo });
      } else while (ind < indents[indents.length - 1]){
        indents.pop(); toks.push({ t:'DEDENT', line:lineNo });
        if (ind > indents[indents.length - 1])
          throw new PyErr('inconsistent indentation', lineNo);
      }
    }
    cont = false;

    while (i < line.length){
      const c = line[i];
      if (c === ' ' || c === '\t'){ i++; continue; }
      if (c === '#') break;
      if (c === '\\' && i === line.length - 1){ cont = true; i++; break; }

      // strings (with optional prefix)
      const pm = /^([fFrRbBuU]{0,2})('''|"""|'|")/.exec(line.slice(i));
      if (pm){
        const prefix = pm[1].toLowerCase(), q = pm[2];
        let j = i + pm[0].length, buf = '';
        const triple = q.length === 3;
        let closed = false;
        while (true){
          if (j >= line.length){
            if (!triple) throw new PyErr('unterminated string', lineNo);
            buf += '\n'; ln++;
            if (ln >= lines.length) throw new PyErr('unterminated string', lineNo);
            line = lines[ln]; j = 0; continue;
          }
          if (line.startsWith(q, j)){ j += q.length; closed = true; break; }
          if (line[j] === '\\' && !prefix.includes('r')){
            const e = line[j+1];
            buf += e === 'n' ? '\n' : e === 't' ? '\t' : e === '\\' ? '\\'
                 : e === "'" ? "'" : e === '"' ? '"' : e === '0' ? '\0' : '\\' + e;
            j += 2; continue;
          }
          buf += line[j++];
        }
        if (!closed) throw new PyErr('unterminated string', lineNo);
        toks.push(prefix.includes('f')
          ? { t:'FSTR', v:splitFString(buf, lineNo), line:lineNo }
          : { t:'STR', v:buf, line:lineNo });
        i = j; continue;
      }

      // numbers
      const nm = /^(0[xX][0-9a-fA-F_]+|0[bB][01_]+|(\d[\d_]*)?\.\d[\d_]*([eE][+-]?\d+)?|\d[\d_]*\.?([eE][+-]?\d+)?)/.exec(line.slice(i));
      if (nm && /\d/.test(nm[0])){
        const raw = nm[0].replace(/_/g, '');
        toks.push({ t:'NUM', v: /^0[xX]/.test(raw) ? parseInt(raw, 16)
                            : /^0[bB]/.test(raw) ? parseInt(raw.slice(2), 2)
                            : parseFloat(raw), line:lineNo });
        i += nm[0].length; continue;
      }

      // names / keywords
      const im = /^[A-Za-z_]\w*/.exec(line.slice(i));
      if (im){
        toks.push({ t: PY_KW.has(im[0]) ? 'KW' : 'NAME', v:im[0], line:lineNo });
        i += im[0].length; continue;
      }

      // operators
      let matched = null;
      for (const op of OPS) if (line.startsWith(op, i)){ matched = op; break; }
      if (!matched) throw new PyErr('unexpected character "' + c + '"', lineNo);
      if ('([{'.includes(matched)) depth++;
      if (')]}'.includes(matched)) depth = Math.max(0, depth - 1);
      toks.push({ t:'OP', v:matched, line:lineNo });
      i += matched.length;
    }

    if (depth === 0 && !cont && toks.length && toks[toks.length - 1].t !== 'NEWLINE')
      toks.push({ t:'NEWLINE', line:lineNo });
  }
  while (indents.length > 1){ indents.pop(); toks.push({ t:'DEDENT', line:lines.length }); }
  toks.push({ t:'EOF', line:lines.length });
  return toks;
}

/** Split an f-string body into literal and expression chunks. */
function splitFString(s, line){
  const parts = [];
  let buf = '', i = 0;
  while (i < s.length){
    if (s[i] === '{' && s[i+1] === '{'){ buf += '{'; i += 2; continue; }
    if (s[i] === '}' && s[i+1] === '}'){ buf += '}'; i += 2; continue; }
    if (s[i] === '{'){
      if (buf){ parts.push({ lit:buf }); buf = ''; }
      let d = 1, j = i + 1, expr = '', q = null;
      while (j < s.length && d > 0){
        const c = s[j];
        if (q){ if (c === q) q = null; expr += c; j++; continue; }
        if (c === '"' || c === "'"){ q = c; expr += c; j++; continue; }
        if (c === '{') d++;
        if (c === '}'){ d--; if (!d) break; }
        expr += c; j++;
      }
      // drop a trailing format spec / conversion
      const cut = expr.search(/![rsa]$|:(?![^[\]]*\])[^}]*$/);
      parts.push({ expr: (cut > 0 ? expr.slice(0, cut) : expr).trim(), line });
      i = j + 1; continue;
    }
    buf += s[i++];
  }
  if (buf) parts.push({ lit:buf });
  return parts;
}

/* ══════════════════════════════════════════════════════════════════════
   PARSER
   ══════════════════════════════════════════════════════════════════════ */
function parsePy(src){
  const toks = tokenize(src);
  let p = 0;

  const peek = (k) => toks[p + (k || 0)];
  const at = (t, v) => peek().t === t && (v === undefined || peek().v === v);
  const atOp = v => at('OP', v);
  const atKw = v => at('KW', v);
  const next = () => toks[p++];
  const err = (m) => { throw new PyErr(m, peek().line); };
  const expect = (t, v) => {
    if (!at(t, v)) err('expected ' + (v || t) + ' but found ' +
      (peek().v !== undefined ? '"' + peek().v + '"' : peek().t.toLowerCase()));
    return next();
  };
  const eatOp = v => { if (atOp(v)){ next(); return true; } return false; };
  const skipNL = () => { while (at('NEWLINE')) next(); };

  /* ── blocks ── */
  function block(){
    expect('OP', ':');
    if (at('NEWLINE')){
      next(); skipNL();
      expect('INDENT');
      const body = [];
      while (!at('DEDENT') && !at('EOF')){ const s = statement(); if (s) body.push(s); skipNL(); }
      if (at('DEDENT')) next();
      return body;
    }
    // single-line suite:  if x: return 1
    const body = [simpleStatement()];
    while (eatOp(';')) if (!at('NEWLINE')) body.push(simpleStatement());
    if (at('NEWLINE')) next();
    return body;
  }

  function statement(){
    skipNL();
    if (at('EOF') || at('DEDENT')) return null;
    const line = peek().line;

    if (atOp('@')){                              // decorators
      const decs = [];
      while (atOp('@')){ next(); decs.push(expression()); if (at('NEWLINE')) next(); skipNL(); }
      const fn = statement();
      if (!fn || fn.type !== 'FunctionDef') err('a decorator must be followed by a function');
      fn.decorators = decs;
      return fn;
    }
    if (atKw('def')){
      next();
      const name = expect('NAME').v;
      expect('OP', '(');
      const params = [], defaults = [];
      while (!atOp(')')){
        if (eatOp('*') || eatOp('**')){ if (at('NAME')) next(); if (!eatOp(',')) break; continue; }
        const pn = expect('NAME').v;
        if (eatOp(':')) ternary();                         // annotation, ignored
        params.push(pn);
        defaults.push(eatOp('=') ? ternary() : undefined);
        if (!eatOp(',')) break;
      }
      expect('OP', ')');
      if (eatOp('->')) ternary();                          // return annotation
      return { type:'FunctionDef', name, params, defaults, body:block(), line, decorators:[] };
    }
    if (atKw('class')){
      next();
      const name = expect('NAME').v;
      let base = null;
      if (eatOp('(')){ if (!atOp(')')) base = expression(); expect('OP', ')'); }
      return { type:'ClassDef', name, base, body:block(), line };
    }
    if (atKw('if')){
      next();
      const test = expression(), body = block();
      let orelse = [];
      skipNL();
      if (atKw('elif')){ const sub = statement2Elif(); orelse = [sub]; }
      else if (atKw('else')){ next(); orelse = block(); }
      return { type:'If', test, body, orelse, line };
    }
    if (atKw('while')){
      next();
      const test = expression(), body = block();
      let orelse = [];
      skipNL();
      if (atKw('else')){ next(); orelse = block(); }
      return { type:'While', test, body, orelse, line };
    }
    if (atKw('for')){
      next();
      const target = targetList();
      expect('KW', 'in');
      const iter = expression(), body = block();
      let orelse = [];
      skipNL();
      if (atKw('else')){ next(); orelse = block(); }
      return { type:'For', target, iter, body, orelse, line };
    }
    if (atKw('try')){
      next();
      const body = block();
      const handlers = [];
      skipNL();
      while (atKw('except')){
        next();
        if (!atOp(':')) { ternary(); if (atKw('as')){ next(); next(); } }
        handlers.push({ body:block() });
        skipNL();
      }
      let final = [];
      if (atKw('finally')){ next(); final = block(); }
      return { type:'Try', body, handlers, final, line };
    }
    if (atKw('with')){
      next();
      expression();
      if (atKw('as')){ next(); targetList(); }
      return { type:'Block', body:block(), line };
    }
    const s = simpleStatement();
    const more = [];
    while (eatOp(';')) if (!at('NEWLINE') && !at('EOF')) more.push(simpleStatement());
    if (at('NEWLINE')) next();
    return more.length ? { type:'Block', body:[s].concat(more), line } : s;
  }

  function statement2Elif(){
    const line = peek().line;
    expect('KW', 'elif');
    const test = expression(), body = block();
    let orelse = [];
    skipNL();
    if (atKw('elif')) orelse = [statement2Elif()];
    else if (atKw('else')){ next(); orelse = block(); }
    return { type:'If', test, body, orelse, line };
  }

  function simpleStatement(){
    const line = peek().line;
    if (atKw('return')){
      next();
      const v = (at('NEWLINE') || at('EOF') || atOp(';')) ? null : expression();
      return { type:'Return', value:v, line };
    }
    if (atKw('pass'))     { next(); return { type:'Pass', line }; }
    if (atKw('break'))    { next(); return { type:'Break', line }; }
    if (atKw('continue')) { next(); return { type:'Continue', line }; }
    if (atKw('global') || atKw('nonlocal')){
      next(); const names = [expect('NAME').v];
      while (eatOp(',')) names.push(expect('NAME').v);
      return { type:'Global', names, line };
    }
    if (atKw('del')){ next(); const t = expression(); return { type:'Del', target:t, line }; }
    if (atKw('assert')){ next(); expression(); if (eatOp(',')) expression(); return { type:'Pass', line }; }
    if (atKw('raise')){
      next();
      const e = (at('NEWLINE') || at('EOF')) ? null : expression();
      return { type:'Raise', exc:e, line };
    }
    if (atKw('import')){
      next();
      const mods = [];
      do {
        let m = expect('NAME').v;
        while (eatOp('.')) m += '.' + expect('NAME').v;
        let alias = null;
        if (atKw('as')){ next(); alias = expect('NAME').v; }
        mods.push({ mod:m, alias });
      } while (eatOp(','));
      return { type:'Import', mods, line };
    }
    if (atKw('from')){
      next();
      let m = expect('NAME').v;
      while (eatOp('.')) m += '.' + expect('NAME').v;
      expect('KW', 'import');
      const names = [];
      if (eatOp('*')) names.push({ name:'*', alias:null });
      else do {
        const n = expect('NAME').v;
        let alias = null;
        if (atKw('as')){ next(); alias = expect('NAME').v; }
        names.push({ name:n, alias });
      } while (eatOp(','));
      return { type:'ImportFrom', mod:m, names, line };
    }

    const first = expression();
    const AUG = ['+=','-=','*=','/=','//=','%=','**=','&=','|=','^=','<<=','>>='];
    for (const op of AUG) if (atOp(op)){
      next();
      return { type:'AugAssign', target:first, op:op.slice(0, -1), value:expression(), line };
    }
    if (atOp('=')){
      const targets = [first];
      while (eatOp('=')) targets.push(expression());
      const value = targets.pop();
      return { type:'Assign', targets, value, line };
    }
    if (atOp(':')){                              // annotated assignment
      next(); ternary();
      if (eatOp('=')) return { type:'Assign', targets:[first], value:expression(), line };
      return { type:'Pass', line };
    }
    return { type:'ExprStmt', value:first, line };
  }

  /* Assignment / loop targets are PRIMARIES only. Parsing them with the full
     expression grammar makes `for i in xs` swallow `in` as a comparison. */
  function targetAtom(){
    if (atOp('(') || atOp('[')){
      const line = peek().line;
      const close = next().v === '(' ? ')' : ']';
      const items = [];
      while (!atOp(close)){ items.push(targetAtom()); if (!eatOp(',')) break; }
      expect('OP', close);
      return { type:'Tuple', items, line };
    }
    return trailer(atom());
  }
  function targetList(){
    const first = targetAtom();
    if (!atOp(',')) return first;
    const items = [first];
    while (eatOp(',')){
      if (atKw('in') || atOp('=') || atOp(':') || at('NEWLINE') || at('EOF')) break;
      items.push(targetAtom());
    }
    return { type:'Tuple', items, line:first.line };
  }

  /* ── expressions ── */
  function expression(){
    const first = ternary();
    if (!atOp(',')) return first;
    const items = [first];
    while (eatOp(',')){
      if (at('NEWLINE') || atOp(')') || atOp(']') || atOp('}') || atOp('=') || at('EOF')) break;
      items.push(ternary());
    }
    return { type:'Tuple', items, line:first.line };
  }

  function ternary(){
    if (atKw('lambda')){
      const line = peek().line;
      next();
      const params = [], defaults = [];
      while (!atOp(':')){
        params.push(expect('NAME').v);
        defaults.push(eatOp('=') ? ternary() : undefined);
        if (!eatOp(',')) break;
      }
      expect('OP', ':');
      return { type:'Lambda', params, defaults, body:ternary(), line };
    }
    const v = orExpr();
    if (atKw('if')){
      next();
      const test = orExpr();
      expect('KW', 'else');
      return { type:'IfExp', test, body:v, orelse:ternary(), line:v.line };
    }
    return v;
  }

  function orExpr(){
    let l = andExpr();
    while (atKw('or')){ next(); l = { type:'BoolOp', op:'or', l, r:andExpr(), line:l.line }; }
    return l;
  }
  function andExpr(){
    let l = notExpr();
    while (atKw('and')){ next(); l = { type:'BoolOp', op:'and', l, r:notExpr(), line:l.line }; }
    return l;
  }
  function notExpr(){
    if (atKw('not')){ const line = peek().line; next();
      return { type:'Unary', op:'not', v:notExpr(), line }; }
    return comparison();
  }
  function comparison(){
    const first = bitOr();
    const ops = [], rights = [];
    while (true){
      let op = null;
      if (atOp('<') || atOp('>') || atOp('<=') || atOp('>=') || atOp('==') || atOp('!=')) op = next().v;
      else if (atKw('in')){ next(); op = 'in'; }
      else if (atKw('not') && peek(1).t === 'KW' && peek(1).v === 'in'){ next(); next(); op = 'not in'; }
      else if (atKw('is')){ next(); if (atKw('not')){ next(); op = 'is not'; } else op = 'is'; }
      else break;
      ops.push(op); rights.push(bitOr());
    }
    return ops.length ? { type:'Compare', first, ops, rights, line:first.line } : first;
  }
  const binLevel = (sub, opsList) => function(){
    let l = sub();
    while (opsList.some(o => atOp(o))){
      const op = next().v;
      l = { type:'BinOp', op, l, r:sub(), line:l.line };
    }
    return l;
  };
  const shift  = binLevel(() => arith(),  ['<<','>>']);
  const bitAnd = binLevel(() => shift(),  ['&']);
  const bitXor = binLevel(() => bitAnd(), ['^']);
  const bitOr  = binLevel(() => bitXor(), ['|']);
  function arith(){
    let l = term();
    while (atOp('+') || atOp('-')){ const op = next().v; l = { type:'BinOp', op, l, r:term(), line:l.line }; }
    return l;
  }
  function term(){
    let l = unary();
    while (atOp('*') || atOp('/') || atOp('//') || atOp('%')){
      const op = next().v; l = { type:'BinOp', op, l, r:unary(), line:l.line };
    }
    return l;
  }
  function unary(){
    if (atOp('-') || atOp('+') || atOp('~')){
      const line = peek().line, op = next().v;
      return { type:'Unary', op, v:unary(), line };
    }
    return power();
  }
  function power(){
    const b = trailer(atom());
    if (atOp('**')){ next(); return { type:'BinOp', op:'**', l:b, r:unary(), line:b.line }; }
    return b;
  }

  function trailer(node){
    while (true){
      if (atOp('(')){
        next();
        const args = [], kwargs = [];
        while (!atOp(')')){
          if (eatOp('*') || eatOp('**')){ ternary(); if (!eatOp(',')) break; continue; }
          if (at('NAME') && peek(1).t === 'OP' && peek(1).v === '=' ){
            const k = next().v; next();
            kwargs.push({ k, v:ternary() });
          } else {
            const e = ternary();
            if (atKw('for')) args.push(comprehension(e, 'gen'));
            else args.push(e);
          }
          if (!eatOp(',')) break;
        }
        expect('OP', ')');
        node = { type:'Call', fn:node, args, kwargs, line:node.line };
      } else if (atOp('[')){
        next();
        node = { type:'Subscript', obj:node, index:subscriptIndex(), line:node.line };
        expect('OP', ']');
      } else if (atOp('.')){
        next();
        node = { type:'Attribute', obj:node, name:expect('NAME').v, line:node.line };
      } else return node;
    }
  }

  function subscriptIndex(){
    const part = () => (atOp(':') || atOp(']')) ? null : ternary();
    const a = part();
    if (!atOp(':')) return a;
    next();
    const b = part();
    let c = null;
    if (eatOp(':')) c = part();
    return { type:'Slice', start:a, stop:b, step:c, line:peek().line };
  }

  function comprehension(elt, kind, valueElt){
    const gens = [];
    while (atKw('for')){
      next();
      const target = targetList();
      expect('KW', 'in');
      const iter = orExpr();
      const ifs = [];
      while (atKw('if')){ next(); ifs.push(orExpr()); }
      gens.push({ target, iter, ifs });
    }
    return { type:'Comp', kind, elt, valueElt, gens, line:elt.line };
  }

  function atom(){
    const tk = peek(), line = tk.line;
    if (at('NUM'))  { next(); return { type:'Num', v:tk.v, line }; }
    if (at('STR')){
      next();
      let s = tk.v;
      while (at('STR')) s += next().v;                    // implicit concatenation
      return { type:'Str', v:s, line };
    }
    if (at('FSTR')) { next(); return { type:'FStr', parts:tk.v.map(pt =>
      pt.lit !== undefined ? pt : { node: parseSubExpr(pt.expr, pt.line) }), line }; }
    if (at('NAME')) { next(); return { type:'Name', id:tk.v, line }; }
    if (atKw('None'))  { next(); return { type:'Const', v:null, line }; }
    if (atKw('True'))  { next(); return { type:'Const', v:true, line }; }
    if (atKw('False')) { next(); return { type:'Const', v:false, line }; }
    if (atKw('not') || atKw('lambda')) return ternary();

    if (atOp('(')){
      next();
      if (atOp(')')){ next(); return { type:'TupleLit', items:[], line }; }
      const e = ternary();
      if (atKw('for')){ const c = comprehension(e, 'gen'); expect('OP', ')'); return c; }
      if (atOp(',')){
        const items = [e];
        while (eatOp(',')){ if (atOp(')')) break; items.push(ternary()); }
        expect('OP', ')');
        return { type:'TupleLit', items, line };
      }
      expect('OP', ')');
      return e;
    }
    if (atOp('[')){
      next();
      if (atOp(']')){ next(); return { type:'ListLit', items:[], line }; }
      const e = ternary();
      if (atKw('for')){ const c = comprehension(e, 'list'); expect('OP', ']'); return c; }
      const items = [e];
      while (eatOp(',')){ if (atOp(']')) break; items.push(ternary()); }
      expect('OP', ']');
      return { type:'ListLit', items, line };
    }
    if (atOp('{')){
      next();
      if (atOp('}')){ next(); return { type:'DictLit', keys:[], values:[], line }; }
      const k = ternary();
      if (atOp(':')){
        next();
        const v = ternary();
        if (atKw('for')){ const c = comprehension(k, 'dict', v); expect('OP', '}'); return c; }
        const keys = [k], values = [v];
        while (eatOp(',')){
          if (atOp('}')) break;
          keys.push(ternary()); expect('OP', ':'); values.push(ternary());
        }
        expect('OP', '}');
        return { type:'DictLit', keys, values, line };
      }
      if (atKw('for')){ const c = comprehension(k, 'set'); expect('OP', '}'); return c; }
      const items = [k];
      while (eatOp(',')){ if (atOp('}')) break; items.push(ternary()); }
      expect('OP', '}');
      return { type:'SetLit', items, line };
    }
    err('unexpected ' + (tk.v !== undefined ? '"' + tk.v + '"' : tk.t.toLowerCase()));
  }

  /* module */
  const body = [];
  skipNL();
  while (!at('EOF')){ const s = statement(); if (s) body.push(s); skipNL(); }
  return { type:'Module', body };
}

function parseSubExpr(src, line){
  try {
    const m = parsePy(src);
    if (m.body.length && m.body[0].type === 'ExprStmt') return m.body[0].value;
  } catch (e){ }
  return { type:'Str', v:'{' + src + '}', line };
}

/* ══════════════════════════════════════════════════════════════════════
   VALUE HELPERS
   ══════════════════════════════════════════════════════════════════════ */
function pyTruth(v){
  if (v === null || v === undefined || v === false) return false;
  if (v === true) return true;
  if (isNum(v)) return v !== 0;
  if (isStr(v)) return v.length > 0;
  if (isList(v)) return v.length > 0;
  if (v instanceof PyTuple) return v.items.length > 0;
  if (isDict(v) || isSet(v)) return v.size > 0;
  if (v instanceof PyDeque) return v.items.length > 0;
  return true;
}
function pyKey(v){
  if (v instanceof PyTuple) return 'T(' + v.items.map(pyKey).join(',') + ')';
  if (isStr(v)) return 's' + v;
  if (isNum(v)) return 'n' + v;
  if (v === null) return 'None';
  if (v === true || v === false) return 'b' + v;
  return v;
}
function pyEq(a, b){
  if (a === b) return true;
  if (isNum(a) && isNum(b)) return a === b;
  if (isList(a) && isList(b))
    return a.length === b.length && a.every((x, i) => pyEq(x, b[i]));
  if (a instanceof PyTuple && b instanceof PyTuple)
    return a.items.length === b.items.length && a.items.every((x, i) => pyEq(x, b.items[i]));
  if (isSet(a) && isSet(b)){
    if (a.size !== b.size) return false;
    for (const k of a.keys()) if (!b.has(k)) return false;
    return true;
  }
  if (isDict(a) && isDict(b)){
    if (a.size !== b.size) return false;
    for (const [k, e] of a){
      if (!b.has(k)) return false;
      if (!pyEq(e[1], b.get(k)[1])) return false;
    }
    return true;
  }
  if (a instanceof PyDeque && b instanceof PyDeque)
    return a.items.length === b.items.length && a.items.every((x, i) => pyEq(x, b.items[i]));
  return false;
}
function pyCmp(a, b, line){
  if (isNum(a) && isNum(b)) return a < b ? -1 : a > b ? 1 : 0;
  if (isStr(a) && isStr(b)) return a < b ? -1 : a > b ? 1 : 0;
  if (typeof a === 'boolean' || typeof b === 'boolean') return (a ? 1 : 0) - (b ? 1 : 0);
  const al = isList(a) ? a : a instanceof PyTuple ? a.items : null;
  const bl = isList(b) ? b : b instanceof PyTuple ? b.items : null;
  if (al && bl){
    for (let i = 0; i < Math.min(al.length, bl.length); i++){
      const c = pyCmp(al[i], bl[i], line);
      if (c !== 0) return c;
    }
    return al.length - bl.length;
  }
  throw new PyErr('cannot compare ' + pyType(a) + ' with ' + pyType(b), line);
}
function pyType(v){
  if (v === null) return 'NoneType';
  if (typeof v === 'boolean') return 'bool';
  if (isNum(v)) return Number.isInteger(v) ? 'int' : 'float';
  if (isStr(v)) return 'str';
  if (isList(v)) return 'list';
  if (v instanceof PyTuple) return 'tuple';
  if (isDict(v)) return 'dict';
  if (isSet(v)) return 'set';
  if (v instanceof PyDeque) return 'deque';
  if (v instanceof PyFunc || v instanceof PyNative) return 'function';
  if (v instanceof PyClass) return 'class';
  if (v instanceof PyObj) return v.cls.name;
  return typeof v;
}
function pyRepr(v, seen){
  seen = seen || new Set();
  if (v === null || v === undefined) return 'None';
  if (v === true) return 'True';
  if (v === false) return 'False';
  if (isNum(v)) return Number.isInteger(v) ? String(v)
    : (Math.abs(v) === Infinity ? (v > 0 ? 'inf' : '-inf') : String(v));
  if (isStr(v)) return "'" + v.replace(/'/g, "\\'") + "'";
  if (seen.has(v)) return '[...]';
  seen.add(v);
  let r;
  if (isList(v)) r = '[' + v.map(x => pyRepr(x, seen)).join(', ') + ']';
  else if (v instanceof PyTuple) r = '(' + v.items.map(x => pyRepr(x, seen)).join(', ') +
    (v.items.length === 1 ? ',' : '') + ')';
  else if (isDict(v)) r = '{' + [...v.entries()].map(([, kv]) =>
    pyRepr(kv[0], seen) + ': ' + pyRepr(kv[1], seen)).join(', ') + '}';
  else if (isSet(v)) r = v.size ? '{' + [...v.values()].map(x => pyRepr(x, seen)).join(', ') + '}' : 'set()';
  else if (v instanceof PyDeque) r = 'deque([' + v.items.map(x => pyRepr(x, seen)).join(', ') + '])';
  else if (v instanceof PyFunc) r = '<function ' + v.name + '>';
  else if (v instanceof PyNative) r = '<built-in ' + v.name + '>';
  else if (v instanceof PyClass) r = "<class '" + v.name + "'>";
  else if (v instanceof PyObj) r = '<' + v.cls.name + ' object>';
  else r = String(v);
  seen.delete(v);
  return r;
}
function pyStr(v){
  if (isStr(v)) return v;
  return pyRepr(v);
}

/* dict/set are stored as Map(key -> [origKey, value]) and Map-backed Set */
function dictGet(d, k){ const e = d.get(pyKey(k)); return e ? e[1] : undefined; }
function dictSet(d, k, v){ d.set(pyKey(k), [k, v]); }
function dictHas(d, k){ return d.has(pyKey(k)); }
function dictDel(d, k){ return d.delete(pyKey(k)); }
function dictKeys(d){ return [...d.values()].map(e => e[0]); }
function dictVals(d){ return [...d.values()].map(e => e[1]); }
function setAdd(s, v){ s.set ? s.set(pyKey(v), v) : s.add(v); }

function iterate(v, line){
  if (isList(v)) return v.slice();
  if (isStr(v)) return Array.from(v);
  if (v instanceof PyTuple) return v.items.slice();
  if (isDict(v)) return dictKeys(v);
  if (isSet(v)) return [...v.values()];
  if (v instanceof PyDeque) return v.items.slice();
  if (v === null || v === undefined) throw new PyErr("'NoneType' object is not iterable", line);
  throw new PyErr("'" + pyType(v) + "' object is not iterable", line);
}
function pyLen(v, line){
  if (isList(v)) return v.length;
  if (isStr(v)) return v.length;
  if (v instanceof PyTuple) return v.items.length;
  if (isDict(v) || isSet(v)) return v.size;
  if (v instanceof PyDeque) return v.items.length;
  throw new PyErr("object of type '" + pyType(v) + "' has no len()", line);
}
function normIdx(i, n, line, allowEnd){
  let k = i < 0 ? n + i : i;
  if (k < 0 || (allowEnd ? k > n : k >= n))
    throw new PyErr('index ' + i + ' is out of range for length ' + n, line);
  return k;
}
