'use client';

import { Graph } from '@/lib/graph';
import { useMemo } from 'react';

interface GraphPreviewProps {
  graph: Graph;
  width?: number;
  height?: number;
}

export default function GraphPreview({ 
  graph, 
  width = 60, 
  height = 40 
}: GraphPreviewProps) {
  const n = graph.numVertices();
  const edges = graph.getEdges();
  
  const previewEdges = useMemo(() => {
    if (edges.length <= 20) return edges;
    const sampled: typeof edges = [];
    const step = Math.ceil(edges.length / 20);
    for (let i = 0; i < edges.length; i += step) {
      sampled.push(edges[i]);
    }
    return sampled;
  }, [edges]);
  
  const positions = useMemo(() => {
    const pos: Array<{ x: number; y: number }> = [];
    
    if (n <= 8) {
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) * 0.3;
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
  
  return (
    <div className="flex-shrink-0" style={{ width, height }}>
      <svg 
        width={width} 
        height={height} 
        viewBox={`0 0 ${width} ${height}`}
        className="opacity-60"
      >
        {previewEdges.map((edge, idx) => {
          const fromPos = positions[edge.from];
          const toPos = positions[edge.to];
          if (!fromPos || !toPos) return null;
          
          return (
            <line
              key={idx}
              x1={fromPos.x}
              y1={fromPos.y}
              x2={toPos.x}
              y2={toPos.y}
              stroke="#9ca3af"
              strokeWidth="0.5"
              opacity="0.4"
            />
          );
        })}
        
        {positions.map((pos, v) => (
          <circle
            key={v}
            cx={pos.x}
            cy={pos.y}
            r={n <= 8 ? 2 : 1.5}
            fill="#6b7280"
            opacity="0.7"
          />
        ))}
      </svg>
    </div>
  );
}

