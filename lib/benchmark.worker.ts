import { BenchmarkConfig, runBenchmark } from "./benchmark";

self.onmessage = ({ data }: MessageEvent<BenchmarkConfig>) => {
  try {
    const report = runBenchmark(data, (progress) =>
      self.postMessage({ type: "progress", progress }),
    );
    self.postMessage({ type: "result", report });
  } catch (error) {
    self.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : "Benchmark failed",
    });
  }
};
