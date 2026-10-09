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
['js/core.js','js/algos_sorting.js','js/algos_searching.js','js/algos_patterns.js','js/algos_list.js','js/algos_tree.js','js/algos_graph.js','js/algos_dp.js','js/lcproblems.js','js/roadmap.js','js/sd-roadmap.js','js/sd-lessons.js','js/sd-backend-lessons.js','js/sd-simulations.js','js/sd-backend-simulations.js','js/sd-lab-content.js','js/sd-backend-labs.js','js/sd-scenes.js','js/sd-backend-scenes.js','js/sd-storage-content.js','js/sd-storage-simulations.js','js/sd-storage-scenes.js','js/sd-cache-content.js','js/sd-cache-simulations.js','js/sd-cache-scenes.js','js/sd-study.js','js/platform.js'].forEach(load);
context.assert=assert;
vm.runInContext(`
const defaults=id=>Object.fromEntries(SD_LESSONS[id].controls.map(c=>[c[0],c[2]==='checkbox'?c[3]:c[2]==='select'?c[4]:c[4]]));
const final=(id,o)=>SD_SIM.build(id,{...defaults(id),...o}).frames.at(-1);
assert.equal(SD_STAGES.length,12);
assert.equal(Object.keys(SD_LESSONS).length,52);
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
const storageState=(name,o={})=>{const id='s3-'+name,sim=SD_SIM.build(id,{...defaults(id),...o});return SDScene.state(sim.frames,sim.frames.length-1,1);};
assert.equal(storageState('relational-databases',{author:'missing',enforce:true}).writes,0);
assert.equal(storageState('relational-databases',{author:'missing',enforce:false}).writes,1);
assert.equal(storageState('nosql-databases',{model:'embedded',rename:false}).reads,1);
assert.equal(storageState('nosql-databases',{model:'referenced',rename:false}).reads,2);
assert.equal(storageState('data-modeling',{model:'embedded',rename:true,propagate:false}).copies[1],'Leo');
assert.equal(storageState('data-modeling',{model:'referenced',rename:true}).copies[1],'Lena');
for(let key=1;key<=9;key++){
 const indexed=storageState('indexing',{key,index:true,warm:false}),scan=storageState('indexing',{key,index:false,warm:false});
 assert.equal(JSON.stringify(indexed.result),JSON.stringify(scan.result));assert.equal(indexed.result.length,key<=8?1:0);
 assert.equal(indexed.reads,key<=8?3:2);assert.equal(scan.reads,4);
 const warm=storageState('indexing',{key,index:true,warm:true});assert.equal(warm.pageReads,0);assert.equal(warm.cacheHits,warm.reads);
}
const inMemory=storageState('query-execution',{query:'all',memory:8}),spilled=storageState('query-execution',{query:'all',memory:2});
assert(!inMemory.spilled);assert(spilled.spilled);assert.equal(spilled.tempWrites,2);assert.equal(JSON.stringify(inMemory.result),JSON.stringify(spilled.result));
for(const amount of [10,30,60]){
 const good=storageState('transactions',{amount,atomic:true,fail:false}),abort=storageState('transactions',{amount,atomic:true,fail:true}),partial=storageState('transactions',{amount,atomic:false,fail:true});
 assert.equal(good.a+good.b,150);assert.equal(abort.a,100);assert.equal(abort.b,50);assert.equal(partial.a+partial.b,150-amount);
 const recovery=storageState('acid-properties',{amount,durable:true,crash:true}),lost=storageState('acid-properties',{amount,durable:false,crash:true});
 assert.equal(recovery.a,100-amount);assert.equal(lost.a,100);assert.equal(lost.b,50);
 const commit=SD_SIM.build('s3-acid-properties',{amount,durable:true,crash:true}).frames.find(f=>f.packet==='Debit A');assert.equal(commit.state.a,100,'Debit remains tentative before atomic commit');
}
assert.equal(storageState('transaction-isolation',{level:'Read Committed'}).second,70);
assert.equal(storageState('transaction-isolation',{level:'Repeatable Read'}).second,100);
assert.equal(storageState('transaction-isolation',{level:'Read Committed'}).during,100);
assert.equal(storageState('replication',{mode:'asynchronous',lag:true,fail:false}).readValue,8);
assert.equal(storageState('replication',{mode:'synchronous',lag:true,fail:false}).readValue,7);
assert.equal(storageState('replication',{mode:'synchronous',fail:true}).ack,false);
assert.equal(storageState('replication',{mode:'asynchronous',lag:false,fail:true}).replica,8);
for(const shards of [2,3,4])for(const scope of ['point','all'])for(const key of [1,5,8,9]){
 const st=storageState('sharding',{shards,scope,key,rebalance:true});
 assert.equal(st.placements.flat().length,8);assert.equal(new Set(st.placements.flat()).size,8);
 assert.equal(st.touched.length,scope==='all'?shards:key<=8?1:0);
 assert.equal(st.moves,SDStorageSim.books.filter(r=>r.id%shards!==r.id%(shards+1)).length);
 if(key<=8&&scope==='point')assert.equal(st.result[0].id,key);
}
assert.equal(storageState('partitioning',{scope:'all'}).touched.length,4);
assert.equal(storageState('partitioning',{scope:'point',key:5}).touched[0],2);
assert.equal(storageState('object-storage',{fail:true,retry:true,complete:true}).published,true);
assert.equal(storageState('object-storage',{fail:true,retry:false,complete:true}).published,false);
assert.equal(storageState('object-storage',{fail:false,complete:false}).published,false);
assert.equal(storageState('file-storage',{sync:true,crash:true}).content,'new note');
assert.equal(storageState('file-storage',{sync:false,crash:true}).content,'old note');
assert.equal(storageState('file-storage',{sync:true,rename:true,crash:false}).name,'study.txt');
assert.equal(storageState('database-performance',{query:'point',index:false,pages:12,warm:false}).pageReads,12);
assert.equal(storageState('database-performance',{query:'point',index:true,pages:12,warm:false}).pageReads,3);
assert.equal(storageState('database-performance',{query:'all',index:false,pages:12,warm:true}).reads,12);
const cacheState=(slug,o={})=>{const id='s4-'+slug;return SD_SIM.build(id,{...defaults(id),...o}).frames.at(-1).state;};
assert.equal(cacheState('why-caching-exists',{requests:3,enabled:true}).dbReads,1);
assert.equal(cacheState('why-caching-exists',{requests:3,enabled:true}).hits,2);
assert.equal(cacheState('why-caching-exists',{requests:3,enabled:false}).dbReads,3);
const freshBody=cacheState('browser-caching',{policy:'max-age',age:10,changed:true});
assert.equal(freshBody.networkRequests,1);assert.equal(freshBody.db,2);assert.equal(freshBody.outputs[0],1);
const unchanged=cacheState('browser-caching',{policy:'no-cache',changed:false});assert.equal(unchanged.networkRequests,2);assert.equal(unchanged.bodyTransfers,1);
assert.equal(cacheState('browser-caching',{policy:'no-cache',changed:true}).bodyTransfers,2);
assert.equal(cacheState('browser-caching',{policy:'no-store'}).cache,null);
assert.equal(cacheState('application-caching',{location:'local',warmB:true,invalidate:true}).observed,1);
assert.equal(cacheState('application-caching',{location:'local',warmB:false}).observed,2);
assert.equal(cacheState('distributed-caching',{invalidate:false}).observed,1);
assert.equal(cacheState('distributed-caching',{invalidate:true}).observed,2);
assert.equal(cacheState('database-caching',{requests:3,enabled:true}).queries,3);
assert.equal(cacheState('database-caching',{requests:3,enabled:true}).dbReads,1);
assert.equal(cacheState('database-caching',{requests:3,enabled:false}).dbReads,3);
const accepted=cacheState('read-through-and-write-through',{fail:false});assert(accepted.ack);assert.equal(accepted.db,2);assert.equal(accepted.cache,2);
const rejected=cacheState('read-through-and-write-through',{fail:true});assert(!rejected.ack);assert.equal(rejected.db,1);
const lostQueue=cacheState('write-behind',{crash:true,durable:false,flush:true});assert(lostQueue.ack);assert.equal(lostQueue.db,1);assert.equal(lostQueue.pending.length,0);
assert.equal(cacheState('write-behind',{crash:true,durable:true,flush:true}).db,2);
assert.equal(cacheState('write-behind',{crash:true,durable:true,flush:false}).pending.length,1);
const boundary=cacheState('ttl',{ttl:30,interval:15,requests:3});assert.equal(boundary.dbReads,2);assert.equal(boundary.hits,1);assert.equal(boundary.time,30);
assert.equal(cacheState('cache-eviction-strategies',{policy:'LRU',capacity:3,sequence:'hot'}).hits,2);
assert.equal(cacheState('cache-eviction-strategies',{policy:'FIFO',capacity:3,sequence:'hot'}).hits,1);
assert.equal(cacheState('cache-eviction-strategies',{policy:'LFU',capacity:2,sequence:'hot'}).hits,2);
for(const policy of ['LRU','LFU','FIFO'])for(const capacity of [2,3,4])for(const sequence of ['hot','scan']){
 const sim=SD_SIM.build('s4-cache-eviction-strategies',{policy,capacity,sequence});
 for(const f of sim.frames){assert(f.state.slots.length<=capacity);assert.equal(new Set(f.state.slots.map(x=>x.key)).size,f.state.slots.length);}
 assert.equal(sim.frames.at(-1).state.hits+sim.frames.at(-1).state.misses,6);
}
assert.equal(cacheState('cache-invalidation',{invalidate:true,guard:false}).outputs[0],1);
assert.equal(cacheState('cache-invalidation',{invalidate:true,guard:true}).outputs[0],2);
assert.equal(cacheState('cache-consistency',{guard:false}).db,2);
assert.equal(cacheState('redis-fundamentals',{ttl:30,age:29}).observed,2);
assert.equal(cacheState('redis-fundamentals',{ttl:30,age:30}).observed,null);
assert.equal(cacheState('cache-failure-scenarios',{requests:6,coalesce:true,outage:false}).dbReads,1);
assert.equal(cacheState('cache-failure-scenarios',{requests:6,coalesce:false,outage:false}).dbReads,6);
assert.equal(cacheState('cache-failure-scenarios',{requests:6,outage:true,fallback:false}).dbReads,0);
// Live operations reuse a completed snapshot without mutating the previous trace.
let seed=cacheState('ttl',{ttl:30,requests:1});const original=JSON.stringify(seed);
seed=SDCacheSim.build('s4-ttl',{ttl:30,action:'write'},seed).frames.at(-1).state;
assert.equal(seed.db,2);assert.equal(seed.cache,1);
seed=SDCacheSim.build('s4-ttl',{ttl:30,action:'read'},seed).frames.at(-1).state;assert.equal(seed.outputs.at(-1),1);
seed=SDCacheSim.build('s4-ttl',{ttl:30,action:'advance'},seed).frames.at(-1).state;
seed=SDCacheSim.build('s4-ttl',{ttl:30,action:'advance'},seed).frames.at(-1).state;
seed=SDCacheSim.build('s4-ttl',{ttl:30,action:'read'},seed).frames.at(-1).state;assert.equal(seed.outputs.at(-1),2);assert.equal(seed.dbReads,2);
assert.equal(JSON.parse(original).db,1);
SDProgress.toggle('completed','dns');SDProgress.toggle('bookmarks','dns');SDProgress.data.current='dns';SDProgress.save();
SDProgress.data={completed:[],bookmarks:[],current:null};SDProgress.load();
assert(SDProgress.data.completed.includes('dns'));assert(SDProgress.data.bookmarks.includes('dns'));assert.equal(SDProgress.data.current,'dns');
assert(Progress.has('t-hash'));assert.equal(SDProgress.counts(1).done,1);
const planned=SD_TOPICS.find(t=>t.stage===5);SDProgress.toggle('completed',planned.id);assert(!SDProgress.data.completed.includes(planned.id));
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
console.log('Passed: '+scenarios+' simulation scenarios; 52 lesson contracts; prerequisite ordering; persistence; planned-topic guards; routes; player; '+algorithms+' DSA algorithms.');
`,context);
const built=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.equal(built,fs.readFileSync(path.join(root,'DSAViz.html'),'utf8'));
assert(!built.includes('<!--INCLUDE:'));
new vm.Script(built.match(/<script>([\s\S]*)<\/script>/)[1]);
console.log('Passed: identical GitHub Pages/offline bundles, resolved includes, merged JavaScript syntax.');
