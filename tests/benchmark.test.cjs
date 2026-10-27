/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS test runner and TypeScript compilation hook. */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    }).outputText,
    filename,
  );
const {
  benchmarkGraph,
  referenceDistances,
  verifyResult,
  summarize,
  runBenchmark,
} = require("../lib/benchmark.ts");
const { dijkstra, breakingDijkstra } = require("../lib/algorithms.ts");
const { Graph } = require("../lib/graph.ts");

test("percentiles interpolate correctly and leave source data unchanged", () => {
  const values = [5, 1, 3, 2, 4];
  assert.deepEqual(summarize(values), { median: 3, p10: 1.4, p90: 4.6 });
  assert.deepEqual(values, [5, 1, 3, 2, 4]);
  assert.throws(() => summarize([]), RangeError);
  assert.throws(() => summarize([NaN]), RangeError);
});
test("every benchmark family is reproducible, has correct actual size, and validates independently", () => {
  for (const family of ["sparse", "grid", "dense"])
    for (const size of [100, 500, 1000]) {
      const graph = benchmarkGraph({ family, size });
      assert.equal(
        graph.numVertices(),
        family === "grid" ? Math.floor(Math.sqrt(size)) ** 2 : size,
      );
      const expected = referenceDistances(graph, 0);
      for (const fn of [dijkstra, breakingDijkstra])
        assert.equal(
          verifyResult(graph, 0, fn(graph, 0, { trace: false }), expected),
          true,
        );
    }
  assert.deepEqual(
    benchmarkGraph({ size: 100, family: "sparse" }).getEdges(),
    benchmarkGraph({ size: 100, family: "sparse" }).getEdges(),
  );
  assert.throws(
    () => benchmarkGraph({ size: 123, family: "sparse" }),
    RangeError,
  );
  assert.throws(
    () => benchmarkGraph({ size: 100, family: "unknown" }),
    RangeError,
  );
});
test("validation rejects wrong distances, broken paths, and parent cycles", () => {
  const graph = new Graph(3);
  graph.addEdge(0, 1, 1);
  graph.addEdge(1, 2, 0);
  graph.addEdge(2, 1, 0);
  const expected = referenceDistances(graph, 0);
  const result = dijkstra(graph, 0);
  result.distances.set(2, 2);
  assert.equal(verifyResult(graph, 0, result, expected), false);
  result.distances.set(2, 1);
  result.parents.set(1, 2);
  assert.equal(verifyResult(graph, 0, result, expected), false);
});
test("a full run emits 21 progress updates, finite per-run times, and an independently verified result", () => {
  const progress = [];
  const report = runBenchmark({ size: 100, family: "sparse" }, (p) =>
    progress.push(p),
  );
  assert.equal(report.verified, true);
  assert.equal(report.samples, 21);
  assert.equal(report.warmups, 5);
  assert.equal(progress.length, 21);
  assert.equal(progress.at(-1), 1);
  for (const result of [report.dijkstra, report.bmssp]) {
    assert.ok(result.p10 >= 0);
    assert.ok(result.p10 <= result.median);
    assert.ok(result.p90 >= result.median);
    assert.ok(Number.isFinite(result.median));
    assert.ok(result.batchSize >= 1);
  }
});
