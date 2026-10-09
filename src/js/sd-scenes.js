/* Purpose-built scenes share actors and a moving packet, not a generic node grid. */
const SDScene = {
 icon(kind){
  if(kind==='client')return '<rect x="-22" y="-16" width="44" height="29" rx="3"/><path d="M-28 19H28M-9 13V19M9 13V19"/>';
  if(kind==='database')return '<ellipse cy="-13" rx="23" ry="7"/><path d="M-23-13V14C-23 24 23 24 23 14V-13M-23 0C-23 10 23 10 23 0"/>';
  if(kind==='router')return '<rect x="-24" y="-12" width="48" height="27" rx="5"/><path d="M-10-12V-24M10-12V-24M-13 2H13M-6-5L-13 2-6 9M6-5L13 2 6 9"/>';
  if(kind==='dns')return '<circle r="22"/><ellipse rx="10" ry="22"/><path d="M-21-7H21M-21 7H21"/>';
  if(kind==='resource')return '<path d="M-17-23H8L20-11V23H-17ZM8-23V-11H20M-9 0H12M-9 8H12M-9 16H5"/>';
  return '<rect x="-25" y="-21" width="50" height="17" rx="3"/><rect x="-25" y="4" width="50" height="17" rx="3"/><path d="M-16-12H-6M-16 12H-6"/><circle cx="16" cy="-12" r="2"/><circle cx="16" cy="12" r="2"/>';
 },
 text(x,y,value,cls='scene-label',anchor='middle'){return `<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${esc(value)}</text>`;},
 state(frames,i,progress){const s={};for(let n=0;n<=i-(progress<1?1:0);n++)Object.assign(s,frames[n].state);s.failed=frames[i].state.failed||'';return s;},
 actor(n,p,active,failed,small,badge=''){
  const w=small?94:138;
  const words=n.label.split(' '),lines=[];let line='';for(const word of words){if((line+' '+word).trim().length>(small?15:21)&&line){lines.push(line);line=word;}else line=(line+' '+word).trim();}if(line)lines.push(line);
  return `<g class="scene-actor ${active?'active':''} ${failed?'failed':''}" data-actor="${n.id}" role="button" tabindex="0" aria-label="Inspect ${esc(n.label)}" transform="translate(${p.x} ${p.y})"><rect class="actor-card" x="${-w/2}" y="-54" width="${w}" height="${90+Math.max(0,lines.length-1)*15}" rx="15"/><g class="actor-icon" transform="translate(0 -20)">${this.icon(n.kind)}</g>${lines.map((l,i)=>this.text(0,23+i*15,l)).join('')}${badge?this.text(0,66,badge,'scene-badge'):''}${failed?'<circle class="failure-dot" cx="35" cy="-44" r="12"/><text x="35" y="-39" text-anchor="middle" class="failure-cross">×</text>':''}</g>`;
 },
 layout(id,nodes,small){
  const width=small?420:880,positions={};let height=440;
  const place=(id,x,y)=>positions[id]={x:small?x[0]:x[1],y:small?y[0]:y[1]};
  if(id==='dns'){
   height=small?510:470;
   place('browser',[66,100],[88,130]);place('os',[66,100],[235,310]);place('resolver',[205,395],[235,220]);
   place('root',[350,750],[88,90]);place('tld',[350,750],[235,235]);place('auth',[350,750],[385,380]);
  } else if(id==='internet'){
   height=small?490:440;
   const map=small?{client:[60,85],gateway:[200,85],isp:[340,85],transit:[340,235],edge:[200,235],server:[60,235],alternate:[340,395],backup:[200,395]}:{client:[85,130],gateway:[255,130],isp:[425,130],transit:[595,130],edge:[765,130],server:[765,335],alternate:[425,335],backup:[595,335]};
   Object.entries(map).forEach(([id,[x,y]])=>positions[id]={x,y});
  } else if(id==='browser-server'){
   height=small?490:390;nodes.forEach((n,i)=>positions[n.id]={x:small?[80,210,340][i%3]:95+i*172,y:small?115+Math.floor(i/3)*185:150});
  } else if(id==='ip-ports'){
   height=small?470:410;place('client',[75,130],[110,195]);place('host',[210,385],[110,195]);place('https',[335,710],[275,100]);place('closed',[120,710],[275,285]);
  } else if(id==='http-lifecycle'||id==='http-semantics'||id==='tcp-udp'){
   height=small?490:450;nodes.forEach((n,i)=>positions[n.id]={x:small?[65,210,355][i]:[125,440,755][i],y:small?95:125});
  } else if(id==='http-versions'){
   height=small?490:440;place('client',[80,160],[90,100]);place('server',[340,720],[90,100]);
   ['a','b','c'].forEach((id,i)=>positions[id]={x:small?80+i*130:180+i*260,y:small?260:270});
  } else {nodes.forEach((n,i)=>positions[n.id]={x:small?(i?340:80):(i?720:160),y:small?110:135});height=small?470:450;}
  return {width,height,positions};
 },
 links(id){return ({dns:[['browser','os'],['os','resolver'],['resolver','root'],['resolver','tld'],['resolver','auth']],internet:[['client','gateway'],['gateway','isp'],['isp','transit'],['transit','edge'],['edge','server'],['isp','alternate'],['alternate','backup'],['backup','edge']],'ip-ports':[['client','host'],['host','https'],['host','closed']],'client-server':[['client','server']],'tcp-udp':[['sender','network'],['network','receiver']],tls:[['browser','server']],'http-lifecycle':[['browser','app'],['app','store']],'http-semantics':[['client','api'],['api','store']],'http-versions':[['client','server'],['server','a'],['server','b'],['server','c']],websockets:[['browser','server']],'browser-server':[['browser','dns'],['browser','server'],['browser','parser'],['parser','paint']]})[id]||[];},
 render(id,simulation,i,progress=1,options={},small=false){
  if(id.startsWith('s4-'))return SDCacheScene.render(id,simulation,i,progress,options,small);
  if(id.startsWith('s3-'))return SDStorageScene.render(id,simulation,i,progress,options,small);
  if(id.startsWith('s2-'))return SDBackendScene.render(id,simulation,i,progress,options,small);
  const f=simulation.frames[i],s=this.state(simulation.frames,i,progress);
  if(id==='tcp-handshake')return this.handshake(simulation,i,progress,small,s);
  const {width,height,positions}=this.layout(id,simulation.nodes,small);
  const routePath=(from,to)=>id==='internet'&&small&&from==='isp'&&to==='alternate'?`M340 85H403V395H340`:`M${positions[from].x} ${positions[from].y}L${positions[to].x} ${positions[to].y}`;
  let scene=this.links(id).map(([a,b])=>`<path class="scene-link ${s.failed===a||s.failed===b?'broken':''}" d="${routePath(a,b)}"/>`).join('');
  const a=positions[f.from],b=positions[f.to];
  if(a&&b&&f.from!==f.to)scene+=`<path class="scene-route" d="${routePath(f.from,f.to)}"/>`;
  const visited=new Set(simulation.frames.slice(0,i+1).flatMap(f=>[f.from,f.to]));
  for(const n of simulation.nodes){
   let badge='';
   if(id==='dns'&&['browser','os','resolver'].includes(n.id)){
    const level={browser:'browser',os:'OS',resolver:'resolver'}[n.id];
    badge=options.cache===level?'cache valid':visited.has(n.id)?'checked':'not queried';
   }
   if(id==='http-versions'&&['a','b','c'].includes(n.id))badge=String(s.available).includes(n.id.toUpperCase())?'ready':String(s.buffered).includes(n.id.toUpperCase())?'buffered':'waiting';
   if(id==='websockets')badge=s.channel||'not connected';
   if(id==='client-server')badge=n.id==='client'?(s.phase==='client received'?'forecast ready':'waiting for forecast'):s.phase==='server received'?'processing':s.phase==='response ready'?'response ready':'ready';
   scene+=this.actor(n,positions[n.id],n.id===f.from||n.id===f.to,s.failed===n.id,small,badge);
  }
  scene+=this.internals(id,s,simulation,i,options,small,width,height);
  const path=this.motionPath(a,b,small);
  if(path&&id==='internet'&&small&&f.from==='isp'&&f.to==='alternate')Object.assign(path,{x1:387,y1:85,x2:387,y2:395,points:[[387,85],[403,85],[403,395],[387,395]]});
  if(path)scene+=`<g id="scenePacket" class="scene-packet" transform="translate(${path.x1} ${path.y1})"><circle r="12" class="packet-halo"/><rect x="-9" y="-6" width="18" height="12" rx="3"/><path d="M-8-5L0 1 8-5"/></g>`;
  if(f.from===f.to)scene+=`<circle id="scenePulse" class="scene-pulse" cx="${a.x}" cy="${a.y}" r="52"/>`;
  return {html:`<svg viewBox="0 0 ${width} ${height}" class="lab-scene" role="group" aria-label="Interactive ${esc(id)} simulation">${scene}</svg>`,path};
 },
 motionPath(a,b,small){
  if(!a||!b||a===b)return null;
  const dx=b.x-a.x,dy=b.y-a.y,inset=Math.min(dx?(small?51:75)/Math.abs(dx):Infinity,dy?55/Math.abs(dy):Infinity,.35);
  return {x1:a.x+dx*inset,y1:a.y+dy*inset,x2:b.x-dx*inset,y2:b.y-dy*inset};
 },
 motionAt(path,p){
  if(!path.points)return {x:path.x1+(path.x2-path.x1)*p,y:path.y1+(path.y2-path.y1)*p};
  const lengths=path.points.slice(1).map(([x,y],i)=>Math.hypot(x-path.points[i][0],y-path.points[i][1]));let distance=p*lengths.reduce((sum,n)=>sum+n,0);
  for(let i=0;i<lengths.length;i++){if(distance<=lengths[i]||i===lengths.length-1){const t=lengths[i]?distance/lengths[i]:0,[a,b]=[path.points[i],path.points[i+1]];return {x:a[0]+(b[0]-a[0])*t,y:a[1]+(b[1]-a[1])*t};}distance-=lengths[i];}
 },
 internals(id,s,sim,i,o,small,w,h){
  const text=(x,y,t,cls,anchor)=>this.text(x,y,t,cls,anchor);let out='';
  const panel=(title,y,body)=>`<g class="scene-internal"><rect x="${small?15:35}" y="${y}" width="${w-(small?30:70)}" height="${small?100:108}" rx="12"/>${text(small?30:55,y+25,title,'scene-small','start')}${body}</g>`;
  if(id==='tcp-udp'){
   const delivered=String(s.delivered||''),buffered=String(s.buffered||'');
   out+=panel('RECEIVER: ARRIVED VS. READABLE',small?255:260,['A','B','C'].map((letter,j)=>{
    const x=(small?115:270)+j*(small?88:135),ready=delivered.includes(letter),held=buffered.includes(letter);
    return `<g class="data-cell ${ready?'ready':held?'held':''}"><rect x="${x-25}" y="${small?298:302}" width="50" height="40" rx="6"/>${text(x,small?324:328,letter,'data-letter')}${text(x,small?357:361,ready?'delivered':held?'buffered':'missing','scene-small')}</g>`;
   }).join(''));
   out+=text(w/2,h-20,o.transport==='TCP'?'Ordered byte stream: the application cannot jump a gap.':'Independent datagrams: no built-in recovery.','scene-small');
  } else if(id==='tls'){
   const phase=sim.frames[i].packet,validated=s.status==='server authenticated'||String(s.protected).includes('application')||s.protected==='HTTP encrypted',rejected=s.status==='validation failed';
   out+=panel('IDENTITY GATE',small?265:280,`<g class="certificate ${rejected?'rejected':validated?'validated':''}"><rect x="${small?30:60}" y="${small?305:320}" width="${small?200:420}" height="45" rx="6"/>${text(small?45:78,small?332:347,'CN: library.example.com','scene-small','start')}${text(small?300:680,small?331:347,rejected?'× REJECTED':validated?'✓ VERIFIED':'CHECKING','scene-small')}</g>`);
   out+=text(w/2,small?425:415,rejected?'HTTP stays behind the gate.':validated?'Identity verified → application data allowed.':phase==='ClientHello'?'Negotiating keys; identity is not verified yet.':'Handshake keys protect messages; identity still needs checking.','scene-small');
  } else if(id==='http-lifecycle'){
   out+=panel('RESPONSE ENVELOPE',small?255:260,text(small?30:55,small?310:315,s.status==='503'?'503 Service Unavailable':s.status==='200'?'200 OK':'Waiting for response…','scene-label','start')+text(small?30:55,small?337:342,s.body?String(s.body):'Accept: application/json','scene-small','start'));
  } else if(id==='http-semantics'){
   out+=panel('PERSISTED RESOURCE STATE',small?255:260,Array.from({length:Math.max(1,Number(s.count??1))},(_,j)=>{const x=(small?70:170)+j*(small?95:165);return `<g class="resource-tile ${s.present===false?'removed':''}"><rect x="${x-27}" y="${small?301:304}" width="55" height="45" rx="7"/>${text(x,small?329:332,s.present===false?'×':String(42+j),'data-letter')}</g>`;}).join(''));
   out+=text(w/2,h-30,`Records: ${s.count??1} · ${s.status||'initial state'}`,'scene-label');
  } else if(id==='http-versions'){
   out+=text(w/2,small?407:382,o.version==='3'?'QUIC: separate stream ordering':'TCP: one ordered connection byte stream','scene-label');
   out+=text(w/2,h-20,s.buffered==='B,C'?'B and C arrived, but TCP has not exposed them.':`Readable resources: ${s.available||'none'}`,'scene-small');
  } else if(id==='websockets'){
   out+=panel('CONVERSATION',small?270:280,text(small?30:55,small?315:325,s.delivered==='client message'||s.delivered==='server push'||s.delivered==='no server push'?'You: hello':'Opening the conversation…','scene-small','start')+text(small?30:55,small?344:352,s.delivered==='server push'?'Server: new comment':s.delivered==='no server push'?'× Update not delivered':'Server update has not arrived','scene-small','start'));
  } else if(id==='client-server'){
   const work=Math.max(0,+o.work||80),network=Math.max(0,+o.network||40),total=2*network+work,barw=small?340:700,start=(w-barw)/2,y=small?300:310;
   out+=text(w/2,y-25,'WHERE THE WAIT GOES','scene-small');
   const colors=['outbound','processing','inbound'];let offset=0;[network,work,network].forEach((time,j)=>{const width=barw*time/total;out+=`<rect class="latency-${colors[j]}" x="${start+offset}" y="${y}" width="${width}" height="22" rx="3"/>`;offset+=width;});
   out+=text(w/2,y+52,`${network} ms out + ${work} ms work + ${network} ms back`,'scene-small');
   out+=text(w/2,y+83,`${total} ms response time`,'scene-label');
  } else if(id==='dns'){
   out+=text(small?150:370,small?461:433,s.status==='NXDOMAIN'?'NXDOMAIN: no connection address':s.answer?`Answer: ${s.answer}`:'Searching for library.example.com…','scene-small');
   out+=text(small?150:370,small?486:457,'The resolver follows each referral itself.','scene-small');
  } else if(id==='browser-server'){
   const visible=s.phase==='visible page';
   const x=small?310:715,y=small?377:298;
   const preview=`<g class="page-preview ${visible?'painted':''}"><rect x="${x}" y="${y}" width="${small?70:110}" height="65" rx="5"/><path d="M${x+9} ${y+13}H${x+(small?61:101)}M${x+9} ${y+29}H${x+(small?41:78)}M${x+9} ${y+42}H${x+(small?51:89)}M${x+9} ${y+54}H${x+(small?35:66)}"/></g>`;
   out+=panel('BROWSER OUTPUT',small?345:265,text(small?30:55,small?394:320,visible?'Library page painted':'Page not painted yet','scene-label','start')+text(small?30:55,small?421:348,`Current layer: ${s.phase||'URL parsing'}`,'scene-small','start')+preview);
  }
  return out;
 },
 handshake(sim,i,progress,small,s){
  const w=small?420:880,left=small?75:175,right=small?345:705,top=125,gap=small?53:55,rows=sim.frames.length,h=top+rows*gap+25;
  const text=(x,y,t,cls,anchor)=>this.text(x,y,t,cls,anchor);
  let out=`<path class="sequence-lifeline" d="M${left} 90V${h-20}M${right} 90V${h-20}"/>`;
  out+=this.actor(sim.nodes[0],{x:left,y:55},sim.frames[i].from==='client',false,small,s.client||'CLOSED');
  out+=this.actor(sim.nodes[1],{x:right,y:55},sim.frames[i].from==='server',false,small,s.server||'LISTEN');
  sim.frames.forEach((f,n)=>{
   const y=top+n*gap,current=n===i,completed=n<i||current&&progress>=1,from=f.from==='client'?left:right,to=f.to==='client'?left:right;
   const label=f.packet.replace('seq=','seq ').replace('ack=','ack ');
   if(from!==to)out+=`<g class="sequence-message ${current?'current':completed?'complete':'future'}"><path d="M${from} ${y}H${to}"/><path d="M${to+(to>from?-8:8)} ${y-5}L${to} ${y}L${to+(to>from?-8:8)} ${y+5}"/>${text(w/2,y-10,label,'sequence-label')}</g>`;
   else out+=text(w/2,y,current?label:completed?label:'…','scene-small');
  });
  const f=sim.frames[i],y=top+i*gap,a={x:f.from==='client'?left:right,y},b={x:f.to==='client'?left:right,y};
  const path=f.from===f.to?null:{x1:a.x,y1:y,x2:b.x,y2:y};
  if(path)out+=`<g id="scenePacket" class="scene-packet" transform="translate(${path.x1} ${y})"><circle r="11" class="packet-halo"/><rect x="-8" y="-5" width="16" height="10" rx="3"/></g>`;
  return {html:`<svg viewBox="0 0 ${w} ${h}" class="lab-scene sequence-scene" role="group" aria-label="TCP handshake sequence diagram">${out}</svg>`,path};
 }
};

