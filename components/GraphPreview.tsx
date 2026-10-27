import { Graph } from "@/lib/graph";
/** Compact topology mark; the full interactive rendering carries graph semantics. */
export default function GraphPreview({ graph }: { graph: Graph }) {
  const n = Math.min(graph.numVertices(), 10);
  const points = Array.from({ length: n }, (_, i) => ({
    x: Number((24 + 19 * Math.cos((i * Math.PI * 2) / n)).toFixed(3)),
    y: Number((24 + 19 * Math.sin((i * Math.PI * 2) / n)).toFixed(3)),
  }));
  return (
    <svg width="46" height="46" viewBox="0 0 48 48" aria-hidden="true">
      <path
        d={
          points.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ") + "Z"
        }
        fill="none"
        stroke="#b8c6d5"
      />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="2.8"
          fill={i ? "#7e93aa" : "#14987e"}
        />
      ))}
    </svg>
  );
}
