/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS test runner and TypeScript compilation hook. */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const ts = require("typescript");

// Compile with the project's installed TypeScript; no test-only runtime dependency.
require.extensions[".ts"] = (module, filename) => {
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    }).outputText,
    filename,
  );
};
const { Graph } = require("../lib/graph.ts");
const { dijkstra, breakingDijkstra } = require("../lib/algorithms.ts");

test("preserves improvements smaller than 1e-9", () => {
  const graph = new Graph(3);
  graph.addEdge(0, 1, 1);
  graph.addEdge(0, 2, 0.5);
  graph.addEdge(2, 1, 0.4999999995);
  assert.equal(breakingDijkstra(graph, 0).distances.get(1), 0.9999999995);
  assert.equal(dijkstra(graph, 0).distances.get(1), 0.9999999995);
});

const {
  SAMPLE_GRAPHS,
  createRandomGraph,
  createDenseGraph,
  seededRandom,
} = require("../lib/graph.ts");
const { reconstructPath } = require("../lib/algorithms.ts");
const { MinHeap } = require("../lib/priority-queue.ts");
function oracle(graph, source) {
  const d = Array(graph.numVertices()).fill(Infinity);
  d[source] = 0;
  for (let pass = 0; pass < graph.numVertices() - 1; pass++) {
    let changed = false;
    for (const { from, to, weight } of graph.getEdges()) {
      if (d[from] + weight < d[to]) {
        d[to] = d[from] + weight;
        changed = true;
      }
    }
    if (!changed) break;
  }
  return d;
}
function check(graph, source, trace = false) {
  const expected = oracle(graph, source);
  for (const algorithm of [dijkstra, breakingDijkstra]) {
    const result = algorithm(graph, source, { trace });
    assert.deepEqual(
      [...result.distances.values()],
      expected,
      `${algorithm.name} source ${source}`,
    );
    for (let v = 0; v < graph.numVertices(); v++) {
      const path = reconstructPath(result.parents, v, source);
      if (expected[v] === Infinity) {
        assert.deepEqual(path, []);
        continue;
      }
      assert.equal(path[0], source);
      assert.equal(path.at(-1), v);
      assert.equal(
        new Set(path).size,
        path.length,
        "parent chain must be acyclic",
      );
      let sum = 0;
      for (let i = 1; i < path.length; i++) {
        const edges = graph
          .getNeighbors(path[i - 1])
          .filter((e) => e.to === path[i]);
        assert.ok(edges.length, "parent edge exists");
        sum += Math.min(...edges.map((e) => e.weight));
      }
      assert.equal(sum, expected[v], "path is a shortest path certificate");
    }
    if (trace) {
      assert.equal(result.steps[0].phase, "initialize");
      assert.equal(result.steps.at(-1).phase, "complete");
      assert.deepEqual(result.steps.at(-1).distances, result.distances);
      for (const step of result.steps)
        for (const v of step.complete) {
          assert.equal(
            step.distances.get(v),
            expected[v],
            "complete means the distance is actually final",
          );
        }
    } else assert.deepEqual(result.steps, []);
  }
}

