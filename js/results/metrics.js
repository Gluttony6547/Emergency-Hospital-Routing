export function attachComparisonMetrics(results, objective) {
  const dijkstra = results.find((result) => result.algorithmId === 'dijkstra' && result.success);
  const baselineCost = dijkstra?.objectiveCost ?? Infinity;

  return results.map((result) => {
    const gap = result.success && Number.isFinite(baselineCost) ? result.objectiveCost - baselineCost : Infinity;
    const gapPercent = result.success && baselineCost > 0 && Number.isFinite(gap) ? (gap / baselineCost) * 100 : Infinity;
    const matchDijkstra = result.success && Number.isFinite(gap) && Math.abs(gap) < 1e-7;
    return { ...result, gap, gapPercent, matchDijkstra, comparisonObjective: objective };
  });
}

export function validationSummary(results) {
  const dijkstra = results.find((result) => result.algorithmId === 'dijkstra');
  const astar = results.find((result) => result.algorithmId === 'astar');
  if (!dijkstra || !astar || !dijkstra.success || !astar.success) return 'A* cross-check unavailable.';
  return Math.abs(dijkstra.objectiveCost - astar.objectiveCost) < 1e-7
    ? 'A* matches Dijkstra on the selected objective.'
    : 'A* does not match Dijkstra; check heuristic or graph assumptions.';
}
