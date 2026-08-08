/* ══════════════════════════════════════════════════════════════════════
   pyeval — tree-walking evaluator + builtins + AST flowchart.
   Produces the same trace document shape as dsaviz.py.
   ══════════════════════════════════════════════════════════════════════ */

const PY_MAX_FRAMES = 4000;
const PY_MAX_STEPS  = 400000;
const PY_MAX_DEPTH  = 120;

class PyDefaultDict extends Map { constructor(f){ super(); this.factory = f; } }

class Env {
  constructor(parent, isFunc){
    this.vars = new Map();
    this.parent = parent || null;
    this.isFunc = !!isFunc;
    this.globalNames = new Set();
  }
  lookup(n){
    let e = this;
    while (e){ if (e.vars.has(n)) return e; e = e.parent; }
    return null;
  }
  get(n, line){
    const e = this.lookup(n);
    if (e) return e.vars.get(n);
    if (PY_BUILTINS[n] !== undefined) return PY_BUILTINS[n];
    throw new PyErr("name '" + n + "' is not defined", line);
  }
  has(n){ return !!this.lookup(n) || PY_BUILTINS[n] !== undefined; }
  set(n, v){
    if (this.globalNames.has(n)){
      let g = this; while (g.parent) g = g.parent;
      g.vars.set(n, v); return;
    }
    this.vars.set(n, v);
  }
}

/* ─────────────────────────── value encoding ─────────────────────────── */
const ENC_MAX = 80, ENC_DEPTH = 4;

function attrOf(o, names){
  for (const n of names) if (o.attrs.has(n)) return o.attrs.get(n);
  return undefined;
}
function encLinked(o){
  const vals = [];
  const seen = new Map();
  let cur = o, k = 0, cycle = null;
  while (cur instanceof PyObj && k < 60){
    if (seen.has(cur)){ cycle = seen.get(cur); break; }
    seen.set(cur, k);
    vals.push(encVal(attrOf(cur, ['val','value','data','key','item']), 1));
    cur = cur.attrs.get('next');
    if (cur === null || cur === undefined) break;
    k++;
  }
  return { __t:'linked', v:vals, cycle };
}
function encTree(o){
  const nodes = {}, ids = new Map();
  (function walk(n){
    if (!(n instanceof PyObj) || ids.size > 80) return null;
    if (ids.has(n)) return ids.get(n);
    const id = 't' + ids.size;
    ids.set(n, id);
    const row = { v:encVal(attrOf(n, ['val','value','data','key']), 1), l:null, r:null };
    nodes[id] = row;
    row.l = walk(n.attrs.get('left'));
    row.r = walk(n.attrs.get('right'));
    return id;
  })(o);
  return { __t:'tree', nodes, root: ids.size ? 't0' : null };
}

function encVal(v, depth){
  depth = depth || 0;
  if (depth > ENC_DEPTH) return { __t:'obj', v:'…' };
  if (v === undefined || v === null) return null;
  if (typeof v === 'boolean') return v;
  if (isNum(v)) return isFinite(v) ? v : { __t:'obj', v: v > 0 ? 'inf' : '-inf' };
  if (isStr(v)) return v.slice(0, 200);
  if (isList(v)){
    const out = v.slice(0, ENC_MAX).map(x => encVal(x, depth + 1));
    if (v.length > ENC_MAX) out.push({ __t:'obj', v:'… +' + (v.length - ENC_MAX) });
    return out;
  }
  if (v instanceof PyTuple) return v.items.slice(0, ENC_MAX).map(x => encVal(x, depth + 1));
  if (v instanceof PyDeque) return v.items.slice(0, ENC_MAX).map(x => encVal(x, depth + 1));
  if (isDict(v)) return { __t:'dict', v: [...v.values()].slice(0, ENC_MAX)
    .map(e => [encVal(e[0], depth + 1), encVal(e[1], depth + 1)]) };
  if (isSet(v)) return { __t:'set', v: [...v.values()].slice(0, ENC_MAX).map(x => encVal(x, depth + 1)) };
  if (v instanceof PyObj){
    if (v.attrs.has('left') || v.attrs.has('right')) return encTree(v);
    if (v.attrs.has('next')) return encLinked(v);
    const o = {};
    v.attrs.forEach((val, k) => { o[k] = encVal(val, depth + 1); });
    return { __t:'dict', v: Object.keys(o).slice(0, ENC_MAX).map(k => [k, o[k]]) };
  }
  if (v instanceof PyFunc || v instanceof PyNative || v instanceof PyClass)
    return { __t:'obj', v: pyRepr(v) };
  return { __t:'obj', v: String(v).slice(0, 200) };
}

/* ══════════════════════════════════════════════════════════════════════
   INTERPRETER
   ══════════════════════════════════════════════════════════════════════ */
class Interp {
  constructor(){
    this.frames = [];
    this.stack = [];
    this.stdout = [];
    this.steps = 0;
    this.truncated = false;
  }

  record(line, env, note){
    if (this.frames.length >= PY_MAX_FRAMES){ this.truncated = true; throw new HaltSig('frames'); }
    const vars = {};
    env.vars.forEach((val, k) => {
      if (val instanceof PyFunc || val instanceof PyClass || val instanceof PyNative) return;
      vars[k] = encVal(val);
    });
    const f = {
      line, event:'line',
      func: this.stack.length ? this.stack[this.stack.length - 1] : '<module>',
      depth: Math.max(1, this.stack.length),
      vars,
      stack: this.stack.length ? this.stack.slice().reverse() : ['<module>'],
      outLen: this.stdout.length
    };
    if (note) f.note = note;
    this.frames.push(f);
  }

  /* ── statements ── */
  execBlock(body, env){
    for (const st of body) this.execStmt(st, env);
  }

