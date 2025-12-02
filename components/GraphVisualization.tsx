'use client';

import { Graph } from '@/lib/graph';
import { AlgorithmStep } from '@/lib/algorithms';
import { useMemo } from 'react';

interface GraphVisualizationProps {
  graph: Graph;
  step: AlgorithmStep;
  source: number;
  highlightPath?: number[];
  width?: number;
  height?: number;
}

export default function GraphVisualization({
  graph,
  step,
  source,
  highlightPath = [],
  width = 500,
  height = 400,
}: GraphVisualizationProps) {
  const n = graph.numVertices();
  const edges = graph.getEdges();
  const distances = step.distances;

  const positions = useMemo(() => {
    const pos: Array<{ x: number; y: number }> = [];
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.35;

    if (n <= 10) {
      for (let i = 0; i < n; i++) {
        const angle = (2 * Math.PI * i) / n - Math.PI / 2;
        pos.push({
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        });
      }
    } else {
      const cols = Math.ceil(Math.sqrt(n));
      const rows = Math.ceil(n / cols);
      const cellWidth = width / (cols + 1);
      const cellHeight = height / (rows + 1);

      for (let i = 0; i < n; i++) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        pos.push({
          x: cellWidth * (col + 1),
          y: cellHeight * (row + 1),
        });
      }
    }

    return pos;
  }, [n, width, height]);

  const getNodeColor = (v: number): string => {
    if (v === source) return '#10b981';
    if (step.currentVertex === v) return '#fbbf24';
    if (step.visited?.has(v)) return '#86efac';
    if (step.queue?.includes(v)) return '#93c5fd';
    if (step.frontier?.has(v)) return '#fde047';
    if (step.pivots?.has(v)) return '#a855f7';
    if (step.complete?.has(v)) return '#86efac';
    if (highlightPath.includes(v)) return '#fb923c';
    if (distances.get(v)! < Infinity) return '#fef3c7';
    return '#e5e7eb';
  };

  const getNodeStroke = (v: number): string => {
    if (v === source) return '#059669';
    if (step.currentVertex === v) return '#d97706';
    if (highlightPath.includes(v)) return '#ea580c';
    return '#374151';
  };

  const isPathEdge = (from: number, to: number): boolean => {
    if (highlightPath.length < 2) return false;
    for (let i = 0; i < highlightPath.length - 1; i++) {
      if (highlightPath[i] === from && highlightPath[i + 1] === to) {
        return true;
      }
    }
    return false;
  };

  const isCurrentEdge = (from: number): boolean => {
    return step.currentVertex === from;
  };

  return (
    <svg 
      width={width} 
      height={height} 
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      className="border border-gray-300 rounded max-w-full h-auto"
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      {edges.map((edge, idx) => {
        const fromPos = positions[edge.from];
        const toPos = positions[edge.to];
        const isPath = isPathEdge(edge.from, edge.to);
        const isCurrent = isCurrentEdge(edge.from);

        return (
          <g key={idx}>
            <line
              x1={fromPos.x}
              y1={fromPos.y}
              x2={toPos.x}
              y2={toPos.y}
              stroke={isPath ? '#ef4444' : isCurrent ? '#3b82f6' : '#d1d5db'}
              strokeWidth={isPath ? 3 : isCurrent ? 2 : 1}
              opacity={isPath ? 0.9 : isCurrent ? 0.7 : 0.4}
              markerEnd="url(#arrowhead)"
            />
            {n <= 20 && (
              <text
                x={(fromPos.x + toPos.x) / 2}
                y={(fromPos.y + toPos.y) / 2 - 5}
                fontSize="10"
                fill="#6b7280"
                textAnchor="middle"
              >
                {edge.weight.toFixed(1)}
              </text>
            )}
          </g>
        );
      })}

      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 10 3, 0 6" fill="#9ca3af" />
        </marker>
      </defs>

      {positions.map((pos, v) => {
        const dist = distances.get(v)!;
        const distText = dist < Infinity ? dist.toFixed(1) : '∞';

        return (
          <g key={v}>
            <circle
              cx={pos.x}
              cy={pos.y}
              r={n <= 10 ? 20 : 15}
              fill={getNodeColor(v)}
              stroke={getNodeStroke(v)}
              strokeWidth={2}
            />
            <text
              x={pos.x}
              y={pos.y - (n <= 10 ? 30 : 25)}
              fontSize={n <= 10 ? '12' : '10'}
              fontWeight="bold"
              textAnchor="middle"
              fill="#1f2937"
            >
              {v}
            </text>
            <text
              x={pos.x}
              y={pos.y + (n <= 10 ? 35 : 30)}
              fontSize={n <= 10 ? '10' : '8'}
              textAnchor="middle"
              fill="#4b5563"
            >
              {distText}
            </text>
          </g>
        );
      })}
    </svg>
  );
}


