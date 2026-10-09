/* Cache copies are visibly separate from authoritative data. All traffic is local model data. */
const SDCacheSim={
 build(id,o,seed=null){
  const nodes=[],frames=[];let elapsed=0;
  const s=seed?JSON.parse(JSON.stringify(seed)):{time:0,db:1,cache:null,expires:0,hits:0,misses:0,dbReads:0,dbWrites:0,outputs:[],slots:[],pending:[],a:null,b:null};
  delete s.outcome;
  const node=(id,label,kind='server')=>nodes.push({id,label,kind});
  const step=(from,to,packet,note,dt=10,change={})=>{elapsed+=dt;Object.assign(s,change);frames.push({from,to,packet,note,elapsed,state:JSON.parse(JSON.stringify(s))});};
  node('client','Browser','client');node('app','Application');node('cache',id==='s4-database-caching'?'Buffer pool':'Cache','database');node('db','Source database','database');
  const ttl=+o.ttl||30,latency=+o.latency||90;
  const fill=()=>step('app','cache','Store copy v'+s.db,'This cached value is a copy, with its own lifetime. Future source writes do not change it automatically.',8,{cache:s.db,expires:s.time+ttl});
  const source=()=>step('app','db','Read source','The authoritative source is contacted on this path; count this separately from cache lookups.',latency,{dbReads:s.dbReads+1});
  const read=(owner='app')=>{
   step('client',owner,'Read book:atlas','A new request enters the selected caching boundary.',15);
   if(o.enabled===false){source();step('app','client','Return source v'+s.db,'Caching is disabled, so every request takes the source path.',15,{outputs:[...s.outputs,s.db]});return;}
   step(owner,'cache','Look up book:atlas','A cache lookup can miss, hit, or fail. A stored entry is eligible only before its expiry.',5);
   if(s.cache!==null&&s.time<s.expires){step('cache',owner,'Hit: v'+s.cache,s.cache===s.db?'The eligible copy satisfies this request without a source read.':'The copy remains TTL-valid but differs from the current source. TTL validity is not a latest-value guarantee.',5,{hits:s.hits+1});step(owner,'client','Return cached v'+s.cache,'Record the value actually observed; later refresh cannot rewrite a completed response.',15,{outputs:[...s.outputs,s.cache]});}
   else {step('cache',owner,s.cache===null?'Miss':'Expired','This entry cannot satisfy the lookup. Expiration is different from capacity eviction.',5,{cache:null,misses:s.misses+1});source();fill();step(owner,'client','Return source v'+s.db,'The fetched value is returned and a copy is now available for later requests.',15,{outputs:[...s.outputs,s.db]});}
  };
  if(o.action&&seed){
   if(o.action==='advance')step('cache','cache','Advance 15 seconds','This changes model time, not source data. An expired copy stays visible in the ledger until the next lookup removes it.',0,{time:s.time+15});
   if(o.action==='write'){step('app','db','Write next source version','An independent writer changes the source. Invalidation is a separate configured operation.',latency,{db:s.db+1,dbWrites:s.dbWrites+1});if(o.invalidate)step('app','cache','Invalidate copy','The selected writer removes the old entry after its source commit.',5,{cache:null,expires:0});}
   if(o.action==='expire')step('app','cache','Remove cached entry','Manual removal makes the next lookup miss without modifying source data.',5,{cache:null,expires:0});
   if(o.action==='read')read();
  }else if(id==='s4-browser-caching'){
   const age=+o.age||0,maxAge=+o.maxAge||30;step('client','app','GET /cover.svg','The browser asks the origin for a public image. It has not received or stored the representation yet.',25,{bodyTransfers:0,networkRequests:1,policy:o.policy});
   step('app','client','200 + body v1','The response carries ETag "v1" and the selected Cache-Control policy.',25,{bodyTransfers:1});
   step('client','cache',o.policy==='no-store'?'Do not retain response':'Store response and validator','The browser applies the response storage policy at its local cache boundary.',5,{cache:o.policy==='no-store'?null:1,expires:o.policy==='no-store'?0:maxAge,etag:o.policy==='no-store'?null:'v1'});
   step('client','client','Advance '+age+' seconds','The browser evaluates freshness for a later request. no-cache permits storage but requires validation; no-store forbids this reuse.',0,{time:age,db:o.changed?2:1});
   if(o.policy==='max-age'&&age<maxAge)step('cache','client','Reuse fresh body','There is no modeled network request. Freshness permits reuse even when the unseen origin has changed.',0,{outputs:[1],outcome:'fresh reuse'});
   else if(o.policy==='no-store'){step('client','app','GET without cached validator','The earlier response is not retained for reuse under this policy.',25,{cache:null,networkRequests:2});step('app','client','200 + full body','Return the current representation without using the prior response.',25,{bodyTransfers:2,outputs:[s.db],outcome:'new body'});}
   else {step('client','app','If-None-Match: "v1"','The browser validates its stored representation. This is network work even when no body is resent.',25,{networkRequests:2});step('app','client',o.changed?'200 + body v2':'304 Not Modified',o.changed?'The validator differs, so the origin sends the new body.':'The origin confirms the cached body can be reused; 304 does not contain that full representation body.',25,{cache:s.db,bodyTransfers:o.changed?2:1,outputs:[s.db],outcome:o.changed?'new representation':'validated reuse'});}
  }else if(id==='s4-application-caching'||id==='s4-distributed-caching'){
   node('worker','Worker B');const shared=id==='s4-distributed-caching'||o.location==='shared';
   step('app','cache','Worker A loads v1','The first worker stores a copy either locally or in shared cache storage.',10,{cache:1,a:1,b:shared||o.warmB?1:null,expires:30});
   step('app','db','Source changes to v2','A source write does not automatically update worker-local copies.',latency,{db:2,dbWrites:1});
   if(o.invalidate)step('app','cache','Invalidate known copy','In shared mode one removal affects both workers’ subsequent lookups. Local removal on A leaves B’s independent state untouched.',5,{cache:null,a:null});
   step('client','worker','Read on Worker B','Observe the storage boundary available to the receiving worker.',15);
   const hit=shared?s.cache!==null:s.b!==null;if(hit)step('cache','worker','Read cached v1',shared?'A shared cache is not inherently up to date. The eligible entry can still contain the older source value.':'B retains its own v1 copy; invalidation on A did not remove it.',8,{hits:1,observed:1});
   else {step('worker','db','Miss → fetch source','B has no eligible value and fetches the current source.',latency,{dbReads:1,misses:1,observed:2,b:2});if(shared)step('worker','cache','Refill shared v2','The new shared copy becomes accessible to both workers.',8,{cache:2,a:2});}
   step('worker','client','Return v'+s.observed,'The worker returns what its lookup path actually produced.',15,{outputs:[s.observed],outcome:'Worker B returned v'+s.observed});
  }else if(id==='s4-database-caching'){
   const queries=+o.requests||3;for(let k=0;k<queries;k++){step('app','db','Execute SELECT id=42','Every query executes in the database. This buffer cache stores pages, not an automatically valid SQL-result cache.',10,{queries:k+1});step('db','cache','Request page P1','The executor requests a table page and still performs visibility and predicate work.',5);if(k===0||!o.enabled){step('cache','db','Read page from storage','A modeled cold page read reaches the storage layer represented by the database actor.',latency,{dbReads:s.dbReads+1});step('db','cache','Page arrives','The page becomes available to the buffer layer; retention is the selected policy.',5,{cache:o.enabled?1:null});}else step('cache','db','Resident page','A buffer hit avoids this modeled storage read, not query execution.',2,{hits:s.hits+1});step('db','app','Evaluate visible row','The predicate runs again for this query.',5,{outputs:[...s.outputs,1]});}
  }else if(id==='s4-read-through-and-write-through'){
   node('loader','Cache loader');step('client','app','Read cold key','In read-through, the application asks a cache facade; the facade owns miss loading.',15);step('app','cache','GET key','The entry is initially absent.',5,{misses:1});step('cache','loader','Invoke loader','The loader is a configured responsibility, not something every cache product implements automatically.',5);step('loader','db','Load v1','The facade obtains the authoritative value.',latency,{dbReads:1});step('loader','cache','Fill v1','The facade retains the result.',5,{cache:1});
   step('app','cache','Write-through v2','The facade coordinates this write with persistence before acknowledging success.',5);
   if(o.fail)step('cache','app','Persistence fails','This model returns failure and keeps the previous cache value. No successful write acknowledgement is issued.',latency,{ack:false,outcome:'write rejected; source v1'});
   else {step('cache','db','Persist v2','The source write succeeds before a success response.',latency,{db:2,dbWrites:1});step('db','cache','Update copy v2','The cache is updated under this simplified serialized facade operation.',5,{cache:2});step('cache','app','Acknowledge write','Only now does the model acknowledge both updates.',5,{ack:true,outcome:'write acknowledged; source v2'});}
  }else if(id==='s4-write-behind'){
   node('queue','Pending write queue');step('app','cache','Write cache v2','The cache accepts a new value before the source is updated.',5,{cache:2,pending:[2],ack:true});step('cache','app','Acknowledge early','The caller has success, while the authoritative source remains v1. Durability now depends on pending-write retention and recovery.',5);
   if(o.crash){step('cache','queue','Cache process crashes','A volatile queue loses its pending write; the durable-queue option retains it under this model’s crash assumptions.',10,{cache:null,pending:o.durable?[2]:[]});}
   if(s.pending.length&&o.flush){step('queue','db','Flush pending v2','The worker applies the queued version after early acknowledgement.',latency,{db:2,dbWrites:1,pending:[]});}
   step('db','app','Inspect persistent value','A fast acknowledgement and persisted source data are separate milestones.',10,{outcome:s.db===2?'pending write persisted':'source still v1'});
  }else if(id==='s4-cache-eviction-strategies'){
   const sequence=(o.sequence==='scan'?['A','B','C','D','A','B']:['A','B','A','C','D','A']),capacity=+o.capacity||3;let tick=0;
   for(const key of sequence){tick++;step('app','cache','GET '+key,'The workload’s recency and frequency influence the chosen policy.',5,{key});const hit=s.slots.find(x=>x.key===key);if(hit){hit.last=tick;hit.count++;step('cache','app','Hit '+key,'This entry remains resident.',5,{hits:s.hits+1});}
    else {step('app','db','Load '+key,'A miss fetches the value. Equal-sized entries make capacity a key count in this teaching model.',latency,{misses:s.misses+1,dbReads:s.dbReads+1});if(s.slots.length>=capacity){const victim=[...s.slots].sort((a,b)=>o.policy==='LFU'?a.count-b.count||a.last-b.last:o.policy==='FIFO'?a.created-b.created:a.last-b.last)[0];s.slots=s.slots.filter(x=>x!==victim);step('cache','cache','Evict '+victim.key,'This exact policy selects a victim under capacity pressure. Redis uses approximations for some policies.',5,{evicted:victim.key});}s.slots.push({key,last:tick,count:1,created:tick});step('db','cache','Store '+key,'Admission follows the modeled eviction decision.',5);}}
  }else if(id==='s4-redis-fundamentals'){
   step('app','cache','SET book:atlas 1 EX '+ttl,'A string key stores a value and expiry in one modeled SET operation.',5,{cache:1,expires:ttl});step('app','cache','INCR book:atlas','INCR is an atomic numeric-string command; it does not extend the key’s TTL.',5,{cache:2});step('cache','cache','Advance '+o.age+' seconds','Expiry is modeled by time. Redis uses both passive checks and active expiry work.',0,{time:+o.age||0});
   step('app','cache','GET book:atlas','GET returns the current string value if the key remains eligible.',5,{observed:s.time<s.expires?s.cache:null,cache:s.time<s.expires?s.cache:null});step('cache','app',s.observed===null?'nil':'"2"','A missing value is not an empty string. This local command model does not open Redis connections.',5,{outcome:s.observed===null?'key expired':'GET returned 2'});
  }else if(id==='s4-cache-failure-scenarios'){
   const requests=+o.requests||4;step('client','app',requests+' concurrent requests','A simultaneous cold miss or outage can send many callers toward the same source.',10,{cache:null});step('app','cache',o.outage?'Cache unreachable':'Cold key','An outage is not an ordinary missing key; the application chooses a fallback policy.',5,{failed:o.outage?'cache':''});
   if(o.outage&&!o.fallback)step('app','client','Unavailable','The selected policy fails closed rather than querying the source.',5,{outcome:'requests rejected',rejected:requests});
   else {const loads=o.coalesce?1:requests;for(let k=0;k<loads;k++)step('app','db','Source fetch '+(k+1),'Request coalescing lets this group share one in-flight load; without it all modeled requests independently fetch.',latency,{dbReads:s.dbReads+1});if(!o.outage)fill();step('app','client','Return to waiting callers','Coalescing reduces duplicate work but still needs cancellation, timeout, and error handling in a production design.',10,{outputs:Array(requests).fill(s.db),outcome:loads+' source loads for '+requests+' callers'});}
  }else if(id==='s4-cache-invalidation'||id==='s4-cache-consistency'){
   step('app','db','Reader starts miss load','Reader R observes source v1 but has not yet published its cache fill.',latency,{dbReads:1,inFlight:1});step('app','db','Writer commits v2','A concurrent writer updates the source.',latency,{db:2,dbWrites:1});if(o.invalidate)step('app','cache','Writer invalidates key','Deleting the key does not cancel the older reader’s in-flight result.',5,{cache:null});
   if(o.guard)step('app','cache','Reject late v1 fill','The conceptual generation guard detects that the load began before the writer’s generation change. This requires a correctly coordinated protocol.',5,{cache:null,inFlight:null});else step('app','cache','Late reader fills v1','The older result repopulates the cache after the write and invalidation.',5,{cache:1,expires:ttl,inFlight:null});read();
  }else{
   const count=+o.requests||3;for(let k=0;k<count;k++){if(k&&id==='s4-ttl')step('cache','cache','Advance request interval','TTL is measured from insertion; reads in this model do not refresh it.',0,{time:s.time+(+o.interval||15)});read();}
  }
  step('app','app','Experiment summary','These counters and versions belong to a conceptual model. Cache validity, latest-source freshness, and durability are different guarantees.',0,{outcome:s.outcome||s.hits+' hits / '+s.misses+' misses; source reads '+s.dbReads});
  return {nodes,frames};
 }
};