  execStmt(st, env){
    if (++this.steps > PY_MAX_STEPS){ this.truncated = true; throw new HaltSig('steps'); }
    switch (st.type){
      case 'FunctionDef': {
        let fn = new PyFunc(st.name, st.params, st.defaults, st.body, env, false);
        for (const d of (st.decorators || [])){
          const dv = this.eval(d, env);
          fn = this.call(dv, [fn], [], st.line);
        }
        env.set(st.name, fn);
        return;
      }
      case 'ClassDef': {
        const methods = {};
        const cenv = new Env(env, false);
        for (const s of st.body){
          if (s.type === 'FunctionDef')
            methods[s.name] = new PyFunc(s.name, s.params, s.defaults, s.body, env, true);
          else this.execStmt(s, cenv);
        }
        const base = st.base ? this.eval(st.base, env) : null;
        env.set(st.name, new PyClass(st.name, methods, base instanceof PyClass ? base : null));
        return;
      }
      case 'Pass':  this.record(st.line, env); return;
      case 'Global':
        st.names.forEach(n => env.globalNames.add(n));
        return;
      case 'Import': case 'ImportFrom': {
        this.record(st.line, env);
        if (st.type === 'Import'){
          for (const m of st.mods){
            const mod = PY_MODULES[m.mod];
            if (!mod) throw new PyErr("this interpreter has no module '" + m.mod +
              "'. Supported: " + Object.keys(PY_MODULES).join(', ') +
              ' — for anything else use the dsaviz.py tracer, which runs real CPython.', st.line);
            env.set(m.alias || m.mod, mod);
          }
        } else {
          const mod = PY_MODULES[st.mod];
          if (!mod) throw new PyErr("this interpreter has no module '" + st.mod +
            "'. Supported: " + Object.keys(PY_MODULES).join(', ') +
            ' — for anything else use the dsaviz.py tracer, which runs real CPython.', st.line);
          for (const n of st.names){
            if (n.name === '*'){ mod.forEach((v, k) => env.set(k, v)); continue; }
            const v = mod.get(n.name);
            if (v === undefined) throw new PyErr("cannot import '" + n.name + "' from " + st.mod, st.line);
            env.set(n.alias || n.name, v);
          }
        }
        return;
      }
      case 'ExprStmt': this.record(st.line, env); this.eval(st.value, env); return;
      case 'Assign': {
        this.record(st.line, env);
        const v = this.eval(st.value, env);
        for (const t of st.targets) this.assign(t, v, env, st.line);
        return;
      }
      case 'AugAssign': {
        this.record(st.line, env);
        const cur = this.eval(st.target, env);
        const rhs = this.eval(st.value, env);
        this.assign(st.target, this.binop(st.op, cur, rhs, st.line), env, st.line);
        return;
      }
      case 'Del': {
        this.record(st.line, env);
        const t = st.target;
        if (t.type === 'Subscript'){
          const o = this.eval(t.obj, env), k = this.eval(t.index, env);
          if (isDict(o)) dictDel(o, k);
          else if (isList(o)) o.splice(normIdx(k, o.length, st.line), 1);
        } else if (t.type === 'Name'){
          const e = env.lookup(t.id); if (e) e.vars.delete(t.id);
        }
        return;
      }
      case 'Raise': {
        this.record(st.line, env);
        const e = st.exc ? this.eval(st.exc, env) : null;
        throw new PyErr(e ? pyStr(e) : 'exception raised', st.line);
      }
      case 'Return': {
        this.record(st.line, env);
        throw new ReturnSig(st.value ? this.eval(st.value, env) : null);
      }
      case 'Break':    this.record(st.line, env); throw new BreakSig();
      case 'Continue': this.record(st.line, env); throw new ContinueSig();
      case 'If': {
        this.record(st.line, env);
        if (pyTruth(this.eval(st.test, env))) this.execBlock(st.body, env);
        else if (st.orelse && st.orelse.length) this.execBlock(st.orelse, env);
        return;
      }
      case 'While': {
        let broke = false;
        while (true){
          this.record(st.line, env);
          if (++this.steps > PY_MAX_STEPS){ this.truncated = true; throw new HaltSig('steps'); }
          if (!pyTruth(this.eval(st.test, env))) break;
          try { this.execBlock(st.body, env); }
          catch (e){
            if (e instanceof BreakSig){ broke = true; break; }
            if (e instanceof ContinueSig) continue;
            throw e;
          }
        }
        if (!broke && st.orelse && st.orelse.length) this.execBlock(st.orelse, env);
        return;
      }
      case 'For': {
        this.record(st.line, env);
        const seq = iterate(this.eval(st.iter, env), st.line);
        let broke = false;
        for (const item of seq){
          if (++this.steps > PY_MAX_STEPS){ this.truncated = true; throw new HaltSig('steps'); }
          this.assign(st.target, item, env, st.line);
          this.record(st.line, env);
          try { this.execBlock(st.body, env); }
          catch (e){
            if (e instanceof BreakSig){ broke = true; break; }
            if (e instanceof ContinueSig) continue;
            throw e;
          }
        }
        if (!broke && st.orelse && st.orelse.length) this.execBlock(st.orelse, env);
        return;
      }
      case 'Try': {
        try { this.execBlock(st.body, env); }
        catch (e){
          if (e instanceof HaltSig || e instanceof ReturnSig ||
              e instanceof BreakSig || e instanceof ContinueSig) throw e;
          if (st.handlers.length) this.execBlock(st.handlers[0].body, env);
          else throw e;
        }
        finally { if (st.final && st.final.length) this.execBlock(st.final, env); }
        return;
      }
      case 'Block': this.execBlock(st.body, env); return;
      default: throw new PyErr('unsupported statement: ' + st.type, st.line);
    }
  }

  /* ── assignment targets ── */
  assign(t, v, env, line){
    switch (t.type){
      case 'Name': env.set(t.id, v); return;
      case 'Tuple': case 'TupleLit': case 'ListLit': {
        const items = t.items;
        const vals = iterate(v, line);
        if (vals.length !== items.length)
          throw new PyErr('cannot unpack ' + vals.length + ' values into ' + items.length + ' targets', line);
        items.forEach((sub, i) => this.assign(sub, vals[i], env, line));
        return;
      }
      case 'Subscript': {
        const o = this.eval(t.obj, env), k = this.eval(t.index, env);
        if (isList(o) || o instanceof PyDeque){
          const arr = isList(o) ? o : o.items;
          arr[normIdx(k, arr.length, line)] = v;
        } else if (isDict(o)) dictSet(o, k, v);
        else throw new PyErr("'" + pyType(o) + "' does not support item assignment", line);
        return;
      }
      case 'Attribute': {
        const o = this.eval(t.obj, env);
        if (!(o instanceof PyObj)) throw new PyErr('cannot set attribute on ' + pyType(o), line);
        o.attrs.set(t.name, v);
        return;
      }
      default: throw new PyErr('cannot assign to ' + t.type, line);
    }
  }

