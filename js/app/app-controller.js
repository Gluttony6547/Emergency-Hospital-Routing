import { ALGORITHMS, getAlgorithmById } from '../algorithms/registry.js';
import { ViewerManager } from '../viewers/viewer-manager.js';
import { attachComparisonMetrics, validationSummary } from '../results/metrics.js';
import { renderBenchmarkPreview, renderResults } from '../results/results-panel.js';
import { buildRealSurabayaGraph, getHospitalById, withRealHospital, withRealSourceNode } from '../graph/real-surabaya-graph.js';
import { clampSyntheticScenario, generateSyntheticGraph, scenarioForSize } from '../graph/synthetic-grid-graph.js';
import { currentGraph } from './app-state.js';
import { APP_STATES, MAP_SOURCES, OBJECTIVES } from './constants.js';
import { APP_CONFIG } from './config.js';
import { objectiveLabel } from '../utils/format.js';

export class AppController {
  constructor(state, dom) {
    this.state = state;
    this.dom = dom;
    this.viewerManager = new ViewerManager(dom.viewerGrid);
    this.syntheticRandomCounter = 0;
  }

  init() {
    this.renderAlgorithmSelector();
    this.populateHospitals();
    this.bindEvents();
    this.renderAll();
    renderBenchmarkPreview(this.dom.benchmarkPreview);
  }

