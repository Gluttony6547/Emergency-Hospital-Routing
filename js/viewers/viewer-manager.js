import { RealMapViewer } from './real-map-viewer.js';
import { SyntheticGridViewer } from './synthetic-grid-viewer.js';
import { animateViewers } from './animation-runner.js';
import { APP_CONFIG } from '../app/config.js';

export class ViewerManager {
  constructor(container) {
    this.container = container;
    this.viewers = [];
  }

  clear() {
    this.viewers.forEach((viewer) => viewer.destroy());
    this.viewers = [];
    this.container.innerHTML = '';
    this.container.className = 'viewer-grid single';
  }

  showPrepareViewer({ graph, sourceType, handlers }) {
    this.clear();
    const viewer = this.createViewer({
      graph,
      sourceType,
      title: sourceType === 'real' ? 'Real Surabaya Map' : 'Synthetic Grid Editor',
      color: APP_CONFIG.colors.realMap.startMarker,
      interactive: true,
      handlers,
    });
    viewer.mount();
    this.viewers = [viewer];
    this.refreshAll();
    return viewer;
  }

  async showRunningViewers({ graph, sourceType, algorithms, results }) {
    this.clear();
    this.container.className = `viewer-grid multi-${Math.min(4, Math.max(1, algorithms.length))}`;
    const entries = [];

    for (const algorithm of algorithms) {
      const viewer = this.createViewer({
        graph,
        sourceType,
        title: algorithm.shortName,
        color: algorithm.color,
        interactive: false,
        handlers: {},
      });
      viewer.mount();
      const result = results.find((item) => item.algorithmId === algorithm.id);
      viewer.setFooter(result?.message ?? 'No result.');
      this.viewers.push(viewer);
      entries.push({ viewer, result, algorithm, graph });
    }

    this.refreshAll();
    await animateViewers({ entries });
  }

  refreshAll() {
    requestAnimationFrame(() => {
      for (const viewer of this.viewers) {
        viewer.refreshLayout?.();
        viewer.draw?.();
      }
    });
  }

  createViewer({ graph, sourceType, title, color, interactive, handlers }) {
    const common = { container: this.container, graph, title, color, interactive };
    if (sourceType === 'real') {
      return new RealMapViewer({
        ...common,
        onSourceChange: handlers.onSourceChange,
        onHospitalChange: handlers.onHospitalChange,
      });
    }

    return new SyntheticGridViewer({
      ...common,
      onSourceChange: handlers.onSourceChange,
      onTargetChange: handlers.onTargetChange,
      onGraphChange: handlers.onGraphChange,
      getTool: handlers.getSyntheticTool,
    });
  }
}
