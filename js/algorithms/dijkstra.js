import { MinPriorityQueue } from '../graph/priority-queue.js';
import { getEdgeWeight, getNeighbors } from '../graph/graph-utils.js';
import { createRouteResult, failureResult, now, reconstructPath, validateSourceTarget } from './search-result.js';

export function runDijkstra({ graph, source, target, objective }) {
  const startedAt = now();
  const invalid = validateSourceTarget(graph, source, target);
  if (invalid) return failureResult({ algorithmId: 'dijkstra', algorithmName: 'Dijkstra', graph, source, target, objective, startedAt, message: invalid });

  const dist = new Map();
  const previous = new Map();
  const visited = new Set();
  const visitedOrder = [];
  const relaxedEdges = [];
  const queue = new MinPriorityQueue();

  for (const node of graph.nodes) dist.set(node.id, Infinity);
  dist.set(source, 0);
  queue.push(source, 0);

  while (!queue.isEmpty()) {
    const entry = queue.pop();
    if (!entry) break;
    const current = entry.item;
    if (visited.has(current)) continue;

    visited.add(current);
    visitedOrder.push(current);

    if (current === target) {
      const path = reconstructPath(previous, source, target);
      return createRouteResult({
        algorithmId: 'dijkstra', algorithmName: 'Dijkstra', graph, source, target, objective,
        path, visitedOrder, relaxedEdges, runtimeMs: now() - startedAt, success: true, message: 'Dijkstra found an optimal weighted route.',
      });
    }

    for (const edge of getNeighbors(graph, current)) {
      if (visited.has(edge.to)) continue;
      const candidate = dist.get(current) + getEdgeWeight(edge, objective);
      if (candidate < dist.get(edge.to)) {
        dist.set(edge.to, candidate);
        previous.set(edge.to, current);
        relaxedEdges.push({ from: current, to: edge.to });
        queue.push(edge.to, candidate);
      }
    }
  }

  return failureResult({ algorithmId: 'dijkstra', algorithmName: 'Dijkstra', graph, source, target, objective, startedAt, visitedOrder, relaxedEdges, message: 'No reachable route was found.' });
}
