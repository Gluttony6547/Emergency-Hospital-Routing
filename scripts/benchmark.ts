import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { benchmarkRowsToCsv, runBenchmarkSuite } from '../src/lib/benchmark'

const rows = runBenchmarkSuite('exam-2026', 0.18)
const failedRows = rows.filter((row) => !row.pathMatch)
const outputDirectory = resolve('benchmarks')
const csvPath = resolve(outputDirectory, 'benchmark-results.csv')
const jsonPath = resolve(outputDirectory, 'benchmark-results.json')

await mkdir(outputDirectory, { recursive: true })
await writeFile(csvPath, `${benchmarkRowsToCsv(rows)}\n`, 'utf8')
await writeFile(jsonPath, `${JSON.stringify(rows, null, 2)}\n`, 'utf8')

console.table(
  rows.map((row) => ({
    size: row.label,
    nodes: row.nodes,
    dijkstraMs: row.dijkstraRuntimeMs.toFixed(3),
    aStarMs: row.aStarRuntimeMs.toFixed(3),
    dijkstraVisited: row.dijkstraVisited,
    aStarVisited: row.aStarVisited,
    match: row.pathMatch,
  })),
)

if (failedRows.length > 0) {
  throw new Error(`Benchmark validation failed for: ${failedRows.map((row) => row.label).join(', ')}`)
}

console.log(`Benchmark data written to ${csvPath}`)
console.log(`Benchmark data written to ${jsonPath}`)
