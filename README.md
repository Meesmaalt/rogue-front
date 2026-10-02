# Rogue Front

Brauseripõhine RTS (Three.js + TypeScript + Vite), inspireeritud mängust *Real War: Rogue States*.

## Käivitamine Dockeris

```bash
docker compose up dev                 # arendus: http://localhost:5173 (HMR)
docker compose run --rm dev npm test  # testid
docker compose run --rm dev npm run typecheck
docker compose --profile prod up --build prod   # tootmisbuild nginxis: http://localhost:8080
```

## Käivitamine ilma Dockerita

```bash
npm ci && npm run dev
```

## Release

Faasid 7–8 lisavad heli/seaded, pausisüsteemi, localStorage salvestused, deterministliku replay, sim-testid, lint/format kontrolli ja GitHub Actions container-release voo. Tootmiscontaineril on `/healthz` endpoint.

## Struktuur

- `src/sim/` – mängu loogika (puhas TS, **ei impordi three.js-i**)
- `src/render/` – Three.js renderdus
- `src/core/` – mängutsükkel jm infrastruktuur
- `prototype/rogue-front.html` – esimene töötav ühefaililine prototüüp (viide portimiseks)
- `docs/ARCHITECTURE.md` – arhitektuur, `docs/TODO.md` – tööde nimekiri, `AGENTS.md` – juhised AI-agendile


## Multiplayer (Phase 9)

Käivita lockstep relay eraldi teenusena:

```bash
docker compose up multiplayer
```

Seejärel ava mäng kahel kliendil, vali **Mitmikmäng 1v1** ja sisesta mõlemas sama lobby nimi. Multiplayer kasutab 30 Hz deterministlikku lockstep'i, serveri käsujärjekorda, reconnect-tokenit ja tick-hash'i desync tuvastuseks.

## Skirmish RTS

The project includes a dedicated Real War-style skirmish mode. It starts from an HQ and engineer, uses logistics helicopters to collect map resources, allows construction of barracks, vehicle factories, helipads and refineries, and pits the player against a developing AI base. Victory is achieved by destroying the enemy HQ.

## RTS Skirmish depth

Skirmish is the primary HQ-vs-HQ RTS mode. The economy is logistics-driven: dedicated transport helicopters collect finite resources from map resource zones and return them to base. Barracks, factories and helipads maintain independent production queues. The roster includes infantry, engineers, tanks, artillery, transport helicopters, gunships and fighters, plus bunkers and AA emplacements. The AI develops its economy and base before launching combined-arms attacks.

## Phase 15
Base structure is now a real map layer: perimeter walls, forward gates, internal access roads, and AI defensive placement are generated from the two base definitions.


## Phase 16 — RTS combat depth

The skirmish layer now has team-specific tech, refinery income scaling, target priorities, siege behavior, and unified production simulation for both teams.


## Phase 19 — Combined Arms
The RTS core now includes terrain-aware line of sight, resource-zone control, artillery fire missions, aircraft fuel/rearm, multi-producer queues and scouting/flanking AI. See `docs/PHASE19-COMBINED-ARMS.md`.


## Phase 31–34
Naval warfare, Sea Command, special forces, standing orders and pre-deployment orders are included.
