<div align="center">

# SOS2BY

### Emergency Route Planning on Surabaya City Map using Dijkstra, A*, BFS, and Greedy Best-First Search

SOS2BY is a static full-frontend Design & Analysis of Algorithms final project.  
It models emergency routing as a weighted graph and compares four algorithms on the same route-planning instances.

</div>

---

| NRP        | Name                         | Class |
| :--------: | ---------------------------- | :---: |
| 5025231027 | Naufal Dariskarim            | DAA E |
| 5025231187 | Dapunta Adyapaksi Ratyanasja | DAA D |

---

## 1. Project Summary

SOS2BY solves an emergency routing problem: given an ambulance starting point and a hospital destination, find and compare possible routes on either a real Surabaya road graph or a generated synthetic grid graph.

The project uses:

- **HTML + CSS + Vanilla JavaScript** for the application.
- **Leaflet** only for real map rendering.
- **Node.js scripts** only for benchmark generation.
- **No React, no backend framework, no database, and no build step.**

---

## 2. Algorithms

| Algorithm | Priority rule | Role | Optimality |
|---|---|---|---|
| Dijkstra | `g(n)` | Main exact weighted shortest-path algorithm | Optimal for non-negative weights |
| A* | `g(n) + h(n)` | Informed exact search | Optimal when heuristic is admissible and consistent |
| BFS | `depth(n)` | Simple unweighted baseline | Shortest by hop count, not weighted cost |
| Greedy BFS | `h(n)` | Heuristic-only baseline | Not guaranteed optimal |

---

## 3. Formal Model

The problem is represented as a graph:

```text
G = (V, E)
```

Where:

- `V` is the set of road nodes or synthetic grid nodes.
- `E` is the set of valid road segments between nodes.
- Each edge `e ∈ E` has two weights:
  - `distanceMeters(e)` for physical distance.
  - `etaSeconds(e)` for estimated travel time.
- `s ∈ V` is the ambulance starting point.
- `t ∈ V` is the hospital destination.

Objective:

```text
Find a path P from s to t minimizing Σ w(e)
```

The UI supports two objective modes:

1. **ETA seconds** — default objective.
2. **Distance meters** — alternative objective for distance-based routing.

---

## 4. Features

### Map Source

- Real Surabaya road graph from OpenStreetMap extract.
- Synthetic grid graph with fixed seed, size, and blocked-road density.

### Real Surabaya Mode

- Hospital destination selector.
- Real hospital markers.
- Click map area to choose the ambulance starting point.
- Drag marker `A` to change the starting point.
- Route animation is optimized for real map scale.

### Synthetic Grid Mode

- Seed input.
- Width and height controls.
- Blocked road density control.
- Size presets: `100`, `500`, `1K`, `5K`, `10K` nodes.
- Click and drag start/hospital endpoint.
- Toggle blocked roads for manual edits.
- Detailed animation for algorithm comparison.

### Algorithm Comparison

- Select/unselect algorithms dynamically.
- Run selected algorithms on the same graph instance.
- Show one viewer per selected algorithm during running state.
- Show runtime, visited nodes, hop count, distance, ETA, and gap vs Dijkstra.

---

## 5. Folder Structure

```text
sos2by/
├── index.html
├── README.md
├── package.json
├── css/
│   └── style.css
├── data/
│   └── surabaya-real-map.js
├── js/
│   ├── main.js
│   ├── app/
│   ├── algorithms/
│   ├── graph/
│   ├── results/
│   ├── utils/
│   └── viewers/
├── scripts/
│   ├── benchmark.js
│   └── generate-plot.js
├── benchmarks/
└── docs/
```

---

## 6. How to Run

Install dependency for the static local server:

```bash
npm install
```

Run the app:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

Alternative without npm package scripts:

```bash
python -m http.server 5173
```

Then open:

```text
http://localhost:5173
```

---

## 7. Benchmark

Run one-command benchmark:

```bash
npm run benchmark
```

Generate runtime plot:

```bash
npm run plot
```

Run both:

```bash
npm run check
```

Benchmark output:

```text
benchmarks/benchmark-results.csv
benchmarks/benchmark-results.json
benchmarks/runtime-plot.svg
```

Benchmark sizes:

```text
100 → 500 → 1,000 → 5,000 → 10,000 nodes
```

Fixed seed:

```text
exam-2026
```

---

## 8. Reproducibility Notes

The benchmark uses generated synthetic graphs so input sizes are controlled and reproducible. The real Surabaya mode is used for the application demo and real-world motivation, while synthetic mode is used for clean empirical scaling.

---

## 9. Attribution

- Real road data: OpenStreetMap contributors via the provided Surabaya OSM extract baseline.
- Map tiles and rendering: Leaflet and OpenStreetMap.
- Core algorithms: implemented directly in this repository.

