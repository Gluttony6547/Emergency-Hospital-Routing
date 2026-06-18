import { getNeighbors } from '../graph/graph-utils.js';
import { createRouteResult, failureResult, now, reconstructPath, validateSourceTarget } from './search-result.js';

export function runBFS({ graph, source, target, objective }) {
  const startedAt = now();
  const invalid = validateSourceTarget(graph, source, target);
  if (invalid) return failureResult({ algorithmId: 'bfs', algorithmName: 'BFS', graph, source, target, objective, startedAt, message: invalid });

  const queue = [source];
  const visited = new Set([source]);
  const previous = new Map();
  const visitedOrder = [];
  const relaxedEdges = [];
  let head = 0;

  while (head < queue.length) {
    const current = queue[head];
    head += 1;
    visitedOrder.push(current);

    if (current === target) {
      const path = reconstructPath(previous, source, target);
      return createRouteResult({
        algorithmId: 'bfs', algorithmName: 'BFS', graph, source, target, objective,
        path, visitedOrder, relaxedEdges, runtimeMs: now() - startedAt, success: true, message: 'BFS found the shortest-hop route, ignoring weights.',
      });
    }

    for (const edge of getNeighbors(graph, current)) {
      if (visited.has(edge.to)) continue;
      visited.add(edge.to);
      previous.set(edge.to, current);
      relaxedEdges.push({ from: current, to: edge.to });
      queue.push(edge.to);
    }
  }

  return failureResult({ algorithmId: 'bfs', algorithmName: 'BFS', graph, source, target, objective, startedAt, visitedOrder, relaxedEdges, message: 'No reachable route was found.' });
}
