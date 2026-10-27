"use client";
import { Graph } from "@/lib/graph";
import {
  AlgorithmResult,
  AlgorithmStep,
  formatDistance,
  reconstructPath,
} from "@/lib/algorithms";
import GraphVisualization from "./GraphVisualization";
import Icon from "./Icons";
interface Props {
  graph: Graph;
  result: AlgorithmResult | null;
  step: AlgorithmStep;
  source: number;
  target: number;
  onSelect: (vertex: number) => void;
  variant: "dijkstra" | "bmssp";
  showWeights: boolean;
}
export default function AlgorithmViewer({
  graph,
  result,
  step,
  source,
  target,
  onSelect,
  variant,
  showWeights,
}: Props) {
  const isBMSSP = variant === "bmssp";
  const finished = step.phase === "complete";
  const distance = step.distances.get(target)!;
  const path = Number.isFinite(distance)
    ? reconstructPath(step.parents, target, source)
    : [];
  const finalized = step.complete?.has(target) ?? false;
  return (
    <article
      className={`algorithm-card ${variant}`}
      aria-label={isBMSSP ? "BMSSP algorithm" : "Dijkstra algorithm"}
    >
      <header className="algorithm-header">
        <div className="algorithm-identity">
          <span className="algorithm-letter">{isBMSSP ? "B" : "A"}</span>
          <div>
            <div className="eyebrow">
              {isBMSSP ? "RECURSIVE PROCEDURE" : "CLASSICAL BASELINE"}
            </div>
            <h2>{isBMSSP ? "Duan et al. · BMSSP" : "Dijkstra’s algorithm"}</h2>
          </div>
        </div>
        <span className={`run-state ${finished ? "is-done" : ""}`}>
          <i />
          {!result
            ? "Ready"
            : finished
              ? "Complete"
              : `Event ${step.iteration + 1}/${result.steps.length}`}
        </span>
      </header>
      <div className="algorithm-meta">
        <span>
          {isBMSSP ? "Pivots + recursive blocks" : "Indexed binary min-heap"}
        </span>
        <code>
          {isBMSSP
            ? result
              ? `k=${result.parameters?.k} · t=${result.parameters?.t} · L=${result.parameters?.levels}`
              : "BMSSP(L, ∞, {s})"
            : "O((m + n) log n)"}
        </code>
      </div>
      <div className="graph-stage">
        <GraphVisualization
          graph={graph}
          step={step}
          source={source}
          target={target}
          highlightPath={path}
          showWeights={showWeights}
          onSelect={onSelect}
          variant={variant}
        />
        <span className="canvas-hint">Click a vertex to set the target</span>
      </div>
      <div className="algorithm-metrics">
        <div>
          <span>Finalized</span>
          <strong>
            {step.complete?.size ?? 0}
            <small> / {graph.numVertices()}</small>
          </strong>
        </div>
        <div>
          <span>Target distance</span>
          <strong>
            {formatDistance(distance)}
            <small>
              {Number.isFinite(distance)
                ? finalized
                  ? " final"
                  : " tentative"
                : finished
                  ? " unreachable"
                  : " unreached"}
            </small>
          </strong>
        </div>
        <div>
          <span>{isBMSSP ? "Recursion level" : "Heap size"}</span>
          <strong>
            {isBMSSP ? (step.level ?? "—") : (step.queue?.length ?? 0)}
          </strong>
        </div>
      </div>
      <div className="path-summary">
        <span>
          {step.phase === "complete" && !Number.isFinite(distance)
            ? "NO ROUTE"
            : finalized
              ? "SHORTEST PATH"
              : "CURRENT ROUTE"}
        </span>
        <code>{path.length ? path.join(" → ") : "—"}</code>
      </div>
      <div className="step-inspector">
        <div className="step-phase">
          <Icon
            name={finished ? "check" : isBMSSP ? "layers" : "arrow"}
            size={15}
          />
          <span>
            {step.phase === "initialize" && !result
              ? "Awaiting execution"
              : step.phase === "complete"
                ? "Execution complete"
                : step.phase === "return"
                  ? "Return from recursion"
                  : step.phase}
          </span>
          {isBMSSP && step.bound !== undefined && (
            <code>B = {formatDistance(step.bound)}</code>
          )}
        </div>
        <h3>{step.description}</h3>
        <ul>
          {step.actions.map((action, index) => (
            <li key={index}>{action}</li>
          ))}
        </ul>
      </div>
      {result?.traceTruncated && (
        <p className="trace-warning">
          The trace was capped. The final snapshot and result are complete.
        </p>
      )}
    </article>
  );
}
