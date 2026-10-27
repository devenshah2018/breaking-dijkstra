/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node CommonJS benchmark entrypoint. */
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
const { runBenchmark } = require("../lib/benchmark.ts");
const configs = [
  { size: 100, family: "sparse" },
  { size: 500, family: "sparse" },
  { size: 1000, family: "sparse" },
  { size: 1000, family: "grid" },
  { size: 500, family: "dense" },
];
process.stdout.write(
  JSON.stringify(
    {
      environment: {
        runtime: process.version,
        platform: process.platform,
        architecture: process.arch,
      },
      scope:
        "Single seeded graph per configuration; timings include kernel allocations and counters, exclude tracing and correctness checks. No asymptotic claim.",
      reports: configs.map((config) => runBenchmark(config)),
    },
    null,
    2,
  ) + "\n",
);
