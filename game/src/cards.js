// The cards of Cinderfall: four suits, each with its own gift, and the deck both
// duelists draw from. A card is a plain object { suit, power } with power 1..9.

export const SUIT_EMBER = 'ember';
export const SUIT_TIDE = 'tide';
export const SUIT_THORN = 'thorn';
export const SUIT_GLOAM = 'gloam';

/** Suit definitions in display order: colour, and the gift that fires for a clash winner. */
export const SUITS = [
  { id: SUIT_EMBER, name: 'Ember', colour: '#e4572e', giftName: 'Burn', giftText: 'burns 2 through Guard' },
  { id: SUIT_TIDE, name: 'Tide', colour: '#3d8bfd', giftName: 'Mend', giftText: 'heals 3 Life' },
  { id: SUIT_THORN, name: 'Thorn', colour: '#4caf6d', giftName: 'Bastion', giftText: 'gains 2 Guard' },
  { id: SUIT_GLOAM, name: 'Gloam', colour: '#a06cd5', giftName: 'Whisper', giftText: 'draws 2 cards' },
];

const SUIT_BY_ID = new Map(SUITS.map((suit) => [suit.id, suit]));

/** The definition of one suit id. */
export function suitOf(id) {
  return SUIT_BY_ID.get(id);
}

export const LOWEST_POWER = 1;
export const HIGHEST_POWER = 9;
export const HAND_SIZE = 5;
export const START_LIFE = 20;
export const MAX_GUARD = 6;

/** A fresh 36-card deck: every power of every suit, once. */
export function buildDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (let power = LOWEST_POWER; power <= HIGHEST_POWER; power += 1) {
      deck.push({ suit: suit.id, power });
    }
  }
  return deck;
}

/** A short label for a card, e.g. "Ember 7". */
export function cardLabel(card) {
  return `${suitOf(card.suit).name} ${card.power}`;
}
