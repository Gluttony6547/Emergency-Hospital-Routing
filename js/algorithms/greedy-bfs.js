import { MinPriorityQueue } from '../graph/priority-queue.js';
import { getNeighbors, heuristic } from '../graph/graph-utils.js';
import { createRouteResult, failureResult, now, reconstructPath, validateSourceTarget } from './search-result.js';

export function runGreedyBFS({ graph, source, target, objective }) {
  const startedAt = now();
  const invalid = validateSourceTarget(graph, source, target);
  if (invalid) return failureResult({ algorithmId: 'greedy-bfs', algorithmName: 'Greedy BFS', graph, source, target, objective, startedAt, message: invalid });

  const queue = new MinPriorityQueue();
  const visited = new Set();
  const discovered = new Set([source]);
  const previous = new Map();
  const visitedOrder = [];
  const relaxedEdges = [];

  queue.push(source, heuristic(graph, source, target, objective));

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
        algorithmId: 'greedy-bfs', algorithmName: 'Greedy BFS', graph, source, target, objective,
        path, visitedOrder, relaxedEdges, runtimeMs: now() - startedAt, success: true, message: 'Greedy BFS found a heuristic-directed route. It is not guaranteed optimal.',
      });
    }

    for (const edge of getNeighbors(graph, current)) {
      if (visited.has(edge.to) || discovered.has(edge.to)) continue;
      discovered.add(edge.to);
      previous.set(edge.to, current);
      relaxedEdges.push({ from: current, to: edge.to });
      queue.push(edge.to, heuristic(graph, edge.to, target, objective));
    }
  }

  return failureResult({ algorithmId: 'greedy-bfs', algorithmName: 'Greedy BFS', graph, source, target, objective, startedAt, visitedOrder, relaxedEdges, message: 'No reachable route was found.' });
}
