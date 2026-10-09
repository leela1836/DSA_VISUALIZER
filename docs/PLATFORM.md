# Visual learning platform — first release

## Architecture audit

The existing repository is a dependency-free JavaScript application, not a React application. `build.ps1` inlines `src/index.template.html` includes into `index.html`, `DSAViz.html`, and an artifact variant, then checks the merged JavaScript with Node. The committed root `index.html` is the GitHub Pages entry point; `publish.ps1` configures branch publication from `main / root`. No deployment workflow or backend is required.

`core.js` owns the algorithm registry, DOM helpers, source highlighting, and the frame `Player`. Algorithm definitions in seven `algos_*.js` files supply generator frames and Python/Java source tags. `render.js` draws SVG data and control-flow views. `App` owns the catalog, tabs, input controls, language selection, shortcuts, and rendering. `MyCode`, the Python interpreter files, and the external tracers provide custom-code replay. Reference and roadmap modules supply the other two DSA tabs.

Styling uses light/dark CSS tokens, system fonts, SVG, and small transitions. App state lives in plain objects. Existing localStorage keys remain unchanged: `dsaviz-progress`, `dsaviz-last`, `dsaviz-theme`, `dsaviz-mode`, `dsaviz-lang`, and `dsaviz-pycode`. DSA roadmap completion and LeetCode completion remain under the original progress key.

## Added modules

- `platform.js`: course dashboard, hash router, System Design workspace, lesson renderer, and separate progress storage.
- `sd-roadmap.js`: all 12 stages, stable topic identifiers, stage and topic prerequisites.
- `sd-lessons.js`: 12 authored networking lessons, objectives, sections A–H, terminology, references, and experiment definitions.
- `sd-simulations.js`: deterministic scenario builders and reusable SVG nodes, links, packets, highlighting, and failure markers.
- `platform.css`: scoped dashboard/workspace styles using the existing theme tokens.

The System Design player reuses the existing `Player` rather than introducing a second animation library. Frames carry endpoints, packet labels, explanation, elapsed model time, and state. Every control change rebuilds a complete deterministic trace and restarts it. Pausing freezes the packet motion and the logical frame. The trace is also inspectable as text, with buttons that jump to individual frames. Timings are explicitly illustrative and no experiment makes network requests.

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

All routes request the same root HTML document. No server rewrite is necessary on GitHub Pages, and the same build still works when opened as a local file. Build with `./build.ps1`. Review locally by opening `index.html` or serving the repository. Publication to the existing GitHub repository was not performed in this implementation.

## Progress

`dsaviz-system-design-v1` stores completed published lessons, bookmarked topic IDs, and the current published lesson. Stage and overall completion count the full roadmap, so finishing the available networking stage does not falsely indicate completion of unpublished stages. Future topics can be bookmarked and inspected for prerequisite guidance but have no completion action or lesson simulation. Browser storage failures leave the current session usable and display a persistence notice. Progress is local to the current origin and browser; opening a file and visiting the hosted page use different storage contexts.

## Delivered scope

Phases 1 and 2 are implemented. Stage 1 (Phase 3) contains client/server, internet routing, IP/ports, DNS, TCP/UDP, TCP establishment, TLS/HTTPS, HTTP lifecycle, method/status semantics, HTTP versions, WebSockets, and browser navigation. Each has its own explanatory content, process trace, experiment, real application example, conceptual exercise, and references.

Stages 2–12 are the complete visible roadmap for subsequent phases. Their detailed lessons and architecture walkthroughs are not yet authored and are explicitly marked planned. They are not represented as completed educational content.

## Verification

Run `node tests/platform-check.cjs` after building. This dependency-free check covers all experiment control variants, process endpoints and monotonic timing, specific protocol outcomes, all eight lesson sections, prerequisite ordering, separate persisted progress, malformed storage, unpublished completion guards, route construction, player stepping/pausing, and default generators for all 28 DSA algorithms. It also checks the merged bundle and identical offline/Pages outputs.

Browser verification could not run because the browser runtime reported no available browser. Responsive styles, focus behavior, reduced motion, and actual rendered SVG appearance therefore still need browser review. The automated checks are not a substitute for visual QA or a full Python-interpreter regression suite.
