import { parseNodeId, nearestSyntheticNode, closestRoadEndpointPair, cloneSyntheticWithToggledRoad } from '../graph/synthetic-grid-graph.js';
import { APP_CONFIG } from '../app/config.js';

export class SyntheticGridViewer {
  constructor({ container, graph, title = 'Synthetic Grid', color = '#30e7ff', interactive = false, onSourceChange, onTargetChange, onGraphChange, getTool }) {
    this.container = container;
    this.graph = graph;
    this.title = title;
    this.color = color;
    this.interactive = interactive;
    this.onSourceChange = onSourceChange;
    this.onTargetChange = onTargetChange;
    this.onGraphChange = onGraphChange;
    this.getTool = getTool ?? (() => 'start');
    this.visited = new Set();
    this.path = [];
    this.dragging = null;
    this.card = null;
    this.body = null;
    this.canvas = null;
    this.ctx = null;
    this.footer = null;
    this.resizeObserver = null;
    this.staticCanvas = document.createElement('canvas');
    this.staticCtx = this.staticCanvas.getContext('2d');
    this.staticKey = '';
  }

  mount() {
    this.card = document.createElement('article');
    this.card.className = `viewer-card ${this.interactive ? 'prepare' : ''}`;
    this.card.innerHTML = `
      <div class="viewer-card-header">
        <div class="viewer-card-title"><i style="background:${this.color}"></i>${this.title}</div>
        <div class="viewer-card-meta" data-meta>-</div>
      </div>
      <div class="viewer-card-body"><canvas class="synthetic-canvas"></canvas><div class="route-flash"></div></div>
      <div class="viewer-card-footer" data-footer>${this.interactive ? 'Click a cell to set A/H or toggle a blocked road.' : 'Waiting for animation.'}</div>
    `;
    this.container.appendChild(this.card);
    this.body = this.card.querySelector('.viewer-card-body');
    this.canvas = this.card.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.footer = this.card.querySelector('[data-footer]');
    this.meta = this.card.querySelector('[data-meta]');

    this.resizeObserver = new ResizeObserver(() => this.draw());
    this.resizeObserver.observe(this.body);

    if (this.interactive) this.bindInteraction();
    this.draw();
  }

  destroy() {
    this.resizeObserver?.disconnect();
    this.card?.remove();
  }

  setGraph(graph) {
    this.graph = graph;
    this.staticKey = '';
    this.draw();
  }

  resetTrace() {
    this.visited = new Set();
    this.path = [];
    this.draw();
  }

  drawVisitedBatch(nodeIds) {
    for (const nodeId of nodeIds) this.visited.add(nodeId);
    this.draw();
  }

  drawFinalPath(path) {
    this.path = path ?? [];
    this.draw();
    this.flash();
  }

  setFooter(text) {
    if (this.footer) this.footer.textContent = text;
  }

  flash() {
    const flash = this.card?.querySelector('.route-flash');
    if (!flash) return;
    flash.classList.remove('active');
    void flash.offsetWidth;
    flash.classList.add('active');
  }

  bindInteraction() {
    this.canvas.addEventListener('pointerdown', (event) => {
      const nodeId = this.nodeFromEvent(event);
      if (!nodeId) return;
      const tool = this.getTool();

      if (tool === 'start') {
        this.dragging = 'start';
        this.onSourceChange?.(nodeId);
      } else if (tool === 'target') {
        this.dragging = 'target';
        this.onTargetChange?.(nodeId);
      } else if (tool === 'toggle-block') {
        const pair = closestRoadEndpointPair(this.graph, nodeId);
        if (pair) this.onGraphChange?.(cloneSyntheticWithToggledRoad(this.graph, pair[0], pair[1]));
      }
    });

    this.canvas.addEventListener('pointermove', (event) => {
      if (!this.dragging) return;
      const nodeId = this.nodeFromEvent(event);
      if (!nodeId) return;
      if (this.dragging === 'start') this.onSourceChange?.(nodeId);
      if (this.dragging === 'target') this.onTargetChange?.(nodeId);
    });

    window.addEventListener('pointerup', () => {
      this.dragging = null;
    });
  }

  nodeFromEvent(event) {
    const rect = this.canvas.getBoundingClientRect();
    const point = this.toGraphPoint(event.clientX - rect.left, event.clientY - rect.top);
    return nearestSyntheticNode(this.graph, point.x, point.y);
  }