  /* ── expressions ── */
  eval(e, env){
    switch (e.type){
      case 'Num': case 'Str': return e.v;
      case 'Const': return e.v;
      case 'Name': return env.get(e.id, e.line);
      case 'FStr': return e.parts.map(pt =>
        pt.lit !== undefined ? pt.lit : pyStr(this.eval(pt.node, env))).join('');
      case 'ListLit': return e.items.map(x => this.eval(x, env));
      case 'TupleLit': case 'Tuple': return new PyTuple(e.items.map(x => this.eval(x, env)));
      case 'SetLit': {
        const s = new Map();
        e.items.forEach(x => { const v = this.eval(x, env); s.set(pyKey(v), v); });
        return this.toSet(s);
      }
      case 'DictLit': {
        const d = new Map();
        e.keys.forEach((k, i) => dictSet(d, this.eval(k, env), this.eval(e.values[i], env)));
        return d;
      }
      case 'Unary': {
        const v = this.eval(e.v, env);
        if (e.op === 'not') return !pyTruth(v);
        if (e.op === '-') return -this.num(v, e.line);
        if (e.op === '+') return +this.num(v, e.line);
        if (e.op === '~') return ~this.num(v, e.line);
        break;
      }
      case 'BoolOp': {
        const l = this.eval(e.l, env);
        if (e.op === 'and') return pyTruth(l) ? this.eval(e.r, env) : l;
        return pyTruth(l) ? l : this.eval(e.r, env);
      }
      case 'BinOp': return this.binop(e.op, this.eval(e.l, env), this.eval(e.r, env), e.line);
      case 'Compare': {
        let left = this.eval(e.first, env);
        for (let i = 0; i < e.ops.length; i++){
          const right = this.eval(e.rights[i], env);
          if (!this.compare(e.ops[i], left, right, e.line)) return false;
          left = right;
        }
        return true;
      }
      case 'IfExp': return pyTruth(this.eval(e.test, env))
        ? this.eval(e.body, env) : this.eval(e.orelse, env);
      case 'Lambda': return new PyFunc('<lambda>', e.params, e.defaults,
        [{ type:'Return', value:e.body, line:e.line }], env, false);
      case 'Comp': return this.comprehension(e, env);
      case 'Subscript': {
        const o = this.eval(e.obj, env);
        if (e.index && e.index.type === 'Slice'){
          const st = e.index;
          return this.slice(o,
            st.start ? this.eval(st.start, env) : null,
            st.stop  ? this.eval(st.stop,  env) : null,
            st.step  ? this.eval(st.step,  env) : null, e.line);
        }
        const k = this.eval(e.index, env);
        return this.index(o, k, e.line);
      }
      case 'Attribute': return this.getAttr(this.eval(e.obj, env), e.name, e.line);
      case 'Call': {
        const fnNode = e.fn;
        // bound method call:  obj.method(...)
        if (fnNode.type === 'Attribute'){
          const obj = this.eval(fnNode.obj, env);
          const args = e.args.map(a => this.eval(a, env));
          const kw = e.kwargs.map(k => ({ k:k.k, v:this.eval(k.v, env) }));
          return this.method(obj, fnNode.name, args, kw, e.line);
        }
        const fn = this.eval(fnNode, env);
        const args = e.args.map(a => this.eval(a, env));
        const kw = e.kwargs.map(k => ({ k:k.k, v:this.eval(k.v, env) }));
        return this.call(fn, args, kw, e.line);
      }
      case 'Slice': return new PySlice(
        e.start ? this.eval(e.start, env) : null,
        e.stop  ? this.eval(e.stop,  env) : null,
        e.step  ? this.eval(e.step,  env) : null);
    }
    throw new PyErr('cannot evaluate ' + e.type, e.line);
  }

  toSet(map){ const s = new Map(); map.forEach((v, k) => s.set(k, v)); s.__isSet = true; return s; }

  num(v, line){
    if (isNum(v)) return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    throw new PyErr('expected a number but got ' + pyType(v), line);
  }

  binop(op, a, b, line){
    if (op === '+'){
      if (isStr(a) && isStr(b)) return a + b;
      if (isList(a) && isList(b)) return a.concat(b);
      if (a instanceof PyTuple && b instanceof PyTuple) return new PyTuple(a.items.concat(b.items));
      if (isStr(a) !== isStr(b) && (isStr(a) || isStr(b)))
        throw new PyErr('cannot add ' + pyType(a) + ' and ' + pyType(b) +
          (isStr(a) || isStr(b) ? ' — wrap the number in str()' : ''), line);
      return this.num(a, line) + this.num(b, line);
    }
    if (op === '*'){
      if (isStr(a) && isNum(b)) return b > 0 ? a.repeat(Math.floor(b)) : '';
      if (isNum(a) && isStr(b)) return a > 0 ? b.repeat(Math.floor(a)) : '';
      if (isList(a) && isNum(b)){
        const out = [];
        for (let i = 0; i < Math.floor(b); i++) for (const x of a) out.push(x);
        return out;   // Python aliases nested lists here too — kept faithfully
      }
      if (isNum(a) && isList(b)){
        const out = [];
        for (let i = 0; i < Math.floor(a); i++) for (const x of b) out.push(x);
        return out;
      }
      return this.num(a, line) * this.num(b, line);
    }
    if (op === '-'){
      if (isSet(a) && isSet(b)){
        const s = new Map();
        a.forEach((v, k) => { if (!b.has(k)) s.set(k, v); });
        return this.toSet(s);
      }
      return this.num(a, line) - this.num(b, line);
    }
    if (op === '|' && isSet(a) && isSet(b)){
      const s = new Map(a); b.forEach((v, k) => s.set(k, v)); return this.toSet(s);
    }
    if (op === '&' && isSet(a) && isSet(b)){
      const s = new Map(); a.forEach((v, k) => { if (b.has(k)) s.set(k, v); }); return this.toSet(s);
    }
    const x = this.num(a, line), y = this.num(b, line);
    switch (op){
      case '/':  if (y === 0) throw new PyErr('division by zero', line); return x / y;
      case '//': if (y === 0) throw new PyErr('integer division by zero', line);
                 return Math.floor(x / y);
      case '%':  if (y === 0) throw new PyErr('modulo by zero', line);
                 return ((x % y) + y) % y;                    // Python sign semantics
      case '**': return Math.pow(x, y);
      case '&':  return x & y;
      case '|':  return x | y;
      case '^':  return x ^ y;
      case '<<': return x << y;
      case '>>': return x >> y;
    }
    throw new PyErr('unsupported operator ' + op, line);
  }

