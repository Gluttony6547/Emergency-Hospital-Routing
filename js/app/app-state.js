import { APP_STATES, MAP_SOURCES, OBJECTIVES } from './constants.js';
import { buildRealSurabayaGraph, withRealHospital } from '../graph/real-surabaya-graph.js';
import { defaultSyntheticScenario, generateSyntheticGraph } from '../graph/synthetic-grid-graph.js';
import { ALGORITHMS } from '../algorithms/registry.js';
import { APP_CONFIG } from './config.js';

export function createInitialState() {
  const realGraph = buildRealSurabayaGraph();
  const syntheticScenario = defaultSyntheticScenario();
  const startupSalt = createSyntheticRuntimeSalt('initial');
  syntheticScenario.sourceNodeId = resolveStartupSyntheticPoint(APP_CONFIG.syntheticDefaults.startPoint, startupSalt, 'source');
  syntheticScenario.targetNodeId = resolveStartupSyntheticPoint(APP_CONFIG.syntheticDefaults.endPoint, startupSalt, 'target');
  const syntheticGraph = generateSyntheticGraph(syntheticScenario);

  return {
    appState: APP_STATES.PREPARED,
    mapSource: MAP_SOURCES.REAL,
    objective: OBJECTIVES.ETA,
    realGraph: withRealHospital(realGraph, realGraph.selectedHospitalId),
    syntheticScenario,
    syntheticGraph,
    syntheticTool: 'start',
    selectedAlgorithmIds: new Set(ALGORITHMS.map((algorithm) => algorithm.id)),
    results: [],
  };
}

export function currentGraph(state) {
  return state.mapSource === MAP_SOURCES.REAL ? state.realGraph : state.syntheticGraph;
}

function createSyntheticRuntimeSalt(reason) {
  return `${reason}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

function resolveStartupSyntheticPoint(value, salt, role) {
  return value === 'random' ? `random:${salt}:${role}` : value;
}
