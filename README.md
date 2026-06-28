# Breaking Dijkstra's Algorithm Visualization Tool

This application provides an educational tool to understand and compare two shortest path algorithms:

- **Dijkstra's Algorithm**: The classic O(m + n log n) algorithm using a priority queue
- **"Tsinghua" / Breaking-the-Sorting-Barrier Algorithm (BMSSP)**: A new O(m log^{2/3} n) algorithm that breaks the sorting barrier

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

## "Tsinghua" / Breaking-the-Sorting-Barrier Algorithm (BMSSP)

This is the recursive **Bounded Multi-Source Shortest Path (BMSSP)** procedure from
the paper. It computes the *same* shortest distances as Dijkstra, but it never fully
sorts the frontier — and that is exactly what lets it beat the
`O(m + n log n)` sorting barrier, achieving `O(m log^{2/3} n)`.

It uses two parameters derived from the graph size: `k = ⌊log^{1/3} n⌋` (relaxation
rounds / block granularity) and `t = ⌊log^{2/3} n⌋` (recursion fan-out), with
recursion depth `L = ⌈log n / t⌉`. The algorithm has three pieces:

1. **`FindPivots(B, S)` — shrink the frontier.**
   Run `k` rounds of *bounded* (distance `< B`) Bellman-Ford relaxation outward from
   the frontier `S`, collecting the set of reached "witness" vertices `W`. Build the
   shortest-path forest over `W` and keep, as **pivots** `P`, only the frontier
   vertices whose subtree has `≥ k` vertices. Disjoint subtrees of size `≥ k` inside
   `W` guarantee `|P| ≤ |W|/k`, so the frontier shrinks by a ~`k` factor. (If the
   witnesses blow up, `|W| > k|S|`, it falls back to `P = S`.)

2. **`BMSSP(l, B, S)` — recurse over distance-ordered blocks.**
   Seed a queue with the pivots, then repeatedly **partially sort** it: pull only the
   next block of the `M = 2^{(l-1)t}` smallest-distance vertices (not the whole
   frontier) and recurse on that block with a tighter bound `Bᵢ`. Relaxations out of
   completed vertices feed newly discovered in-bound vertices back into the queue.
   Avoiding the global sort on every step is the core idea.

3. **`BaseCase(B, S)` (`l = 0`) — settle a few vertices.**
   A bounded multi-source Dijkstra that settles at most `k+1` vertices and returns a
   new boundary `B'`.

### Pseudocode

```
BMSSP(l, B, S)                                   // returns (B', U)
────────────────────────────────────────────────
1:  if l = 0 then return BASECASE(B, S)
2:  (P, W) ← FINDPIVOTS(B, S)                    // k relaxation rounds → pivots
3:  M ← 2^{(l-1)t};  D ← queue seeded with P
4:  U ← ∅
5:  while |U| < k·2^{lt} and D ≠ ∅ do
6:      (Bᵢ, Sᵢ) ← PULL(D, M)                    // partial sort: M smallest only
7:      (B'ᵢ, Uᵢ) ← BMSSP(l-1, Bᵢ, Sᵢ)          // recurse on the block
8:      U ← U ∪ Uᵢ
9:      for each u ∈ Uᵢ, edge (u,v,w):           // relax & re-queue
10:         if d[u]+w < d[v] then d[v] ← d[u]+w; π[v] ← u
11:         if v incomplete and d[v] < B then add v to D
12:  end while
13: return (B, U ∪ {x ∈ W : x complete, d[x] < B})

FINDPIVOTS(B, S)                                 // returns (P, W)
────────────────────────────────────────────────
1:  W ← S
2:  for round = 1 to k do                        // bounded Bellman-Ford
3:      relax every edge out of the last layer, keeping vertices with d < B
4:      add the newly reached vertices to W
5:      if |W| > k·|S| then return (S, W)         // bail: frontier too dense
6:  build shortest-path forest of W (roots in S)
7:  P ← { r ∈ S : subtree(r) has ≥ k vertices }  // guarantees |P| ≤ |W|/k
8:  return (P, W)
```

Top-level call: `BMSSP(L, ∞, {s})`.

### Why It's Faster

Dijkstra spends `O(n log n)` keeping the whole frontier perfectly sorted. BMSSP
instead:
- **reduces the frontier** to a few pivots via `FindPivots`, and
- **only partially sorts** what remains, pulling one bounded block at a time and
  recursing,

so it never pays for a full global sort — yielding `O(m log^{2/3} n)`.

### Notes on this implementation

The visualization reproduces the algorithm's logic faithfully and its output is
verified to match Dijkstra exactly on every sample graph and on tens of thousands of
random graphs. Two deliberate, clearly-scoped simplifications affect only constants /
robustness, never the computed result:

- The paper's specialised `O(1)`-amortised block queue (its Lemma 3.3) is replaced by
  a plain sort-on-pull queue. This changes the asymptotic constant only — the set of
  vertices pulled per block, and the final distances, are identical.
- Vertices are ordered lexicographically by `(distance, vertex-id)` so ties never
  split a block (the standard tie-breaking the analysis assumes), and `k`, `t` are
  floored at small values so the pivot/recursion machinery is actually visible on the
  small demo graphs (for tiny `n`, true `log^{1/3} n` rounds down to 1).