  compare(op, a, b, line){
    switch (op){
      case '==': return pyEq(a, b);
      case '!=': return !pyEq(a, b);
      case 'is': return a === b || (a === null && b === null);
      case 'is not': return !(a === b || (a === null && b === null));
      case 'in': case 'not in': {
        let found;
        if (isStr(b)) found = isStr(a) && b.includes(a);
        else if (isSet(b)) found = b.has(pyKey(a));
        else if (isDict(b)) found = dictHas(b, a);
        else found = iterate(b, line).some(x => pyEq(x, a));
        return op === 'in' ? found : !found;
      }
      case '<':  return pyCmp(a, b, line) < 0;
      case '<=': return pyCmp(a, b, line) <= 0;
      case '>':  return pyCmp(a, b, line) > 0;
      case '>=': return pyCmp(a, b, line) >= 0;
    }
    throw new PyErr('unsupported comparison ' + op, line);
  }

  index(o, k, line){
    if (isStr(o)) return o[normIdx(this.num(k, line), o.length, line)];
    if (isList(o)) return o[normIdx(this.num(k, line), o.length, line)];
    if (o instanceof PyTuple) return o.items[normIdx(this.num(k, line), o.items.length, line)];
    if (o instanceof PyDeque) return o.items[normIdx(this.num(k, line), o.items.length, line)];
    if (isDict(o)){
      if (dictHas(o, k)) return dictGet(o, k);
      if (o instanceof PyDefaultDict){
        const v = this.call(o.factory, [], [], line);
        dictSet(o, k, v);
        return v;
      }
      throw new PyErr('key ' + pyRepr(k) + ' is not in the dict', line);
    }
    if (o === null) throw new PyErr("'NoneType' object is not subscriptable", line);
    throw new PyErr("'" + pyType(o) + "' object is not subscriptable", line);
  }

  slice(o, a, b, c, line){
    const arr = isStr(o) ? Array.from(o) : isList(o) ? o
              : o instanceof PyTuple ? o.items : o instanceof PyDeque ? o.items : null;
    if (!arr) throw new PyErr("'" + pyType(o) + "' cannot be sliced", line);
    const n = arr.length;
    let step = c === null || c === undefined ? 1 : this.num(c, line);
    if (step === 0) throw new PyErr('slice step cannot be zero', line);
    const clamp = (v, def) => {
      if (v === null || v === undefined) return def;
      let k = this.num(v, line);
      if (k < 0) k += n;
      return Math.max(step > 0 ? 0 : -1, Math.min(k, step > 0 ? n : n - 1));
    };
    let start = clamp(a, step > 0 ? 0 : n - 1);
    let stop  = clamp(b, step > 0 ? n : -1);
    const out = [];
    if (step > 0) for (let i = start; i < stop; i += step) out.push(arr[i]);
    else          for (let i = start; i > stop; i += step) out.push(arr[i]);
    if (isStr(o)) return out.join('');
    if (o instanceof PyTuple) return new PyTuple(out);
    return out;
  }

  comprehension(e, env){
    const results = [], pairs = [];
    const inner = new Env(env, false);
    const rec = (gi) => {
      if (gi >= e.gens.length){
        if (e.kind === 'dict') pairs.push([this.eval(e.elt, inner), this.eval(e.valueElt, inner)]);
        else results.push(this.eval(e.elt, inner));
        return;
      }
      const g = e.gens[gi];
      for (const item of iterate(this.eval(g.iter, inner), e.line)){
        if (++this.steps > PY_MAX_STEPS){ this.truncated = true; throw new HaltSig('steps'); }
        this.assign(g.target, item, inner, e.line);
        if (g.ifs.every(c => pyTruth(this.eval(c, inner)))) rec(gi + 1);
      }
    };
    rec(0);
    if (e.kind === 'dict'){ const d = new Map(); pairs.forEach(([k, v]) => dictSet(d, k, v)); return d; }
    if (e.kind === 'set'){ const s = new Map(); results.forEach(v => s.set(pyKey(v), v)); return this.toSet(s); }
    return results;
  }

  getAttr(o, name, line){
    if (o instanceof PyObj){
      if (o.attrs.has(name)) return o.attrs.get(name);
      const m = o.cls.find(name);
      if (m) return { __bound:true, self:o, fn:m };
      throw new PyErr("'" + o.cls.name + "' object has no attribute '" + name + "'", line);
    }
    if (o instanceof Map && o.__isModule){
      const v = o.get(name);
      if (v === undefined) throw new PyErr('module has no attribute ' + name, line);
      return v;
    }
    if (o instanceof PyClass){
      const m = o.find(name);
      if (m) return m;
    }
    return { __method:true, obj:o, name };
  }

  call(fn, args, kw, line){
    if (fn && fn.__bound) return this.invoke(fn.fn, [fn.self].concat(args), kw, line);
    if (fn instanceof PyNative) return fn.fn(args, kw, line, this);
    if (fn instanceof PyFunc) return this.invoke(fn, args, kw, line);
    if (fn instanceof PyClass){
      const obj = new PyObj(fn);
      const init = fn.find('__init__');
      if (init) this.invoke(init, [obj].concat(args), kw, line);
      return obj;
    }
    if (fn && fn.__method) return this.method(fn.obj, fn.name, args, kw, line);
    throw new PyErr("'" + pyType(fn) + "' object is not callable", line);
  }

  invoke(fn, args, kw, line){
    if (this.stack.length > PY_MAX_DEPTH)
      throw new PyErr('maximum recursion depth exceeded (' + PY_MAX_DEPTH +
        ') — check your base case', line);
    const env = new Env(fn.closure, true);
    fn.params.forEach((p, i) => {
      if (i < args.length) env.vars.set(p, args[i]);
      else {
        const k = (kw || []).find(x => x.k === p);
        if (k) env.vars.set(p, k.v);
        else if (fn.defaults[i] !== undefined) env.vars.set(p, this.eval(fn.defaults[i], fn.closure));
        else throw new PyErr(fn.name + '() is missing argument "' + p + '"', line);
      }
    });
    (kw || []).forEach(x => { if (!fn.params.includes(x.k)) env.vars.set(x.k, x.v); });

    this.stack.push(fn.name);
    try {
      this.execBlock(fn.body, env);
      return null;
    } catch (e){
      if (e instanceof ReturnSig) return e.v;
      throw e;
    } finally { this.stack.pop(); }
  }

