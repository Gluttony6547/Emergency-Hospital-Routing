import { calculatePathMetrics, getEdgeWeight } from '../graph/graph-utils.js';

export function reconstructPath(previous, source, target) {
  const path = [];
  let current = target;

  while (current) {
    path.push(current);
    if (current === source) break;
    current = previous.get(current);
  }

  path.reverse();
  return path[0] === source ? path : [];
}

export function createRouteResult({ algorithmId, algorithmName, graph, source, target, objective, path, visitedOrder, relaxedEdges, runtimeMs, success, message }) {
  const metrics = success ? calculatePathMetrics(graph, path) : { totalDistanceMeters: Infinity, totalEtaSeconds: Infinity, hopCount: 0 };
  const objectiveCost = objective === 'distance' ? metrics.totalDistanceMeters : metrics.totalEtaSeconds;

  return {
    algorithmId,
    algorithmName,
    source,
    target,
    objective,
    path,
    success,
    message,
    visitedOrder,
    relaxedEdges,
    visitedCount: visitedOrder.length,
    runtimeMs,
    objectiveCost,
    ...metrics,
  };
}

export function failureResult({ algorithmId, algorithmName, graph, source, target, objective, startedAt, visitedOrder = [], relaxedEdges = [], message }) {
  return createRouteResult({
    algorithmId,
    algorithmName,
    graph,
    source,
    target,
    objective,
    path: [],
    visitedOrder,
    relaxedEdges,
    runtimeMs: now() - startedAt,
    success: false,
    message,
  });
}

export function validateSourceTarget(graph, source, target) {
  if (!source || !target) return 'Source and target must be selected before running algorithms.';
  if (!graph.nodeById.has(source)) return 'Source is outside the graph.';
  if (!graph.nodeById.has(target)) return 'Target is outside the graph.';
  return null;
}

export function pathObjectiveCost(graph, path, objective) {
  if (!path.length) return Infinity;
  let total = 0;
  for (let i = 1; i < path.length; i += 1) {
    const from = path[i - 1];
    const to = path[i];
    const edge = (graph.adjacency.get(from) ?? []).find((candidate) => candidate.to === to);
    if (!edge) return Infinity;
    total += getEdgeWeight(edge, objective);
  }
  return total;
}

export function now() {
  if (typeof performance !== 'undefined' && performance.now) return performance.now();
  return Date.now();
}
