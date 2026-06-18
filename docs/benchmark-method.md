# Benchmark Method

The benchmark runs all four algorithms on the same synthetic graph instance for each input size.

## Sizes

```text
100, 500, 1000, 5000, 10000 nodes
```

## Objectives

- ETA seconds
- Distance meters

## Metrics

- Runtime in milliseconds
- Visited node count
- Hop count
- Total distance
- Total ETA
- Gap vs Dijkstra
- A* cross-check against Dijkstra

## Seed

```text
exam-2026
```

The fixed seed makes graph generation reproducible.