  updateCanvasSize() {
    const rect = (this.body || this.canvas).getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(220, Math.floor(rect.width * dpr));
    const height = Math.max(160, Math.floor(rect.height * dpr));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.staticCanvas.width = width;
      this.staticCanvas.height = height;
      this.staticKey = '';
    }
    return { width, height, dpr };
  }

  getTransform() {
    const { width, height } = this.updateCanvasSize();
    const pad = 24;
    const scale = Math.min((width - pad * 2) / Math.max(1, this.graph.width - 1), (height - pad * 2) / Math.max(1, this.graph.height - 1));
    const offsetX = (width - scale * (this.graph.width - 1)) / 2;
    const offsetY = (height - scale * (this.graph.height - 1)) / 2;
    return { width, height, scale, offsetX, offsetY };
  }

  toScreen(node, t) {
    return { x: t.offsetX + node.x * t.scale, y: t.offsetY + node.y * t.scale };
  }

  toGraphPoint(xCss, yCss) {
    const dpr = window.devicePixelRatio || 1;
    const t = this.getTransform();
    const x = (xCss * dpr - t.offsetX) / t.scale;
    const y = (yCss * dpr - t.offsetY) / t.scale;
    return { x, y };
  }

  draw() {
    if (!this.ctx || !this.graph) return;
    const t = this.getTransform();
    const ctx = this.ctx;
    this.drawStaticLayer(t);
    ctx.clearRect(0, 0, t.width, t.height);
    ctx.drawImage(this.staticCanvas, 0, 0);

    this.meta.textContent = `${this.graph.width} × ${this.graph.height} • ${this.graph.blockedRoads.length.toLocaleString()} blocked`;

    if (this.visited.size) {
      ctx.fillStyle = APP_CONFIG.colors.syntheticGrid.visitedNode;
      const size = Math.max(1.2, t.scale * 0.44);
      for (const nodeId of this.visited) {
        const node = this.graph.nodeById.get(nodeId);
        if (!node) continue;
        const p = this.toScreen(node, t);
        ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
      }
    }

    if (this.path.length) {
      ctx.strokeStyle = this.color;
      ctx.lineWidth = Math.max(3, t.scale * 0.28);
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      this.path.forEach((nodeId, index) => {
        const node = this.graph.nodeById.get(nodeId);
        if (!node) return;
        const p = this.toScreen(node, t);
        if (index === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    this.drawEndpoint(this.graph.sourceNodeId, 'A', APP_CONFIG.colors.syntheticGrid.startMarker, t);
    this.drawEndpoint(this.graph.targetNodeId, 'H', APP_CONFIG.colors.syntheticGrid.targetMarker, t);
  }

  drawStaticLayer(t) {
    const key = [
      this.graph.id,
      this.graph.width,
      this.graph.height,
      this.graph.roads.length,
      this.graph.blockedRoads.length,
      t.width,
      t.height,
      Math.round(t.scale * 1000),
    ].join('|');

    if (this.staticKey === key) return;

    const ctx = this.staticCtx;
    this.staticKey = key;
    ctx.clearRect(0, 0, t.width, t.height);
    ctx.fillStyle = '#052321';
    ctx.fillRect(0, 0, t.width, t.height);

    ctx.lineCap = 'round';

    ctx.strokeStyle = 'rgba(180, 233, 224, 0.10)';
    ctx.lineWidth = Math.max(0.45, t.scale * 0.07);
    ctx.beginPath();
    for (const road of this.graph.roads) {
      if (road.blocked) continue;
      const a = this.graph.nodeById.get(road.from);
      const b = this.graph.nodeById.get(road.to);
      if (!a || !b) continue;
      const pa = this.toScreen(a, t);
      const pb = this.toScreen(b, t);
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
    }
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 90, 106, 0.70)';
    ctx.lineWidth = Math.max(1.1, t.scale * 0.18);
    ctx.beginPath();
    for (const road of this.graph.roads) {
      if (!road.blocked) continue;
      const a = this.graph.nodeById.get(road.from);
      const b = this.graph.nodeById.get(road.to);
      if (!a || !b) continue;
      const pa = this.toScreen(a, t);
      const pb = this.toScreen(b, t);
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
    }
    ctx.stroke();
  }

  drawEndpoint(nodeId, label, color, t) {
    const node = this.graph.nodeById.get(nodeId);
    if (!node) return;
    const ctx = this.ctx;
    const p = this.toScreen(node, t);
    const size = Math.max(13, t.scale * 0.85);
    ctx.fillStyle = color;
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(p.x - size / 2, p.y - size / 2, size, size, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#001f1d';
    ctx.font = `900 ${Math.max(10, size * 0.52)}px ${getComputedStyle(document.documentElement).fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, p.x, p.y + 0.5);
  }
}