  /* ── methods on built-in types ── */
  method(o, name, args, kw, line){
    const A = args;
    const kwGet = k => { const f = (kw || []).find(x => x.k === k); return f ? f.v : undefined; };

    if (o instanceof PyObj || (o && o.__bound)){
      const bound = this.getAttr(o, name, line);
      return this.call(bound, args, kw, line);
    }
    if (o instanceof PyClass){
      const m = o.find(name);
      if (m) return this.invoke(m, args, kw, line);
    }
    if (o instanceof Map && o.__isModule){
      const f = o.get(name);
      if (f === undefined) throw new PyErr('module has no function ' + name, line);
      return this.call(f, args, kw, line);
    }

    if (isStr(o)) switch (name){
      case 'upper': return o.toUpperCase();
      case 'lower': return o.toLowerCase();
      case 'strip': return A.length ? o.replace(new RegExp('^[' + A[0] + ']+|[' + A[0] + ']+$', 'g'), '') : o.trim();
      case 'lstrip': return o.replace(/^\s+/, '');
      case 'rstrip': return o.replace(/\s+$/, '');
      case 'split': return A.length ? o.split(A[0]) : o.trim().split(/\s+/).filter(x => x);
      case 'join': return iterate(A[0], line).map(x => pyStr(x)).join(o);
      case 'replace': return o.split(A[0]).join(A[1]);
      case 'find': return o.indexOf(A[0]);
      case 'index': { const i = o.indexOf(A[0]); if (i < 0) throw new PyErr('substring not found', line); return i; }
      case 'count': return A[0] === '' ? o.length + 1 : o.split(A[0]).length - 1;
      case 'startswith': return o.startsWith(A[0]);
      case 'endswith': return o.endsWith(A[0]);
      case 'isdigit': return /^\d+$/.test(o);
      case 'isalpha': return /^[A-Za-z]+$/.test(o);
      case 'isalnum': return /^[A-Za-z0-9]+$/.test(o);
      case 'isupper': return o === o.toUpperCase() && /[A-Za-z]/.test(o);
      case 'islower': return o === o.toLowerCase() && /[A-Za-z]/.test(o);
      case 'format': { let i = 0; return o.replace(/\{[^}]*\}/g, () => pyStr(A[i++])); }
    }

    if (isList(o)) switch (name){
      case 'append': o.push(A[0]); return null;
      case 'pop': {
        if (!o.length) throw new PyErr('pop from empty list', line);
        return A.length ? o.splice(normIdx(A[0], o.length, line), 1)[0] : o.pop();
      }
      case 'extend': iterate(A[0], line).forEach(x => o.push(x)); return null;
      case 'insert': { let i = this.num(A[0], line); if (i < 0) i += o.length;
        o.splice(Math.max(0, Math.min(o.length, i)), 0, A[1]); return null; }
      case 'remove': {
        const i = o.findIndex(x => pyEq(x, A[0]));
        if (i < 0) throw new PyErr('value not in list', line);
        o.splice(i, 1); return null;
      }
      case 'index': {
        const i = o.findIndex(x => pyEq(x, A[0]));
        if (i < 0) throw new PyErr(pyRepr(A[0]) + ' is not in list', line);
        return i;
      }
      case 'count': return o.filter(x => pyEq(x, A[0])).length;
      case 'sort': { this.sortInPlace(o, kwGet('key'), pyTruth(kwGet('reverse')), line); return null; }
      case 'reverse': o.reverse(); return null;
      case 'clear': o.length = 0; return null;
      case 'copy': return o.slice();
    }

    if (isSet(o)) switch (name){
      case 'add': o.set(pyKey(A[0]), A[0]); return null;
      case 'remove': {
        if (!o.delete(pyKey(A[0]))) throw new PyErr('element not in set', line);
        return null;
      }
      case 'discard': o.delete(pyKey(A[0])); return null;
      case 'clear': o.clear(); return null;
      case 'copy': return this.toSet(new Map(o));
      case 'union': { const s = new Map(o); iterate(A[0], line).forEach(v => s.set(pyKey(v), v)); return this.toSet(s); }
      case 'intersection': { const other = new Set(iterate(A[0], line).map(pyKey));
        const s = new Map(); o.forEach((v, k) => { if (other.has(k)) s.set(k, v); }); return this.toSet(s); }
      case 'difference': { const other = new Set(iterate(A[0], line).map(pyKey));
        const s = new Map(); o.forEach((v, k) => { if (!other.has(k)) s.set(k, v); }); return this.toSet(s); }
      case 'update': iterate(A[0], line).forEach(v => o.set(pyKey(v), v)); return null;
    }

    if (isDict(o)) switch (name){
      case 'get': return dictHas(o, A[0]) ? dictGet(o, A[0]) : (A.length > 1 ? A[1] : null);
      case 'keys': return dictKeys(o);
      case 'values': return dictVals(o);
      case 'items': return [...o.values()].map(e => new PyTuple([e[0], e[1]]));
      case 'pop': {
        if (dictHas(o, A[0])){ const v = dictGet(o, A[0]); dictDel(o, A[0]); return v; }
        if (A.length > 1) return A[1];
        throw new PyErr('key ' + pyRepr(A[0]) + ' not found', line);
      }
      case 'setdefault': {
        if (!dictHas(o, A[0])) dictSet(o, A[0], A.length > 1 ? A[1] : null);
        return dictGet(o, A[0]);
      }
      case 'update': {
        if (isDict(A[0])) A[0].forEach(e => dictSet(o, e[0], e[1]));
        return null;
      }
      case 'clear': o.clear(); return null;
      case 'copy': { const d = new Map(o); return d; }
    }

    if (o instanceof PyDeque) switch (name){
      case 'append': o.items.push(A[0]); return null;
      case 'appendleft': o.items.unshift(A[0]); return null;
      case 'pop': if (!o.items.length) throw new PyErr('pop from an empty deque', line); return o.items.pop();
      case 'popleft': if (!o.items.length) throw new PyErr('pop from an empty deque', line); return o.items.shift();
      case 'extend': iterate(A[0], line).forEach(x => o.items.push(x)); return null;
      case 'extendleft': iterate(A[0], line).forEach(x => o.items.unshift(x)); return null;
      case 'clear': o.items.length = 0; return null;
    }

    throw new PyErr("'" + pyType(o) + "' has no method '" + name + "' in this interpreter", line);
  }

  sortInPlace(arr, keyFn, rev, line){
    const wrapped = arr.map((v, i) => ({ v, i, k: keyFn ? this.call(keyFn, [v], [], line) : v }));
    wrapped.sort((a, b) => {
      const c = pyCmp(a.k, b.k, line);
      return c !== 0 ? c : a.i - b.i;                    // stable, like Python
    });
    if (rev) wrapped.reverse();
    wrapped.forEach((w, i) => arr[i] = w.v);
  }
}

/* ══════════════════════════════════════════════════════════════════════
   BUILTINS
   ══════════════════════════════════════════════════════════════════════ */
