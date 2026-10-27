"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Graph, SAMPLE_GRAPHS } from "@/lib/graph";
import {
  AlgorithmResult,
  AlgorithmStep,
  breakingDijkstra,
  dijkstra,
  formatDistance,
  reconstructPath,
} from "@/lib/algorithms";
import { referenceDistances, verifyResult } from "@/lib/benchmark";
import AlgorithmViewer from "@/components/AlgorithmViewer";
import GraphPreview from "@/components/GraphPreview";
import BenchmarkPanel, { downloadJSON } from "@/components/BenchmarkPanel";
import Methodology from "@/components/Methodology";
import Icon, { IconName } from "@/components/Icons";

type Tab = "workspace" | "benchmarks" | "methodology";
type Results = {
  dijkstra: AlgorithmResult;
  bmssp: AlgorithmResult;
  verified: boolean;
};

function initialStep(graph: Graph, source: number): AlgorithmStep {
  return {
    iteration: 0,
    phase: "initialize",
    distances: new Map(
      Array.from({ length: graph.numVertices() }, (_, v) => [
        v,
        v === source ? 0 : Infinity,
      ]),
    ),
    parents: new Map(
      Array.from({ length: graph.numVertices() }, (_, v) => [v, null]),
    ),
    visited: new Set(),
    complete: new Set(),
    description: "The graph is ready. Start a comparison.",
    actions: [
      "Both procedures run on the same directed graph and source.",
      "Select a target to inspect its path as the algorithm progresses.",
    ],
  };
}

