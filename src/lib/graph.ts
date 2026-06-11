import { createSeededRandom, randomInt } from './random'
import type { Graph, GraphEdge, GraphNode, GraphRoad, NodeId, ScenarioConfig } from './types'

export function toNodeId(x: number, y: number): NodeId {
  return `${x},${y}`
}

export function parseNodeId(nodeId: NodeId): { x: number; y: number } {
  const [x, y] = nodeId.split(',').map(Number)
  return { x, y }
}

export function getDefaultScenario(): ScenarioConfig {
  const width = 30
  const height = 20

  return {
    width,
    height,
    obstacleDensity: 0.18,
    seed: 'surabaya-118',
    startNodeId: toNodeId(1, 1),
    targetNodeId: toNodeId(width - 2, height - 2),
  }
}

export function clampScenario(config: ScenarioConfig): ScenarioConfig {
  const width = clamp(Math.round(config.width), 5, 125)
  const height = clamp(Math.round(config.height), 5, 80)
  const start = clampNode(config.startNodeId, width, height, toNodeId(1, 1))
  const target = clampNode(config.targetNodeId, width, height, toNodeId(width - 2, height - 2))

  return {
    width,
    height,
    obstacleDensity: clamp(config.obstacleDensity, 0, 0.45),
    seed: config.seed.trim() || 'surabaya-118',
    startNodeId: start,
    targetNodeId: target,
  }
}

export function generateGridGraph(rawConfig: ScenarioConfig): Graph {
  const config = clampScenario(rawConfig)
  const random = createSeededRandom(
    `${config.seed}:${config.width}x${config.height}:${config.obstacleDensity}`,
  )
  const nodes: GraphNode[] = []
  const nodeById: Record<NodeId, GraphNode> = {}
  const adjacency: Record<NodeId, GraphEdge[]> = {}
  const roads: GraphRoad[] = []
  const protectedRoads = getProtectedRoadKeys(config.startNodeId, config.targetNodeId)

  for (let y = 0; y < config.height; y += 1) {
    for (let x = 0; x < config.width; x += 1) {
      const id = toNodeId(x, y)
      const node = { id, x, y }
      nodes.push(node)
      nodeById[id] = node
      adjacency[id] = []
    }
  }

  for (let y = 0; y < config.height; y += 1) {
    for (let x = 0; x < config.width; x += 1) {
      const from = toNodeId(x, y)

      if (x + 1 < config.width) {
        addRoad(from, toNodeId(x + 1, y))
      }

      if (y + 1 < config.height) {
        addRoad(from, toNodeId(x, y + 1))
      }
    }
  }

  const blockedRoads = roads.filter((road) => road.blocked)

  return {
    width: config.width,
    height: config.height,
    nodes,
    nodeById,
    adjacency,
    roads,
    blockedRoads,
    seed: config.seed,
    obstacleDensity: config.obstacleDensity,
  }

  function addRoad(from: NodeId, to: NodeId): void {
    const roadKey = getRoadKey(from, to)
    const blocked = !protectedRoads.has(roadKey) && random() < config.obstacleDensity
    const weight = randomInt(random, 1, 9)
    const road = { from, to, weight, blocked }

    roads.push(road)

    if (!blocked) {
      adjacency[from].push({ to, weight })
      adjacency[to].push({ to: from, weight })
    }
  }
}

export function makeManualGraph(nodes: GraphNode[], roads: GraphRoad[]): Graph {
  const nodeById: Record<NodeId, GraphNode> = {}
  const adjacency: Record<NodeId, GraphEdge[]> = {}
  let width = 0
  let height = 0

  for (const node of nodes) {
    nodeById[node.id] = node
    adjacency[node.id] = []
    width = Math.max(width, node.x + 1)
    height = Math.max(height, node.y + 1)
  }

  for (const road of roads) {
    if (!road.blocked) {
      adjacency[road.from].push({ to: road.to, weight: road.weight })
      adjacency[road.to].push({ to: road.from, weight: road.weight })
    }
  }

  return {
    width,
    height,
    nodes,
    nodeById,
    adjacency,
    roads,
    blockedRoads: roads.filter((road) => road.blocked),
    seed: 'manual',
    obstacleDensity: 0,
  }
}

export function getRoadKey(from: NodeId, to: NodeId): string {
  return from < to ? `${from}|${to}` : `${to}|${from}`
}

export function calculatePathDistance(graph: Graph, path: NodeId[]): number {
  let total = 0

  for (let index = 1; index < path.length; index += 1) {
    const from = path[index - 1]
    const to = path[index]
    const edge = graph.adjacency[from]?.find((candidate) => candidate.to === to)

    if (!edge) {
      return Number.POSITIVE_INFINITY
    }

    total += edge.weight
  }

  return total
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function clampNode(nodeId: NodeId, width: number, height: number, fallback: NodeId): NodeId {
  const parsed = parseNodeId(nodeId)

  if (Number.isNaN(parsed.x) || Number.isNaN(parsed.y)) {
    return fallback
  }

  return toNodeId(clamp(Math.round(parsed.x), 0, width - 1), clamp(Math.round(parsed.y), 0, height - 1))
}

function getProtectedRoadKeys(startNodeId: NodeId, targetNodeId: NodeId): Set<string> {
  const keys = new Set<string>()
  const start = parseNodeId(startNodeId)
  const target = parseNodeId(targetNodeId)
  let x = start.x
  let y = start.y

  while (x !== target.x) {
    const nextX = x + Math.sign(target.x - x)
    keys.add(getRoadKey(toNodeId(x, y), toNodeId(nextX, y)))
    x = nextX
  }

  while (y !== target.y) {
    const nextY = y + Math.sign(target.y - y)
    keys.add(getRoadKey(toNodeId(x, y), toNodeId(x, nextY)))
    y = nextY
  }

  return keys
}
