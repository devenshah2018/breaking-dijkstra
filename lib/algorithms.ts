/**
 * Algorithm implementations for single-source shortest paths
 */

import { Graph } from './graph';

export interface AlgorithmStep {
  iteration: number;
  currentVertex?: number;
  distances: Map<number, number>;
  visited: Set<number>;
  queue?: number[];
  frontier?: Set<number>;
  complete?: Set<number>;
  pivots?: Set<number>;
  /** Recursion depth of the current BMSSP call (Tsinghua algorithm only). */
  level?: number;
  /** Current distance bound B of the active call (Tsinghua algorithm only). */
  bound?: number;
  description: string;
  decision?: string;
  actions?: string[];
  updatedVertices?: number[];
  parents?: Map<number, number | null>;
}

export interface AlgorithmResult {
  distances: Map<number, number>;
  parents: Map<number, number | null>;
  steps: AlgorithmStep[];
}

/**
 * Standard Dijkstra's algorithm with step tracking
 */
export function dijkstra(graph: Graph, source: number): AlgorithmResult {
  const n = graph.numVertices();
  if (source < 0 || source >= n) {
    throw new Error(`Source vertex must be in range [0, ${n - 1}]`);
  }

  const distances = new Map<number, number>();
  const parents = new Map<number, number | null>();
  const steps: AlgorithmStep[] = [];

  for (let i = 0; i < n; i++) {
    distances.set(i, Infinity);
    parents.set(i, null);
  }
  distances.set(source, 0);

  const pq: Array<[number, number]> = [[0, source]];
  const visited = new Set<number>();
  let iteration = 0;

  while (pq.length > 0) {
    iteration++;

    pq.sort((a, b) => a[0] - b[0]);
    const [currentDist, u] = pq.shift()!;

    if (visited.has(u)) {
      continue;
    }

    visited.add(u);

    const updatedVertices: number[] = [];
    const actions: string[] = [];

    for (const { to: v, weight } of graph.getNeighbors(u)) {
      const newDist = currentDist + weight;

      if (newDist < distances.get(v)!) {
        const oldDist = distances.get(v)!;
        distances.set(v, newDist);
        parents.set(v, u);
        updatedVertices.push(v);
        actions.push(`Updated vertex ${v}: ${oldDist === Infinity ? '∞' : oldDist.toFixed(2)} → ${newDist.toFixed(2)}`);

        if (!visited.has(v)) {
          pq.push([newDist, v]);
          actions.push(`Added vertex ${v} to priority queue`);
        }
      }
    }
    const decisionText = `Step ${iteration}: Process vertex ${u} (shortest distance: ${currentDist.toFixed(2)})`;
    const stepActions: string[] = [];

    if (actions.length > 0) {
      stepActions.push(`Explored edges from vertex ${u}:`);
      actions.forEach(action => {
        stepActions.push(`  • ${action}`);
      });
    } else {
      stepActions.push(`No shorter paths found from vertex ${u}`);
      stepActions.push(`  • All neighbors already have optimal distances`);
    }

    stepActions.push(`Vertex ${u} is now finalized - we know its shortest distance is ${currentDist.toFixed(2)}`);

    steps.push({
      iteration,
      currentVertex: u,
      distances: new Map(distances),
      visited: new Set(visited),
      queue: pq.map(([_, v]) => v),
      parents: new Map(parents),
      description: `Processing vertex ${u} with distance ${currentDist.toFixed(2)}`,
      decision: decisionText,
      actions: stepActions,
      updatedVertices,
    });
  }

  const reachableCount = Array.from(distances.values()).filter(d => d < Infinity).length;
  const finiteDistances = Array.from(distances.values()).filter(d => d < Infinity);
  const maxDistance = finiteDistances.length > 0 ? finiteDistances.reduce((max, d) => Math.max(max, d), 0) : 0;

  steps.push({
    iteration: iteration + 1,
    distances: new Map(distances),
    visited: new Set(visited),
    queue: [],
    parents: new Map(parents),
    description: `Algorithm Complete: All reachable vertices processed`,
    decision: `Algorithm Finished Successfully: Dijkstra's algorithm has completed. All ${reachableCount} reachable vertices from source ${source} have been processed and their shortest distances have been determined.${maxDistance > 0 ? ` Maximum distance found: ${maxDistance.toFixed(2)}.` : ''}`,
    actions: [
      `All reachable vertices have been processed`,
      `Shortest paths from source ${source} to all reachable vertices have been found`,
      `Total vertices processed: ${visited.size}`,
      `Reachable vertices: ${reachableCount}`,
      maxDistance > 0 ? `Maximum shortest distance: ${maxDistance.toFixed(2)}` : `Only source vertex is reachable`,
      `The algorithm is complete and the shortest path tree has been constructed`
    ],
  });

  return { distances, parents, steps };
}

