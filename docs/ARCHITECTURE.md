# Arhitektuur

## Põhimõte
Kolm kihti, sõltuvused ainult allapoole: **ui/input → sim ← render** (render ja ui *loevad* sim olekut, annavad käske, kuid sim ei tea neist midagi).

```
src/
  core/      GameLoop (fikseeritud 30 Hz sim + interpoleeritud render), EventBus, Time
  sim/       World, entiteedid (ECS-lite), systems/, commands, nav/, rng, heightmap, vision
  data/      units.json, weapons.json, buildings.json, missions/*.json
  render/    Renderer, Terrain, RtsCamera, models/, UnitRenderer (InstancedMesh), Fx, Fog
  input/     SelectionController, CommandController (hiir/klaviatuur → Command)
  ui/        HUD (HTML/CSS), Minimap, BuildPanel
  audio/     Howler wrapper
  main.ts    ühendab kõik
```

## Simulatsioon
- `World` hoiab entiteete (`id`, `type`, `team`, `x`, `z`, `hp`, komponendid: `Movement`, `Weapon`, `Producer`...).
- Süsteemid töötavad kindlas järjekorras igal tickil: Commands → Production → Vision → Targeting → Movement(nav) → Combat → Projectiles → Cleanup → AI → Win/Lose.
- Sim väljastab sündmusi (`unitDied`, `projectileFired`, `unitSpawned`...), mida renderdus kasutab efektide jaoks.
- Pole `Math.random()`; ainult `rng.ts`. Eesmärk: sama seeme + samad käsud = sama tulemus (replay, hiljem lockstep-multiplayer).

## Renderdus
- Üksuste mudelid GLB-failidena (`public/models/`), korduvad üksused `InstancedMesh`iga.
- Renderdus interpoleerib eelmise ja praeguse ticki positsiooni (`alpha`).
- Efektid (osakesed, mürsud, kärgstuul) puhtalt renderduses, käivituvad sim-sündmustest.
- Maastik: kõrgusväli `sim/heightmap.ts` (hiljem PNG heightmap + splatmap).

## Andmevoog
`hiir → input/ → Command → sim.queue(cmd) → tick() → sündmused + olek → render/ui`

## Nav
Ruudustik 2 m, blokeeritud ruudud = hooned + järsk kalle. A* üksikutele, flowfield rühmadele. Üksuste vahel lokaalne separation (nagu prototüübis).

## Faas 1 ehitatud moodulid
- `sim/World.ts` (olek + `tick`), `sim/systems/{commands,production,units,projectiles,combat}.ts`, `sim/ai/WaveAI.ts`, `sim/scenario.ts`, `sim/units.ts` (loeb `data/units.json`)
- Sim → renderdus: `world.entities` (koos eelmise ticki väärtustega interpolatsiooniks), `world.projectiles` ja `world.drainEvents()` (`fire`/`hit`/`death`)
- Renderdus → sim: ainult `world.issue(Command)`
- `render/{models,UnitRenderer,Fx}.ts`, `input/{Picker,SelectionController,CommandController}.ts`, `ui/{Hud,Minimap,Overlay}.ts`, ühendab `main.ts`
