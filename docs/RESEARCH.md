# Research for the interactive learning redesign

Reviewed October 9, 2026. Public pages were retrieved and their explanatory structure and relevant technical sections reviewed. The lesson prose, scene assets, prompts, and code are original; article text and other sites’ assets are not copied into the application.

## Teaching and interaction

- [Explorable Explanations](https://explorabl.es/) collects learning experiences built around play.
- [Bret Victor’s Explorable Explanations](https://worrydream.com/ExplorableExplanations/) illustrates combining explanations with manipulation of a model.

Design inference: let the learner perform an intervention, see a changing model, and then explain what caused the outcome. A moving marker alone is insufficient when the underlying state is invisible. The new lessons therefore put an experiment first, show endpoint state and data readiness, provide scenario comparisons, and ask for a prediction with explanatory feedback. Reading remains available in short, distinct learning modes.

## Protocol evidence and its implementation

| Source | Question checked | Change in the lab |
| --- | --- | --- |
| [DNS concepts — RFC 1034](https://www.rfc-editor.org/rfc/rfc1034.html) | Who follows referrals? How does caching affect answers? | Resolver-centered hierarchy, distinct cache-hit paths, authoritative record changes and model-clock expiry. |
| [DNS overview — Cloudflare](https://www.cloudflare.com/learning/dns/what-is-dns/) | How can the hierarchy be introduced progressively? | Actors can be inspected separately, with client query and resolver queries distinguished. Normative behavior is checked against RFCs rather than treating every introductory analogy as exact. |
| [TCP — RFC 9293](https://www.rfc-editor.org/rfc/rfc9293.html) | When does each endpoint become established? What can an ordered byte stream expose? | A handshake sequence diagram with independent state badges, and separate buffered/delivered data lanes in the TCP/UDP lab. |
| [TLS 1.3 — RFC 8446](https://www.rfc-editor.org/rfc/rfc8446.html) | Are traffic-key derivation and server identity verification the same task? | An identity gate showing rejection before HTTP application data, plus explanations of key agreement, proof of possession, and transcript authentication. |
| [HTTP semantics — RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html) | Is idempotence about equal responses or intended effects? | Repeated operations visibly add, replace, or remove resource cards; DELETE can retain the same absence state while returning a different status. |
| [HTTP/2 — RFC 9113](https://www.rfc-editor.org/rfc/rfc9113.html) and [QUIC — RFC 9000](https://www.rfc-editor.org/rfc/rfc9000.html) | Which ordering dependency crosses streams? | Resource readiness and buffering displayed separately for TCP and QUIC; shared congestion effects are explicitly outside the isolated-loss model. |
| [WebSocket — RFC 6455](https://www.rfc-editor.org/rfc/rfc6455.html) | Does a persistent channel automatically recover missed events? | Conversation bubbles show failed delivery, with a deeper explanation of application replay, cursors, and backpressure. |
| [How browsers work — MDN](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/How_browsers_work) | How do navigation, parsing, and rendering fit together? | A URL-to-pixels scene that distinguishes cached DNS from an already established secure connection. |

Additional specification references remain attached to the individual lessons.

## Model boundaries learners can inspect

- Each networking lab models a specific interaction, not a production deployment or benchmark.
- Continuous animation is slower than model time so transfers can be observed and paused. Logical state changes at arrival; reading a current explanation does not imply the recipient already has the result.
- DNS uses a simulated `library.example.com` record and documentation-only IP addresses. The TTL clock advances explicitly. One selected cache level is modeled, and negative caching is explained but not persisted.
- The handshake illustrates ordinary TCP setup, including a single lost SYN-ACK. It omits simultaneous open, Fast Open, and realistic retransmission scheduling.
- A, B, and C are consecutive TCP byte ranges or independent UDP datagrams, not a claim that TCP preserves application message boundaries.
- The HTTP version experiment isolates loss affecting A and assumes headers are available. HTTP/1.1 uses one non-pipelined connection in that experiment; real browsers commonly use several.
- Browser navigation is a dependency illustration, not a promise that all browser work is serial.

## Backend lesson references and modeling boundaries

Stage 2 lessons use original explanations and link to these primary references:

- [NGINX request processing](https://nginx.org/en/docs/http/request_processing.html) and [reverse proxy documentation](https://nginx.org/en/docs/http/ngx_http_proxy_module.html) for handler selection and upstream boundaries.
- [MDN server-side introduction](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Server-side/First_steps/Introduction) for static and generated responses.
- [OpenAPI 3.1.1](https://spec.openapis.org/oas/v3.1.1.html) for interface descriptions, [Fielding's REST constraints](https://ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm), and [GraphQL execution](https://spec.graphql.org/October2021/#sec-Execution) for field resolution. The graph experiment distinguishes HTTP requests from downstream reads; batching is available to either interface.
- [OWASP session management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html), and [authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) for separate identity and resource-access boundaries. Fake credentials carry no actual authority.
- [MDN cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies) for storage and attributes. The experiment advances server-session age, not cookie expiry, and uses same-site traffic without HSTS upgrades.
- [Azure API gateway architecture](https://learn.microsoft.com/en-us/azure/architecture/microservices/design/gateway) for routing and entry policies. One simulated identity and fixed quota window do not implement a distributed limiter.
- [Django middleware](https://docs.djangoproject.com/en/5.2/topics/http/middleware/) for an ordered request chain. The timeout experiment deliberately omits propagated cancellation to show that a caller stopping its wait does not prove rollback.
- [PostgreSQL isolation](https://www.postgresql.org/docs/current/transaction-iso.html) for the reservation discussion. The single-buyer model assumes an atomic conditional update and does not simulate full checkout isolation.
- [PgBouncer modes](https://www.pgbouncer.org/features.html) for pooling and compatibility. The pool lab uses fixed-duration per-operation leases with simultaneous arrivals, FIFO waiting, and acquisition deadlines. It omits database contention and does not claim larger pools always help.

Operationally interchangeable workers using a shared session store are distinguished from REST's stricter stateless-interaction constraint. Routing affinity never copies worker memory. Later stages remain unpublished until their own content and simulations are authored.

## Keeping the existing rendering stack

The original app already supports inline JavaScript and SVG. A dedicated `requestAnimationFrame` timeline allows smooth transfer interpolation, precise pause/resume, and arrival-driven snapshots. SVG keeps actors inspectable with keyboard-accessible controls and lets narrow layouts use their own coordinates instead of shrinking a wide desktop grid or introducing horizontal scrolling. These requirements do not require a framework migration. DSA keeps its existing player; the new System Design scene engine is independent.
