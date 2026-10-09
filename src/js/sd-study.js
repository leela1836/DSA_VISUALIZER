/* Explore first; complete authored explanations are still one click away. */
const SDStudy = {
 platform:null, simulation:null, path:null, selected:null, arrival:false, history:[], cacheSnapshot:null,
 dns:{now:0,expires:0,cached:null,authority:'192.0.2.10',lookups:0},
 section(letter,title,body){return `<section class="study-reading"><span class="section-label">${letter}</span><h2>${title}</h2>${body}</section>`;},
 lesson(t){
  const l=SD_LESSONS[t.id],lab=SD_LABS[t.id],done=SDProgress.data.completed.includes(t.id),bookmarked=SDProgress.data.bookmarks.includes(t.id);
  const paras=a=>a.map(p=>`<p>${esc(p)}</p>`).join('');
  const prereqs=t.prerequisites.map(id=>{const topic=SD_TOPICS.find(t=>t.id===id);return `<a href="#/system-design/${id}">${esc(topic.name)}</a>`;}).join('');
  const objectives=`<details class="study-objectives"><summary>Learning goals & prerequisites</summary><ul>${l.objectives.map(o=>`<li>${esc(o)}</li>`).join('')}</ul><div class="related-links">${prereqs||'No prerequisite knowledge assumed.'}</div></details>`;
  return `<div class="study-header"><a class="back-link" href="#/system-design">← All systems</a><button id="sdBookmark" class="ghost-btn" aria-pressed="${bookmarked}">${bookmarked?'★ Saved':'☆ Save lesson'}</button></div><div class="study-eyebrow">${esc(SD_STAGES[t.stage-1].name.toUpperCase())} / LESSON ${String(SD_STAGES[t.stage-1].topics.findIndex(x=>x.id===t.id)+1).padStart(2,'0')}</div><h1 class="study-title">${esc(lab.hook)}</h1><p class="study-subtitle"><b>${esc(t.name)}</b> · ${esc(lab.caption)}</p>${objectives}
   <div class="study-tabs" role="tablist" aria-label="Lesson sections"><button role="tab" id="tab-explore" aria-controls="panel-explore" aria-selected="true" tabindex="0" data-study-tab="explore">01 <span>Explore</span></button><button role="tab" id="tab-understand" aria-controls="panel-understand" aria-selected="false" tabindex="-1" data-study-tab="understand">02 <span>Understand</span></button><button role="tab" id="tab-deeper" aria-controls="panel-deeper" aria-selected="false" tabindex="-1" data-study-tab="deeper">03 <span>Go deeper</span></button><button role="tab" id="tab-reflect" aria-controls="panel-reflect" aria-selected="false" tabindex="-1" data-study-tab="reflect">04 <span>Reflect</span></button></div>
   <div id="panel-explore" role="tabpanel" aria-labelledby="tab-explore" class="study-panel">${this.explore(t,l,lab)}</div>
   <div id="panel-understand" role="tabpanel" aria-labelledby="tab-understand" class="study-panel" hidden>${this.section('A','Why this exists',paras(l.intro))}${this.section('B','Build the mental model',paras(l.fundamentals))}${this.section('C','Follow the mechanism',`<ol class="mechanism-cards">${l.working.map((p,i)=>`<li><span>${i+1}</span><p>${esc(p)}</p></li>`).join('')}</ol><button class="ghost-btn" data-return-lab>See this unfold in the lab ↗</button>`)}<h2>Try to explain the experiment</h2><p>${esc(lab.challenge)}</p><button class="study-next" data-go-tab="deeper">Explore the edge cases →</button></div>
   <div id="panel-deeper" role="tabpanel" aria-labelledby="tab-deeper" class="study-panel" hidden>${this.section('F','Under the hood',paras(l.deep))}<div class="deep-questions">${lab.discoveries.map(([title,body],i)=>`<details ${i===0?'open':''}><summary>${esc(title)}</summary><p>${esc(body)}</p></details>`).join('')}</div>${this.section('G','Place it in a real system',paras(l.usage))}<div class="reference-shelf"><h2>Learn from the specifications</h2><p>These references describe the protocol, including behavior omitted from the conceptual model.</p>${l.sources.map(([name,url])=>`<a href="${esc(url)}" target="_blank" rel="noopener">${esc(name)} <span>↗</span></a>`).join('')}</div><button class="study-next" data-go-tab="reflect">Reflect on what changed →</button></div>
   <div id="panel-reflect" role="tabpanel" aria-labelledby="tab-reflect" class="study-panel" hidden>${this.section('H','What you can now explain',`<ul class="takeaways">${l.summary.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><div class="knowledge-check"><h3>Think it through</h3><p>${esc(l.check[0])}</p><label class="reflection-label">Your explanation<textarea rows="4" placeholder="Use the experiment as evidence…"></textarea></label><details><summary>Compare your reasoning</summary><p>${esc(l.check[1])}</p></details></div><p>Completion records your learning, without a score or a timer. Mark this lesson when you can explain what changes and why.</p><button id="sdComplete" class="learn-action inline" aria-pressed="${done}">${done?'✓ Completed — mark incomplete':'I can explain this concept'}</button>`)}<h2>Your vocabulary</h2><dl class="term-cards">${Object.entries(l.glossary).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>${Platform.lessonNavigation(t)}</div>`;
 },
 explore(t,l,lab){
  const live=SDCacheScene.live(t.id)?`<div class="cache-session-actions"><h3>Continue this system</h3><p>Finish the run, then operate on its retained state. Run experiment or changing a setting starts fresh.</p><button data-cache-action="read" disabled>Read again</button><button data-cache-action="advance" disabled>Advance 15 seconds</button><button data-cache-action="write" disabled>Write next source version</button><button data-cache-action="expire" disabled>Remove cached copy</button></div>`:'';
  const scale=t.id.startsWith('s5-')?`<div class="cache-session-actions"><h3>Change the architecture</h3><p>Each change reruns the same workload from a fresh model for comparison.</p>${l.controls.some(c=>c[0]==='servers')?'<button data-scale-action="add">Add a worker</button><button data-scale-action="remove">Remove a worker</button>':''}${l.controls.some(c=>c[0]==='requests')?'<button data-scale-action="request">Generate another request</button>':''}${l.controls.some(c=>c[0]==='failure')?'<button data-scale-action="failure">Toggle worker failure</button>':''}</div>`:'';
  return `<div class="explore-grid"><section class="visual-lab" aria-label="${esc(t.name)} experiment"><div class="lab-topline"><span class="lab-status"><i></i> INTERACTIVE LAB</span><span id="labPhase">Ready to explore</span></div><div id="sdDiagram" class="lab-viewport"></div><div class="lab-player"><button id="sdFirst" title="Restart" aria-label="Restart simulation">↺</button><button id="sdPrev" aria-label="Previous step">←</button><button id="sdPlay" class="lab-play" aria-label="Play animation">Play</button><button id="sdNext" aria-label="Next step">→</button><button id="sdLast" aria-label="Last step">⇥</button><span id="sdCount"></span><label>Speed<select id="sdSpeed" aria-label="Animation speed"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></label><input id="sdScrub" type="range" min="0" max="0" value="0" aria-label="Simulation timeline"></div><div class="scene-key"><span><i class="key-packet"></i> packet in transit</span><span><i class="key-ready"></i> available state</span><span>Click an actor to look inside</span></div></section>
   <aside class="experiment-desk"><div class="section-label">E / CHANGE SOMETHING</div><h2>Make it behave differently.</h2><div class="scenario-presets">${lab.presets.map(([name],i)=>`<button data-preset="${i}">${esc(name)}</button>`).join('')}</div><div id="sdControls" class="lab-controls">${l.controls.map(c=>Platform.control(c)).join('')}${t.id==='dns'?'<label class="experiment-field">DNS TTL (model seconds)<output for="labTTL">30</output><input id="labTTL" type="range" min="5" max="120" value="30" step="5"></label>':''}</div>${t.id==='dns'?`<div class="dns-actions"><button data-dns-action="repeat">Look up again ↗</button><button data-dns-action="advance">Advance 30 seconds</button><button data-dns-action="change">Change authority IP</button><button data-dns-action="clear">Clear caches</button></div><div id="dnsCache" class="cache-ledger" aria-live="polite"></div>`:''}${live}${scale}<button id="labRun" class="learn-action">Run this experiment <span>↗</span></button><p class="lab-challenge">${esc(lab.challenge)}</p><p class="model-note">Conceptual model, not real traffic. Animation time is slowed for observation; model milliseconds are illustrative.</p></aside></div>
   <div class="observation-grid"><section class="live-explanation"><div class="section-label">D / FOLLOW THE ACTION</div><h2 id="sdPacket">Ready</h2><p id="sdNote" aria-live="polite"></p><div class="transfer-progress"><span id="transferFill"></span></div><div id="sdState" class="live-metrics"></div><details class="walkthrough"><summary>Open the event log</summary><ol id="sdTrace"></ol></details></section><section id="actorInspector" class="actor-inspector"><div class="section-label">INSIDE AN ACTOR</div><h2>Follow more than the arrows.</h2><p>Select a browser, server, or protocol participant in the scene to discover its job, its local state, and what it cannot guarantee.</p></section></div><section id="experimentEvidence" class="experiment-evidence" hidden></section>
   <section class="prediction"><div><div class="section-label">PAUSE & PREDICT</div><h2>${esc(lab.prediction[0])}</h2><p>Make a prediction, then use the experiment to explain your reasoning.</p></div><div class="prediction-options">${lab.prediction[1].map((answer,i)=>`<button data-prediction="${i}" aria-pressed="false">${esc(answer)}</button>`).join('')}<p id="predictionReason" hidden></p></div></section><button class="study-next" data-go-tab="understand">Understand why it happened →</button>`;
 },
 init(platform,l){
  this.platform=platform;this.cacheSnapshot=null;this.selected=null;this.history=[];this.arrival=false;this.dns={now:0,expires:0,cached:null,authority:'192.0.2.10',lookups:0};
  platform.player=new SDTimeline({play:$('#sdPlay'),prev:$('#sdPrev'),next:$('#sdNext'),first:$('#sdFirst'),last:$('#sdLast'),scrub:$('#sdScrub'),count:$('#sdCount'),speed:$('#sdSpeed')},(f,i,p)=>this.paint(f,i,p),p=>this.animate(p));
  this.small=matchMedia('(max-width: 680px)').matches;
  const ro=new ResizeObserver(()=>{const small=$('#sdDiagram').clientWidth<540;if(small!==this.small){this.small=small;this.paint(this.platform.player.frames[this.platform.player.i],this.platform.player.i,this.platform.player.fraction);this.animate(this.platform.player.fraction);}});ro.observe($('#sdDiagram'));
  const player=platform.player,originalPause=player.pause.bind(player);player.pause=()=>{originalPause();$('#sdDiagram')?.classList.remove('is-playing');if(this.simulation&&player.frames===this.simulation.frames)this.animate(player.fraction);};
  const originalPlay=player.play.bind(player);player.play=()=>{originalPlay();$('#sdDiagram')?.classList.add('is-playing');};
  player.dispose=()=>{player.pause();ro.disconnect();};
  $$('.study-tabs [data-study-tab]').forEach(b=>{
   b.addEventListener('click',()=>this.tab(b.dataset.studyTab));
   b.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const tabs=$$('.study-tabs [data-study-tab]'),i=tabs.indexOf(b),next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;this.tab(tabs[next].dataset.studyTab);tabs[next].focus();});
  });
  $$('[data-go-tab]').forEach(b=>b.addEventListener('click',()=>{this.tab(b.dataset.goTab);$('.study-tabs').scrollIntoView({block:'start',behavior:'smooth'});}));
  $$('[data-return-lab]').forEach(b=>b.addEventListener('click',()=>this.tab('explore')));
  $$('#sdControls [data-option]').forEach(el=>el.addEventListener('input',()=>{const out=el.parentElement.querySelector('output');if(out)out.value=el.value;this.rebuild(true);this.clearPreset();}));
  $('#labTTL')?.addEventListener('input',e=>{e.target.parentElement.querySelector('output').value=e.target.value;this.updateCache();});
  $('#labRun').addEventListener('click',()=>this.rebuild(true));
  $$('[data-cache-action]').forEach(b=>b.addEventListener('click',()=>{if(!b.disabled&&this.cacheSnapshot)this.rebuild(true,b.dataset.cacheAction);}));
  $$('[data-scale-action]').forEach(b=>b.addEventListener('click',()=>{const action=b.dataset.scaleAction,key=action==='failure'?'failure':action==='request'?'requests':'servers',input=$(`[data-option="${key}"]`);if(!input)return;if(action==='failure')input.checked=!input.checked;else input.value=Math.max(+input.getAttribute('min'),Math.min(+input.getAttribute('max'),+input.value+(action==='remove'?-1:1)));input.dispatchEvent(new Event('input',{bubbles:true}));}));
  $$('[data-preset]').forEach(b=>b.addEventListener('click',()=>this.preset(+b.dataset.preset)));
  $$('[data-dns-action]').forEach(b=>b.addEventListener('click',()=>this.dnsAction(b.dataset.dnsAction)));
  $$('[data-prediction]').forEach(b=>b.addEventListener('click',()=>{const prediction=SD_LABS[platform.active.id].prediction;$$('[data-prediction]').forEach(x=>x.setAttribute('aria-pressed',x===b));const reason=$('#predictionReason');reason.hidden=false;reason.textContent=(+b.dataset.prediction===prediction[2]?'That matches the model. ':'Try the scenario and inspect the result. ')+prediction[3];}));
  this.rebuild(!document.hidden&&!matchMedia('(prefers-reduced-motion: reduce)').matches);
 },
 tab(name){
  if(name!=='explore')this.platform.player.pause();
  $$('.study-tabs [data-study-tab]').forEach(b=>{const on=b.dataset.studyTab===name;b.setAttribute('aria-selected',on);b.tabIndex=on?0:-1;});
  $$('.study-panel').forEach(p=>p.hidden=p.id!=='panel-'+name);
 },
 clearPreset(){$$('[data-preset]').forEach(b=>b.classList.remove('selected'));},
 preset(i){
  const o=SD_LABS[this.platform.active.id].presets[i][1];
  Object.entries(o).forEach(([key,value])=>{const el=$('[data-option="'+key+'"]');if(!el)return;if(el.type==='checkbox')el.checked=value;else el.value=value;const out=el.parentElement.querySelector('output');if(out)out.value=el.value;});
  if(this.platform.active.id==='dns'){this.dns.cached=o.cache!=='none'?this.dns.authority:null;this.dns.expires=this.dns.now+(+$('#labTTL').value||30);}
  this.clearPreset();$('[data-preset="'+i+'"]').classList.add('selected');this.rebuild(true);
 },
 rebuild(play,action=null){
  this.arrival=false;const p=this.platform; p.options={};$$('#sdControls [data-option]').forEach(el=>p.options[el.dataset.option]=el.type==='checkbox'?el.checked:el.value);
  if(p.active.id==='dns'){
   p.options.address=this.dns.authority;
   if(p.options.cache!=='none'&&!this.dns.cached){this.dns.cached=this.dns.authority;this.dns.expires=this.dns.now+(+$('#labTTL').value||30);}
   p.options.cacheAddress=this.dns.cached||this.dns.authority;
  }
  if(action){p.options.action=action;this.simulation=SDCacheSim.build(p.active.id,p.options,this.cacheSnapshot);}else{this.cacheSnapshot=null;this.simulation=SD_SIM.build(p.active.id,p.options);}p.nodes=this.simulation.nodes;
  p.player.load(this.simulation.frames);
  $('#sdTrace').innerHTML=this.simulation.frames.map((f,i)=>`<li><button data-step="${i}"><span>${String(i+1).padStart(2,'0')}</span> ${esc(f.packet)}</button></li>`).join('');
  $$('#sdTrace [data-step]').forEach(b=>b.addEventListener('click',()=>p.player.go(+b.dataset.step)));
  this.updateCache();if(play)p.player.play();
 },
 paint(f,i,fraction){
  if(!f)return;
  const p=this.platform,draw=SDScene.render(p.active.id,this.simulation,i,fraction,p.options,this.small);this.path=draw.path;
  $('#sdDiagram').innerHTML=draw.html;
  $$('#sdDiagram [data-actor]').forEach(el=>{const inspect=()=>{p.player.pause();this.inspect(el.dataset.actor);};el.addEventListener('click',inspect);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();inspect();}});});
  $$('#sdDiagram [data-storage-key]').forEach(el=>{const choose=()=>{const key=$('[data-option="key"]');if(!key)return;key.value=el.dataset.storageKey;const scope=$('[data-option="scope"]')||$('[data-option="query"]');if(scope)scope.value='point';key.dispatchEvent(new Event('input',{bubbles:true}));};el.addEventListener('click',choose);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}});});
  $$('#sdDiagram [data-storage-toggle]').forEach(el=>{const toggle=()=>{const input=$('[data-option="'+el.dataset.storageToggle+'"]');if(!input)return;input.checked=!input.checked;input.dispatchEvent(new Event('input',{bubbles:true}));};el.addEventListener('click',toggle);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();}});});
  const complete=fraction>=1&&i===this.simulation.frames.length-1;
  $$('[data-cache-action]').forEach(b=>b.disabled=!complete);
  if(complete&&SDCacheScene.live(p.active.id))this.cacheSnapshot=JSON.parse(JSON.stringify(f.state));
  $('#sdPacket').textContent=f.packet;$('#sdNote').textContent=f.note;
  const before=i?this.simulation.frames[i-1].elapsed:0;
  $('#sdState').innerHTML=`<div><span>MODEL TIME</span><b id="modelClock">${fraction<1?before:f.elapsed} <small>ms</small></b></div><div><span>EVENT</span><b>${i+1} <small>/ ${this.simulation.frames.length}</small></b></div><div><span>TRANSFER</span><b id="transferState">${fraction>=1?'Arrived':'Ready'}</b></div>`;
  if(this.selected)this.inspect(this.selected);
  $$('#sdTrace li').forEach((li,n)=>li.classList.toggle('current',n===i));
  if(fraction>=1&&i===this.simulation.frames.length-1&&!this.arrival){this.arrival=true;this.recordEvidence(f);if(p.active.id==='dns'){this.dns.lookups++;if(f.state.answer&&f.state.answer!=='no address'&&p.options.cache==='none'){this.dns.cached=f.state.answer;this.dns.expires=this.dns.now+(+$('#labTTL').value||30);}this.updateCache();}}
 },
 animate(fraction){
  if(!this.simulation)return;const p=this.platform,f=this.simulation.frames[p.player.i];
  const packet=$('#scenePacket');
  if(packet&&this.path){const motion=matchMedia('(prefers-reduced-motion: reduce)').matches?(fraction>=1?1:0):fraction,{x,y}=SDScene.motionAt(this.path,motion);packet.setAttribute('transform',`translate(${x} ${y})`);packet.style.opacity=(f.packet.includes('lost')||f.packet==='Unit B'&&p.options.loss)&&fraction>.65&&fraction<1?'0':fraction>=1?'0':'1';}
  const pulse=$('#scenePulse');if(pulse)pulse.setAttribute('r',String((this.small?40:64)+8*fraction));
  const work=$('#storageWorkFill');if(work)work.setAttribute('width',String(Math.max(1,+work.dataset.workWidth*fraction)));
  const before=p.player.i?this.simulation.frames[p.player.i-1].elapsed:0;
  const time=before+(f.elapsed-before)*fraction;$$('[data-scale-work]').forEach(el=>el.setAttribute('width',String(Math.max(0,Math.min(time,+el.dataset.end)-(+el.dataset.start))*(+el.dataset.unit))));
  $('#modelClock').innerHTML=`${Math.round(before+(f.elapsed-before)*fraction)} <small>ms</small>`;
  $('#transferFill').style.width=(fraction*100)+'%';$('#transferState').textContent=fraction>=1?'Arrived':p.player.playing?'In transit':'Paused';
  $('#labPhase').textContent=p.player.playing?'Watching the process':fraction>=1&&p.player.i===this.simulation.frames.length-1?'Experiment complete':'Pause, inspect, or press Play';
 },
 inspect(id){
  this.selected=id;const lab=SD_LABS[this.platform.active.id],def=lab.nodes[id];if(!def)return;
  const node=this.simulation.nodes.find(n=>n.id===id),f=this.simulation.frames[this.platform.player.i];
  const detail=this.platform.active.id.startsWith('s5-')?SDScaleScene.inspect(id,SDScene.state(this.simulation.frames,this.platform.player.i,this.platform.player.fraction)):this.platform.active.id.startsWith('s4-')?SDCacheScene.inspect(id,SDScene.state(this.simulation.frames,this.platform.player.i,this.platform.player.fraction),this.platform.active.id):this.platform.active.id.startsWith('s3-')?SDStorageScene.inspect(this.platform.active.id,id,SDScene.state(this.simulation.frames,this.platform.player.i,this.platform.player.fraction)):'';
  $('#actorInspector').innerHTML=`<div class="section-label">INSIDE / ${esc(node.label.toUpperCase())}</div><h2>${esc(def[0])}</h2><p>${esc(def[1])}</p>${detail}<div class="actor-event"><span>Current involvement</span><b>${f.from===id&&f.to===id?'Local work':f.from===id?'Sending':f.to===id?'Receiving':'Waiting or not on this path'}</b></div>`;
  $$('#sdDiagram [data-actor]').forEach(el=>el.classList.toggle('inspected',el.dataset.actor===id));
 },
 recordEvidence(f){
  const id=this.platform.active.id,o=this.platform.options;
  const labels={'client-server':`${o.network} ms link / ${o.work} ms work`,internet:o.failed?'Backup path':'Primary path','ip-ports':`Port ${o.port}`,dns:o.cache==='none'?'Cold lookup':`${o.cache} cache`,'tcp-udp':`${o.transport}${o.loss?' / loss':' / healthy'}`,'tcp-handshake':o.loss?'Lost SYN-ACK':'Normal handshake',tls:o.invalid?'Wrong hostname':'Valid identity','http-lifecycle':o.unavailable?'Unavailable':`${o.work} ms work`,'http-semantics':`${o.method} twice`,'http-versions':`HTTP/${o.version}${o.loss?' / loss':' / healthy'}`,websockets:o.disconnect?'Disconnected':'Healthy channel','browser-server':o.warm};
  const state=SDScene.state(this.simulation.frames,this.simulation.frames.length-1,1);
  const outcome=state.answer||state.delivered||state.outcome||state.status||state.available||state.phase||state.server||state.protected||'trace complete';
  const label=labels[id]||(o.action?'Live '+o.action+' / ':'')+SD_LESSONS[id].controls.map(c=>`${c[1]}: ${o[c[0]]}`).join(' / ');
  const run={label,elapsed:f.elapsed,events:this.simulation.frames.length,outcome:String(outcome)};
  if(JSON.stringify(this.history.at(-1))!==JSON.stringify(run))this.history.push(run);
  this.history=this.history.slice(-4);const max=Math.max(1,...this.history.map(x=>x.elapsed)),el=$('#experimentEvidence');el.hidden=false;
  el.innerHTML=`<div class="section-label">YOUR OBSERVATIONS</div><h2>Compare what changed.</h2><p>Completed runs from this visit. Durations belong to this model; a faster failed operation is not a better outcome.</p><div class="evidence-runs">${this.history.map(x=>`<div class="evidence-run"><div><b>${esc(x.label)}</b><span>${x.events} events · ${esc(x.outcome)}</span></div><div class="evidence-bar"><i style="width:${Math.max(2,100*x.elapsed/max)}%"></i></div><strong>${x.elapsed}<small> ms</small></strong></div>`).join('')}</div>`;
 },
 dnsAction(action){
  this.platform.player.pause();
  const cache=$('[data-option="cache"]'),missing=$('[data-option="missing"]');
  if(action==='repeat'){cache.value=this.dns.cached&&this.dns.now<this.dns.expires?'browser':'none';this.rebuild(true);}
  if(action==='advance'){this.dns.now+=30;if(this.dns.now>=this.dns.expires){cache.value='none';this.dns.cached=null;}this.updateCache();}
  if(action==='change'){this.dns.authority=this.dns.authority==='192.0.2.10'?'192.0.2.20':'192.0.2.10';this.updateCache();}
  if(action==='clear'){this.dns.cached=null;this.dns.expires=0;cache.value='none';missing.checked=false;this.updateCache();this.rebuild(false);}
 },
 updateCache(){
  const el=$('#dnsCache');if(!el)return;const d=this.dns,remaining=Math.max(0,d.expires-d.now),valid=d.cached&&remaining>0;
  el.innerHTML=`<div><span>Authority record</span><b>${d.authority}</b></div><div><span>Cached answer</span><b>${valid?d.cached:'empty / expired'}</b></div><div><span>TTL remaining</span><b>${valid?remaining:0} s</b></div><div><span>Model clock</span><b>${d.now} s</b></div>${valid&&d.cached!==d.authority?'<p>The cache still has the old IP. It is valid until expiry.</p>':''}`;
 }
};
