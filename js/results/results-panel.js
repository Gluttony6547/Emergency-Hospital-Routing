import { costLabel, formatEta, formatMeters, formatMs, formatNumber, formatPercent } from '../utils/format.js';
import { getAlgorithmById } from '../algorithms/registry.js';

export function renderResults(cardsEl, tableBodyEl, results, objective) {
  if (!results.length) {
    cardsEl.className = 'result-cards empty-state';
    cardsEl.textContent = 'Run algorithms to see route metrics.';
    tableBodyEl.innerHTML = '<tr><td colspan="7">No comparison yet.</td></tr>';
    return;
  }

  cardsEl.className = 'result-cards';
  cardsEl.innerHTML = results.map((result) => renderResultCard(result, objective)).join('');
  tableBodyEl.innerHTML = results.map((result) => renderComparisonRow(result, objective)).join('');
}

function renderResultCard(result, objective) {
  const algorithm = getAlgorithmById(result.algorithmId);
  return `
    <article class="result-card">
      <h3><i style="background:${algorithm?.color ?? '#30e7ff'}"></i>${result.algorithmName}</h3>
      <small>${result.message}</small>
      <strong>${result.success ? costLabel(result.objectiveCost, objective) : 'No route'}</strong>
      <div class="result-grid">
        <div class="result-metric"><span>Runtime</span><b>${formatMs(result.runtimeMs)}</b></div>
        <div class="result-metric"><span>Visited</span><b>${formatNumber(result.visitedCount)}</b></div>
        <div class="result-metric"><span>ETA</span><b>${formatEta(result.totalEtaSeconds)}</b></div>
        <div class="result-metric"><span>Distance</span><b>${formatMeters(result.totalDistanceMeters)}</b></div>
        <div class="result-metric"><span>Hop</span><b>${formatNumber(result.hopCount)}</b></div>
        <div class="result-metric"><span>Gap</span><b>${formatGap(result)}</b></div>
      </div>
    </article>
  `;
}

function renderComparisonRow(result, objective) {
  return `
    <tr>
      <td>${result.algorithmName}</td>
      <td>${result.success ? 'yes' : 'no'}</td>
      <td>${formatMs(result.runtimeMs)}</td>
      <td>${formatNumber(result.visitedCount)}</td>
      <td>${formatEta(result.totalEtaSeconds)}</td>
      <td>${formatMeters(result.totalDistanceMeters)}</td>
      <td>${formatGap(result, objective)}</td>
    </tr>
  `;
}

function formatGap(result) {
  if (!result.success || !Number.isFinite(result.gap)) return '-';
  if (Math.abs(result.gap) < 1e-7) return '0';
  return `${result.gap > 0 ? '+' : ''}${result.gap.toFixed(2)} (${formatPercent(result.gapPercent)})`;
}

export async function renderBenchmarkPreview(container) {
  try {
    const response = await fetch('benchmarks/benchmark-results.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('missing benchmark');
    const data = await response.json();
    const rows = Array.isArray(data) ? data : data.rows;
    if (!rows?.length) throw new Error('empty benchmark');
    const grouped = groupBySize(rows);
    container.innerHTML = Object.entries(grouped).map(([size, items]) => {
      const max = Math.max(...items.map((item) => item.runtimeMs || 0), 1);
      return `
        <div class="bench-row">
          <span>${size}</span>
          <div class="bench-bars">
            ${items.map((item) => `<div class="bench-bar ${item.algorithmId}" title="${item.algorithmId}: ${formatMs(item.runtimeMs)}" style="width:${Math.max(4, (item.runtimeMs / max) * 100)}%"></div>`).join('')}
          </div>
          <b>ok</b>
        </div>
      `;
    }).join('');
  } catch {
    container.innerHTML = 'Run <code>npm run benchmark</code> to generate benchmark files.';
  }
}

function groupBySize(rows) {
  const grouped = {};
  for (const row of rows) {
    const key = row.nodes ?? row.size;
    grouped[key] ??= [];
    grouped[key].push(row);
  }
  return grouped;
}
