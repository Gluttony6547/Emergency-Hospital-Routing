import { MinPriorityQueue } from '../graph/priority-queue.js';
import { getEdgeWeight, getNeighbors, heuristic } from '../graph/graph-utils.js';
import { createRouteResult, failureResult, now, reconstructPath, validateSourceTarget } from './search-result.js';

export function runAStar({ graph, source, target, objective }) {
  const startedAt = now();
  const invalid = validateSourceTarget(graph, source, target);
  if (invalid) return failureResult({ algorithmId: 'astar', algorithmName: 'A*', graph, source, target, objective, startedAt, message: invalid });

  const gScore = new Map();
  const previous = new Map();
  const visited = new Set();
  const visitedOrder = [];
  const relaxedEdges = [];
  const queue = new MinPriorityQueue();

  for (const node of graph.nodes) gScore.set(node.id, Infinity);
  gScore.set(source, 0);
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
        algorithmId: 'astar', algorithmName: 'A*', graph, source, target, objective,
        path, visitedOrder, relaxedEdges, runtimeMs: now() - startedAt, success: true, message: 'A* found a route using g(n) + h(n).',
      });
    }

    for (const edge of getNeighbors(graph, current)) {
      if (visited.has(edge.to)) continue;
      const tentative = gScore.get(current) + getEdgeWeight(edge, objective);
      if (tentative < gScore.get(edge.to)) {
        gScore.set(edge.to, tentative);
        previous.set(edge.to, current);
        relaxedEdges.push({ from: current, to: edge.to });
        queue.push(edge.to, tentative + heuristic(graph, edge.to, target, objective));
      }
    }
  }

  return failureResult({ algorithmId: 'astar', algorithmName: 'A*', graph, source, target, objective, startedAt, visitedOrder, relaxedEdges, message: 'No reachable route was found.' });
}
