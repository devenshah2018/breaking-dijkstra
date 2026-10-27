import {
  AlgorithmResult,
  AlgorithmStats,
  breakingDijkstra,
  dijkstra,
  reconstructPath,
} from "./algorithms";
import {
  Graph,
  createDenseGraph,
  createGridGraph,
  createRandomGraph,
} from "./graph";

export const BENCHMARK_SEED = 2026;
export type BenchmarkFamily = "sparse" | "grid" | "dense";
export interface BenchmarkConfig {
  size: number;
  family: BenchmarkFamily;
}
export interface Measurement {
  median: number;
  p10: number;
  p90: number;
  batchSize: number;
  stats: AlgorithmStats;
}
export interface BenchmarkReport {
  config: BenchmarkConfig;
  vertices: number;
  edges: number;
  seed: number | null;
  samples: number;
  warmups: number;
  source: number;
  verified: boolean;
  dijkstra: Measurement;
  bmssp: Measurement;
  timestamp: string;
}

/** Independent Bellman–Ford oracle, outside all timing regions. */
export function referenceDistances(graph: Graph, source: number): number[] {
  if (!Number.isInteger(source) || source < 0 || source >= graph.numVertices())
    throw new RangeError("Invalid reference source");
  const distances = Array<number>(graph.numVertices()).fill(Infinity);
  distances[source] = 0;
  const edges = graph.getEdges();
  for (let round = 0; round < graph.numVertices() - 1; round++) {
    let changed = false;
    for (const { from, to, weight } of edges) {
      if (distances[from] + weight < distances[to]) {
        distances[to] = distances[from] + weight;
        changed = true;
      }
    }
    if (!changed) break;
  }
  return distances;
}

export function verifyResult(
  graph: Graph,
  source: number,
  result: AlgorithmResult,
  reference: number[],
): boolean {
  if (!Number.isInteger(source) || source < 0 || source >= graph.numVertices())
    return false;
  if (
    result.parents.size !== graph.numVertices() ||
    result.distances.size !== graph.numVertices() ||
    reference.length !== graph.numVertices()
  )
    return false;
  for (let v = 0; v < reference.length; v++) {
    if (result.distances.get(v) !== reference[v]) return false;
    const path = reconstructPath(result.parents, v, source);
    if (reference[v] === Infinity) {
      if (path.length) return false;
      continue;
    }
    if (!path.length) return false;
    // Check predecessor edges as well as acyclic source-rooted parent paths.
    // Certificate validation is deliberately outside the timing region.
    if (v === source) {
      if (result.parents.get(v) !== null || result.distances.get(v) !== 0)
        return false;
    } else {
      const parent = result.parents.get(v);
      if (
        parent === null ||
        parent === undefined ||
        !Number.isInteger(parent) ||
        parent < 0 ||
        parent >= graph.numVertices() ||
        !graph
          .getNeighbors(parent)
          .some(
            (edge) =>
              edge.to === v &&
              result.distances.get(parent)! + edge.weight === reference[v],
          )
      )
        return false;
    }
  }
  return true;
}

export function summarize(
  values: number[],
): Pick<Measurement, "median" | "p10" | "p90"> {
  if (!values.length || values.some((v) => !Number.isFinite(v) || v < 0))
    throw new RangeError("Samples must be finite non-negative durations");
  const sorted = [...values].sort((a, b) => a - b);
  const quantile = (q: number) => {
    const position = (sorted.length - 1) * q;
    const index = Math.floor(position);
    return (
      sorted[index] +
      (sorted[Math.ceil(position)] - sorted[index]) * (position - index)
    );
  };
  return { median: quantile(0.5), p10: quantile(0.1), p90: quantile(0.9) };
}

export function benchmarkGraph(config: BenchmarkConfig): Graph {
  if (![100, 500, 1000].includes(config.size))
    throw new RangeError("Unsupported benchmark size");
  if (config.family === "sparse")
    return createRandomGraph(config.size, config.size * 3, BENCHMARK_SEED);
  if (config.family === "dense") return createDenseGraph(config.size, 0.12);
  if (config.family === "grid") {
    const side = Math.floor(Math.sqrt(config.size));
    return createGridGraph(side, side);
  }
  throw new RangeError("Unsupported graph family");
}

/** Timings exclude graph generation, validation, snapshots, rendering, and oracle. */
export function runBenchmark(
  config: BenchmarkConfig,
  progress: (fraction: number) => void = () => {},
): BenchmarkReport {
  const graph = benchmarkGraph(config);
  const source = 0;
  const reference = referenceDistances(graph, source);
  const algorithms = [dijkstra, breakingDijkstra];
  const results = algorithms.map((fn) => fn(graph, source, { trace: false }));
  if (results.some((result) => !verifyResult(graph, source, result, reference)))
    throw new Error("Correctness check failed; timings have been discarded.");
  const warmups = 5;
  for (let i = 0; i < warmups; i++)
    for (const fn of algorithms) fn(graph, source, { trace: false });
  // Calibrate each algorithm independently to avoid timer-resolution artifacts
  // without making the slower algorithm repeat the faster one's batch size.
  const batchSizes = algorithms.map((fn) => {
    let batch = 1;
    while (batch < 64) {
      const started = performance.now();
      for (let i = 0; i < batch; i++) fn(graph, source, { trace: false });
      if (performance.now() - started >= 5) break;
      batch *= 2;
    }
    return batch;
  });
  const samples = 21;
  const durations: number[][] = [[], []];
  for (let sample = 0; sample < samples; sample++) {
    for (const index of sample % 2 === 0 ? [0, 1] : [1, 0]) {
      const start = performance.now();
      for (let i = 0; i < batchSizes[index]; i++)
        algorithms[index](graph, source, { trace: false });
      durations[index].push((performance.now() - start) / batchSizes[index]);
    }
    progress((sample + 1) / samples);
  }
  return {
    config,
    vertices: graph.numVertices(),
    edges: graph.numEdges(),
    seed:
      config.family === "grid"
        ? null
        : config.family === "dense"
          ? 456
          : BENCHMARK_SEED,
    samples,
    warmups,
    source,
    verified: true,
    timestamp: new Date().toISOString(),
    dijkstra: {
      ...summarize(durations[0]),
      batchSize: batchSizes[0],
      stats: results[0].stats,
    },
    bmssp: {
      ...summarize(durations[1]),
      batchSize: batchSizes[1],
      stats: results[1].stats,
    },
  };
}
