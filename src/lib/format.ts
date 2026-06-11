export function formatNumber(value: number): string {
  if (Number.isNaN(value)) {
    return '-'
  }

  if (!Number.isFinite(value)) {
    return 'unreachable'
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: value < 100 ? 2 : 0,
  }).format(value)
}

export function formatMs(value: number): string {
  return `${value.toFixed(value < 10 ? 3 : 2)} ms`
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}
