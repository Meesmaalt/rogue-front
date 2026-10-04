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
- Tehnika kasutab `ArtModels.ts` kaudu 63 fraktsioonipõhist originaal-GLB-d, mis jagavad ressursse. Jalavägi ja hooned kasutavad `models.ts` geomeetriat; jalaväe staatilised osad on ühendatud, jalad animeeritud. HUD-i tehnika pisipildid on samadest mudelitest renderdatud.
- Renderdus interpoleerib eelmise ja praeguse ticki positsiooni (`alpha`).
- Efektid (osakesed, mürsud, kärgstuul) puhtalt renderduses, käivituvad sim-sündmustest.
- Maastik: kõrgusväli `sim/heightmap.ts` (hiljem PNG heightmap + splatmap).

## Andmevoog
`hiir → input/ → Command → sim.queue(cmd) → tick() → sündmused + olek → render/ui`

## Nav
Ruudustik 2 m, blokeeritud ruudud = kaardi takistused + hooned + järsk kalle. Move ja amove kasutavad raadiusega A* teekonda; igal tavalisel maaväe sammul kontrollitakse nav-i. Lokaalne separation rakendub liikumisel ning blokeeritud kõrvalekalde puhul kasutatakse teekonna suunda. Teekond algab tegelikust lähimast nav-punktist, mitte ei jäta seda vahele.

## Faas 1 ehitatud moodulid
- `sim/World.ts` (olek + `tick`), `sim/systems/{commands,production,units,projectiles,combat}.ts`, `sim/ai/WaveAI.ts`, `sim/scenario.ts`, `sim/units.ts` (loeb `data/units.json`)
- Sim → renderdus: `world.entities` (koos eelmise ticki väärtustega interpolatsiooniks), `world.projectiles` ja `world.drainEvents()` (`fire`/`hit`/`death`)
- Renderdus → sim: ainult `world.issue(Command)`
- `render/{models,UnitRenderer,Fx}.ts`, `input/{Picker,SelectionController,CommandController}.ts`, `ui/{Hud,Minimap,Overlay}.ts`, ühendab `main.ts`

## Integreeritud käitus

`OnlineShell` avab vaikimisi kohaliku mänguseadistuse. `main.ts` valib ühe algoleku (skirmish või kampaania), loob ühe `World`-i ja kinnitab sellele sobiva võidu- või missioonikontrolleri. Need töötavad `World.tick()` sees; HUD ei muuda skoori ega missiooni progressi.

Ressursirajatis käivitatakse inseneriga. Füüsiline kogumistransport annab tarne saabudes `World.receiveSupply()` kaudu raha ning ammo/fuel/repair varud. Tootja vajab töötavat juhtimisharu, energiat ja kohalikku varustatud ladu. Eesliinilaole veetakse piiratud varud pealaost; edasisaatmine uut raha ei tekita. Marsruudikäsud määravad päris veoki teekonna vahepunktid.

Formation on meeskonna `Command`, mitte mooduli globaalne UI-olek. v19 salvestus sisaldab entiteetide täisolekut, sihtviiteid, mürske, ootel käske, varusid, RNG-d, nägemisvõrku, AI ajastust, decki ja kontrollerite progressi. v2 replay alustab salvestatud algolekust; replay peab kasutama sama kaardi/kõrgusvälja seadistust. Laadimine taastab simulatsiooni ja tühjendab renderdusvaated.

Frondijoon on olukorrainfo. Operatiivne/taktikaline AI käsutab üksnes vastast ja on võrgumängus välja lülitatud. Decki kasutamisel tulevad üksused ainult tootmisjärjekorrast ning nende saadavust piiravad decki kaardid.

## Ühendatud 3D-tehnika

`ArtModels.ts` laadib enne lahingut päris GLB-varad ja fraktsioonitekstuurid. `UnitRenderer` kasutab neid olemasoleva entiteedi kind/faction/team järgi. Geomeetria ja põhjamaterjalid on jagatud; üksuse eemaldamine/salvestuse laadimine neid ei vabasta. Meeskonnamärgistus on eraldi instantsimaterjal. `Turret`, `Gun`, `RotorMain*`, `RotorCounter`, `TailRotor` ja `LandingGear` sõlmed säilitavad animatsioonipivotid. `models.ts` jääb jalaväe/hoonete/mereväe ning laadimistõrke varuteeks. Arsenal kasutab sama laadijat ja samu varasid.

Mudelid eksporditakse originaalsest polügoonmodellimise allikast `scripts/art/build-models.mjs`. Staatilised osad liidetakse materjali kaupa, animatsioonisõlmed säilitatakse. Maksimaalselt 5824 kolmnurka / 20 materjaligruppi platvormi kohta. Uus art ei muuda simulatsiooninumbreid, aega ega RNG-d.

## Multiplayer’i algseis ja taastamine

Server saadab meeskondade järjekorras mõlema mängija faction/deck'i. Klient loob võrdse HQ+inseneride algseisu alles pärast määramist. Network-deckide limiidid, battlegroup ja toodetud kogused kuuluvad mõlemale meeskonnale, mitte kohaliku mängija perspektiivile. Need säilivad snapshot'is. Hash ei sisalda UI kohaliku tootmisjärjekorra alias't; tegelikud järjekorrad on entiteetidel.

`ready` sisaldab viimase rakendatud simulatsioonisammu hash'i ja järgmise sammu numbrit, sealhulgas esimest kinnitust. Server võrdleb hash'e enne järgmist sammu; lahknevus peatab mõlemad kliendid. Server hoiab viimase 1800 ticki käsuajalugu. Sama lehe reconnect saadab `lastAppliedTick`; vahele jäänud tickid mängitakse järjekorras läbi. See on kuni 60 simulatsioonisekundi taastamisaken, mitte serveri kettale salvestatud maailmasnapshot. Serveri taaskäivitus lõpetab aktiivse ruumi.

Roheorg (`src/data/maps/green-valley.json`) kasutab farmland-kõrgusprofiili. Proﬁil valitakse enne World-i nav-/vision-loomet; tee geomeetria järgib sama kõrgusvälja. Põllu appearance on visuaalne ega anna varjet; forest annab olemasolevate sensors/combat süsteemide kaudu varjet.
