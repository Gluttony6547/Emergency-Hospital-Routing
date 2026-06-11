import { describe, expect, it } from 'vitest'
import { generateGridGraph, getRoadKey, makeManualGraph, toNodeId } from './graph'
import { runAStar, runDijkstra } from './shortestPath'
import type { GraphNode, GraphRoad } from './types'

describe('shortest path algorithms', () => {
  it('Dijkstra returns the correct shortest path on a known graph', () => {
    const nodes: GraphNode[] = [
      { id: 'A', x: 0, y: 0 },
      { id: 'B', x: 1, y: 0 },
      { id: 'C', x: 0, y: 1 },
      { id: 'D', x: 1, y: 1 },
    ]
    const roads: GraphRoad[] = [
      { from: 'A', to: 'B', weight: 8, blocked: false },
      { from: 'A', to: 'C', weight: 2, blocked: false },
      { from: 'C', to: 'D', weight: 2, blocked: false },
      { from: 'B', to: 'D', weight: 1, blocked: false },
    ]
    const graph = makeManualGraph(nodes, roads)
    const result = runDijkstra(graph, 'A', 'D')

    expect(result.success).toBe(true)
    expect(result.totalDistance).toBe(4)
    expect(result.path).toEqual(['A', 'C', 'D'])
  })

  it('A* returns the same distance as Dijkstra on seeded grid graphs', () => {
    const graph = generateGridGraph({
      width: 25,
      height: 20,
      obstacleDensity: 0.2,
      seed: 'same-distance',
      startNodeId: toNodeId(0, 0),
      targetNodeId: toNodeId(24, 19),
    })
    const dijkstra = runDijkstra(graph, toNodeId(0, 0), toNodeId(24, 19))
    const aStar = runAStar(graph, toNodeId(0, 0), toNodeId(24, 19))

    expect(dijkstra.success).toBe(true)
    expect(aStar.success).toBe(true)
    expect(aStar.totalDistance).toBe(dijkstra.totalDistance)
  })

  it('blocked roads are not used by the computed path', () => {
    const nodes: GraphNode[] = [
      { id: 'A', x: 0, y: 0 },
      { id: 'B', x: 1, y: 0 },
      { id: 'C', x: 0, y: 1 },
      { id: 'D', x: 1, y: 1 },
    ]
    const blockedRoad: GraphRoad = { from: 'A', to: 'B', weight: 1, blocked: true }
    const roads: GraphRoad[] = [
      blockedRoad,
      { from: 'A', to: 'C', weight: 2, blocked: false },
      { from: 'C', to: 'D', weight: 2, blocked: false },
      { from: 'D', to: 'B', weight: 2, blocked: false },
    ]
    const graph = makeManualGraph(nodes, roads)
    const result = runDijkstra(graph, 'A', 'B')
    const usedRoads = new Set(result.path.slice(1).map((node, index) => getRoadKey(result.path[index], node)))

    expect(result.success).toBe(true)
    expect(usedRoads.has(getRoadKey(blockedRoad.from, blockedRoad.to))).toBe(false)
  })

  it('unreachable targets return a clean failure state', () => {
    const graph = makeManualGraph(
      [
        { id: 'A', x: 0, y: 0 },
        { id: 'B', x: 1, y: 0 },
      ],
      [],
    )
    const result = runDijkstra(graph, 'A', 'B')

    expect(result.success).toBe(false)
    expect(result.path).toEqual([])
    expect(result.totalDistance).toBe(Number.POSITIVE_INFINITY)
  })

  it('seeded graph generation is deterministic', () => {
    const config = {
      width: 12,
      height: 10,
      obstacleDensity: 0.24,
      seed: 'repeatable',
      startNodeId: toNodeId(0, 0),
      targetNodeId: toNodeId(11, 9),
    }
    const first = generateGridGraph(config)
    const second = generateGridGraph(config)

    expect(second.roads).toEqual(first.roads)
    expect(second.blockedRoads).toEqual(first.blockedRoads)
  })
})
