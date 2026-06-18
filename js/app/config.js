export const APP_CONFIG = {
  animation: {
    nodeVisitDelaySeconds: 0.03,
    real: {
      targetFrames: 96,
      maxVisitedEdges: 50000,
      maxVisitedPoints: 5000,
      keepVisitedAfterFinish: true,
    },
    synthetic: {
      targetFramesByScale: {
        small: 84,
        medium: 58,
        large: 42,
        huge: 34,
      },
    },
  },

  colors: {
    algorithms: {
      dijkstra: '#30e7ff',
      astar: '#ffd166',
      bfs: '#a78bfa',
      greedyBfs: '#ff5a6a',
    },
    realMap: {
      visitedEdge: '#ff5a6a',
      visitedPoint: '#ff9aa5',
      visitedHalo: '#001f1d',
      routeHalo: '#001f1d',
      routeDash: '#ffffff',
      startMarker: '#30e7ff',
      hospitalMarker: '#3dff9f',
    },
    syntheticGrid: {
      visitedNode: 'rgba(0, 0, 0, 0.63)',
      startMarker: '#30e7ff',
      targetMarker: '#3dff9f',
    },
  },

  syntheticDefaults: {
    startPoint: 'random',
    endPoint: 'random',
  },
};
