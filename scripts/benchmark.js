import { mkdir, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { ALGORITHMS } from '../js/algorithms/registry.js';
import { generateSyntheticGraph, scenarioForSize } from '../js/graph/synthetic-grid-graph.js';
import { attachComparisonMetrics } from '../js/results/metrics.js';
import { toCsv } from '../js/utils/csv.js';

const SIZES = [100, 500, 1000, 5000, 10000];
const OBJECTIVES = ['eta', 'distance'];
const SEED = 'exam-2026';
const BLOCKED_DENSITY = 0.30;
const OUT_DIR = new URL('../benchmarks/', import.meta.url);

async function main() {
  const rows = [];
  const startedAt = performance.now();

  for (const objective of OBJECTIVES) {
    for (const size of SIZES) {
      const scenario = scenarioForSize(size, SEED, BLOCKED_DENSITY);
      const graph = generateSyntheticGraph(scenario);
      const rawResults = [];

      for (const algorithm of ALGORITHMS) {
        const result = algorithm.run({
          graph,
          source: graph.sourceNodeId,
          target: graph.targetNodeId,
          objective,
        });
        rawResults.push(result);
      }

      const results = attachComparisonMetrics(rawResults, objective);
      const dijkstra = results.find((item) => item.algorithmId === 'dijkstra');
      const astar = results.find((item) => item.algorithmId === 'astar');

      for (const result of results) {
        rows.push({
          seed: SEED,
          objective,
          sizeLabel: `${graph.width}x${graph.height}`,
          nodes: graph.nodes.length,
          roads: graph.roads.length,
          blockedRoads: graph.blockedRoads.length,
          blockedDensity: BLOCKED_DENSITY,
          algorithmId: result.algorithmId,
          algorithmName: result.algorithmName,
          found: result.success,
          runtimeMs: Number(result.runtimeMs.toFixed(6)),
          visitedCount: result.visitedCount,
          hopCount: result.hopCount,
          totalDistanceMeters: Number(result.totalDistanceMeters.toFixed(6)),
          totalEtaSeconds: Number(result.totalEtaSeconds.toFixed(6)),
          objectiveCost: Number(result.objectiveCost.toFixed(6)),
          gapVsDijkstra: Number((result.gap ?? Infinity).toFixed(6)),
          gapPercentVsDijkstra: Number((result.gapPercent ?? Infinity).toFixed(6)),
          aStarMatchesDijkstra: Boolean(dijkstra?.success && astar?.success && Math.abs(dijkstra.objectiveCost - astar.objectiveCost) < 1e-7),
        });
      }
    }
  }

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(new URL('benchmark-results.json', OUT_DIR), JSON.stringify(rows, null, 2));
  await writeFile(new URL('benchmark-results.csv', OUT_DIR), toCsv(rows));

  console.log(`Benchmark completed in ${(performance.now() - startedAt).toFixed(2)} ms`);
  console.log(`Rows: ${rows.length}`);
  console.log('Output: benchmarks/benchmark-results.json');
  console.log('Output: benchmarks/benchmark-results.csv');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
