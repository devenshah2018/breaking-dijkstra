/**
 * Graph data structures and utilities
 */

export interface Edge {
  from: number;
  to: number;
  weight: number;
}

export class Graph {
  private n: number;
  private adj: Map<number, Array<{ to: number; weight: number }>>;

  constructor(n: number) {
    this.n = n;
    this.adj = new Map();
    for (let i = 0; i < n; i++) {
      this.adj.set(i, []);
    }
  }

  addEdge(from: number, to: number, weight: number): void {
    if (weight < 0) throw new Error("Edge weights must be non-negative");
    if (from < 0 || from >= this.n || to < 0 || to >= this.n) {
      throw new Error(`Vertices must be in range [0, ${this.n - 1}]`);
    }
    this.adj.get(from)!.push({ to, weight });
  }

  getNeighbors(vertex: number): Array<{ to: number; weight: number }> {
    return this.adj.get(vertex) || [];
  }

  getEdges(): Edge[] {
    const edges: Edge[] = [];
    for (const [from, neighbors] of this.adj.entries()) {
      for (const { to, weight } of neighbors) {
        edges.push({ from, to, weight });
      }
    }
    return edges;
  }

  numVertices(): number {
    return this.n;
  }

  numEdges(): number {
    let count = 0;
    for (const neighbors of this.adj.values()) {
      count += neighbors.length;
    }
    return count;
  }
}

export function createSimplePath(n: number): Graph {
  const graph = new Graph(n);
  for (let i = 0; i < n - 1; i++) {
    graph.addEdge(i, i + 1, 1.0);
  }
  return graph;
}

export function createGridGraph(rows: number, cols: number): Graph {
  const n = rows * cols;
  const graph = new Graph(n);
  
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const node = i * cols + j;
      
      if (j < cols - 1) {
        graph.addEdge(node, node + 1, 1.0);
      }
      
      if (i < rows - 1) {
        graph.addEdge(node, node + cols, 1.0);
      }
    }
  }
  
  return graph;
}

export function createStarGraph(n: number): Graph {
  const graph = new Graph(n);
  const center = 0;
  
  for (let i = 1; i < n; i++) {
    graph.addEdge(center, i, 1.0);
  }
  
  return graph;
}

export function createDiamondGraph(n: number): Graph {
  const graph = new Graph(n);
  const source = 0;
  const sink = n - 1;
  
  const layers = 3;
  const verticesPerLayer = Math.floor(n / layers);
  
  for (let i = 1; i < Math.min(verticesPerLayer + 1, n - 1); i++) {
    graph.addEdge(source, i, 1.0);
  }
  
  for (let layer = 1; layer < layers - 1; layer++) {
    const start = layer * verticesPerLayer;
    const end = Math.min((layer + 1) * verticesPerLayer, n - 1);
    const prevStart = (layer - 1) * verticesPerLayer;
    const prevEnd = Math.min(layer * verticesPerLayer, n - 1);
    
    for (let u = prevStart; u < prevEnd; u++) {
      for (let v = start; v < end; v++) {
        if (u < n && v < n) {
          graph.addEdge(u, v, 1.0);
        }
      }
    }
  }
  
  const lastLayerStart = (layers - 2) * verticesPerLayer;
  for (let u = lastLayerStart; u < sink; u++) {
    if (u < n) {
      graph.addEdge(u, sink, 1.0);
    }
  }
  
  return graph;
}

export function createRandomGraph(n: number, m: number, seed?: number): Graph {
  const graph = new Graph(n);
  
  let rng = seed !== undefined ? seed : Math.random() * 1000;
  const random = () => {
    rng = (rng * 9301 + 49297) % 233280;
    return rng / 233280;
  };
  
  const edgeSet = new Set<string>();
  let edgesAdded = 0;
  
  for (let i = 0; i < Math.min(n - 1, m); i++) {
    const u = i;
    const v = (i + 1) % n;
    const key = `${u},${v}`;
    if (!edgeSet.has(key) && u !== v) {
      const weight = 0.5 + random() * 2.0;
      graph.addEdge(u, v, weight);
      edgeSet.add(key);
      edgesAdded++;
    }
  }
  
  while (edgesAdded < m) {
    const u = Math.floor(random() * n);
    const v = Math.floor(random() * n);
    const key = `${u},${v}`;
    if (u !== v && !edgeSet.has(key)) {
      const weight = 0.5 + random() * 2.0;
      graph.addEdge(u, v, weight);
      edgeSet.add(key);
      edgesAdded++;
    }
  }
  
  return graph;
}

