/**
 * Algorithm implementations for single-source shortest paths
 */

import { Graph } from './graph';

export interface AlgorithmStep {
  iteration: number;
  currentVertex?: number;
  distances: Map<number, number>;
  visited: Set<number>;
  queue?: number[];
  frontier?: Set<number>;
  complete?: Set<number>;
  pivots?: Set<number>;
  description: string;
  decision?: string;
  actions?: string[];
  updatedVertices?: number[];
  parents?: Map<number, number | null>;
}

export interface AlgorithmResult {
  distances: Map<number, number>;
  parents: Map<number, number | null>;
  steps: AlgorithmStep[];
}

/**
 * Standard Dijkstra's algorithm with step tracking
 */
export function dijkstra(graph: Graph, source: number): AlgorithmResult {
  const n = graph.numVertices();
  if (source < 0 || source >= n) {
    throw new Error(`Source vertex must be in range [0, ${n - 1}]`);
  }

  const distances = new Map<number, number>();
  const parents = new Map<number, number | null>();
  const steps: AlgorithmStep[] = [];

  for (let i = 0; i < n; i++) {
    distances.set(i, Infinity);
    parents.set(i, null);
  }
  distances.set(source, 0);

  const pq: Array<[number, number]> = [[0, source]];
  const visited = new Set<number>();
  let iteration = 0;

  while (pq.length > 0) {
    iteration++;
    
    pq.sort((a, b) => a[0] - b[0]);
    const [currentDist, u] = pq.shift()!;

    if (visited.has(u)) {
      continue;
    }

    visited.add(u);

    const updatedVertices: number[] = [];
    const actions: string[] = [];

    for (const { to: v, weight } of graph.getNeighbors(u)) {
      const newDist = currentDist + weight;

      if (newDist < distances.get(v)!) {
        const oldDist = distances.get(v)!;
        distances.set(v, newDist);
        parents.set(v, u);
        updatedVertices.push(v);
        actions.push(`Updated vertex ${v}: ${oldDist === Infinity ? '∞' : oldDist.toFixed(2)} → ${newDist.toFixed(2)}`);
        
        if (!visited.has(v)) {
          pq.push([newDist, v]);
          actions.push(`Added vertex ${v} to priority queue`);
        }
      }
    }
    const decisionText = `Step ${iteration}: Process vertex ${u} (shortest distance: ${currentDist.toFixed(2)})`;
    const stepActions: string[] = [];
    
    if (actions.length > 0) {
      stepActions.push(`Explored edges from vertex ${u}:`);
      actions.forEach(action => {
        stepActions.push(`  • ${action}`);
      });
    } else {
      stepActions.push(`No shorter paths found from vertex ${u}`);
      stepActions.push(`  • All neighbors already have optimal distances`);
    }
    
    stepActions.push(`Vertex ${u} is now finalized - we know its shortest distance is ${currentDist.toFixed(2)}`);
    
    steps.push({
      iteration,
      currentVertex: u,
      distances: new Map(distances),
      visited: new Set(visited),
      queue: pq.map(([_, v]) => v),
      parents: new Map(parents),
      description: `Processing vertex ${u} with distance ${currentDist.toFixed(2)}`,
      decision: decisionText,
      actions: stepActions,
      updatedVertices,
    });
  }

  const reachableCount = Array.from(distances.values()).filter(d => d < Infinity).length;
  const finiteDistances = Array.from(distances.values()).filter(d => d < Infinity);
  const maxDistance = finiteDistances.length > 0 ? finiteDistances.reduce((max, d) => Math.max(max, d), 0) : 0;

  steps.push({
    iteration: iteration + 1,
    distances: new Map(distances),
    visited: new Set(visited),
    queue: [],
    parents: new Map(parents),
    description: `Algorithm Complete: All reachable vertices processed`,
    decision: `Algorithm Finished Successfully: Dijkstra's algorithm has completed. All ${reachableCount} reachable vertices from source ${source} have been processed and their shortest distances have been determined.${maxDistance > 0 ? ` Maximum distance found: ${maxDistance.toFixed(2)}.` : ''}`,
    actions: [
      `All reachable vertices have been processed`,
      `Shortest paths from source ${source} to all reachable vertices have been found`,
      `Total vertices processed: ${visited.size}`,
      `Reachable vertices: ${reachableCount}`,
      maxDistance > 0 ? `Maximum shortest distance: ${maxDistance.toFixed(2)}` : `Only source vertex is reachable`,
      `The algorithm is complete and the shortest path tree has been constructed`
    ],
  });

  return { distances, parents, steps };
}

