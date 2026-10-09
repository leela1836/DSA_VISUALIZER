/* Topic IDs are stable storage keys. Future topics are roadmap entries, not lessons. */
const SD_STAGES = [
  ['Internet and Networking Fundamentals', [], [
    ['client-server','Client and server',[]], ['internet','How the internet works',['client-server']],
    ['ip-ports','IP addresses and ports',['internet']], ['dns','DNS resolution',['ip-ports']],
    ['tcp-udp','TCP and UDP',['ip-ports']], ['tcp-handshake','TCP connection establishment',['tcp-udp']],
    ['tls','TLS and HTTPS',['tcp-handshake','dns']], ['http-lifecycle','HTTP request-response lifecycle',['tls']],
    ['http-semantics','HTTP methods and status codes',['http-lifecycle']], ['http-versions','HTTP versions',['http-semantics','tcp-udp']],
    ['websockets','WebSockets',['http-versions']], ['browser-server','Browser-to-server communication',['dns','tls','http-lifecycle','websockets']]
  ]],
  ['Application and Backend Fundamentals', [1], [
    ['s2-web-servers','Web servers',['http-lifecycle','http-semantics']],
    ['s2-application-servers','Application servers',['s2-web-servers']],
    ['s2-apis','APIs',['s2-application-servers','http-semantics']],
    ['s2-rest-and-graphql','REST and GraphQL',['s2-apis']],
    ['s2-stateless-and-stateful-architecture','Stateless and stateful architecture',['s2-application-servers']],
    ['s2-cookies-and-sessions','Cookies and sessions',['s2-stateless-and-stateful-architecture','tls']],
    ['s2-authentication-and-authorization','Authentication and authorization',['s2-cookies-and-sessions','s2-apis']],
    ['s2-reverse-proxies','Reverse proxies',['s2-web-servers','tls']],
    ['s2-api-gateways','API gateways',['s2-reverse-proxies','s2-authentication-and-authorization']],
    ['s2-request-lifecycle','Request lifecycle',['s2-application-servers','s2-authentication-and-authorization']],
    ['s2-connection-pooling','Connection pooling',['s2-request-lifecycle']]
  ]],
  ['Databases and Storage', [2], [
    ['s3-relational-databases','Relational databases',['s2-application-servers','s2-connection-pooling']],
    ['s3-nosql-databases','NoSQL databases',['s3-relational-databases']],
    ['s3-data-modeling','Data modeling',['s3-relational-databases','s3-nosql-databases']],
    ['s3-indexing','Indexing',['s3-data-modeling']],
    ['s3-query-execution','Query execution',['s3-indexing']],
    ['s3-transactions','Transactions',['s3-relational-databases','s3-query-execution']],
    ['s3-acid-properties','ACID properties',['s3-transactions']],
    ['s3-transaction-isolation','Transaction isolation',['s3-acid-properties']],
    ['s3-replication','Replication',['s3-acid-properties','s3-transaction-isolation']],
    ['s3-partitioning','Partitioning',['s3-query-execution']],
    ['s3-sharding','Sharding',['s3-partitioning','s3-replication']],
    ['s3-sql-versus-nosql','SQL versus NoSQL',['s3-data-modeling','s3-transaction-isolation','s3-sharding']],
    ['s3-object-storage','Object storage',['s2-apis','s3-acid-properties']],
    ['s3-file-storage','File storage',['s3-object-storage','s3-acid-properties']],
    ['s3-database-performance','Database performance',['s3-query-execution','s3-sharding','s2-connection-pooling']]
  ]],
  ['Caching', [3], ['Why caching exists','Browser caching','Application caching','Database caching','Distributed caching','Cache-aside','Read-through and write-through','Write-behind','TTL','Cache eviction strategies','Cache invalidation','Cache consistency','Redis fundamentals','Cache failure scenarios']],
  ['Scalability and Load Balancing', [2,3,4], ['Scalability fundamentals','Vertical scaling','Horizontal scaling','Load balancing','Load balancing algorithms','Health checks','Session affinity','Autoscaling','Traffic spikes','Bottlenecks','Capacity planning','Content delivery networks']],
  ['Distributed Systems', [3,5], ['Distributed architecture','Consistency and availability','Network partitions','CAP theorem','Consistency models','Replication strategies','Quorums','Leader election','Consensus fundamentals','Distributed locks','Clock synchronization','Fault tolerance','Failure recovery']],
  ['Messaging and Asynchronous Systems', [2,6], ['Synchronous versus asynchronous communication','Message queues','Publish-subscribe','Message brokers','Event-driven architecture','Kafka fundamentals','Event ordering','Delivery guarantees','Retries','Dead-letter queues','Idempotency','Backpressure']],
  ['Reliability and Performance', [5,6,7], ['Latency and throughput','Availability','Reliability','Redundancy','Failover','Timeouts and retries','Exponential backoff','Circuit breakers','Rate limiting','Throttling','Monitoring and observability','Logs, metrics, and traces','Disaster recovery']],
  ['Software Architecture', [2,3,6,7,8], ['Monolithic architecture','Layered architecture','Microservices','Service-to-service communication','Service discovery','API gateways','Event-driven systems','CQRS','Event sourcing','Saga pattern','Architecture trade-offs']],
  ['Security and Deployment Fundamentals', [1,2,8,9], ['HTTPS and encryption','Authentication mechanisms','OAuth 2.0 and OpenID Connect','JWT','CORS','Common web security threats','Containers','Docker fundamentals','Kubernetes fundamentals','Cloud infrastructure fundamentals','CI/CD','Deployment strategies']],
  ['System Design Methodology', [3,5,8,9,10], ['Understanding system requirements','Identifying functional requirements','Identifying non-functional requirements','Estimating scale','Basic capacity calculations','Identifying system components','Designing APIs','Data modeling','Data flow','Recognizing bottlenecks','Evaluating trade-offs','Evolving architectures gradually']],
  ['Real-World Architecture Walkthroughs', [11], ['URL shortener','Chat application','Social media feed','Video streaming platform','E-commerce application','Notification system','File upload and storage system','Search autocomplete','Ride-booking platform','Payment processing architecture']]
].map(([name, prerequisites, topics], i) => ({
  number:i+1, name, prerequisites,
  topics:topics.map((t,j) => Array.isArray(t) ? {id:t[0],name:t[1],prerequisites:t[2]} : {
    id:`s${i+1}-${t.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`, name:t,
    prerequisites:j ? [`s${i+1}-${String(topics[j-1]).toLowerCase().replace(/[^a-z0-9]+/g,'-')}`] : []
  })
}));
const SD_TOPICS = SD_STAGES.flatMap(s => s.topics.map(t => ({...t, stage:s.number})));
