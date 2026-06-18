import { nearestNodeByLatLng, pathCoordinates } from '../graph/graph-utils.js';
import { APP_CONFIG } from '../app/config.js';

export class RealMapViewer {
  constructor({ container, graph, title = 'Real Surabaya', color = '#30e7ff', interactive = false, onSourceChange, onHospitalChange }) {
    this.container = container;
    this.graph = graph;
    this.title = title;
    this.color = color;
    this.interactive = interactive;
    this.onSourceChange = onSourceChange;
    this.onHospitalChange = onHospitalChange;
    this.card = null;
    this.map = null;
    this.startMarker = null;
    this.hospitalMarkers = [];
    this.visitedLayer = null;
    this.pathLayer = null;
    this.footer = null;
    this.sampledVisited = [];
    this.sampledVisitedEdges = [];
    this.mapElement = null;
    this.resizeObserver = null;
    this.visitedPaneName = `sos2by-visited-${Math.random().toString(36).slice(2)}`;
    this.routePaneName = `sos2by-route-${Math.random().toString(36).slice(2)}`;
  }

  mount() {
    this.card = document.createElement('article');
    this.card.className = `viewer-card ${this.interactive ? 'prepare' : ''}`;
    this.card.innerHTML = `
      <div class="viewer-card-header">
        <div class="viewer-card-title"><i style="background:${this.color}"></i>${this.title}</div>
        <div class="viewer-card-meta" data-meta>-</div>
      </div>
      <div class="viewer-card-body"><div class="leaflet-map"></div><div class="route-flash"></div></div>
      <div class="viewer-card-footer" data-footer>${this.interactive ? 'Click any road area to place A.' : 'Waiting for animation.'}</div>
    `;
    this.container.appendChild(this.card);
    this.footer = this.card.querySelector('[data-footer]');
    this.meta = this.card.querySelector('[data-meta]');

    this.mapElement = this.card.querySelector('.leaflet-map');

    this.mapElement.style.minHeight = '180px';

    this.map = L.map(this.mapElement, {
      zoomControl: true,
      preferCanvas: true,
      minZoom: 12,
      maxZoom: 18,
      zoomAnimation: true,
      fadeAnimation: false,
      markerZoomAnimation: true,
    }).setView(this.graph.center, 14);

    this.tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
      updateWhenIdle: true,
      updateWhenZooming: false,
      keepBuffer: 2,
    }).addTo(this.map);

    this.map.createPane(this.visitedPaneName);
    this.map.createPane(this.routePaneName);
    this.map.getPane(this.visitedPaneName).style.zIndex = 520;
    this.map.getPane(this.routePaneName).style.zIndex = 680;
    this.map.getPane(this.visitedPaneName).style.pointerEvents = 'none';
    this.map.getPane(this.routePaneName).style.pointerEvents = 'none';

    this.visitedLayer = L.layerGroup([], { pane: this.visitedPaneName }).addTo(this.map);
    this.pathLayer = L.layerGroup([], { pane: this.routePaneName }).addTo(this.map);

    this.renderMarkers();
    this.updateMeta();

    this.resizeObserver = new ResizeObserver(() => this.refreshLayout());
    this.resizeObserver.observe(this.mapElement);

    this.map.whenReady(() => this.refreshLayout(true));
    this.refreshLayout(true);

    if (this.interactive) {
      this.map.on('click', (event) => {
        const nodeId = nearestNodeByLatLng(this.graph, event.latlng.lat, event.latlng.lng);
        if (nodeId) this.onSourceChange?.(nodeId);
      });
    }

  }

  refreshLayout(fitInitialBounds = false) {
    if (!this.map || !this.mapElement) return;

    const apply = () => {
      const rect = this.mapElement.getBoundingClientRect();
      if (rect.width < 40 || rect.height < 40) return;

      this.map.invalidateSize({ pan: false });

      if (fitInitialBounds && this.graph.bounds) {
        try {
          this.map.fitBounds(this.graph.bounds, {
            padding: [18, 18],
            maxZoom: 15,
            animate: false,
          });
        } catch {}
      }
    };

    requestAnimationFrame(() => {
      apply();
      setTimeout(apply, 60);
      setTimeout(apply, 180);
      setTimeout(apply, 420);
    });
  }

  destroy() {
    this.resizeObserver?.disconnect();
    this.map?.remove();
    this.card?.remove();
  }

  setGraph(graph) {
    this.graph = graph;
    this.renderMarkers();
    this.resetTrace();
    this.updateMeta();
  }

  resetTrace() {
    this.sampledVisited = [];
    this.sampledVisitedEdges = [];
    this.visitedLayer?.clearLayers();
    this.pathLayer?.clearLayers();
  }

  drawVisitedBatch(nodeIds, relaxedEdges = []) {
    if (!this.visitedLayer) return;

    for (const edge of relaxedEdges) {
      const from = this.graph.nodeById.get(edge.from);
      const to = this.graph.nodeById.get(edge.to);
      if (!hasLatLng(from) || !hasLatLng(to)) continue;
      this.sampledVisitedEdges.push([[from.lat, from.lng], [to.lat, to.lng]]);
    }

    if (!relaxedEdges.length) {
      const stride = Math.max(1, Math.ceil(nodeIds.length / 18));
      for (let i = 0; i < nodeIds.length; i += stride) {
        const node = this.graph.nodeById.get(nodeIds[i]);
        if (!hasLatLng(node)) continue;
        this.sampledVisited.push([node.lat, node.lng]);
      }
    }

    if (this.sampledVisitedEdges.length > APP_CONFIG.animation.real.maxVisitedEdges) {
      this.sampledVisitedEdges = this.sampledVisitedEdges.filter((_, index) => index % 2 === 0);
    }

    if (this.sampledVisited.length > APP_CONFIG.animation.real.maxVisitedPoints) {
      this.sampledVisited = this.sampledVisited.filter((_, index) => index % 2 === 0);
    }

    this.visitedLayer.clearLayers();

    if (this.sampledVisitedEdges.length) {
      L.polyline(this.sampledVisitedEdges, {
        pane: this.visitedPaneName,
        color: APP_CONFIG.colors.realMap.visitedEdge,
        weight: 4.2,
        opacity: 0.66,
        interactive: false,
      }).addTo(this.visitedLayer);

      L.polyline(this.sampledVisitedEdges, {
        pane: this.visitedPaneName,
        color: this.color,
        weight: 1.8,
        opacity: 0.88,
        interactive: false,
      }).addTo(this.visitedLayer);
    }

    if (this.sampledVisited.length) {
      L.circleMarker(this.sampledVisited[this.sampledVisited.length - 1], {
        pane: this.visitedPaneName,
        radius: 4,
        color: APP_CONFIG.colors.realMap.visitedHalo,
        weight: 3,
        fillColor: APP_CONFIG.colors.realMap.visitedPoint,
        fillOpacity: 0.94,
        interactive: false,
      }).addTo(this.visitedLayer);
    }
  }

  drawFinalPath(path) {
    this.pathLayer?.clearLayers();
    const coordinates = pathCoordinates(this.graph, path);
    if (coordinates.length >= 2) {
      this.refreshLayout(false);

      const halo = L.polyline(coordinates, {
        pane: this.routePaneName,
        color: APP_CONFIG.colors.realMap.routeHalo,
        weight: 11,
        opacity: 0.88,
        interactive: false,
      }).addTo(this.pathLayer);

      const route = L.polyline(coordinates, {
        pane: this.routePaneName,
        color: this.color,
        weight: 6,
        opacity: 1,
        interactive: false,
      }).addTo(this.pathLayer);

      const dash = L.polyline(coordinates, {
        pane: this.routePaneName,
        color: APP_CONFIG.colors.realMap.routeDash,
        weight: 2,
        opacity: 0.9,
        dashArray: '8 10',
        interactive: false,
      }).addTo(this.pathLayer);

      halo.bringToFront();
      route.bringToFront();
      dash.bringToFront();

      requestAnimationFrame(() => {
        this.map.invalidateSize({ pan: false });
        try { this.map.fitBounds(coordinates, { padding: [28, 28], maxZoom: 16, animate: false }); } catch {}
        setTimeout(() => {
          this.map.invalidateSize({ pan: false });
          halo.redraw?.();
          route.redraw?.();
          dash.redraw?.();
          halo.bringToFront();
          route.bringToFront();
          dash.bringToFront();
        }, 120);
      });
    }
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

  renderMarkers() {
    if (!this.map) return;
    this.hospitalMarkers.forEach((marker) => marker.remove());
    this.hospitalMarkers = [];

    for (const hospital of this.graph.hospitals) {
      const selected = hospital.id === this.graph.selectedHospitalId;
      const marker = L.marker([hospital.lat, hospital.lng], {
        icon: L.divIcon({
          className: 'real-marker-shell',
          html: `<div class="real-hospital-marker ${selected ? 'selected' : ''}">H</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        }),
      }).addTo(this.map);
      marker.bindTooltip(hospital.name, { direction: 'top' });
      if (this.interactive) {
        marker.on('click', () => this.onHospitalChange?.(hospital.id));
      }
      this.hospitalMarkers.push(marker);
    }

    if (this.startMarker) {
      this.startMarker.remove();
      this.startMarker = null;
    }

    const source = this.graph.sourceNodeId ? this.graph.nodeById.get(this.graph.sourceNodeId) : null;
    if (source) {
      this.startMarker = L.marker([source.lat, source.lng], {
        draggable: this.interactive,
        icon: L.divIcon({
          className: 'real-marker-shell',
          html: '<div class="real-ambulance-marker">A</div>',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        }),
      }).addTo(this.map);
      this.startMarker.bindTooltip('Ambulance starting point', { direction: 'top' });

      if (this.interactive) {
        this.startMarker.on('dragend', () => {
          const latLng = this.startMarker.getLatLng();
          const nodeId = nearestNodeByLatLng(this.graph, latLng.lat, latLng.lng);
          if (nodeId) this.onSourceChange?.(nodeId);
        });
      }
    }

    this.updateMeta();
  }

  updateMeta() {
    if (!this.meta) return;
    this.meta.textContent = `${this.graph.nodes.length.toLocaleString()} nodes • ${this.graph.hospitals.length} hospitals`;
  }
}


function hasLatLng(node) {
  return node && Number.isFinite(node.lat) && Number.isFinite(node.lng);
}
