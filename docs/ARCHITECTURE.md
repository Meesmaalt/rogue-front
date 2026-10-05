# Arhitektuur

Hetkeseisu koodipõhine ülevaade ja järgmiste muudatuste sõltuvused: [DEVELOPMENT-PLAN.md](DEVELOPMENT-PLAN.md). Allpool on ka ajaloolised kirjeldused: Roheorg on nüüd 1088 m (layout 11, 85 hoonet, jõgi ja viis silda), vana 640/960 m/layout-kirjeldus ei ole selle kaardi hetkeseis. Aktiivne arendusjärjekord on TODO alguses.

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


## Fraktsioonide koosseisud ja relvamudelid

`src/data/faction-loadouts.json` täpsustab olemasolevat üksuse- ja relvaprofiili. `factionUnitDefinition` rakendab fraktsiooniboonused üks kord; `World.unitDefinition` annab tootmisele, materjalikulule, HUD-ile ja spawn'ile sama tulemuse. SquadSize määrab meeskonna ja mudeli liikmete arvu. Käskude ja deterministliku simulatsiooni arhitektuur ei muutu.

Combat.weaponImpactEstimate ning projectile'i tabamus jagavad penetrationFactor funktsiooni. HUD kuvab nominaalse võrdlustabamuse, mitte olukorrast sõltuvat garanteeritud kahju. Kineetiline nullkahju välistab relva automaatvalikust. Relvade laskemoon ja laadimine jäävad iseseisvateks.

`models.ts` loob fraktsiooni/rolli kaupa jagatud jalaväeprototüübid: detailvaates keha ja kaks animeeritavat jalga, kaugvaates üks ühendatud mesh mehe kohta. CamoMask piirab kamotekstuuri vormi pindadele. UnitRenderer valib kauguse/graafikaseade järgi mudeli ja säilitab kaotuste rühmaviited. Arsenal kasutab samu prototüüpe ja fraktsiooni relvaandmeid.


## Relvapõhine liikuvus ja tehnika varustus

WeaponSpec.stabilizer/fireOnMove/muzzleSide täpsustavad iga relvapesa. `selectWeapon(..., true)` välistab liikudes keelatud relva; `movingFireFactor` on ühine live-tabavusele ja UI baasandmetele. Relvavaliku hinne kasutab jagatud `weaponImpactEstimate` soomusearvutust. Relva väljalase arvestab külgnihet ja õhumasina pooltevahetust. Fraktsioonivariant võib üle kirjutada UnitDef-i taktikalisi välju; kõik tootmise/varustuse/spawn'i tarbijad saavad endiselt sama lahendatud määratluse.

Art'i eksport loeb sama `faction-loadouts.json` faili AT-kopteri rack'i olemasolu jaoks. GLB-de WeaponRack grupid säilitavad detail-/kaugmudeli ja olemasoleva materjalipartiide ühendamise. Ülevaade VEHICLE-DEPTH-RELEASE.md.


## Kaardisuurus ja dünaamiline metsaolek

MissionMapDef.size → setMapSize enne World'i loomist. Kõrgusvahemälu/nav/vision/ruumiindeks on suurusele vastavad; NavGrid ja Vision hoiavad oma ruudustikumõõte. Vaikimisi kaart 640 m, Roheorg 960 m. World.mapSize tuleneb nav-võrgu tegelikust ulatusest. Renderer, kaamera ja minikaart kasutavad aktiivset kõrgusvälja suurust.

World.terrain = TerrainState: metsatihedus ja teekoridorid on piirkondlikult indekseeritud; põleng, suits ja põlenud rakud on sim-seisund. Projectiles Impact võib HE puhul metsa süüdata; World.tick uuendab metsa pärast mürske. Metsatihedus on jagatud mapFeatures.ts funktsioon, mida kasutavad ka puude paigutus ja nägemistakistus. Combat/sensors arvestavad elusat/põlenud katet, units metsaliikumist ja Vision metsasuitsu. Käskude ja külvatud simulatsiooni arhitektuur säilib.

Metsa snapshot ning keskkonna sammuloendur kuuluvad captureRuntime/restoreRuntime ja worldHash hulka. Visuaalne charred-canopy olek tuletatakse simist; Fx kasutab olemasolevaid piiratud osakesepartiisid, nähtavusfiltriga. Ülevaade FOREST-MAP-RELEASE.md.

### Tulejuhtimise andmed ja ulatusringid

`systems/combat.ts` ekspordib puhta `shotAccuracy` arvutuse ja per-slot `weaponRange` funktsiooni. Mürsu loomine ja HUD kasutavad sama täpsust; relva valik ja suurtükiväe koordinaattuli kasutavad sama ulatust. HUD pärib jooksvaid vaenlase andmeid ainult praegu luuratud sihtmärgi jaoks. `render/RangeOverlay.ts` hoiab ühe valiku jaoks piiratud taaskasutatavaid maailma koordinaatides joonpuhvreid ja silte; UI lülitid ei kuulu save/lockstep olekusse. Lähem kirjeldus: `FIRE-CONTROL-RELEASE.md`.


