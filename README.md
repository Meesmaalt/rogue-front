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
