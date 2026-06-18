# SOS2BY Architecture

```text
index.html
   ↓
main.js
   ↓
AppController
   ├─ Map Source / Editor
   ├─ Algorithm Registry
   ├─ Viewer Manager
   └─ Results Panel

Graph Source
   ├─ Real Surabaya OSM graph
   └─ Synthetic Grid graph

Algorithms
   ├─ Dijkstra
   ├─ A*
   ├─ BFS
   └─ Greedy BFS

Benchmark
   └─ Node.js script using the same graph and algorithm modules
```

## Design Principle

Algorithm modules are pure computation modules. They never touch the DOM. Viewer modules only render graph states and traces. The controller connects input, graph, algorithms, viewer, and results.

## State Machine

```text
PREPARED → RUNNING → FINISHED
```

- `PREPARED`: user may edit the current graph or endpoints.
- `RUNNING`: selected algorithms run and animate; editing is locked.
- `FINISHED`: final paths and comparison metrics are displayed.