const nat = (name, fn) => new PyNative(name, fn);
const kwOf = (kw, k) => { const f = (kw || []).find(x => x.k === k); return f ? f.v : undefined; };

const PY_BUILTINS = {
  len:   nat('len',   (a, k, l) => pyLen(a[0], l)),
  range: nat('range', (a, k, l) => {
    const [s, e, st] = a.length === 1 ? [0, a[0], 1] : a.length === 2 ? [a[0], a[1], 1] : [a[0], a[1], a[2]];
    const step = st === undefined ? 1 : st;
    if (step === 0) throw new PyErr('range() step cannot be zero', l);
    const out = [];
    if (step > 0) for (let i = s; i < e; i += step){ out.push(i); if (out.length > 200000) break; }
    else          for (let i = s; i > e; i += step){ out.push(i); if (out.length > 200000) break; }
    return out;
  }),
  print: nat('print', (a, k, l, I) => {
    const sep = kwOf(k, 'sep'); const end = kwOf(k, 'end');
    I.stdout.push(a.map(x => pyStr(x)).join(sep === undefined ? ' ' : sep) +
                  (end === undefined ? '\n' : end));
    return null;
  }),
  enumerate: nat('enumerate', (a, k, l) => {
    const start = a.length > 1 ? a[1] : 0;
    return iterate(a[0], l).map((x, i) => new PyTuple([i + start, x]));
  }),
  zip: nat('zip', (a, k, l) => {
    const seqs = a.map(x => iterate(x, l));
    const n = Math.min(...seqs.map(s => s.length));
    const out = [];
    for (let i = 0; i < n; i++) out.push(new PyTuple(seqs.map(s => s[i])));
    return out;
  }),
  sorted: nat('sorted', (a, k, l, I) => {
    const arr = iterate(a[0], l);
    I.sortInPlace(arr, kwOf(k, 'key') || (a[1] || undefined), pyTruth(kwOf(k, 'reverse')), l);
    return arr;
  }),
  reversed: nat('reversed', (a, k, l) => iterate(a[0], l).reverse()),
  sum: nat('sum', (a, k, l) => iterate(a[0], l).reduce((s, x) => s + (isNum(x) ? x : x ? 1 : 0),
    a.length > 1 ? a[1] : 0)),
  min: nat('min', (a, k, l, I) => pickExtreme(a, k, l, I, -1)),
  max: nat('max', (a, k, l, I) => pickExtreme(a, k, l, I,  1)),
  abs: nat('abs', (a, k, l) => Math.abs(a[0])),
  int: nat('int', (a, k, l) => {
    if (a.length === 0) return 0;
    const v = a[0];
    if (isStr(v)){
      const base = a.length > 1 ? a[1] : 10;
      const n = parseInt(v.trim(), base);
      if (Number.isNaN(n)) throw new PyErr('cannot convert ' + pyRepr(v) + ' to int', l);
      return n;
    }
    if (typeof v === 'boolean') return v ? 1 : 0;
    return Math.trunc(v);
  }),
  float: nat('float', (a, k, l) => {
    if (!a.length) return 0.0;
    if (isStr(a[0])){
      const s = a[0].trim().toLowerCase();
      if (s === 'inf' || s === 'infinity' || s === '+inf') return Infinity;
      if (s === '-inf' || s === '-infinity') return -Infinity;
      const n = parseFloat(s);
      if (Number.isNaN(n)) throw new PyErr('cannot convert ' + pyRepr(a[0]) + ' to float', l);
      return n;
    }
    return Number(a[0]);
  }),
  str:  nat('str',  (a) => a.length ? pyStr(a[0]) : ''),
  repr: nat('repr', (a) => pyRepr(a[0])),
  bool: nat('bool', (a) => a.length ? pyTruth(a[0]) : false),
  list: nat('list', (a, k, l) => a.length ? iterate(a[0], l) : []),
  tuple: nat('tuple', (a, k, l) => new PyTuple(a.length ? iterate(a[0], l) : [])),
  dict: nat('dict', (a, k, l) => {
    const d = new Map();
    if (a.length && isDict(a[0])) a[0].forEach(e => dictSet(d, e[0], e[1]));
    else if (a.length) iterate(a[0], l).forEach(p => {
      const it = iterate(p, l); dictSet(d, it[0], it[1]);
    });
    (k || []).forEach(x => dictSet(d, x.k, x.v));
    return d;
  }),
  set: nat('set', (a, k, l) => {
    const s = new Map();
    if (a.length) iterate(a[0], l).forEach(v => s.set(pyKey(v), v));
    s.__isSet = true;
    return s;
  }),
  any: nat('any', (a, k, l) => iterate(a[0], l).some(pyTruth)),
  all: nat('all', (a, k, l) => iterate(a[0], l).every(pyTruth)),
  map: nat('map', (a, k, l, I) => iterate(a[1], l).map(x => I.call(a[0], [x], [], l))),
  filter: nat('filter', (a, k, l, I) => iterate(a[1], l)
    .filter(x => a[0] === null ? pyTruth(x) : pyTruth(I.call(a[0], [x], [], l)))),
  ord: nat('ord', (a) => String(a[0]).charCodeAt(0)),
  chr: nat('chr', (a) => String.fromCharCode(a[0])),
  divmod: nat('divmod', (a, k, l) => new PyTuple([Math.floor(a[0] / a[1]), ((a[0] % a[1]) + a[1]) % a[1]])),
  round: nat('round', (a) => {
    if (a.length < 2) return Math.round(a[0]);
    const p = Math.pow(10, a[1]); return Math.round(a[0] * p) / p;
  }),
  pow: nat('pow', (a) => a.length > 2 ? Math.pow(a[0], a[1]) % a[2] : Math.pow(a[0], a[1])),
  isinstance: nat('isinstance', (a) => {
    const t = a[1], v = a[0];
    const one = tt => {
      if (tt instanceof PyClass) return v instanceof PyObj &&
        (function up(c){ return c ? (c === tt || up(c.base)) : false; })(v.cls);
      if (tt instanceof PyNative) return pyType(v) === tt.name ||
        (tt.name === 'int' && isNum(v)) || (tt.name === 'float' && isNum(v));
      return false;
    };
    return t instanceof PyTuple ? t.items.some(one) : one(t);
  }),
  type: nat('type', (a) => pyType(a[0])),
  id: nat('id', () => 0),
  input: nat('input', () => { throw new PyErr('input() is not available here — hard-code your test values instead', 0); })
};