export interface SampleGraph {
  name: string;
  description: string;
  create: () => Graph;
}

export function createSparseGraph(n: number, m: number): Graph {
  const graph = new Graph(n);
  const edgeSet = new Set<string>();
  let edgesAdded = 0;
  
  let rng = 123;
  const random = () => {
    rng = (rng * 9301 + 49297) % 233280;
    return rng / 233280;
  };
  
  for (let i = 0; i < n - 1 && edgesAdded < m; i++) {
    const key = `${i},${i + 1}`;
    if (!edgeSet.has(key)) {
      graph.addEdge(i, i + 1, 0.5 + random() * 1.5);
      edgeSet.add(key);
      edgesAdded++;
    }
  }
  
  while (edgesAdded < m) {
    const u = Math.floor(random() * n);
    const v = Math.floor(random() * n);
    const key = `${u},${v}`;
    if (u !== v && !edgeSet.has(key)) {
      graph.addEdge(u, v, 0.5 + random() * 1.5);
      edgeSet.add(key);
      edgesAdded++;
    }
  }
  
  return graph;
}

export function createDenseGraph(n: number, density: number = 0.7): Graph {
  const graph = new Graph(n);
  const maxEdges = n * (n - 1);
  const targetEdges = Math.floor(maxEdges * density);
  
  let rng = 456;
  const random = () => {
    rng = (rng * 9301 + 49297) % 233280;
    return rng / 233280;
  };
  
  const edgeSet = new Set<string>();
  let edgesAdded = 0;
  
  while (edgesAdded < targetEdges) {
    const u = Math.floor(random() * n);
    const v = Math.floor(random() * n);
    const key = `${u},${v}`;
    if (u !== v && !edgeSet.has(key)) {
      graph.addEdge(u, v, 0.5 + random() * 1.5);
      edgeSet.add(key);
      edgesAdded++;
    }
  }
  
  return graph;
}

export function createCycleGraph(n: number): Graph {
  const graph = new Graph(n);
  for (let i = 0; i < n; i++) {
    graph.addEdge(i, (i + 1) % n, 1.0);
  }
  return graph;
}

export function createTreeGraph(n: number): Graph {
  const graph = new Graph(n);
  let rng = 789;
  const random = () => {
    rng = (rng * 9301 + 49297) % 233280;
    return rng / 233280;
  };
  
  for (let i = 1; i < n; i++) {
    const parent = Math.floor(random() * i);
    graph.addEdge(parent, i, 0.5 + random() * 1.5);
  }
  
  return graph;
}

export const SAMPLE_GRAPHS: SampleGraph[] = [
  {
    name: "Simple Path",
    description: "A simple path: 0 → 1 → 2 → ... → n-1",
    create: () => createSimplePath(10),
  },
  {
    name: "Cycle",
    description: "A cycle graph (circular)",
    create: () => createCycleGraph(12),
  },
  {
    name: "Tree (Sparse)",
    description: "A tree structure - very sparse",
    create: () => createTreeGraph(15),
  },
  {
    name: "Sparse Graph",
    description: "Sparse graph with few edges",
    create: () => createSparseGraph(20, 25),
  },
  {
    name: "Grid 5x5",
    description: "A 5x5 grid graph",
    create: () => createGridGraph(5, 5),
  },
  {
    name: "Star Graph",
    description: "Star graph with center connecting to all others",
    create: () => createStarGraph(10),
  },
  {
    name: "Diamond",
    description: "Diamond-shaped graph with multiple paths",
    create: () => createDiamondGraph(20),
  },
  {
    name: "Medium Density",
    description: "Medium density graph",
    create: () => createRandomGraph(15, 45, 42),
  },
  {
    name: "Dense Graph",
    description: "Dense graph with many edges",
    create: () => createDenseGraph(12, 0.6),
  },
  {
    name: "Very Dense",
    description: "Very dense graph (high connectivity)",
    create: () => createDenseGraph(10, 0.8),
  },
];