  bindEvents() {
    this.dom.mapSourceTabs.addEventListener('click', (event) => {
      const button = event.target.closest('[data-map-source]');
      if (!button) return;
      this.state.mapSource = button.dataset.mapSource;
      this.resetResultsToPrepared();
      this.renderAll();
    });

    this.dom.objectiveTabs.addEventListener('click', (event) => {
      const button = event.target.closest('[data-objective]');
      if (!button) return;
      this.state.objective = button.dataset.objective;
      this.resetResultsToPrepared();
      this.renderAll();
    });

    this.dom.hospitalSelect.addEventListener('change', () => {
      this.state.realGraph = withRealHospital(this.state.realGraph, this.dom.hospitalSelect.value);
      this.resetResultsToPrepared();
      this.renderAll();
    });

    this.dom.densityInput.addEventListener('input', () => {
      this.dom.densityLabel.textContent = `${this.dom.densityInput.value}%`;
    });

    this.dom.generateGridBtn.addEventListener('click', () => {
      const scenario = clampSyntheticScenario({
        seed: this.dom.seedInput.value,
        width: Number(this.dom.widthInput.value),
        height: Number(this.dom.heightInput.value),
        blockedDensity: Number(this.dom.densityInput.value) / 100,
        sourceNodeId: this.state.syntheticGraph.sourceNodeId,
        targetNodeId: this.state.syntheticGraph.targetNodeId,
      });
      this.state.syntheticScenario = scenario;
      this.state.syntheticGraph = generateSyntheticGraph(scenario);
      this.resetResultsToPrepared();
      this.renderAll();
    });

    this.dom.resetRealStartBtn.addEventListener('click', () => {
      this.state.realGraph = withRealSourceNode(this.state.realGraph, null);
      this.resetResultsToPrepared();
      this.renderAll();
    });

    this.dom.resetGridBtn.addEventListener('click', () => {
      const scenario = clampSyntheticScenario({
        seed: this.dom.seedInput.value,
        width: Number(this.dom.widthInput.value),
        height: Number(this.dom.heightInput.value),
        blockedDensity: Number(this.dom.densityInput.value) / 100,
        sourceNodeId: this.getSyntheticDefaultPoint('source'),
        targetNodeId: this.getSyntheticDefaultPoint('target'),
      });
      this.state.syntheticScenario = scenario;
      this.state.syntheticGraph = generateSyntheticGraph(scenario);
      this.resetResultsToPrepared();
      this.renderAll();
    });

    document.querySelectorAll('[data-size]').forEach((button) => {
      button.addEventListener('click', () => {
        const scenario = scenarioForSize(Number(button.dataset.size), this.dom.seedInput.value || 'surabaya-118', Number(this.dom.densityInput.value) / 100);
        scenario.sourceNodeId = this.getSyntheticDefaultPoint('source');
        scenario.targetNodeId = this.getSyntheticDefaultPoint('target');
        this.dom.widthInput.value = String(scenario.width);
        this.dom.heightInput.value = String(scenario.height);
        this.state.syntheticScenario = scenario;
        this.state.syntheticGraph = generateSyntheticGraph(scenario);
        this.resetResultsToPrepared();
        this.renderAll();
      });
    });

    this.dom.syntheticToolTabs.addEventListener('click', (event) => {
      const button = event.target.closest('[data-tool]');
      if (!button) return;
      this.state.syntheticTool = button.dataset.tool;
      this.renderPanelsOnly();
    });

    this.dom.algorithmList.addEventListener('change', () => {
      const ids = new Set();
      this.dom.algorithmList.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
        if (checkbox.checked) ids.add(checkbox.value);
      });
      this.state.selectedAlgorithmIds = ids;
      this.renderAlgorithmToggleButton();
    });

    this.dom.toggleAlgorithmsBtn.addEventListener('click', () => {
      const allSelected = this.state.selectedAlgorithmIds.size === ALGORITHMS.length;
      this.state.selectedAlgorithmIds = new Set(allSelected ? [] : ALGORITHMS.map((algorithm) => algorithm.id));
      this.renderAlgorithmSelector();
    });

    this.dom.runBtn.addEventListener('click', () => this.runSelectedAlgorithms());
    this.dom.refreshBenchmarkBtn.addEventListener('click', () => renderBenchmarkPreview(this.dom.benchmarkPreview));
  }

  renderAll() {
    this.renderPanelsOnly();
    this.renderPrepareViewer();
    this.renderResults();
  }

  renderPanelsOnly() {
    const graph = currentGraph(this.state);
    this.dom.mapSourceTabs.querySelectorAll('[data-map-source]').forEach((button) => {
      button.classList.toggle('active', button.dataset.mapSource === this.state.mapSource);
    });
    this.dom.objectiveTabs.querySelectorAll('[data-objective]').forEach((button) => {
      button.classList.toggle('active', button.dataset.objective === this.state.objective);
    });
    this.dom.syntheticToolTabs.querySelectorAll('[data-tool]').forEach((button) => {
      button.classList.toggle('active', button.dataset.tool === this.state.syntheticTool);
    });

    const real = this.state.mapSource === MAP_SOURCES.REAL;
    this.dom.realEditor.classList.toggle('hidden', !real);
    this.dom.syntheticEditor.classList.toggle('hidden', real);
    this.dom.mapSourceNote.textContent = real
      ? 'OpenStreetMap roads and real hospital markers.'
      : 'Generated graph for controlled benchmarks and manual obstacle edits.';

    this.dom.realNodeCount.textContent = this.state.realGraph.nodes.length.toLocaleString('en-US');
    this.dom.realHospitalCount.textContent = String(this.state.realGraph.hospitals.length);
    this.dom.realInstruction.textContent = this.state.realGraph.sourceNodeId
      ? 'Drag A to change the starting point, or click another area to move it.'
      : 'Determine your starting point by clicking on the map area.';
    this.dom.resetRealStartBtn.disabled = !this.state.realGraph.sourceNodeId;

    const toolInstruction = {
      start: 'Click a cell to place the ambulance, then drag A to move it.',
      target: 'Click a cell to place the hospital target, then drag H to move it.',
      'toggle-block': 'Click a cell to toggle one nearby blocked road.',
    }[this.state.syntheticTool];
    this.dom.syntheticInstruction.textContent = toolInstruction;

    this.dom.statePill.textContent = this.state.appState;
    this.dom.graphPill.textContent = `${graph.nodes.length.toLocaleString('en-US')} nodes`;
    this.dom.objectivePill.textContent = objectiveLabel(this.state.objective);
    this.dom.footerGraphInfo.textContent = `${graph.label} • ${graph.nodes.length.toLocaleString('en-US')} nodes • ${graph.roads.length.toLocaleString('en-US')} roads`;
  }

  renderPrepareViewer() {
    const graph = currentGraph(this.state);
    this.state.appState = APP_STATES.PREPARED;
    this.dom.viewerTitle.textContent = 'Prepared viewer';
    this.dom.statusText.textContent = this.state.mapSource === MAP_SOURCES.REAL
      ? (graph.sourceNodeId ? 'Start point selected. You can drag A or click another area.' : 'Determine your starting point by clicking on the real map.')
      : 'Edit synthetic grid endpoints or blocked roads, then run selected algorithms.';
    this.dom.viewerFooter.textContent = this.dom.statusText.textContent;

    this.viewerManager.showPrepareViewer({
      graph,
      sourceType: this.state.mapSource,
      handlers: {
        onSourceChange: (nodeId) => {
          if (this.state.mapSource === MAP_SOURCES.REAL) this.state.realGraph = withRealSourceNode(this.state.realGraph, nodeId);
          else this.state.syntheticGraph = { ...this.state.syntheticGraph, sourceNodeId: nodeId };
          this.resetResultsToPrepared(false);
          this.renderAll();
        },
        onTargetChange: (nodeId) => {
          this.state.syntheticGraph = { ...this.state.syntheticGraph, targetNodeId: nodeId };
          this.resetResultsToPrepared(false);
          this.renderAll();
        },
        onHospitalChange: (hospitalId) => {
          this.state.realGraph = withRealHospital(this.state.realGraph, hospitalId);
          this.dom.hospitalSelect.value = hospitalId;
          this.resetResultsToPrepared(false);
          this.renderAll();
        },
        onGraphChange: (graph) => {
          this.state.syntheticGraph = graph;
          this.resetResultsToPrepared(false);
          this.renderAll();
        },
        getSyntheticTool: () => this.state.syntheticTool,
      },
    });
  }

  async runSelectedAlgorithms() {
    const graph = currentGraph(this.state);
    const selectedAlgorithms = ALGORITHMS.filter((algorithm) => this.state.selectedAlgorithmIds.has(algorithm.id));

    if (!selectedAlgorithms.length) {
      this.dom.statusText.textContent = 'Select at least one algorithm before running.';
      return;
    }

    if (!graph.sourceNodeId || !graph.targetNodeId) {
      this.dom.statusText.textContent = graph.sourceType === 'real'
        ? 'Click the map first to determine the ambulance starting point.'
        : 'Select ambulance and hospital endpoints before running.';
      return;
    }

    this.state.appState = APP_STATES.RUNNING;
    this.state.results = [];
    this.renderPanelsOnly();
    this.dom.runBtn.disabled = true;
    this.dom.viewerTitle.textContent = 'Running comparison';
    this.dom.statusText.textContent = 'Running selected algorithms and preparing animation...';

    const results = selectedAlgorithms.map((algorithm) => algorithm.run({
      graph,
      source: graph.sourceNodeId,
      target: graph.targetNodeId,
      objective: this.state.objective,
    }));

    this.state.results = attachComparisonMetrics(results, this.state.objective);
    this.renderResults();

    await this.viewerManager.showRunningViewers({
      graph,
      sourceType: this.state.mapSource,
      algorithms: selectedAlgorithms,
      results: this.state.results,
    });

    this.state.appState = APP_STATES.FINISHED;
    this.dom.runBtn.disabled = false;
    this.renderPanelsOnly();
    this.dom.viewerTitle.textContent = 'Finished comparison';
    this.dom.statusText.textContent = validationSummary(this.state.results);
  }

  resetResultsToPrepared(render = true) {
    this.state.appState = APP_STATES.PREPARED;
    this.state.results = [];
    this.dom.runBtn.disabled = false;
    if (render) this.renderResults();
  }

  getSyntheticDefaultPoint(role) {
    const value = role === 'source'
      ? APP_CONFIG.syntheticDefaults.startPoint
      : APP_CONFIG.syntheticDefaults.endPoint;

    if (value === 'random') {
      this.syntheticRandomCounter += 1;
      return `random:ui:${Date.now()}:${this.syntheticRandomCounter}:${role}:${Math.random().toString(36).slice(2)}`;
    }

    return value;
  }

  renderAlgorithmSelector() {
    this.dom.algorithmList.innerHTML = ALGORITHMS.map((algorithm) => `
      <label class="algorithm-option">
        <input type="checkbox" value="${algorithm.id}" ${this.state.selectedAlgorithmIds.has(algorithm.id) ? 'checked' : ''} />
        <span><strong>${algorithm.shortName}</strong><br><small>${algorithm.description}</small></span>
        <i class="algorithm-dot" style="background:${algorithm.color}"></i>
      </label>
    `).join('');
    this.renderAlgorithmToggleButton();
  }

  renderAlgorithmToggleButton() {
    const allSelected = this.state.selectedAlgorithmIds.size === ALGORITHMS.length;
    this.dom.toggleAlgorithmsBtn.textContent = allSelected ? 'Unselect all' : 'Select all';
    this.dom.algorithmList.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      checkbox.checked = this.state.selectedAlgorithmIds.has(checkbox.value);
    });
  }

  populateHospitals() {
    const graph = this.state.realGraph;
    this.dom.hospitalSelect.innerHTML = graph.hospitals.map((hospital) => `<option value="${hospital.id}">${hospital.name}</option>`).join('');
    this.dom.hospitalSelect.value = graph.selectedHospitalId;
  }

  renderResults() {
    renderResults(this.dom.resultCards, this.dom.comparisonBody, this.state.results, this.state.objective);
  }
}
