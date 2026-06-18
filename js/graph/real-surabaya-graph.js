import { SURABAYA_REAL_MAP } from '../../data/surabaya-real-map.js';
import { haversineMeters } from '../utils/geometry.js';

const DEFAULT_MAX_SPEED_MPS = 22.22;

export function buildRealSurabayaGraph(dataset = SURABAYA_REAL_MAP) {
  const nodes = [];
  const nodeById = new Map();
  const adjacency = new Map();
  const roads = [];
  let minDistanceMeters = Infinity;
  let minEtaSeconds = Infinity;

  for (const [id, lat, lng, x, y] of dataset.nodes) {
    const node = { id: String(id), lat, lng, x, y };
    nodes.push(node);
    nodeById.set(node.id, node);
    adjacency.set(node.id, []);
  }

  for (const [fromRaw, toRaw, etaSecondsRaw, highway, oneWay] of dataset.edges) {
    const from = String(fromRaw);
    const to = String(toRaw);
    const source = nodeById.get(from);
    const target = nodeById.get(to);
    if (!source || !target) continue;

    const distanceMeters = Math.max(1, haversineMeters(source, target));
    const etaSeconds = Math.max(0.1, Number(etaSecondsRaw) || distanceMeters / 8);
    const road = { from, to, distanceMeters, etaSeconds, highway, blocked: false, oneWay: Boolean(oneWay) };
    roads.push(road);

    adjacency.get(from).push({ from, to, distanceMeters, etaSeconds, highway });
    if (!oneWay) {
      adjacency.get(to).push({ from: to, to: from, distanceMeters, etaSeconds, highway });
    }

    minDistanceMeters = Math.min(minDistanceMeters, distanceMeters);
    minEtaSeconds = Math.min(minEtaSeconds, etaSeconds);
  }

  const hospitals = dataset.hospitals.map((hospital) => ({
    ...hospital,
    nearestNodeId: String(hospital.nearestNodeId),
  }));

  return {
    id: dataset.id,
    label: dataset.label,
    sourceType: 'real',
    width: dataset.bounds[1][1] - dataset.bounds[0][1],
    height: dataset.bounds[1][0] - dataset.bounds[0][0],
    center: dataset.center,
    bounds: dataset.bounds,
    nodes,
    nodeById,
    adjacency,
    roads,
    blockedRoads: [],
    displayWays: dataset.displayWays,
    hospitals,
    sourceNodeId: null,
    targetNodeId: String(getHospitalById(dataset, dataset.defaultHospitalId).nearestNodeId),
    selectedHospitalId: dataset.defaultHospitalId,
    seed: dataset.id,
    blockedDensity: 0,
    minDistanceMeters: Number.isFinite(minDistanceMeters) ? minDistanceMeters : 1,
    minEtaSeconds: Number.isFinite(minEtaSeconds) ? minEtaSeconds : 1,
    maxSpeedMetersPerSecond: DEFAULT_MAX_SPEED_MPS,
    metadata: {
      source: dataset.source,
      rawDataset: dataset,
    },
  };
}

export function getRealDataset() {
  return SURABAYA_REAL_MAP;
}

export function getHospitalById(datasetOrGraph, hospitalId) {
  const hospitals = datasetOrGraph.hospitals ?? [];
  return hospitals.find((hospital) => hospital.id === hospitalId) ?? hospitals[0];
}

export function withRealSourceNode(graph, sourceNodeId) {
  return { ...graph, sourceNodeId };
}

export function withRealHospital(graph, hospitalId) {
  const hospital = getHospitalById(graph, hospitalId);
  return {
    ...graph,
    selectedHospitalId: hospital.id,
    targetNodeId: String(hospital.nearestNodeId),
  };
}