/* Continuous, pauseable transport between snapshots. Only System Design uses it. */
class SDTimeline {
 constructor(ui,onFrame,onProgress,clock={now:()=>performance.now(),request:fn=>requestAnimationFrame(fn),cancel:id=>cancelAnimationFrame(id)}){
  this.ui=ui;this.onFrame=onFrame;this.onProgress=onProgress;this.clock=clock;this.frames=[];this.i=0;this.fraction=0;this.playing=false;this.raf=null;this.last=0;
  ui.play.addEventListener('click',()=>this.playing?this.pause():this.play());
  ui.prev.addEventListener('click',()=>this.go(this.i-1));ui.next.addEventListener('click',()=>this.go(this.i+1));
  ui.first.addEventListener('click',()=>this.restart());ui.last.addEventListener('click',()=>this.go(this.frames.length-1));
  ui.scrub.addEventListener('input',()=>this.go(+ui.scrub.value));
 }
 load(frames){this.pause();this.frames=frames;this.i=0;this.fraction=0;this.ui.scrub.max=frames.length-1;this.render();}
 duration(){const f=this.frames[this.i],before=this.frames[this.i-1]?.elapsed||0,dt=f.elapsed-before;return Math.max(1400,Math.min(3000,1400+dt*2))/(+this.ui.speed.value||1);}
 render(){const u=this.ui;u.scrub.value=this.i;u.count.textContent=`${this.i+1} / ${this.frames.length}`;u.prev.disabled=this.i===0;u.next.disabled=this.i===this.frames.length-1;this.onFrame(this.frames[this.i],this.i,this.fraction);this.onProgress(this.fraction);}
 go(i){this.pause();this.i=Math.max(0,Math.min(this.frames.length-1,i));this.fraction=1;this.render();}
 restart(){this.pause();this.i=0;this.fraction=0;this.render();}
 play(){if(!this.frames.length||this.playing)return;if(this.i===this.frames.length-1&&this.fraction>=1){this.i=0;this.fraction=0;this.render();}else if(this.fraction>=1){this.i++;this.fraction=0;this.render();}this.playing=true;this.last=this.clock.now();this.ui.play.textContent='Pause';this.ui.play.setAttribute('aria-label','Pause animation');this.raf=this.clock.request(t=>this.tick(t));}
 tick(t){if(!this.playing)return;const dt=Math.max(0,Math.min(100,t-this.last));this.last=t;this.fraction=Math.min(1,this.fraction+dt/this.duration());this.onProgress(this.fraction);if(this.fraction>=1){this.onFrame(this.frames[this.i],this.i,1);this.onProgress(1);if(this.i===this.frames.length-1){this.pause();return;}this.i++;this.fraction=0;this.render();}this.raf=this.clock.request(next=>this.tick(next));}
 pause(){this.playing=false;if(this.raf!==null)this.clock.cancel(this.raf);this.raf=null;this.ui.play.textContent='Play';this.ui.play.setAttribute('aria-label','Play animation');}
}