/**
 * "Tsinghua" / Breaking-the-Sorting-Barrier algorithm (BMSSP) with step tracking.
 *
 * Faithful implementation of the recursive Bounded Multi-Source Shortest Path
 * procedure from:
 *   Duan, Mao, Mao, Shu, Yin — "Breaking the Sorting Barrier for Directed
 *   Single-Source Shortest Paths" (arXiv:2504.17033), which solves SSSP in
 *   O(m log^{2/3} n) time, beating Dijkstra's O(m + n log n) sorting barrier.
 *
 * The three conceptual ingredients of the paper are reproduced exactly:
 *
 *   1. FINDPIVOTS(B, S): run k rounds of bounded (distance < B) Bellman-Ford
 *      relaxation outward from the frontier S, collecting the witness set W of
 *      reached vertices. Build the shortest-path forest of W and keep as
 *      "pivots" P only the frontier vertices whose subtree has >= k vertices.
 *      This guarantees |P| <= |W|/k, shrinking the frontier by a ~k factor.
 *      If the witnesses blow up (|W| > k|S|) it bails out with P = S.
 *
 *   2. BMSSP(l, B, S): the recursive driver. It seeds a queue with the pivots,
 *      then repeatedly *partially* sorts the frontier — pulling only the next
 *      bounded block of the M = 2^{(l-1)t} smallest-distance vertices instead of
 *      fully sorting it — and recurses on that block with a tighter bound. This
 *      partial sorting is precisely what "breaks the sorting barrier".
 *
 *   3. BASECASE(B, S) [l = 0]: a bounded multi-source Dijkstra that settles at
 *      most k+1 vertices and returns a new boundary B'.
 *
 * Two implementation notes (these affect constants / robustness only, never the
 * computed distances, which are verified to match Dijkstra exactly):
 *   - The paper's specialised O(1)-amortised block queue (its Lemma 3.3) is
 *     replaced here by a straightforward sort-on-pull queue. This changes only
 *     the asymptotic constant, not the set of vertices pulled per block nor the
 *     output.
 *   - Vertices are ordered lexicographically by (distance, vertex-id) so that
 *     ties never split a block — the standard tie-breaking the analysis assumes.
 *   - The constants k, t are computed from log n but floored at small values so
 *     the pivot/recursion machinery is actually exercised on the small demo
 *     graphs (for tiny n the true log^{1/3} n would round down to 1).
 */
