'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Graph } from '@/lib/graph';
import { AlgorithmResult, AlgorithmStep, reconstructPath } from '@/lib/algorithms';
import GraphVisualization from './GraphVisualization';

interface AlgorithmViewerProps {
  graph: Graph;
  algorithmFunc: (graph: Graph, source: number) => AlgorithmResult;
  source: number;
  target: number;
  algorithmName: string;
  width?: number;
  height?: number;
}

export default function AlgorithmViewer({
  graph,
  algorithmFunc,
  source,
  target,
  algorithmName,
  width = 800,
  height = 650,
}: AlgorithmViewerProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1000);
  const [result, setResult] = useState<AlgorithmResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const executionLogRef = useRef<HTMLDivElement>(null);

  const runAlgorithm = () => {
    try {
      if (source < 0 || source >= graph.numVertices()) {
        throw new Error(`Source vertex ${source} is out of range [0, ${graph.numVertices() - 1}]`);
      }
      if (target < 0 || target >= graph.numVertices()) {
        throw new Error(`Target vertex ${target} is out of range [0, ${graph.numVertices() - 1}]`);
      }
      const algorithmResult = algorithmFunc(graph, source);
      if (algorithmResult.steps.length === 0) {
        throw new Error('Algorithm produced no steps');
      }
      setResult(algorithmResult);
      setCurrentStepIndex(0);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error(`Error running ${algorithmName}:`, error);
      alert(`Error: ${errorMessage}\n\nPlease check your configuration and try again.`);
    }
  };

  const steps = result?.steps || [];
  const initialParents = new Map<number, number | null>();
  for (let i = 0; i < graph.numVertices(); i++) {
    initialParents.set(i, null);
  }
  const currentStep = steps[currentStepIndex] || steps[steps.length - 1] || {
    iteration: 0,
    distances: new Map(Array.from({ length: graph.numVertices() }, (_, i) => [i, i === source ? 0 : Infinity])),
    visited: new Set([source]),
    parents: initialParents,
    description: 'Click Play to run the algorithm',
  };
  
  const highlightPath = useMemo(() => {
    if (!result) {
      return [];
    }
    
    const parentsToUse = currentStep.parents;
    
    if (!parentsToUse) {
      return [];
    }
    
    const targetDistance = currentStep.distances.get(target);
    if (targetDistance === undefined || targetDistance === Infinity) {
      return [];
    }
    
    const path = reconstructPath(parentsToUse, target);
    
    if (path.length > 0) {
      if (path[0] === source) {
        return path;
      }
      
      let current = path[0];
      const extendedPath = [...path];
      const visited = new Set(path);
      let attempts = 0;
      const maxAttempts = 100;
      
      while (current !== source && current !== null && current !== undefined && attempts < maxAttempts) {
        attempts++;
        const parent = parentsToUse.get(current);
        if (parent === null || parent === undefined) {
          break;
        }
        if (visited.has(parent)) {
          break;
        }
        visited.add(parent);
        extendedPath.unshift(parent);
        current = parent;
      }
      
      if (extendedPath.length > 0 && extendedPath[0] === source) {
        return extendedPath;
      }
      
      const isFinalStep = currentStepIndex >= steps.length - 1;
      if (!isFinalStep && extendedPath.length > 1) {
        const sourceIndex = extendedPath.indexOf(source);
        if (sourceIndex >= 0) {
          return extendedPath.slice(sourceIndex);
        }
      }
      
      if (isFinalStep && result.parents) {
        const finalPath = reconstructPath(result.parents, target);
        if (finalPath.length > 0 && finalPath[0] === source) {
          return finalPath;
        }
      }
    }
    
    return [];
  }, [result, currentStep, currentStepIndex, steps.length, target, source]);
  useEffect(() => {
    setResult(null);
    setCurrentStepIndex(0);
    setIsPlaying(false);
  }, [graph, source]);

  useEffect(() => {
    if (isPlaying && result && currentStepIndex < steps.length - 1) {
      const timer = setTimeout(() => {
        setCurrentStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
      }, playSpeed);
      return () => clearTimeout(timer);
    } else if (isPlaying && result && currentStepIndex >= steps.length - 1) {
      setIsPlaying(false);
    }
  }, [isPlaying, currentStepIndex, steps.length, playSpeed, result]);

  const handlePrevious = () => {
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
    setIsPlaying(false);
  };

  const handleNext = () => {
    setCurrentStepIndex((prev) => Math.min(steps.length - 1, prev + 1));
    setIsPlaying(false);
  };

  const handlePlayPause = () => {
    if (!result) {
      runAlgorithm();
      setIsPlaying(true);
      return;
    }
    
    if (currentStepIndex >= steps.length - 1) {
      setCurrentStepIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setCurrentStepIndex(0);
    setIsPlaying(false);
  };

  const handleScrollToLog = () => {
    executionLogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const totalSteps = result ? steps.length : 0;
  const finiteDistances = result ? Array.from(result.distances.values()).filter(d => d < Infinity) : [];
  const reachableVertices = finiteDistances.length;
  const maxDistance = finiteDistances.length > 0 ? Math.max(...finiteDistances) : 0;

  return (
    <div className="flex flex-col gap-2 p-2 bg-white">
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-gray-200">
          <h3 className="text-base font-bold text-gray-900">{algorithmName}</h3>
          {result ? (
            <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
              Step {currentStepIndex + 1} / {steps.length}
            </div>
          ) : (
            <div className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-semibold">
              Not Started
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={handleReset}
              disabled={!result}
              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed cursor-pointer text-gray-700 rounded text-xs font-medium transition-colors border border-gray-300 hover:border-gray-400 disabled:border-gray-200"
              title="Reset to first step"
            >
              ↺ Reset
            </button>
            <button
              onClick={handlePrevious}
              disabled={!result || currentStepIndex === 0}
              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 disabled:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400 cursor-pointer text-blue-700 rounded text-xs font-medium transition-colors border border-blue-200 hover:border-blue-300 disabled:border-gray-200"
              title="Previous step"
            >
              ← Previous
            </button>
            <button
              onClick={handlePlayPause}
              className="px-2.5 py-1 bg-green-50 hover:bg-green-100 text-green-700 rounded text-xs font-medium transition-colors border border-green-200 hover:border-green-300 cursor-pointer flex items-center gap-1"
              title={isPlaying ? 'Pause animation' : result ? 'Play animation' : 'Run algorithm'}
            >
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>
            <button
              onClick={handleNext}
              disabled={!result || currentStepIndex >= steps.length - 1}
              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 disabled:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400 cursor-pointer text-blue-700 rounded text-xs font-medium transition-colors border border-blue-200 hover:border-blue-300 disabled:border-gray-200"
              title="Next step"
            >
              Next →
            </button>
          </div>
          
          {result && steps.length > 0 && (
            <button
              onClick={handleScrollToLog}
              className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded text-xs font-medium transition-colors border border-purple-200 hover:border-purple-300 cursor-pointer animate-pulse"
              title="Scroll to execution log"
            >
              Read More
            </button>
          )}
        </div>
      </div>

      <div className="flex justify-center bg-white p-1 min-h-[500px] items-center overflow-visible">
        <div className="w-full flex justify-center overflow-visible">
          <GraphVisualization
            graph={graph}
            step={currentStep}
            source={source}
            highlightPath={result ? highlightPath : []}
            width={width}
            height={height}
          />
        </div>
      </div>

      {result && highlightPath.length > 0 && (
        <div className="text-xs text-gray-700 bg-green-50 border-l-2 border-green-500 p-2 rounded-r">
          <div className="font-semibold text-green-900 mb-0.5">Path to {target}:</div>
          <div className="font-mono text-xs mb-0.5">{highlightPath.join(' → ')}</div>
          <div className="text-gray-600 text-xs">
            Distance: <strong>{currentStep.distances.get(target)?.toFixed(2) ?? '∞'}</strong>
          </div>
        </div>
      )}

      {result && steps.length > 0 && (
        <div ref={executionLogRef} className="mt-2 border-t border-gray-200 pt-2">
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-bold text-gray-900">Algorithm Execution Log</h4>
              <div className="flex items-center gap-2">
                <p className="text-xs text-gray-500">Step {currentStepIndex + 1} of {steps.length}</p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="p-1.5 hover:bg-gray-100 rounded cursor-pointer transition-colors text-gray-600 hover:text-gray-900"
                  title="Expand execution log"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                  </svg>
                </button>
              </div>
            </div>
            {(algorithmName.includes('Breaking') || algorithmName.includes('Tsinghua')) && (
              <p className="text-xs text-gray-600 mb-2 bg-blue-50 p-1.5 rounded border-l-2 border-blue-400">
                <strong>How the Tsinghua algorithm works:</strong> It avoids fully sorting the frontier. Each recursion level
                runs k bounded relaxation rounds (FindPivots) to shrink the frontier down to a few &quot;pivots&quot;, then recursively
                settles vertices in distance-ordered <em>blocks</em> — partial sorting instead of a full priority-queue sort.
                That is what breaks Dijkstra&apos;s O(m + n log n) sorting barrier, reaching O(m log<sup>2/3</sup> n).
              </p>
            )}
            {algorithmName.includes("Dijkstra's") && !algorithmName.includes('Breaking') && !algorithmName.includes('Tsinghua') && (
              <p className="text-xs text-gray-600 mb-2 bg-green-50 p-1.5 rounded border-l-2 border-green-400">
                <strong>How Dijkstra&apos;s Works:</strong> At each step, we pick the unvisited vertex with the smallest known distance, 
                then update distances to its neighbors. This guarantees we find the shortest path by always processing vertices in order of increasing distance.
              </p>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto border border-gray-200 rounded bg-white">
            <div className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
              <div className="flex items-start gap-2 p-2">
                <div className="shrink-0 w-12 text-center">
                  <div className="text-xs font-semibold text-gray-700">Iteration</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-700">Description</div>
                </div>
              </div>
            </div>
            
            <div className="divide-y divide-gray-100">
              {steps.map((step, idx) => (
                <div
                  key={idx}
                  className={idx === currentStepIndex 
                    ? 'bg-blue-50 border-l-4 border-blue-500 p-2' 
                    : 'bg-white hover:bg-gray-50 p-2 transition-colors'}
                >
                  <div className="flex items-start gap-2">
                    <div className="shrink-0 w-12 text-center">
                      <div className={`text-xs font-bold ${idx === currentStepIndex ? 'text-blue-700' : 'text-gray-500'}`}>
                        {step.iteration % 1 === 0 || step.iteration % 1 > 0.9
                          ? Math.floor(step.iteration)
                          : `${Math.floor(step.iteration)}.${Math.round((step.iteration % 1) * 10)}`}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-semibold mb-1 ${idx === currentStepIndex ? 'text-blue-900' : 'text-gray-900'}`}>
                        {step.decision || step.description}
                      </div>
                      {step.actions && step.actions.length > 0 && (
                        <div className="text-xs text-gray-700 space-y-0.5 ml-2">
                          {step.actions.map((action, aidx) => {
                            const isPhaseHeader = action.startsWith('Phase 1') || action.startsWith('Phase 2');
                            const isSubAction = action.startsWith('   •') || action.startsWith('  •');
                            return (
                              <div 
                                key={aidx} 
                                className={isPhaseHeader 
                                  ? 'font-semibold text-gray-900 mt-1' 
                                  : isSubAction 
                                    ? 'text-gray-600 ml-2' 
                                    : 'text-gray-700'}
                              >
                                {action}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isModalOpen && result && steps.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-lg shadow-xl w-[90vw] h-[90vh] max-w-5xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Algorithm Execution Log - {algorithmName}</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded cursor-pointer transition-colors text-gray-600 hover:text-gray-900"
                title="Close modal"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-4">
                {(algorithmName.includes('Breaking') || algorithmName.includes('Tsinghua')) && (
                  <p className="text-sm text-gray-600 mb-3 bg-blue-50 p-2 rounded border-l-2 border-blue-400">
                    <strong>How the Tsinghua algorithm works:</strong> It avoids fully sorting the frontier. Each recursion level
                    runs k bounded relaxation rounds (FindPivots) to shrink the frontier down to a few &quot;pivots&quot;, then recursively
                    settles vertices in distance-ordered <em>blocks</em> — partial sorting instead of a full priority-queue sort.
                    That is what breaks Dijkstra&apos;s O(m + n log n) sorting barrier, reaching O(m log<sup>2/3</sup> n).
                  </p>
                )}
                {algorithmName.includes("Dijkstra's") && !algorithmName.includes('Breaking') && !algorithmName.includes('Tsinghua') && (
                  <p className="text-sm text-gray-600 mb-3 bg-green-50 p-2 rounded border-l-2 border-green-400">
                    <strong>How Dijkstra&apos;s Works:</strong> At each step, we pick the unvisited vertex with the smallest known distance, 
                    then update distances to its neighbors. This guarantees we find the shortest path by always processing vertices in order of increasing distance.
                  </p>
                )}
              </div>
              
              <div className="border border-gray-200 rounded bg-white">
                <div className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
                  <div className="flex items-start gap-4 p-3">
                    <div className="shrink-0 w-20 text-center">
                      <div className="text-sm font-semibold text-gray-700">Iteration</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-700">Description</div>
                    </div>
                  </div>
                </div>
                
                <div className="divide-y divide-gray-100">
                  {steps.map((step, idx) => (
                    <div
                      key={idx}
                      className={idx === currentStepIndex 
                        ? 'bg-blue-50 border-l-4 border-blue-500 p-3' 
                        : 'bg-white hover:bg-gray-50 p-3 transition-colors'}
                    >
                      <div className="flex items-start gap-4">
                        <div className="shrink-0 w-20 text-center">
                          <div className={`text-sm font-bold ${idx === currentStepIndex ? 'text-blue-700' : 'text-gray-500'}`}>
                            {step.iteration % 1 === 0 || step.iteration % 1 > 0.9
                              ? Math.floor(step.iteration)
                              : `${Math.floor(step.iteration)}.${Math.round((step.iteration % 1) * 10)}`}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-semibold mb-2 ${idx === currentStepIndex ? 'text-blue-900' : 'text-gray-900'}`}>
                            {step.decision || step.description}
                          </div>
                          {step.actions && step.actions.length > 0 && (
                            <div className="text-sm text-gray-700 space-y-1 ml-2">
                              {step.actions.map((action, aidx) => {
                                const isPhaseHeader = action.startsWith('Phase 1') || action.startsWith('Phase 2');
                                const isSubAction = action.startsWith('   •') || action.startsWith('  •');
                                return (
                                  <div 
                                    key={aidx} 
                                    className={isPhaseHeader 
                                      ? 'font-semibold text-gray-900 mt-2' 
                                      : isSubAction 
                                        ? 'text-gray-600 ml-3' 
                                        : 'text-gray-700'}
                                  >
                                    {action}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



