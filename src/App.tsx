import { useMemo, useState } from 'react'
import { MapView } from './components/MapView'
import { RealMapView } from './components/RealMapView'
import { runBenchmarkSuite } from './lib/benchmark'
import { formatMs, formatNumber, formatPercent } from './lib/format'
import { clampScenario, generateGridGraph, getDefaultScenario, toNodeId } from './lib/graph'
import { buildRealGraph, getHospitalById, getRouteSummary } from './lib/realMap'
import { runAStar, runDijkstra } from './lib/shortestPath'
import type { BenchmarkRow, NodeId, RouteResult, ScenarioConfig } from './lib/types'

type MapMode = 'real' | 'grid'

function App() {
  const realContext = useMemo(() => buildRealGraph(), [])
  const [mapMode, setMapMode] = useState<MapMode>('real')
  const [scenario, setScenario] = useState<ScenarioConfig>(getDefaultScenario)
  const [graph, setGraph] = useState(() => generateGridGraph(getDefaultScenario()))
  const [realStartNodeId, setRealStartNodeId] = useState<NodeId>(realContext.dataset.defaultAmbulanceNodeId)
  const [selectedHospitalId, setSelectedHospitalId] = useState(realContext.dataset.defaultHospitalId)
  const [selectionMode, setSelectionMode] = useState<'start' | 'target'>('start')
  const [dijkstraResult, setDijkstraResult] = useState<RouteResult>()
  const [aStarResult, setAStarResult] = useState<RouteResult>()
  const [benchmarkRows, setBenchmarkRows] = useState<BenchmarkRow[]>(() => runBenchmarkSuite('preview-118', 0.16))
  const selectedHospital = getHospitalById(realContext.dataset, selectedHospitalId)
  const isRealMode = mapMode === 'real'
  const activeGraph = isRealMode ? realContext.graph : graph
  const activeStartNodeId = isRealMode ? realStartNodeId : scenario.startNodeId
  const activeTargetNodeId = isRealMode ? selectedHospital.nearestNodeId : scenario.targetNodeId
  const pathMatch = Boolean(
    dijkstraResult?.success &&
      aStarResult?.success &&
      Math.abs(dijkstraResult.totalDistance - aStarResult.totalDistance) < Number.EPSILON,
  )
  const maxPreviewRuntime = Math.max(
    ...benchmarkRows.flatMap((row) => [row.dijkstraRuntimeMs, row.aStarRuntimeMs]),
    1,
  )
  const graphDensity = useMemo(
    () => activeGraph.blockedRoads.length / Math.max(1, activeGraph.roads.length),
    [activeGraph],
  )

  function resetRouteResults(): void {
    setDijkstraResult(undefined)
    setAStarResult(undefined)
  }

  function changeMapMode(nextMode: MapMode): void {
    setMapMode(nextMode)
    resetRouteResults()
  }

  function updateScenario(patch: Partial<ScenarioConfig>): void {
    setScenario((current) => clampScenario({ ...current, ...patch }))
  }

  function moveEndpoint(endpoint: 'start' | 'target', nodeId: NodeId): void {
    updateScenario(endpoint === 'start' ? { startNodeId: nodeId } : { targetNodeId: nodeId })
    resetRouteResults()
  }

  function moveRealAmbulance(nodeId: NodeId): void {
    setRealStartNodeId(nodeId)
    resetRouteResults()
  }

  function selectHospital(hospitalId: string): void {
    setSelectedHospitalId(hospitalId)
    resetRouteResults()
  }

  function generateScenario(): void {
    const nextScenario = clampScenario(scenario)
    setScenario(nextScenario)
    setGraph(generateGridGraph(nextScenario))
    resetRouteResults()
  }

  function runDijkstraRoute(): void {
    setDijkstraResult(runDijkstra(activeGraph, activeStartNodeId, activeTargetNodeId))
  }

  function runAStarRoute(): void {
    setAStarResult(runAStar(activeGraph, activeStartNodeId, activeTargetNodeId))
  }

  function runBothRoutes(): void {
    setDijkstraResult(runDijkstra(activeGraph, activeStartNodeId, activeTargetNodeId))
    setAStarResult(runAStar(activeGraph, activeStartNodeId, activeTargetNodeId))
  }

  function setPreset(width: number, height: number): void {
    updateScenario({
      width,
      height,
      startNodeId: toNodeId(0, 0),
      targetNodeId: toNodeId(width - 1, height - 1),
    })
  }

  return (
    <main className="app-shell">
      <aside className="panel sidebar" aria-label="Scenario controls">
        <div className="brand">
          <div className="brand-mark">ER</div>
          <div>
            <h1>Emergency Route Planner</h1>
            <p>Dijkstra vs A* on real and reproducible road graphs.</p>
          </div>
        </div>

        <section className="control-group">
          <h2>Map source</h2>
          <div className="segmented">
            <button
              type="button"
              className={isRealMode ? 'active' : ''}
              onClick={() => changeMapMode('real')}
            >
              Real Surabaya
            </button>
            <button
              type="button"
              className={!isRealMode ? 'active' : ''}
              onClick={() => changeMapMode('grid')}
            >
              Synthetic grid
            </button>
          </div>
          <span className="inline-note">
            {isRealMode
              ? 'OpenStreetMap roads and real hospital markers; routing still uses local Dijkstra/A*.'
              : 'Generated grid mode remains available for controlled benchmarks.'}
          </span>
        </section>

        {isRealMode ? (
          <section className="control-group">
            <h2>Real city data</h2>
            <label>
              Hospital destination
              <select value={selectedHospitalId} onChange={(event) => selectHospital(event.target.value)}>
                {realContext.dataset.hospitals.map((hospital) => (
                  <option key={hospital.id} value={hospital.id}>
                    {hospital.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="node-readout">
              <span>Road graph</span>
              <strong>{realContext.graph.nodes.length.toLocaleString()}</strong>
            </div>
            <div className="node-readout">
              <span>Hospitals</span>
              <strong>{realContext.dataset.hospitals.length}</strong>
            </div>
          </section>
        ) : (
          <section className="control-group">
            <h2>Scenario</h2>
            <label>
              Seed
              <input
                value={scenario.seed}
                onChange={(event) => updateScenario({ seed: event.target.value })}
                spellCheck={false}
              />
            </label>

            <div className="two-col">
              <label>
                Width
                <input
                  type="number"
                  min="5"
                  max="125"
                  value={scenario.width}
                  onChange={(event) => updateScenario({ width: Number(event.target.value) })}
                />
              </label>
              <label>
                Height
                <input
                  type="number"
                  min="5"
                  max="80"
                  value={scenario.height}
                  onChange={(event) => updateScenario({ height: Number(event.target.value) })}
                />
              </label>
            </div>

            <label>
              Blocked road density
              <input
                type="range"
                min="0"
                max="0.45"
                step="0.01"
                value={scenario.obstacleDensity}
                onChange={(event) => updateScenario({ obstacleDensity: Number(event.target.value) })}
              />
              <span className="inline-note">{formatPercent(scenario.obstacleDensity)}</span>
            </label>

            <div className="preset-row">
              <button type="button" onClick={() => setPreset(10, 10)}>
                100
              </button>
              <button type="button" onClick={() => setPreset(25, 20)}>
                500
              </button>
              <button type="button" onClick={() => setPreset(40, 25)}>
                1k
              </button>
              <button type="button" onClick={() => setPreset(100, 50)}>
                5k
              </button>
            </div>

            <button type="button" className="primary" onClick={generateScenario}>
              Generate city grid
            </button>
          </section>
        )}

        <section className="control-group">
          <h2>Dispatch points</h2>
          {isRealMode ? (
            <>
              <div className="node-readout">
                <span>Ambulance snap node</span>
                <strong>{realStartNodeId}</strong>
              </div>
              <div className="node-readout">
                <span>Hospital</span>
                <strong>{selectedHospital.name}</strong>
              </div>
              <span className="inline-note">Drag A on the map. Click an H marker or use the dropdown for destination.</span>
            </>
          ) : (
            <>
              <div className="segmented">
                <button
                  type="button"
                  className={selectionMode === 'start' ? 'active' : ''}
                  onClick={() => setSelectionMode('start')}
                >
                  Select ambulance
                </button>
                <button
                  type="button"
                  className={selectionMode === 'target' ? 'active' : ''}
                  onClick={() => setSelectionMode('target')}
                >
                  Select hospital
                </button>
              </div>
              <div className="node-readout">
                <span>Ambulance</span>
                <strong>{scenario.startNodeId}</strong>
              </div>
              <div className="node-readout">
                <span>Hospital</span>
                <strong>{scenario.targetNodeId}</strong>
              </div>
            </>
          )}
        </section>

        <section className="control-group">
          <h2>Algorithms</h2>
          <button type="button" onClick={runDijkstraRoute}>
            Run Dijkstra
          </button>
          <button type="button" onClick={runAStarRoute}>
            Run A*
          </button>
          <button type="button" className="primary" onClick={runBothRoutes}>
            Run both
          </button>
        </section>
      </aside>

      <section className="map-area">
        {isRealMode ? (
          <RealMapView
            context={realContext}
            ambulanceNodeId={realStartNodeId}
            selectedHospitalId={selectedHospitalId}
            dijkstraResult={dijkstraResult}
            aStarResult={aStarResult}
            onMoveAmbulance={moveRealAmbulance}
            onSelectHospital={selectHospital}
          />
        ) : (
          <MapView
            graph={graph}
            startNodeId={scenario.startNodeId}
            targetNodeId={scenario.targetNodeId}
            dijkstraResult={dijkstraResult}
            aStarResult={aStarResult}
            selectionMode={selectionMode}
            onMoveEndpoint={moveEndpoint}
          />
        )}
      </section>

      <aside className="panel analytics" aria-label="Algorithm analysis">
        <section>
          <h2>Route metrics</h2>
          <MetricCard title={isRealMode ? 'Dijkstra ETA' : 'Dijkstra distance'} value={getRouteSummary(dijkstraResult, isRealMode)} />
          <MetricCard title={isRealMode ? 'A* ETA' : 'A* distance'} value={getRouteSummary(aStarResult, isRealMode)} />
          <MetricCard title="Path match" value={pathMatch ? 'yes' : 'pending'} tone={pathMatch ? 'good' : 'neutral'} />
          {isRealMode ? (
            <MetricCard
              title="Real data"
              value={`${realContext.dataset.hospitals.length} hospitals`}
              hint="OpenStreetMap road graph"
            />
          ) : (
            <MetricCard
              title="Blocked density"
              value={formatPercent(graphDensity)}
              hint={`${activeGraph.blockedRoads.length} of ${activeGraph.roads.length} roads`}
            />
          )}
        </section>

        <section>
          <h2>Runtime</h2>
          <ResultRow result={dijkstraResult} />
          <ResultRow result={aStarResult} />
        </section>

        <section>
          <div className="section-heading">
            <h2>Benchmark preview</h2>
            <button
              type="button"
              onClick={() => setBenchmarkRows(runBenchmarkSuite(scenario.seed, scenario.obstacleDensity))}
            >
              Refresh
            </button>
          </div>
          <div className="chart" aria-label="Runtime benchmark preview">
            {benchmarkRows.map((row) => (
              <div className="chart-row" key={row.label}>
                <span>{row.nodes}</span>
                <div className="bar-track">
                  <div
                    className="bar bar-dijkstra"
                    style={{ width: `${Math.max(3, (row.dijkstraRuntimeMs / maxPreviewRuntime) * 100)}%` }}
                  />
                  <div
                    className="bar bar-astar"
                    style={{ width: `${Math.max(3, (row.aStarRuntimeMs / maxPreviewRuntime) * 100)}%` }}
                  />
                </div>
                <strong>{row.pathMatch ? 'ok' : 'fail'}</strong>
              </div>
            ))}
          </div>
        </section>
      </aside>

      <footer className="status-bar">
        <span>{isRealMode ? realContext.dataset.label : `Seed ${graph.seed}`}</span>
        <span>{activeGraph.nodes.length.toLocaleString()} nodes</span>
        <span>{activeGraph.roads.length.toLocaleString()} roads</span>
        <span>Run npm test and npm run benchmark for reproducible checks.</span>
      </footer>
    </main>
  )
}

interface MetricCardProps {
  title: string
  value: string
  hint?: string
  tone?: 'good' | 'neutral'
}

function MetricCard({ title, value, hint, tone = 'neutral' }: MetricCardProps) {
  return (
    <div className={`metric-card ${tone}`}>
      <span>{title}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </div>
  )
}

function ResultRow({ result }: { result?: RouteResult }) {
  return (
    <div className="result-row">
      <div>
        <strong>{result?.algorithm ?? 'Pending'}</strong>
        <span>{result?.message ?? 'Run an algorithm to populate metrics.'}</span>
      </div>
      <dl>
        <div>
          <dt>Visited</dt>
          <dd>{result ? formatNumber(result.visitedCount) : '-'}</dd>
        </div>
        <div>
          <dt>Runtime</dt>
          <dd>{result ? formatMs(result.runtimeMs) : '-'}</dd>
        </div>
      </dl>
    </div>
  )
}

export default App
