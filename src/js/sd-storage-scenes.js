/* Architecture above, inspectable data below. Frames publish state only on arrival. */
const SDStorageScene={
 inspect(id,node,s){
  const values=[];const add=(label,value)=>{if(value!==undefined)values.push([label,Array.isArray(value)?value.join(' → '):String(value)]);};
  if(node==='index'){add('Visited index pages',s.indexPath);add('Current page',s.activePage);}
  if(node==='buffer'||node==='disk'){add('Logical visits',s.reads);add('Storage reads',s.pageReads);add('Buffer hits',s.cacheHits);add('Cached file bytes',s.cached);add('Durable file bytes',s.durable);}
  if(node==='workspace'||node==='db'){add('Transaction',s.tx);add('Committed A',s.a);add('Committed B',s.b);add('Tentative A',s.workingA);add('Tentative B',s.workingB);add('Access plan',s.plan);}
  if(node==='wal'){add('Recovery record',s.log);add('Source position',s.primaryPos);add('Replay position',s.replicaPos);}
  if(node==='primary'){add('Committed stock',s.primary);add('Write acknowledged',s.ack);}
  if(node==='replica'){add('Replica stock',s.replica);add('Replay position',s.replicaPos);add('Value already returned',s.readValue);}
  if(node==='t1'){add('First read',s.first);add('Read before writer commit',s.during);add('Second read',s.second);}
  if(node==='t2'||node==='versions'){add('Writer version',s.newValue);add('Writer state',s.writer);}
  if(node==='books'||node==='authors'){add(s.model==='embedded'?'Requested live name':'Canonical author',s.author);add('Copy 1',s.copies?.[0]);add('Copy 2',s.copies?.[1]);add('Resolved join',s.joined);}
  if(node==='router'){add('Contacted group indices (zero based)',s.touched);add('Keys remapped by preview',s.moves);}
  if(/^p\d$/.test(node)){add('Owned keys',s.placements?.[+node.slice(1)]);add('Contacted',s.touched?.includes(+node.slice(1)));}
  if(node==='parts'||node==='metadata'){add('Staged parts',s.parts);add('Final object published',s.published);}
  if(node==='directory'||node==='inode'){add('Current directory name',s.name);add('Observed file bytes',s.content);add('Dirty cached bytes',s.dirty);}
  if(node==='constraints'){add('Relationship gate',s.constraint);add('Stored book writes',s.writes);}
  if(node==='app'){add('Observed result',s.outcome);add('Returned row count',s.result?.length);}
  return values.length?`<dl class="storage-inspector">${values.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v||'none')}</dd></div>`).join('')}</dl>`:'<p class="model-note">No completed state transition for this participant yet. Step forward to inspect its state.</p>';
 },
 render(id,sim,i,p,o,small){
  const s=SDScene.state(sim.frames,i,p),f=sim.frames[i],fanout=id==='s3-partitioning'||id==='s3-sharding',w=small?420:920,h=small?(fanout?980:id==='s3-indexing'?920:890):id==='s3-indexing'?720:650;
  const positions={},text=(x,y,v,cls='scene-small',anchor='middle')=>SDScene.text(x,y,v,cls,anchor);
  // Nodes occupy subsystem lanes; persistent storage stays apart from the application.
  const coords=small?[[65,80],[210,80],[355,80],[65,240],[210,240],[355,240]]:[[85,105],[280,105],[485,80],[680,105],[835,220],[485,235]];
  sim.nodes.forEach((n,k)=>positions[n.id]={x:(coords[k]||[835,235])[0],y:(coords[k]||[835,235])[1]});
  if(fanout){positions.app={x:small?65:85,y:small?65:85};positions.db={x:small?355:835,y:small?65:85};positions.router={x:small?210:460,y:small?180:90};const groups=sim.nodes.filter(n=>n.id.startsWith('p'));groups.forEach((n,k)=>positions[n.id]={x:small?55+k*310/Math.max(1,groups.length-1):120+k*680/Math.max(1,groups.length-1),y:small?335:235});}
  if(!small&&positions.disk){positions.disk={x:835,y:220};if(positions.buffer)positions.buffer={x:680,y:220};if(positions.wal)positions.wal={x:680,y:220};}
  let svg=text(20,small?(fanout?440:345):325,'ARCHITECTURE • MEMORY, OWNERSHIP, AND DURABILITY ARE DISTINCT','storage-caption','start');
  const edges=new Set();for(const event of sim.frames){if(event.from===event.to)continue;const key=[event.from,event.to].sort().join('|');if(edges.has(key))continue;edges.add(key);const a=positions[event.from],b=positions[event.to];svg+=`<path class="scene-link" d="M${a.x} ${a.y}L${b.x} ${b.y}"/>`;}
  const a=positions[f.from],b=positions[f.to],path=f.from===f.to?null:SDScene.motionPath(a,b,small);
  if(path)svg+=`<path class="scene-route storage-route" d="M${a.x} ${a.y}L${b.x} ${b.y}"/>`;
  for(const n of sim.nodes){let badge='';if(n.id==='wal')badge=s.log||'stream';if(n.id==='replica')badge=s.replica===undefined?'ready':'stock '+s.replica;if(n.id==='primary')badge=s.primary===undefined?'ready':'stock '+s.primary;if(n.id==='buffer')badge=o.warm?'resident':'cache boundary';if(n.id==='disk')badge='persistent bytes';if(n.id.startsWith('p'))badge=s.touched?.includes(+n.id.slice(1))?'contacted':'not contacted';
   svg+=SDScene.actor(n,positions[n.id],n.id===f.from||n.id===f.to,s.failed===n.id,small,badge);}
  const y=small?(fanout?455:365):350;
  const panel=(title,body)=>`<g class="storage-panel"><rect class="storage-panel-bg" x="12" y="${y}" width="${w-24}" height="${h-y-15}" rx="14"/>${text(28,y+26,title,'storage-heading','start')}${body}</g>`;
  const tile=(x,cy,width,label,value,cls='')=>`<g class="storage-tile ${cls}"><rect x="${x}" y="${cy}" width="${width}" height="68" rx="9"/>${text(x+width/2,cy+22,label)}${text(x+width/2,cy+48,value,'storage-value')}</g>`;
  const tiles=(items)=>items.map(([label,value,cls],k)=>{const cols=small?2:4,cw=(w-56)/cols;return tile(28+k%cols*cw,y+48+Math.floor(k/cols)*79,cw-10,label,value,cls||'');}).join('');
  const rows=(cy)=>{
   const cols=small?4:8,cell=(w-56)/cols;
   return (s.rows||SDStorageSim.books).map((r,k)=>{const x=28+k%cols*cell,ry=cy+Math.floor(k/cols)*70,selected=s.result?.some(x=>x.id===r.id),examined=s.selected?.includes(r.id);
    return `<g class="storage-record ${selected?'matched':examined?'examined':''}" data-storage-key="${r.id}" role="button" tabindex="0" aria-label="Read record ${r.id}, ${esc(r.title)}"><rect x="${x}" y="${ry}" width="${cell-8}" height="59" rx="7"/>${text(x+(cell-8)/2,ry+20,'KEY '+r.id)}${text(x+(cell-8)/2,ry+43,r.title,'storage-value')}</g>`;
   }).join('');
  };
  let body='';
  if(['s3-indexing','s3-query-execution','s3-database-performance'].includes(id)){
   body=rows(y+54);
   const cy=y+(small?220:135),col=small?2:4,cw=(w-56)/col;
   body+=[['LOGICAL VISITS',s.reads||0],['STORAGE READS',s.pageReads||0],['BUFFER HITS',s.cacheHits||0],['ROWS EMITTED',s.result?.length||0]].map(([label,v],k)=>tile(28+k%col*cw,cy+Math.floor(k/col)*78,cw-10,label,v)).join('');
   const ty=small?cy+182:cy+102;
   if(id==='s3-indexing'){
    const active=s.indexPath||[],lx=small?105:240,rx=small?315:680,center=w/2;
    body+=`<path class="scene-link" d="M${center} ${ty}L${lx} ${ty+52}M${center} ${ty}L${rx} ${ty+52}"/><g class="index-node ${active.includes('root')?'visited':''}" data-storage-toggle="index" role="button" tabindex="0" aria-label="${o.index?'Disable':'Enable'} the index access path"><rect x="${center-62}" y="${ty-14}" width="124" height="32" rx="8"/>${text(center,ty+7,'ROOT: split 5')}</g>`;
    for(const [x,label,keys] of [[lx,'left leaf','1  2  3  4'],[rx,'right leaf','5  6  7  8']])body+=`<g class="index-node ${active.includes(label)?'visited':''}" data-storage-key="${label==='left leaf'?2:6}" role="button" tabindex="0" aria-label="Run a lookup through ${label}"><rect x="${x-75}" y="${ty+38}" width="150" height="36" rx="8"/>${text(x,ty+61,keys)}</g>`;
    body+=text(w/2,ty+103,'Select a leaf to query • Select root to switch scan/index','scene-small');
   }else {body+=text(28,ty,'PLAN: '+(s.plan||'pending')+(s.query?' → '+s.query:''),'scene-small','start');body+=text(28,ty+27,'SORT: '+(o.query==='all'?(s.spilled?'temporary spill ('+s.tempWrites+' writes)':'memory; '+(o.memory||8)+'-row capacity'):'not required'),'scene-small','start');}
   svg+=panel('LIVE RECORD SHELF • SELECT A KEY TO RUN A LOOKUP',body);
  }else if(id==='s3-transactions'||id==='s3-acid-properties'){
   body=tiles([['COMMITTED A',s.a??100],['COMMITTED B',s.b??50],['WORKSPACE A',s.workingA??100,'tentative'],['WORKSPACE B',s.workingB??50,'tentative']]);
   const cy=y+(small?218:145);body+=text(28,cy,'COMMITTED TOTAL: '+(s.total??150)+' (required 150)','storage-heading','start');body+=text(28,cy+30,'TRANSACTION: '+(s.tx||'not begun'),'scene-small','start');body+=text(28,cy+60,'RECOVERY RECORD: '+(s.log||'empty'),'scene-small','start');
   body+=`<g class="durability-path"><rect x="28" y="${cy+82}" width="${w-56}" height="40" rx="8"/>${text(w/2,cy+107,s.log==='flushed'?'WAL DURABLE → replay can recover this commit':'MEMORY ONLY → a crash can lose an unflushed commit')}</g>`;svg+=panel('TENTATIVE VERSIONS ≠ COMMITTED STATE',body);
  }else if(id==='s3-transaction-isolation'){
   body=tiles([['T1 FIRST READ',s.first??'pending'],['T2 VERSION',s.newValue??'absent','tentative'],['T2 STATE',s.writer||'not started'],['T1 SECOND READ',s.second??'pending']]);
   const cy=y+(small?230:155);body+=text(28,cy,'T1: '+o.level,'storage-heading','start');body+=text(28,cy+35,'Uncommitted observation: '+(s.during??'not read'),'scene-small','start');body+=text(28,cy+70,o.level==='Repeatable Read'?'Transaction snapshot retains version 100':'New statement snapshot can observe committed 70','scene-small','start');svg+=panel('TWO TRANSACTIONS • ONE VERSION HISTORY',body);
  }else if(id==='s3-replication'){
   body=tiles([['PRIMARY STOCK',s.primary??8],['REPLICA STOCK',s.replica??8],['WRITE ACK',s.ack?'yes':'not yet'],['RETURNED READ',s.readValue??'not returned']]);const cy=y+(small?230:155);body+=text(28,cy,'SOURCE POSITION '+(s.primaryPos||1)+' → REPLAY POSITION '+(s.replicaPos||1),'storage-heading','start');body+=text(28,cy+35,s.lag?'Replica has unapplied work':'Displayed copies have caught up','scene-small','start');body+=text(28,cy+70,'Previously returned values do not change after replay.','scene-small','start');svg+=panel('INDEPENDENT COPY PROGRESS',body);
  }else if(id==='s3-partitioning'||id==='s3-sharding'){
   const groups=s.placements||[],cols=small?2:4,cw=(w-56)/cols;
   groups.forEach((ids,k)=>{const cy=y+52+Math.floor(k/cols)*90,x=28+k%cols*cw;body+=tile(x,cy,cw-10,(id==='s3-sharding'?'SHARD ':'RANGE ')+(k+1),ids.join(' · ')||'empty',s.touched?.includes(k)?'contacted':'');});
   const cy=y+(small?245:155);body+=text(28,cy,'CONTACTED: '+(s.touched?.length||0)+' / '+(s.placements?.length||0),'storage-heading','start');if(id==='s3-sharding')body+=text(28,cy+32,o.rebalance?'ADD-OWNER PREVIEW: '+(s.moves||0)+' keys would move':'Modulo placement; migration not running','scene-small','start');body+=rows(cy+55);svg+=panel(id==='s3-sharding'?'DISTRIBUTED OWNERSHIP • COPIES NOT SHOWN':'ONE LOGICAL TABLE • FOUR LOCAL RANGES',body);
  }else if(id==='s3-object-storage'){
   body=tiles([['PART 1',s.parts?.includes(1)?'staged':'waiting'],['PART 2',s.parts?.includes(2)?'staged':s.failedPart?'interrupted':'waiting'],['PART 3',s.parts?.includes(3)?'staged':'waiting'],['FINAL KEY',s.published?'published':'not visible',s.published?'contacted':'']]);const cy=y+(small?230:150);body+=text(28,cy,'KEY: covers/atlas.bin','storage-heading','start');body+=text(28,cy+36,s.published?'Completion has published the assembled object.':'Staged bytes belong to the upload, not the final key.','scene-small','start');svg+=panel('UPLOAD STATE → COMPLETION → OBJECT VISIBILITY',body);
  }else if(id==='s3-file-storage'){
   body=tiles([['DIRECTORY NAME',s.name||'atlas.txt'],['CACHED BYTES',s.cached||'old note',s.dirty?'tentative':''],['DURABLE BYTES',s.durable||'old note'],['OBSERVED BYTES',s.content||'old note']]);const cy=y+(small?230:155);body+=text(28,cy,'OPEN HANDLE → same underlying file','storage-heading','start');body+=text(28,cy+35,s.dirty?'Dirty cache has not been flushed':'No dirty cached bytes in this snapshot','scene-small','start');body+=text(28,cy+70,'Rename crash durability is outside this experiment.','scene-small','start');svg+=panel('NAMESPACE ≠ OPEN HANDLE ≠ DURABLE BYTES',body);
  }else if(id==='s3-relational-databases'){
   body=tiles([['AUTHOR KEY',o.author==='existing'?1:99],['CONSTRAINT',s.constraint||'unchecked'],['BOOK WRITES',s.writes||0],['JOIN RESULT',s.joined?'see below':'not run']]);const cy=y+(small?250:165);body+=text(28,cy,s.joined||'No stored relationship has been resolved yet.','storage-heading','start');body+=text(28,cy+40,'AUTHORS: id 1 → Leo','scene-small','start');body+=text(28,cy+72,'PROPOSED BOOK: id 9 → Delta → author '+(o.author==='existing'?1:99),'scene-small','start');svg+=panel('BOOK.author_id → AUTHORS.id',body);
  }else{
   body=tiles([['REPRESENTATION',s.model||o.model],['READS',s.reads||0],['WRITES',s.writes||0],['LIVE NAME',s.author||'Leo']]);const cy=y+(small?235:155);body+=text(28,cy,'BOOK COPY 1: '+(s.copies?.[0]||'Leo'),'storage-heading','start');body+=text(28,cy+35,'BOOK COPY 2: '+(s.copies?.[1]||'Leo'),'storage-heading','start');body+=text(28,cy+78,o.model==='embedded'?'Name duplicated inside each book':'Each book points to the same author record','scene-small','start');svg+=panel('DATA SHAPE AND FACT OWNERSHIP',body);
  }
  // Operation-aware payloads distinguish row/page work from network decoration.
  if(path)svg+=`<g id="scenePacket" class="scene-packet storage-payload" transform="translate(${path.x1} ${path.y1})"><rect x="-20" y="-13" width="40" height="26" rx="5"/>${text(0,5,f.to==='wal'?'LOG':f.to==='disk'?'I/O':f.to==='replica'?'COPY':'DATA','storage-packet-label')}</g>`;
  else svg+=`<circle id="scenePulse" class="scene-pulse" cx="${a.x}" cy="${a.y}" r="52"/>`;
  svg+=`<g class="storage-operation"><rect x="20" y="${small?(fanout?415:320):300}" width="${w-40}" height="8" rx="4"/><rect id="storageWorkFill" x="20" y="${small?(fanout?415:320):300}" width="1" height="8" rx="4" data-work-width="${w-40}"/></g>`;
  return {html:`<svg class="lab-scene storage-scene" viewBox="0 0 ${w} ${h}" role="group" aria-label="Interactive ${esc(id)} architecture and data">${svg}</svg>`,path};
 }
};
