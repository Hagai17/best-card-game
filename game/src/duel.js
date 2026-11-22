// The Cinderfall duel engine: pure rules, no DOM, so the same code plays the game
// in the browser and runs headless soak tests in Node.
//
// A duel: both duelists start at 20 Life with a hand of five cards. Each clash both
// commit one card; the higher effective power wounds the loser by the margin
// (Guard soaks wounds first), a tie singes both for 1, and the winner's suit gift
// fires. Playing the same suit twice running adds +1 streak power. First duelist
// whose Life empties loses the Crown.

import { HAND_SIZE, MAX_GUARD, START_LIFE, SUIT_EMBER, SUIT_GLOAM, SUIT_THORN, SUIT_TIDE, buildDeck, cardLabel } from './cards.js';
import { makeRng, shuffle } from './random.js';

export const SIDE_PLAYER = 'player';
export const SIDE_WARDEN = 'warden';

export function otherSide(side) {
  return side === SIDE_PLAYER ? SIDE_WARDEN : SIDE_PLAYER;
}

function handOf(state, side) {
  return side === SIDE_PLAYER ? state.playerHand : state.wardenHand;
}

function deckOf(state, side) {
  return side === SIDE_PLAYER ? state.playerDeck : state.wardenDeck;
}

function discardOf(state, side) {
  return side === SIDE_PLAYER ? state.playerDiscard : state.wardenDiscard;
}

function lifeOf(state, side) {
  return side === SIDE_PLAYER ? state.playerLife : state.wardenLife;
}

function setLife(state, side, value) {
  if (side === SIDE_PLAYER) state.playerLife = value;
  else state.wardenLife = value;
}

function guardOf(state, side) {
  return side === SIDE_PLAYER ? state.playerGuard : state.wardenGuard;
}

function setGuard(state, side, value) {
  if (side === SIDE_PLAYER) state.playerGuard = value;
  else state.wardenGuard = value;
}

function lastSuitOf(state, side) {
  return side === SIDE_PLAYER ? state.playerLastSuit : state.wardenLastSuit;
}

/** A card's power in a clash: its printed power, +1 when its suit follows the duelist's last suit. */
export function effectivePower(state, side, card) {
  return card.power + (lastSuitOf(state, side) === card.suit ? 1 : 0);
}

/** A fresh duel for `seed`: shuffled decks, five cards each, full Life, no Guard. */
export function createDuel(seed) {
  const rng = makeRng(seed);
  const playerDeck = shuffle(rng, buildDeck());
  const wardenDeck = shuffle(rng, buildDeck());
  const state = {
    rng,
    seed,
    playerLife: START_LIFE,
    wardenLife: START_LIFE,
    playerGuard: 0,
    wardenGuard: 0,
    playerHand: playerDeck.splice(0, HAND_SIZE),
    wardenHand: wardenDeck.splice(0, HAND_SIZE),
    playerDeck,
    wardenDeck,
    playerDiscard: [],
    wardenDiscard: [],
    playerLastSuit: null,
    wardenLastSuit: null,
    playerRanks: [],
    clashes: 0,
    playerDamage: 0,
    wardenDamage: 0,
    over: false,
    winner: null,
    lastClash: null,
  };
  return state;
}

/** Move `count` cards from a duelist's deck to their hand, reshuffling the discard if the deck runs dry. */
export function drawCards(state, side, count) {
  const hand = handOf(state, side);
  let deck = deckOf(state, side);
  for (let n = 0; n < count; n += 1) {
    if (deck.length === 0) {
      const discard = discardOf(state, side);
      if (discard.length === 0) return;
      const fresh = shuffle(state.rng, discard.splice(0, discard.length));
      if (side === SIDE_PLAYER) state.playerDeck = fresh;
      else state.wardenDeck = fresh;
      deck = fresh;
    }
    hand.push(deck.pop());
  }
}

/**
 * Deal `amount` of wound to `side`. Guard soaks wounds first unless `throughGuard`.
 * Returns the Life damage actually dealt.
 */