/**
 * Breaking Dijkstra algorithm with step tracking
 * Based on: Breaking the Sorting Barrier for Directed Single-Source Shortest Paths
 */
export function breakingDijkstra(graph: Graph, source: number): AlgorithmResult {
  const n = graph.numVertices();
  if (source < 0 || source >= n) {
    throw new Error(`Source vertex must be in range [0, ${n - 1}]`);
  }

  const distances = new Map<number, number>();
  const parents = new Map<number, number | null>();
  const steps: AlgorithmStep[] = [];

  for (let i = 0; i < n; i++) {
    distances.set(i, Infinity);
    parents.set(i, null);
  }
  distances.set(source, 0);

  const logN = Math.log2(Math.max(n, 2));
  const k = Math.max(1, Math.floor(Math.pow(logN, 1 / 3)));

  const complete = new Set<number>([source]);
  let frontier = new Set<number>([source]);
  let iteration = 0;
  const maxIterations = n * 2;
  steps.push({
    iteration: 0,
    distances: new Map(distances),
    visited: new Set(),
      frontier: new Set(frontier),
      complete: new Set(complete),
      pivots: new Set(),
      parents: new Map(parents),
      description: `Starting from vertex ${source}`,
    decision: `Starting Point: We begin at vertex ${source} with distance 0. This is our source vertex.`,
    actions: [
      `Set distance to vertex ${source} = 0 (it's the starting point)`,
      `Add vertex ${source} to the frontier (vertices we'll explore from)`,
      `Mark vertex ${source} as complete (we know its shortest distance)`
    ],
  });

  while (iteration < maxIterations) {
    iteration++;

    const oldFrontier = new Set(frontier);
    const oldFrontierSize = oldFrontier.size;
    const newComplete = new Set<number>();
    let bellmanFordRound = 0;

    for (let bfRound = 0; bfRound < k; bfRound++) {
      bellmanFordRound = bfRound + 1;
      let updated = false;
      const roundUpdates: string[] = [];

      for (let u = 0; u < n; u++) {
        if (distances.get(u)! === Infinity) continue;

        for (const { to: v, weight } of graph.getNeighbors(u)) {
          const newDist = distances.get(u)! + weight;

          if (newDist < distances.get(v)!) {
            const oldDist = distances.get(v)!;
            distances.set(v, newDist);
            parents.set(v, u);
            updated = true;

            if (distances.get(v)! < Infinity && !complete.has(v)) {
              newComplete.add(v);
            }
            roundUpdates.push(`Updated vertex ${v}: ${oldDist === Infinity ? '∞' : oldDist.toFixed(2)} → ${newDist.toFixed(2)}`);
          }
        }
      }

      const actions: string[] = [];
      actions.push(`Bellman-Ford Round ${bellmanFordRound}/${k}:`);
      if (roundUpdates.length > 0) {
        actions.push(`   • Relaxed ${roundUpdates.length} edge${roundUpdates.length > 1 ? 's' : ''} with shorter paths`);
        const shownUpdates = roundUpdates.slice(0, 5);
        shownUpdates.forEach(update => {
          actions.push(`   • ${update}`);
        });
        if (roundUpdates.length > 5) {
          actions.push(`   • ... and ${roundUpdates.length - 5} more update${roundUpdates.length - 5 > 1 ? 's' : ''}`);
        }
      } else {
        actions.push(`   • No distance improvements found in this round`);
      }

      const decisionText = `Iteration ${iteration}, Round ${bellmanFordRound}/${k}: Running Bellman-Ford relaxation to find shorter paths through frontier vertices.`;

      steps.push({
        iteration: iteration + (bellmanFordRound - 1) / k,
        distances: new Map(distances),
        visited: new Set(),
        frontier: new Set(frontier),
        complete: new Set(complete),
        pivots: new Set(),
        parents: new Map(parents),
        description: `Iteration ${iteration}, Round ${bellmanFordRound}/${k}: Bellman-Ford relaxation`,
        decision: decisionText,
        actions,
      });

      if (!updated) break;
    }

    newComplete.forEach(v => complete.add(v));
    
    frontier = reduceFrontier(graph, distances, frontier, complete, k, n);
    const pivots = frontier.size < oldFrontierSize ? new Set(frontier) : new Set<number>();

    const actions: string[] = [];
    actions.push(`Frontier Reduction:`);
    if (newComplete.size > 0) {
      const completeList = Array.from(newComplete).slice(0, 5);
      const moreText = newComplete.size > 5 ? ` (+${newComplete.size - 5} more)` : '';
      actions.push(`   • After ${k} Bellman-Ford rounds, found shortest paths to ${newComplete.size} new vertex${newComplete.size > 1 ? 'ices' : ''}: [${completeList.join(', ')}${moreText}]`);
      actions.push(`   • These vertices are now "complete" - we know their final shortest distance`);
    } else {
      actions.push(`   • After ${k} Bellman-Ford rounds, no new vertices reached their final shortest distance`);
    }
    
    if (frontier.size < oldFrontierSize) {
      actions.push(`   • Reduced frontier from ${oldFrontierSize} to ${frontier.size} vertices`);
      actions.push(`   • Why? To avoid sorting bottleneck - smaller frontier = faster processing`);
      if (pivots.size > 0) {
        const pivotList = Array.from(pivots).slice(0, 5);
        const morePivots = pivots.size > 5 ? ` (+${pivots.size - 5} more)` : '';
        actions.push(`   • Selected ${pivots.size} "pivot" vertices with large reachable trees: [${pivotList.join(', ')}${morePivots}]`);
        actions.push(`   • Pivots are vertices that can reach many others - focusing on them is efficient`);
      }
    } else {
      actions.push(`   • Frontier size unchanged: ${frontier.size} vertices`);
      actions.push(`   • No good pivots found, keeping current frontier for next iteration`);
    }
    
    const decisionText = `Iteration ${iteration} Complete: After ${k} Bellman-Ford rounds, found shortest paths to ${newComplete.size} vertices. ` +
      `Frontier ${frontier.size < oldFrontierSize ? `reduced from ${oldFrontierSize} to ${frontier.size}` : `stayed at ${frontier.size}`}. ` +
      `Total: ${complete.size}/${n} vertices complete.`;

    steps.push({
      iteration: iteration + 0.99,
      distances: new Map(distances),
      visited: new Set(),
      frontier: new Set(frontier),
      complete: new Set(complete),
      pivots,
      parents: new Map(parents),
      description: `Iteration ${iteration} Complete: ${complete.size} vertices complete, ${frontier.size} in frontier`,
      decision: decisionText,
      actions,
    });

    const incomplete = Array.from({ length: n }, (_, i) => i)
      .filter(v => !complete.has(v) && distances.get(v)! < Infinity);

    if (frontier.size === 0) {
      if (incomplete.length > 0) {
        let minDist = Infinity;
        let minVertex: number | null = null;
        
        for (const v of incomplete) {
          const dist = distances.get(v)!;
          if (dist < minDist) {
            minDist = dist;
            minVertex = v;
          }
        }
        
        if (minVertex !== null) {
          frontier.add(minVertex);
          complete.add(minVertex);
          
          steps.push({
            iteration: iteration + 0.5,
            distances: new Map(distances),
            visited: new Set(),
            frontier: new Set(frontier),
            complete: new Set(complete),
            pivots: new Set(),
            parents: new Map(parents),
            description: `Frontier was empty, adding closest incomplete vertex ${minVertex}`,
            decision: `Frontier Empty: No vertices left to explore from. Adding vertex ${minVertex} (closest incomplete vertex with distance ${minDist.toFixed(2)}) to restart exploration.`,
            actions: [
              `Found closest incomplete vertex: ${minVertex} with distance ${minDist.toFixed(2)}`,
              `Added vertex ${minVertex} to frontier to continue algorithm`
            ],
          });
        } else {
          break;
        }
      } else {
        break;
      }
    } else if (incomplete.length === 0) {
      break;
    }
  }

  const reachableCount = Array.from(distances.values()).filter(d => d < Infinity).length;
  const finiteDistances = Array.from(distances.values()).filter(d => d < Infinity);
  const maxDistance = finiteDistances.length > 0 ? finiteDistances.reduce((max, d) => Math.max(max, d), 0) : 0;

  steps.push({
    iteration: iteration + 1,
    distances: new Map(distances),
    visited: new Set(),
    frontier: new Set(),
    complete: new Set(complete),
    pivots: new Set(),
    parents: new Map(parents),
    description: `Algorithm Complete: All reachable vertices processed`,
    decision: `Algorithm Finished Successfully: Breaking Dijkstra algorithm has completed. All ${reachableCount} reachable vertices from source ${source} have been processed and their shortest distances have been determined.${maxDistance > 0 ? ` Maximum distance found: ${maxDistance.toFixed(2)}.` : ''}`,
    actions: [
      `All reachable vertices have been processed`,
      `Shortest paths from source ${source} to all reachable vertices have been found`,
      `Total vertices complete: ${complete.size}`,
      `Reachable vertices: ${reachableCount}`,
      maxDistance > 0 ? `Maximum shortest distance: ${maxDistance.toFixed(2)}` : `Only source vertex is reachable`,
      `The algorithm is complete and the shortest path tree has been constructed`
    ],
  });

  return { distances, parents, steps };
}


