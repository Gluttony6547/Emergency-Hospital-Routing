export function formatNumber(value) {
  if (!Number.isFinite(value)) return '-';
  return Math.round(value).toLocaleString('en-US');
}

export function formatMeters(value) {
  if (!Number.isFinite(value)) return '-';
  if (value >= 1000) return `${(value / 1000).toFixed(2)} km`;
  return `${value.toFixed(0)} m`;
}

export function formatEta(seconds) {
  if (!Number.isFinite(seconds)) return '-';
  if (seconds < 60) return `${seconds.toFixed(0)} sec`;
  return `${(seconds / 60).toFixed(1)} min`;
}

export function formatMs(ms) {
  if (!Number.isFinite(ms)) return '-';
  if (ms > 0 && ms < 0.001) return '<0.001 ms';
  if (ms < 1) return `${ms.toFixed(3)} ms`;
  if (ms < 1000) return `${ms.toFixed(2)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function formatPercent(value) {
  if (!Number.isFinite(value)) return '-';
  return `${value.toFixed(1)}%`;
}

export function objectiveLabel(objective) {
  return objective === 'distance' ? 'Distance' : 'ETA';
}

export function costLabel(value, objective) {
  return objective === 'distance' ? formatMeters(value) : formatEta(value);
}
