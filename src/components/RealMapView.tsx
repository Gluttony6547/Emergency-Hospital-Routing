import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  findNearestRealNode,
  getHospitalById,
  getRouteCoordinates,
  type RealGraphContext,
} from '../lib/realMap'
import type { NodeId, RouteResult } from '../lib/types'

interface RealMapViewProps {
  context: RealGraphContext
  ambulanceNodeId: NodeId
  selectedHospitalId: string
  dijkstraResult?: RouteResult
  aStarResult?: RouteResult
  onMoveAmbulance: (nodeId: NodeId) => void
  onSelectHospital: (hospitalId: string) => void
}

export function RealMapView({
  context,
  ambulanceNodeId,
  selectedHospitalId,
  dijkstraResult,
  aStarResult,
  onMoveAmbulance,
  onSelectHospital,
}: RealMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | undefined>(undefined)
  const roadLayerRef = useRef<L.LayerGroup | undefined>(undefined)
  const dynamicLayerRef = useRef<L.LayerGroup | undefined>(undefined)
  const [mapReady, setMapReady] = useState(false)
  const selectedHospital = getHospitalById(context.dataset, selectedHospitalId)
  const ambulanceCoordinate = context.coordinatesByNodeId[ambulanceNodeId]

  useEffect(() => {
    if (!containerRef.current || mapRef.current || isJsdomRuntime()) {
      return
    }

    const map = L.map(containerRef.current, {
      attributionControl: true,
      preferCanvas: true,
      zoomControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    roadLayerRef.current = L.layerGroup().addTo(map)
    dynamicLayerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map

    const bounds = L.latLngBounds(context.dataset.bounds)
    map.fitBounds(bounds, { padding: [14, 14] })

    for (const [highway, coordinates] of context.dataset.displayWays) {
      L.polyline(coordinates, {
        color: getRoadColor(highway),
        opacity: 0.36,
        weight: highway === 'primary' ? 2.2 : 1.6,
      }).addTo(roadLayerRef.current)
    }

    setMapReady(true)

    return () => {
      setMapReady(false)
      map.remove()
      mapRef.current = undefined
      roadLayerRef.current = undefined
      dynamicLayerRef.current = undefined
    }
  }, [context])

  useEffect(() => {
    if (!mapReady || !mapRef.current || !dynamicLayerRef.current || !ambulanceCoordinate) {
      return
    }

    const layer = dynamicLayerRef.current
    layer.clearLayers()

    addRoutePolyline(layer, dijkstraResult, context, '#30e7ff', 5)
    addRoutePolyline(layer, aStarResult, context, '#ffd166', 3, '8 6')

    const ambulanceMarker = L.marker([ambulanceCoordinate.lat, ambulanceCoordinate.lng], {
      draggable: true,
      icon: createEndpointIcon('A', 'real-ambulance-marker', 'real-ambulance-icon'),
      zIndexOffset: 800,
    })

    ambulanceMarker.on('dragend', () => {
      const latLng = ambulanceMarker.getLatLng()
      onMoveAmbulance(findNearestRealNode(context.dataset, latLng.lat, latLng.lng))
    })

    ambulanceMarker.bindTooltip('Drag ambulance, then release to snap onto nearest road node.', {
      direction: 'top',
      offset: [0, -18],
    })
    ambulanceMarker.addTo(layer)

    for (const hospital of context.dataset.hospitals) {
      const isSelected = hospital.id === selectedHospitalId
      const marker = L.marker([hospital.lat, hospital.lng], {
        icon: createEndpointIcon(
          'H',
          `real-hospital-marker ${isSelected ? 'selected' : ''}`,
          `real-hospital-icon ${isSelected ? 'selected' : ''}`,
          hospital.id,
        ),
        zIndexOffset: isSelected ? 700 : 300,
      })

      marker.on('click', () => onSelectHospital(hospital.id))
      marker.bindTooltip(hospital.name, { direction: 'top', offset: [0, -18] })
      marker.addTo(layer)
    }

    L.circleMarker([selectedHospital.lat, selectedHospital.lng], {
      color: '#3dff9f',
      fillColor: '#3dff9f',
      fillOpacity: 0.14,
      radius: 24,
      weight: 2,
    }).addTo(layer)
  }, [
    aStarResult,
    ambulanceCoordinate,
    ambulanceNodeId,
    context,
    dijkstraResult,
    mapReady,
    onMoveAmbulance,
    onSelectHospital,
    selectedHospital,
    selectedHospitalId,
  ])

  return (
    <div className="map-shell real-map-shell" aria-label="Real Surabaya emergency route map">
      <div className="map-toolbar">
        <span>Real OSM map</span>
        <span>{context.dataset.hospitals.length} hospitals</span>
        <span>{context.graph.nodes.length.toLocaleString()} road nodes</span>
      </div>

      <div ref={containerRef} className="leaflet-map" data-testid="real-route-map" />

      <div className="map-hint">
        Drag the ambulance marker to snap onto the nearest road node. Click a hospital marker to set the destination.
      </div>
    </div>
  )
}

function addRoutePolyline(
  layer: L.LayerGroup,
  result: RouteResult | undefined,
  context: RealGraphContext,
  color: string,
  weight: number,
  dashArray?: string,
): void {
  if (!result?.success || result.path.length === 0) {
    return
  }

  L.polyline(getRouteCoordinates(result.path, context.coordinatesByNodeId), {
    color,
    dashArray,
    opacity: 0.92,
    weight,
  }).addTo(layer)
}

function createEndpointIcon(label: string, className: string, testId: string, hospitalId?: string): L.DivIcon {
  const hospitalAttribute = hospitalId ? ` data-hospital-id="${hospitalId}"` : ''

  return L.divIcon({
    className: 'real-marker-shell',
    html: `<div class="${className}" data-testid="${testId}"${hospitalAttribute}>${label}</div>`,
    iconAnchor: [16, 16],
    iconSize: [32, 32],
  })
}

function getRoadColor(highway: string): string {
  if (highway === 'primary') {
    return '#30e7ff'
  }

  if (highway === 'secondary') {
    return '#3dff9f'
  }

  return '#ffd166'
}

function isJsdomRuntime(): boolean {
  return typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('jsdom')
}