### A1: ühised efektiivsed väärtused

`unitStats.ts` loeb `unit-upgrades.json`, `tech.json` ja `mobility.json` andmeid ning annab sama HP/soomuse, relvauuenduse/ulatuse ja ostureegli simile ning UI-le. Command valideerib iga ostu uuesti, kulutab raha/ressurssi/remondivaru ning säilitab soomustamisel tervise suhtarvu. Nominaalset Entity.def-i ei kirjutata ostuga ümber; olemasolev upgrades/techs seisund jääb save/hash aluseks. Tootmine ja qbar kasutavad sama lahendatud UnitDef.buildTime-i. TerrainState indekseeritud tee/katte päring ning mobility klass seovad tavalise maa- ja logistilise veoki maastikuteguri. Kaudtule kontaktipunktid säilivad intel-koordinaatidena. A2 marsruudihind ja kiirliikumise käsk on ühendatud allpool kirjeldatud viisil. Brauseri ostupaneeli ülevaatus ja pika matši tasakaal on ootel.


### A2: marsruut, läbipääs ja reisijad

`fast-move` on eraldi Command, kuid kasutab olemasolevat Entity.mode="move" liikumist: see ei peatu ise tulevahetuseks. Igal Shift-vahepunktil on oma move/amove/fast-move stiil. `travelPathCost()` kasutab mobility klassi teekiirust ja metsatihedust ning suunapõhist nõlvategurit; heuristika alumine piir arvestab ka võimalikku allamäge kiirenemist. A* silumine kontrollib nii läbipääsu kui eeldatava ajakulu säilimist. Ticki look-ahead ei lõika kiirliikumise ega ressursiveoki kaalutud marsruuti sirgeks. Maastikukulu on World/klassi järgi tuletatud vahemälu, mitte uus simulatsiooniseisund.

Command annab ühise marsitelje ja lõppformatsiooni kohad. `updateUnits()` jagab grupi liikmete päringu ühe sammu sees; kitsas koridoris määrab järjekorra tegelik edenemine ning järgneja hoiab eelmisega vahet. Pärast läbipääsu kasutatakse algseid lõppkohti. Takerdunud üksuse A* saab lisatakistustena seisvad maaüksused, ka silumine arvestab neid. Algse nav-raku poole tagasi pöördumist väldib ruudustikusammu suurusega saabumistolerants. See pole vastassuunalise sõidukiliikluse täielik ristmikusimulaator.

`transport.ts` ühendab `load/unload` käsud, APC/IFV tavaliikumise ja taktikakopteri olemasoleva lennutsükli. `transportCapacity` on UnitDef-i fraktsioonipõhine istmete arv. Broneering loeb elavaid rühmaliikmeid; tervet rühma ei jagata automaatselt. Laadimiskäsu saab anda jalaväelt kandjale või kandjalt jalaväele. Kopter valib maandumiseks hoonejälgedest vaba ala ja vajadusel kogub rühma sinna; laadimine/väljumine ootab maapinnale jõudmist. Väljumisel kontrollitakse jalaväe raadiusega nav-i, takistusteta lõiku ja teisi üksusi. Vaba koha puudumisel reisija jääb pardale; otsing kordub piiratud sagedusega. Kogumine katkeb tähtaja möödudes.

Lao `supplyDepotId`-ga kogumiskopterid ei ole vägede kandjad. Nende senine ressursside tsükkel ja dessantlaeva ajalooline käitumine säilivad; veenavigatsiooni lõpetamine kuulub B1-sse. Laaditud üksusi välistavad jätkuvalt units, sensors, Vision, combat ja territooriumi süsteemid.

Uued marsi-/järjekorra-/transpordiväljad kuuluvad v19 täisoleku salvestusse ning worldHash-i. Vanas v19-s puuduv transportCapacity täidetakse pärast fraktsioonide taastamist, ülejäänud salvestatud üksuseandmed säilivad. Tuletatud vahemälud ja HUD-i kursori režiim ei kuulu lockstep-olekusse. Sama build on endiselt multiplayeri/replay eeltingimus.


### A3: garnison, laskepunktid ja struktuur

`garrison.ts` kasutab `garrison.json` reegleid ja olemasoleva World-i nav-i, mapFeatures ning infrastructureDamage kaarti. Entity.garrisonId on sõltumatu loadedIntoId-st: garnison näeb ja tulistab, pardal olev üksus ei tee kumbagi. Sisenemiskäsk broneerib koha ja annab päris marsruudi uksele; updateGarrisons lõpetab sisenemise alles saabumisel. Väljumine kontrollib vaba nav-jälge ja teiste üksuste kehasid. Katkine väljapääs jääb ooteseisundiks. World.tick uuendab garnisoni enne Vision-i; kõik käsud ja olekumuutused on endiselt fikseeritud simulatsioonis.

