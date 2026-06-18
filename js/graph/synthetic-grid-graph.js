import { createSeededRandom, randomBetween } from '../utils/random.js';
import { clamp } from '../utils/geometry.js';
import { APP_CONFIG } from '../app/config.js';

export function toNodeId(x, y) {
  return `${x},${y}`;
}

export function parseNodeId(nodeId) {
  const [x, y] = String(nodeId).split(',').map(Number);
  return { x, y };
}

export function defaultSyntheticScenario() {
  return {
    width: 100,
    height: 50,
    blockedDensity: 0.30,
    seed: 'surabaya-118',
    sourceNodeId: APP_CONFIG.syntheticDefaults.startPoint,
    targetNodeId: APP_CONFIG.syntheticDefaults.endPoint,
  };
}

export function scenarioForSize(size, seed = 'exam-2026', blockedDensity = 0.30) {
  const dimensions = {
    100: [10, 10],
    500: [25, 20],
    1000: [40, 25],
    5000: [100, 50],
    10000: [125, 80],
  }[size] ?? [100, 50];

  const [width, height] = dimensions;
  return {
    width,
    height,
    blockedDensity,
    seed,
    sourceNodeId: APP_CONFIG.syntheticDefaults.startPoint,
    targetNodeId: APP_CONFIG.syntheticDefaults.endPoint,
  };
}

export function clampSyntheticScenario(raw) {
  const width = clamp(Math.round(Number(raw.width) || 100), 5, 125);
  const height = clamp(Math.round(Number(raw.height) || 50), 5, 80);
  const seed = String(raw.seed || 'surabaya-118').trim() || 'surabaya-118';
  const sourceNodeId = resolveSyntheticPoint(raw.sourceNodeId ?? APP_CONFIG.syntheticDefaults.startPoint, width, height, toNodeId(0, 0), seed, 'source');
  let targetNodeId = resolveSyntheticPoint(raw.targetNodeId ?? APP_CONFIG.syntheticDefaults.endPoint, width, height, toNodeId(width - 1, height - 1), seed, 'target');

  if (targetNodeId === sourceNodeId) {
    const source = parseNodeId(sourceNodeId);
    targetNodeId = toNodeId(width - 1 - source.x, height - 1 - source.y);
  }

  return {
    width,
    height,
    blockedDensity: clamp(Number(raw.blockedDensity) || 0, 0, 0.45),
    seed,
    sourceNodeId,
    targetNodeId,
  };
}

export function generateSyntheticGraph(rawScenario = defaultSyntheticScenario()) {
  const scenario = clampSyntheticScenario(rawScenario);
  const random = createSeededRandom(`${scenario.seed}:${scenario.width}x${scenario.height}:${scenario.blockedDensity}`);
  const nodes = [];
  const nodeById = new Map();
  const adjacency = new Map();
  const roads = [];
  const protectedRoads = getProtectedRoadKeys(scenario.sourceNodeId, scenario.targetNodeId);
  let minDistanceMeters = Infinity;
  let minEtaSeconds = Infinity;

  for (let y = 0; y < scenario.height; y += 1) {
    for (let x = 0; x < scenario.width; x += 1) {
      const id = toNodeId(x, y);
      const node = { id, x, y, row: y, col: x };
      nodes.push(node);
      nodeById.set(id, node);
      adjacency.set(id, []);
    }
  }

  for (let y = 0; y < scenario.height; y += 1) {
    for (let x = 0; x < scenario.width; x += 1) {
      const from = toNodeId(x, y);
      if (x + 1 < scenario.width) addRoad(from, toNodeId(x + 1, y));
      if (y + 1 < scenario.height) addRoad(from, toNodeId(x, y + 1));
    }
  }

  const blockedRoads = roads.filter((road) => road.blocked);

  return {
    id: `synthetic-${scenario.seed}`,
    label: 'Synthetic city grid',
    sourceType: 'synthetic',
    width: scenario.width,
    height: scenario.height,
    nodes,
    nodeById,
    adjacency,
    roads,
    blockedRoads,
    hospitals: [],
    sourceNodeId: scenario.sourceNodeId,
    targetNodeId: scenario.targetNodeId,
    seed: scenario.seed,
    blockedDensity: scenario.blockedDensity,
    minDistanceMeters: Number.isFinite(minDistanceMeters) ? minDistanceMeters : 100,
    minEtaSeconds: Number.isFinite(minEtaSeconds) ? minEtaSeconds : 5,
    maxSpeedMetersPerSecond: 25,
    metadata: scenario,
  };

  function addRoad(from, to) {
    const key = roadKey(from, to);
    const blocked = !protectedRoads.has(key) && random() < scenario.blockedDensity;
    const distanceMeters = randomBetween(random, 85, 180);
    const speed = randomBetween(random, 7, 16);
    const etaSeconds = distanceMeters / speed;
    const road = { from, to, distanceMeters, etaSeconds, blocked, oneWay: false };
    roads.push(road);

    if (!blocked) {
      adjacency.get(from).push({ from, to, distanceMeters, etaSeconds });
      adjacency.get(to).push({ from: to, to: from, distanceMeters, etaSeconds });
      minDistanceMeters = Math.min(minDistanceMeters, distanceMeters);
      minEtaSeconds = Math.min(minEtaSeconds, etaSeconds);
    }
  }
}

