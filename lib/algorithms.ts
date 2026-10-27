import { Graph } from "./graph";
import { MinHeap } from "./priority-queue";

export type Phase =
  | "initialize"
  | "settle"
  | "pivots"
  | "pull"
  | "propagate"
  | "return"
  | "complete";
export interface AlgorithmStep {
  iteration: number;
  phase: Phase;
  currentVertex?: number;
  distances: Map<number, number>;
  visited: Set<number>;
  queue?: number[];
  frontier?: Set<number>;
  complete?: Set<number>;
  pivots?: Set<number>;
  level?: number;
  bound?: number;
  description: string;
  actions: string[];
  updatedVertices?: number[];
  parents: Map<number, number | null>;
}
export interface AlgorithmStats {
  edgeScans: number;
  relaxations: number;
  queueInsertions: number;
  pulls: number;
  recursiveCalls: number;
}
export interface AlgorithmResult {
  distances: Map<number, number>;
  parents: Map<number, number | null>;
  steps: AlgorithmStep[];
  stats: AlgorithmStats;
  parameters?: { k: number; t: number; levels: number };
  traceTruncated: boolean;
}
export interface AlgorithmOptions {
  trace?: boolean;
  maxTraceSteps?: number;
}

type Key = { distance: number; hops: number; vertex: number };
const TOP: Key = { distance: Infinity, hops: Infinity, vertex: Infinity };
const compare = (a: Key, b: Key) => {
  for (const field of ["distance", "hops", "vertex"] as const) {
    if (a[field] < b[field]) return -1;
    if (a[field] > b[field]) return 1;
  }
  return 0;
};

function initialize(graph: Graph, source: number, options: AlgorithmOptions) {
  if (
    !Number.isInteger(source) ||
    source < 0 ||
    source >= graph.numVertices()
  ) {
    throw new RangeError("Source must be an integer vertex in the graph");
  }
  const maxSteps = options.maxTraceSteps ?? 10000;
  if (!Number.isInteger(maxSteps) || maxSteps < 2)
    throw new RangeError("maxTraceSteps must be at least 2");
  const trace = options.trace !== false;
  const distances = new Map<number, number>();
  const parents = new Map<number, number | null>();
  const hops = new Map<number, number>();
  const parentWeights = new Map<number, number>();
  const complete = new Set<number>();
  const steps: AlgorithmStep[] = [];
  const stats: AlgorithmStats = {
    edgeScans: 0,
    relaxations: 0,
    queueInsertions: 0,
    pulls: 0,
    recursiveCalls: 0,
  };
  let traceTruncated = false;
  for (let v = 0; v < graph.numVertices(); v++) {
    distances.set(v, v === source ? 0 : Infinity);
    hops.set(v, v === source ? 0 : Infinity);
    parents.set(v, null);
  }
  const key = (v: number): Key => ({
    distance: distances.get(v)!,
    hops: hops.get(v)!,
    vertex: v,
  });
  const candidate = (u: number, v: number, weight: number): Key => {
    const distance = distances.get(u)! + weight;
    if (!Number.isFinite(distance))
      throw new RangeError("Path sum exceeds finite JavaScript number range");
    return { distance, hops: hops.get(u)! + 1, vertex: v };
  };
  // Section 2: path order is (weight, hop count, reversed vertex sequence).
  // For paths to the same endpoint, comparing predecessors resolves the last tie.
  // Equality is deliberately accepted (Remark 3.4) for reuse at higher levels.
  const relax = (u: number, v: number, weight: number, bound: Key = TOP) => {
    stats.edgeScans++;
    const next = candidate(u, v, weight);
    const order = compare(next, key(v));
    if (compare(next, bound) >= 0 || order > 0) return false;
    const previous = parents.get(v);
    if (order === 0 && previous !== null && u > previous!) return false;
    if (order < 0 || previous !== u) {
      distances.set(v, next.distance);
      hops.set(v, next.hops);
      parents.set(v, u);
      parentWeights.set(v, weight);
      stats.relaxations++;
    }
    return true;
  };
  const record = (
    step: Omit<
      AlgorithmStep,
      "iteration" | "distances" | "parents" | "visited" | "complete"
    >,
  ) => {
    if (!trace) return;
    if (steps.length >= maxSteps - 1 && step.phase !== "complete") {
      traceTruncated = true;
      return;
    }
    steps.push({
      ...step,
      iteration: steps.length,
      distances: new Map(distances),
      parents: new Map(parents),
      visited: new Set(complete),
      complete: new Set(complete),
    });
  };
  const finish = () => {
    if (trace)
      record({
        phase: "complete",
        description: "All reachable distances are finalized.",
        actions: [
          `${complete.size} of ${graph.numVertices()} vertices are reachable from source ${source}.`,
          "Unreachable vertices retain distance ∞.",
          ...(traceTruncated
            ? [
                "The trace limit was reached; this final snapshot contains the complete result.",
              ]
            : []),
        ],
      });
    return { distances, parents, steps, stats, traceTruncated };
  };
  return {
    trace,
    distances,
    parents,
    hops,
    parentWeights,
    complete,
    stats,
    key,
    candidate,
    relax,
    record,
    finish,
  };
}

