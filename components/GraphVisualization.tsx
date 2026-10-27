"use client";
import { useId, useMemo } from "react";
import { Graph } from "@/lib/graph";
import { AlgorithmStep, formatDistance } from "@/lib/algorithms";

// Quantize display geometry so V8 and JavaScriptCore hydrate identical SVG attributes.
const coordinate = (value: number) => Number(value.toFixed(3));

interface Props {
  graph: Graph;
  step: AlgorithmStep;
  source: number;
  target?: number;
  highlightPath?: number[];
  showWeights?: boolean;
  onSelect?: (vertex: number) => void;
  variant?: "dijkstra" | "bmssp";
}
export default function GraphVisualization({
  graph,
  step,
  source,
  target,
  highlightPath = [],
  showWeights = true,
  onSelect,
  variant = "dijkstra",
}: Props) {
  const id = useId().replace(/:/g, "");
  const n = graph.numVertices();
  const width = 540,
    height = 380;
  const positions = useMemo(() => {
    const points: Array<{ x: number; y: number }> = [];
    const evenly = (
      index: number,
      count: number,
      start: number,
      end: number,
    ) =>
      count === 1
        ? (start + end) / 2
        : start + (index * (end - start)) / (count - 1);
    for (let v = 0; v < n; v++) {
      if (graph.layout === "layered" && n > 2) {
        const split = Math.ceil((n - 2) / 2);
        points.push(
          v === 0
            ? { x: 55, y: 185 }
            : v === n - 1
              ? { x: 485, y: 185 }
              : v <= split
                ? { x: 195, y: evenly(v - 1, split, 40, 325) }
                : { x: 345, y: evenly(v - split - 1, n - 2 - split, 40, 325) },
        );
      } else if (graph.layout === "grid" || graph.layout === "path") {
        const cols =
          graph.layout === "path" ? Math.ceil(n / 2) : Math.ceil(Math.sqrt(n));
        const rows = Math.ceil(n / cols);
        const row = Math.floor(v / cols),
          rawCol = v % cols;
        const col =
          graph.layout === "path" && row % 2 ? cols - rawCol - 1 : rawCol;
        points.push({
          x: evenly(col, cols, 55, 485),
          y: evenly(row, rows, 48, 322),
        });
      } else if (graph.layout === "tree") {
        const depth = Math.floor(Math.log2(v + 1));
        const maxDepth = Math.floor(Math.log2(n));
        const index = v - (2 ** depth - 1);
        points.push({
          x: ((index + 0.5) * width) / 2 ** depth,
          y: evenly(depth, maxDepth + 1, 42, 320),
        });
      } else if (
        graph.layout === "radial" &&
        n > 1 &&
        graph.getNeighbors(0).length === n - 1
      ) {
        const angle = (2 * Math.PI * (v - 1)) / (n - 1) - Math.PI / 2;
        points.push(
          v === 0
            ? { x: 270, y: 185 }
            : {
                x: 270 + 210 * Math.cos(angle),
                y: 185 + 140 * Math.sin(angle),
              },
        );
      } else {
        const angle = (2 * Math.PI * v) / n - Math.PI / 2;
        points.push({
          x: 270 + 210 * Math.cos(angle),
          y: 185 + 140 * Math.sin(angle),
        });
      }
    }
    return points.map((point) => ({
      x: coordinate(point.x),
      y: coordinate(point.y),
    }));
  }, [graph, n]);
  const edges = useMemo(() => graph.getEdges(), [graph]);
  const edgePairs = new Set(edges.map((edge) => `${edge.from}:${edge.to}`));
  const pathPairs = new Set(
    highlightPath.slice(1).map((v, i) => `${highlightPath[i]}:${v}`),
  );
  const pathVertices = new Set(highlightPath);
  const radius = n > 20 ? 13 : 16;
  const accent = variant === "dijkstra" ? "#3a77db" : "#8a5ac8";
  const status = (v: number) =>
    v === source
      ? "source"
      : step.currentVertex === v
        ? "active"
        : pathVertices.has(v)
          ? "path"
          : step.pivots?.has(v)
            ? "pivot"
            : step.complete?.has(v)
              ? "complete"
              : step.frontier?.has(v) || step.queue?.includes(v)
                ? "frontier"
                : Number.isFinite(step.distances.get(v))
                  ? "discovered"
                  : "unreached";
  return (
    <svg
      className="network-canvas"
      viewBox={`0 0 ${width} ${height}`}
      role="group"
      aria-label={`${variant === "dijkstra" ? "Dijkstra" : "BMSSP"} directed graph. Source ${source}, target ${target}. Select a vertex to change the target.`}
    >
      <defs>
        <pattern
          id={`${id}-dots`}
          width="18"
          height="18"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="1" cy="1" r="0.65" fill="#dfe5ed" />
        </pattern>
        {["default", "path", "active"].map((type) => (
          <marker
            key={type}
            id={`${id}-${type}`}
            markerWidth="6"
            markerHeight="6"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            orient="auto-start-reverse"
          >
            <path
              d="M1 1 9 5 1 9Z"
              fill={
                type === "path"
                  ? "#16a085"
                  : type === "active"
                    ? accent
                    : "#b7c2d0"
              }
            />
          </marker>
        ))}
      </defs>
      <rect width={width} height={height} fill={`url(#${id}-dots)`} />
      {edges.map((edge, index) => {
        const a = positions[edge.from],
          b = positions[edge.to];
        const dx = b.x - a.x,
          dy = b.y - a.y,
          length = Math.hypot(dx, dy) || 1;
        const ux = dx / length,
          uy = dy / length;
        const start = {
          x: coordinate(a.x + ux * (radius + 2)),
          y: coordinate(a.y + uy * (radius + 2)),
        };
        const end = {
          x: coordinate(b.x - ux * (radius + 5)),
          y: coordinate(b.y - uy * (radius + 5)),
        };
        const reciprocal =
          edgePairs.has(`${edge.to}:${edge.from}`) && edge.from !== edge.to;
        const cx = coordinate((a.x + b.x) / 2 - uy * (reciprocal ? 23 : 0)),
          cy = coordinate((a.y + b.y) / 2 + ux * (reciprocal ? 23 : 0));
        const d =
          edge.from === edge.to
            ? `M${a.x - 10},${a.y - 12} C${a.x - 45},${a.y - 65} ${a.x + 45},${a.y - 65} ${a.x + 12},${a.y - 13}`
            : `M${start.x},${start.y} Q${cx},${cy} ${end.x},${end.y}`;
        const isPath =
          pathPairs.has(`${edge.from}:${edge.to}`) &&
          step.distances.get(edge.from)! + edge.weight ===
            step.distances.get(edge.to);
        const active = step.currentVertex === edge.from;
        const type = isPath ? "path" : active ? "active" : "default";
        return (
          <g key={index} className={`graph-edge ${isPath ? "on-path" : ""}`}>
            <title>{`${edge.from} → ${edge.to}, weight ${edge.weight}`}</title>
            <path
              d={d}
              fill="none"
              stroke={isPath ? "#16a085" : active ? accent : "#c7d0dc"}
              strokeWidth={isPath ? 2.8 : active ? 1.8 : 1.1}
              markerEnd={`url(#${id}-${type})`}
              opacity={isPath || active ? 1 : 0.68}
            />
            {showWeights && edge.from !== edge.to && (
              <text
                x={cx}
                y={cy - 6}
                className="edge-weight"
                textAnchor="middle"
              >
                {formatDistance(edge.weight)}
              </text>
            )}
          </g>
        );
      })}
      {positions.map((position, v) => (
        <g
          key={v}
          className={`graph-node node-${status(v)} ${v === target ? "node-target" : ""}`}
          transform={`translate(${position.x} ${position.y})`}
          role={onSelect ? "button" : undefined}
          tabIndex={onSelect ? 0 : undefined}
          aria-label={`Vertex ${v}, distance ${formatDistance(step.distances.get(v)!)}, ${status(v)}${v === target ? ", target" : ""}`}
          onClick={() => onSelect?.(v)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onSelect?.(v);
            }
          }}
        >
          <title>{`Vertex ${v} · ${status(v)} · distance ${formatDistance(step.distances.get(v)!)}${v === target ? " · target" : ""}`}</title>
          {v === target && (
            <circle
              className="target-ring"
              r={radius + 5}
              fill="none"
              stroke="#7e8da1"
              strokeDasharray="3 3"
            />
          )}
          <circle className="node-body" r={radius} />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            className="node-id"
          >
            {v}
          </text>
          <text y={radius + 17} textAnchor="middle" className="node-distance">
            {formatDistance(step.distances.get(v)!)}
          </text>
          {v === source && (
            <text y={-radius - 10} textAnchor="middle" className="source-label">
              SOURCE
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
