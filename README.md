# Breaking Dijkstra's Algorithm Visualization Tool

This application provides an educational tool to understand and compare two shortest path algorithms:

- **Dijkstra's Algorithm**: The classic O(m + n log n) algorithm using a priority queue
- **Breaking Dijkstra Algorithm**: A new O(m log^{2/3} n) algorithm that breaks the sorting barrier

Based on the paper: [Breaking the Sorting Barrier for Directed Single-Source Shortest Paths](https://arxiv.org/pdf/2504.17033)

## Dijkstra's Algorithm

Dijkstra's algorithm is a fundamental graph algorithm for finding shortest paths from a source vertex to all other vertices in a weighted graph.

1. **Initialization**: Set distance to source vertex as 0, all others as infinity
2. **Priority Queue**: Maintain a priority queue of vertices ordered by their current shortest distance
3. **Greedy Selection**: At each step, extract the vertex with minimum distance from the queue
4. **Relaxation**: For each neighbor of the selected vertex, update distances if a shorter path is found
5. **Completion**: Mark vertices as visited once their shortest distance is finalized

### Pseudocode

```
DIJKSTRA(G, w, s)
─────────────────────────────
1: INITIALIZE – SINGLE – SOURCE(G,s)
2: S = Ø
3: Q = G.V                    //Insert all vertices into queue
4: while Q ≠ Ø do
5:     u = EXTRACT – MIN(Q)
6:     S = S ∪ {u}            //add u to S
7:     for each vertex v ∈ G.Adj[u] do
8:         RELAX (u, v, w)
9:     end for
10: end while
```

## Breaking Dijkstra Algorithm

The Breaking Dijkstra algorithm is a breakthrough algorithm that achieves better time complexity than Dijkstra's on sparse graphs by avoiding the sorting bottleneck.

The algorithm operates in iterations, each consisting of two phases:

1. **Bellman-Ford Relaxation Phase**:
   - Runs k = log^{1/3} n rounds of edge relaxation (similar to Bellman-Ford)
   - Updates distances by checking if paths through frontier vertices are shorter
   - Marks vertices as "complete" when their shortest distance is finalized

2. **Frontier Reduction Phase**:
   - Reduces the size of the frontier (set of vertices to explore from)
   - Selects "pivot" vertices with large reachable trees
   - This avoids the sorting bottleneck that limits Dijkstra's performance

### Pseudocode

```
BREAKING-DIJKSTRA(G, w, s)
────────────────────────────────────
1: INITIALIZE – SINGLE – SOURCE(G,s)
2: S = {s}                        //Complete set, initially contains source
3: F = {s}                        //Frontier set, vertices to explore from
4: k = ⌊log^{1/3} n⌋              //Number of Bellman-Ford rounds
5: while F ≠ Ø do
6:     for round = 1 to k do      //Bellman-Ford relaxation phase
7:         for each vertex u ∈ G.V do
8:             if d[u] ≠ ∞ then
9:                 for each vertex v ∈ G.Adj[u] do
10:                    if d[v] > d[u] + w(u,v) then
11:                        d[v] = d[u] + w(u,v)
12:                        π[v] = u
13:                    end if
14:                end for
15:            end if
16:        end for
17:    end for
18:    S = S ∪ {v : d[v] finalized}  //Mark vertices as complete
19:    F = REDUCE-FRONTIER(G, F, S, k)  //Reduce frontier using pivots
20: end while
```

### Why It's Faster

The key innovation is reducing the frontier size using pivots, which allows the algorithm to:
- Process multiple vertices simultaneously through Bellman-Ford rounds
- Avoid the O(n log n) sorting cost of maintaining a priority queue
- Focus computation on vertices with large reachable subtrees