function wound(state, side, amount, throughGuard) {
  let remaining = amount;
  if (!throughGuard && remaining > 0) {
    const soaked = Math.min(guardOf(state, side), remaining);
    if (soaked > 0) setGuard(state, side, guardOf(state, side) - soaked);
    remaining -= soaked;
  }
  if (remaining > 0) {
    setLife(state, side, lifeOf(state, side) - remaining);
    if (side === SIDE_WARDEN) state.playerDamage += remaining;
    else state.wardenDamage += remaining;
  }
  return remaining;
}

/** Fire the winning card's suit gift for `winner`; returns a line describing it, or null. */
function fireGift(state, winner, winCard, loser) {
  const name = winner === SIDE_PLAYER ? 'You' : 'The Warden';
  switch (winCard.suit) {
    case SUIT_EMBER: {
      const dealt = wound(state, loser, 2, true);
      return dealt > 0 ? `${name} ${winner === SIDE_PLAYER ? 'burn' : 'burns'} 2 through Guard with Ember.` : null;
    }
    case SUIT_TIDE: {
      const healed = Math.min(START_LIFE, lifeOf(state, winner) + 3) - lifeOf(state, winner);
      if (healed > 0) setLife(state, winner, lifeOf(state, winner) + healed);
      return healed > 0 ? `${name} ${winner === SIDE_PLAYER ? 'mend' : 'mends'} ${healed} Life with Tide.` : null;
    }
    case SUIT_THORN: {
      const gained = Math.min(MAX_GUARD, guardOf(state, winner) + 2) - guardOf(state, winner);
      if (gained > 0) setGuard(state, winner, guardOf(state, winner) + gained);
      return gained > 0 ? `${name} ${winner === SIDE_PLAYER ? 'raise' : 'raises'} ${gained} Guard with Thorn.` : null;
    }
    case SUIT_GLOAM: {
      const before = handOf(state, winner).length;
      drawCards(state, winner, 2);
      const drawn = handOf(state, winner).length - before;
      return drawn > 0 ? `${name} ${winner === SIDE_PLAYER ? 'draw' : 'draws'} ${drawn} with Gloam.` : null;
    }
    default:
      return null;
  }
}

/**
 * Resolve one clash from the two committed hand indexes. Both cards leave their
 * hands, the clash is scored, gifts fire, both duelists draw back up to a full
 * hand, and the duel ends when a Life empties. Returns the clash record.
 */
export function resolveClash(state, playerIndex, wardenIndex) {
  const playerCard = state.playerHand.splice(playerIndex, 1)[0];
  const wardenCard = state.wardenHand.splice(wardenIndex, 1)[0];
  const playerPower = effectivePower(state, SIDE_PLAYER, playerCard);
  const wardenPower = effectivePower(state, SIDE_WARDEN, wardenCard);
  const events = [];
  let outcome;
  let margin = 0;

  if (playerPower === wardenPower) {
    outcome = 'tie';
    wound(state, SIDE_PLAYER, 1, false);
    wound(state, SIDE_WARDEN, 1, false);
    events.push(`Dead even at ${playerPower} — the clash singes both duelists for 1.`);
  } else {
    const winner = playerPower > wardenPower ? SIDE_PLAYER : SIDE_WARDEN;
    const loser = otherSide(winner);
    const winCard = winner === SIDE_PLAYER ? playerCard : wardenCard;
    margin = Math.abs(playerPower - wardenPower);
    outcome = winner;
    const dealt = wound(state, loser, margin, false);
    events.push(
      `${cardLabel(winCard)} overcomes ${cardLabel(winner === SIDE_PLAYER ? wardenCard : playerCard)} by ${margin}` +
        (dealt > 0 ? ` — ${dealt} Life lost.` : ' — Guard soaks it all.'),
    );
    const giftLine = fireGift(state, winner, winCard, loser);
    if (giftLine) events.push(giftLine);
  }

  state.playerLastSuit = playerCard.suit;
  state.wardenLastSuit = wardenCard.suit;
  state.playerRanks.push(playerCard.power);
  if (state.playerRanks.length > 5) state.playerRanks.shift();
  state.playerDiscard.push(playerCard);
  state.wardenDiscard.push(wardenCard);
  state.clashes += 1;

  drawCards(state, SIDE_PLAYER, Math.max(0, HAND_SIZE - state.playerHand.length));
  drawCards(state, SIDE_WARDEN, Math.max(0, HAND_SIZE - state.wardenHand.length));

  if (state.playerLife <= 0 || state.wardenLife <= 0) {
    state.over = true;
    state.winner = state.playerLife > state.wardenLife ? SIDE_PLAYER : SIDE_WARDEN;
  }

  const clash = { playerCard, wardenCard, playerPower, wardenPower, outcome, margin, events };
  state.lastClash = clash;
  return clash;
}