/** Indexed binary-heap Dijkstra. Kernel bound: O((m+n) log n), without tracing. */
export function dijkstra(
  graph: Graph,
  source: number,
  options: AlgorithmOptions = {},
): AlgorithmResult {
  const c = initialize(graph, source, options);
  const queue = new MinHeap((a, b) => compare(c.key(a), c.key(b)) < 0);
  queue.upsert(source);
  c.stats.queueInsertions++;
  if (c.trace)
    c.record({
      phase: "initialize",
      queue: [source],
      description: `Start at vertex ${source}.`,
      actions: [
        "Set the source distance to 0; all other distances start at ∞.",
        "The indexed binary heap selects the smallest path label.",
      ],
    });
  while (queue.size) {
    const u = queue.pop();
    c.complete.add(u);
    const updated: number[] = [];
    for (const { to: v, weight } of graph.getNeighbors(u)) {
      if (c.complete.has(v)) {
        c.stats.edgeScans++;
        continue;
      }
      if (c.relax(u, v, weight)) {
        queue.upsert(v);
        c.stats.queueInsertions++;
        updated.push(v);
      }
    }
    if (c.trace)
      c.record({
        phase: "settle",
        currentVertex: u,
        queue: queue.values(),
        updatedVertices: updated,
        description: `Settle vertex ${u} at distance ${formatDistance(c.distances.get(u)!)}.`,
        actions: [
          `Inspect ${graph.getNeighbors(u).length} outgoing edges.`,
          updated.length
            ? `Update or reuse paths to vertices ${updated.join(", ")}.`
            : "No neighbor needs a shorter path.",
          `${c.complete.size} vertices finalized; ${queue.size} remain in the heap.`,
        ],
      });
  }
  return c.finish();
}

/**
 * Algorithms 1–3 of Duan et al., arXiv:2504.17033v2.
 * Queue semantics follow Insert / Pull / BatchPrepend, but Pull uses Array.sort.
 * This educational implementation does NOT achieve Lemma 3.3's amortized bounds
 * or the paper's O(m log^(2/3) n) running time. See docs/REVIEW.md.
 * The paper's constant-degree reduction is omitted; arbitrary degree is supported
 * for distance computation, not for transferring its complexity analysis.
 */
