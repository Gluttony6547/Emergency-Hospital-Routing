export type NodeId = string

export interface GraphNode {
  id: NodeId
  x: number
  y: number
}

export interface GraphEdge {
  to: NodeId
  weight: number
}

export interface GraphRoad {
  from: NodeId
  to: NodeId
  weight: number
  blocked: boolean
}

export interface Graph {
  width: number
  height: number
  nodes: GraphNode[]
  nodeById: Record<NodeId, GraphNode>
  adjacency: Record<NodeId, GraphEdge[]>
  roads: GraphRoad[]
  blockedRoads: GraphRoad[]
  seed: string
  obstacleDensity: number
}

export interface ScenarioConfig {
  width: number
  height: number
  obstacleDensity: number
  seed: string
  startNodeId: NodeId
  targetNodeId: NodeId
}

export interface RouteResult {
  algorithm: 'Dijkstra' | 'A*'
  path: NodeId[]
  totalDistance: number
  visitedCount: number
  runtimeMs: number
  success: boolean
  message: string
}

export interface BenchmarkRow {
  label: string
  nodes: number
  roads: number
  blockedRoads: number
  seed: string
  dijkstraDistance: number
  aStarDistance: number
  dijkstraRuntimeMs: number
  aStarRuntimeMs: number
  dijkstraVisited: number
  aStarVisited: number
  pathMatch: boolean
}