Aknaport asub vahetult fassaadist väljaspool ja katuseport üle katuse. Vision piirab allika sektorit; combat-i relvavalik kasutab sama sektorit ja ei luba garnisoni ballistilist relva. Mürsu lähtepunkt ei kasuta garnisonis meeskonna maapinna hajutust. Shared garrisonCover/garrisonProtection/garrisonConcealment seovad struktuurikahju tabavuse, kahju ja sensors varjatusega. Projectile impact edastab majale struktuurikahju ning seesolijale kahju/suppression; varisemine käivitab evakuatsiooni. Kõrvalmaja LOS jääb kehtima; vareme kõrgus on Vision-is ja projectile collision-is sama.

Entity garnisoniväljad kuuluvad v19 täielikku JSON-salvestusse ja Replay.worldHash-i; infrastructureDamage oli juba salvestatav/hashitav. Uut paralleelset salvestussüsteemi ei lisatud. Hoone renderdusjuur säilib Terrain/Architecture batšis; kahjustuse värvi/kuju muudetakse ainult seisundivahetusel ning nähtava info järgi. Materjalikoopia tekib alles maja kahjustamisel. UI annab enter/leave/face-building käske ja ei kirjuta simi olekut otse. Picker ning valik välistavad transporditud üksused; vaenlase hoonemärk ei avalda peidetud kogu hõivet.


### A4: laomahud, osatarne ja lennurajatiste katkestused

`stockLogistics.ts` on olemasoleva füüsilise majanduse ühine mahureegel, mitte eraldi majandus. `stockCapacity` loeb logistics.json ja World.supplyDepotLevel-i; `depositPayload` liigutab kindlat stock payload-i raha loomata; `receiveResourceCargo` jaotab ainult vastu võetud toorressursi tuluks ning piiratud varuks. Mõlemad tagastavad vastu võetud koguse. World.receiveSupply ning units.ts veoki/kopteri/kaubalennuki mahalaadimine jätavad ülejäägi Entity.cargo/logisticsPayload-i. Construction, FOBManager ja HUD kasutavad sama mahuallikat. FOB-i ost ei anna tasuta stock'i.

Road truck peab marsruudi lõpule viima enne lõppsaabumist. Vahepunkti pidurduskaugus erineb lao teeninduskaugusest; blokeeritud lao keskme puhul otsitakse välist läbitavat sihti. TacticalSupply valib vajaliku varuga kohaliku lao ja kasutab lähedase konvoi payload.fuel-i piiratud tankimisabiks. Seisva üksuse käsurežiim üksi ei kuluta kütust. Tootmise operatiivsus ja production.ts kasutavad sama stock'e vajavat lao valikut.

Air service töötab maas parkimispunktis rajatise/energia/juhtimise ja eraldi teenuse varu järgi, sõltumata tootmise kahe varuliigi nõudest. Ruleerimiskatkestus peatab stardi; õhusõiduki kodubaasi/radaraja kaotus suunab olemasoleva vaba kohaga alternatiivbaasi. Maapealset lennukit ei teisaldada. Kaubalennuk suunatakse vastuvõtubaasi kaotusel ümber või väljub tagastatava koormaga. Uus airReturnReason="base" kuulub SaveState-i ning senise hash-välja kaudu Replay-sse. Hash hõlmab nüüd ka lao seost/tasemeid, cargo capacity't, logisticsPriority't ja logisticsWaypoints'e. Sama multiplayer build jääb nõutavaks.


### A5: ühine AI teadmine ja ülesannete kaitse

`ai/knowledge.ts` ühendab nähtavate vastaste ja värskete jagatud mälukontaktide päringu. Peidetud live Entity ei kirjuta kontakti koordinaate üle. WaveAI logistika-/baasirünnakud, nähtavate ohtude kaitse ja õhuülesanded kasutavad seda teadmist; avalik algbaasi punkt ei anna Entity target-viidet. OperationalCommander kasutab avalikke sektoreid, oma kohalolekut ja kontakte, mitte OperationalMap-i peidetud vastase threat/control väärtusi. Conquesti korral on sektorivalik seotud ressursipunktidega.

fieldCombat/availableCombat eristavad päris lahingujõudu logistika-, cargo-, garnisoni-, luure- ja taastumisülesannetest. TacticalAI käsud läbivad sama commands.ts valideerimise nagu mängija omad. Relvapesade moona ühine suhtarv väldib tühja põhirelva tõttu ekslikku taandumist. Taastumine valib vajalike stock'idega sõlme; remont kasutab inseneri käsuteed, õhk air-return käsuteed. aiDecisionAt vähendab käsu/marsruudi nullimist iga tick ning kuulub koos aiIntent-iga worldHash-i ja v19 täielikku Entity olekusse. JSON ai-tactics määrab kontakti vanuse, otsuse intervalli, reservi ja taastumise lävendid; uut AI kõrvalsimulatsiooni ei lisatud.
