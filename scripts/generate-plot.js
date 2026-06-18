import { readFile, writeFile } from 'node:fs/promises';

const input = new URL('../benchmarks/benchmark-results.json', import.meta.url);
const output = new URL('../benchmarks/runtime-plot.svg', import.meta.url);
const COLORS = {
  dijkstra: '#30e7ff',
  astar: '#ffd166',
  bfs: '#a78bfa',
  'greedy-bfs': '#ff5a6a',
};

async function main() {
  const rows = JSON.parse(await readFile(input, 'utf8')).filter((row) => row.objective === 'eta');
  const width = 920;
  const height = 520;
  const pad = { left: 72, right: 32, top: 42, bottom: 72 };
  const nodes = [...new Set(rows.map((row) => row.nodes))].sort((a, b) => a - b);
  const algorithms = [...new Set(rows.map((row) => row.algorithmId))];
  const maxMs = Math.max(...rows.map((row) => row.runtimeMs), 1);
  const x = (nodeCount) => pad.left + (Math.log10(nodeCount) - Math.log10(nodes[0])) / (Math.log10(nodes.at(-1)) - Math.log10(nodes[0])) * (width - pad.left - pad.right);
  const y = (ms) => height - pad.bottom - (ms / maxMs) * (height - pad.top - pad.bottom);

  const lines = [];
  for (const algorithm of algorithms) {
    const points = nodes.map((nodeCount) => {
      const row = rows.find((item) => item.nodes === nodeCount && item.algorithmId === algorithm);
      return `${x(nodeCount).toFixed(2)},${y(row?.runtimeMs ?? 0).toFixed(2)}`;
    }).join(' ');
    lines.push(`<polyline points="${points}" fill="none" stroke="${COLORS[algorithm]}" stroke-width="3"/>`);
    for (const nodeCount of nodes) {
      const row = rows.find((item) => item.nodes === nodeCount && item.algorithmId === algorithm);
      lines.push(`<circle cx="${x(nodeCount).toFixed(2)}" cy="${y(row?.runtimeMs ?? 0).toFixed(2)}" r="4" fill="${COLORS[algorithm]}"/>`);
    }
  }

  const xTicks = nodes.map((nodeCount) => `
    <line x1="${x(nodeCount)}" y1="${height - pad.bottom}" x2="${x(nodeCount)}" y2="${height - pad.bottom + 6}" stroke="#9ad4c9"/>
    <text x="${x(nodeCount)}" y="${height - pad.bottom + 26}" text-anchor="middle">${nodeCount}</text>
  `).join('');

  const legend = algorithms.map((algorithm, index) => `
    <rect x="${pad.left + index * 168}" y="${height - 34}" width="12" height="12" fill="${COLORS[algorithm]}" rx="3"/>
    <text x="${pad.left + 18 + index * 168}" y="${height - 24}">${algorithm}</text>
  `).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="#042b2a"/>
    <text x="${pad.left}" y="28" fill="#e6fff9" font-family="sans-serif" font-weight="700">SOS2BY ETA Runtime Benchmark</text>
    <line x1="${pad.left}" y1="${height - pad.bottom}" x2="${width - pad.right}" y2="${height - pad.bottom}" stroke="#9ad4c9"/>
    <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${height - pad.bottom}" stroke="#9ad4c9"/>
    ${xTicks}
    <text x="${width / 2}" y="${height - 42}" text-anchor="middle" fill="#9ad4c9" font-family="sans-serif">Number of nodes (log scale)</text>
    <text x="18" y="${height / 2}" transform="rotate(-90 18 ${height / 2})" text-anchor="middle" fill="#9ad4c9" font-family="sans-serif">Runtime (ms)</text>
    <text x="${pad.left - 10}" y="${y(maxMs)}" text-anchor="end" fill="#9ad4c9" font-family="sans-serif">${maxMs.toFixed(2)}</text>
    <text x="${pad.left - 10}" y="${height - pad.bottom}" text-anchor="end" fill="#9ad4c9" font-family="sans-serif">0</text>
    <g fill="#e6fff9" font-family="sans-serif" font-size="13">${lines.join('\n')}${legend}</g>
  </svg>`;

  await writeFile(output, svg);
  console.log('Output: benchmarks/runtime-plot.svg');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
