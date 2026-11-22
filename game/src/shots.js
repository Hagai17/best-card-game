// The screenshot scenes behind ?shot=title|table|win|lose&seed=N. Each one plays
// the real engine forward with a pilot, so the frame is a moment a real duel
// passes through, and the same seed always stages the same frame.

import { createDuel, playClash, policyStrongest, policyWeakest } from './duel.js';
import { SCREEN_LOSE, SCREEN_TABLE, SCREEN_TITLE, SCREEN_WIN } from './render.js';

/** Play `clashes` clashes of a fresh duel with the strongest-card pilot. */
function pilotDuel(seed, policy, clashes) {
  const state = createDuel(seed);
  while (!state.over && state.clashes < clashes) playClash(state, policy(state));
  return state;
}

/** The first seed at or after `seed` whose piloted duel ends the wanted way. */
function findEnding(seed, policy, winner, maxClashes) {
  for (let candidate = seed; candidate < seed + 400; candidate += 1) {
    const state = pilotDuel(candidate, policy, maxClashes);
    if (state.over && state.winner === winner) return state;
  }
  return pilotDuel(seed, policy, maxClashes);
}

/**
 * The table scene wants a duel worth showing: five clashes in, the fifth one
 * decisive with a suit gift fired, and the player still standing tall. Scan
 * seeds from the given one until such a duel turns up.
 */
function findTableScene(seed) {
  for (let candidate = seed; candidate < seed + 400; candidate += 1) {
    const state = pilotDuel(candidate, policyStrongest, 5);
    const clash = state.lastClash;
    if (
      !state.over &&
      clash &&
      clash.outcome !== 'tie' &&
      clash.events.length >= 2 &&
      state.playerLife >= 10 &&
      state.playerDamage >= state.wardenDamage
    ) {
      return state;
    }
  }
  return pilotDuel(seed, policyStrongest, 5);
}

/**
 * Stage the named scene and return { screen, state, reveal } for the renderer.
 * The table scene stops five clashes in, on the reveal of the fifth.
 */
export function stageShot(name, seed) {
  if (name === 'table') {
    const state = findTableScene(seed);
    return { screen: SCREEN_TABLE, state, reveal: state.lastClash };
  }
  if (name === 'win') {
    const state = findEnding(seed, policyStrongest, 'player', 40);
    return { screen: SCREEN_WIN, state, reveal: null };
  }
  if (name === 'lose') {
    const state = findEnding(seed, policyWeakest, 'warden', 40);
    return { screen: SCREEN_LOSE, state, reveal: null };
  }
  return { screen: SCREEN_TITLE, state: createDuel(seed), reveal: null };
}
