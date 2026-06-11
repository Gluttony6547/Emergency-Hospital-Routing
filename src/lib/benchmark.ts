import { generateGridGraph, toNodeId } from './graph'
import { runAStar, runDijkstra } from './shortestPath'
import type { BenchmarkRow, ScenarioConfig } from './types'

export const benchmarkScenarios = [
  { label: '10x10', width: 10, height: 10 },
  { label: '25x20', width: 25, height: 20 },
  { label: '40x25', width: 40, height: 25 },
  { label: '100x50', width: 100, height: 50 },
  { label: '125x80', width: 125, height: 80 },
]

export function runBenchmarkSuite(seed = 'exam-2026', obstacleDensity = 0.18): BenchmarkRow[] {
  return benchmarkScenarios.map((scenario) => {
    const config: ScenarioConfig = {
      width: scenario.width,
      height: scenario.height,
      obstacleDensity,
      seed,
      startNodeId: toNodeId(0, 0),
      targetNodeId: toNodeId(scenario.width - 1, scenario.height - 1),
    }
    const graph = generateGridGraph(config)
    const dijkstra = runDijkstra(graph, config.startNodeId, config.targetNodeId)
    const aStar = runAStar(graph, config.startNodeId, config.targetNodeId)
    const pathMatch =
      dijkstra.success &&
      aStar.success &&
      Math.abs(dijkstra.totalDistance - aStar.totalDistance) < Number.EPSILON

    return {
      label: scenario.label,
      nodes: graph.nodes.length,
      roads: graph.roads.length,
      blockedRoads: graph.blockedRoads.length,
      seed,
      dijkstraDistance: dijkstra.totalDistance,
      aStarDistance: aStar.totalDistance,
      dijkstraRuntimeMs: dijkstra.runtimeMs,
      aStarRuntimeMs: aStar.runtimeMs,
      dijkstraVisited: dijkstra.visitedCount,
      aStarVisited: aStar.visitedCount,
      pathMatch,
    }
  })
}

export function benchmarkRowsToCsv(rows: BenchmarkRow[]): string {
  const headers: Array<keyof BenchmarkRow> = [
    'label',
    'nodes',
    'roads',
    'blockedRoads',
    'seed',
    'dijkstraDistance',
    'aStarDistance',
    'dijkstraRuntimeMs',
    'aStarRuntimeMs',
    'dijkstraVisited',
    'aStarVisited',
    'pathMatch',
  ]

  return [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header]
          return typeof value === 'number' ? value.toFixed(4) : String(value)
        })
        .join(','),
    ),
  ].join('\n')
}
