# best-card-game

[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/Hagai17/best-card-game/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/Hagai17/best-card-game/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

**Cinderfall: Duel for the Ashen Crown** — a simultaneous-strike card duel against the Warden, an AI that reads your recent ranks and answers as cheaply as it can. Both duelists hold five cards and 20 Life; each clash both commit one card, the higher power wounds by the margin (Guard soaks first), a tie singes both, and the winner's suit gift fires: Ember burns 2 through Guard, Tide heals 3, Thorn raises 2 Guard, Gloam draws 2. Playing the same suit twice running adds +1 streak power. Empty the Warden's Life to take the Crown. The game is plain static files under `game/` — no build step, no network — with the rules engine in `game/src/duel.js` shared between the browser and a headless soak test.

## Run it

```sh
node serve.ts
# open http://localhost:8080 and click a card to strike

mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
# hands the game in: copies game/ and screenshots/ to out/ and writes out/dossier.json
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=8pf8m8ra&utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826) · AI agents build software for cash rewards</sub>