function pickExtreme(a, k, l, I, dir){
  const keyFn = kwOf(k, 'key');
  const items = a.length === 1 ? iterate(a[0], l) : a;
  if (!items.length) throw new PyErr((dir > 0 ? 'max' : 'min') + '() got an empty sequence', l);
  let best = items[0], bestK = keyFn ? I.call(keyFn, [best], [], l) : best;
  for (let i = 1; i < items.length; i++){
    const kv = keyFn ? I.call(keyFn, [items[i]], [], l) : items[i];
    if (pyCmp(kv, bestK, l) * dir > 0){ best = items[i]; bestK = kv; }
  }
  return best;
}

/* ─────────────────────────── stdlib subset ─────────────────────────── */
function mkModule(entries){
  const m = new Map(Object.entries(entries));
  m.__isModule = true;
  return m;
}

function siftDown(h, i, I, l){
  const n = h.length;
  while (true){
    let s = i; const a = 2*i+1, b = 2*i+2;
    if (a < n && pyCmp(h[a], h[s], l) < 0) s = a;
    if (b < n && pyCmp(h[b], h[s], l) < 0) s = b;
    if (s === i) return;
    [h[i], h[s]] = [h[s], h[i]]; i = s;
  }
}
function siftUp(h, i, l){
  while (i > 0){
    const p = (i - 1) >> 1;
    if (pyCmp(h[i], h[p], l) >= 0) return;
    [h[i], h[p]] = [h[p], h[i]]; i = p;
  }
}

const PY_MODULES = {
  heapq: mkModule({
    heappush: nat('heappush', (a, k, l) => { a[0].push(a[1]); siftUp(a[0], a[0].length - 1, l); return null; }),
    heappop:  nat('heappop',  (a, k, l, I) => {
      const h = a[0];
      if (!h.length) throw new PyErr('pop from an empty heap', l);
      const top = h[0], last = h.pop();
      if (h.length){ h[0] = last; siftDown(h, 0, I, l); }
      return top;
    }),
    heapify: nat('heapify', (a, k, l, I) => {
      const h = a[0];
      for (let i = (h.length >> 1) - 1; i >= 0; i--) siftDown(h, i, I, l);
      return null;
    }),
    heappushpop: nat('heappushpop', (a, k, l, I) => {
      const h = a[0];
      if (h.length && pyCmp(h[0], a[1], l) < 0){
        const top = h[0]; h[0] = a[1]; siftDown(h, 0, I, l); return top;
      }
      return a[1];
    }),
    nlargest:  nat('nlargest',  (a, k, l, I) => { const s = iterate(a[1], l);
      I.sortInPlace(s, kwOf(k, 'key'), true, l); return s.slice(0, a[0]); }),
    nsmallest: nat('nsmallest', (a, k, l, I) => { const s = iterate(a[1], l);
      I.sortInPlace(s, kwOf(k, 'key'), false, l); return s.slice(0, a[0]); })
  }),
  collections: mkModule({
    deque: nat('deque', (a, k, l) => new PyDeque(a.length ? iterate(a[0], l) : [])),
    defaultdict: nat('defaultdict', (a) => new PyDefaultDict(a[0] || PY_BUILTINS.int),
    ),
    Counter: nat('Counter', (a, k, l) => {
      const d = new Map();
      if (a.length) iterate(a[0], l).forEach(x => dictSet(d, x, (dictHas(d, x) ? dictGet(d, x) : 0) + 1));
      return d;
    }),
    OrderedDict: nat('OrderedDict', () => new Map())
  }),
  math: mkModule({
    inf: Infinity, pi: Math.PI, e: Math.E,
    sqrt: nat('sqrt', a => Math.sqrt(a[0])),
    floor: nat('floor', a => Math.floor(a[0])),
    ceil: nat('ceil', a => Math.ceil(a[0])),
    log: nat('log', a => a.length > 1 ? Math.log(a[0]) / Math.log(a[1]) : Math.log(a[0])),
    log2: nat('log2', a => Math.log2(a[0])),
    gcd: nat('gcd', a => { let x = Math.abs(a[0]), y = Math.abs(a[1]);
      while (y){ [x, y] = [y, x % y]; } return x; }),
    isqrt: nat('isqrt', a => Math.floor(Math.sqrt(a[0])))
  }),
  sys: mkModule({ maxsize: 9007199254740991,
    setrecursionlimit: nat('setrecursionlimit', () => null) }),
  functools: mkModule({
    lru_cache: nat('lru_cache', (a, k, l, I) => nat('decorator', (b) => memoize(b[0], I))),
    cache: nat('cache', (a, k, l, I) => memoize(a[0], I))
  }),
  itertools: mkModule({
    accumulate: nat('accumulate', (a, k, l) => {
      let s = 0; return iterate(a[0], l).map(x => (s += x));
    })
  }),
  string: mkModule({
    ascii_lowercase: 'abcdefghijklmnopqrstuvwxyz',
    ascii_uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  })
};

function memoize(fn, I){
  const cache = new Map();
  return nat('cached_' + (fn.name || 'fn'), (args, kw, line) => {
    const key = args.map(pyRepr).join('|');
    if (cache.has(key)) return cache.get(key);
    const v = I.call(fn, args, kw, line);
    cache.set(key, v);
    return v;
  });
}

/* ══════════════════════════════════════════════════════════════════════
   FLOWCHART FROM AST  (port of _FlowBuilder in dsaviz.py)
   ══════════════════════════════════════════════════════════════════════ */