export function breakingDijkstra(
  graph: Graph,
  source: number,
  options: AlgorithmOptions = {},
): AlgorithmResult {
  const c = initialize(graph, source, options);
  const logarithm = Math.log2(Math.max(2, graph.numVertices()));
  const k = Math.max(1, Math.floor(Math.cbrt(logarithm)));
  const t = Math.max(1, Math.floor(logarithm ** (2 / 3)));
  const levels = Math.ceil(logarithm / t);
  const below = (v: number, bound: Key) => compare(c.key(v), bound) < 0;
  type PartialResult = { boundary: Key; vertices: Set<number> };

  function findPivots(level: number, bound: Key, sources: Set<number>) {
    const witnesses = new Set(sources);
    let layer = new Set(sources);
    let exploded = false;
    for (let round = 0; round < k; round++) {
      const next = new Set<number>();
      for (const u of layer) {
        for (const { to: v, weight } of graph.getNeighbors(u)) {
          // Alg. 1 relaxes even beyond B, but only adds in-bound witnesses.
          if (c.relax(u, v, weight) && below(v, bound)) next.add(v);
        }
      }
      for (const v of next) witnesses.add(v);
      if (witnesses.size > k * sources.size) {
        exploded = true;
        break;
      }
      layer = next;
      if (!layer.size) break;
    }
    let pivots: Set<number>;
    if (exploded) pivots = new Set(sources);
    else {
      // Rebuild the forest from CURRENT tight predecessor edges, not stale
      // per-round assignments. Hop counts make zero-weight cycles acyclic.
      const forestParent = new Map<number, number>();
      const children = new Map<number, number>();
      const sizes = new Map<number, number>();
      for (const v of witnesses) {
        children.set(v, 0);
        sizes.set(v, 1);
      }
      for (const v of witnesses) {
        const parent = c.parents.get(v);
        if (
          parent !== null &&
          parent !== undefined &&
          witnesses.has(parent) &&
          c.distances.get(v) ===
            c.distances.get(parent)! + c.parentWeights.get(v)! &&
          c.hops.get(v) === c.hops.get(parent)! + 1
        ) {
          forestParent.set(v, parent);
          children.set(parent, children.get(parent)! + 1);
        }
      }
      const leaves = [...witnesses].filter((v) => children.get(v) === 0);
      while (leaves.length) {
        const v = leaves.pop()!;
        const parent = forestParent.get(v);
        if (parent === undefined) continue;
        sizes.set(parent, sizes.get(parent)! + sizes.get(v)!);
        children.set(parent, children.get(parent)! - 1);
        if (children.get(parent) === 0) leaves.push(parent);
      }
      pivots = new Set(
        [...sources].filter((v) => !forestParent.has(v) && sizes.get(v)! >= k),
      );
    }
    if (c.trace)
      c.record({
        phase: "pivots",
        level,
        bound: bound.distance,
        frontier: new Set(sources),
        pivots: new Set(pivots),
        description: `FindPivots: ${sources.size} frontier vertices → ${pivots.size} pivots.`,
        actions: [
          `Run up to ${k} bounded witness rounds (Algorithm 1).`,
          `Witness set W contains ${witnesses.size} vertices.`,
          exploded
            ? "W exceeds k·|S|; retain P = S as specified in the paper."
            : "Keep only roots with at least k vertices in their tight path tree. An empty pivot set is valid.",
        ],
      });
    return { pivots, witnesses };
  }

  function baseCase(bound: Key, sources: Set<number>): PartialResult {
    if (sources.size !== 1)
      throw new Error("BMSSP base case requires a singleton frontier");
    const heap = new MinHeap((a, b) => compare(c.key(a), c.key(b)) < 0);
    const settled = new Set<number>();
    for (const v of sources) {
      heap.upsert(v);
      c.stats.queueInsertions++;
    }
    while (heap.size && settled.size < k + 1) {
      const u = heap.pop();
      if (!below(u, bound)) break;
      settled.add(u);
      for (const { to: v, weight } of graph.getNeighbors(u)) {
        if (c.relax(u, v, weight, bound) && !settled.has(v)) {
          heap.upsert(v);
          c.stats.queueInsertions++;
        }
      }
    }
    let boundary = bound;
    if (settled.size === k + 1) {
      for (const v of settled)
        if (boundary === bound || compare(c.key(v), boundary) > 0)
          boundary = c.key(v);
    }
    const vertices = new Set([...settled].filter((v) => below(v, boundary)));
    for (const v of vertices) c.complete.add(v);
    if (c.trace)
      c.record({
        phase: "settle",
        level: 0,
        bound: bound.distance,
        frontier: new Set(sources),
        currentVertex: [...vertices].at(-1),
        description: `Base case: finalize ${vertices.size} vertices below the returned boundary.`,
        actions: [
          `A binary heap examines at most k + 1 = ${k + 1} vertices (Algorithm 2).`,
          `Return B′ = ${formatDistance(boundary.distance)} and ${vertices.size} completed vertices.`,
          settled.size > k
            ? "Defer the boundary vertex to a later block."
            : "The bounded heap is exhausted.",
        ],
      });
    return { boundary, vertices };
  }

  function bmssp(
    level: number,
    bound: Key,
    sources: Set<number>,
  ): PartialResult {
    c.stats.recursiveCalls++;
    if (level === 0) return baseCase(bound, sources);
    const { pivots, witnesses } = findPivots(level, bound, sources);
    const blockSize = 2 ** ((level - 1) * t);
    const limit = k * 2 ** (level * t);
    // Store immutable key snapshots, exactly as key/value pairs in the paper.
    const queue = new Map<number, Key>();
    const insert = (v: number) => {
      const next = c.key(v);
      const previous = queue.get(v);
      if (!previous || compare(next, previous) < 0) {
        queue.set(v, next);
        c.stats.queueInsertions++;
      }
    };
    for (const v of pivots) insert(v);
    const vertices = new Set<number>();
    let boundary = bound;
    while (vertices.size < limit && queue.size) {
      // Deliberate educational substitution: full sort, NOT Lemma 3.3.
      const ordered = [...queue].sort((a, b) => compare(a[1], b[1]));
      const innerBound =
        ordered.length > blockSize ? ordered[blockSize][1] : bound;
      const block = new Set(ordered.slice(0, blockSize).map(([v]) => v));
      for (const v of block) queue.delete(v);
      c.stats.pulls++;
      if (c.trace)
        c.record({
          phase: "pull",
          level,
          bound: innerBound.distance,
          frontier: new Set(queue.keys()),
          pivots: new Set(block),
          description: `Pull ${block.size} vertices; recurse to level ${level - 1}.`,
          actions: [
            `M = ${blockSize}; the remaining queue has ${queue.size} vertices.`,
            `Inner bound Bᵢ = ${formatDistance(innerBound.distance)}. Bounds also use hop count and vertex ID to separate ties.`,
            "This demo sorts on Pull. The paper uses the specialized queue of Lemma 3.3.",
          ],
        });
      const result = bmssp(level - 1, innerBound, block);
      boundary = result.boundary;
      for (const v of result.vertices) vertices.add(v);
      const prepend = new Set<number>();
      for (const u of result.vertices) {
        for (const { to: v, weight } of graph.getNeighbors(u)) {
          if (!c.relax(u, v, weight)) continue;
          if (compare(c.key(v), innerBound) >= 0 && below(v, bound)) insert(v);
          else if (compare(c.key(v), boundary) >= 0 && below(v, innerBound))
            prepend.add(v);
        }
      }
      for (const v of block) {
        if (compare(c.key(v), boundary) >= 0 && below(v, innerBound))
          prepend.add(v);
      }
      // BatchPrepend has the same key semantics as Insert in this sort-on-pull
      // replacement. Preserve its interval and equality routing (Alg. 3, 18–25).
      for (const v of prepend) insert(v);
      if (c.trace)
        c.record({
          phase: "propagate",
          level,
          bound: boundary.distance,
          frontier: new Set(queue.keys()),
          description: `Propagate ${result.vertices.size} completed vertices to level ${level}.`,
          actions: [
            "Reuse valid edges, including equal path labels (Remark 3.4).",
            `Batch-prepend ${prepend.size} deferred vertices in [B′ᵢ, Bᵢ).`,
            `${vertices.size} vertices accumulated in this call.`,
          ],
        });
    }
    // Algorithm 3, line 26: W below the returned boundary is complete by the
    // invariant. It must NOT be filtered by a pre-existing global visited set.
    for (const v of witnesses) if (below(v, boundary)) vertices.add(v);
    for (const v of vertices) c.complete.add(v);
    if (c.trace)
      c.record({
        phase: "return",
        level,
        bound: boundary.distance,
        description: `Return ${vertices.size} completed vertices from level ${level}.`,
        actions: [
          `Include every witness with a path label below B′ = ${formatDistance(boundary.distance)}.`,
          queue.size
            ? "The workload limit was reached; later blocks continue the computation."
            : "The queue is empty; this bounded call has finished.",
        ],
      });
    return { boundary, vertices };
  }

  if (c.trace)
    c.record({
      phase: "initialize",
      level: levels,
      bound: Infinity,
      frontier: new Set([source]),
      description: `Start BMSSP(${levels}, ∞, {${source}}).`,
      actions: [
        `Paper parameters: k = ${k}, t = ${t}, L = ${levels} (base-2 logarithm).`,
        "Find pivots, pull a bounded block, recurse, then propagate completed paths.",
        "This is a procedure visualization; its queue does not implement the paper’s time bound.",
      ],
    });
  bmssp(levels, TOP, new Set([source]));
  return { ...c.finish(), parameters: { k, t, levels } };
}

/** Return an empty path for unknown targets, broken chains, or cycles. */
export function reconstructPath(
  parents: Map<number, number | null>,
  target: number,
  source?: number,
): number[] {
  if (!parents.has(target)) return [];
  const path: number[] = [];
  const seen = new Set<number>();
  let vertex: number | null = target;
  while (vertex !== null) {
    if (seen.has(vertex) || !parents.has(vertex)) return [];
    seen.add(vertex);
    path.push(vertex);
    vertex = parents.get(vertex)!;
  }
  path.reverse();
  return source === undefined || path[0] === source ? path : [];
}

export function formatDistance(value: number): string {
  if (!Number.isFinite(value)) return "∞";
  if (Number.isInteger(value)) return String(value);
  if (Math.abs(value) < 0.001 || Math.abs(value) >= 1e6)
    return value.toExponential(3);
  return Number(value.toPrecision(6)).toString();
}
