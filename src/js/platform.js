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
  this.pause();if(this.player?.dispose)this.player.dispose();this.player=null;
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
    <section class="course-card system-card"><div class="course-art network-art" aria-hidden="true"><div>CLIENTS</div><b>↓</b><div>APPLICATION</div><b>↓</b><div class="art-pair"><span>CACHE</span><span>DATABASE</span></div><span class="art-caption">follow the request, layer by layer</span></div><div class="course-card-body"><div class="course-label">02 / SYSTEMS</div><h2>System<br>Design</h2><p>Explore how requests travel, data is stored, and distributed services cooperate. Build understanding from the network upward.</p><div class="course-tags"><span>12-stage roadmap</span><span>Interactive experiments</span></div>${this.progressMarkup(s,'course topics completed')}<a class="learn-action" href="${resume?'#/system-design/'+resume:'#/system-design'}">${resume?'Continue learning':'Start learning'} <span>↗</span></a><small>Available now: ${Object.keys(SD_LESSONS).length} labs across networking and backend fundamentals</small></div></section>
   </div><footer class="learning-footer"><span>Read. Observe. Experiment. Understand.</span><span>No account needed · Progress stays on this device</span></footer></div>`;
 },
 sidebar(){return `<aside class="sd-sidebar"><details class="roadmap-toggle"><summary>&#9776; Browse the learning path <small>12 stages &middot; pick a concept</small></summary><a class="sd-overview" href="#/system-design">Course overview</a><nav aria-label="System Design topics">${SD_STAGES.map(s=>{const c=SDProgress.counts(s.number);return `<details ${!this.active||this.active.stage===s.number?'open':''}><summary><span>${String(s.number).padStart(2,'0')} ${esc(s.name)}</span><small>${c.done}/${c.total}</small></summary>${s.topics.map(t=>`<a class="sd-topic ${this.active?.id===t.id?'current':''}" ${this.active?.id===t.id?'aria-current="page"':''} href="#/system-design/${t.id}"><span>${SDProgress.data.completed.includes(t.id)?'✓':SD_LESSONS[t.id]?'○':'·'} ${esc(t.name)}</span>${SD_LESSONS[t.id]?'':'<small>Planned</small>'}${SDProgress.data.bookmarks.includes(t.id)?'<span aria-label="Bookmarked">★</span>':''}</a>`).join('')}</details>`;}).join('')}</nav></details></aside>`;},
 course(){
  const c=SDProgress.counts(),current=SDProgress.data.current;
  return `<div class="system-course-hero"><div><div class="home-kicker">THE SYSTEM DESIGN PLAYGROUND</div><h1>Pull a thread.<br>See the whole system move.</h1><p>Packets get lost. Caches remember old answers. Two endpoints disagree about a connection. Explore the mechanism, then explain the result.</p><a class="learn-action inline" href="#/system-design/${current||'client-server'}">${current?'Continue your experiment':'Explore your first request'} ↗</a></div><svg class="course-orbit" viewBox="0 0 240 220" aria-hidden="true"><path d="M45 65L185 65L115 175ZM45 65L115 175"/><circle cx="45" cy="65" r="24"/><circle cx="185" cy="65" r="24"/><circle cx="115" cy="175" r="24"/><text x="45" y="69" text-anchor="middle">CLIENT</text><text x="185" y="69" text-anchor="middle">API</text><text x="115" y="179" text-anchor="middle">DATA</text></svg></div>${this.progressMarkup(c,'course topics completed')}
   ${SDProgress.data.bookmarks.length?`<section class="study-reading"><h2>Saved for your next exploration</h2><div class="related-links">${SDProgress.data.bookmarks.map(id=>{const t=SD_TOPICS.find(t=>t.id===id);return `<a href="#/system-design/${id}">${esc(t.name)}</a>`;}).join('')}</div></section>`:''}
   ${SD_STAGES.filter(stage=>stage.topics.some(t=>SD_LESSONS[t.id])).map(stage=>`<section class="published-stage"><div class="course-label">STAGE ${String(stage.number).padStart(2,'0')} &middot; ${esc(stage.name)} &middot; ${stage.topics.filter(t=>SD_LESSONS[t.id]).length} LIVE LABS</div><div class="network-lab-cards">${stage.topics.filter(t=>SD_LESSONS[t.id]).map((t,i)=>{const lab=SD_LABS[t.id],done=SDProgress.data.completed.includes(t.id);return `<a class="network-lab-card" href="#/system-design/${t.id}"><div class="lab-card-kicker"><span>${String(i+1).padStart(2,'0')} / ${esc(t.name)}</span><span>${done?'&#10003;':'&#8599;'}</span></div><svg viewBox="-32 -32 64 64" aria-hidden="true">${SDScene.icon(stage.number===2?'server':['dns','internet'].includes(t.id)?'dns':t.id==='http-semantics'?'database':'client')}</svg><h3>${esc(lab.hook)}</h3><p>${esc(lab.caption)}</p><span class="open-lab">${done?'Revisit the experiment':'Open the experiment'} &rarr;</span></a>`;}).join('')}</div></section>`).join('')}
   <section class="future-path"><h2>Where the learning path goes next</h2><p class="sd-lede">Networking and backend fundamentals are available now. Stages 3 through 12 still need authored lessons and experiments.</p>${SD_STAGES.filter(s=>!s.topics.some(t=>SD_LESSONS[t.id])).map(s=>`<details class="future-stage"><summary><span>${String(s.number).padStart(2,'0')}</span><b>${esc(s.name)}</b><small>PLANNED · ${s.topics.length} TOPICS</small></summary><p>Builds on stages ${s.prerequisites.join(', ')}.</p><ul>${s.topics.map(t=>`<li><a href="#/system-design/${t.id}">${esc(t.name)}</a></li>`).join('')}</ul></details>`).join('')}</section>`;
 },
 lesson(t){
  if(SD_LESSONS[t.id])return SDStudy.lesson(t);
  const stage=SD_STAGES[t.stage-1],bookmarked=SDProgress.data.bookmarks.includes(t.id);
  return `<a class="back-link" href="#/system-design">&larr; All systems</a><div class="lesson-title"><div><div class="course-label">STAGE ${t.stage} / PLANNED TOPIC</div><h1>${esc(t.name)}</h1></div><button id="sdBookmark" class="ghost-btn" aria-pressed="${bookmarked}">${bookmarked?'&#9733; Saved':'&#9734; Save lesson'}</button></div><section class="study-reading"><h2>This lesson has not been published yet.</h2><p>This topic is part of ${esc(stage.name)}. Its explanation and interactive lab will be authored in a later stage. Explore the available networking and backend labs first.</p><a class="learn-action inline" href="#/system-design/client-server">Explore a working lab &rarr;</a></section>`;
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
   SDProgress.toggle('completed',this.active.id);const b=$('#sdComplete'),on=SDProgress.data.completed.includes(this.active.id);b.setAttribute('aria-pressed',on);b.textContent=on?'✓ Completed — mark incomplete':'I can explain this concept';this.refreshSidebar();
  });
 },
 refreshSidebar(){const open=$$('.sd-sidebar nav details').map(d=>d.open);$('.sd-sidebar').outerHTML=this.sidebar();$$('.sd-sidebar nav details').forEach((d,i)=>d.open=open[i]);},
 initSimulation(l){SDStudy.init(this,l);}

};
document.addEventListener('DOMContentLoaded',()=>Platform.start());
