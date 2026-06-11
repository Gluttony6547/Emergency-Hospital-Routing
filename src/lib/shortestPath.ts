import { MinHeap } from './minHeap'
import type { Graph, NodeId, RouteResult } from './types'

type Algorithm = RouteResult['algorithm']

export function runDijkstra(graph: Graph, source: NodeId, target: NodeId): RouteResult {
  return runShortestPath(graph, source, target, 'Dijkstra')
}

export function runAStar(graph: Graph, source: NodeId, target: NodeId): RouteResult {
  return runShortestPath(graph, source, target, 'A*')
}

function runShortestPath(graph: Graph, source: NodeId, target: NodeId, algorithm: Algorithm): RouteResult {
  const startedAt = performance.now()

  if (!graph.nodeById[source] || !graph.nodeById[target]) {
    return failureResult(algorithm, startedAt, 0, 'Source or target is outside the graph.')
  }

  const distances: Record<NodeId, number> = {}
  const previous: Record<NodeId, NodeId | undefined> = {}
  const visited = new Set<NodeId>()
  const heap = new MinHeap<NodeId>()

  for (const node of graph.nodes) {
    distances[node.id] = Number.POSITIVE_INFINITY
  }

  distances[source] = 0
  heap.push(source, getPriority(graph, source, target, 0, algorithm))

  while (heap.size > 0) {
    const entry = heap.pop()

    if (!entry) {
      break
    }

    const current = entry.item

    if (visited.has(current)) {
      continue
    }

    visited.add(current)

    if (current === target) {
      const path = reconstructPath(previous, source, target)

      return {
        algorithm,
        path,
        totalDistance: distances[target],
        visitedCount: visited.size,
        runtimeMs: performance.now() - startedAt,
        success: true,
        message: `${algorithm} found a route.`,
      }
    }

    for (const edge of graph.adjacency[current] ?? []) {
      if (visited.has(edge.to)) {
        continue
      }

      const candidateDistance = distances[current] + edge.weight

      if (candidateDistance < distances[edge.to]) {
        distances[edge.to] = candidateDistance
        previous[edge.to] = current
        heap.push(edge.to, getPriority(graph, edge.to, target, candidateDistance, algorithm))
      }
    }
  }

  return failureResult(algorithm, startedAt, visited.size, 'No route is reachable with the current blocked roads.')
}

function getPriority(
  graph: Graph,
  nodeId: NodeId,
  targetId: NodeId,
  distanceSoFar: number,
  algorithm: Algorithm,
): number {
  if (algorithm === 'Dijkstra') {
    return distanceSoFar
  }

  return distanceSoFar + manhattanHeuristic(graph, nodeId, targetId)
}

function manhattanHeuristic(graph: Graph, nodeId: NodeId, targetId: NodeId): number {
  const node = graph.nodeById[nodeId]
  const target = graph.nodeById[targetId]

  return Math.abs(node.x - target.x) + Math.abs(node.y - target.y)
}

function reconstructPath(previous: Record<NodeId, NodeId | undefined>, source: NodeId, target: NodeId): NodeId[] {
  const path: NodeId[] = []
  let current: NodeId | undefined = target

  while (current) {
    path.push(current)

    if (current === source) {
      break
    }

    current = previous[current]
  }

  return path.reverse()
}

function failureResult(
  algorithm: Algorithm,
  startedAt: number,
  visitedCount: number,
  message: string,
): RouteResult {
  return {
    algorithm,
    path: [],
    totalDistance: Number.POSITIVE_INFINITY,
    visitedCount,
    runtimeMs: performance.now() - startedAt,
    success: false,
    message,
  }
}
