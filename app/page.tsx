'use client';

import { useState, useMemo } from 'react';
import { Graph } from '@/lib/graph';
import { dijkstra, breakingDijkstra } from '@/lib/algorithms';
import { SAMPLE_GRAPHS } from '@/lib/graph';
import AlgorithmViewer from '@/components/AlgorithmViewer';
import GraphPreview from '@/components/GraphPreview';

export default function Home() {
  const [selectedGraphIndex, setSelectedGraphIndex] = useState(0);
  const [source, setSource] = useState(0);
  const [target, setTarget] = useState<number>(5);

  const currentGraph = useMemo(() => {
    return SAMPLE_GRAPHS[selectedGraphIndex].create();
  }, [selectedGraphIndex]);

  const handleGraphChange = (index: number) => {
    setSelectedGraphIndex(index);
    const newGraph = SAMPLE_GRAPHS[index].create();
    setSource(0);
    setTarget(Math.min(5, newGraph.numVertices() - 1));
  };

  const maxVertex = currentGraph.numVertices() - 1;

  return (
    <main className="min-h-screen bg-white">
      <div className="w-full px-2 sm:px-4 py-2">
        <div className="bg-white rounded-lg mb-3 px-4 py-3 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex-shrink-0">
              <h1 className="text-lg font-bold text-gray-900">
                Breaking Dijkstra&apos;s Algorithm
              </h1>
              <p className="text-xs text-gray-600 mt-0.5">
                <span className="font-mono">O(m + n log n)</span> → <span className="font-mono">O(m log<sup>2/3</sup> n)</span>
              </p>
            </div>
            
            <div className="flex flex-wrap items-end gap-3 sm:gap-4 flex-1 sm:justify-end">
              <div className="flex-shrink-0 flex items-end pb-0.5">
                <GraphPreview graph={currentGraph} width={60} height={40} />
              </div>
              
              <div className="flex-shrink-0">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Graph <span className="text-gray-500 font-normal">({currentGraph.numVertices()}v • {currentGraph.numEdges()}e)</span>
                </label>
                <select
                  value={selectedGraphIndex}
                  onChange={(e) => handleGraphChange(Number(e.target.value))}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white cursor-pointer"
                >
                  {SAMPLE_GRAPHS.map((graph, idx) => (
                    <option key={idx} value={idx}>
                      {graph.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-shrink-0">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Source
                </label>
                <input
                  type="number"
                  min="0"
                  max={maxVertex}
                  value={source}
                  onChange={(e) => {
                    const val = Math.max(0, Math.min(maxVertex, Number(e.target.value)));
                    setSource(val);
                    if (target === val && maxVertex > 0) {
                      setTarget(val === maxVertex ? 0 : val + 1);
                    }
                  }}
                  className="w-20 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                />
              </div>

              <div className="flex-shrink-0">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Target <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max={maxVertex}
                  value={target}
                  onChange={(e) => {
                    const val = Math.max(0, Math.min(maxVertex, Number(e.target.value)));
                    if (val !== source) {
                      setTarget(val);
                    }
                  }}
                  required
                  className="w-20 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="w-full">
          <div className="bg-white px-3 py-2 border-b border-gray-200">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className="font-semibold text-gray-700">Legend:</span>
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-green-500 border border-green-600"></div><span className="text-gray-700">Source</span></div>
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-amber-600"></div><span className="text-gray-700">Settling</span></div>
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-purple-500 border border-purple-600"></div><span className="text-gray-700">Pivot / block</span></div>
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-yellow-300 border border-yellow-500"></div><span className="text-gray-700">Frontier</span></div>
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-green-200 border border-green-400"></div><span className="text-gray-700">Complete / visited</span></div>
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-blue-300 border border-blue-400"></div><span className="text-gray-700">Queue (Dijkstra)</span></div>
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-orange-400 border border-orange-600"></div><span className="text-gray-700">Path</span></div>
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-amber-100 border border-amber-300"></div><span className="text-gray-700">Discovered</span></div>
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-gray-300 border border-gray-400"></div><span className="text-gray-700">Undiscovered</span></div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <AlgorithmViewer
              graph={currentGraph}
              algorithmFunc={dijkstra}
              source={source}
              target={target}
              algorithmName="Dijkstra's Algorithm"
            />
            <AlgorithmViewer
              graph={currentGraph}
              algorithmFunc={breakingDijkstra}
              source={source}
              target={target}
              algorithmName="Tsinghua's Algorithm"
            />
          </div>
        </div>
      </div>
    </main>
  );
}
