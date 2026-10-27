export interface Edge {
  from: number;
  to: number;
  weight: number;
}
export type GraphLayout =
  | "path"
  | "grid"
  | "radial"
  | "layered"
  | "tree"
  | "circle";
export class Graph {
  private adj: Array<Array<Readonly<{ to: number; weight: number }>>>;
  constructor(
    private n: number,
    readonly layout: GraphLayout = "radial",
  ) {
    if (!Number.isSafeInteger(n) || n < 0)
      throw new RangeError("Vertex count must be a non-negative safe integer");
    this.adj = Array.from({ length: n }, () => []);
  }
  private validateVertex(vertex: number) {
    if (!Number.isInteger(vertex) || vertex < 0 || vertex >= this.n)
      throw new RangeError(`Vertex must be an integer in [0, ${this.n - 1}]`);
  }
  addEdge(from: number, to: number, weight: number): void {
    this.validateVertex(from);
    this.validateVertex(to);
    if (!Number.isFinite(weight) || weight < 0)
      throw new RangeError("Edge weights must be finite and non-negative");
    this.adj[from].push(Object.freeze({ to, weight }));
  }
  getNeighbors(
    vertex: number,
  ): ReadonlyArray<Readonly<{ to: number; weight: number }>> {
    this.validateVertex(vertex);
    return this.adj[vertex];
  }
  getEdges(): Edge[] {
    return this.adj.flatMap((neighbors, from) =>
      neighbors.map((edge) => ({ from, ...edge })),
    );
  }
  numVertices(): number {
    return this.n;
  }
  numEdges(): number {
    return this.adj.reduce((sum, edges) => sum + edges.length, 0);
  }
}

