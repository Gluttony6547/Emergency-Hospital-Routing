import { SURABAYA_REAL_MAP, type RealHospital, type RealMapDataset } from '../data/surabayaRealMap'
import type { Graph, GraphEdge, GraphNode, GraphRoad, NodeId, RouteResult } from './types'

export interface RealNodeCoordinate {
  lat: number
  lng: number
}

export interface RealGraphContext {
  dataset: RealMapDataset
  graph: Graph
  coordinatesByNodeId: Record<NodeId, RealNodeCoordinate>
}

export const REAL_MAP_DATASET = SURABAYA_REAL_MAP

export function buildRealGraph(dataset: RealMapDataset = REAL_MAP_DATASET): RealGraphContext {
  const nodes: GraphNode[] = []
  const nodeById: Record<NodeId, GraphNode> = {}
  const adjacency: Record<NodeId, GraphEdge[]> = {}
  const coordinatesByNodeId: Record<NodeId, RealNodeCoordinate> = {}

  for (const [id, lat, lng, x, y] of dataset.nodes) {
    const node = { id, x, y }
    nodes.push(node)
    nodeById[id] = node
    adjacency[id] = []
    coordinatesByNodeId[id] = { lat, lng }
  }

  const roads: GraphRoad[] = []

  for (const [from, to, etaSeconds, , oneWay] of dataset.edges) {
    if (!adjacency[from] || !adjacency[to]) {
      continue
    }

    roads.push({ from, to, weight: etaSeconds, blocked: false })
    adjacency[from].push({ to, weight: etaSeconds })

    if (!oneWay) {
      adjacency[to].push({ to: from, weight: etaSeconds })
    }
  }

  return {
    dataset,
    graph: {
      width: dataset.bounds[1][1] - dataset.bounds[0][1],
      height: dataset.bounds[1][0] - dataset.bounds[0][0],
      nodes,
      nodeById,
      adjacency,
      roads,
      blockedRoads: [],
      seed: dataset.id,
      obstacleDensity: 0,
    },
    coordinatesByNodeId,
  }
}

export function findNearestRealNode(dataset: RealMapDataset, lat: number, lng: number): NodeId {
  let bestNodeId = dataset.defaultAmbulanceNodeId
  let bestScore = Number.POSITIVE_INFINITY

  for (const [nodeId, nodeLat, nodeLng] of dataset.nodes) {
    const latDelta = nodeLat - lat
    const lngDelta = nodeLng - lng
    const score = latDelta * latDelta + lngDelta * lngDelta

    if (score < bestScore) {
      bestNodeId = nodeId
      bestScore = score
    }
  }

  return bestNodeId
}

export function getHospitalById(dataset: RealMapDataset, hospitalId: string): RealHospital {
  return dataset.hospitals.find((hospital) => hospital.id === hospitalId) ?? dataset.hospitals[0]
}

export function getRouteCoordinates(
  path: NodeId[],
  coordinatesByNodeId: Record<NodeId, RealNodeCoordinate>,
): Array<[number, number]> {
  return path
    .map((nodeId) => coordinatesByNodeId[nodeId])
    .filter((coordinate): coordinate is RealNodeCoordinate => Boolean(coordinate))
    .map((coordinate) => [coordinate.lat, coordinate.lng])
}

export function formatEta(seconds: number): string {
  if (!Number.isFinite(seconds)) {
    return '-'
  }

  if (seconds < 60) {
    return `${seconds.toFixed(0)} sec`
  }

  return `${(seconds / 60).toFixed(1)} min`
}

export function getRouteSummary(result?: RouteResult, realMode = false): string {
  if (!result) {
    return '-'
  }

  return realMode ? formatEta(result.totalDistance) : result.totalDistance.toLocaleString()
}