/** The power the Warden expects the player to commit: the median of their last three ranks. */
export function predictPlayerPower(state) {
  const recent = state.playerRanks.slice(-3);
  if (recent.length === 0) return 5;
  const sorted = [...recent].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/** How much the Warden values a winning card's gift right now, as a discount on its power. */
function giftBonus(state, card) {
  switch (card.suit) {
    case SUIT_EMBER:
      return state.playerGuard >= 2 ? 2 : 0.3;
    case SUIT_TIDE:
      if (state.wardenLife <= 8) return 3;
      if (state.wardenLife <= 13) return 1;
      return 0.2;
    case SUIT_THORN:
      return state.wardenGuard <= 1 ? 1 : 0.2;
    case SUIT_GLOAM:
      return 0.8;
    default:
      return 0;
  }
}

/**
 * The Warden's committed card index, chosen before it can see the player's card:
 * it answers the player's recent ranks as cheaply as it can, spends gifts where
 * they bite (Ember into Guard, Tide when bleeding), ties when it cannot win, and
 * when it must lose it loses narrowly. Now and then it simply misjudges.
 */
export function chooseWardenCard(state) {
  // Now and then the Warden simply misreads the table and commits at random.
  if (state.rng() < 0.2) return Math.floor(state.rng() * state.wardenHand.length);
  const predicted = predictPlayerPower(state);
  const options = state.wardenHand.map((card, index) => ({
    card,
    index,
    power: effectivePower(state, SIDE_WARDEN, card),
  }));

  const winners = options.filter((option) => option.power > predicted);
  if (winners.length > 0) {
    for (const option of winners) option.score = option.power - giftBonus(state, option.card);
    winners.sort((a, b) => a.score - b.score || a.power - b.power || a.card.power - b.card.power);
    if (winners.length > 1 && state.rng() < 0.1) return winners[1].index;
    return winners[0].index;
  }

  const ties = options.filter((option) => option.power === predicted);
  if (ties.length > 0) {
    ties.sort((a, b) => a.card.power - b.card.power);
    return ties[0].index;
  }

  options.sort((a, b) => b.power - a.power || b.card.power - a.card.power);
  return options[0].index;
}

/** Play one full clash: the player commits `playerIndex`, the Warden answers on its own read. */
export function playClash(state, playerIndex) {
  return resolveClash(state, playerIndex, chooseWardenCard(state));
}

// --- Player policies, shared by the soak test and the screenshot pilot. ---

/** Commit the strongest card in hand. */
export function policyStrongest(state) {
  let best = 0;
  for (let i = 1; i < state.playerHand.length; i += 1) {
    if (effectivePower(state, SIDE_PLAYER, state.playerHand[i]) > effectivePower(state, SIDE_PLAYER, state.playerHand[best])) best = i;
  }
  return best;
}

/** Commit the weakest card in hand. */
export function policyWeakest(state) {
  let best = 0;
  for (let i = 1; i < state.playerHand.length; i += 1) {
    if (effectivePower(state, SIDE_PLAYER, state.playerHand[i]) < effectivePower(state, SIDE_PLAYER, state.playerHand[best])) best = i;
  }
  return best;
}

/** Commit a card at random. */
export function policyRandom(state) {
  return Math.floor(state.rng() * state.playerHand.length);
}

/** Play a whole duel out with `policy` steering the player; returns the final state. */
export function simulateDuel(seed, policy, maxClashes = 300) {
  const state = createDuel(seed);
  while (!state.over && state.clashes < maxClashes) {
    playClash(state, policy(state));
  }
  return state;
}
