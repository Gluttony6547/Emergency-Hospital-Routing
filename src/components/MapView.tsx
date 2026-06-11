import { useRef, useState, type PointerEvent } from 'react'
import { parseNodeId, toNodeId } from '../lib/graph'
import type { Graph, NodeId, RouteResult } from '../lib/types'

type EndpointKind = 'start' | 'target'

interface MapViewProps {
  graph: Graph
  startNodeId: NodeId
  targetNodeId: NodeId
  dijkstraResult?: RouteResult
  aStarResult?: RouteResult
  selectionMode: EndpointKind
  onMoveEndpoint: (endpoint: EndpointKind, nodeId: NodeId) => void
}

export function MapView({
  graph,
  startNodeId,
  targetNodeId,
  dijkstraResult,
  aStarResult,
  selectionMode,
  onMoveEndpoint,
}: MapViewProps) {
  const draggingRef = useRef<EndpointKind | undefined>(undefined)
  const [dragging, setDragging] = useState<EndpointKind>()
  const [dropPreview, setDropPreview] = useState<{ endpoint: EndpointKind; nodeId: NodeId }>()
  const dijkstraPath = dijkstraResult?.path ?? []
  const aStarPath = aStarResult?.path ?? []
  const start = parseNodeId(startNodeId)
  const target = parseNodeId(targetNodeId)
  const previewNode = dropPreview ? graph.nodeById[dropPreview.nodeId] : undefined

  function beginDrag(endpoint: EndpointKind, event: PointerEvent<SVGGElement>): void {
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    draggingRef.current = endpoint
    setDragging(endpoint)
    moveEndpointFromPointer(endpoint, event)
  }

  function continueDrag(endpoint: EndpointKind, event: PointerEvent<SVGGElement>): void {
    if (draggingRef.current !== endpoint) {
      return
    }

    event.preventDefault()
    moveEndpointFromPointer(endpoint, event)
  }

  function endDrag(endpoint: EndpointKind, event: PointerEvent<SVGGElement>): void {
    if (draggingRef.current !== endpoint) {
      return
    }

    event.preventDefault()
    moveEndpointFromPointer(endpoint, event)

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    draggingRef.current = undefined
    setDragging(undefined)
    setDropPreview(undefined)
  }

  function cancelDrag(event: PointerEvent<SVGGElement>): void {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    draggingRef.current = undefined
    setDragging(undefined)
    setDropPreview(undefined)
  }

  function moveEndpointFromPointer(endpoint: EndpointKind, event: PointerEvent<SVGGElement>): void {
    const svg = event.currentTarget.ownerSVGElement
    const nodeId = svg ? getPickedNode(svg, event.clientX, event.clientY, graph.width, graph.height) : undefined

    if (!nodeId) {
      return
    }

    const currentNodeId = endpoint === 'start' ? startNodeId : targetNodeId
    setDropPreview({ endpoint, nodeId })

    if (nodeId !== currentNodeId) {
      onMoveEndpoint(endpoint, nodeId)
    }
  }

  return (
    <div className="map-shell" aria-label="Generated city grid route map">
      <div className="map-toolbar">
        <span>City grid</span>
        <span>
          {graph.width} x {graph.height}
        </span>
        <span>{graph.blockedRoads.length} blocked roads</span>
      </div>

      <svg
        className={`route-map ${dragging ? 'dragging-route' : ''}`}
        viewBox={`0 0 ${graph.width} ${graph.height}`}
        role="img"
        aria-label="Node-cell road grid with ambulance and hospital route"
        data-testid="route-map"
      >
        <defs>
          <filter id="cyan-glow">
            <feGaussianBlur stdDeviation="0.12" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="amber-glow">
            <feGaussianBlur stdDeviation="0.14" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect x="0" y="0" width={graph.width} height={graph.height} rx="0.28" className="map-bg" />

        {graph.nodes.map((node) => (
          <rect
            key={node.id}
            x={node.x + 0.08}
            y={node.y + 0.08}
            width="0.84"
            height="0.84"
            rx="0.08"
            className="node-tile"
            data-testid="map-node-tile"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {dijkstraPath.map((nodeId, index) => {
          const node = graph.nodeById[nodeId]

          if (!node) {
            return null
          }

          return (
            <rect
              key={`dijkstra-${nodeId}-${index}`}
              x={node.x + 0.13}
              y={node.y + 0.13}
              width="0.74"
              height="0.74"
              rx="0.08"
              className="path-tile path-tile-dijkstra"
              data-testid="dijkstra-route-tile"
              vectorEffect="non-scaling-stroke"
            />
          )
        })}

        {aStarPath.map((nodeId, index) => {
          const node = graph.nodeById[nodeId]

          if (!node) {
            return null
          }

          return (
            <rect
              key={`astar-${nodeId}-${index}`}
              x={node.x + 0.27}
              y={node.y + 0.27}
              width="0.46"
              height="0.46"
              rx="0.06"
              className="path-tile path-tile-astar"
              data-testid="astar-route-tile"
              vectorEffect="non-scaling-stroke"
            />
          )
        })}

        {graph.blockedRoads.map((road) => {
          const from = graph.nodeById[road.from]
          const to = graph.nodeById[road.to]
          const barrier = getBarrierLine(from, to)

          return (
            <line
              key={`${road.from}-${road.to}`}
              x1={barrier.x1}
              y1={barrier.y1}
              x2={barrier.x2}
              y2={barrier.y2}
              className="road road-blocked"
              vectorEffect="non-scaling-stroke"
            />
          )
        })}

        {dropPreview && previewNode && (
          <rect
            x={previewNode.x + 0.04}
            y={previewNode.y + 0.04}
            width="0.92"
            height="0.92"
            rx="0.09"
            className={`drop-preview drop-preview-${dropPreview.endpoint}`}
            vectorEffect="non-scaling-stroke"
          />
        )}

        <EndpointMarker
          endpoint="start"
          label="A"
          node={start}
          selected={selectionMode === 'start'}
          dragging={dragging === 'start'}
          onPointerDown={beginDrag}
          onPointerMove={continueDrag}
          onPointerUp={endDrag}
          onPointerCancel={cancelDrag}
        />

        <EndpointMarker
          endpoint="target"
          label="H"
          node={target}
          selected={selectionMode === 'target'}
          dragging={dragging === 'target'}
          onPointerDown={beginDrag}
          onPointerMove={continueDrag}
          onPointerUp={endDrag}
          onPointerCancel={cancelDrag}
        />
      </svg>

      <div className="map-hint">
        Drag the A or H endpoint square onto a cell. Selected endpoint:{' '}
        {selectionMode === 'start' ? 'ambulance' : 'hospital'}.
      </div>
    </div>
  )
}

interface EndpointMarkerProps {
  endpoint: EndpointKind
  label: 'A' | 'H'
  node: { x: number; y: number }
  selected: boolean
  dragging: boolean
  onPointerDown: (endpoint: EndpointKind, event: PointerEvent<SVGGElement>) => void
  onPointerMove: (endpoint: EndpointKind, event: PointerEvent<SVGGElement>) => void
  onPointerUp: (endpoint: EndpointKind, event: PointerEvent<SVGGElement>) => void
  onPointerCancel: (event: PointerEvent<SVGGElement>) => void
}

function EndpointMarker({
  endpoint,
  label,
  node,
  selected,
  dragging,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: EndpointMarkerProps) {
  const isStart = endpoint === 'start'
  const testId = isStart ? 'ambulance-endpoint' : 'hospital-endpoint'
  const dragHandleTestId = isStart ? 'ambulance-drag-handle' : 'hospital-drag-handle'

  return (
    <g
      className={`endpoint-group ${selected ? 'endpoint-selected' : ''} ${dragging ? 'endpoint-dragging' : ''}`}
      data-testid={dragHandleTestId}
      aria-label={`Drag ${isStart ? 'ambulance' : 'hospital'} endpoint`}
      role="button"
      tabIndex={0}
      onPointerDown={(event) => onPointerDown(endpoint, event)}
      onPointerMove={(event) => onPointerMove(endpoint, event)}
      onPointerUp={(event) => onPointerUp(endpoint, event)}
      onPointerCancel={onPointerCancel}
    >
      <rect x={node.x} y={node.y} width="1" height="1" rx="0.1" className="endpoint-hitbox" />
      <rect
        x={node.x + 0.09}
        y={node.y + 0.09}
        width="0.82"
        height="0.82"
        rx="0.08"
        className={`endpoint-square ${isStart ? 'endpoint-start' : 'endpoint-target'}`}
        data-testid={testId}
        vectorEffect="non-scaling-stroke"
      />
      <text x={node.x + 0.5} y={node.y + 0.61} className="endpoint-label" aria-hidden="true">
        {label}
      </text>
    </g>
  )
}

function getPickedNode(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
  width: number,
  height: number,
): NodeId | undefined {
  const screenMatrix = svg.getScreenCTM()

  if (!screenMatrix) {
    return undefined
  }

  const point = svg.createSVGPoint()
  point.x = clientX
  point.y = clientY

  const mappedPoint = point.matrixTransform(screenMatrix.inverse())
  const x = clamp(Math.floor(mappedPoint.x), 0, width - 1)
  const y = clamp(Math.floor(mappedPoint.y), 0, height - 1)

  return toNodeId(x, y)
}

function getBarrierLine(
  from: { x: number; y: number },
  to: { x: number; y: number },
): { x1: number; y1: number; x2: number; y2: number } {
  if (from.y === to.y && Math.abs(from.x - to.x) === 1) {
    const x = Math.max(from.x, to.x)
    return { x1: x, y1: from.y + 0.18, x2: x, y2: from.y + 0.82 }
  }

  if (from.x === to.x && Math.abs(from.y - to.y) === 1) {
    const y = Math.max(from.y, to.y)
    return { x1: from.x + 0.18, y1: y, x2: from.x + 0.82, y2: y }
  }

  return {
    x1: from.x + 0.5,
    y1: from.y + 0.5,
    x2: to.x + 0.5,
    y2: to.y + 0.5,
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
