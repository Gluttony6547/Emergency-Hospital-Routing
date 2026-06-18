import { haversineMeters, manhattanUnits } from '../utils/geometry.js';

export function getEdgeWeight(edge, objective) {
  return objective === 'distance' ? edge.distanceMeters : edge.etaSeconds;
}

export function getNode(graph, nodeId) {
  return graph.nodeById.get(nodeId);
}

export function getNeighbors(graph, nodeId) {
  return graph.adjacency.get(nodeId) ?? [];
}

export function findEdge(graph, from, to) {
  return (graph.adjacency.get(from) ?? []).find((edge) => edge.to === to) ?? null;
}

export function calculatePathMetrics(graph, path) {
  if (!Array.isArray(path) || path.length === 0) {
    return { totalDistanceMeters: Infinity, totalEtaSeconds: Infinity, hopCount: 0 };
  }

  let totalDistanceMeters = 0;
  let totalEtaSeconds = 0;

  for (let i = 1; i < path.length; i += 1) {
    const edge = findEdge(graph, path[i - 1], path[i]);
    if (!edge) return { totalDistanceMeters: Infinity, totalEtaSeconds: Infinity, hopCount: 0 };
    totalDistanceMeters += edge.distanceMeters;
    totalEtaSeconds += edge.etaSeconds;
  }

  return {
    totalDistanceMeters,
    totalEtaSeconds,
    hopCount: Math.max(0, path.length - 1),
  };
}

export function heuristic(graph, nodeId, targetId, objective) {
  const node = getNode(graph, nodeId);
  const target = getNode(graph, targetId);
  if (!node || !target) return 0;

  if (graph.sourceType === 'real') {
    const distance = haversineMeters(node, target);
    if (objective === 'distance') return distance;
    return distance / graph.maxSpeedMetersPerSecond;
  }

  const steps = manhattanUnits(node, target);
  if (objective === 'distance') return steps * graph.minDistanceMeters;
  return steps * graph.minEtaSeconds;
}

export function pathCoordinates(graph, path) {
  return path
    .map((nodeId) => getNode(graph, nodeId))
    .filter(Boolean)
    .map((node) => [node.lat, node.lng]);
}

export function nearestNodeByLatLng(graph, lat, lng) {
  let best = graph.sourceNodeId ?? graph.nodes[0]?.id ?? null;
  let bestScore = Infinity;

  for (const node of graph.nodes) {
    if (!Number.isFinite(node.lat) || !Number.isFinite(node.lng)) continue;
    const dLat = node.lat - lat;
    const dLng = node.lng - lng;
    const score = dLat * dLat + dLng * dLng;
    if (score < bestScore) {
      best = node.id;
      bestScore = score;
    }
  }

  return best;
}

export function toGraphSummary(graph) {
  return {
    nodes: graph.nodes.length,
    roads: graph.roads.length,
    blockedRoads: graph.blockedRoads.length,
    sourceType: graph.sourceType,
    label: graph.label,
  };
}