export function cloneSyntheticWithToggledRoad(graph, nodeA, nodeB) {
  const key = roadKey(nodeA, nodeB);
  const roads = graph.roads.map((road) => roadKey(road.from, road.to) === key ? { ...road, blocked: !road.blocked } : { ...road });
  return rebuildSyntheticFromRoads(graph, roads);
}

export function rebuildSyntheticFromRoads(base, roads) {
  const nodes = base.nodes.map((node) => ({ ...node }));
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const adjacency = new Map(nodes.map((node) => [node.id, []]));
  let minDistanceMeters = Infinity;
  let minEtaSeconds = Infinity;

  for (const road of roads) {
    if (!road.blocked) {
      adjacency.get(road.from).push({ from: road.from, to: road.to, distanceMeters: road.distanceMeters, etaSeconds: road.etaSeconds });
      adjacency.get(road.to).push({ from: road.to, to: road.from, distanceMeters: road.distanceMeters, etaSeconds: road.etaSeconds });
      minDistanceMeters = Math.min(minDistanceMeters, road.distanceMeters);
      minEtaSeconds = Math.min(minEtaSeconds, road.etaSeconds);
    }
  }

  return {
    ...base,
    nodes,
    nodeById,
    adjacency,
    roads,
    blockedRoads: roads.filter((road) => road.blocked),
    minDistanceMeters: Number.isFinite(minDistanceMeters) ? minDistanceMeters : base.minDistanceMeters,
    minEtaSeconds: Number.isFinite(minEtaSeconds) ? minEtaSeconds : base.minEtaSeconds,
  };
}

export function nearestSyntheticNode(graph, x, y) {
  const col = clamp(Math.round(x), 0, graph.width - 1);
  const row = clamp(Math.round(y), 0, graph.height - 1);
  return toNodeId(col, row);
}

export function closestRoadEndpointPair(graph, nodeId) {
  const current = parseNodeId(nodeId);
  const candidates = [
    toNodeId(current.x + 1, current.y),
    toNodeId(current.x - 1, current.y),
    toNodeId(current.x, current.y + 1),
    toNodeId(current.x, current.y - 1),
  ].filter((candidate) => graph.nodeById.has(candidate));
  return candidates.length ? [nodeId, candidates[0]] : null;
}

function roadKey(from, to) {
  return from < to ? `${from}|${to}` : `${to}|${from}`;
}

function resolveSyntheticPoint(value, width, height, fallback, seed, salt) {
  if (value === 'random' || String(value).startsWith('random:')) {
    const extraSalt = value === 'random' ? '' : `:${String(value)}`;
    const random = createSeededRandom(`${seed}:${width}x${height}:${salt}${extraSalt}`);
    return toNodeId(Math.floor(random() * width), Math.floor(random() * height));
  }

  if (value && typeof value === 'object') {
    const x = Number(value.x ?? value.col);
    const y = Number(value.y ?? value.row);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      return toNodeId(clamp(Math.round(x), 0, width - 1), clamp(Math.round(y), 0, height - 1));
    }
  }

  return clampNode(value, width, height, fallback);
}

function clampNode(nodeId, width, height, fallback) {
  const { x, y } = parseNodeId(nodeId);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return fallback;
  return toNodeId(clamp(Math.round(x), 0, width - 1), clamp(Math.round(y), 0, height - 1));
}

function getProtectedRoadKeys(sourceNodeId, targetNodeId) {
  const keys = new Set();
  const source = parseNodeId(sourceNodeId);
  const target = parseNodeId(targetNodeId);
  let x = source.x;
  let y = source.y;

  while (x !== target.x) {
    const nextX = x + Math.sign(target.x - x);
    keys.add(roadKey(toNodeId(x, y), toNodeId(nextX, y)));
    x = nextX;
  }

  while (y !== target.y) {
    const nextY = y + Math.sign(target.y - y);
    keys.add(roadKey(toNodeId(x, y), toNodeId(x, nextY)));
    y = nextY;
  }

  return keys;
}
