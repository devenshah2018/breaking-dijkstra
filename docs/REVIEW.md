# Correctness, paper fidelity, performance, and product review

Reviewed 27 October 2026 against baseline commit `8a2951e` and [arXiv:2504.17033v2](https://arxiv.org/html/2504.17033v2), especially Section 2, Algorithms 1–3, Lemma 3.3, Remark 3.4, and Theorem 1.1.

## Conclusion

The baseline was not an accurate representation of either its own running time or several important details of BMSSP. A real shortest-distance error was reproduced. Its blanket claims of exact fidelity and speed were unsupported.

The updated application is deliverable as a verified educational research workspace. It implements the recursive procedure with the limitations explicitly described below. It is **not** a reproduction of the paper's asymptotically optimized data structure, an exact-real arithmetic engine, or evidence that BMSSP is faster in this application.

The paper proves deterministic O(m log^(2/3) n) directed SSSP in the comparison-addition model, improving the advanced-heap O(m+n log n) Dijkstra bound on sparse graphs. This is not a promise of a practical win for every graph or implementation.

## Baseline findings and fixes

| Priority | Finding                                                            | Evidence and correction                                                                                                                                                                                                                                                     |
| -------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| High     | Valid distance improvements were dropped                           | `EPS = 1e-9` rejected a path of 0.9999999995 in favor of 1. The regression test fails on the baseline and passes with exact numeric comparisons.                                                                                                                            |
| High     | The documentation incorrectly transferred the theorem's complexity | The old queue fully sorted on every Pull. Replacing Lemma 3.3 changes the asymptotics, not merely a constant. The UI, source comments, and README now disclose this.                                                                                                        |
| High     | Equality propagation was missing                                   | Strict improvement tests failed to reuse paths already relaxed by a deeper call. Remark 3.4 requires equality on Algorithms 1–3. Valid equal path labels are now reused and routed into the correct intervals.                                                              |
| High     | Witness completion depended on an unrelated global visited set     | Algorithm 3 line 26 includes every witness below the returned boundary. The previous code included only already globally completed witnesses. Completion now follows the bounded-call invariant; the global set is instrumentation, never a queue filter.                   |
| High     | Pivot construction diverged from Algorithm 1                       | The old code ignored equal labels and sources in successive layers, relied on stale parent assignments, and forced P = S for an empty pivot set. Tight predecessor forests, hop ordering, and valid empty pivot sets now follow the source procedure.                       |
| High     | Ties did not follow Section 2                                      | Distance plus vertex ID, with epsilon-based comparison, is insufficient for zero-weight paths and cycles. Labels now order by weight, hops, and endpoint; same-endpoint updates compare predecessors.                                                                       |
| Medium   | Finite artificial infinity was unsafe                              | Summing all edge weights can overflow or fail to create a strictly larger value at large magnitudes. True `Infinity` is used for the top bound, with a consistent comparator.                                                                                               |
| Medium   | Dijkstra was an unfairly slow baseline                             | It sorted an array before every extraction. It now uses an indexed binary heap and decrease-key, with its actual bound documented.                                                                                                                                          |
| Medium   | Graph inputs admitted NaN, infinity, and fractional vertices       | Graph size, endpoints, source, non-negative finite weights, density, and edge counts are validated. Candidate path overflow reports an error.                                                                                                                               |
| Medium   | Graph generators could loop forever                                | Impossible edge counts and rejection sampling near saturation were unbounded. Partial Fisher–Yates sampling provides bounded sampling work, validates capacity, and preserves a directed backbone.                                                                          |
| Medium   | A trace cap could hide the final result                            | Truncation is now explicit, with a reserved final snapshot that matches the returned distance map.                                                                                                                                                                          |
| Medium   | Playback and graphs misrepresented progression                     | Independent controls, premature results, hidden arrowheads, repeated SVG marker IDs, and fragile parent reconstruction obscured the computation. Shared playback, current-snapshot metrics, boundary arrows, unique marker IDs, and cycle-safe reconstruction replace them. |
| Medium   | Dependency audit reported 16 affected packages                     | Updated Next.js 15.4.8 to 15.5.28, refreshed non-breaking transitive dependencies, and overrode its pinned PostCSS with 8.5.32. Final npm audit reports zero known vulnerabilities. This is dependency evidence, not a comprehensive security certification.                |

## Algorithm review

**Initialization and labels.** Both algorithms validate the source and maintain distance, hop count, and predecessor information. Numeric ordering uses comparisons, never subtraction of infinities or epsilon equivalence. A shorter path cannot be ignored merely because the improvement is tiny. Parent paths have decreasing hop counts along tight predecessor edges, including zero-weight cycles.

**Dijkstra.** One heap entry per vertex prevents duplicate frontier entries. Decrease-key bubbles a decreased label upward. Each extracted vertex is certified before its edges are inspected. The heap and tracing are separate; queue snapshots are allocated only in trace mode.

**FindPivots.** The layer recurrence reuses valid equal labels, relaxes edges beyond B as Algorithm 1 specifies, and only collects witnesses below B. If W exceeds k·|S|, P = S. Otherwise a forest is reconstructed from current tight predecessor edges and aggregated from leaves. Only qualifying roots in S become pivots. No extra fallback is invented for empty P.

**BaseCase.** S is required to be a singleton. A bounded indexed binary heap examines at most k+1 vertices. If the workload limit is reached, the greatest label becomes the boundary and is excluded from U. Otherwise the input boundary is retained.

**Recursive BMSSP.** Queue entries hold immutable label snapshots. A Pull removes up to M smallest entries, returns the next key as the separating bound, and recurses. Valid relaxed labels in [Bᵢ, B) are inserted. Labels and deferred block sources in [B′ᵢ, Bᵢ) are batch-prepended. After recursion, every witness strictly below the achieved boundary is included and certified. A global completion set is displayed but does not control scheduling.

**Paths and unreachable vertices.** Parent reconstruction rejects cycles, unknown targets, broken chains, and a chain rooted at the wrong source. Unreachable distances stay infinite. JSON exports use null plus an explicit reachable flag. Equal source and target yields the zero-length path [s].

## Remaining fidelity limits

1. **Lemma 3.3 is not implemented.** Full sorting is a semantically useful queue substitute for this procedure visualization; it lacks the required amortized complexity. BatchPrepend is represented by equivalent key insertions after applying the paper's interval conditions. There is no claim that sorting the frontier breaks the sorting barrier.
2. **The degree reduction is omitted.** Original vertices remain visible. Distances are checked on arbitrary-degree inputs, but the constant-degree counting arguments cannot be transferred.
3. **IEEE-754 is not the exact-real model.** JavaScript addition can round, including losing improvements smaller than the representable spacing at very large scales. Overflowing candidate sums throw rather than silently treating reachable vertices as unreachable. Tests cover representable fractional improvements and very large finite distances, not all real numbers.
4. **Trace storage adds substantial work.** Map and set snapshots are for inspection, not part of a fair timing. Both benchmark kernels disable them. Events are different granularities of work, so comparing event counts is invalid.
5. **Differential testing is not a universal proof.** Bellman–Ford provides an independent oracle for the tested inputs. It shares JavaScript's number model. No formal verification or asymptotic certification has been performed.

A future full research implementation would need the Lemma 3.3 block sequences, balanced tree of block boundaries, linear-time median partitioning, amortized key deletion, constant-degree transformation, and a separate analysis and validation of those operations. The current disclosures are intentional release scope, not a claim that those requirements are unnecessary.

## Measured performance

Captured in [benchmark-results.json](benchmark-results.json), using Node 22.15.0 on Darwin arm64. Graph construction and correctness checks are excluded, with 5 warm-ups and 21 measured batches per algorithm. Batch sizes are separately calibrated; order alternates. All five configurations passed the independent distance and path checks.

| Graph         | Vertices |  Edges | Dijkstra median (ms/run) | BMSSP demo median (ms/run) | BMSSP / Dijkstra |
| ------------- | -------: | -----: | -----------------------: | -------------------------: | ---------------: |
| Sparse        |      100 |    300 |                    0.064 |                      0.333 |            5.20× |
| Sparse        |      500 |  1,500 |                    0.565 |                      1.668 |            2.95× |
| Sparse        |    1,000 |  3,000 |                    1.480 |                      4.509 |            3.05× |
| Directed grid |      961 |  1,860 |                    0.960 |                      1.785 |            1.86× |
| Dense         |      500 | 29,940 |                    2.567 |                     13.248 |            5.16× |

**Dijkstra has the lower median in these runs.** These are illustrative measurements of the shipped kernels, on one graph per configuration. They do not measure the paper's optimized implementation, establish a crossover point, characterize every graph family, or invalidate the theorem. Browser results can differ from Node and are generated on demand, with no prefilled values.

## Product upgrade

- A coherent light visual system: restrained color, graph-specific layouts, clear hierarchy, consistent spacing, readable inspection states, responsive cards, and a project icon.
- Directed arrows stop outside vertices; source, target, current vertex, pivots, frontier, paths, and completion have distinct treatments. Exact edge weights remain available in tooltips.
- A shared transport with event scrubbing, speed selection, replay, reset, jump-to-result, and keyboard shortcuts. Source changes reset the computation; target changes only change the inspection. Section changes preserve results and suspend hidden playback.
- Current distance table, path text, and two navigable execution traces. A displayed path is labeled tentative until certified.
- Worker-based reproducible benchmarks, cancellation, error states, medians and percentile ranges, real operation counts, and exportable run metadata.
- A source-linked methodology section that explicitly maps the implementation to the paper and records the limitations.
- Form labels, keyboard-selectable SVG vertices, unique marker IDs, focus indicators, main-tab arrow navigation, reduced-motion styling, and inline errors.

## Verification

The initial targeted regression was observed failing with `actual: 1, expected: 0.9999999995` before implementation. The updated targeted test passes.

Automated checks include every source in every sample, 1,200 small adversarial directed graphs, 80 larger positive-weight graphs, and 100 larger zero-weight adversarial graphs. Every finalized snapshot vertex in sample traces and selected larger traces is checked against the oracle. Each reachable final path must be acyclic, source-rooted, follow real edges, and have exactly the expected weight. Every benchmark family/size is independently validated. Heap, malformed inputs, overflow, saturated generation, valid empty pivots, and trace limits have specific regression tests.

Release checks: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, and `npm audit`. Production browser checks passed for play/pause, skip-to-result, trace seeking, source/target changes, disconnected components, source = target, section-state preservation, keyboard tab navigation, worker completion, and actual JSON download. The downloaded target certificate was `[0,4,10,13]`, distance 4, for both algorithms. A fresh production tab reported no console warnings or errors after SVG display coordinates were quantized to avoid cross-engine hydration differences.

The production browser benchmark on the 500-vertex, 1,500-edge sparse graph measured medians of 0.637 ms for Dijkstra and 1.900 ms for BMSSP (2.98× ratio), with independent verification. This is a separate browser run from the saved Node measurements.

Responsive checks at a 1265-pixel desktop content width and a 375-pixel mobile content width found no page-level horizontal overflow. Cards stack on narrow screens; the mobile transport was adjusted after inspection. No claim of a full hardware/browser accessibility matrix is made.

For the before/after reproduction, all intended changes were safely stashed, the baseline regression failed again, baseline lint reported 8 warnings and typecheck passed, and the stash was restored. The complete intended file set had the same SHA-256 digest before and after restoration (`117623f741fe0280984806240df588f87469a4c3c3806c9041bdc3fc3dfcced6`). The regression passed after restoration. The release checks were rerun after a fresh `npm ci`: 17 passing tests, zero lint warnings/errors, successful typecheck and production build, and zero audit findings.

## Visual evidence

- [Full workspace](workspace-preview.png)
- [Verified comparison](comparison-preview.png)
- [Mobile layout](mobile-preview.png)

## Release boundaries

The application is local, has no accounts, stored personal data, backend API, or paid service. No deployment, commit, push, or remote repository modification is included. Deliverable means the tested production build and reviewable working-tree changes are available; publishing remains a separate action. Recheck dependency advisories at deployment time.
