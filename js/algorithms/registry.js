import { runDijkstra } from './dijkstra.js';
import { runAStar } from './astar.js';
import { runBFS } from './bfs.js';
import { runGreedyBFS } from './greedy-bfs.js';
import { APP_CONFIG } from '../app/config.js';

export const ALGORITHMS = [
  {
    id: 'dijkstra',
    name: 'Dijkstra',
    shortName: 'Dijkstra',
    color: APP_CONFIG.colors.algorithms.dijkstra,
    description: 'Optimal weighted shortest path using g(n).',
    optimality: 'Optimal for non-negative weights.',
    run: runDijkstra,
  },
  {
    id: 'astar',
    name: 'A*',
    shortName: 'A*',
    color: APP_CONFIG.colors.algorithms.astar,
    description: 'Informed search using g(n) + h(n).',
    optimality: 'Optimal when heuristic is admissible and consistent.',
    run: runAStar,
  },
  {
    id: 'bfs',
    name: 'Breadth-First Search',
    shortName: 'BFS',
    color: APP_CONFIG.colors.algorithms.bfs,
    description: 'Unweighted shortest-hop baseline.',
    optimality: 'Shortest by hop count, not weighted cost.',
    run: runBFS,
  },
  {
    id: 'greedy-bfs',
    name: 'Greedy Best-First Search',
    shortName: 'Greedy BFS',
    color: APP_CONFIG.colors.algorithms.greedyBfs,
    description: 'Heuristic-only baseline using h(n).',
    optimality: 'Not guaranteed optimal.',
    run: runGreedyBFS,
  },
];

export function getAlgorithmById(id) {
  return ALGORITHMS.find((algorithm) => algorithm.id === id);
}
