// Cinderfall's seeded random source: a small mulberry-style generator, so a duel
// (and a screenshot scene) with the same seed always plays out the same way.

/** Return a function that yields the next number in [0, 1) of the stream for `seed`. */
export function makeRng(seed) {
  let state = (seed >>> 0) || 1;
  return function next() {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Shuffle `cards` in place with the stream `rng` and return the same array. */
export function shuffle(rng, cards) {
  for (let i = cards.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const held = cards[i];
    cards[i] = cards[j];
    cards[j] = held;
  }
  return cards;
}

/** Pick one element of `items` with the stream `rng`. */
export function pick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}
