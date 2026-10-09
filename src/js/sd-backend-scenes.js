/* Backend scenes expose internal state: counters, leases, gates, stores, and deadlines. */
const SDBackendScene = {
 render(id,sim,i,p,o,small){
  const w=small?420:880,h=small?660:550,s=SDScene.state(sim.frames,i,p),f=sim.frames[i],positions={};
  sim.nodes.forEach((n,k)=>positions[n.id]={x:small?[65,210,355][k%3]:80+k*(720/Math.max(1,sim.nodes.length-1)),y:small?90+Math.floor(k/3)*155:115});
  const edges=new Set(),t=(x,y,v,cls='scene-small',anchor='middle')=>SDScene.text(x,y,v,cls,anchor);
  let svg='';
  for(const frame of sim.frames)if(frame.from!==frame.to){const key=[frame.from,frame.to].sort().join('|');if(edges.has(key))continue;edges.add(key);const a=positions[frame.from],b=positions[frame.to];svg+=`<path class="scene-link" d="M${a.x} ${a.y}L${b.x} ${b.y}"/>`;}
  const a=positions[f.from],b=positions[f.to],path=f.from===f.to?null:SDScene.motionPath(a,b,small);
  if(path)svg+=`<path class="scene-route" d="M${a.x} ${a.y}L${b.x} ${b.y}"/>`;
  for(const n of sim.nodes){let badge='';
   if(n.id==='client')badge=s.status||'waiting';
   if(id==='s2-stateless-and-stateful-architecture'){if(n.id==='a')badge=s.localA||'empty';if(n.id==='b')badge=s.localB||'empty';if(n.id==='store')badge=o.storage==='shared'?s.cart||'empty':'not used';}
   if(id==='s2-authentication-and-authorization'){if(n.id==='auth')badge=s.identity||'unverified';if(n.id==='policy')badge=s.access||'unchecked';}
   if(id==='s2-cookies-and-sessions'){if(n.id==='jar')badge=s.cookie||'empty';if(n.id==='store')badge=s.session||'absent';}
   if(n.id==='store'&&id==='s2-application-servers')badge=s.stock===undefined?'stock '+o.stock:'stock '+s.stock;
   svg+=SDScene.actor(n,positions[n.id],n.id===f.from||n.id===f.to,s.failed===n.id,small,badge);
  }
  const y=small?350:270;
  const panel=(title,body)=>`<g class="scene-internal backend-panel"><rect x="15" y="${y}" width="${w-30}" height="${h-y-30}" rx="16"/>${t(30,y+28,title,'scene-small','start')}${body}</g>`;
  const cells=(items)=>items.map(([title,value,good],k)=>{
   const cols=small?2:Math.min(items.length,4),cw=(w-60)/cols,x=30+(k%cols)*cw,cy=y+52+Math.floor(k/cols)*92;
   return `<g class="backend-cell ${good?'is-good':''}"><rect x="${x+4}" y="${cy}" width="${cw-12}" height="76" rx="10"/>${t(x+cw/2,cy+24,title)}${t(x+cw/2,cy+54,value,'backend-value')}</g>`;
  }).join('');
  let body='';
  if(id==='s2-connection-pooling'){
   const busy=s.busy||Array(+o.size).fill('idle'),waiting=s.waiting||[],done=s.done||[],expired=s.timedOut||[],gap=(w-40)/busy.length;
   body=busy.map((r,k)=>{const x=20+k*gap;return `<g class="pool-lease ${r!=='idle'?'occupied':''}"><rect x="${x+5}" y="${y+55}" width="${gap-10}" height="85" rx="10"/>${t(x+gap/2,y+79,'CONNECTION '+(k+1))}${t(x+gap/2,y+112,r,'backend-value')}</g>`;}).join('');
   body+=t(30,y+164,'FIFO WAIT: '+(waiting.length?waiting.join(' · '):'empty'),'scene-small','start');
   body+=t(30,y+191,'DONE: '+(done.length?done.join(' · '):'none'),'scene-small','start');
   body+=t(30,y+218,'EXPIRED: '+(expired.length?expired.join(' · '):'none'),'scene-small','start');
   body+=t(30,y+244,'Model time '+(s.modelTime||0)+' ms · query '+o.work+' ms','scene-small','start');
   svg+=panel('BORROW → QUERY → RELEASE',body);
  }else if(id==='s2-cookies-and-sessions'){
   const expired=(s.age||0)>=+o.ttl,age=Math.min(1,(s.age||0)/+o.ttl),span=w-70;
   body=cells([['COOKIE',s.cookie||'empty',s.cookie==='sent'],['SERVER RECORD',s.session||'absent',s.session==='active']]);
   body+=t(35,y+166,'Session age '+(s.age||0)+'s / lifetime '+o.ttl+'s','scene-small','start');
   body+=`<rect class="backend-track" x="35" y="${y+182}" width="${span}" height="14" rx="7"/><rect class="backend-fill ${expired?'expired':''}" x="35" y="${y+182}" width="${Math.max(1,span*age)}" height="14" rx="7"/>`;
   body+=t(35,y+227,s.attributes||'Attributes arrive with Set-Cookie','scene-small','start');svg+=panel('TWO STORES, TWO RULES',body);
  }else if(id==='s2-authentication-and-authorization')svg+=panel('IDENTITY ≠ PERMISSION',cells([['SUBJECT',s.identity||'unverified',s.identity==='Alice'],['OWNER',s.owner||o.owner,false],['POLICY',s.access||'unchecked',s.access==='allowed'],['PRIVATE READS',s.reads||0,false]]));
  else if(id==='s2-rest-and-graphql')svg+=panel('COUNT THE TWO BOUNDARIES',cells([['CLIENT REQUESTS',s.requests||0,false],['DATA READS',s.reads||0,false],['SELECTION',o.orders?'name + orders':'name',true],['ORDER FETCH',o.batch?'batched':'three reads',!!o.batch]]));
  else if(id==='s2-stateless-and-stateful-architecture')svg+=panel('STATE DOES NOT FOLLOW A ROUTE BY MAGIC',cells([['A MEMORY',s.localA||'empty',s.localA==='Atlas'],['B MEMORY',s.localB||'empty',false],['STORAGE',o.storage,false],['READ RESULT',s.outcome?s.cart:'pending',s.outcome==='cart preserved']]));
  else if(id==='s2-api-gateways')svg+=panel('ONE IDENTITY · ONE FIXED WINDOW',cells([['ADMITTED',s.allowed||0,true],['REJECTED',s.rejected||0,false],['ALLOWANCE',o.limit,false],['USED',s.used||0,false]]));
  else if(id==='s2-request-lifecycle'){
   body=cells([['TRACE',s.trace||'not assigned',true],['PHASE',s.phase||'waiting',s.phase==='committed'],['WRITES',s.writes||0,s.writes===1],['CLIENT',s.status||'waiting',s.status==='201 Created']]);
   if(!small)body+=t(w/2,y+185,'Handler budget '+o.timeout+' ms · persistence '+o.work+' ms','scene-small');svg+=panel('ONE TRACE, DIFFERENT LIFETIMES',body);
  }else if(id==='s2-reverse-proxies')svg+=panel('CONFIGURED ROUTE TABLE',cells([['/books','catalog',s.route==='catalog'],['/images/cover','media',s.route==='media'],['PUBLIC LEG','HTTPS',true],['UPSTREAM',s.failed?'failed':s.phase||'pending',!s.failed]]));
  else if(id==='s2-web-servers')svg+=panel('ROUTE → HANDLER → REPRESENTATION',cells([['PATH',s.route||o.path,false],['HANDLER',s.handler||'pending',true],['MEDIA TYPE',s.mime||'pending',false],['STATUS',s.status||'pending',s.status==='200 OK']]));
  else if(id==='s2-application-servers')svg+=panel('RESERVATION INVARIANT',cells([['QUANTITY',s.requested||o.quantity,false],['STOCK',s.stock===undefined?o.stock:s.stock,false],['ORDERS',s.orders||0,s.orders===1],['RESULT',s.status||'pending',s.status==='201 Created']]));
  else if(id==='s2-apis')svg+=panel('ROUTE → SCHEMA → WRITE',cells([['VERSION',s.version||o.version,false],['INPUT',s.payload||'pending',o.payload==='valid'],['WRITES',s.writes||0,s.writes===1],['RESULT',s.status||'pending',s.status==='201 Created']]));
  if(path)svg+=`<g id="scenePacket" class="scene-packet" transform="translate(${path.x1} ${path.y1})"><circle r="12" class="packet-halo"/><rect x="-9" y="-6" width="18" height="12" rx="3"/><path d="M-8-5L0 1 8-5"/></g>`;
  else svg+=`<circle id="scenePulse" class="scene-pulse" cx="${a.x}" cy="${a.y}" r="52"/>`;
  return {html:`<svg class="lab-scene" viewBox="0 0 ${w} ${h}" role="group" aria-label="Interactive ${esc(id)} backend simulation">${svg}</svg>`,path};
 }
};