test("all sample graphs, every source, and all certified trace states match Bellman–Ford", () => {
  for (const sample of SAMPLE_GRAPHS) {
    const graph = sample.create();
    for (let source = 0; source < graph.numVertices(); source++)
      check(graph, source, true);
  }
});
test("1,200 seeded adversarial directed graphs match an independent oracle", () => {
  for (let seed = 0; seed < 1200; seed++) {
    const random = seededRandom(seed);
    const n = 1 + Math.floor(random() * 35);
    const graph = new Graph(n);
    for (let u = 0; u < n; u++)
      for (let v = 0; v < n; v++) {
        if (random() < 0.14) graph.addEdge(u, v, Math.floor(random() * 6));
      }
    check(graph, Math.floor(random() * n));
  }
});
test("multi-round pivots on 80 larger graphs (k >= 2)", () => {
  for (let seed = 0; seed < 80; seed++)
    check(createRandomGraph(300, 1000, seed), seed % 300);
});
test("zero cycles, parallel edges, self-loops, and equal-distance alternatives", () => {
  const graph = new Graph(7);
  [
    [6, 5, 0],
    [5, 4, 0],
    [4, 6, 0],
    [6, 2, 1],
    [5, 2, 1],
    [2, 1, 0],
    [1, 2, 0],
    [6, 2, 2],
    [2, 2, 0],
    [6, 3, 1],
    [3, 1, 0],
  ].forEach(([u, v, w]) => graph.addEdge(u, v, w));
  check(graph, 6, true);
  for (const fn of [dijkstra, breakingDijkstra])
    assert.deepEqual(reconstructPath(fn(graph, 6).parents, 1, 6), [6, 2, 1]);
});
test("singletons, empty graphs, source validation, and malformed inputs", () => {
  check(new Graph(1), 0, true);
  for (const invalid of [-1, 1.2, NaN, Infinity])
    assert.throws(() => new Graph(invalid), RangeError);
  const graph = new Graph(2);
  for (const weight of [-1, NaN, Infinity])
    assert.throws(() => graph.addEdge(0, 1, weight), RangeError);
  for (const vertex of [-1, 2, NaN, 0.5]) {
    assert.throws(() => graph.addEdge(vertex, 1, 1), RangeError);
    for (const fn of [dijkstra, breakingDijkstra])
      assert.throws(() => fn(graph, vertex), RangeError);
  }
  for (const fn of [dijkstra, breakingDijkstra])
    assert.throws(() => fn(new Graph(0), 0), RangeError);
  assert.throws(() => createRandomGraph(2, 3), RangeError);
  assert.throws(() => createDenseGraph(3, 1.1), RangeError);
});
test("generators terminate at full density without duplicates and preserve the backbone", () => {
  for (let n = 0; n < 30; n++) {
    const graph = createRandomGraph(n, n * (n - 1), 42);
    assert.equal(graph.numEdges(), Math.max(0, n * (n - 1)));
    assert.equal(
      new Set(graph.getEdges().map((e) => `${e.from},${e.to}`)).size,
      graph.numEdges(),
    );
    assert.ok(graph.getEdges().every((e) => e.from !== e.to));
  }
  assert.deepEqual(
    createRandomGraph(30, 100, 71).getEdges(),
    createRandomGraph(30, 100, 71).getEdges(),
  );
  const graph = createRandomGraph(30, 29, 0);
  for (let i = 0; i < 29; i++)
    assert.ok(graph.getNeighbors(i).some((e) => e.to === i + 1));
});
test("overflow is reported, and a finite bound cannot accidentally exclude huge valid distances", () => {
  const graph = new Graph(3);
  graph.addEdge(0, 1, 1e100);
  graph.addEdge(1, 2, 1e100);
  check(graph, 0, true);
  const overflow = new Graph(3);
  overflow.addEdge(0, 1, Number.MAX_VALUE);
  overflow.addEdge(1, 2, Number.MAX_VALUE);
  for (const fn of [dijkstra, breakingDijkstra])
    assert.throws(() => fn(overflow, 0), /Path sum/);
});
test("trace limits explicitly report truncation and always retain the final snapshot", () => {
  for (const fn of [dijkstra, breakingDijkstra]) {
    const result = fn(createRandomGraph(30, 70), 0, { maxTraceSteps: 3 });
    assert.equal(result.steps.length, 3);
    assert.equal(result.traceTruncated, true);
    assert.deepEqual(result.steps.at(-1).distances, result.distances);
    assert.equal(result.steps.at(-1).phase, "complete");
  }
});
test("path reconstruction rejects unknown vertices, cycles, and a wrong source", () => {
  assert.deepEqual(
    reconstructPath(
      new Map([
        [0, null],
        [1, null],
      ]),
      1,
      0,
    ),
    [],
  );
  assert.deepEqual(
    reconstructPath(
      new Map([
        [0, 1],
        [1, 0],
      ]),
      1,
    ),
    [],
  );
  assert.deepEqual(reconstructPath(new Map([[0, null]]), 2), []);
  assert.deepEqual(reconstructPath(new Map([[0, null]]), 0, 0), [0]);
});
test("indexed heap supports decrease-key and never creates duplicate entries", () => {
  const keys = [5, 2, 8, 1];
  const heap = new MinHeap((a, b) => keys[a] < keys[b]);
  [0, 1, 2, 3].forEach((v) => heap.upsert(v));
  keys[2] = 0;
  heap.upsert(2);
  heap.upsert(2);
  assert.equal(heap.size, 4);
  assert.deepEqual(
    [heap.pop(), heap.pop(), heap.pop(), heap.pop()],
    [2, 3, 1, 0],
  );
});

test("empty pivot sets complete their witness set without a fallback", () => {
  const graph = new Graph(300);
  const result = breakingDijkstra(graph, 299);
  assert.equal(result.parameters.k, 2);
  assert.equal(result.stats.recursiveCalls, 1);
  assert.deepEqual([...result.steps.at(-1).complete], [299]);
  check(graph, 299, true);
});
test("100 multi-round adversarial graphs with zero-weight edges preserve completion invariants", () => {
  for (let seed = 0; seed < 100; seed++) {
    const random = seededRandom(seed + 7000);
    const graph = new Graph(270);
    for (let edge = 0; edge < 1800; edge++)
      graph.addEdge(
        Math.floor(random() * 270),
        Math.floor(random() * 270),
        Math.floor(random() * 4),
      );
    check(graph, Math.floor(random() * 270), seed < 8);
  }
});