function pyFlow(fnNode, srcLines){
  const nodes = [], edges = [];
  let row = 0, n = 0;
  const loops = [];
  const text = ln => (srcLines[ln - 1] || '').trim().slice(0, 58);

  const emit = (title, sub, type, col, lines) => {
    const id = 'f' + (++n);
    nodes.push({ id, title: title || '…', sub: sub || '', type, r: row++, c: col, lines: lines || [] });
    return id;
  };
  const link = (froms, to, label) => {
    (froms || []).forEach(f => { if (f && to) edges.push(label ? { from:f, to, label } : { from:f, to }); });
  };

  function block(body, col){
    let entry = null, exits = [], run = [];
    const flush = () => {
      if (!run.length) return;
      const first = run[0].line;
      const title = text(first) + (run.length > 1 ? '  …' : '');
      const sub = run.length === 1 ? 'line ' + first : 'lines ' + first + '–' + run[run.length - 1].line;
      const id = emit(title, sub, 'act', col, run.map(s => s.line));
      if (!entry) entry = id;
      link(exits, id);
      exits = [id]; run = [];
    };
    for (const st of body){
      if (['If','While','For','Return','Break','Continue','Try'].includes(st.type)){
        flush();
        const [e, x] = stmt(st, col);
        if (!entry) entry = e;
        link(exits, e);
        exits = x;
      } else {
        run.push(st);
        if (run.length >= 3) flush();
      }
    }
    flush();
    return [entry, exits];
  }

  function stmt(st, col){
    if (st.type === 'If'){
      const id = emit(srcText(st.test, st.line) + ' ?', 'line ' + st.line, 'dec', col, [st.line]);
      const [te, tx] = block(st.body, col);
      link([id], te, 'yes');
      if (st.orelse && st.orelse.length){
        const [fe, fx] = block(st.orelse, col + 1);
        link([id], fe, 'no');
        return [id, tx.concat(fx)];
      }
      return [id, tx.concat([id])];
    }
    if (st.type === 'While' || st.type === 'For'){
      const isFor = st.type === 'For';
      const title = isFor
        ? ('for ' + srcText(st.target, st.line) + ' in ' + srcText(st.iter, st.line)).slice(0, 52)
        : srcText(st.test, st.line) + ' ?';
      const id = emit(title, 'loop header · line ' + st.line, 'dec', col, [st.line]);
      loops.push({ id, breaks:[] });
      const [be, bx] = block(st.body, col);
      link([id], be, isFor ? 'next item' : 'yes');
      link(bx, id, 'repeat');
      const me = loops.pop();
      return [id, [id].concat(me.breaks)];
    }
    if (st.type === 'Return'){
      const id = emit('Return ' + (st.value ? srcText(st.value, st.line).slice(0, 40) : ''),
        'line ' + st.line, 'ok', col + 1, [st.line]);
      return [id, []];
    }
    if (st.type === 'Break'){
      const id = emit('break', 'leave the loop', 'bad', col + 1, [st.line]);
      if (loops.length) loops[loops.length - 1].breaks.push(id);
      return [id, []];
    }
    if (st.type === 'Continue'){
      const id = emit('continue', 'back to the loop header', 'loop', col + 1, [st.line]);
      if (loops.length) link([id], loops[loops.length - 1].id, 'continue');
      return [id, []];
    }
    if (st.type === 'Try'){
      const id = emit('try', 'line ' + st.line, 'act', col, [st.line]);
      const [be, bx] = block(st.body, col);
      link([id], be);
      return [id, bx];
    }
    const id = emit(text(st.line), 'line ' + st.line, 'act', col, [st.line]);
    return [id, [id]];
  }

  function srcText(node, line){
    if (!node) return '';
    const t = text(node.line || line);
    return t || 'line ' + line;
  }

  const entry = emit((fnNode.name || 'main') + '(' + (fnNode.params || []).join(', ') + ')',
    'entry', 'start', 0, fnNode.line ? [fnNode.line] : []);
  const [e, x] = block(fnNode.body, 0);
  link([entry], e);
  if (x.length){
    const done = emit('Return (implicit None)', '', 'ok', 1, []);
    link(x, done);
  }

  const lineToNode = {};
  nodes.forEach(nd => {
    (nd.lines || []).forEach(ln => { if (!lineToNode[String(ln)]) lineToNode[String(ln)] = nd.id; });
    delete nd.lines;
  });
  return { flow:{ nodes, edges }, lineToNode };
}

/* ══════════════════════════════════════════════════════════════════════
   PUBLIC ENTRY — source in, trace document out
   ══════════════════════════════════════════════════════════════════════ */
function runPython(src, name){
  const doc = {
    dsaviz:1, lang:'python', name: name || 'your code', file:'',
    source: src, sourceStart:1, flow:null, lineToNode:{}, frames:[],
    stdout:[], engine:'pyrun'
  };

  let ast;
  try { ast = parsePy(src); }
  catch (e){
    doc.error = (e.py ? 'Line ' + e.line + ': ' : '') + e.message;
    doc.errorLine = e.line;
    doc.phase = 'parse';
    return doc;
  }

  const I = new Interp();
  const genv = new Env(null, false);

  try { I.execBlock(ast.body, genv); }
  catch (e){
    if (e instanceof HaltSig){
      doc.truncated = true;
      doc.haltReason = e.why === 'frames'
        ? 'Stopped after ' + PY_MAX_FRAMES + ' recorded steps — use a smaller input to see the whole run.'
        : 'Stopped after ' + PY_MAX_STEPS + ' operations — this looks like an infinite loop.';
    } else if (e instanceof ReturnSig){
      /* return at module level — ignore */
    } else if (e && e.py){
      doc.error = 'Line ' + e.line + ': ' + e.message;
      doc.errorLine = e.line;
      doc.phase = 'run';
    } else {
      doc.error = 'Internal error: ' + (e && e.message ? e.message : String(e));
      doc.phase = 'run';
    }
  }

  doc.frames = I.frames;
  doc.stdout = I.stdout;
  doc.truncated = doc.truncated || I.truncated;

  /* One flowchart per function, so stepping into a call swaps the chart to
     that function instead of leaving the highlight stranded. */
  const srcLines = src.split('\n');
  const fns = [];
  ast.body.forEach(s => {
    if (s.type === 'FunctionDef') fns.push(s);
    else if (s.type === 'ClassDef')
      s.body.forEach(m => { if (m.type === 'FunctionDef') fns.push(m); });
  });

  doc.flows = {};
  fns.forEach(f => {
    try {
      const built = pyFlow(f, srcLines);
      doc.flows[f.name] = { flow:built.flow, lineToNode:built.lineToNode };
    } catch (e){ }
  });
  try {
    const built = pyFlow({ name:'<module>', params:[], body:ast.body, line:1 }, srcLines);
    doc.flows['<module>'] = { flow:built.flow, lineToNode:built.lineToNode };
  } catch (e){ }

  /* the primary chart is whichever function actually ran the most */
  const counts = {};
  I.frames.forEach(f => counts[f.func] = (counts[f.func] || 0) + 1);
  let primary = null, best = -1;
  Object.keys(doc.flows).forEach(n => {
    if (n === '<module>') return;
    if ((counts[n] || 0) > best){ best = counts[n] || 0; primary = n; }
  });
  if (!primary) primary = '<module>';
  doc.flowFn = primary;
  doc.flow = doc.flows[primary] ? doc.flows[primary].flow : null;
  doc.lineToNode = doc.flows[primary] ? doc.flows[primary].lineToNode : {};

  return doc;
}