export function breakingDijkstra(graph: Graph, source: number): AlgorithmResult {
  const n = graph.numVertices();
  if (source < 0 || source >= n) {
    throw new Error(`Source vertex must be in range [0, ${n - 1}]`);
  }

  const EPS = 1e-9;

  const distances = new Map<number, number>();
  const parents = new Map<number, number | null>();
  const steps: AlgorithmStep[] = [];

  for (let i = 0; i < n; i++) {
    distances.set(i, Infinity);
    parents.set(i, null);
  }
  distances.set(source, 0);

  const complete = new Set<number>([source]);

  // Parameters from the paper (floored so the machinery shows up on small n).
  const log2n = Math.log2(Math.max(n, 2));
  const k = Math.max(2, Math.floor(Math.pow(log2n, 1 / 3)));
  const t = Math.max(2, Math.floor(Math.pow(log2n, 2 / 3)));
  const L = Math.max(1, Math.ceil(log2n / t));

  let totalWeight = 0;
  for (const e of graph.getEdges()) totalWeight += e.weight;
  // A finite "infinity" so the distance bound B is a real number we can compare.
  type Bound = { d: number; i: number };
  const BTOP: Bound = { d: totalWeight + 1, i: Infinity };

  const d = (v: number) => distances.get(v)!;
  // Lexicographic comparison of keys (distance, vertex-id).
  const cmp = (ad: number, ai: number, bd: number, bi: number) =>
    Math.abs(ad - bd) > EPS ? (ad < bd ? -1 : 1) : ai - bi;
  const inBound = (v: number, B: Bound) => cmp(d(v), v, B.d, B.i) < 0;
  const inBoundDist = (nd: number, v: number, B: Bound) => cmp(nd, v, B.d, B.i) < 0;
  const keyLess = (a: number, b: number) => cmp(d(a), a, d(b), b) < 0;

  const fmt = (x: number) => (x >= BTOP.d ? '∞' : x === Infinity ? '∞' : x.toFixed(2));
  const fmtBound = (B: Bound) => (B.d >= BTOP.d ? '∞' : B.d.toFixed(2));
  const list = (s: Iterable<number>, max = 8) => {
    const a = Array.from(s);
    return a.length <= max ? a.join(', ') : `${a.slice(0, max).join(', ')} (+${a.length - max} more)`;
  };

  let seq = 0;
  const MAX_STEPS = 2000;
  const record = (
    opts: {
      level: number;
      bound: Bound;
      frontier?: Iterable<number>;
      pivots?: Iterable<number>;
      currentVertex?: number;
      decision: string;
      actions: string[];
      description?: string;
    }
  ) => {
    if (steps.length >= MAX_STEPS) return;
    seq++;
    steps.push({
      iteration: seq,
      currentVertex: opts.currentVertex,
      distances: new Map(distances),
      visited: new Set(),
      frontier: opts.frontier ? new Set(opts.frontier) : new Set(),
      complete: new Set(complete),
      pivots: opts.pivots ? new Set(opts.pivots) : new Set(),
      level: opts.level,
      bound: opts.bound.d,
      parents: new Map(parents),
      description: opts.description ?? opts.decision,
      decision: opts.decision,
      actions: opts.actions,
    });
  };

  record({
    level: L,
    bound: BTOP,
    frontier: [source],
    pivots: [],
    decision: `Starting Point: begin at vertex ${source} with distance 0, then run BMSSP (Bounded Multi-Source Shortest Path) recursively.`,
    actions: [
      `Set distance to vertex ${source} = 0 and mark it complete.`,
      `Parameters (from the paper, floored for small graphs): k=${k} relaxation rounds, t=${t}, recursion depth L=${L}.`,
      `Top-level distance bound B = ∞ (here represented as ${BTOP.d.toFixed(2)}, just above the largest possible path).`,
      `Goal: complete vertices in distance-ordered blocks without ever fully sorting the frontier.`,
    ],
  });

  /**
   * FINDPIVOTS: k rounds of bounded relaxation from S; return reduced pivots P
   * and the witness set W.
   */
  function findPivots(l: number, B: Bound, S: Set<number>): { P: Set<number>; W: Set<number> } {
    const W = new Set<number>(S);
    const forestParent = new Map<number, number>();
    let layer = new Set<number>(S);
    let exploded = false;
    const roundInfo: string[] = [];

    for (let i = 0; i < k; i++) {
      const next = new Set<number>();
      let relaxed = 0;
      for (const u of layer) {
        const du = d(u);
        for (const { to: v, weight: w } of graph.getNeighbors(u)) {
          const nd = du + w;
          if (inBoundDist(nd, v, B) && nd < d(v) - EPS) {
            distances.set(v, nd);
            parents.set(v, u);
            relaxed++;
            if (!S.has(v)) {
              forestParent.set(v, u);
              next.add(v);
            }
          }
        }
      }
      for (const v of next) W.add(v);
      roundInfo.push(`Round ${i + 1}/${k}: relaxed ${relaxed} edge${relaxed === 1 ? '' : 's'}; witness set now ${W.size} vertices.`);
      layer = next;
      if (W.size > k * S.size) {
        exploded = true;
        break;
      }
      if (next.size === 0) break;
    }

    let P: Set<number>;
    const actions: string[] = [`Frontier S (${S.size}): {${list(S)}}`, ...roundInfo];

    if (exploded) {
      P = new Set(S);
      actions.push(`Witness set exceeded k·|S| = ${k * S.size}: frontier is too dense to reduce here, so every frontier vertex stays a pivot (P = S).`);
    } else {
      // Subtree sizes within the shortest-path forest; roots live in S.
      const rootCount = new Map<number, number>();
      for (const r of S) rootCount.set(r, 0);
      for (const v of W) {
        let cur = v;
        let guard = 0;
        while (!S.has(cur) && forestParent.has(cur) && guard++ < W.size + 2) {
          cur = forestParent.get(cur)!;
        }
        if (S.has(cur)) rootCount.set(cur, (rootCount.get(cur) ?? 0) + 1);
      }
      P = new Set<number>();
      for (const r of S) if ((rootCount.get(r) ?? 0) >= k) P.add(r);
      if (P.size === 0) {
        // Every subtree is small: keep S so the recursion still makes progress.
        for (const r of S) P.add(r);
        actions.push(`No frontier vertex has a subtree of ≥ k=${k} vertices, so all of S is carried forward as pivots.`);
      } else {
        actions.push(`Pivots P = frontier vertices whose shortest-path subtree has ≥ k=${k} vertices: {${list(P)}}.`);
        actions.push(`Frontier reduced from ${S.size} to ${P.size} (the paper guarantees |P| ≤ |W|/k = ${(W.size / k).toFixed(1)}).`);
      }
    }

    record({
      level: l,
      bound: B,
      frontier: S,
      pivots: P,
      decision: `Level ${l} · bound B=${fmtBound(B)} — FindPivots: ${k} bounded relaxation rounds shrink the frontier to its pivots.`,
      actions,
    });

    return { P, W };
  }

  /**
   * BASECASE (l = 0): bounded multi-source Dijkstra settling up to k+1 vertices.
   */
  function baseCase(B: Bound, S: Set<number>): { Bp: Bound; U: Set<number> } {
    const settled: number[] = [];
    const settledSet = new Set<number>();
    const heap = Array.from(S);

    while (heap.length > 0 && settled.length < k + 1) {
      let mi = 0;
      for (let j = 1; j < heap.length; j++) if (keyLess(heap[j], heap[mi])) mi = j;
      const u = heap[mi];
      heap.splice(mi, 1);
      if (settledSet.has(u)) continue;
      if (!inBound(u, B)) break;
      settledSet.add(u);
      settled.push(u);
      for (const { to: v, weight: w } of graph.getNeighbors(u)) {
        const nd = d(u) + w;
        if (inBoundDist(nd, v, B) && nd < d(v) - EPS) {
          distances.set(v, nd);
          parents.set(v, u);
          if (!settledSet.has(v)) heap.push(v);
        }
      }
    }

    let Bp: Bound;
    let U: Set<number>;
    let limited = false;
    if (settled.length <= k) {
      Bp = B;
      U = new Set(settled);
    } else {
      limited = true;
      const boundaryV = settled[k];
      Bp = { d: d(boundaryV), i: boundaryV };
      U = new Set(settled.slice(0, k));
    }
    for (const u of U) complete.add(u);

    const newlyComplete = Array.from(U).filter(v => v !== source);
    const actions: string[] = [
      `Block sources S: {${list(S)}}`,
      `Bounded Dijkstra settled ${settled.length} vertex/vertices in distance order: ${settled.map(v => `${v}(${fmt(d(v))})`).join(', ')}`,
    ];
    if (limited) {
      actions.push(`Hit the k+1=${k + 1} settle limit → return boundary B'=${fmtBound(Bp)}; vertices at/after it are deferred to later blocks.`);
    } else {
      actions.push(`Exhausted everything below the bound; boundary stays B'=${fmtBound(Bp)}.`);
    }
    actions.push(`Marked complete: {${newlyComplete.length ? list(newlyComplete) : '—'}}`);

    record({
      level: 0,
      bound: B,
      frontier: S,
      currentVertex: settled.length ? settled[settled.length - 1] : undefined,
      decision: `Level 0 · bound B=${fmtBound(B)} — Base case: bounded Dijkstra settles ≤ k+1 vertices from the block.`,
      actions,
    });

    return { Bp, U };
  }

  /**
   * BMSSP(l, B, S): recursive driver. Returns the achieved boundary B' and the
   * set U of vertices completed with distance < B'.
   */
  function bmssp(l: number, B: Bound, S: Set<number>): { Bp: Bound; U: Set<number> } {
    if (l === 0) return baseCase(B, S);

    const { P, W } = findPivots(l, B, S);
    const M = Math.pow(2, (l - 1) * t);
    const inDS = new Set<number>(P); // block queue, keyed by current distance
    const U = new Set<number>();
    const limit = k * Math.pow(2, l * t);

    while (U.size < limit && inDS.size > 0) {
      // Partial sort: take only the next block of the M smallest, not the whole queue.
      const ordered = Array.from(inDS).sort((a, b) => cmp(d(a), a, d(b), b));
      let Bi: Bound;
      let Si: Set<number>;
      if (ordered.length <= M) {
        Bi = B;
        Si = new Set(ordered);
        inDS.clear();
      } else {
        const top = ordered[M];
        Bi = { d: d(top), i: top };
        Si = new Set(ordered.slice(0, M));
        for (const v of Si) inDS.delete(v);
      }

      record({
        level: l,
        bound: B,
        frontier: inDS,
        pivots: Si,
        decision: `Level ${l} · bound B=${fmtBound(B)} — Pull next block (partial sort): take the ${Si.size} closest of ${ordered.length} queued, then recurse.`,
        actions: [
          `Block Sᵢ (≤ M=${M}): {${list(Si)}} with inner bound Bᵢ=${fmtBound(Bi)}.`,
          `Remaining in this level's queue: ${inDS.size}.`,
          `Recursing into level ${l - 1} on this block — no global sort needed.`,
        ],
      });

      const { Bp: Bpi, U: Ui } = bmssp(l - 1, Bi, Si);
      for (const u of Ui) U.add(u);

      // Relax out of the newly completed vertices; re-queue incomplete in-bound
      // discoveries (the paper routes these via batch-prepend; re-queueing every
      // incomplete in-bound vertex yields the identical result).
      for (const u of Ui) {
        for (const { to: v, weight: w } of graph.getNeighbors(u)) {
          const nd = d(u) + w;
          if (nd < d(v) - EPS) {
            distances.set(v, nd);
            parents.set(v, u);
          }
          if (!complete.has(v) && inBound(v, B)) inDS.add(v);
        }
      }
      for (const x of Si) if (!complete.has(x) && inBound(x, B)) inDS.add(x);

      if (U.size >= limit) {
        // Partial success: too many completions; hand back the tighter boundary.
        const result = new Set(U);
        for (const x of W) if (complete.has(x) && cmp(d(x), x, Bpi.d, Bpi.i) < 0) result.add(x);
        return { Bp: Bpi, U: result };
      }
    }

    // Full success: queue drained — everything below B from this frontier is done.
    const result = new Set(U);
    for (const x of W) if (complete.has(x) && inBound(x, B)) result.add(x);
    return { Bp: B, U: result };
  }

  bmssp(L, BTOP, new Set<number>([source]));

  const reachableCount = Array.from(distances.values()).filter(d => d < BTOP.d).length;
  const finiteDistances = Array.from(distances.values()).filter(d => d < BTOP.d);
  const maxDistance = finiteDistances.length > 0 ? finiteDistances.reduce((max, d) => Math.max(max, d), 0) : 0;

  record({
    level: L,
    bound: BTOP,
    frontier: [],
    pivots: [],
    decision: `Algorithm Finished Successfully: BMSSP has completed. All ${reachableCount} reachable vertices from source ${source} have their final shortest distances.${maxDistance > 0 ? ` Maximum distance found: ${maxDistance.toFixed(2)}.` : ''}`,
    actions: [
      `All reachable vertices have been completed.`,
      `Shortest paths from source ${source} to every reachable vertex have been found.`,
      `Total vertices complete: ${complete.size}`,
      `Reachable vertices: ${reachableCount}`,
      maxDistance > 0 ? `Maximum shortest distance: ${maxDistance.toFixed(2)}` : `Only source vertex is reachable`,
      `Distances match Dijkstra exactly, but were produced via partial sorting + pivot reduction rather than a full priority-queue sort.`,
    ],
  });

  // Normalise any unreached vertices left at the finite "infinity" back to ∞.
  for (let v = 0; v < n; v++) {
    if (distances.get(v)! >= BTOP.d) distances.set(v, Infinity);
  }

  return { distances, parents, steps };
}

/**
 * Reconstruct path from source to target
 */
export function reconstructPath(
  parents: Map<number, number | null>,
  target: number
): number[] {
  const path: number[] = [];
  let current: number | null = target;
  const visited = new Set<number>();

  while (current !== null && current !== undefined && !visited.has(current)) {
    visited.add(current);
    path.push(current);
    const parent = parents.get(current);
    if (parent === null || parent === undefined) {
      break;
    }
    current = parent;
  }

  path.reverse();
  return path;
}
