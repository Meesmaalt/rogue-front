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

Mudelid eksporditakse originaalsest polügoonmodellimise allikast `scripts/art/build-models.mjs`. Staatilised osad liidetakse materjali kaupa, animatsioonisõlmed säilitatakse. Manifest v2 sisaldab 63 detailset mudelit (kuni 6256 kolmnurka / 8 materjalipartiid) ja 63 kaugusmudelit (kuni 2824 / 6). Uus art ei muuda simulatsiooninumbreid, aega ega RNG-d.

## Multiplayer’i algseis ja taastamine

Server saadab meeskondade järjekorras mõlema mängija faction/deck'i. Klient loob võrdse HQ+inseneride algseisu alles pärast määramist. Network-deckide limiidid, battlegroup ja toodetud kogused kuuluvad mõlemale meeskonnale, mitte kohaliku mängija perspektiivile. Need säilivad snapshot'is. Hash ei sisalda UI kohaliku tootmisjärjekorra alias't; tegelikud järjekorrad on entiteetidel.

`ready` sisaldab viimase rakendatud simulatsioonisammu hash'i ja järgmise sammu numbrit, sealhulgas esimest kinnitust. Server võrdleb hash'e enne järgmist sammu; lahknevus peatab mõlemad kliendid. Server hoiab viimase 1800 ticki käsuajalugu. Sama lehe reconnect saadab `lastAppliedTick`; vahele jäänud tickid mängitakse järjekorras läbi. See on kuni 60 simulatsioonisekundi taastamisaken, mitte serveri kettale salvestatud maailmasnapshot. Serveri taaskäivitus lõpetab aktiivse ruumi.

Roheorg (`src/data/maps/green-valley.json`) kasutab farmland-kõrgusprofiili. Proﬁil valitakse enne World-i nav-/vision-loomet; tee geomeetria järgib sama kõrgusvälja. Põllu appearance on visuaalne ega anna varjet; forest annab olemasolevate sensors/combat süsteemide kaudu varjet.


## Hooned ja kinemaatiline liikumine

`Architecture.ts` loob tekstuuritud tsiviil- ja baasigeomeetria ning liidab staatilised osad materjali järgi. `Terrain` kasutab seda kaardi hoonetel; `models.ts` tootmis-/juhtimishoonetel. Renderdus ei muuda simulatsiooni RNG-d.

`mobility.json` annab olemasolevale üksusesüsteemile kiirendus-, pidurdus- ja lennuprofiilid. `motionSpeed`, `flightBank`, `flightPitch`, `flightOrbitCenter` ja `airLandingPhase` on entiteedi salvestatav olek; WorldHash sisaldab neid ja kõrgust. `UnitRenderer` kasutab simulatsiooni tegelikku lennukõrgust ning maastiku kerekaldeid. MAP_SIZE on 640; kaamera ja piirid kasutavad sama konstanti. Praegune Roheoru automaatsalvestuse võti kasutab `.layout6` paigutust; vanad salvestused jäävad alles.


## Relvad ja rajatiste veod

`UnitDef` relvaprofiilid on `units.json`-is; `canEngage` ja `effectiveWeaponRange` ühendavad sihtmärgivaliku, laskegate'i ning HUD-i. `Projectile` salvestab kiiruse, juhitavuse, vanuse, lennupiiri, sihtkõrguse ja laskekoha. `projectiles.ts` eristab juhitavat raketti ja ennetatud mittesuunatavat lasku; `Fx` kasutab samade mürskude jaoks eraldi geomeetriat.

`World` lisab ressursirajatiste hoonejäljed mapFeatures-i enne NavGrid/Vision-i loomist. `Terrain` joonistab tööstusmudeli, `ResourceSites` laadimisplatsi ja oleku. `logistics.json` määrab lähetus-, koorma-, kütuse- ja ladustamisprofiilid. `supplyDepotLevel` ühendab üldise hoonetaseme ja logistika uuendused. `updateSupplyAirbridge` lähetab lao kütusest; `updateTransport` korjab kohaliku piiratud varu ja annab koorma `receiveSupply` kaudu üle. Raha ei lisandu rajatise tootmistickis.

## Taktikalised käsud ja kaardipass

`commands.ts` jaotab grupi eesmärgid üksuse raadiuse ja navigeeritavuse järgi. `units.ts` järgib olemasolevat A* teed vaba koridori ettevaatega ning deterministliku kohaliku kokkupõrkevältimisega. Liikumiskäsk ei eralda enam kasutamata FlowField'i. `moveQueue` on ühekordne järjekord, eraldi patrullist, ja kuulub salvestusse/hash'i.

HUD-i tarnejuhtimine väljastab `logistics-source` ja `logistics-route` käsud CommandControlleri kaudu. Lao `preferredResourceIndex`/`logisticsPaused` ja transpordi `routeLeg`/`routeWaypointIndex` juhivad päris veoki- ja kopterisüsteemi ning kuuluvad hash'i. Overlay näitab nähtavate sihtmärkide tegelikku LOS-i, relvaulatust, teid ja koormaid. Audio/Fx tarbivad relvatüübiga fire-sündmust ega muuda simulatsiooni.

