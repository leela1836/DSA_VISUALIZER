/* Deterministic event schedule: completions at time t precede arrivals at t. */
const SDScaleSim={
 build(id,o){
  const nodes=[{id:'client',label:'Clients',kind:'client'},{id:'lb',label:'Load balancer',kind:'server'}],frames=[];
  const s={time:0,offered:0,completed:0,rejected:0,errors:0,queue:0,workers:[],jobs:[],history:[],dbWait:0};
  const add=(id,label,kind='server')=>nodes.push({id,label,kind});
  const frame=(time,from,to,packet,note,change={})=>{Object.assign(s,change,{time});frames.push({from,to,packet,note,elapsed:time,state:JSON.parse(JSON.stringify(s))});};
  if(id==='s5-content-delivery-networks'){
   nodes.splice(1,1);add('edgeA','Edge A','cache');add('edgeB','Edge B','cache');add('origin','Origin asset','database');s.origin=1;s.edges={edgeA:null,edgeB:null};s.originReads=0;s.hits=0;s.outputs=[];
   let time=0;const read=(edge,age)=>{frame(time+=10,'client',edge,'GET /poster.svg','The selected delivery edge checks its own representation and deadline.',{age});const entry=s.edges[edge];if(o.enabled&&entry&&age<entry.expires){frame(time+=10,edge,'client','Edge hit v'+entry.version,'This eligible copy avoids an origin fetch; eligibility is not proof of latest-source content.',{hits:s.hits+1,completed:s.completed+1,outputs:[...s.outputs,entry.version]});}else{frame(time+=40,edge,'origin','Origin fetch','A cold, expired, or disabled edge follows the origin path.',{originReads:s.originReads+1});const edges=JSON.parse(JSON.stringify(s.edges));edges[edge]=o.enabled?{version:s.origin,expires:age+(+o.ttl)}:null;frame(time+=40,'origin',edge,'Body v'+s.origin,'Store this public representation only at the requesting edge when caching is enabled.',{edges});frame(time+=10,edge,'client','Deliver v'+s.origin,'Record what the caller actually received.',{completed:s.completed+1,outputs:[...s.outputs,s.origin]});}};
   read('edgeA',0);frame(time+=5,'origin','origin',o.changed?'Publish v2':'Keep v1','Updating the origin is independent of retained edge copies.',{origin:o.changed?2:1});read('edgeB',0);read('edgeA',+o.age);frame(time,'client','client','Compare edges','B’s refresh does not change A. Inspect the returned sequence and origin-fetch count.',{outcome:s.outputs.join(' → ')});return {nodes,frames};
  }
  if(['s5-autoscaling','s5-traffic-spikes','s5-capacity-planning'].includes(id)){
   const auto=id==='s5-autoscaling',plan=id==='s5-capacity-planning';if(auto)add('controller','Scaling controller');
   const configured=auto?1:+o.servers,readyInitial=plan&&o.failure?Math.max(0,configured-1):configured;let ready=readyInitial,desired=ready,pendingAt=null;
   for(let i=0;i<4;i++)add('w'+i,'Worker '+String.fromCharCode(65+i));
   const recommendation=Math.ceil(+o.rate/(+o.capacity*(+o.target||100)/100))+(plan&&o.reserve?1:0);
   for(let tick=0;tick<8;tick++){
    if(pendingAt!==null&&tick>=pendingAt){ready=desired;pendingAt=null;frame(tick*1000,'controller','lb','Workers ready','Only now may routing use newly requested capacity.',{ready,desired,pendingAt});}
    const arrivals=plan?+o.rate:tick>=1&&tick<=3?+o.rate:2;
    const offered=s.offered+arrivals;let admitted=arrivals,rejected=0;if(!auto&&!plan&&o.bounded){admitted=Math.min(arrivals,Math.max(0,+o.limit-s.queue));rejected=arrivals-admitted;}
    const before=s.queue+admitted;frame(tick*1000,'client','lb','Arrivals +'+arrivals,'Offer work, apply the outstanding admission bound if configured, and keep rejected units distinct.',{offered,queue:before,rejected:s.rejected+rejected,ready,desired,recommendation,pendingAt});
    if(auto){const requested=Math.min(4,Math.max(ready,Math.ceil(arrivals/(+o.capacity*(+o.target/100)))));if(requested>desired){desired=requested;pendingAt=tick+(+o.startup);frame(tick*1000,'lb','controller','Request '+desired+' workers','The simplified rate controller requests capacity. Readiness has its own deadline.',{desired,pendingAt});if(+o.startup===0){ready=desired;pendingAt=null;frame(tick*1000,'controller','lb','Ready immediately','This selected scenario has zero modeled startup delay.',{ready,pendingAt});}}}
    let done=Math.min(before,ready*(+o.capacity));const workers=Array.from({length:4},(_,i)=>({id:'w'+i,ready:i<ready,assigned:i<ready?Math.min(+o.capacity,Math.max(0,done-i*(+o.capacity))):0,completed:i<ready?Math.min(+o.capacity,Math.max(0,done-i*(+o.capacity))):0,outstanding:0}));
    const history=[...s.history,{tick,arrivals,ready,desired,queue:before-done,done,rejected}];frame((tick+1)*1000,'lb','client','Complete '+done+' units','Tick service uses ready workers only. The remaining queue carries into the next tick.',{queue:before-done,completed:s.completed+done,workers,history,ready,desired});
   }
   frame(8000,'lb','lb','Inspect capacity','Tick units are aggregated work, not individual latency percentiles.',{outcome:s.completed+' completed / '+s.queue+' queued / '+s.rejected+' rejected'});return {nodes,frames};
  }
  const session=id==='s5-session-affinity',health=id==='s5-health-checks'||(['s5-load-balancing','s5-load-balancing-algorithms'].includes(id)&&!!o.failure),vertical=id==='s5-vertical-scaling';
  const count=session?2:vertical?1:(+o.servers||1),n=+o.requests||6,service=+o.service||40,gap=session?80:(+o.gap||0),db=+o.db||0;
  if(db)add('db','Shared database','database');
  for(let i=0;i<count;i++){add('w'+i,'Backend '+String.fromCharCode(65+i));s.workers.push({id:'w'+i,assigned:0,completed:0,outstanding:0,ready:true,available:!(health&&i===0),session:i===0});}
  const events=[];let order=0,rr=0,dbFree=0;const free=Array(count).fill(0);
  const event=(time,priority,fn)=>events.push({time,priority,order:order++,fn});
  frame(0,'lb','lb','Initialize routing','Workers have independent slots. Assignment and successful completion are separate counters.',{ready:count});
  if(health)event(+o.detect||0,0,()=>{s.workers[0].ready=false;frame(+o.detect||0,'lb','w0','Failed health result','A was already down; the router has now excluded it. Failed operations are not retried.',{ready:count-1});});
  for(let k=0;k<n;k++){const arrival=k*gap;event(arrival,2,()=>{
   if(session&&o.failure&&k===1){s.workers[0].available=false;s.workers[0].ready=false;frame(arrival,'lb','w0','A becomes unavailable','A leaves the routing set; its private session is not copied.',{ready:1});}
   frame(arrival,'client','lb','Request R'+(k+1),'The request arrives before backend selection.',{offered:s.offered+1});
   const eligible=s.workers.filter(w=>w.ready);if(!eligible.length){frame(arrival,'lb','client','No backend: reject','No eligible worker can accept this operation.',{errors:s.errors+1,rejected:s.rejected+1});return;}
   let chosen;
   if(session&&o.sticky)chosen=eligible.find(w=>w.id==='w0')||eligible[0];
   else if(o.algorithm==='least-outstanding')chosen=[...eligible].sort((a,b)=>a.outstanding-b.outstanding)[0];
   else {const turns=o.algorithm==='weighted'?eligible.flatMap(w=>w.id==='w0'?[w,w]:[w]):eligible;chosen=turns[rr++%turns.length];}
   const index=+chosen.id.slice(1);chosen.assigned++;chosen.outstanding++;
   const job={id:k+1,worker:chosen.id,arrival,start:null,cpuEnd:null,finish:null,status:'queued',cpuWait:0,dbWait:0,latency:null};s.jobs.push(job);
   frame(arrival,'lb',chosen.id,'Assign R'+(k+1),'This policy assigns new work; existing queued requests stay with their selected worker.');
   if(!chosen.available){event(arrival+15,0,()=>{chosen.outstanding--;job.status='failed';job.finish=arrival+15;job.latency=15;frame(arrival+15,chosen.id,'client','Backend failure','A was eligible but unavailable. No replay is assumed.',{errors:s.errors+1});});return;}
   const duration=vertical?service*((+o.serial/100)+(1-(+o.serial/100))/(+o.multiplier)):service*(o.slow&&index===0?3:1);
   const start=Math.max(arrival,free[index]),cpuEnd=start+duration;free[index]=cpuEnd;job.start=start;job.cpuEnd=cpuEnd;job.cpuWait=start-arrival;
   event(start,1,()=>{job.status='cpu';frame(start,chosen.id,chosen.id,'Execute R'+(k+1),'The selected execution slot is now available. Earlier waiting is recorded separately.');});
   event(cpuEnd,0,()=>{
    const finish=(at,from)=>{event(at,0,()=>{chosen.outstanding--;const recognized=!session||o.shared||chosen.session;job.status=recognized?'done':'session missing';job.finish=at;job.latency=at-arrival;if(recognized){chosen.completed++;s.completed++;}else s.errors++;frame(at,from,'client',recognized?'Response R'+(k+1):'Session not found','The observed response belongs to this request; another worker’s private memory is not inherited.');});};
    if(db){job.status='db queue';const dbStart=Math.max(cpuEnd,dbFree),end=dbStart+db;dbFree=end;job.dbWait=dbStart-cpuEnd;s.dbWait+=job.dbWait;frame(cpuEnd,chosen.id,'db','R'+(k+1)+' joins DB','CPU capacity is released. The shared dependency can still retain waiting work.');event(dbStart,1,()=>{job.status='db';frame(dbStart,'db','db','Database R'+(k+1),'The single teaching dependency slot starts this operation.');});finish(end,'db');}
    else finish(cpuEnd,chosen.id);
   });
  });}
  while(events.length){events.sort((a,b)=>a.time-b.time||a.priority-b.priority||a.order-b.order);const e=events.shift();e.fn();}
  frame(s.time,'lb','lb','Compare outcomes','Count only useful completions as success. Model latencies include waiting and service.',{outcome:s.completed+' completed / '+s.errors+' failed',maxLatency:Math.max(0,...s.jobs.map(j=>j.latency||0))});return {nodes,frames};
 }
};
