# Breaking Dijkstra · The Shortest Path Lab

A browser-based research workspace for comparing an indexed binary-heap Dijkstra implementation with the recursive BMSSP procedure of Duan, Mao, Mao, Shu, and Yin.

**Accuracy comes before a speed claim.** The paper proves an asymptotic improvement on sparse graphs. This application visualizes its procedure using a simplified queue; it does **not** implement or claim the paper's running-time bound. Local measurements currently favor the Dijkstra baseline. See the [review and evidence](docs/REVIEW.md).

Source: [Breaking the Sorting Barrier for Directed Single-Source Shortest Paths, arXiv:2504.17033v2](https://arxiv.org/html/2504.17033v2), 30 July 2025.

## Run

Requires Node.js 20.9+ and npm. Node 22 is recommended; validation used Node 22.15.0.

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). For production:

```sh
npm run build
npm start
```

## Workspace

- Ten reproducible directed graph presets, including zero-weight cycles and disconnected components.
- One playback timeline: run, pause, replay, reset, previous/next event, jump to result, scrub, and change speed.
- Click or keyboard-select a vertex to inspect its route. Source and target may be identical.
- Separate discovery, tentative estimates, and certified completion. Paths and distance tables use the current snapshot.
- A step inspector and a navigable execution trace for each algorithm.
- Final outputs checked against independent Bellman–Ford distances and parent-path certificates on every comparison.
- JSON result exports preserve full numeric distances. Unreachable distances are `null`, with `reachable: false` and an empty path.
- Responsive layout, focus indicators, accessible vertex controls, and reduced-motion support.

Outside form controls, **Space** plays/pauses, **← / →** step, and **Home / End** jump to the beginning/end. Main section tabs support arrow-key navigation. Switching sections preserves the trace and suspends playback; returning resumes it if it was playing.

## Paper fidelity

The implementation follows Algorithms 1–3 for bounded witness rounds, tight-forest pivot selection, the singleton bounded-heap base case, recursive block processing, equality reuse, interval routing, and witness completion. Small-graph parameters use base-2 logarithms:

```text
k = max(1, floor(log₂(n)^(1/3)))
t = max(1, floor(log₂(n)^(2/3)))
L = ceil(log₂(n) / t)
BMSSP(L, ∞, {source})
```

Section 2's path ordering is distance, hop count, then reversed vertex sequence. In comparisons between different vertices, the endpoint resolves the final tie; relaxing to the same vertex compares predecessors. No epsilon suppresses small improvements. Infinity is represented by `Infinity`.

Deliberate limitations:

| Component                 | This application                                                                                     | Implication                                                                                                                                                   |
| ------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lemma 3.3 queue           | Immutable key/value entries, full sort on Pull, equivalent insertion and batch-prepend key semantics | The paper's amortized time bounds are not achieved. This changes asymptotic complexity, not just constants.                                                   |
| Constant-degree reduction | Omitted to retain visible original vertices                                                          | Arbitrary-degree graphs are supported for distances, but the paper's time analysis does not transfer.                                                         |
| Arithmetic                | IEEE-754 JavaScript numbers                                                                          | Not exact real arithmetic; finite non-negative weights are required and overflowing candidate path sums throw. Small representable improvements are retained. |
| Dijkstra baseline         | Indexed binary heap with decrease-key                                                                | O((m+n) log n) without tracing. The paper compares against O(m+n log n) using an advanced heap.                                                               |
| Trace                     | Immutable snapshots, capped at 10,000 by default                                                     | Trace cost is excluded from benchmarks. Truncation is reported and the final snapshot is always retained.                                                     |

Agreement on tests is evidence, not a proof for all inputs or all real weights. The exact-real complexity theorem belongs to the paper, not this demo.

## Benchmarks

The Benchmarks section uses a dedicated worker so computation does not block interaction. It checks both results independently, performs five warm-up runs per algorithm, calibrates batches to reduce timer-resolution effects, alternates algorithm order across 21 measured batches, and reports per-run medians and 10th–90th percentile batch averages.

Timing excludes graph generation, oracle/certificate checks, trace snapshots, and rendering. Algorithm allocations, counters, heap operations, and queue sorting are included. Grid vertex counts round down to a square. Results describe one seeded graph per configuration and one runtime/device; they are not an asymptotic experiment or a claim about the paper's optimized algorithm.

Run the same kernels in Node:

```sh
npm run benchmark
# Optional: capture fresh evidence (overwrites the saved report)
npm run benchmark --silent > docs/benchmark-results.json
```

The saved [local report](docs/benchmark-results.json) records the measured environment and full results.

## Verify

```sh
npm test
npm run lint
npm run typecheck
npm run build
npm audit
```

Tests use Node's built-in runner and the project's installed TypeScript compiler, with no additional test runtime dependency. They compare both algorithms with an independently implemented Bellman–Ford oracle, verify reconstructed paths, and check every finalized vertex in recorded sample traces. Coverage includes 1,200 small seeded adversarial graphs, 80 larger positive-weight graphs, 100 larger zero-weight adversarial graphs, every source in every sample, malformed inputs, finite-range overflow, full-density generation, empty pivot sets, truncation, benchmark validation, and heap decrease-key behavior.

The dependency lockfile pins the tested tree. Next.js stays on major 15, with a PostCSS 8.5.32 override to replace its vulnerable pinned transitive version. Recheck the audit and build when updating dependencies.

## Structure

```text
app/                         Workspace and visual system
components/                  Graphs, algorithm inspector, benchmarks, methodology
lib/algorithms.ts            Dijkstra and BMSSP, optional trace recording
lib/priority-queue.ts        Indexed binary heap
lib/graph.ts                 Validated graph model and seeded generators
lib/benchmark.ts             Independent verification and measurement protocol
lib/benchmark.worker.ts      Browser benchmark isolation
scripts/benchmark.cjs        Reproducible Node measurement entrypoint
tests/                      Regression and differential tests
docs/                       Review and measured evidence
```

There are no API keys, external compute services, or application data uploads. Initial page assets are served by Next.js; Google fonts are fetched at build time and served locally by Next.js afterward. Source-paper links navigate to arXiv.