Roheoru hooned, õued, teed ja metsad pärinevad kaardiandmetest. `terrain.json` farmland-kõrgendikud rakenduvad `heightmap.ts` kaudu ühiselt simulatsioonile ja renderdusele.

## 3D-kvaliteet ja renderduskoormus

`ArtModels` jagab fraktsioonikamo, karedus-/normaalikaarte ja meeskonnamaterjale ning laadib mõlemad GLB detailid. `UnitRenderer` vahetab neid kaamerakauguse/kvaliteedi järgi hüstereesiga. Vaateväljakontroll piirab liikuvate üksuste animatsioone; animatsioonisõlmede viited kogutakse loomisel. Rootorite ja recoil'i renderdus kasutab kaadri dt-d, simulatsioon endiselt fikseeritud sammu.

`Architecture.batchStaticScene` ühendab staatilise kaardi geomeetria materjali ja piirkonna kaupa. Seda kasutatakse ka hoonetaseme komplektil enne üksuse juurde lisamist; animeeritud üksused ei lähe sellesse partiisse. Arhitektuurimaterjalid on jagatud ja `sharedArt` kaitseb neid üksuse eemaldamisel vabastamise eest. Terrain kasutab lehestiku alpha-testiga instantsipartiisid piirkondade kaupa.

`PostFX` eraldab composer'i ainult siis, kui järelprotsess on sisse lülitatud. Vaikimisi renderdatakse otse kanvasse. `RenderContext.updateShadows` kasutab UnitRenderer'i muutusmärki ja kvantitud kaameraankrut staatilise varjukaardi uuendamiseks. Minikaart 10 Hz ja intel-märgid 5 Hz on renderduse sagedused, mitte simulatsiooni omad.

### Relvakoosseis, füüsiline lend ja metsluure

`data/weapon-profiles.json` määrab visuaali, lennutüübi, juhitavuse ja üksuste relvakoosseisud; `units.json` annab üksuse põhirelva ning sensorite parameetrid. `sim/units.ts` lahendab need `WeaponSpec[]`-iks. `selectWeapon` kasutab päris sihtmärki, laskemoona, sobivust, ulatust ja eraldi laadimistaimereid. Maaüksuse lisarelva varustab olemasolev piiratud lao-/FOB-varu; õhusõiduk vajab varustatud lennubaasi/kopteriplatsi.

`projectiles.ts` lahendab sirglennu, piiratud pöördega juhitava raketi või gravitatsiooniga kaudtule. Tabamus kasutab tegelikku lennuteed, maastikku/hooneid, tabamisrulli ja soomusenurka; lähedane möödalask surub üksust maha. `Fx` tarbib sama mürsu interpolatsiooni ja fire/impact-sündmusi: neli piiratud InstancedMesh-osakestepartiid, jagatud relvapõhised mürsumudelid ja kuni 24 lööklaineringi. Efektide juhuslikkus jääb renderdusse, simulatsiooni juhuslikkus kasutab World.rng-d.

`Vision.forestDepth` piirab läbi metsa nägemist; sensors lisab katte, varjatuse, liikumise ja hiljutise tule allkirja. Jalaväeluure, snaiper ning eriüksus on jalaväe kategoorias ja kasutavad metsas jalaväe liikumist. Täissalvestus säilitab relvade ja mürskude oleku; Replay.worldHash sisaldab uusi laskemoona-, taimeri- ja lennuvälju. Automaatse skirmishi layout-versioon on 5; täissalvestuse versioon jääb 19 ja vana relvakoosseisuta salvestus kasutab olemasolevat ühe relva ühilduvust.

## Füüsiline õhuväebaas ja laskepositsioonid

`airDoctrine.ts` jagab rajatise kohalikke punkte, parkimiskohti, võimekusekontrolli ja õhugrupi käsuvalikut production/units/commands/Hud vahel. Tootmisest ja valmis skirmishi algolekust tulev õhusõiduk paigutatakse stationAircraft kaudu oma baasi. `units.ts` teeb parkimine → ooteala → rada → õhkutõus → missioon → lähenemine → maandumine → parkimine → piiratud laadimine. Ühe rajatise rada on eksklusiivne stardil ja lõppmaandumisel. `air-return` on tavaline deterministlik Command; rajatisele antud air-mission laieneb seotud sobivatele üksustele. Missiooni jaoks lõppenud laskemoon käivitab RTB sõltumata teise domeeni relvadest. Taktikaline transport läbib sama baasitsükli; ressursitransport säilitab oma logistikasüsteemi.

`mobility.json` sisaldab parkimis-, raja-, mahu- ja positsiooniotsingu andmeid. `airHomeSlot`, `airTaxiPhase` ja positsiooniotsingu cache on täissalvestuse osa; Replay hash sisaldab neid, missioonipunkti, kodurajatist ning sortie olekut. `Architecture` rajamudel ja parkimisala vastavad simuleeritud baasipunktidele. Laskepositsiooni otsing kasutab relvaulatust, minimaalset kaugust, LOS-i, nav-i ja jalaväe katet ning talletab valiku piiratud kordusotsingu jaoks.
