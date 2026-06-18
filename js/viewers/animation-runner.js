import { APP_CONFIG } from '../app/config.js';
export async function animateViewers({ entries, onProgress }) {
  const tasks = entries.map((entry) => animateSingle(entry, onProgress));
  await Promise.all(tasks);
}

async function animateSingle(entry, onProgress) {
  const { viewer, result, graph } = entry;
  viewer.resetTrace();

  const visited = result.visitedOrder ?? [];

  const targetFrames = getTargetFrames(graph, visited.length);
  const chunkSize = Math.max(1, Math.ceil(visited.length / targetFrames));
  const frameDelayMs = getFrameDelay(graph, visited.length);
  const relaxedEdges = result.relaxedEdges ?? [];
  const edgeChunkSize = Math.max(1, Math.ceil(relaxedEdges.length / targetFrames));

  viewer.setFooter(`${result.algorithmName} is exploring ${visited.length.toLocaleString('en-US')} nodes...`);

  for (let i = 0; i < visited.length; i += chunkSize) {
    const batch = visited.slice(i, i + chunkSize);
    const edgeStart = Math.floor(i / chunkSize) * edgeChunkSize;
    const edgeBatch = relaxedEdges.slice(edgeStart, edgeStart + edgeChunkSize);
    viewer.drawVisitedBatch(batch, edgeBatch);
    onProgress?.(entry, Math.min(1, (i + chunkSize) / Math.max(1, visited.length)));
    await nextFrame(frameDelayMs);
  }

  viewer.drawFinalPath(result.path);
  viewer.setFooter(result.success ? `${result.algorithmName} finished. ${result.message}` : result.message);
}

function getTargetFrames(graph, visitedCount) {
  if (graph.sourceType === 'real') return APP_CONFIG.animation.real.targetFrames;
  const nodes = graph.nodes?.length ?? visitedCount;
  const frames = APP_CONFIG.animation.synthetic.targetFramesByScale;
  if (nodes >= 10000) return frames.huge;
  if (nodes >= 5000) return frames.large;
  if (nodes >= 1000) return frames.medium;
  return frames.small;
}

function getFrameDelay() {
  return Math.max(0, APP_CONFIG.animation.nodeVisitDelaySeconds * 1000);
}

function nextFrame(delayMs = 0) {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      if (delayMs > 0) setTimeout(resolve, delayMs);
      else resolve();
    });
  });
}
