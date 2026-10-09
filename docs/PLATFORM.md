# Visual learning platform — interactive networking labs

## Architecture audit

The existing repository is a dependency-free JavaScript application, not a React application. `build.ps1` inlines `src/index.template.html` includes into `index.html`, `DSAViz.html`, and an artifact variant, then checks the merged JavaScript with Node. The committed root `index.html` is the GitHub Pages entry point; `publish.ps1` configures branch publication from `main / root`. No deployment workflow or backend is required.

`core.js` owns the algorithm registry, DOM helpers, source highlighting, and the frame `Player`. Algorithm definitions in seven `algos_*.js` files supply generator frames and Python/Java source tags. `render.js` draws SVG data and control-flow views. `App` owns the catalog, tabs, input controls, language selection, shortcuts, and rendering. `MyCode`, the Python interpreter files, and the external tracers provide custom-code replay. Reference and roadmap modules supply the other two DSA tabs.

Styling uses light/dark CSS tokens, system fonts, SVG, and small transitions. App state lives in plain objects. Existing localStorage keys remain unchanged: `dsaviz-progress`, `dsaviz-last`, `dsaviz-theme`, `dsaviz-mode`, `dsaviz-lang`, and `dsaviz-pycode`. DSA roadmap completion and LeetCode completion remain under the original progress key.

## Added modules

- `platform.js`: course dashboard, hash router, System Design workspace, lesson renderer, and separate progress storage.
- `sd-roadmap.js`: all 12 stages, stable topic identifiers, stage and topic prerequisites.
- `sd-lessons.js`: 12 authored networking lessons, objectives, sections A–H, terminology, references, and experiment definitions.
- `sd-simulations.js`: deterministic protocol scenario builders and arrival snapshots.
- `sd-lab-content.js`: topic-specific scenarios, actor inspection explanations, predictions, and deeper questions.
- `sd-scenes.js`: purpose-built SVG scenes and the continuous `SDTimeline` animation state machine.
- `sd-study.js`: Explore / Understand / Go deeper / Reflect modes, experiment controls, DNS cache state, and completed-run comparisons.
- `platform.css` and `study.css`: scoped course/workspace styles using the existing theme tokens.

DSA retains its original `Player`. System Design uses a dedicated `requestAnimationFrame` timeline that interpolates packet travel between arrival snapshots. Pausing retains the exact transfer fraction; resuming continues from it. Endpoint state remains at the previous snapshot until arrival. Stepping shows a completed event; restarting returns to the beginning. Changing a control starts a new coherent trace. Animations run once on lesson entry unless the document is hidden or reduced motion is requested. Selecting an actor pauses the process for inspection.

Scenes are tailored to the concept: resolver-centered DNS hierarchy, TCP handshake sequence ladder, received/buffered/delivered data, TLS identity gate, HTTP response envelope, persisted resource cards, per-resource readiness, WebSocket conversation, and browser page output. Narrow scenes use their own coordinates rather than a wide desktop SVG that requires horizontal scrolling. The roadmap is collapsed, and full explanations remain available through four accessible learning tabs. Completed runs display model times, event counts, and outcomes side by side; the explanation warns that a faster failed operation is not an improvement.

The DNS lab has a model clock, stored positive answer, expiration, and authoritative record. Repeated lookups can reuse a valid cached answer. Changing the authority does not invalidate that answer; advancing time beyond its TTL forces the next lookup to discover the updated record. Negative cache persistence, independent multi-level cache lifetimes, and real resolver policies are outside this conceptual model. No experiment generates real network traffic. See [research notes](RESEARCH.md) for sources and teaching decisions.

## Routes and deployment

| Hash | Workspace |
| --- | --- |
| `#/` or no hash | Course dashboard |
| `#/dsa` | Existing DSA visualizer |
| `#/dsa/mycode` | Existing Python runner / trace viewer |
| `#/dsa/reference` | Existing DSA reference |
| `#/dsa/roadmap` | Existing DSA roadmap |
| `#/system-design` | System Design overview and full roadmap |
| `#/system-design/dns` | Example published lesson |

All routes request the same root HTML document. No server rewrite is necessary on GitHub Pages, and the same build still works when opened as a local file. Build with `./build.ps1`. Review locally by opening `index.html` or serving the repository. Generated root HTML is committed for the existing branch-based GitHub Pages deployment.

## Progress

`dsaviz-system-design-v1` stores completed published lessons, bookmarked topic IDs, and the current published lesson. Stage and overall completion count the full roadmap, so finishing the available networking stage does not falsely indicate completion of unpublished stages. Future topics can be bookmarked and inspected for prerequisite guidance but have no completion action or lesson simulation. Browser storage failures leave the current session usable and display a persistence notice. Progress is local to the current origin and browser; opening a file and visiting the hosted page use different storage contexts.

## Delivered scope

Phases 1 and 2 are implemented. Stage 1 (Phase 3) contains client/server, internet routing, IP/ports, DNS, TCP/UDP, TCP establishment, TLS/HTTPS, HTTP lifecycle, method/status semantics, HTTP versions, WebSockets, and browser navigation. Each has its own explanatory content, process trace, experiment, real application example, conceptual exercise, and references.

Stage 2 (the next course stage requested as phase 2) now contains all 11 Application and Backend Fundamentals lessons: web servers, application servers, APIs, REST/GraphQL, worker state placement, cookies/sessions, authentication/authorization, reverse proxies, gateways, request lifecycle, and connection pooling. Every lesson includes the eight learning sections, controls, scenarios, inspectable actors, internal-state displays, references, reflection, completion, and bookmarks.

The backend implementation is split into `sd-backend-lessons.js`, `sd-backend-labs.js`, `sd-backend-simulations.js`, and `sd-backend-scenes.js`. These reuse the existing study workspace and timeline. Actor state changes on arrival, and completed-run evidence compares experiment inputs and outcomes. The course overview dynamically groups published lessons by stage; navigation crosses from Stage 1 into Stage 2.

Stages 3 through 12 remain roadmap entries. Their detailed lessons and walkthroughs have not yet been authored and remain explicitly planned. Completion is disabled for those topics.


## Verification

Run `node tests/platform-check.cjs` after building. This dependency-free check covers experiment variants and presets, desktop and narrow scene generation, specific protocol and backend outcomes, 243 independent pool/deadline combinations, cached versus authoritative answers, all eight lesson sections, prerequisite ordering, separate persisted progress, unpublished completion guards, and all 28 default DSA algorithm runs. A deterministic clock checks continuous interpolation, exact pause/resume, arrival, and animation completion. It also checks the merged bundle and identical offline/Pages outputs.

`tests/dom-check.cjs` additionally checks the actual built bundle and event wiring in Linkedom: application startup, all 23 labs and presets, tabs, actor inspection, DNS TTL/staleness/failure, pool expiration, replica failover, late write commits, backend progress, reduced-motion startup, a narrow SVG layout, DSA tab navigation, Python execution, and animation cleanup. Install `linkedom@0.18.12` into a temporary directory and pass its module path: `node tests/dom-check.cjs <temporary-directory>/node_modules/linkedom`. It is a test-only tool and does not add an application dependency.

Browser verification could not run because the browser runtime reported no available browser. DOM event tests do not measure CSS geometry, raster appearance, or real browser focus and timing behavior. Those still need browser review. This limitation is reported separately from the passing functional checks.
