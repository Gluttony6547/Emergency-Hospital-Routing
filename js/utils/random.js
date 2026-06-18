export function createSeededRandom(seedText) {
  let seed = 2166136261 >>> 0;
  const text = String(seedText || 'seed');

  for (let i = 0; i < text.length; i += 1) {
    seed ^= text.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }

  return function random() {
    seed += 0x6D2B79F5;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomBetween(random, min, max) {
  return min + random() * (max - min);
}

export function randomInt(random, min, max) {
  return Math.floor(randomBetween(random, min, max + 1));
}
