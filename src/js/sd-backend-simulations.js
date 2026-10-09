/* Deterministic backend experiments. Time is illustrative; no real credentials or traffic. */
const SDBackendSim = {
 build(id,o){
  const nodes=[],frames=[];let elapsed=0;
  const node=(id,label,kind='server')=>nodes.push({id,label,kind});
  const step=(from,to,packet,note,dt=20,state={})=>{elapsed+=dt;frames.push({from,to,packet,note,elapsed,state:{...state}});};
  const send=(from,to,status,note,state={})=>step(from,to,status,note,40,{status,...state});
  node('client','Browser','client');
  if(id==='s2-web-servers'){
   node('web','Web server');node('files','Static files','resource');node('app','Application');
   const path=o.path||'/logo.svg';step('client','web','GET '+path,'HTTP reaches the listener. Host and path select a configured handler.',40,{route:path});
   if(path==='/api/books'){step('web','app','Proxy /api/books','The API route delegates to application code; the web server does not invent the book list.',30,{handler:'application'});step('app','web','JSON representation','The application generates a response from its own logic.',80,{body:'books: [Atlas, Orbit]',mime:'application/json'});send('web','client','200 OK','The web server forwards the generated response.');}
   else {step('web','files','Map URI to file','The static handler resolves the configured document root, not an arbitrary client-supplied filesystem path.',10,{handler:'static'});step('files','web',o.missing?'Not found':'Read logo.svg',o.missing?'The configured file is absent; no application request is needed.':'The file bytes and image/svg+xml media type become the response.',20,{body:o.missing?'not found':'<svg>…</svg>',mime:o.missing?'text/plain':'image/svg+xml'});send('web','client',o.missing?'404 Not Found':'200 OK','Status, headers, and body return over the HTTP connection.');}
  }else if(id==='s2-application-servers'){
   node('app','Application');node('rules','Order rules','resource');node('store','Inventory','database');
   const qty=+o.quantity||1,stock=+o.stock||0;
   step('client','app','POST /orders','The handler receives a requested quantity. This example assumes an already authenticated buyer.',40,{requested:qty,stock});
   step('app','rules','Validate quantity','The domain layer checks a positive quantity before consulting inventory.',15,{phase:'validated'});
   step('rules','store','Reserve conditionally','A conditional inventory update reserves only when stock is sufficient. Checking and then writing separately would race.',+o.work||80,{phase:'reserving'});
   const accepted=qty<=stock;step('store','app',accepted?'Reservation committed':'Insufficient stock',accepted?'The illustrative atomic update reduced inventory once.':'The conditional update changed no inventory; the handler maps this domain conflict to HTTP.',10,{stock:accepted?stock-qty:stock,orders:accepted?1:0});
   send('app','client',accepted?'201 Created':'409 Conflict','Application logic decides the result; database latency changes waiting time, not the business rule.');
  }else if(id==='s2-apis'){
   node('api','API boundary');node('contract','Contract validator','resource');node('store','Books','database');
   const valid=o.payload==='valid',compatible=o.version==='v1';
   step('client','api','POST /v'+(compatible?'1':'2')+'/books','The API is a contract between separately changing programs.',40,{payload:valid?'title: Orbit':'title: null',version:o.version});
   step('api','contract','Check route and schema','This service exposes only v1. Its title must be a nonempty string. HTTP alone does not define these application rules.',15,{phase:'validation'});
   if(!compatible)send('api','client','404 Not Found','No v2 route exists. Versioning a URL does not automatically implement a new contract.',{writes:0});
   else if(!valid)send('api','client','400 Bad Request','The body fails this service’s schema. It never reaches persistence.',{writes:0});
   else {step('contract','store','Create book','Validated input crosses the persistence boundary.',60,{writes:1});send('api','client','201 Created','A stable representation and Location header let the client discover the created resource.');}
  }else if(id==='s2-rest-and-graphql'){
   node('api',o.style==='GraphQL'?'GraphQL endpoint':'Resource API');node('profile','Profile resolver');node('orders','Order resolver');node('store','Data store','database');
   const graph=o.style==='GraphQL',withOrders=!!o.orders,batch=!!o.batch;let requests=0,reads=0;
   const request=(packet)=>{requests++;step('client','api',packet,'Count a client HTTP request, separately from downstream data accesses.',40,{requests,reads});};
   request(graph?(withOrders?'{ user { name orders { total } } }':'{ user { name } }'):'GET /users/42');
   step('api','profile','Resolve profile','The handler or resolver obtains profile data. Selection syntax does not eliminate this work.',10);
   reads++;step('profile','store','Read user 42','Both designs require a data source.',35,{reads});
   if(withOrders){if(!graph){send('api','client','200 OK','The first resource request returns the user representation before the client requests orders.',{requests,reads});request('GET /users/42/orders');}step('api','orders','Resolve orders','Our example has three orders. A naive resolver can cause N+1 reads; batching is an implementation choice.',10);
    const count=batch?1:3;for(let k=0;k<count;k++){reads++;step('orders','store',batch?'Batch three orders':'Read order '+(k+1),'A data access occurs here, inside the server, not on the browser connection.',35,{reads});}}
   send('api','client','200 OK',graph?'The response follows the requested field shape. GraphQL can also return field errors alongside partial data.':'These resource endpoints return their documented representations. REST could also provide an aggregated endpoint.',{requests,reads,body:withOrders?'name + three totals':'name',status:'200 OK'});
  }else if(id==='s2-stateless-and-stateful-architecture'){
   node('router','Request router','router');node('a','Replica A');node('b','Replica B');node('store','Shared session store','database');
   const shared=o.storage==='shared',sticky=!!o.sticky;
   step('client','router','Add Atlas to cart','The first request routes to replica A.',40,{cart:'empty',localA:'empty',localB:'empty'});step('router','a','Request 1 → A','Replica A receives a cart mutation.',15);
   step('a',shared?'store':'a','Save cart',shared?'A persists session data in a shared store available to both workers.':'Only A’s process memory holds the cart. A replacement worker cannot reconstruct it.',30,{localA:shared?'none':'Atlas',cart:'Atlas'});
   step('client','router','Read cart','A second request can land on another replica.',40);
   const dest=sticky&&!o.fail?'a':'b';step('router',dest,'Request 2 → '+dest.toUpperCase(),o.fail?'A is unavailable; the router sends this request to B.':'Routing follows this experiment’s affinity setting.',15,{failed:o.fail?'a':''});
   if(shared)step(dest,'store','Load cart','B or A reads the same durable session key. Shared storage introduces its own availability dependency.',30);
   send(dest,'client','200 OK',shared||dest==='a'?'The cart is present because the receiving replica can access its state.':'B returns an empty cart: the information was never stored where B could read it.',{cart:shared||dest==='a'?'Atlas':'empty',outcome:shared||dest==='a'?'cart preserved':'cart lost'});
  }else if(id==='s2-cookies-and-sessions'){
   node('app','Session service');node('jar','Browser cookie jar','resource');node('store','Session store','database');
   const age=+o.age||0,ttl=+o.ttl||30,secure=!!o.secure;
   step('client','app','POST /login over HTTPS','Assume credentials were verified. The example uses an opaque session ID, not a password cookie.',40);
   step('app','store','Create s_demo → learner','Only the server stores the identity mapping and expiry. s_demo is deliberately fake and not a usable credential.',15,{session:'active',age:0,ttl});
   step('app','jar','Set-Cookie: sid=s_demo','The browser applies cookie attributes. Secure restricts transmission to HTTPS; HttpOnly prevents script reads, not CSRF.',40,{cookie:'stored',attributes:secure?'Secure; HttpOnly; SameSite=Lax':'HttpOnly; SameSite=Lax'});
   step('jar','jar','Advance '+age+' seconds','This slider advances server-session age. The example cookie is still stored; server expiry and cookie expiry are separate.',age*1000,{age});
   const sent=o.scheme==='HTTPS'||!secure;step('jar','app',sent?'Cookie: sid=s_demo':'No session cookie',sent?'The browser sends the cookie on this same-site request.':'Secure cookies are withheld over HTTP. This model does not perform HSTS upgrades.',40,{cookie:sent?'sent':'withheld'});
   if(sent)step('app','store','Look up session','The server checks both existence and expiry rather than trusting the cookie text.',15,{session:age>=ttl?'expired':'active'});
   send('app','client',sent&&age<ttl?'200 OK':'401 Unauthorized',sent&&age<ttl?'An active server-side session identifies the learner.':'No active session identifies the learner; a stored cookie alone is insufficient.');
  }else if(id==='s2-authentication-and-authorization'){
   node('auth','Identity verifier');node('policy','Access policy','resource');node('store','Private documents','database');
   step('client','auth','GET /documents/42','The client claims an identity. The server must establish it using a valid credential.',40,{identity:'unverified',access:'unchecked',reads:0});
   const valid=o.credential==='valid';step('auth','auth','Verify credential',valid?'This conceptual verifier establishes learner Alice. Real verification checks signature or session, expiry, issuer, and audience as appropriate.':'A missing or expired credential cannot establish the requester’s identity.',15,{identity:valid?'Alice':'unknown'});
   if(!valid)send('auth','client','401 Unauthorized','Authentication failed; this protected resource does not reach the policy or database.',{access:'denied'});
   else {step('auth','policy','Can Alice read document 42?','Authorization compares the established subject, requested action, and resource owner. Being logged in is not enough.',15,{owner:o.owner});
    if(o.owner!=='Alice')send('policy','client','403 Forbidden','This model discloses that access is denied. Some services instead return 404 to conceal resource existence.',{access:'denied'});
    else {step('policy','store','Read permitted document','Access is allowed only after the resource-specific policy succeeds.',30,{access:'allowed',reads:1});send('store','client','200 OK','The permitted document is returned. UI visibility was never the security boundary.');}}
  }else if(id==='s2-reverse-proxies'){
   node('proxy','Reverse proxy','router');node('catalog','Catalog service');node('media','Media service');
   const target=o.path==='/images/cover'?'media':'catalog';step('client','proxy','HTTPS '+o.path,'The public connection terminates at the proxy. A separate upstream connection will carry the forwarded request.',40,{route:target,phase:'TLS terminated'});
   step('proxy',target,'Upstream '+o.path,'A configured path rule selects '+target+'. Forwarded identity headers need a trusted boundary.',20,{phase:'upstream request'});
   if(o.fail){step(target,'proxy','Upstream connection failed','The proxy cannot obtain a valid response from this upstream.',30,{failed:target});send('proxy','client','502 Bad Gateway','This connection failure becomes 502 in the model; an upstream timeout is a different condition, often 504.');}
   else {step(target,'proxy','200 + response bytes','The backend processes the request independently of the public TLS session.',60);send('proxy','client','200 OK','The proxy relays the response; it does not make a failing service healthy.');}
  }else if(id==='s2-api-gateways'){
   node('gateway','API gateway','router');node('catalog','Catalog service');node('orders','Orders service');
   const count=+o.requests||1,limit=+o.limit||3;let allowed=0,rejected=0;
   for(let k=1;k<=count;k++){
    step('client','gateway','Request '+k+': '+o.path,'Each request enters one illustrative fixed quota window for a single client identity.',40,{allowed,rejected,used:allowed,limit});
    if(!o.auth){rejected++;send('gateway','client','401 Unauthorized','The configured gateway policy rejects the missing credential before routing.',{allowed,rejected});}
    else if(allowed>=limit){rejected++;send('gateway','client','429 Too Many Requests','The window budget is exhausted. Production rate limiting needs a defined key, shared state, and retry guidance.',{allowed,rejected});}
    else {allowed++;const target=o.path==='/orders'?'orders':'catalog';step('gateway',target,'Route '+o.path,'Admission succeeded. The backend still enforces its own resource-level authorization.',30,{allowed,rejected,used:allowed,limit});send(target,'client','200 OK','This service responds; the diagram omits the return hop through the gateway for clarity.',{allowed,rejected});}
   }
   step('gateway','gateway','Window summary','Resetting this experiment starts a new model window. Counts are requests admitted or rejected, not a real benchmark.',0,{outcome:allowed+' admitted / '+rejected+' rejected'});
  }else if(id==='s2-request-lifecycle'){
   node('middleware','Middleware chain');node('handler','Order handler');node('store','Order store','database');node('logs','Trace log','resource');
   const work=+o.work||100,timeout=+o.timeout||200;
   step('client','middleware','POST /orders • trace t42','The incoming request receives a trace ID used across the example’s processing stages.',40,{trace:'t42',phase:'received',writes:0});
   step('middleware','logs','t42: request started','Logging middleware records receipt before later middleware can reject the request.',5,{phase:'logged'});
   step('middleware','middleware','Authenticate → validate','This chain verifies identity first and then validates the body. Middleware may stop processing early.',10,{phase:o.invalid?'rejected':'validated'});
   if(o.invalid)send('middleware','client','400 Bad Request','Validation fails, so neither the handler nor database executes.',{outcome:'no write'});
   else {step('middleware','handler','Invoke domain handler','Validated input reaches application rules.',10,{phase:'handling'});
    if(work>timeout){step('handler','client','Client timeout','The client’s deadline expires while the server is still working. A timeout does not prove rollback.',timeout,{status:'timeout',phase:'client stopped waiting'});step('handler','store','Server commits later','In this model client cancellation is not propagated to database work. The write can still complete.',work-timeout,{writes:1,phase:'committed'});step('store','logs','t42: committed; client gone','The trace establishes an ambiguous outcome from the client’s perspective. A blind retry could duplicate the order.',5,{outcome:'timeout, write committed'});}
    else {step('handler','store','Commit order','The persistence operation completes within the example client deadline.',work,{writes:1,phase:'committed'});step('store','logs','t42: commit complete','The same trace ID connects ingress and persistence without recording secrets.',5);send('handler','client','201 Created','The client receives confirmation of the committed order.',{outcome:'confirmed write'});}}
  }else if(id==='s2-connection-pooling'){
   node('pool','Connection pool');node('queue','Wait queue','resource');node('store','Database','database');
   const size=+o.size||2,count=+o.requests||5,work=+o.work||100,wait=+o.wait||200;
   let waiting=Array.from({length:count},(_,i)=>'R'+(i+1)),busy=Array(size).fill('idle'),done=[],timedOut=[],time=0;
   const snap=()=>({waiting:[...waiting],busy:[...busy],done:[...done],timedOut:[...timedOut],poolSize:size,modelTime:time});
   step('client','pool',count+' simultaneous requests','All requests arrive at model time zero. Each needs one exclusive database connection for a fixed query duration.',0,snap());
   while(waiting.length||busy.some(x=>x!=='idle')){
    if(waiting.length&&time>=wait&&time>0){timedOut.push(...waiting);waiting=[];step('queue','client','Acquisition deadline reached','All still-queued requests have reached their acquisition deadline. None of their queries started.',0,snap());}
    for(let k=0;k<size&&waiting.length;k++)if(busy[k]==='idle'){
     const r=waiting.shift();if(time>=wait&&time>0){timedOut.push(r);step('queue','client',r+' acquisition timeout','This request waited too long to borrow a connection. Its query never started.',0,snap());}
     else {busy[k]=r;step('pool','store',r+' borrows connection '+(k+1),'A connection is leased to one operation until its query completes. Borrowing is not creating a new database connection.',0,snap());}}
    if(waiting.length)step('pool','queue','Wait: '+waiting.join(', '),'All connections are busy. Waiting creates latency; it does not increase query capacity.',0,snap());
    if(busy.every(x=>x==='idle'))break;
    const untilDeadline=waiting.length&&time<wait?wait-time:Infinity;
    if(untilDeadline<work){time+=untilDeadline;timedOut.push(...waiting);waiting=[];step('queue','client','Queued requests expire','Their acquisition deadlines arrive before this wave of queries finishes.',untilDeadline,snap());time+=work-untilDeadline;step('store','pool','Queries complete','The active queries still finish; queued timeouts did not cancel them.',work-untilDeadline,snap());}
    else {time+=work;step('store','pool','Queries complete','The active wave finishes after the fixed query duration.',work,snap());}
    done.push(...busy.filter(x=>x!=='idle'));busy.fill('idle');step('pool','client','Return results; release leases','Connections are returned for reuse. Every successful borrower must release its lease even on application errors.',0,snap());
   }
   step('pool','pool','Pool summary','This FIFO, simultaneous-arrival model ignores connection setup, variable queries, cancellation, and database contention. Larger pools are not always faster in reality.',0,{...snap(),outcome:done.length+' completed / '+timedOut.length+' timed out'});
  }else throw Error('Unknown backend simulation '+id);
  return {nodes,frames};
 }
};
