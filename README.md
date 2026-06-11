# Emergency Route Planner

Emergency Route Planner is a React + Vite + TypeScript capstone app for comparing two handwritten shortest-path algorithms on real and reproducible road graphs:

- Dijkstra with a binary min-heap.
- A* with a Manhattan-distance heuristic.

The app includes two modes:

- Real Surabaya: OpenStreetMap road data around East Surabaya with 18 real hospital markers and draggable ambulance placement.
- Synthetic grid: generated weighted road grids with blocked roads for controlled benchmarking.

Leaflet/OpenStreetMap is used for visualization only. Route computation still runs locally through the handwritten Dijkstra and A* implementations.

## Requirements

- Node.js 20 or newer.
- npm 10 or newer.

## Commands

```bash
npm install
npm run dev
npm run build
npm run test
npm run benchmark
```

Optional browser smoke test:

```bash
npm run e2e
```

If Playwright browsers are not installed on the machine, run:

```bash
npx playwright install
```

## Benchmark

`npm run benchmark` runs five input sizes across two orders of magnitude:

- 10 x 10 = 100 nodes
- 25 x 20 = 500 nodes
- 40 x 25 = 1,000 nodes
- 100 x 50 = 5,000 nodes
- 125 x 80 = 10,000 nodes

The script uses seed `exam-2026`, writes:

- `benchmarks/benchmark-results.csv`
- `benchmarks/benchmark-results.json`

It also validates that Dijkstra and A* return matching shortest-path distances for every benchmark instance.

## Real Map Data

The real map mode uses a static OpenStreetMap Overpass extract for East Surabaya, fetched on 2026-06-11:

- 33,822 road nodes
- 37,763 road segments
- 18 hospitals tagged as `amenity=hospital`

The ambulance marker snaps to the nearest road node after dragging. Hospital destinations come from real OSM hospital markers or the sidebar dropdown.

The default tile layer uses `tile.openstreetmap.org`, which is suitable for light student/demo use. For production or heavy traffic, use a dedicated tile provider or self-hosted tiles.

## Project Structure

```text
src/lib/graph.ts          seeded graph generator and graph helpers
src/lib/minHeap.ts        handwritten binary min-heap
src/lib/shortestPath.ts   handwritten Dijkstra and A*
src/lib/realMap.ts        OSM graph adapter and real-map helpers
src/data/surabayaRealMap.ts static OSM Surabaya road/hospital extract
src/lib/benchmark.ts      reproducible benchmark suite
src/components/MapView.tsx SVG synthetic grid route map
src/components/RealMapView.tsx Leaflet real-map route view
scripts/benchmark.ts     one-command benchmark entry point
tests/smoke.spec.ts      Playwright browser smoke test
```

## Notes for Academic Use

The core algorithmic logic is handwritten. Libraries are used only for the UI, build tooling, testing, and browser automation.
