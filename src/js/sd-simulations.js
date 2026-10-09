/* Pure, deterministic frame builders. Times are illustrative, never benchmarks. */
const SD_SIM = {
 build(id, o){
  const nodes = [], frames = [];
  let elapsed = 0;
  const node = (id,label,kind='server') => nodes.push({id,label,kind});
  const step = (from,to,packet,note,dt=0,state={}) => {
   elapsed += dt;
   frames.push({from,to,packet,note,elapsed,state:{...state}});
  };
  const link = Number(o.network) || 40;
  if (id === 'client-server') {
   node('client','Weather client','client'); node('server','Forecast API');
   step('client','client','Create request','The client prepares a request for the forecast.',0,{phase:'request ready'});
   step('client','server','Request →','The network delivers the request to the server.',link,{phase:'server received'});
   step('server','server','Compute forecast','The server performs application work.',+o.work,{phase:'response ready'});
   step('server','client','← Response','The client receives the result. Total = 2 × link delay + server work.',link,{phase:'client received',formula:`2 × ${link} + ${o.work} ms`});
  } else if (id === 'internet') {
   node('client','Your device','client'); node('gateway','Home gateway','router'); node('isp','Provider router','router');
   node('transit','Transit A','router'); node('alternate','Transit B','router'); node('backup','Backup hop','router'); node('edge','Destination edge','router'); node('server','Website');
   step('client','gateway','IP packet','The destination is outside the local network, so the device sends to its gateway.',link);
   step('gateway','isp','Next hop','The gateway forwards toward the internet provider.',link);
   if(o.failed){
    step('isp','isp','Primary link down','The primary transit link is unavailable. This model assumes a preinstalled alternate route.',0,{failed:'transit'});
    step('isp','alternate','Alternate route','Forwarding uses an available next hop; routing convergence is omitted.',link,{failed:'transit'});
    step('alternate','backup','Extra hop','This alternate path has one additional hop.',link,{failed:'transit'});
    step('backup','edge','Forward packet','The backup path reaches the destination edge.',link,{failed:'transit'});
   } else {
    step('isp','transit','Forward packet','The provider selects the matching route.',link);
    step('transit','edge','Forward packet','The transit router reaches the destination edge.',link);
   }
   step('edge','server','Deliver payload','The destination receives this packet. IP alone does not recover other lost packets.',link,o.failed?{failed:'transit'}:{});
  } else if(id === 'ip-ports') {
   node('client','Client :52000','client'); node('host','Host 192.0.2.10','router'); node('https','TCP :443 listener'); node('closed',o.port==='443'?'Other TCP ports':`TCP :${o.port} closed`);
   step('client','host',`TCP → ${o.port}`,'The destination address is from a documentation-only IP range.',40,{destination:`192.0.2.10:${o.port}`});
   step('host',o.port==='443'?'https':'closed','Endpoint lookup','The OS selects a transport endpoint by protocol, address, and port.',0,{destination:`192.0.2.10:${o.port}`});
   step(o.port==='443'?'https':'closed','client',o.port==='443'?'Accepted':'TCP reset',o.port==='443'?'A listener can accept the connection; TLS and HTTP come next.':'This model has no listener at this port and returns a reset. A firewall could instead cause a timeout.',40,{outcome:o.port==='443'?'listener available':'connection refused',failed:o.port==='443'?'':'closed'});
  } else if(id === 'dns') {
   node('browser','Browser cache','client'); node('os','OS / stub','client'); node('resolver','Recursive resolver','dns'); node('root','Root server','dns'); node('tld','.com TLD','dns'); node('auth','Authoritative','dns');
   const cachedAnswer = {'answer':o.cacheAddress||o.address||'192.0.2.10',record:'A library.example.com',cache:o.cache};
   const answer = {'answer':o.address||'192.0.2.10',record:'A library.example.com',cache:o.cache};
   step('browser','browser','Cache check','The browser checks for a valid answer for this name and record type.');
   if(o.cache==='browser') step('browser','browser','Cache hit','A valid browser answer avoids all DNS network queries.',0,cachedAnswer);
   else {
    step('browser','os','Resolve name','The browser delegates resolution to the OS / configured resolution service.',0);
    if(o.cache==='OS') step('os','browser','OS cache hit','The OS returns a still-valid address. The recursive resolver is not contacted.',0,cachedAnswer);
    else {
     step('os','resolver','Recursive query','The stub asks the recursive resolver to obtain an answer.',20);
     if(o.cache==='resolver') step('resolver','os','Resolver cache hit','The resolver returns an unexpired answer without asking the hierarchy.',20,cachedAnswer);
     else {
      step('resolver','root','Where is .com?','A completely cold resolver asks a root server for the .com delegation.',20);
      step('root','resolver','TLD referral','The root refers the resolver to TLD name servers; it does not fetch the website.',20);
      step('resolver','tld','Where is example.com?','The resolver follows the referral itself and asks for example.com’s authority.',20);
      step('tld','resolver','Authority referral','The TLD returns the delegated authoritative servers (and needed glue addresses).',20);
      step('resolver','auth','A library.example.com?','The resolver asks the authority for the address record in this documentation-domain model.',20);
      step('auth','resolver',o.missing?'NXDOMAIN':'A '+answer.answer,o.missing?'The authority reports that the name does not exist. This can be negatively cached.':'The authority returns an address and TTL. The resolver caches the answer.',20,o.missing?{answer:'no address',status:'NXDOMAIN'}:answer);
      step('resolver','os',o.missing?'Negative answer':'Address answer','The recursive resolver sends the result back to the stub.',20,o.missing?{answer:'no address',status:'NXDOMAIN'}:answer);
     }
     step('os','browser',o.missing&&o.cache==='none'?'No address':'Return answer',o.missing&&o.cache==='none'?'The browser cannot connect using a nonexistent name.':'The browser now has an address; connecting to the site is a separate process.',0,o.missing&&o.cache==='none'?{answer:'no address',status:'NXDOMAIN'}:o.cache==='resolver'?cachedAnswer:answer);
    }
   }
  } else if(id === 'tcp-udp') {
   node('sender','Sender','client'); node('network','Network','router'); node('receiver','Receiver');
   step('sender','receiver','Unit A','The first unit arrives and is delivered.',40,{delivered:'A'});
   step('sender',o.loss?'network':'receiver','Unit B',o.loss?'The middle unit is lost in the network.':'The middle unit arrives.',40,{delivered:o.loss?'A':'AB',failed:o.loss?'network':''});
   step('sender','receiver','Unit C',o.loss&&o.transport==='TCP'?'C arrives, but TCP buffers later bytes until the missing B arrives.':'The later unit arrives; UDP can deliver this datagram without waiting for B.',40,{delivered:o.loss?(o.transport==='TCP'?'A':'A,C'):'ABC',buffered:o.loss&&o.transport==='TCP'?'C':'none'});
   if(o.loss&&o.transport==='TCP'){
    step('receiver','sender','Loss detected','TCP detects missing bytes. This illustrative wait is not an actual retransmission timer.',200,{delivered:'A',buffered:'C'});
    step('sender','receiver','Retransmit B','B fills the gap; the receiver can now deliver B and buffered C in order.',40,{delivered:'ABC',buffered:'none'});
   } else if(o.loss) step('receiver','receiver','Gap remains','UDP does not retransmit B automatically. Application-specific recovery could be added.',0,{delivered:'A,C',missing:'B'});
  } else if(id === 'tcp-handshake') {
   node('client','TCP client','client'); node('server','TCP listener');
   step('client','client','Active open','The client chooses its initial sequence number; the server is listening.',0,{client:'CLOSED',server:'LISTEN'});
   step('client','server','SYN seq=100','The client enters SYN-SENT. On receiving SYN, the server prepares provisional connection state.',link,{client:'SYN-SENT',server:'SYN-RECEIVED'});
   if(o.loss) step('server','server','SYN-ACK lost','The first reply is lost; neither endpoint can assume setup is complete. An illustrative retry wait follows.',300,{client:'SYN-SENT',server:'SYN-RECEIVED'});
   step('server','client','SYN-ACK seq=500 ack=101',o.loss?'A retransmitted reply reaches the client. SYN consumes one sequence number.':'The server acknowledges the client SYN and supplies its own initial sequence.',link,{client:'ESTABLISHED',server:'SYN-RECEIVED'});
   step('client','server','ACK ack=501','The final ACK reaches the server; both endpoints are now established.',link,{client:'ESTABLISHED',server:'ESTABLISHED'});
  } else if(id === 'tls') {
   node('browser','Browser','client'); node('server','TLS server');
   step('browser','server','ClientHello','The client offers parameters and an ephemeral key share. TCP is already established.',30,{protected:'not yet'});
   step('server','browser','ServerHello','The server selects parameters and a key share. Both sides derive handshake keys.',30,{protected:'handshake keys ready'});
   step('server','browser','Certificate + proof + Finished','Encrypted server handshake messages authenticate the server and the transcript. The private key stays on the server.',0,{protected:'handshake encrypted'});
   if(o.invalid) step('browser','browser','Reject identity','The certificate hostname does not match. The browser stops; it must not send the HTTP request.',0,{status:'validation failed',failed:'server'});
   else {
    step('browser','browser','Validate server','The browser validates the certificate chain, hostname, validity, proof, and Finished.',0,{status:'server authenticated'});
    step('browser','server','Client Finished','The client authenticates the transcript. Application traffic keys protect subsequent data.',30,{protected:'application traffic keys'});
    step('browser','server','Encrypted HTTP','HTTP is sent over the secured connection. This does not authorize the user’s operation.',30,{protected:'HTTP encrypted'});
   }
  } else if(id === 'http-lifecycle') {
   node('browser','Browser','client'); node('app','Book API'); node('store','Book store','database');
   step('browser','app','GET /books/42','Accept: application/json. This request uses an existing secure connection.',30,{status:'waiting'});
   if(o.unavailable) step('app','browser','503 Service Unavailable','The server sends an HTTP error response; this differs from losing the connection.',30,{status:'503',body:'service temporarily unavailable'});
   else {
    step('app','store','Read book 42','The application performs a lookup; work time groups application and storage delay.',+o.work,{status:'processing'});
    step('store','app','Book representation','The application receives the record and constructs a response.',0,{status:'response ready'});
    step('app','browser','200 OK + JSON','Content-Type: application/json. The browser can parse the response body.',30,{status:'200',body:'{"id":42,"available":true}'});
   }
  } else if(id === 'http-semantics') {
   node('client','API client','client'); node('api','Book API'); node('store','Resource state','database');
   let count = 1, present=true;
   step('store','store','Initial state','A single resource already exists. PUT targets it; POST targets the collection.',0,{count,present});
   for(let n=1;n<=2;n++){
    step('client','api',`${o.method} attempt ${n}`,o.method==='POST'?'POST /books requests a new entry.':'The request targets /books/42.',20,{count,present});
    let status='200 OK';
    if(o.method==='POST'){count++;status='201 Created';}
    if(o.method==='PUT'){present=true;status='200 OK';}
    if(o.method==='DELETE'){status=present?'204 No Content':'404 Not Found';present=false;count=0;}
    step('api','store','Apply semantics',o.method==='GET'?'Read only: no intended mutation.':o.method==='POST'?'A new identifier is allocated for each creation.':o.method==='PUT'?'Replace resource 42 with the same supplied representation.':'Ensure resource 42 is absent.',0,{count,present});
    step('api','client',status,'Compare the intended effect with the previous attempt. Responses need not match for idempotence.',20,{count,present,status});
   }
  } else if(id === 'http-versions') {
   node('client','Browser','client'); node('server',`HTTP/${o.version} server`); node('a','Resource A','resource'); node('b','Resource B','resource'); node('c','Resource C','resource');
   step('client','server',o.version==='1.1'?'Request A':'Streams A, B, C',o.version==='1.1'?'One connection, no pipelining: requests are serial in this model.':'Three streams share a connection. Headers are already available.',20,{available:'none'});
   if(o.version==='1.1'){
    if(o.loss) step('server','a','A data lost','TCP recovers lost A data before this serial exchange can finish.',120,{available:'none'});
    step('server','a','A complete','Resource A finishes.',30,{available:'A'});
    step('client','server','Request B','The next serial request begins.',20,{available:'A'});
    step('server','b','B complete','Resource B finishes.',30,{available:'A,B'});
    step('client','server','Request C','The final serial request begins.',20,{available:'A,B'});
    step('server','c','C complete','Multiple HTTP/1.1 connections could produce a different schedule.',30,{available:'A,B,C'});
   } else if(o.loss&&o.version==='2') {
    step('server','a','TCP gap in A data','Later received TCP bytes are held behind the gap, even if they contain B and C frames.',30,{available:'none',buffered:'B,C'});
    step('server','client','TCP recovery','Retransmission fills the byte-stream gap. This is an illustrative delay.',120,{available:'A,B,C',buffered:'none'});
   } else {
    step('server','b','B complete',o.loss?'A gap in one QUIC stream does not impose ordering on B.':'Multiplexing allows B to complete independently.',30,{available:'B'});
    step('server','c','C complete','C’s needed bytes are available. Shared congestion effects are omitted.',20,{available:'B,C'});
    step('server','a',o.loss?'Recover A':'A complete',o.loss?'Only A waits for its missing stream data in this schedule. QUIC still provides reliability.':'A completes; this order is illustrative, not prescribed by HTTP.',o.loss?120:20,{available:'A,B,C'});
   }
  } else if(id === 'websockets') {
   node('browser','Chat browser','client'); node('server','Chat server');
   step('browser','server','Upgrade: websocket','An HTTP/1.1 request asks to upgrade with the required WebSocket handshake fields.',30,{channel:'HTTP'});
   step('server','browser','101 Switching Protocols','The server accepts. WebSocket framing now replaces ordinary HTTP framing.',30,{channel:'WebSocket open'});
   step('browser','server','Message: hello','A masked client frame carries application data. Masking is not encryption; wss adds TLS.',30,{channel:'open',delivered:'client message'});
   if(o.disconnect) step('server','server','Channel lost','The server push cannot reach the browser. A new channel needs application-defined resume behavior.',0,{channel:'disconnected',delivered:'no server push',failed:'browser'});
   else step('server','browser','Message: new comment','The server initiates a message without waiting for another HTTP request.',30,{channel:'open',delivered:'server push'});
  } else if(id === 'browser-server') {
   node('browser','Browser','client'); node('dns','DNS resolver','dns'); node('server','HTTPS server'); node('parser','HTML parser','client'); node('paint','Layout & paint','client');
   step('browser','browser','Parse URL','Separate scheme, host, and request target. A URL fragment stays in the browser.',0,{phase:'navigation'});
   if(o.warm==='connection open') step('browser','server','Reuse connection','A suitable secure connection is already established: skip DNS, TCP, and TLS setup.',0,{phase:'connection reuse'});
   else {
    if(o.warm==='DNS cached') step('browser','browser','DNS cache hit','An address is available, but a new transport connection is still required.',0,{phase:'DNS cached'});
    else {step('browser','dns','Resolve hostname','DNS returns address records, not page content.',30,{phase:'DNS'});step('dns','browser','Address answer','The browser has a destination address.',30,{phase:'DNS answer'});}
    step('browser','server','TCP setup','Complete the ordinary three-way handshake. The model groups its messages.',60,{phase:'TCP'});
    step('browser','server','TLS 1.3 setup','Verify the server identity and derive traffic keys.',60,{phase:'TLS'});
   }
   step('browser','server','GET /books','Request the main document over the secure connection.',30,{phase:'HTTP request'});
   step('server','browser','200 + HTML','A received document is input to rendering, not finished pixels.',70,{phase:'HTTP response'});
   step('browser','parser','Parse document','Build the DOM and discover a stylesheet. Real discovery and fetching can overlap.',10,{phase:'DOM'});
   step('parser','server','Fetch stylesheet','Subresources may need more requests or use caches; this one is not cached.',60,{phase:'subresource'});
   step('parser','paint','Compute and paint','Styles contribute to the CSSOM; layout determines geometry and painting draws content.',20,{phase:'visible page'});
  } else throw new Error('No simulation for '+id);
  return {nodes,frames};
 }
};