function Comparison({
  graph,
  source,
  target,
  onTarget,
  active,
}: {
  graph: Graph;
  source: number;
  target: number;
  onTarget: (v: number) => void;
  active: boolean;
}) {
  const [results, setResults] = useState<Results | null>(null);
  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [weights, setWeights] = useState(graph.numEdges() <= 45);
  const [inspector, setInspector] = useState<"distances" | "trace">(
    "distances",
  );
  const [error, setError] = useState("");
  const total = results
    ? Math.max(results.dijkstra.steps.length, results.bmssp.steps.length)
    : 0;
  const ended = !!results && position >= total - 1;
  const initial = useMemo(() => initialStep(graph, source), [graph, source]);
  const stepA =
    results?.dijkstra.steps[
      Math.min(position, results.dijkstra.steps.length - 1)
    ] ?? initial;
  const stepB =
    results?.bmssp.steps[Math.min(position, results.bmssp.steps.length - 1)] ??
    initial;
  const togglePlay = useCallback(() => {
    if (!results) {
      try {
        setError("");
        const a = dijkstra(graph, source),
          b = breakingDijkstra(graph, source);
        const reference = referenceDistances(graph, source);
        const verified =
          verifyResult(graph, source, a, reference) &&
          verifyResult(graph, source, b, reference);
        setResults({ dijkstra: a, bmssp: b, verified });
        setPosition(0);
        if (!verified) {
          setError(
            "The independent correctness check failed. Inspect or export this result before relying on it.",
          );
          setPlaying(false);
        } else setPlaying(true);
      } catch (failure) {
        setError(
          failure instanceof Error
            ? failure.message
            : "The comparison could not run.",
        );
        setPlaying(false);
      }
      return;
    }
    if (ended) setPosition(0);
    setPlaying((current) => !current);
  }, [results, graph, source, ended]);
  const seek = useCallback(
    (next: number) => {
      setPlaying(false);
      setPosition(Math.max(0, Math.min(total - 1, next)));
    },
    [total],
  );
  useEffect(() => {
    if (!playing || !results || !active) return;
    const timer = setTimeout(() => {
      if (position >= total - 2) {
        setPosition(total - 1);
        setPlaying(false);
      } else setPosition((current) => current + 1);
    }, 850 / speed);
    return () => clearTimeout(timer);
  }, [playing, results, position, total, speed, active]);
  useEffect(() => {
    if (!active) return;
    const keydown = (event: KeyboardEvent) => {
      if (
        (event.target as HTMLElement).closest(
          'input, select, button, a, textarea, [role="button"], [role="tab"]',
        ) ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      )
        return;
      if (event.key === " ") {
        event.preventDefault();
        togglePlay();
      } else if (results && event.key === "ArrowRight") {
        event.preventDefault();
        seek(position + 1);
      } else if (results && event.key === "ArrowLeft") {
        event.preventDefault();
        seek(position - 1);
      } else if (results && event.key === "Home") {
        event.preventDefault();
        seek(0);
      } else if (results && event.key === "End") {
        event.preventDefault();
        seek(total - 1);
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [togglePlay, results, seek, position, total, active]);
  const exportResults = () => {
    if (!results) return;
    const serialize = (result: AlgorithmResult) => ({
      distances: [...result.distances].map(([vertex, distance]) => ({
        vertex,
        distance: Number.isFinite(distance) ? distance : null,
        reachable: Number.isFinite(distance),
        path: reconstructPath(result.parents, vertex, source),
      })),
      parameters: result.parameters,
      stats: result.stats,
      recordedEvents: result.steps.length,
      traceTruncated: result.traceTruncated,
    });
    downloadJSON(
      {
        schemaVersion: 1,
        paper: "https://arxiv.org/abs/2504.17033v2",
        scope:
          "BMSSP procedure with sort-on-pull queue; no paper runtime guarantee",
        source,
        target,
        graph: { vertices: graph.numVertices(), edges: graph.getEdges() },
        verifiedAgainstBellmanFord: results.verified,
        dijkstra: serialize(results.dijkstra),
        bmssp: serialize(results.bmssp),
      },
      "shortest-path-comparison.json",
    );
  };
  return (
    <>
      <div className="playback-toolbar surface">
        <div className="transport">
          <button
            className="button primary run-button"
            onClick={togglePlay}
            aria-label={
              playing
                ? "Pause comparison"
                : !results
                  ? "Run comparison"
                  : ended
                    ? "Replay comparison"
                    : "Play comparison"
            }
          >
            <Icon name={playing ? "pause" : "play"} size={16} />
            {playing
              ? "Pause"
              : !results
                ? "Run comparison"
                : ended
                  ? "Replay"
                  : "Continue"}
          </button>
          <div className="step-buttons">
            <button
              className="icon-button"
              aria-label="Reset playback"
              title="Reset playback (Home)"
              onClick={() => seek(0)}
              disabled={!results || position === 0}
            >
              <Icon name="reset" size={16} />
            </button>
            <button
              className="icon-button"
              aria-label="Previous event"
              title="Previous event (←)"
              onClick={() => seek(position - 1)}
              disabled={!results || position === 0}
            >
              <Icon name="previous" size={16} />
            </button>
            <button
              className="icon-button"
              aria-label="Next event"
              title="Next event (→)"
              onClick={() => seek(position + 1)}
              disabled={!results || ended}
            >
              <Icon name="next" size={16} />
            </button>
            <button
              className="icon-button"
              aria-label="Skip to result"
              title="Skip to result (End)"
              onClick={() => seek(total - 1)}
              disabled={!results || ended}
            >
              <Icon name="end" size={16} />
            </button>
          </div>
        </div>
        <div className="timeline">
          <div>
            <span>
              {!results
                ? "Ready when you are"
                : ended
                  ? "Both traces complete"
                  : "Shared event playback"}
            </span>
            <code>{results ? `${position + 1} / ${total}` : "— / —"}</code>
          </div>
          <input
            aria-label="Playback position"
            type="range"
            min="0"
            max={Math.max(1, total - 1)}
            value={position}
            disabled={!results}
            onChange={(event) => seek(Number(event.target.value))}
          />
        </div>
        <select
          className="speed-select"
          aria-label="Playback speed"
          value={speed}
          onChange={(event) => setSpeed(Number(event.target.value))}
        >
          <option value="0.5">0.5×</option>
          <option value="1">1× speed</option>
          <option value="2">2× speed</option>
          <option value="4">4× speed</option>
        </select>
        <button
          className="button secondary export-button"
          aria-label="Export comparison results"
          title="Export comparison results"
          onClick={exportResults}
          disabled={!results}
        >
          <Icon name="download" size={16} />
          <span>Export</span>
        </button>
      </div>
      {error && (
        <div className="error-notice" role="alert">
          {error}
        </div>
      )}
      <div className="workspace-status">
        <div className="legend">
          <span>
            <i className="legend-source" />
            Source
          </span>
          <span>
            <i className="legend-active" />
            Active
          </span>
          <span>
            <i className="legend-pivot" />
            Pivot
          </span>
          <span>
            <i className="legend-frontier" />
            Frontier
          </span>
          <span>
            <i className="legend-complete" />
            Finalized
          </span>
          <span>
            <i className="legend-path" />
            Path
          </span>
          <span>
            <i className="legend-target" />
            Target
          </span>
        </div>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={weights}
            onChange={(event) => setWeights(event.target.checked)}
          />
          Edge weights
        </label>
      </div>
      <div className="comparison-grid">
        <AlgorithmViewer
          graph={graph}
          result={results?.dijkstra ?? null}
          step={stepA}
          source={source}
          target={target}
          variant="dijkstra"
          showWeights={weights}
          onSelect={onTarget}
        />
        <AlgorithmViewer
          graph={graph}
          result={results?.bmssp ?? null}
          step={stepB}
          source={source}
          target={target}
          variant="bmssp"
          showWeights={weights}
          onSelect={onTarget}
        />
      </div>
      <div className="comparison-footnote" role="status">
        <span>
          <Icon name="info" size={14} />
          Shared playback advances one recorded event per algorithm. Events are
          not equal units of work.
        </span>
        <span>
          {results?.verified ? (
            <>
              <Icon name="check" size={14} />
              Final outputs verified against Bellman–Ford
            </>
          ) : (
            "Correctness is checked when you run a comparison."
          )}
        </span>
      </div>
      <section className="data-inspector surface">
        <div className="inspector-header">
          <div
            className="inspector-tabs"
            role="tablist"
            aria-label="Result inspector"
            onKeyDown={(event) => {
              if (
                !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
              )
                return;
              event.preventDefault();
              const next =
                event.key === "Home"
                  ? "distances"
                  : event.key === "End"
                    ? "trace"
                    : inspector === "distances"
                      ? "trace"
                      : "distances";
              setInspector(next);
              document.getElementById(`${next}-tab`)?.focus();
            }}
          >
            <button
              role="tab"
              id="distances-tab"
              aria-controls="distances-panel"
              aria-selected={inspector === "distances"}
              tabIndex={inspector === "distances" ? 0 : -1}
              className={inspector === "distances" ? "active" : ""}
              onClick={() => setInspector("distances")}
            >
              Distance table
            </button>
            <button
              role="tab"
              id="trace-tab"
              aria-controls="trace-panel"
              aria-selected={inspector === "trace"}
              tabIndex={inspector === "trace" ? 0 : -1}
              className={inspector === "trace" ? "active" : ""}
              onClick={() => setInspector("trace")}
            >
              Execution trace
              {results && (
                <span>
                  {results.dijkstra.steps.length + results.bmssp.steps.length}
                </span>
              )}
            </button>
          </div>
          <span className="inspector-context">
            Source {source}
            <Icon name="arrow" size={13} />
            Target {target}
          </span>
        </div>
        {inspector === "distances" ? (
          <div
            id="distances-panel"
            role="tabpanel"
            aria-labelledby="distances-tab"
          >
            <div className="distance-summary">
              <div>
                <span className="eyebrow">CURRENT SNAPSHOT</span>
                <h3>
                  {ended
                    ? "The same shortest distances."
                    : "Follow each distance as it improves."}
                </h3>
              </div>
              <p>
                ∞ = {ended ? "unreachable from this source" : "not reached yet"}
                <br />
                <span>Click a vertex number to inspect its route.</span>
              </p>
            </div>
            <div className="table-scroll">
              <table className="distance-table">
                <thead>
                  <tr>
                    <th>Vertex</th>
                    <th>
                      <i className="column-dot blue" />
                      Dijkstra
                    </th>
                    <th>Status</th>
                    <th>
                      <i className="column-dot purple" />
                      BMSSP
                    </th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: graph.numVertices() }, (_, v) => (
                    <tr key={v} className={v === target ? "selected-row" : ""}>
                      <td>
                        <button
                          onClick={() => onTarget(v)}
                          aria-label={`Inspect vertex ${v}`}
                          className="vertex-button"
                        >
                          {String(v).padStart(2, "0")}
                          {v === source ? (
                            <span>source</span>
                          ) : v === target ? (
                            <span>target</span>
                          ) : null}
                        </button>
                      </td>
                      {[stepA, stepB].map((step, index) => (
                        <PairCells key={index} step={step} vertex={v} />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div id="trace-panel" role="tabpanel" aria-labelledby="trace-tab">
            {!results ? (
              <div className="trace-empty">
                Run a comparison to inspect both execution traces.
              </div>
            ) : (
              <div className="trace-grid">
                {[
                  { name: "Dijkstra", result: results.dijkstra },
                  { name: "BMSSP", result: results.bmssp },
                ].map(({ name, result }) => (
                  <div key={name}>
                    <h3>
                      {name}
                      <span>{result.steps.length} recorded events</span>
                    </h3>
                    <ol className="trace-list">
                      {result.steps.map((step, index) => (
                        <li key={index}>
                          <button
                            className={
                              step === (name === "Dijkstra" ? stepA : stepB)
                                ? "current"
                                : ""
                            }
                            onClick={() => seek(index)}
                          >
                            <code>{String(index + 1).padStart(2, "0")}</code>
                            <span>
                              <small>
                                {step.phase}
                                {step.level !== undefined
                                  ? ` · level ${step.level}`
                                  : ""}
                              </small>
                              {step.description}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
      <div className="method-note">
        <Icon name="book" size={18} />
        <p>
          <strong>Read the visualization with the paper.</strong> BMSSP follows
          the recursive procedure in Algorithms 1–3. Its queue is simplified to
          sort on Pull; the paper’s amortized queue and constant-degree
          reduction are not implemented. The theoretical O(m log<sup>2/3</sup>{" "}
          n) bound is not claimed for this demo. Use the Benchmarks tab to
          measure these implementations.
        </p>
      </div>
    </>
  );
}
function PairCells({ step, vertex }: { step: AlgorithmStep; vertex: number }) {
  const distance = step.distances.get(vertex)!;
  const finalized = step.complete?.has(vertex);
  return (
    <>
      <td>
        <code>{formatDistance(distance)}</code>
      </td>
      <td>
        <span className={`distance-state ${finalized ? "final" : ""}`}>
          {finalized
            ? "Final"
            : Number.isFinite(distance)
              ? "Tentative"
              : step.phase === "complete"
                ? "Unreachable"
                : "Unreached"}
        </span>
      </td>
    </>
  );
}
export default function Home() {
  const [tab, setTab] = useState<Tab>("workspace");
  const [graphIndex, setGraphIndex] = useState(0);
  const [source, setSource] = useState(0);
  const [target, setTarget] = useState(13);
  const graph = useMemo(() => SAMPLE_GRAPHS[graphIndex].create(), [graphIndex]);
  const changeGraph = (index: number) => {
    const next = SAMPLE_GRAPHS[index].create();
    setGraphIndex(index);
    setSource(0);
    setTarget(next.numVertices() - 1);
  };
  const tabs: { id: Tab; name: string; icon: IconName }[] = [
    { id: "workspace", name: "Visual workspace", icon: "network" },
    { id: "benchmarks", name: "Benchmarks", icon: "chart" },
    { id: "methodology", name: "Paper & methodology", icon: "book" },
  ];
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to workspace
      </a>
      <header className="app-header">
        <Link className="brand" href="/" aria-label="Breaking Dijkstra home">
          <span className="brand-mark">
            <Icon name="network" size={23} />
          </span>
          <div>
            <strong>
              Breaking Dijkstra<span className="brand-dot">.</span>
            </strong>
            <span className="brand-subtitle">THE SHORTEST PATH LAB</span>
          </div>
        </Link>
        <div className="header-right">
          <span className="local-status">
            <i />
            Runs locally in your browser
          </span>
          <a
            className="paper-link"
            href="https://arxiv.org/abs/2504.17033v2"
            target="_blank"
            rel="noreferrer"
          >
            Source paper
            <Icon name="external" size={14} />
          </a>
        </div>
      </header>
      <main id="main-content" className="app-main">
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="eyebrow-line" />
              AN INTERACTIVE ALGORITHM WORKSPACE
            </div>
            <h1>A new route beyond Dijkstra.</h1>
            <p>
              Explore the shortest paths. Follow the recursive procedure.
              <br className="desktop-break" /> Understand what breaking the
              sorting barrier actually means.
            </p>
          </div>
          <div className="theorem-card">
            <span className="eyebrow">THE PAPER’S THEORETICAL ADVANCE</span>
            <div>
              <code>O(m + n log n)</code>
              <Icon name="arrow" size={19} />
              <strong>
                O(m log<sup>2/3</sup> n)
              </strong>
            </div>
            <span>
              Directed SSSP · non-negative weights · sparse-graph improvement
            </span>
          </div>
        </section>
        <nav
          className="workspace-nav"
          role="tablist"
          aria-label="Lab sections"
          onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
              return;
            event.preventDefault();
            const current = tabs.findIndex((item) => item.id === tab);
            const index =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? tabs.length - 1
                  : (current +
                      (event.key === "ArrowRight" ? 1 : -1) +
                      tabs.length) %
                    tabs.length;
            setTab(tabs[index].id);
            document.getElementById(`${tabs[index].id}-tab`)?.focus();
          }}
        >
          {tabs.map((item) => (
            <button
              key={item.id}
              id={`${item.id}-tab`}
              role="tab"
              aria-selected={tab === item.id}
              tabIndex={tab === item.id ? 0 : -1}
              aria-controls={`${item.id}-panel`}
              className={tab === item.id ? "active" : ""}
              onClick={() => setTab(item.id)}
            >
              <Icon name={item.icon} size={17} />
              {item.name}
              {item.id === "workspace" && <span className="tab-count">02</span>}
            </button>
          ))}
          <span className="nav-note">Based on Duan et al. · 2025</span>
        </nav>
        <section
          hidden={tab !== "workspace"}
          id="workspace-panel"
          role="tabpanel"
          aria-labelledby="workspace-tab"
        >
          <div className="graph-config surface">
            <div className="graph-description">
              <span className="graph-thumbnail">
                <GraphPreview graph={graph} />
              </span>
              <div>
                <span className="eyebrow">GRAPH CONFIGURATION</span>
                <p>{SAMPLE_GRAPHS[graphIndex].description}</p>
              </div>
            </div>
            <div className="field graph-select">
              <label htmlFor="graph-type">Topology</label>
              <select
                id="graph-type"
                value={graphIndex}
                onChange={(event) => changeGraph(Number(event.target.value))}
              >
                {SAMPLE_GRAPHS.map((sample, index) => (
                  <option value={index} key={sample.name}>
                    {sample.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field vertex-select">
              <label htmlFor="source-vertex">Source</label>
              <select
                id="source-vertex"
                value={source}
                onChange={(event) => setSource(Number(event.target.value))}
              >
                {Array.from({ length: graph.numVertices() }, (_, v) => (
                  <option value={v} key={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <Icon name="arrow" size={15} />
            <div className="field vertex-select">
              <label htmlFor="target-vertex">Target</label>
              <select
                id="target-vertex"
                value={target}
                onChange={(event) => setTarget(Number(event.target.value))}
              >
                {Array.from({ length: graph.numVertices() }, (_, v) => (
                  <option value={v} key={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="graph-counts">
              <span>
                <strong>{graph.numVertices()}</strong>vertices
              </span>
              <span>
                <strong>{graph.numEdges()}</strong>edges
              </span>
            </div>
          </div>
          <Comparison
            key={`${graphIndex}-${source}`}
            graph={graph}
            source={source}
            target={target}
            onTarget={setTarget}
            active={tab === "workspace"}
          />
        </section>
        <div
          id="benchmarks-panel"
          role="tabpanel"
          aria-labelledby="benchmarks-tab"
          hidden={tab !== "benchmarks"}
        >
          <BenchmarkPanel />
        </div>
        {tab === "methodology" && (
          <div
            id="methodology-panel"
            role="tabpanel"
            aria-labelledby="methodology-tab"
          >
            <Methodology />
          </div>
        )}
        <footer className="app-footer">
          <span>
            <Icon name="network" size={14} />
            Breaking Dijkstra · Research workspace
          </span>
          <span>Directed graphs. Transparent methods. Verifiable results.</span>
          <a
            href="https://arxiv.org/abs/2504.17033v2"
            target="_blank"
            rel="noreferrer"
          >
            arXiv:2504.17033v2
            <Icon name="external" size={12} />
          </a>
        </footer>
      </main>
    </>
  );
}
