/* No test dependencies. Run: node tests/platform-check.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const store=new Map();
const context=vm.createContext({console,setTimeout,clearTimeout,
 localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
 document:{addEventListener(){}},location:{hash:''}
});
const load=file=>vm.runInContext(fs.readFileSync(path.join(root,'src',file),'utf8'),context,{filename:file});
['js/core.js','js/algos_sorting.js','js/algos_searching.js','js/algos_patterns.js','js/algos_list.js','js/algos_tree.js','js/algos_graph.js','js/algos_dp.js','js/lcproblems.js','js/roadmap.js','js/sd-roadmap.js','js/sd-lessons.js','js/sd-backend-lessons.js','js/sd-simulations.js','js/sd-backend-simulations.js','js/sd-lab-content.js','js/sd-backend-labs.js','js/sd-scenes.js','js/sd-backend-scenes.js','js/sd-study.js','js/platform.js'].forEach(load);
context.assert=assert;
vm.runInContext(`
const defaults=id=>Object.fromEntries(SD_LESSONS[id].controls.map(c=>[c[0],c[2]==='checkbox'?c[3]:c[2]==='select'?c[4]:c[4]]));
const final=(id,o)=>SD_SIM.build(id,{...defaults(id),...o}).frames.at(-1);
assert.equal(SD_STAGES.length,12);
assert.equal(Object.keys(SD_LESSONS).length,23);
assert.equal(new Set(SD_TOPICS.map(t=>t.id)).size,SD_TOPICS.length);
const prior=new Set();
for(const t of SD_TOPICS){for(const id of t.prerequisites)assert(prior.has(id),'Prerequisite must precede '+t.id);prior.add(t.id);}
for(const stage of SD_STAGES)for(const n of stage.prerequisites)assert(n<stage.number);
let scenarios=0;
for(const [id,l] of Object.entries(SD_LESSONS)){
 assert(SD_TOPICS.some(t=>t.id===id));
 for(const section of ['intro','fundamentals','working','deep','usage','summary','check','objectives','sources'])assert(l[section].length>=1,id+' '+section);
 assert(l.intro.join(' ').length+l.fundamentals.join(' ').length+l.deep.join(' ').length>1400,id+' has substantial authored content');
 const options=[defaults(id)];
 for(const c of l.controls){for(const value of c[2]==='checkbox'?[false,true]:c[2]==='select'?c[3]:[c[2],c[3]])options.push({...defaults(id),[c[0]]:value});}
 for(const o of options){
  const {nodes,frames}=SD_SIM.build(id,o);const ids=new Set(nodes.map(n=>n.id));
  assert(frames.length>=2);let previous=-1;
  for(const f of frames){assert(ids.has(f.from));assert(ids.has(f.to));assert(f.note.trim().length>0);assert(Number.isFinite(f.elapsed));assert(f.elapsed>=previous);previous=f.elapsed;assert(!f.state.failed||ids.has(f.state.failed));}
  const sim={nodes,frames};
  for(const narrow of [false,true]){
   const scene=SDScene.render(id,sim,frames.length-1,1,o,narrow);
   assert(scene.html.includes('class="lab-scene'));assert(!scene.html.includes('NaN'));assert(!scene.html.includes('undefined'));
   const initial=SDScene.render(id,sim,0,0,o,narrow);assert(initial.html.includes('data-actor='));
  }
  scenarios++;
 }
 const topic=SD_TOPICS.find(t=>t.id===id);const html=Platform.lesson(topic);
 for(const letter of 'ABCDEFGH')assert(html.includes('section-label">'+letter),id+' section '+letter);
 assert(html.includes('sdControls'));assert(html.includes('sdComplete'));
 assert(html.indexOf('sdDiagram')<html.indexOf('Why this exists'));
 for(const [nodeId,def] of Object.entries(SD_LABS[id].nodes))assert(def[1].length>80,nodeId+' inspector explanation');
 for(const preset of SD_LABS[id].presets)assert(SD_SIM.build(id,{...defaults(id),...preset[1]}).frames.length>0);
}
assert.equal(final('client-server',{network:40,work:80}).elapsed,160);
assert(final('internet',{failed:true}).elapsed>final('internet',{failed:false}).elapsed);
const reroute=SD_SIM.build('internet',{failed:true,network:20});
const alternateIndex=reroute.frames.findIndex(f=>f.from==='isp'&&f.to==='alternate');
const alternateScene=SDScene.render('internet',reroute,alternateIndex,0,{failed:true,network:20},true);
for(const fraction of [0,.25,.5,.75,1]){const point=SDScene.motionAt(alternateScene.path,fraction);assert(point.x>=0&&point.x<=420);assert(point.y>=0&&point.y<=490);}
assert(SDScene.motionAt(alternateScene.path,.5).x>390,'Alternate path bypasses the failed primary actor');
const cold=SD_SIM.build('dns',{...defaults('dns'),cache:'none'});
assert(cold.frames.some(f=>f.from==='resolver'&&f.to==='root'));
for(const cache of ['browser','OS','resolver']){
 const warm=SD_SIM.build('dns',{...defaults('dns'),cache});
 assert(!warm.frames.some(f=>f.to==='root'));assert(warm.frames.length<cold.frames.length);
}
assert.equal(final('dns',{missing:true,cache:'none'}).state.status,'NXDOMAIN');
assert.equal(final('dns',{missing:true,cache:'browser'}).state.answer,'192.0.2.10');
assert.equal(final('dns',{cache:'browser',address:'192.0.2.20',cacheAddress:'192.0.2.10'}).state.answer,'192.0.2.10');
assert.equal(final('dns',{cache:'resolver',address:'192.0.2.20',cacheAddress:'192.0.2.10'}).state.answer,'192.0.2.10');
assert.equal(final('dns',{cache:'none',address:'192.0.2.20'}).state.answer,'192.0.2.20');
assert.equal(final('tcp-udp',{transport:'TCP',loss:true}).state.delivered,'ABC');
assert.equal(final('tcp-udp',{transport:'UDP',loss:true}).state.delivered,'A,C');
assert.equal(final('tcp-handshake',{loss:true}).state.server,'ESTABLISHED');
assert(final('tcp-handshake',{loss:true}).elapsed>final('tcp-handshake',{loss:false}).elapsed);
assert.equal(final('tls',{invalid:true}).state.status,'validation failed');
assert(!SD_SIM.build('tls',{invalid:true}).frames.some(f=>f.packet==='Encrypted HTTP'));
assert.equal(final('http-lifecycle',{unavailable:true}).state.status,'503');
assert.equal(final('http-semantics',{method:'POST'}).state.count,3);
assert.equal(final('http-semantics',{method:'PUT'}).state.count,1);
assert.equal(final('http-semantics',{method:'DELETE'}).state.status,'404 Not Found');
const h2=SD_SIM.build('http-versions',{version:'2',loss:true});
const h3=SD_SIM.build('http-versions',{version:'3',loss:true});
assert(h2.frames.some(f=>f.state.buffered==='B,C'));
assert(h3.frames.some(f=>f.state.available==='B,C'));
assert.equal(final('websockets',{disconnect:true}).state.delivered,'no server push');
const coldNav=final('browser-server',{warm:'cold'}).elapsed;
assert(final('browser-server',{warm:'DNS cached'}).elapsed<coldNav);
assert(final('browser-server',{warm:'connection open'}).elapsed<final('browser-server',{warm:'DNS cached'}).elapsed);
Progress.set('t-hash',true);
// Backend semantics: exercise decisions, not just generated markup.
const backendState=(name,o)=>{const sim=SD_SIM.build('s2-'+name,{...defaults('s2-'+name),...o});return SDScene.state(sim.frames,sim.frames.length-1,1);};
assert.equal(backendState('web-servers',{path:'/logo.svg',missing:true}).status,'404 Not Found');
assert.equal(backendState('web-servers',{path:'/api/books',missing:true}).status,'200 OK');
assert.equal(backendState('application-servers',{quantity:3,stock:1}).stock,1);
assert.equal(backendState('application-servers',{quantity:2,stock:4}).stock,2);
assert.equal(backendState('apis',{payload:'null',version:'v1'}).writes,0);
assert.equal(backendState('apis',{payload:'valid',version:'v2'}).status,'404 Not Found');
assert.equal(backendState('rest-and-graphql',{style:'GraphQL',orders:true,batch:false}).requests,1);
assert.equal(backendState('rest-and-graphql',{style:'GraphQL',orders:true,batch:false}).reads,4);
assert.equal(backendState('rest-and-graphql',{style:'GraphQL',orders:true,batch:true}).reads,2);
assert.equal(backendState('rest-and-graphql',{style:'Resource API',orders:true,batch:true}).requests,2);
assert.equal(backendState('stateless-and-stateful-architecture',{storage:'local',sticky:true,fail:true}).cart,'empty');
assert.equal(backendState('stateless-and-stateful-architecture',{storage:'shared',sticky:false,fail:true}).cart,'Atlas');
assert.equal(backendState('cookies-and-sessions',{ttl:30,age:30,scheme:'HTTPS',secure:true}).status,'401 Unauthorized');
assert.equal(backendState('cookies-and-sessions',{ttl:30,age:10,scheme:'HTTP',secure:true}).cookie,'withheld');
assert.equal(backendState('cookies-and-sessions',{ttl:30,age:10,scheme:'HTTP',secure:false}).status,'200 OK');
assert.equal(backendState('authentication-and-authorization',{credential:'valid',owner:'Bob'}).reads,0);
assert.equal(backendState('authentication-and-authorization',{credential:'valid',owner:'Bob'}).status,'403 Forbidden');
assert.equal(backendState('authentication-and-authorization',{credential:'expired',owner:'Alice'}).status,'401 Unauthorized');
assert.equal(backendState('reverse-proxies',{fail:true}).status,'502 Bad Gateway');
assert.equal(backendState('api-gateways',{requests:5,limit:3,auth:true}).rejected,2);
assert.equal(backendState('api-gateways',{requests:5,limit:3,auth:false}).allowed,0);
assert.equal(backendState('request-lifecycle',{work:350,timeout:100,invalid:false}).outcome,'timeout, write committed');
assert.equal(backendState('request-lifecycle',{invalid:true}).writes,0);
// Independent fixed-wave capacity calculation checks deadline boundaries and conservation.
for(const size of [1,2,4])for(const requests of [1,5,8])for(const work of [30,100,300])for(const wait of [40,100,500]){
 const sim=SD_SIM.build('s2-connection-pooling',{size,requests,work,wait});
 const state=SDScene.state(sim.frames,sim.frames.length-1,1);
 const expected=Math.min(requests,size*Math.ceil(wait/work));
 assert.equal(state.done.length,expected,JSON.stringify({size,requests,work,wait,state}));
 assert.equal(state.timedOut.length,requests-expected,JSON.stringify({size,requests,work,wait,state}));
 assert.equal(new Set([...state.done,...state.timedOut]).size,requests,JSON.stringify({size,requests,work,wait,state}));
 assert(state.busy.every(x=>x==='idle'));assert.equal(state.waiting.length,0);
 for(const f of sim.frames){const busy=f.state.busy.filter(x=>x!=='idle');assert(busy.length<=size);assert.equal(new Set(busy).size,busy.length);}
}
assert(Platform.lessonNavigation(SD_TOPICS.find(t=>t.id==='browser-server')).includes('#/system-design/s2-web-servers'));
assert(Platform.lesson(SD_TOPICS.find(t=>t.id==='s2-web-servers')).includes('APPLICATION AND BACKEND FUNDAMENTALS / LESSON 01'));
SDProgress.toggle('completed','dns');SDProgress.toggle('bookmarks','dns');SDProgress.data.current='dns';SDProgress.save();
SDProgress.data={completed:[],bookmarks:[],current:null};SDProgress.load();
assert(SDProgress.data.completed.includes('dns'));assert(SDProgress.data.bookmarks.includes('dns'));assert.equal(SDProgress.data.current,'dns');
assert(Progress.has('t-hash'));assert.equal(SDProgress.counts(1).done,1);
const planned=SD_TOPICS.find(t=>t.stage===3);SDProgress.toggle('completed',planned.id);assert(!SDProgress.data.completed.includes(planned.id));
assert(!Platform.lesson(planned).includes('sdComplete'));assert(Platform.lesson(planned).includes('not been published'));
localStorage.setItem(SDProgress.key,'{');SDProgress.load();assert.equal(SDProgress.data.current,null);assert.equal(SDProgress.data.completed.length,0);
localStorage.setItem(SDProgress.key,JSON.stringify({completed:['not-real','dns'],bookmarks:[planned.id],current:'not-real'}));
SDProgress.load();assert.equal(SDProgress.data.current,null);assert.equal(SDProgress.data.completed.length,1);
assert.equal(Platform.routeForDsa('visualize'),'#/dsa');assert.equal(Platform.routeForDsa('roadmap'),'#/dsa/roadmap');
Platform.dsaRoute('mycode');assert.equal(location.hash,'#/dsa/mycode');
let algorithms=0;
for(const id of DSA.order){const a=DSA.get(id);const inputs=Object.fromEntries((a.inputs||[]).map(i=>[i.key,i.def]));const frames=collect(a.run(inputs));assert(frames.length>0,id+' generates default frames');algorithms++;}
const make=()=>({value:1,textContent:'',disabled:false,handlers:{},addEventListener(k,fn){this.handlers[k]=fn;},setAttribute(){}});
const ui=Object.fromEntries(['play','prev','next','first','last','scrub','count','speed'].map(k=>[k,make()]));
let painted=-1;const p=new Player(ui,(f,i)=>painted=i);p.load([{note:'one'},{note:'two'},{note:'three'}]);
assert.equal(painted,0);assert(ui.first.disabled);ui.next.handlers.click();assert.equal(painted,1);p.go(99);assert.equal(painted,2);assert(ui.next.disabled);
p.play();assert(p.playing);p.pause();assert(!p.playing);ui.first.handlers.click();assert.equal(painted,0);
let now=0,callback=null,rafCount=0,arrivals=[];
const tui=Object.fromEntries(['play','prev','next','first','last','scrub','count','speed'].map(k=>[k,make()]));
const timeline=new SDTimeline(tui,(f,i,progress)=>arrivals.push({i,progress}),()=>{},{now:()=>now,request:fn=>{callback=fn;return ++rafCount;},cancel:()=>{callback=null;}});
timeline.load([{elapsed:0},{elapsed:50},{elapsed:100}]);timeline.play();now+=100;callback(now);const paused=timeline.fraction;
assert(paused>0&&paused<1);timeline.pause();assert.equal(callback,null);assert.equal(timeline.fraction,paused);
timeline.play();assert.equal(timeline.fraction,paused);for(let n=0;n<100&&callback;n++){now+=100;callback(now);}
assert.equal(timeline.i,2);assert.equal(timeline.fraction,1);assert.equal(timeline.playing,false);
timeline.go(0);assert.equal(timeline.fraction,1);timeline.restart();assert.equal(timeline.fraction,0);
assert(arrivals.some(a=>a.i===1&&a.progress===1));
console.log('Passed: '+scenarios+' simulation scenarios; 23 lesson contracts; prerequisite ordering; persistence; planned-topic guards; routes; player; '+algorithms+' DSA algorithms.');
`,context);
const built=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.equal(built,fs.readFileSync(path.join(root,'DSAViz.html'),'utf8'));
assert(!built.includes('<!--INCLUDE:'));
new vm.Script(built.match(/<script>([\s\S]*)<\/script>/)[1]);
console.log('Passed: identical GitHub Pages/offline bundles, resolved includes, merged JavaScript syntax.');
