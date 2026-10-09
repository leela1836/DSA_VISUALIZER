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

## Technology decision

The original app already supports inline JavaScript and SVG. A dedicated `requestAnimationFrame` timeline allows smooth transfer interpolation, precise pause/resume, and arrival-driven snapshots. SVG keeps actors inspectable with keyboard-accessible controls and lets narrow layouts use their own coordinates instead of shrinking a wide desktop grid or introducing horizontal scrolling. These requirements do not require a framework migration. DSA keeps its existing player; the new System Design scene engine is independent.