function reduceFrontier(
  graph: Graph,
  distances: Map<number, number>,
  frontier: Set<number>,
  complete: Set<number>,
  k: number,
  n: number
): Set<number> {
  if (frontier.size <= 1) {
    return new Set(frontier);
  }

  const treeSizes = new Map<number, number>();

  for (const pivot of frontier) {
    const treeSize = computeTreeSize(graph, distances, pivot, complete);
    treeSizes.set(pivot, treeSize);
  }

  const pivots = new Set<number>();
  for (const v of frontier) {
    if (treeSizes.get(v)! >= k) {
      pivots.add(v);
    }
  }

  if (pivots.size > 0) {
    return pivots;
  }
  const sorted = Array.from(frontier).sort(
    (a, b) => treeSizes.get(b)! - treeSizes.get(a)!
  );
  const numToKeep = Math.max(1, Math.floor(frontier.size / k));
  return new Set(sorted.slice(0, numToKeep));
}

function computeTreeSize(
  graph: Graph,
  distances: Map<number, number>,
  root: number,
  complete: Set<number>
): number {
  if (!complete.has(root)) return 0;

  const visited = new Set<number>([root]);
  const queue = [root];

  while (queue.length > 0) {
    const u = queue.shift()!;

    for (const { to: v, weight } of graph.getNeighbors(u)) {
      if (!visited.has(v) && distances.get(v)! < Infinity) {
        if (distances.get(v)! >= distances.get(u)! + weight - 1e-9) {
          visited.add(v);
          queue.push(v);
        }
      }
    }
  }

  return visited.size;
}

/**
 * Reconstruct path from source to target
 */
export function reconstructPath(
  parents: Map<number, number | null>,
  target: number
): number[] {
  const path: number[] = [];
  let current: number | null = target;
  const visited = new Set<number>();

  while (current !== null && current !== undefined && !visited.has(current)) {
    visited.add(current);
    path.push(current);
    const parent = parents.get(current);
    if (parent === null || parent === undefined) {
      break;
    }
    current = parent;
  }

  path.reverse();
  return path;
}


