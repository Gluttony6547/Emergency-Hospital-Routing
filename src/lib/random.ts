export function hashSeed(seed: string): number {
  let hash = 2166136261

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

export function createSeededRandom(seed: string): () => number {
  let state = hashSeed(seed) || 1

  return () => {
    state = Math.imul(1664525, state) + 1013904223
    return (state >>> 0) / 4294967296
  }
}

export function randomInt(random: () => number, min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min
}
