/* Course shell; DSA remains owned by App, MyCode, and Progress. */
const SDProgress = {
 key:'dsaviz-system-design-v1', data:{completed:[],bookmarks:[],current:null},
 load(){
  this.data={completed:[],bookmarks:[],current:null};
  try {
   const d=JSON.parse(localStorage.getItem(this.key));
   if(d&&typeof d==='object') this.data={
    completed:Array.isArray(d.completed)?d.completed.filter(id=>Object.hasOwn(SD_LESSONS,id)):[],
    bookmarks:Array.isArray(d.bookmarks)?d.bookmarks.filter(id=>SD_TOPICS.some(t=>t.id===id)):[],
    current:Object.hasOwn(SD_LESSONS,d.current)?d.current:null
   };
  } catch(e) { /* Corrupt storage starts clean and never touches DSA progress. */ }
  return this.data;
 },
 save(){try{localStorage.setItem(this.key,JSON.stringify(this.data));return true;}catch(e){toast('Progress is kept for this session; browser storage is unavailable.',4500);return false;}},
 toggle(kind,id){if(kind==='completed'&&!Object.hasOwn(SD_LESSONS,id)) return;
  const list=this.data[kind];this.data[kind]=list.includes(id)?list.filter(x=>x!==id):[...list,id];this.save();},
 counts(stage){const topics=stage?SD_STAGES[stage-1].topics:SD_TOPICS;return {done:topics.filter(t=>this.data.completed.includes(t.id)).length,total:topics.length};}
};
const Platform = {
 player:null, active:null, nodes:[], options:{},
 routeForDsa(view){return '#/dsa'+(view&&view!=='visualize'?'/'+view:'');},
 dsaRoute(view){const hash=this.routeForDsa(view);if(location.hash!==hash) location.hash=hash;},
 start(){
  SDProgress.load();
  $('#platformTheme').addEventListener('click',()=>$('#themeBtn').click());
  $('.skip-link').addEventListener('click',e=>{
   e.preventDefault();
   const target=document.getElementById(e.currentTarget.getAttribute('href').slice(1));
   if(target){target.setAttribute('tabindex','-1');target.focus();target.scrollIntoView({block:'start'});}
  });
  window.addEventListener('hashchange',()=>this.route());
  window.addEventListener('storage',e=>{if(e.key===SDProgress.key){SDProgress.load();this.route();}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)this.pause();});
  this.route();
 },
 pause(){if(this.player)this.player.pause();if(App.player)App.player.pause();if(MyCode.player)MyCode.player.pause();},
 route(){
  this.pause();this.player=null;
  const parts=location.hash.replace(/^#\/?/,'').split('/');
  const dsa=parts[0]==='dsa';
  document.body.dataset.course=dsa?'dsa':parts[0]==='system-design'?'system-design':'home';
  $('#dsaTopbar').hidden=!dsa;
  $$('.view').forEach(v=>v.classList.remove('is-active'));
  const host=$('#platformMain');host.hidden=dsa;
  $$('.platform-bar nav a').forEach(a=>{
   const selected=a.getAttribute('href')===(dsa?'#/dsa':parts[0]==='system-design'?'#/system-design':'#/');
   if(selected)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
  });
  if(dsa){
   const view=['visualize','mycode','reference','roadmap'].includes(parts[1])?parts[1]:'visualize';
   $('.skip-link').href='#view-'+view;
   App.show(view);document.title='DSA · Visual Learning';return;
  }
  $('.skip-link').href='#platformMain';
  if(parts[0]==='system-design'){
   this.active=SD_TOPICS.find(t=>t.id===parts[1])||null;
   host.innerHTML=`<div class="sd-workspace">${this.sidebar()}<article class="sd-content" id="lessonContent" tabindex="-1">${this.active?this.lesson(this.active):this.course()}</article></div>`;
   this.bindProgress();
   if(this.active&&Object.hasOwn(SD_LESSONS,this.active.id)){
    SDProgress.data.current=this.active.id;SDProgress.save();this.initSimulation(SD_LESSONS[this.active.id]);
   }
   if(parts[1]&&!this.active) $('#lessonContent').insertAdjacentHTML('afterbegin','<p role="status">That topic was not found. Choose a lesson from the roadmap.</p>');
   document.title=(this.active?this.active.name:'System Design')+' · Visual Learning';
  } else {this.active=null;host.innerHTML=this.dashboard();document.title='Visual Learning · DSA & System Design';}
  if(this.booted){host.focus({preventScroll:true});window.scrollTo(0,0);}this.booted=true;
 },
 progressMarkup(c,label){return `<div class="course-progress"><span>${c.done} / ${c.total} ${esc(label)}</span><progress max="${c.total}" value="${c.done}" aria-label="${esc(label)}">${Math.round(100*c.done/c.total)}%</progress></div>`;},
 dashboard(){
  const d=Progress.count(),s=SDProgress.counts(),resume=SDProgress.data.current;
  const last=App.algo?.name||'your last algorithm';
  return `<div class="learning-home"><div class="home-kicker">COMPUTER SCIENCE, MADE VISIBLE</div><h1>Understand it.<br><span>Watch it work.</span></h1><p class="home-intro">Go beyond definitions. Follow the steps, change the inputs, and see why things work the way they do.</p>
   <div class="course-grid">
    <section class="course-card"><div class="course-art algorithm-art" aria-hidden="true">${[35,70,45,90,55,80,25].map((h,i)=>`<i style="--bar:${h}%;--delay:${i*.13}s"></i>`).join('')}<span>compare → swap → understand</span></div><div class="course-card-body"><div class="course-label">01 / ALGORITHMS</div><h2>Data Structures<br>& Algorithms</h2><p>Watch arrays, trees, graphs, and dynamic programming come to life. Trace real Python and Java, one step at a time.</p><div class="course-tags"><span>28 visualizations</span><span>Code tracing</span><span>9-stage roadmap</span></div>${this.progressMarkup(d,'topics completed')}<a class="learn-action" href="#/dsa">${d.done?'Continue learning':'Start learning'} <span>↗</span></a><small>Resume with ${esc(last)}</small></div></section>
    <section class="course-card system-card"><div class="course-art network-art" aria-hidden="true"><div>CLIENTS</div><b>↓</b><div>APPLICATION</div><b>↓</b><div class="art-pair"><span>CACHE</span><span>DATABASE</span></div><span class="art-caption">follow the request, layer by layer</span></div><div class="course-card-body"><div class="course-label">02 / SYSTEMS</div><h2>System<br>Design</h2><p>Explore how requests travel, data is stored, and distributed services cooperate. Build understanding from the network upward.</p><div class="course-tags"><span>12-stage roadmap</span><span>Interactive experiments</span></div>${this.progressMarkup(s,'course topics completed')}<a class="learn-action" href="${resume?'#/system-design/'+resume:'#/system-design'}">${resume?'Continue learning':'Start learning'} <span>↗</span></a><small>Available now: all 12 networking lessons</small></div></section>
   </div><footer class="learning-footer"><span>Read. Observe. Experiment. Understand.</span><span>No account needed · Progress stays on this device</span></footer></div>`;
 },
 sidebar(){return `<aside class="sd-sidebar"><details open><summary>System Design roadmap</summary><a class="sd-overview" href="#/system-design">Course overview</a><nav aria-label="System Design topics">${SD_STAGES.map(s=>{const c=SDProgress.counts(s.number);return `<details ${!this.active||this.active.stage===s.number?'open':''}><summary><span>${String(s.number).padStart(2,'0')} ${esc(s.name)}</span><small>${c.done}/${c.total}</small></summary>${s.topics.map(t=>`<a class="sd-topic ${this.active?.id===t.id?'current':''}" ${this.active?.id===t.id?'aria-current="page"':''} href="#/system-design/${t.id}"><span>${SDProgress.data.completed.includes(t.id)?'✓':SD_LESSONS[t.id]?'○':'·'} ${esc(t.name)}</span>${SD_LESSONS[t.id]?'':'<small>Planned</small>'}${SDProgress.data.bookmarks.includes(t.id)?'<span aria-label="Bookmarked">★</span>':''}</a>`).join('')}</details>`;}).join('')}</nav></details></aside>`;},
 course(){
  const c=SDProgress.counts(),current=SDProgress.data.current;
  return `<div class="home-kicker">THE SYSTEM DESIGN COURSE</div><h1>From a single request<br>to a complete system.</h1><p class="sd-lede">A progressive path through the networks, storage, and architectural choices that make software work. Explore at your own pace; prerequisites guide you without locking you out.</p>${this.progressMarkup(c,'course topics completed')}<p><b>12 lessons published</b> · ${SD_TOPICS.length} topics on the complete roadmap. Later stages are planned and cannot be marked complete.</p><a class="learn-action inline" href="#/system-design/${current||'client-server'}">${current?'Continue learning':'Begin with client and server'} →</a>
   ${SDProgress.data.bookmarks.length?`<section class="sd-section"><h2>Your bookmarks</h2><div class="related-links">${SDProgress.data.bookmarks.map(id=>{const t=SD_TOPICS.find(t=>t.id===id);return `<a href="#/system-design/${id}">${esc(t.name)}</a>`;}).join('')}</div></section>`:''}
   <div class="stage-grid">${SD_STAGES.map(s=>{const c=SDProgress.counts(s.number),published=s.topics.filter(t=>SD_LESSONS[t.id]).length;return `<section class="stage-card"><div class="course-label">STAGE ${String(s.number).padStart(2,'0')} · ${published?'AVAILABLE':'PLANNED'}</div><h2>${esc(s.name)}</h2><p>${s.prerequisites.length?'Builds on stages '+s.prerequisites.join(', '):'Start here — no networking knowledge assumed.'}</p>${this.progressMarkup(c,'stage topics completed')}<ol>${s.topics.map(t=>`<li><a href="#/system-design/${t.id}">${esc(t.name)}</a>${SDProgress.data.completed.includes(t.id)?' ✓':''}</li>`).join('')}</ol></section>`;}).join('')}</div>`;
 },
 lesson(t){
  const l=SD_LESSONS[t.id],done=SDProgress.data.completed.includes(t.id),bookmarked=SDProgress.data.bookmarks.includes(t.id);
  const prerequisites=[...SD_STAGES[t.stage-1].prerequisites.map(n=>`<a href="#/system-design">Stage ${n}: ${esc(SD_STAGES[n-1].name)}</a>`),...t.prerequisites.map(id=>`<a href="#/system-design/${id}">${esc(SD_TOPICS.find(t=>t.id===id)?.name||id)}</a>`)];
  const header=`<a class="back-link" href="#/system-design">← Course overview</a><div class="lesson-title"><div><div class="course-label">STAGE ${t.stage} / ${l?'NETWORKING FUNDAMENTALS':'PLANNED TOPIC'}</div><h1>${esc(t.name)}</h1></div><button id="sdBookmark" class="ghost-btn" aria-pressed="${bookmarked}">${bookmarked?'★ Bookmarked':'☆ Bookmark'}</button></div>`;
  if(!l) return header+`<section class="sd-section"><h2>This lesson has not been published yet.</h2><p>It is part of the course roadmap. Detailed explanations, experiments, and guided walkthroughs will be added stage by stage. There is no lesson to complete here yet.</p>${prerequisites.length?'<h3>Recommended foundations</h3><div class="related-links">'+prerequisites.join('')+'</div>':''}<p><a href="#/system-design/client-server">Explore the available networking lessons →</a></p></section>`;
  const paras=a=>a.map(p=>`<p>${esc(p)}</p>`).join('');
  const sec=(letter,title,body)=>`<section class="sd-section"><div class="section-label">${letter}</div><h2>${title}</h2>${body}</section>`;
  return header+`<div class="lesson-objectives"><h2>What you’ll understand</h2><ul>${l.objectives.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>${prerequisites.length?`<h3>Before this lesson</h3><div class="related-links">${prerequisites.join('')}</div>`:'<p>No prerequisites. Start with curiosity.</p>'}</div>`+
   sec('A','Introduction',paras(l.intro))+sec('B','Fundamentals',paras(l.fundamentals))+
   sec('C','Inside the process',`<ol class="working-steps">${l.working.map(p=>`<li>${esc(p)}</li>`).join('')}</ol>`)+
   sec('D','Watch it work',`<p class="model-note">Simplified conceptual model. Timing is illustrative; no real network traffic is generated. Highlighted components and the explanation describe the current step.</p><div class="sd-simulator"><div id="sdDiagram"></div><div class="sd-player"><button id="sdFirst" aria-label="Restart simulation">↺</button><button id="sdPrev" aria-label="Previous step">←</button><button id="sdPlay" aria-label="Play animation">▶</button><button id="sdNext" aria-label="Next step">→</button><button id="sdLast" aria-label="Last step">⇥</button><span id="sdCount"></span><label>Speed <input id="sdSpeed" type="range" min="1" max="5" value="1" aria-label="Animation speed"></label><input id="sdScrub" type="range" min="0" max="0" value="0" aria-label="Simulation timeline"></div><div class="sd-frame-info"><div id="sdPacket"></div><p id="sdNote" aria-live="polite"></p><div id="sdState"></div></div></div><details class="walkthrough"><summary>Inspect the complete step-by-step trace</summary><ol id="sdTrace"></ol></details>`)+
   sec('E','Try an experiment',`<p>${esc(l.experiment)}</p><div id="sdControls" class="experiment-controls">${l.controls.map(c=>this.control(c)).join('')}</div><p class="muted">Changing a control restarts the trace so every frame reflects the same inputs.</p>`)+
   sec('F','Technical deep dive',paras(l.deep))+sec('G','In a real application',paras(l.usage))+
   sec('H','Summary & knowledge check',`<ul>${l.summary.map(p=>`<li>${esc(p)}</li>`).join('')}</ul><div class="knowledge-check"><h3>Think it through</h3><p>${esc(l.check[0])}</p><label class="reflection-label">Your explanation<textarea rows="3" placeholder="Explain it in your own words…"></textarea></label><details><summary>Compare with an explanation</summary><p>${esc(l.check[1])}</p></details></div><p>When you can explain the process and the experiment’s outcome, mark this lesson complete. Completion is your own learning record.</p><button id="sdComplete" class="learn-action inline" aria-pressed="${done}">${done?'✓ Completed — mark incomplete':'Mark lesson complete'}</button>`)+
   `<section class="sd-section"><h2>Key terms</h2><dl>${Object.entries(l.glossary).map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl><h2>Authoritative references</h2><ul>${l.sources.map(([name,url])=>`<li><a href="${esc(url)}" target="_blank" rel="noopener">${esc(name)} ↗</a></li>`).join('')}</ul><h2>Related concepts</h2><div class="related-links">${SD_TOPICS.filter(x=>SD_LESSONS[x.id]&&x.prerequisites.includes(t.id)).map(x=>`<a href="#/system-design/${x.id}">${esc(x.name)}</a>`).join('')||'<a href="#/system-design">Explore the roadmap</a>'}</div></section>`+
   this.lessonNavigation(t);
 },
 lessonNavigation(t){const list=SD_TOPICS.filter(t=>SD_LESSONS[t.id]),i=list.findIndex(x=>x.id===t.id);return `<nav class="lesson-navigation" aria-label="Previous and next lesson">${i>0?`<a href="#/system-design/${list[i-1].id}">← ${esc(list[i-1].name)}</a>`:'<span></span>'}${i<list.length-1?`<a href="#/system-design/${list[i+1].id}">${esc(list[i+1].name)} →</a>`:'<a href="#/system-design">Return to roadmap →</a>'}</nav>`;},
 control(c){const [key,label,type,a,b,def]=c;const id='sd-input-'+key;
  if(type==='checkbox')return `<label class="experiment-field"><input id="${id}" data-option="${key}" type="checkbox" ${a?'checked':''}> ${esc(label)}</label>`;
  if(type==='select')return `<label class="experiment-field">${esc(label)}<select id="${id}" data-option="${key}">${a.map(v=>`<option ${v===b?'selected':''}>${esc(v)}</option>`).join('')}</select></label>`;
  return `<label class="experiment-field">${esc(label)} <output for="${id}">${b}</output><input id="${id}" data-option="${key}" type="range" min="${type}" max="${a}" step="1" value="${b}"></label>`;
 },
 bindProgress(){
  $('#sdBookmark')?.addEventListener('click',()=>{
   SDProgress.toggle('bookmarks',this.active.id);const b=$('#sdBookmark'),on=SDProgress.data.bookmarks.includes(this.active.id);b.setAttribute('aria-pressed',on);b.textContent=on?'★ Bookmarked':'☆ Bookmark';this.refreshSidebar();
  });
  $('#sdComplete')?.addEventListener('click',()=>{
   SDProgress.toggle('completed',this.active.id);const b=$('#sdComplete'),on=SDProgress.data.completed.includes(this.active.id);b.setAttribute('aria-pressed',on);b.textContent=on?'✓ Completed — mark incomplete':'Mark lesson complete';this.refreshSidebar();
  });
 },
 refreshSidebar(){const open=$$('.sd-sidebar nav details').map(d=>d.open);$('.sd-sidebar').outerHTML=this.sidebar();$$('.sd-sidebar nav details').forEach((d,i)=>d.open=open[i]);},
 initSimulation(l){
  this.player=new Player({play:$('#sdPlay'),prev:$('#sdPrev'),next:$('#sdNext'),first:$('#sdFirst'),last:$('#sdLast'),scrub:$('#sdScrub'),count:$('#sdCount'),speed:$('#sdSpeed')},(f,i)=>this.paint(f,i));
  const player=this.player,originalPause=player.pause.bind(player),originalPlay=player.play.bind(player);
  player.pause=()=>{originalPause();$('#sdDiagram')?.classList.remove('sd-running');$('#sdPlay')?.setAttribute('aria-label','Play animation');};
  player.play=()=>{originalPlay();$('#sdDiagram')?.classList.add('sd-running');$('#sdPlay')?.setAttribute('aria-label','Pause animation');};
  $$('#sdControls [data-option]').forEach(el=>el.addEventListener('input',()=>{
   const out=el.parentElement.querySelector('output');if(out)out.value=el.value;this.rebuild();
  }));this.rebuild();
 },
 rebuild(){
  this.options={};$$('#sdControls [data-option]').forEach(el=>this.options[el.dataset.option]=el.type==='checkbox'?el.checked:el.value);
  const simulation=SD_SIM.build(this.active.id,this.options);this.nodes=simulation.nodes;
  this.player.load(simulation.frames);
  $('#sdTrace').innerHTML=simulation.frames.map((f,i)=>`<li><button data-step="${i}">${esc(f.packet)}</button><p>${esc(f.note)}</p></li>`).join('');
  this.player.go(0);
  $$('#sdTrace [data-step]').forEach(b=>b.addEventListener('click',()=>{this.player.pause();this.player.go(+b.dataset.step);}));
 },
 paint(f,i){
  $('#sdDiagram').innerHTML=SD_SIM.diagram(this.nodes,f);
  $('#sdPacket').textContent=`Step ${i+1} · ${f.packet}`;$('#sdNote').textContent=f.note;
  $('#sdState').innerHTML=`<span><b>Model elapsed:</b> ${f.elapsed} ms</span>`+Object.entries(f.state).filter(([k])=>k!=='failed').map(([k,v])=>`<span><b>${esc(k)}:</b> ${esc(v)}</span>`).join('');
  $$('#sdTrace li').forEach((li,n)=>{li.classList.toggle('current',i===n);if(i===n)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');});
 }
};
document.addEventListener('DOMContentLoaded',()=>Platform.start());
