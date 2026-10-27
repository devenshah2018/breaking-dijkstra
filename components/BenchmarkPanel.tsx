"use client";
import { useEffect, useRef, useState } from "react";
import {
  BenchmarkConfig,
  BenchmarkFamily,
  BenchmarkReport,
} from "@/lib/benchmark";
import Icon from "./Icons";

export function downloadJSON(data: unknown, filename: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function BenchmarkPanel() {
  const [family, setFamily] = useState<BenchmarkFamily>("sparse");
  const [size, setSize] = useState(500);
  const [report, setReport] = useState<BenchmarkReport | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const worker = useRef<Worker | null>(null);
  useEffect(() => () => worker.current?.terminate(), []);
  const run = () => {
    setRunning(true);
    setProgress(0);
    setError("");
    setReport(null);
    try {
      worker.current?.terminate();
      const current = new Worker(
        new URL("../lib/benchmark.worker.ts", import.meta.url),
      );
      worker.current = current;
      current.onmessage = ({ data }) => {
        if (data.type === "progress") setProgress(data.progress);
        else {
          setRunning(false);
          if (data.type === "result") setReport(data.report);
          else setError(data.message);
          current.terminate();
          worker.current = null;
        }
      };
      current.onerror = () => {
        setError("The benchmark worker could not finish. Try a smaller graph.");
        setRunning(false);
        current.terminate();
        worker.current = null;
      };
      current.postMessage({ family, size } satisfies BenchmarkConfig);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not start benchmark",
      );
      setRunning(false);
    }
  };
  const cancel = () => {
    worker.current?.terminate();
    worker.current = null;
    setRunning(false);
    setProgress(0);
  };
  const stale =
    report && (report.config.family !== family || report.config.size !== size);
  const maxTime = report
    ? Math.max(report.dijkstra.p90, report.bmssp.p90, 0.001)
    : 1;
  const ratio = report
    ? report.bmssp.median / Math.max(report.dijkstra.median, 0.000001)
    : 0;
  const overlapping = report
    ? report.dijkstra.p90 >= report.bmssp.p10 &&
      report.bmssp.p90 >= report.dijkstra.p10
    : false;
  const time = (value: number) => (value < 0.001 ? "<0.001" : value.toFixed(3));
  return (
    <section className="benchmark-panel" aria-label="Performance benchmarks">
      <div className="section-heading">
        <div>
          <span className="eyebrow">MEASURE THE IMPLEMENTATIONS</span>
          <h2>Evidence before a speed claim.</h2>
          <p>
            Reproducible graphs. Independent correctness checks. Real timings in
            your browser.
          </p>
        </div>
        <span className="outline-badge">
          <Icon name="clock" size={14} /> No rendering overhead
        </span>
      </div>
      <div className="benchmark-config surface">
        <div className="field">
          <label htmlFor="benchmark-family">Graph family</label>
          <select
            id="benchmark-family"
            value={family}
            onChange={(e) => setFamily(e.target.value as BenchmarkFamily)}
            disabled={running}
          >
            <option value="sparse">Sparse · 3n edges</option>
            <option value="grid">Directed grid</option>
            <option value="dense">Dense · 12% of possible edges</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="benchmark-size">Requested vertices</label>
          <select
            id="benchmark-size"
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            disabled={running}
          >
            {[100, 500, 1000].map((n) => (
              <option key={n} value={n}>
                {n.toLocaleString()}
              </option>
            ))}
          </select>
        </div>
        <p>
          21 measured batches
          <br />
          <span>5 warm-up runs per algorithm</span>
        </p>
        <button className="button primary" onClick={running ? cancel : run}>
          <Icon name={running ? "close" : "chart"} size={17} />
          {running ? "Cancel benchmark" : "Run benchmark"}
        </button>
      </div>
      {error && (
        <div className="error-notice" role="alert">
          {error}
        </div>
      )}
      {running && (
        <div className="benchmark-progress" role="status">
          <div>
            <span>
              {progress === 0
                ? "Checking distances and warming up…"
                : "Measuring both implementations…"}
            </span>
            <strong>{Math.round(progress * 100)}%</strong>
          </div>
          <progress max="1" value={progress} />
          <p>
            The benchmark runs in a worker. You can continue exploring the
            workspace.
          </p>
        </div>
      )}
      {report ? (
        <div className="benchmark-result surface">
          <div className="benchmark-result-heading">
            <div>
              <span className="eyebrow">
                {stale ? "PREVIOUS RUN" : "LATEST RUN"}
              </span>
              <h3>
                {report.vertices.toLocaleString()} vertices ·{" "}
                {report.edges.toLocaleString()} directed edges
              </h3>
              <p>
                {report.config.family} graph · source {report.source} · seed{" "}
                {report.seed ?? "n/a"} · {report.samples} batches
              </p>
            </div>
            <span className="verification-badge">
              <Icon name="check" size={15} /> Bellman–Ford verified
            </span>
          </div>
          <div className="timing-chart">
            {[
              { name: "Dijkstra", data: report.dijkstra, className: "blue" },
              { name: "BMSSP demo", data: report.bmssp, className: "purple" },
            ].map((item) => (
              <div key={item.name} className="timing-row">
                <div>
                  <strong>{item.name}</strong>
                  <span>
                    {time(item.data.median)} <small>ms / run</small>
                  </span>
                </div>
                <div className="timing-track">
                  <div
                    className={`timing-bar ${item.className}`}
                    style={{
                      width: `${Math.max(0.5, (item.data.median / maxTime) * 100)}%`,
                    }}
                  />
                  <span
                    className="timing-range"
                    style={{
                      left: `${(item.data.p10 / maxTime) * 100}%`,
                      width: `${((item.data.p90 - item.data.p10) / maxTime) * 100}%`,
                    }}
                  />
                </div>
                <p>
                  10th–90th percentile: {time(item.data.p10)}–
                  {time(item.data.p90)} ms · {item.data.batchSize} runs per
                  batch · {item.data.stats.edgeScans.toLocaleString()} edge
                  inspections / run
                </p>
              </div>
            ))}
          </div>
          <div className="benchmark-verdict">
            <Icon name="info" />
            <p>
              <strong>
                {overlapping
                  ? "The timing ranges overlap."
                  : ratio >= 1
                    ? `Dijkstra has the lower median in this run (${ratio.toFixed(2)}×).`
                    : `The BMSSP demo has the lower median in this run (${(1 / ratio).toFixed(2)}×).`}
              </strong>
              <span>
                This measures these JavaScript implementations on one graph. It
                does not test or establish the paper’s asymptotic theorem.
              </span>
            </p>
            <button
              className="button secondary"
              onClick={() =>
                downloadJSON(report, "shortest-path-benchmark.json")
              }
            >
              <Icon name="download" size={16} />
              Export run
            </button>
          </div>
        </div>
      ) : (
        !running && (
          <div className="benchmark-empty">
            <span className="empty-icon">
              <Icon name="chart" size={28} />
            </span>
            <h3>Let the measurements speak.</h3>
            <p>
              Run a benchmark to compare the binary-heap baseline with the BMSSP
              procedure.
              <br />
              No prefilled numbers. No assumed winner.
            </p>
            <div>
              <span>Seeded input</span>
              <span>Alternating run order</span>
              <span>Tracing disabled</span>
            </div>
          </div>
        )
      )}
      <div className="method-note">
        <Icon name="info" size={18} />
        <p>
          <strong>Implementation scope.</strong> The BMSSP demo uses a full sort
          on Pull and omits the constant-degree graph transformation. It does
          not inherit the paper’s O(m log<sup>2/3</sup> n) bound. Timings
          exclude graph construction, Bellman–Ford verification, trace
          recording, and UI rendering. Batch sizes are calibrated per algorithm;
          percentile ranges describe batch averages, not confidence intervals.
          Grid sizes are rounded down to a square.
        </p>
      </div>
    </section>
  );
}