export function seededRandom(seed: number) {
  if (!Number.isSafeInteger(seed))
    throw new RangeError("Seed must be a safe integer");
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSimplePath(n: number): Graph {
  const graph = new Graph(n, "path");
  for (let v = 0; v < n - 1; v++) graph.addEdge(v, v + 1, 1);
  return graph;
}
export function createGridGraph(rows: number, cols: number): Graph {
  if (![rows, cols].every((v) => Number.isSafeInteger(v) && v > 0))
    throw new RangeError("Grid dimensions must be positive integers");
  const graph = new Graph(rows * cols, "grid");
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < cols; col++) {
      const v = row * cols + col;
      if (col + 1 < cols) graph.addEdge(v, v + 1, 1);
      if (row + 1 < rows) graph.addEdge(v, v + cols, 1);
    }
  return graph;
}
export function createStarGraph(n: number): Graph {
  const graph = new Graph(n, "radial");
  for (let v = 1; v < n; v++) graph.addEdge(0, v, 1);
  return graph;
}
export function createDiamondGraph(n: number): Graph {
  const graph = new Graph(n, "layered");
  if (n < 2) return graph;
  if (n === 2) {
    graph.addEdge(0, 1, 1);
    return graph;
  }
  const middle = Array.from({ length: n - 2 }, (_, i) => i + 1);
  const split = Math.ceil(middle.length / 2);
  const left = middle.slice(0, split);
  const right = middle.slice(split);
  for (const v of left) graph.addEdge(0, v, 1 + (v % 4));
  if (!right.length) for (const v of left) graph.addEdge(v, n - 1, 1);
  for (let i = 0; i < left.length; i++) {
    for (let offset = 0; offset < Math.min(2, right.length); offset++) {
      graph.addEdge(
        left[i],
        right[(i + offset) % right.length],
        1 + ((i + offset) % 3),
      );
    }
  }
  for (const v of right) graph.addEdge(v, n - 1, 1 + (v % 3));
  return graph;
}
/** Partial Fisher–Yates sampling: bounded work, no rejection loop near saturation. */
export function createRandomGraph(n: number, m: number, seed = 42): Graph {
  const graph = new Graph(n);
  const capacity = n * (n - 1);
  if (!Number.isSafeInteger(m) || m < 0 || m > capacity)
    throw new RangeError("Edge count must be an integer between 0 and n·(n−1)");
  const random = seededRandom(seed);
  const permutation = new Map<number, number>();
  const positions = new Map<number, number>();
  let remaining = capacity;
  const take = (position: number) => {
    const id = permutation.get(position) ?? position;
    const last = permutation.get(remaining - 1) ?? remaining - 1;
    permutation.set(position, last);
    positions.set(last, position);
    permutation.delete(remaining - 1);
    positions.delete(id);
    remaining--;
    const from = Math.floor(id / (n - 1));
    const offset = id % (n - 1);
    graph.addEdge(
      from,
      offset < from ? offset : offset + 1,
      1 + Math.floor(random() * 20),
    );
  };
  // A directed backbone makes every vertex reachable from 0 when m >= n−1.
  for (let from = 0; from < Math.min(n - 1, m); from++) {
    const id = from * (n - 1) + from;
    take(positions.get(id) ?? id);
  }
  while (capacity - remaining < m) take(Math.floor(random() * remaining));
  return graph;
}
export function createSparseGraph(n: number, m: number): Graph {
  return createRandomGraph(n, m, 123);
}
export function createDenseGraph(n: number, density = 0.7): Graph {
  if (!Number.isFinite(density) || density < 0 || density > 1)
    throw new RangeError("Density must be in [0, 1]");
  return createRandomGraph(n, Math.floor(n * (n - 1) * density), 456);
}
export function createCycleGraph(n: number): Graph {
  const graph = new Graph(n, "circle");
  for (let v = 0; v < n; v++) graph.addEdge(v, (v + 1) % n, 1);
  return graph;
}
export function createTreeGraph(n: number): Graph {
  const graph = new Graph(n, "tree");
  for (let v = 1; v < n; v++)
    graph.addEdge(Math.floor((v - 1) / 2), v, 1 + (v % 4));
  return graph;
}
export interface SampleGraph {
  name: string;
  description: string;
  create: () => Graph;
}
export const SAMPLE_GRAPHS: SampleGraph[] = [
  {
    name: "Layered diamond",
    description: "Competing routes across a weighted, directed network.",
    create: () => createDiamondGraph(14),
  },
  {
    name: "Grid · 5 × 5",
    description: "Equal-cost alternatives on a directed lattice.",
    create: () => createGridGraph(5, 5),
  },
  {
    name: "Sparse network",
    description: "A reproducible network with a directed backbone.",
    create: () => createSparseGraph(18, 30),
  },
  {
    name: "Branching tree",
    description: "A unique route to every descendant.",
    create: () => createTreeGraph(15),
  },
  {
    name: "Simple path",
    description: "One direction, one route, no competing paths.",
    create: () => createSimplePath(10),
  },
  {
    name: "Directed cycle",
    description: "A ring of unit-weight directed edges.",
    create: () => createCycleGraph(12),
  },
  {
    name: "Star network",
    description: "A single source with nine outgoing neighbors.",
    create: () => createStarGraph(10),
  },
  {
    name: "Dense network",
    description: "Many competing paths in a small directed graph.",
    create: () => createDenseGraph(10, 0.65),
  },
  {
    name: "Zero-weight ties",
    description: "Zero-weight cycles exercise the paper’s path ordering.",
    create: () => {
      const g = new Graph(8, "circle");
      [
        [0, 1, 0],
        [1, 2, 0],
        [2, 0, 0],
        [0, 3, 2],
        [2, 3, 2],
        [1, 4, 1],
        [4, 5, 0],
        [5, 4, 0],
        [5, 6, 1],
        [3, 7, 0],
        [6, 7, 0],
      ].forEach(([u, v, w]) => g.addEdge(u, v, w));
      return g;
    },
  },
  {
    name: "Disconnected graph",
    description: "Two components; unreachable distances remain infinite.",
    create: () => {
      const g = new Graph(10, "grid");
      for (let i = 0; i < 9; i++) if (i !== 4) g.addEdge(i, i + 1, 1);
      return g;
    },
  },
];
