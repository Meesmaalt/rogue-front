# Arhitektuur

Hetkeseisu koodipõhine ülevaade ja järgmiste muudatuste sõltuvused: [DEVELOPMENT-PLAN.md](DEVELOPMENT-PLAN.md). Allpool on ka ajaloolised kirjeldused: Roheorg on nüüd 1088 m (layout 16, kompaktsed jõekülad + 5 ressursirajatist, jõgi ja viis silda), vana 640/960 m/layout-kirjeldus ei ole selle kaardi hetkeseis. Aktiivne arendusjärjekord on TODO alguses.

## Maapealne lennuveose teenindus ja rühma esitus · 15.10.2026

`groundHandling.ts` on fikseeritud sammuga maapealse teeninduse olekumasin. `groundHandler` on päris, mittetoodetav logistikaüksus, mille liikumine kasutab olemasolevat navigeerimist ja sõidukite kokkupõrkeid. Luugi juures liigub veos lennuki/kopteri `cargo`-väljast masina `cargo`-välja; ainult ühendatud lao laadimiskohas kutsub masin välja `receiveSupply`. Veose kogus ei teki ootamise ega animatsiooni kaudu. Täis/peatatud laos koorem säilib, hävinud masin registreerib päris kaotuse, hävinud lao korral saab veos jõuda teise lattu. Kaubamasinad valivad eraldi, navigeeritavad laadimiskohad; uus katse on ajaliselt piiratud. Teenindustöö, masinaviide, korduskatse aeg, maandumiskoha number ja luugi olek kuuluvad täissalvestusse ning replay räsisse.

`logisticsLandingPoint` jagab kogumiskopterite ja väliste tarnete vahel samu püsivaid lao maandumiskohti, kontrollides rootorite vahekaugust ning maapealset ühendust laoga. Kopter ootab maas nii mahalaadimise kui luugi sulgumise; `logisticsDeparture` lisab enne liikumist rootorite käivitumise. `AircraftAudio` ja `UnitRenderer` võtavad sama lennuoleku: maas on kopteri RPM/power null ning esitus pidurdab tiivikud täieliku seiskumiseni. `CargoHandlingVisual` joonistab kaubamasina, tegeliku koormaga nähtavad kastid ja liikuva tagaluugi. Ükski renderdusfunktsioon ei muuda laovarusid.

`SquadMotion.ts` hoiab ainult esituse liikmeasendeid maailmaruumis. Iga liige järgneb oma sihtkohale erineva reageerimise, sujuva pööramise ja läbitud teepikkusest sõltuva sammuga. Rootrühma pöördumine ei pööra kogu koosseisu jäiga vardana. Renderdaja proovib iga liikme maapinnakõrgust ning väldib blokeeritud maad. Lähi- ja kaugmudel jagavad sama liikmeasendit; garrison/dessant/kaamerale tagasiilmumine lähtestab esituse kontrollitult. Rühma käsu- ja lahinguolek ei sõltu kaadrisagedusest ega neist visuaalsetest järgnejatest.

## Hoonete funktsioonitähised ja siluetid · 15.10.2026

`FacilityDetails.ts` lisab hoonele funktsiooni järgi geomeetrilised tähised ja detailid enne `Architecture.ts` staatilist materjalide koondamist. Tähed on vektorgeomeetria, seega ei vaja eraldi fonti ega tekstuuri allalaadimist. Kopteriplatsil on suur valge H/ring ja tuulesukk, tehasel tõstetala ja väljatõmbekorstnad, laol laadimisvarikatus ning riiulid, kasarmul harjutusala; strateegiakeskustel oma katuseehitised/antennid. `militarySilhouette`, `facilityLabel` ja `facilityDetails` metaandmed säilivad koondamisel ning testid piiravad ühe hoone materjalipartiide arvu 12-ni. Hoonete navigatsiooni ja ehitusraadiuseid esituse detailid ei muuda.

## Dessant ja strateegilised relvad · 15.10.2026

Tavaline uus üksikmäng kasutab `createSkirmish` peamaja + kahe inseneri algust; ainult `deployment=ready` aktiveerib näidisbaasi. Vanade lahingute jätkamine kasutab salvestatud üksusi.

`airTransport` on lennubaasi 2. taseme päris toodetav üksus. `airlift.ts` arvestab laaditud ja broneeritud veose sõidukikohti ning tegelikke rühmaliikmeid, kaasa arvatud APC sees olevad inimesed. Maapinnal läheneb reisija lennukile tavalise navigeerimisega. Dessandikäsk kontrollib kõrgust ja kõigile veoseüksustele vaba läbitavat maandumisala enne lasti vabastamist. Üksused laskuvad fikseeritud sammuga; renderdaja lisab ühise materjaliga langevarjukupli ja nöörid. Lennuk kasutab olemasolevat varustuslennuki GLB-d, aga mitte automaatset kaubaringi. Metric-lennu kõrgus on dessandile sobiv 180 m, kompaktsel kaardil 120 m.

`expansion.json` määrab uute hoonete, veose ja strateegiliste relvade hinnad/ajad/piirid. `strategicWeapons.ts` haldab tasulist tootmist, uurimist ja käsitsi antavat koordinaatlööki. Tiibrakett kasutab ühise raketifüüsika piiratud jõudu, takistust ja pööramiskiirendust ning koordinaatjuhtimist; ICBM on gravitatsiooniga ballistiline lend, mitte kohene tabamus. Stardihälve tuleb maailma seemnega RNG-st. Tavalaeng kahjustab vastast; tuumalaeng kasutab sama geomeetrilist plahvatust koos oma üksuste kahjustamisega. Energia, juhtimisühendus ja lähedane ühendatud ladu on tootmise/stardi eeltingimused. Tuumauuring, tootmistöö, raketivaru, laskumise olek ja koordinaatjuhtimine kuuluvad täissalvestusse ning replay räsi sisse. UI annab ainult uusi käske, olekut muudab simulatsioon.

Tootmishoone valik on nii UI-s kui `produce` käsus ühine `producerKind`; eraldi käsuloend ei tohi blokeerida uusi üksusi. Uued kaitsetornid kasutavad tavalisi relvaprofiile, laskemoonavarusid, ehitus- ja navigeerimissüsteemi. Pooleliolev hoone ei tohi tulistada.

## Pinna teravus ja kiirliikumine

`RoadSurface.ts` eemaldab tee eraldusvõime sõltuvuse kaardi suurusest: asfalt kordub iga 6 maailmameetri järel ja märgistused on geomeetria. `groundRectangle` lõikab pinna tegelike maapinnakolmnurkade järgi; mõlemal teeristmiku harul on sama maailmamõõdus UV. 1024 m ruumiplokis on kuni kaks jagatud materjaliga partiid, mitte joonistuskutse iga tänavalõigu/triibu kohta. Teeandmed, navivõrk ja generaator ei muutu. Vana atlas jääb kaugmaastiku põhjavärviks.

Mikropinna tekstuur on 512² RGBA (1 MiB ilma mip-tasemeteta), asfalt 256² (0,25 MiB), sõltumata kaardi suurusest. Suurendasime detaili nähtavuskaugust 550–2200 meetrini, sest varasem 180–650 kaugus kustutas detaili tavalisel kõrgemal mängukaameral. Keskmine/kõrge kvaliteet kasutab sama arvu shaderi tekstuuriproove; madala taseme väljalülitus säilib.

F või G aktiveerib kiirliikumise. Sihtkoha vasakklõps tarbitakse enne valiku muutmist; paremklõps/minikaart jätkavad töötamist. Shift säilitab režiimi ning lisab vahepunkte, Esc tühistab. Suurtüki tulemissioon on T-klahvil. Simulatsiooni `fast-move` kasutab olemasolevat `travelPathCost` kaalutud A*-rada ja tegelikku maantee kiirust; uut üldist kiiruskordajat ei lisata.


## Hoonete tootmine ja Vahemere maastik · v13

Uute missioonide serveri/worker'i tee kasutab v13 generaatorit. `mediterranean` konfiguratsioon vähendab ühendatud metsamassiive ning jätab kõrged nõlvad avatuks; põllud ja elamud kasutavad kuiva Vahemere paletti. Iga kolmas seeme lisab keskse kustunud kaldeera: olemasolevate kompaktsete reljeefikernelite ring, kivine `cropPattern: bare` atlasekiht ning kesktee möödumine. Keskne ressurss nihkub kraatrist väljapoole. Kaardid läbivad sama navigatsiooni/lennuraja kontrolli. v2–v12 taastamine ja v12 kompaktne lahingumõõtkava säilivad.

`BuildingProduction.ts` valib ainult kasutaja valitud oma tootmishoone ning tagastab tellimuse tegeliku piirangu. HUD annab `produce` käsule alati selle hoone ID; teine vaba tehas ei võta tellimust üle. Keritav tootmispaneel paikneb valitud hoone kõrval alaservas; ülemine Ehita avab ehituse. Relvastuse ümberehitus säilib eraldi suletavas varustuslao hoolduse plokis.

Heli on endiselt originaalne Web Audio süntees: raketil eraldi stardi-, mootori- ja rõhukihid, kahuril terav transient ja madal järelkaja. Aeglane madal ambient asendab arpedžo. Kaks sekundit jagatud mürapuhvrit kordub pikemate kihtide korral; helide arv, paus ja sõltumatud helitugevused säilivad. See ei lisa heli- ega muusika-allalaadimist. Kauba- ja pommilennuki GLB kaugmudel säilitab `armor` materjali/UV-d, `AircraftCamouflage.ts` taaskasutab riigi jagatud tekstuurist suuremate laikudega varianti mõlema LOD-i jaoks.


## Aktiivne mängureeglistik · 14.10.2026

Mängukaardid on ainult protseduurkaardid. Ajaloolised Roheoru/Murdlaine kirjeldused allpool on regressioonitaust. `platforms.json` piirab tootmise 15 põhiklassile; `equipment.json` kirjeldab 16 vahetatavat komponenti. `configure-unit`/`cancel-refit` käsud käivad fikseeritud sim-sammu kaudu; `equipment.ts` hooldus ei täida moona ega paranda tasuta. `physics.json` juhib uue reeglistiku trajektoore. Komponendid ja pooleliolev töö sisalduvad snapshot/replay räsis. Detailid: [MODULAR-PROCEDURAL-RELEASE.md](MODULAR-PROCEDURAL-RELEASE.md).

## Kompaktne lahing ja ettevalmistus · v12

Peamenüü küsib serverilt taustal täieliku kontrollitud missiooni. `PreparedMission.ts` kannab sama geomeetria `sessionStorage` kaudu lehe navigeerimise üle; käivitus loeb seda enne seemne järgi taastamise varuteed. Kohalik kontroll käib eraldi `MapPreparation.worker.ts` workeris. Vananenud vastused ei asenda uuemat valikut. Kõrgusvälja `hydrologyBins` säilitab maskide järjekorra ja jätab iga punkti juures kauged vee-/sillamaskid vahele.

`World.compactBattle` on uue v12 missiooni ja salvestuse lipp. `metricUnitDefinition` hoiab relva algsed `displayRange`/`displayMinimumRange` ning arvutab füüsilise mänguulatuse eraldi; relvakaardid ja ringide sildid näitavad algmeetrit, ringi geomeetria/AI/tulistamine kasutavad sama lühendatud ulatust. Nähtavus, lennukõrgus ja õhukiirus on eraldi häälestatud. V9–v11 jäävad senise mõõtkavaga.

Kaubaveo `runwayEdgePoint` pikendab lennuraja keskjoone kaardist välja, metric cargo järgib maandumise/pidurduse/perrooni/mahalaadimise/tõusu olekuid. Raha ja laovarud muutuvad ainult vastuvõetud päris lasti mahalaadimisel. Ainult kaubamudelite eksport on `art:cargo`. V12 lisab kitsaid sisemisi reljeefiharju ja jätab naabermetsade ühised krundiservad ühendatuks. Kiire arendusring: [DEV-WORKFLOW.md](DEV-WORKFLOW.md).

## Lennuvälja pind ja nähtavuse stabiilsus

`GroundSurface.ts` jagab maapinna ruudustiku paigutust `Terrain`-iga ning interpoleerib renderdatud kolmnurkade kõrgust. `MetricRunway` lõikab katte- ja märgistuseristkülikud iga maapinnakolmnurga järgi: sama tasapind + väike kõrgusvahe, mitte jämeda raja ja peenema kõrgusvälja ristumine. Kogu kate jääb üheks vertex-värvidega joonistuskutseks. `Architecture.createMetricAirfieldStructures` jätab tegelikud lennukite parkimiskohad vabaks ja paigutab suuremad angaarid/torni perroonist tahapoole. Visuaalsed perroonimaskid eemaldavad seal puud, alusmetsa ja küpsetatud puuvarjud. Simulatsiooni raja/parkimise koordinaadid ei muutu.

`Vision` kasutab nähtavuse säilitusaja kontrollis sama `metric` lippu nagu vaatlejate jaotatud uuendamisel; väikese kaardi iga partii ei kustuta enam eelmise partii vaadet. `StableShadows` hoiab fikseeritud mõõdu ja suunaga valgusprojektsiooni, joondab keskme valgusruumi varjupikslitega ning nihutab katet ainult kaamera vaate keskme piisaval eemaldumisel. Hoone ehituse või hävimise sundvärskendus ei nihuta valgust. Kõik visuaalsed mõõdud on `terrain.json.render` all.

## Serveri värske kaart · v11

`freshMap.ts` kasutab versiooniga generaatorit ja kontrollib päris `NavGrid` ühendust: mõlemad baasid ja üheksa ressursipunkti peavad olema samas läbitavas piirkonnas. Lennuraja täielik ulatus peab jääma kuivale, hooneteta mängualale. Ebaõnnestumisel proovitakse deterministlikult järgmist seemet; salvestusse läheb õnnestunud seemnega kaardi ID. `server/map-generation.js` valib krüptograafilise seemne ja käivitab kuni kaks eraldi workerit, nii et kaardi eeltöö ei blokeeri 30 Hz võrguvoogu. Server loob kaardi ka ranked/lobby jaoks. Kliendid taastavad sama versiooni ja seemne; vanad v2–v10 ID-d jäävad taastatavaks.

`battle-scale.json.mapSizes` lubab 2–6 km kaarte kuue valikuga. Uue väikese meetrikaardi `World` saab mõõtkava juba konstruktoris, et `Vision` kasutaks 256×256 piiratud ja ajastatud nähtavusvõrku. Vanade väikeste kaartide nähtavus säilib. Serveri Docker ehitab jagatud TS generaatori esbuildiga eraldi etapis; arenduses `npm run server:build` / `npm run server:start`. Üksikmängu uue lahingu vaikimisi tee on `/api/maps/generate`; võrguühenduseta toimub sama kontroll kohalikult. Detailid: [PROCEDURAL-V11-RELEASE.md](PROCEDURAL-V11-RELEASE.md).

## Meetrites lahing · v9

`battle-scale.json` määrab uue 4/6 km reeglistiku. `World.metricBattle` valib `metricUnitDefinition` kaudu tegelikud ulatused ja kiirused enne üksuste loomist; salvestus säilitab lipu/definitsioonid. `metricScale` valib üksuse lennuprofiili ja ühise lennuvälja geomeetria. Nav/veenav/kõrguspuhver on piiratud 1024 rakuni ühe telje kohta, udu 256 rakuni. Udu jooksva ajastuse olek on snapshot/räsi osa. `SpatialHash` valib piiratud päringualal tiheda või järjestatud hõreda läbimise. Piirid ja testid: [METRIC-BATTLE-RELEASE.md](METRIC-BATTLE-RELEASE.md).

## Loomulik maastik ja heli · v10

`naturalLandscape.ts` lisab kompaktse madala reljeefi ja muudab metsa servi, hoides kruntide/teede piirid. `farmland-natural` kõrgusprofiil jätab vana farmland kõrguse taastamistee alles. Puude/bushide paigutus on andmepõhise piiriga ning jagatud sim-vegetatsiooniga. Valmis algus kasutab lennuvälja ja stardivarustuse selgesõnalist granti. `battle-scale.json.weaponOverrides` eristab platvormide relvaulatusi. `AudioManager` loeb sündmusi ning kaamera asukohta, juhib eraldi master/SFX/music siine ja piirab hääli; audio ei muuda simi. Detailid: [NATURAL-LANDSCAPE-AUDIO-RELEASE.md](NATURAL-LANDSCAPE-AUDIO-RELEASE.md).

## Lahingu tagasiside ja kontaktid

`projectiles.ts.segmentBodyEntry` arvutab üksuse ellipsoidi esimese kontaktaja; põhiklasside reeglistik võrdleb seda takistuste proovitud kontaktajaga. APS kasutab sama segmendikontrolli ja annab eraldi `intercept` sündmuse. `Fx.syncUnitEffects` loeb tervist, komponendikahjustust ja liikumist, lisades olemasolevatesse piiratud partiidesse nähtavate üksuste suitsu/tolmu. See ei muuda simi ega loo eraldi üksusemeshe. Detailid: [COMBAT-FEEDBACK-RELEASE.md](COMBAT-FEEDBACK-RELEASE.md).

## Liikumisfüüsika ja vedrustus

`groundDynamics.ts` annab meetrites maasõidukite pinnase/nõlva jõud, teepikkuse integraatori ja kurvi eel pidurdamise piirkiiruse. Sama moodul seob lennuki kalde tsentripetaalkiirendusega. Lisanduvat salvestatavat sim-olekut pole. `MotionPresentation.springSuspension` on ainult renderduses kasutatav analüütiline summutatud vedru; `Fx` võtab liikumistolmu jaoks tegeliku fikseeritud sammu nihke. Parameetrid on `mobility.json`-is. Detailid: [MOVEMENT-PHYSICS-RELEASE.md](MOVEMENT-PHYSICS-RELEASE.md).

## Kompaktne väljalase

`art-models.json` jagab mudeliliikide nimekirja renderdaja, generaatori ja `scripts/release/compact.mjs` vahel. Standardbuild kontrollib ja säilitab 66 vajalikku detail-/kaugmudelit; ajaloolised varad jäävad lähtepuusse. `dist` puhastatakse Vite buildi järel. Nginx määrab GLB MIME-tüübi ja gzip-pakkimise; dokumentatsiooni pildid on pikslitäpselt kadudeta WebP-d ning jäävad Dockeri põhikontekstist välja. Detailid: [CLEANUP-RELEASE.md](CLEANUP-RELEASE.md).

## Maapinna mikropind

`render/TerrainDetail.ts` pakib 256² andmetekstuuri mikroreljeefi ja albeedovariatsiooni ning jagab seda olemasoleva bump-sampleriga. Standardmaterjali shader hajutab detaili kaamerakauguse järgi ja aheldub sõjauduga. `terrain.json.render.detail` määrab maailmamõõdu, hajumise ja kvaliteediprofiilid. Geomeetria/partiid ei kasva; madal kvaliteet lülitab lisavärvidetaili ja bump-arvutuse välja. Detailid: [TERRAIN-DETAIL-RELEASE.md](TERRAIN-DETAIL-RELEASE.md).

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

Merevägi kasutab sama tootmise, käsu-, relva- ja varustussüsteemi; `World.waterNav` hoiab eraldi ainult veest tuletatud A* maski. Sadam kulutab ühendatud maa-lao füüsilisi varusid. Rannikumapi ja relvade ühendused: [NAVAL-WARFARE-RELEASE.md](NAVAL-WARFARE-RELEASE.md).
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

`ui/TutorialGuide` loeb olemasolevat missioonisammu ja maailma olekut ning tagastab valiku-ID-d, staatilise/oma sihtpunkti, avatava paneeli ja nupu selektori. HUD valib ja avab UI-d olemasolevate callback'ide kaudu, mitte ei muuda simi/õpetuse progressi. Ehitusharu valitakse koos inseneriga; pooleliolev hoone suunab ootama ja puuduv üksus/tootja taastamisele. Majasoovitus kasutab vaid nähtavat kahjustust ning oma/nähtavaid garnisone.

Õpetuse `mapRef` lahendatakse samast Roheoru JSON-ist nagu skirmish: maastikuandmeid ei dubleerita missioonifaili. Roheoru õpetus kasutab `MissionController`-i olemasolevat ülesannete ahelat. Uuendus, pardale minek ja garnison kontrollivad päris entiteedi seisundit; HUD loeb aktiivse sammu ja annab vaid valiku/kaamera käsu. Hävitamis- ja sabotaažisihtmärgid seotakse algsete ID-dega ning säilivad snapshot'is. Üldauditi raport: [PROJECT-QUALITY-AUDIT.md](PROJECT-QUALITY-AUDIT.md).

`OnlineShell` avab vaikimisi kohaliku mänguseadistuse. `main.ts` valib ühe algoleku (skirmish või kampaania), loob ühe `World`-i ja kinnitab sellele sobiva võidu- või missioonikontrolleri. Need töötavad `World.tick()` sees; HUD ei muuda skoori ega missiooni progressi.

Ressursirajatis käivitatakse inseneriga. Füüsiline kogumistransport annab tarne saabudes `World.receiveSupply()` kaudu raha ning ammo/fuel/repair varud. Tootja vajab töötavat juhtimisharu, energiat ja kohalikku varustatud ladu. Eesliinilaole veetakse piiratud varud pealaost; edasisaatmine uut raha ei tekita. Marsruudikäsud määravad päris veoki teekonna vahepunktid.

Formation on meeskonna `Command`, mitte mooduli globaalne UI-olek. v20 salvestus lisab kaardi geomeetria signatuuri, reeglistiku tunnuse ja taastamise vea korral rollback'i. Kohalik salvestusümbris kontrollib missiooni, kõrgusallikat, fraktsiooni ja režiimi. Salvestus sisaldab entiteetide täisolekut, sihtviiteid, mürske, ootel käske, varusid, RNG-d, nägemisvõrku, AI ajastust, decki ja kontrollerite progressi. v2 replay alustab salvestatud algolekust; replay peab kasutama sama kaardi/kõrgusvälja seadistust. Laadimine taastab simulatsiooni ja tühjendab renderdusvaated.

AI operatiivne kaart uuendatakse 8 s otsustusintervallil, mitte igal simulatsioonisammul. Ressursi sihtvalik kasutab tegelikku avalikku omanikku ning kontakte ainult oma luurest. Conquesti ja Breakthrough' ründelained kasutavad sama operatiivset sihti. `knowledge.issueGroundObjective` jätab sama eesmärgi marsi ja nähtava lahingukontakti puutumata; kontrollib ka ootel käske ning laseb baasi kaitsel rünnaku üle võtta. Reservivalik eelistab baasi lähedal valmis üksusi. Taastumispaus kasutab olemasolevat salvestatavat operatiivplaani; TacticalAI teeb tegelikud varustus-/remondikäsud ja taastunud üksused naasevad ründejõusse. Uut eraldi AI olekumälu pole lisatud.

Laokonvoide olemasolev tsükkel toetab mõlemat suunda: puudujäägiga edasilaole väljavedu ja varupuuduses pealattu tagasivedu ühendatud edasilao ülejäägist. `logisticsPhase=unloading` hoiab tagasitarne suunda kuni olemasoleva finite koorma üleandmiseni; kogu faas/koorem/sihtpunkt on juba save/replay olekus. Koorem eemaldatakse lähtevarust ning üleandmine ei loo raha. Kogumispark on piiratud lao kaupa; automaatne tühi koguja saab minna varupuuduses pealao teenistusse, kuid koorem ja käsitsi allikas/marsruut säilitavad sihtkoha. `serviceFuelAvailable` jätab vaikimisi 40 ühikut lao kütust tootmisele; lao Kütuseprioriteet vabastab selle. Simi, AI taastumise ja HUD-i teenindusvalik kasutavad sama reservireeglit. Veokite/inseneride marsruudi kordusotsing väldib samu kohalikke pargitud maaüksusi nagu tavaline maaväe nav.

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

HUD-i valikuinfo on korrektne div-konteiner, mille incremental patch säilitab avatavad detailid. Relvade tegelikud laskegate'id/ulatuse nupud jäävad lühivaatesse; kontekstuaalne maastik/varustusinfo avaneb eraldi. Kaardi tsiviilhoonete lähimudel ja LOD jagavad fassaadiatlast; aknad ei tekita eraldi geomeetriat. Sillad on hävitamise ID-ga säilitatud staatilised partiid, teekate jagab tee maailma-UV-skaalat; majade õuesillutise kolmnurgad lõigatakse tee-/silla-/veealast eemale. Need muudatused ei muuda simi ega nav-geomeetriat.

`Picker.setPresentation` saab `UnitRenderer.positionFor`-ilt ainult nähtava mudeli viimase renderdatud juurpositsiooni. Overlay ja hiire-/kastivalik kasutavad seda ühiselt; fallback on simi positsioon ning vaenlase nähtavuse/pardaloleku kontroll säilib. `MarkerLayout` on ainult UI hõiveruudustik: püsivad suhtelised sildiridad, piiratud ajalugu ning HUD-/hoiatusala reserv. Intelimärgid kasutavad üksnes salvestatud kontaktikoordinaate ja tüüpi, näitavad vanust ning ei kuulu Picker-i tabamusristkülikutesse. Save/load ja algoleku vahetus lähtestavad esitusvahemälud.

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

## HUD ja minikaardi taaskasutus

HUD eristab kaarti, üksuse valikut/käske ja tootmist/ehitust; kontekstnupud jäävad samade Command-käskude kaudu ühendatuks. Tootjate lühima järjekorra indeks arvutatakse iga HUD-uuenduse kohta ühe läbimisega, mitte ei püsi simulatsioonis. Minikaart hoiab staatilist kõrguse/feature canvas't, mille silla kokkuvarisemise või taastumise olek invalideerib. tacticalSupplyNodes vaadet taaskasutatakse vaid ühe joonistuse sees; varustuse otsuse teeb ühine isTacticallySupplied. Vt UI-PERFORMANCE-POLISH.md.

## Kohalikud kattepäringud

TerrainState hoiab staatiliste kattefeature'ite 32 m kandidaatindeksit. Sensors ja combat kontrollivad kandidaatide täpseid pööratud footprint'e seniste paddingutega; live metsakahju/garnison loetakse tavaliselt. SpatialHash taaskasutab bucket'e ja tühjendab ainult hõivatud lahtrid. Mõlemad indeksid on tuletatud, mitte save/hash olek. Konvoide ja renderduse varustusalamhulgad kehtivad vaid ühe funktsioonikutse jooksul. Vt PERFORMANCE-LOCAL-QUERIES.md.

## Kitsaskohad ja taastumine

NavGrid kasutab ringi ja blokeeritud ruudu kaugust, mitte üles ümardatud raadiuse ruududilatatsiooni. units.ts jagatud groundSidestep hoiab möödumiskülge; ummiku A* ümbersõit otsib lähedasi peatunud sõidukeid SpatialHash-ist ja on ajaliselt piiratud. Vältimisolek ja kinnijäämise loendurid kuuluvad save/hash-i. TacticalAI hindab tegelikult vajalikke laovarusid, läbitavat teeninduskohta ning reserveerib hõivatud remondiinsenerid. tacticalSupply.repairDepotFor ühendab AI/üksuse teenindamise füüsilise varu reegliga; katkestatud ühendus ei kustuta alles olevat laovaru. Andmepõhine componentDamage taastumislävend ühendab komponentkahju taandumisega. Vt MOVEMENT-RECOVERY-POLISH.md.

## Laskekauguse hoidmine ja EVAC

units.ts valib tehnika laskepositsioonid mobility.navigation.vehicleFiringFactors järgi ning kasutab combatWithdrawing hüstereesi. Torniga tehnikal pööratakse tagurdamiseks liikumisvektor, säilitades kere ja torni sihtimise. stationaryFireReadyAt piirab ainult fireOnMove=false relva päris lasku. Ründelennuki flightAttackExit/Until juhivad laskmisjärgset eemaldumist olemasolevas moveAirTo tsüklis; CAP jääb eraldi. air-return puhastab vana ülesande ja airDoctrine.requestAirReturn tühistab pooleli transpordi, säilitades cargoUnitIds. Baasi kauguse kütusehinnang ja komponendikahju kasutavad olemasolevat returning/landing/rearming tsüklit. Uued olekud kuuluvad v20 save ja replay hash-i. HUD ja klahv E väljastavad sama olemasoleva käsu. Vt FIRING-MANEUVER-EVAC.md.

## Visuaalse liikumise näidis

World.tick säilitab py/pFlightPitch/pFlightBank koos olemasoleva px/pz/pHeading/pTurretYaw-ga. render/MotionPresentation täidab caller-owned poosi ning filtreerib ainult kosmeetilisi amplituude; see ei kirjuta World-i ega anna käske. UnitRenderer kasutab tegelikku ticki teekonda sammu ja vedrustuse animatsioonis ning interpoleeritud lennukõrgust/kallet. main külmutab pausi/lõpu korral alpha=1 ja animationDt=0, sealhulgas mürskude asukohad. Optional visuaalsed lähteandmed säilivad fullEntities salvestuses ning vanade salvestuste korral kasutatakse praegust kõrgust/kallet. Vt VISUAL-MOTION-POLISH.md.

## Kaart ja lahinguvaate ruum

Roheoru autoritud teevõrk pärineb scripts/maps/finish-road-network.py-st. Tee servad joonistatakse enne sõiduteevõrku jagatud materjalidega; sillad sisaldavad oma eemaldatavas juures ka sõidupinda ja toestusi. Hud reparentib olemasoleva tootmispaneeli juure alla avatavaks ülemiseks ribaks, säilitades nupud/viited/käsud. Alumisel alal on sõltumatud minikaart ja valiku paneel. Fullscreen.ts ühendab brauseri Fullscreen API nii HUD-i kui OnlineShell-i nupuga. OnlineShell renderdab kahe skirmish-kaardi eelvaated tegelikest feature-andmetest. Murdlaine coast2 kasutab olemasolevat mereväe missiooni, lisades kuiva maa asulaid ja teid. saveMapSignature sordib staatilise feature-loendi ID järgi koopias; legacy signatuuri kontroll jääb sama järjestusega vanale v20 failile. Vt MAP-HUD-FULLSCREEN.md.

## Ranniku ühine geomeetria ja indeks

Murdlaine layout 3 kasutab sama veeribade geomeetriat kõrgusväljas, laevade navigatsioonis, minikaardil ja mere renderduses. `mapFeatures.MapFeatureIndex` säilitab allikajärjekorra ja annab pööratud/polsterdatud AABB alusel kohaliku kandidaatide hulga pinnase- ning veokipäringutele ja puude paigutamisele. Täpsed jäljekontrollid jäävad tarbijatesse. WaterNavGrid kasutab rasterdamiseks kitsamat pööratud AABB-d. Ülevaade ja kontrollid: [COAST-MAP-PERFORMANCE.md](COAST-MAP-PERFORMANCE.md).

### Valitud varustusahela loetavus

`tacticalSupplyDepot` valib simulatsiooni ja HUD-i jaoks sama kohaliku lao, eelistades üksuse puuduva moona/kütuse jaoks sobivat varu. Katkenud upstream ei kustuta FOB-i kohalikku füüsilist varu. Overlay loeb ainult oma üksusi: valitud lao ümber tegelik teenindusraadius, kuni 12 kohaliku üksuse seosed ning kuni 12 konvoi marsruudid/olekud. Ressursivedu ja pealaost FOB-i vedu on eristatud; need jooned on kavandatud marsruut, mitte tasuta ülekanne. Õhu teenindus jääb missiooni/baasi HUD-i, mereteenindus kasutab olemasolevat sadama-lao valikut. Kaardi visuaalne ülevaatus ja FPS vajavad brauseris hindamist.

### Ründekäsu relvaulatus ja visuaalse kihi töö

Relvavalik eelistab sobivat laetud relva, mille tegelik ulatus/minimum juba katab sihtmärgi. Kui ükski relv ei ulatu, kasutatakse lähenemisel pikimat sobivat relva. Esmane peatumispiir vastab nüüd samale efektiivsele ulatusele kui lasu kontroll, mitte 92% piirile. Relvade `targetHelicopters` laiendab ainult vastava maarelva kopterisihtmärke; hävitajaid see ei luba. Faction heli kahur kasutab seda koos CAP toetuse/moonaarvestusega, ATGM ja raketipakett jäävad maarelvadeks.

HUD säilitab sama valiku kaardil DOM-elemendid ja details-oleku, muutes näite kohapeal. Uus valik taastab kaardi struktuuri. Salvestuse olemasolu loetakse lahingu algul, õnnestunud salvestamisel ja teise akna storage-sündmusel, mitte igal HUD-värskendusel. Kaameraga liikuv staatiline varjukaart värskendub kuni 8 Hz, ehitus-/geomeetriamuutus kohe; garnisoni hõiveloend 5 Hz. Need vähendavad korduvat tööd, kuid mõõdetud brauseri FPS-i tulemust veel ei ole.

### Paremklõpsu asetus ja käsu kinnitused

Vasakklõps valib ning tühistab vana sihtrežiimi; erand on teadlik hoone paigutus. Sihtkäsud antakse paremklõpsuga. Mobiilse valiku paremlohistus kasutab vajutuspunkti rühma keskpunktina ja lohistussuunda lõppsuunana, näitab sama `formationPoints` nimipaigutust kui command-süsteem ning saadab käsu vabastamisel. Nav võib takistusega sihtkohta kohandada. `move/fast-move/amove.facing` kandub `moveFacing`-usse ja vahepunkti metadata-sse; maaüksus pöörab saabudes, kui lahingusihtmärki pole. Uus ülesanne puhastab selle. Olek säilib full-state save'is ja replay hashis.

Overlay joonistab lühiajaliselt värviga eristatud käsuringi/teksti, liikumisel rohelise kinnituse ja ründamisel punase sihiku. Püsivad tavalise liikumise, ründe ja üksuse-lao jooned on eemaldatud; lao valimisel nähtav füüsilise logistika vaade säilib. Lootuseta käsu tegelik tagasilükkamine tuleb simi order-rejected tagasisidest. Brauseri visuaalne kontroll on veel tegemata.

### Kaameraga sünkroonne udu ja kompaktsed käsutähised

FogOfWar ei hoia enam kaamera liikumisel 100 ms vana ekraanipilti. Pickeri viewVersion kontrollib olemasolevaid view/projection maatrikseid ilma stringide eraldamiseta; udu joonistab kaamera, sim-aja või render-interpolatsiooni muutumisel. Vaatleja render-asukoht kasutab sama alpha't kui mudel. Poole ekraaniresolutsiooniga canvas joonistatakse otse ja CSS skaleerib pehme kihi üles: üks pind, veerand piksleid, eemaldatud eraldi täisresolutsiooniga puhver/koopia. Tegelik luurekontaktide ja nähtavuse simulatsioon ei muutu.

Taktikaliste siltide canvas piirab DPR-i 1.25-ni, kasutab taaskasutatavat arvuliste ruumilahtrite Set'i. Käsukinnitus on 850 ms fikseeritud mõõtudega liikumisnooled või ründesihik, maksimaalselt kolm korraga. CommandController ei loo enam sellele lisaks Fx 3D-ringi; lahingu/tarnevõtmise Fx jäävad eraldi. Renderduse regressioonid kinnitavad paani/suumi/pöörde invalidatsiooni, vahepildi interpolatsiooni ja udukihi mõõtmeid; reaalse FPS-i tulemust pole veel mõõdetud.

### Panning, stabiilne varjuala ja ümarad metsad

RtsCamera kasutab andmepõhist eksponentsiaalset sisendkiiruse/zoom/kõrguse silumist ja normaliseeritud diagonaalliikumist. JumpTo taastab kohe fookuse/kõrguse ning tühistab triivi. Kaamera edastab shadowFocus'i, mitte ei liiguta valgust iga kaadriga. Renderer liigutab valgust ja varjukaarti koos: katvuse sisepiiri ületamisel, zoomi katvuse muutusel või geomeetria sunnitud invalidatsioonil. See eemaldab vana varjutekstuuri ja uue valgusmaatriksi lahknemise ning vähendab panningu ajal suuri varjupasse.

Metsadel on üks opaque SphereGeometry-võra puu kohta lähivaates ja üks 20 kolmnurgaga IcosahedronGeometry-võra kaugvaates, jagatud materjalid ja 64 m instantsirühmade LOD. Võrakuju on ruumiline ja ümardatud, toon/suurus/pöörang varieeruvad. Near geomeetria kolmnurkade arv on suurem kui lehepindadel, kuid alpha-overdraw ja metsade varjupassid eemaldatud. Põleng kasutab sama forestPoints/forestCrownCount=1 olekut ning charred skaala/tooni ühendust. FPS-i mõõdetud tulemust ei ole; lühikesed kontrollid katavad camera smoothing'u ja instantsirühmade struktuuri.

## V1: ajastus, mõõdikud ja maailma nähtavus

GameLoop piirab ühe kaadri tööd kolme fikseeritud sim-sammuga, kuid säilitab aktiivse kaadri ajavõla. Mahajäämuse ajal alpha piiratakse 1-ni; renderduse dt on endiselt kuni 0.1 s. Peidetud brauseritab ei kogu uut kohalikku sim-ajavõlga; taustapaus mõõdetakse eraldi. Võrgupakette see mehhanism ei kustuta. Update võib tagastada false, kui mäng seisab või lockstep ootab paketti; mõõdikud ei loe seda sim-sammuks.

PerformancePanel on lülitatav F8 või Seaded → Jõudluse mõõdikud. Mõõtmine on tavaliselt väljas. Lubatuna hoitakse kuni 600 kaadriaega ja 180 poole sekundi väljavõtet; JSON eksport sisaldab resolutsiooni/kvaliteeti, mediaani/p95/p99, CPU kulu, joonistuskäske, kolmnurki, maailmaaega ja ajavõlga. GPU aeg jääb mõõtmata.

Scene juur ei arvuta oma muutumatut maatriksit iga kaadri järel. Terrain külmutab staatilised lokaalsed maatriksid; kahjustatud maja kutsub updateMatrix, mis uuendab ka selle alamobjekte. Garrisoni feature lookup säilib kuni kaardiandmete viide muutub.

FogOfWar lisab olemasolevatele maastiku StandardMaterial-idele maailma koordinaatidega tekstuuripäringu. Kaks väikest RGBA DataTexture-it loevad Vision.copyStates kaudu sama 4 m nähtavusruudustikku: nähtav, uuritud ja uurimata. Vision.revision on tuletatud render-invalideerimine ega kuulu save/hash'i. Kaamera liikumine ei laadi tekstuuri uuesti ega joonista 2D-udukanvast. Uus ruudustik seguneb eelmise kuvatud olekuga 0.12 s jooksul; rewind/meeskonnavahetus rakendub kohe. Täpne üksuse detection/recon jääb sensors süsteemile; ruudustik ei asenda combat-LOS-i.

## V2: rühma läbipääs ja saabumine

formationPoints kasutab mobility.navigation vaheandmeid: jalaväe minimaalne vahe 6.5 m; suure tehnika vahe vähemalt neljakordne raadius + läbipääsuvaru. Nii ei sulge kohale jõudnud masinad järgmiste lõppkohti. Eelvaade ja päris käsupaigutus loevad sama funktsiooni. Kolonni eelkäija leitakse elavatest projektsioonidest ühe läbimisega, sama järjestuse ja ID viigireegliga; iga üksuse jaoks ei looda/sordita koopiat. Kolonni ootevahe rakendub samas sõidureas: kõrvalreast liituja ei peata sillale suundujat pelgalt oma pikisuunalise projektsiooni tõttu. Ummiku möödumistee arvestab ka seisma jäänud liikujaid, mitte ainult idle/hold üksusi.

Kui vastuvõetud marsruut katkeb, jääb eesmärk alles: üksus pidurdab paigal, näitab katkist teed ja proovib olemasoleva retry-timeri järgi uuesti. Vaba koha peal pööramist ei loeta seismajäämiseks; kokkupõrkes kinni pööramine säilitab ummiku tuvastuse; jam-time lisandub ühe korra sammus. Lõppsuund rakendub alles idle/null-dest olekus ja väikese kiirusega, mitte kolonni ootamise või pidurduskaare ajal. Vahepunkti lõpetamine kustutab vana teesihtkoha ja retry-timeri ka alla 5 m järgmise sammu jaoks.

Pathfinder-i pargitud üksuste vältimine ja bodyClear kasutavad sama data-põhist raadiustegurit/vahet. Kui läbitav täpne eesmärk ümardub pargitud üksuse rakku, otsitakse väiksest lõpuraku naabrusest vaba kandidaat ja kontrollitakse viimast lõiku täpse eesmärgini; käsku ei muudeta läbimatuks pelgalt ruudustiku ümardamise tõttu. Uusi salvestatavaid entiteedivälju ei lisatud; fikseeritud samm ja külvatud sim säilivad.

## V3: füüsiline tarne ja AI taastumine

stockLogistics.withdrawPayload laadib olemasoleva lao-FOB veoki sihtlao puudujääkide ja logisticsPriority järgi. Kaalud tulevad logistics.json-ist; kasutamata osad jaotatakse teiste vajalike varude vahel, järgides pealao convoyReserve-i ja veoki kogumahutavust. Laos kulutatakse ainult päriselt pardale pandud varu; transport/depositPayload ei tekita raha. Ühe varuliigi puudusel võib veok selle liigi jaoks kasutada kogu vaba mahutavuse.

nearestSupplyDepot jätab kahjustatud laod välja ja piirab productionStock valiku logistics.depot.productionRadius-ega. Tootmise gate ning tegelik materjalikulu kasutavad sama kohalikku valikut; kaugem täis ladu ei varja kohaliku lao tühjust ega tarnepuuduse põhjust.

WaveAI ootel ehitus-, research-, upgrade- ja tootmiskäsud kasutavad sama ühe update'i eelarvet. Tuletatud pendingProduction/pendingUnits väldivad sama otsustusringi järjekorra ületäitmist; need nullitakse iga AI update'i algul ega vaja save/hash välju. Tavakulutused hoiavad economyReserve-i; põhitaristu ja inseneride taastamine võivad reservi kasutada. engineerReserve kehtib igas doktriinifaasis ning puuduvate inseneride tootmisvõime taastamine eelistab vajadusel strateegiakeskust ja barracksi taset. Aktiveeritud rajatise töötaja vabastatakse; üks allesjäänud insener võib pärast lao rajamist tööstuse käivitada. Edasilao asukoht otsitakse läbitava ehituskoha ning olemasoleva tarne-/command-ühenduse järgi, mitte lihtsalt kaardi keskpunkti.

Kontrollitud on koorma jäävus/prioriteet, kohaliku lao katkestus/taastumine, inseneride asendamine pressure-faasis ning ootel ostude eelarve/järjekorrad. Pika matši tempo, kogu tarnekaotuse taastumisahel ja brauseritunnetus pole selle paketiga kinnitatud.

### V3: lähetuse järjepidevus ja AI FOB

World.updateRoadConvoys kasutab olemasolevat roadTruckLastSpawn olekut ühe meeskonnapõhise, tasemega kiireneva lähetusläbimise jaoks. Katkise marsruudi järel proovitakse samas läbimises järgmisi allikaid/ladusid; kõigi läbimatute teede kordusotsing ei käivitu igal 30 Hz sammul. Toimivasse ühendatud edasilattu eelistatakse puudujäägi ja pealaos reservist suurema sobiva varuga füüsilist konvoid; muidu laiendatakse olemasolevate limiitidega kogumisparki. Ressursivedu kasutab üksnes operatiivseid, peatamata ja valitud allikaga sobivaid päris ladusid. Koormad laaditakse endiselt units.ts/withdrawPayload kaudu, mitte lähetuse ajal.

WaveAI.expandForward uuendab piisava eelarvega ühendatud operatiivse edasilao esmalt FOB-iks. See kasutab sama upgrade Command-i, päris rahakulu ja olemasolevat juhtimisraadiust kui mängija. World.fobUpgradeCost loeb logistics.fob andmeid; HUD, AI ja sim ei dubleeri hinda. Uusi save/hash välju ei lisatud; lähetuse ajastus säilib olemasolevas runtime snapshot-is.

16 sihitud kontrolli katavad katkise ressursitee kõrvale toimiva tarne, konvoi kaotuse/asendamise ja füüsilise laadimise, AI tasulise FOB-i, piiratud varud, save/load ning replay. Senine 360 s AI integratsioon läbib baasi/tööstuse/veo/tankitootmise ilma täiendava raha lisamiseta. See ei tõesta 15–30 min Roheoru lahingutasakaalu ega brauseri FPS-i.

## Peamenüü salvestatud lahingud

`ui/SavedSessions.ts` kirjutab sama `rogue-front.save.v2.*` kontekstiga snapshoti ning eraldi väikese `rogue-front.save-index.v1` loendi (kuni 8 viimast kirjet). Menüü loeb ainult metadata indeksit; snapshot loetakse jätkamisklõpsul/booti laadimisel, mitte HUD-i igal uuendusel. Indeksi tõrge on eraldi snapshoti kirjutamise tõrkest. Launch-URL sisaldab ainult kaarti, fraktsiooni, režiimi, raskust, algusviisi ja salvestuse võtit; võrgu-/autentimisandmeid ei kopeerita. Boot kontrollib võtme vastavust avatud lahingule, envelope konteksti ja olemasolev `loadWorld` kaardi/reeglite ning runtime'i kehtivust. Üksused, tootmine, logistika, õhumissioonid, deck, RNG ja AI pärinevad olemasolevast WorldSave'ist; uut paralleelset sim-formaati ei lisata. Peamenüüst taastatud lahing on pausil. Vanad ilma indeksita salvestused jäävad oma lahingu laadimisnupule ning indekseeritakse järgmisel salvestamisel.

## Lahingu lõpust jätkamine

`main.showBattleResult` ühendab värske võidu/kaotuse ja lõpetatud snapshoti laadimise sama kampaania edenemise ning tulemuse UI-ga. `campaign.nextCampaignMission` kasutab üht progressi snapshoti ja otsib lõpetatud operatsioonist edasi päriselt avatud, veel lõpetamata missiooni. Preemiad on idempotentsed ning arvestavad eeltingimusi; brauseri vigase progressi normaliseerimine ei puuduta deterministlikku lahingusimulatsiooni. Laaditud tulemuse puhul replay'd ei kirjutata uuesti. `Hud.onRestart` käivitab värske offline lahingu: `restartBattleUrl` säilitab ainult mängu seadistuse, main lisab tegeliku fraktsiooni ja kirjutab Worldi aktiivse decki sessionStorage'isse. Resume/ruumi/tokeni parameetreid ei säilitata. Võrgumängu lõpuekraan suunab menüüsse; sama lõpetatud ruumi reload-rematchi ei pakuta.

## Õpetuse ettevalmistus ja ehituse taastamine

MissionDef.preparationUntil viitab olemasolevale eesmärgi ID-le. MissionController.preparing tuletab ettevalmistuse lõpetamata eesmärgist; World jätab selle ajal vahele operatiivse, strateegilise ja taktikalise AI planeerimise. Füüsilist maailma ei pausita. Missiooni definitsioon/eesmärgid salvestatakse olemasoleva runtime'i kaudu; tundmatu eesmärk ei sulge AI-d lõputult. Uut save-versiooni pole vaja.

Ehituskorralduse limiit loeb ka pooleliolevaid vundamente. Construction süsteem tunnustab ainult tegelikult sellele hoonele build/repair režiimis määratud inseneri. Olemasolev repair-käsk võtab poolelioleva ehituse uuesti build-režiimis üle; UI ja õpetus kasutavad sama käsku. Tõrked kasutavad olemasolevat order-rejected sündmust.

## Dev-server reverse proxy

Vite dev/preview lubab kõiki Host-päiseid: domeeni suunamist haldab väline proxy. Dev-serveri configureServer middleware tuvastab tundmatu alamtee entry-päringust ja loob sama lähtekoodiga Vite middleware-serveri selle base-iga. Iga mount säilitab oma mooduligraafi ja cache'i; eri prefiksite transformid ei kirjuta üksteise BASE_URL-i üle. Avaleht, Vite klient, dünaamilised impordid, Arsenal, mudelid, API ja WS kasutavad sama prefiksit. Middleware jagab vanemserveri HTTP/WebSocket listenerit; closeBundle sulgeb loodud mount'id. Root-server teenindab endiselt juurteed. Proxy võib prefiksi säilitada või kirjeldada eemaldatud prefiksi X-Forwarded-Prefix päisega. ROGUE_FRONT_BASE_PATH on valikuline käsitsi override, mitte automaatse toimimise eeltingimus. Compose dev edastab muutuja. Tootmise nginx on endiselt juurtee konfiguratsioon.

## Alpha auditi mängualgus ja tootmisväljumine

Peamenüü rogue-front:open-deck sündmus kannab valitud fraktsiooni; main edastab selle samale DeckBuilderile ning redaktori sulgemine värskendab päris menüü valikut/kokkuvõtet. defaultDeck ehitab ühendrelvade koosseisu olemasoleva rosteri ja validateDeck reeglite järgi. loadAllDecks kontrollib tundmatut salvestusstruktuuri per fraktsioon; eelarveveaga kasutaja koosseis säilib, kuid käivitamine nõuab korrektset decki. Graafikakontekst luuakse enne mudelite/simulatsiooni laadimist, nii et WebGL-i puudumine ei tekita osalist simi ega tarbetut asset-laadimist.

production.groundExit kasutab endiselt tootja ümber andmepõhiseid ringe ja füüsiliste jalajälgede kontrolli. Lisaks kontrollib canLeaveProductionArea piiratud lokaalse flood-otsinguga, et sama üksuseraadiuse nav-rakk jõuab väljumisringidest väljapoole; diagonaalid järgivad Pathfinderi nurga lõikamise reeglit. Suletud taskus olevat vaba punkti ei valita. Otsing ei muuda maailma/RNG-d; andmepõhine piir tagab lõpliku töömahu, uut salvestatavat olekut pole. Valmis ühik jääb järjekorda, kui sobivat väljapääsu pole; productionStatus kasutab sama kontrolli.


## Liikumise ja kopterilahingu viimistlus

units.ts kasutab mobility.json-i maaüksuse külgkiirenduse piirina: pöördekiirus <= lateralAcceleration / motionSpeed. Paigal säilib üksuse tavapärane pöördevõime; külgsuunaline kokkupõrkest möödumine on piiratud profiili lateralSlip-iga. Jalavägi säilitab paindliku liikumise, ratassõiduk ja roomik ei nihku enam täiskiirusega küljele. motionReverse säilitab tegeliku sõidusuuna; uus edasi/tagasi soov pidurdab vana suuna hoo enne vahetust. Veokid liiguvad kere suunas sama pöördepiiriga ning nende jam-timer mõõdab marsruudile lähenemist, mitte pelka külgnihkumist. Hõivatud ressursi/depoo keskme asemel otsitakse vaba punkti tegeliku kogumisraadiuse sees; kättesaamatu marsruut ei jäta fiktiivset liikumiskiirust.

Kopteri flightVx/flightVz on simi vektorkiirus. Piiratud kiirendus/pidurdus muudab seda ning positsioon integreeritakse eelneva ja uue kiiruse keskmisega. Nina võib sihtida vaenlast külg-/tagasilennu ajal; piki-/külgkiirendus kujundab flightPitch/flightBank-i. Väljad ja motionReverse kuuluvad täielikku Entity snapshoti ning worldHash-i; JSON save/load jätk annab sama hash-i. Fikseeritud tiivaga lennuki kruiisipöörde piir sõltub külgkiirendusest; lõplik maandumisjoondus säilitab senise baasitsükli.

Blokeeritud tulejoone puhul otsib kopter seitset külgmist laskepositsiooni standoff-kaarel. Tulemuse sihtmärk, ankur ja retry kasutavad olemasolevat combatPosition cache'i, vältides ticki-põhist täisotsingut. Kahur kasutab liikuvat torni; kopteri raketi muzzle ja sihtimise kontroll kasutavad kerega fikseeritud tiivarakkide suunda. cannon→air kordaja on .85 (varem .12), kuid relva targetHelicopters/targetAircraft sobivus jääb kohustuslikuks. Tankikahuri fraktsioonitäpsus, rangeAccuracyLoss ja paigal sihitud sabot-bonus toidavad sama shotAccuracy arvutust/HUD-i. Eelsihtimine kasutab kopteri vektorkiirust ja maaüksuse tegelikku tagurdamissuunda. Juhitav rakett ei saa sihtmärgini tagurpidi teleportida lihtsalt seetõttu, et üks tick võiks kauguse läbida; saabumine nõuab sihtmärgi poole lennusuunda ja swept collision jääb alles.

Mets kasutab terrain.json-i treeArea=16, väiksemat skaalat ja võrasid. Cell-põhine instancing, jagatud geomeetria/materjal, opaque võrad, lihtne kaug-LOD ja põlenud metsa sama instantside loend säilivad. See on tihedam geomeetria, mitte mõõdetud FPS-võit. Fx lisab olemasolevate mürsumudelite jagatud mallidesse raketimootori välisleegi/südamiku ja kahuri suunatud halo; suits/sära kasutavad piiratud efekte ning kaamerakauguse raketiskaala on max 1.6.

Roheoru layout14 lähimad ressursipunktid (-225,140)/(225,-140) on baasist ~174 m (varem ~99 m). Füüsiline facilityOffset, õuefeature ja maanteeühendus liiguvad koos. Ressurss tekib endiselt hõivatud/aktiveeritud rajatises ning nõuab reaalset tarnet. Kaardisignatuur ja main.ts uued layout14/training14 võtmed väldivad vana kaardi snapshoti segamist uue geomeetriaga; vana snapshoti ei kustutata. Simulatsiooni töömaht jääb piiratud otsingutega, fixed-step/RNG reeglid säilivad.


## Roheoru kaardipindade ühendamine — layout15

Terrain.createRiverSurface lõikab samakõrguseliste kitsaste veefeature'ite ristkülikud horisontaalseteks intervallideks ja ühendab need enne trianguleerimist. Ridadeks on feature'i nurgakõrgused ning max 1.5 m vahe; risti jõega kuus värvitooniga sammu. Ühised maailma-UV-d ja üks ülespoole suunatud pind eemaldavad ristkülikute sügavuspuhvri kattumise. Lai meri säilitab oma senise renderduse; kitsaste vete füüsiline/nav footprint on endiselt mapFeatures. Veepinna serv on heledam, keskosa tumedam; voolu tekstuur animeerub olemasoleva riverFlow kaudu.

Temperate-kaardi makeLandscapeTexture maalib kõik teeservad enne kõiki sõidupindu, seejärel ristmikke arvestavad märgistused ja kruusatee rattajäljed. Sama atlas sisaldab õue- ja kõnniteepindu, elamute tänavaga ühendavaid radu ning ümardatud põllupiire. createMapFeatures jätab sellel teemal eraldi tee-/teeserva-/märgistuse-/õuepinnad välja; sildadel säilib päris eemaldatav geomeetria ja world-UV asfalt. Sellega on tee pinnakõrgus maastiku enda kõrgus, puuduvad pinnakihtide kõrguste vahed/kattuvad teeplaadid. Atlas jääb 2048²; uut suurt tekstuurikomplekti või dünaamilist maastikupassi ei lisatud. Muudel teemadel jäävad varasemad drapedStrip-teed alles.

finish-road-network.py on layout15 idempotentne autoritöö: viis 52×10 m silda koos maantee lähenemistega, elamuridade juurdepääsud, kuue talu rajad, 42 elamu mõõtude/setback/frontide varieerimine, samad 48 garnisonimaja ja viis ressursirajatist. Kaks korrust saab nüüd ka 5.8 m maja facade2-atlas. Metsad kasutavad olemasolevate ellipsite kõrvalharusid ja nelja väikesalu. createForest väldib alglaadimise ajal deterministliku 3 m lähinaabribiniga liiga lähestikku puid, säilitades opaque instancing/LOD-i ja põlenud puude oleku. Silla talad ja sambad jäävad olemasoleva bridgeId grupi alla ning kaovad koos füüsiliselt purunenud sillaga. Sambad algavad groundHeightAt jõepõhjast; maaüksus kasutab jätkuvalt deck'i heightAt kõrgust.

Kaardipaigutus on uus: main.ts layout15/training15 võtmed ja saveMapSignature eristavad seda varasematest snapshot'idest. Simulatsiooni tick, lahingureeglid, baseraadiused, ressursikoordinaadid ja RNG on säilitatud. Laius/lähenemisteed on kontrollitud tegeliku World/Nav'i ja tasulise õpetuse kaudu. GPU-ga renderpilti ega FPS-i see kontroll ei tõenda.


## Referentsipõhine maastiku renderdus — layout16

sampleForest on üks renderduse deterministlik paigutusallikas; createTerrain arvutab selle ühe korra ning edastab nii maastikuatlasel varjude küpsetamisele kui createForest-ile. 3 m lähinaabribin, nav-feature'i väljajätt ja forestDensityAt säilivad. Madalad, päris forest-cover'i hekid kasutavad väiksemat puuskaalat. Atlasel on üks jagatud pehme varjutempliga projitseeritud võravari ja kontaktvari ning tsiviilkatuse siluett; neid ei joonistata uuesti igas kaadris. Süttinud metsa senine char/scorch kiht katab põlenud maastiku. Varjud eeldavad olemasoleva päeva fikseeritud päikesesuunda, uut päevaöötsüklit ei loodud.

createCanopyGeometry deformeerib jagatud sfäärgeomeetria labaliseks, lisab alumise/tipmise pinna iseenese varjutuse vertex-colour'ina ja arvutab normaalid. Jagatud opaque 128² mipmapped DataTexture annab leheklastrite tooni ilma alpha-test/overdraw-ta. Üks 64 m/rühma LOD valib lähivõra+tüve (168 kolmnurka/võra), taktikalise võra (64) või kaugvõra (24). Lähim ja keskmine tase jagavad instantsimaatrikseid/värve; kõik kasutavad seniseid forestPoints/forestMatrices/forestColors võtmeid ja sama põlenud puu sync'i. Trunk/shadow-pass'e kaugvaates ei lisata.

Maastikuatlas jääb 2048², põldude mikromuster küpsetatakse samasse canvasesse. Renderer algväärtustab nüüd sun.position=(70,95,45) ka siis, kui shadow-map on välja lülitatud; varem jäi madal/keskmine profiil DirectionalLight'i vaikimisi vertikaalse suuna peale, sest updateShadows katkestab seal töö. Temperate hemi/sun tugevus vähendatud ülepõlenud heledate pindade vältimiseks. Reaalaja shadow-refresh, pixelRatio ja postprocessing-profiilid säilivad.

createSky lisab temperate-kaardile värvihaldusega gradienttaeva; üks callback järgib kaamera maailmaasukohta, taevageomeetria ei sunni kogu stseeni maatrikseid muutma. createLandscapeBackdrop on üks 6144 kolmnurgaga staatiline, fogged ring väljaspool mänguala. Sisemine serv kasutab täpselt groundHeightAt/SEG piiripunkte. Lai meri jätkub map-boundary proovipunkti järgi oma kõrguse ja värviga; rannikule ei joonistata ookeani asemele kaugmäge. See ei laienda käskude/nav'i mänguala ega avalda fog-of-war'i taga üksusi.

finish-road-network.py genereerib layout16 põllud, päris forest-cover'i piirirühmad ja hajusalud koos varasema tee/linna/silla võrguga. terrain.json lisab kaks 22 m amplituudiga laugemat landform'i; kõrgus on jagatud nav/liikumise/LOS/renderduse vahel. Tsiviilmaja kelpkatus säilitab mõõdu ja silueti mõlemas LOD-is. Main'i layout16/training16 võtmed eraldavad uue maastiku varasemast save'ist. Vaikimisi brauserimootor ja fixed-step/command/RNG arhitektuur jäävad samaks. Build, 24 mõjutatud kontrolli ja Canvas2D atlas on kontrollitud; shaderite tegelikku GPU-renderit/FPS-i pole sellest tõendatud.


## Mängitav kaardigeneraator v2

sim/proceduralMap.ts asendab varasema 640 m juhuslike ristkülikute/kastide generaatori. map-generation.json määrab mõõtkava (1280 m), teed, kvartali/krundi mõõdud, majasuurused, jõe ja ressursid. Igal genereerimisel on oma Rng; UI võib valida seemne, kuid simi genereerimine ei kasuta Math.random/DOM/Three.js-i. Lõppkoordinaadid normaliseeritakse millimeetrile ja pöördenurgad 1e-6-le. Identiteet procedural-v2-{archetype}-{seed} sisaldab versiooni ja seemet; kõik kliendid taastavad sama kaardi. Vanad procedural-{archetype}-{seed} aadressid hoiavad serveriga ühilduvat missionId-d, kuid vana geomeetria snapshot ei muutu uue kaardi salvestuseks.

Järjekord on hüdroloogia → kolm päris deck'i ja pankade ühendatud teed → tänavatele orienteeritud tihedad krundikvartalid → seemnega Voronoi põllu-/metsavööndid → reaalsed ressursihooned/juurdepääsud. Tee keskjooned ümardatakse piiratud Bezier-nurkadega ning bank-spine järgib asula läbivat tänavat. Majad ei saa paikneda tee, vee või teise maja peal. Voronoi lahter tekib pooltasandite lõikamisega, mitte eraldi render-kastiga. Linnakvartalid annavad olemasolevale garnisonisüsteemile päris majad; roof color muudab jagatud mudelimaterjali ka mõlemas LOD-is. Kõrgendikud kuuluvad MissionMapDef.landforms-i ning main annab need heightmap.setTerrainProfile'ile, nii et nav, LOS ja render jagavad sama kõrgust.

MapFeatureDef.polygon on maailma XZ koordinaatidega polügoon. pointInFeature kasutab ray/servakauguse testi ja paddingut; featureCorners tagastab polügooni või ellipsi tegelikud vertsid. forestDensityAt kasutab polügooni servakaugust, sampleForest puhastab samu teid/maju/vesi. Atlas ja setup/minikaart lõikavad sama kuju; lahingu cover ja fog ei jää vana bounding-box'i peale. waterBody eristab järve ja merd ka siis, kui järv on üle 128 m lai. Hydrology lõikab järve tegeliku polügooni järgi, väljaspool laiendatud bbox-i pole kallist servaotsingut. createRiverSurface ühendab veepolügoonide horisontaalsete lõigete intervalle paarikaupa; vanad laiad merefeature'id säilitavad varasema klassifikatsiooni.

Ressursipunkt valitakse vabasse laadimisalasse ning tegelik rajatise offset kontrollitakse pärast juurdepääsutee loomist uuesti. World loob olemasoleva füüsilise ressursihoone, engineer activation ja collection truck stock-loop jäävad samaks. Generaator ei anna tasuta lõpmatut tulu. createSkirmish saab generated lipu: lahingugrupi koht tuletatakse oma baasist ja nav leiab läbitava koha; järve lähedus ei loo valmisstardis automaatselt merelaevu. Kampaania/Roheoru/merekaardi senised stardid säilivad.

OnlineShell.showOffline alustab generaatoriversiooni esmakasutusel uue Järvemaaga. Seemne/piirkonna muutmine uuendab sama kaardikaardi polügoone ja start-URL-i; Uus kaart valib ainult uue UI seemne. V2 ID läheb ka uue online-random-ruumi mission/mapId-sse, serveriprotokolli ei muudeta. Generaator jookseb setup/laadimise ajal, mitte kaadris ega tickis. Olemasolev opaque instancing/LOD, 2048² atlas ja feature spatial index säilivad. Sihitud kontroll katab nav ühendused mõlema baasi/kõigi ressursside vahel, tegeliku tarne ning JSON-save deterministliku jätku. GPU jõudlust ega WARNO mudelikvaliteeti see ei kinnita.

## Piirkonnakaardid v3

`generateProceduralMap(seed, archetype, size)` toetab andmefailist suuruseid 1536/1792/2048; 1280 haru taastab v2 geomeetria ilma uue piirkonna RNG-käikudeta. Identiteet `procedural-v3-{archetype}-{size}-{seed}` taastab offline/online/save käivituses sama maailma. Curated nimekiri sisaldab ainult Roheorgu ja Murdlaine näidist, kampaania MISSIONS ei ole enam online vaba kaardivalik.

Kaheksa asulat jagunevad suuremateks keskuste, piirikülade ja tagalakülade piirkondadeks. Tänavad/ühendused luuakse enne krunte; taluteed kontrollivad oma lõike olemasoleva hoonestuse/vee vastu. Metsajärved on tegelik polügoonvesi, mitte renderduse dekoratsioon. Üheksa ressursiala kasutavad sama Worldi hõive/inseneri/startup/veokitarne loogikat kui autoritud kaart. Maastiku neli lauget kõrgendikku moodustavad piirkondlikud kaitsepositsioonid; maastiku sim ja render kasutavad sama kõrgusvälja.

`heightmap.setMapSize` ülempiir on 2048 m; NavGrid/WaterNav/kaamera/fog/minimap loevad olemasolevat MAP_SIZE-i. Ülempiiri muutus on vajalik: vana 1600 m clamp kärpis suure kaartide laadimisalasid. Kaks meetrit nav/kõrgusruudustikku tähendab suurimal kaardil umbes miljonit lahtrit, seega 2048 on tahtlik maksimum. Voronoi seemnete samm kasvab suurusega, hoides genereerimise maakasutuse elementide arvu piiratud. Renderduse sampleForest ja küpsetatud atlas kasutavad sama ühist 60000 paigutuskatse eelarvet; eelarve jaotub proportsionaalselt kõigile metsaaladele, simi metsakatet see ei hõrenda. Kaardisuurusega ei suurendata atlaseresolutsiooni ega teki renderduse/ticki aegset genereerimist.

## Suure kaardi renderduskulu ja piirkonnaprofiilid v4

Map-generation.json profiles on tüübipõhine reljeefi/asula konfiguratsioon. V4 muudab keskuse kvartalite arvu, kruntide hõivet, majade kõrgust ja buildingStyle metadata't ning loob tüübile vastava arvu/kõrguse/laiusega kõrgendikke. World.heightAt/nav/LOS/render kasutavad endiselt sama kõrgusvälja. V2/v3 branches ei kasuta uusi RNG-käike ega uusi stiilivälju; ID v4 on vajalik geomeetria/salvestus-signatuuri eristamiseks. Resource access kontrollib teelõigu proove building/water spatial indexis; üle kogu kaardi array.some igas proovis põhjustaks mitmesekundilise genereerimispausi. Menüü näitab tegelikust väljundist hoonete/ressursside arvu ja kõrgendike amplituudi.

Architecture.createCivilianBuilding kasutab style metadata't mõlemas LOD-is: ridaelamud kelpkatusega, tööstus madala lamekatuse/metallfassaadiga, kõrgemad majad kolme korruse fassaadiga. Distant house ühendab kõik osad üheks mitteindekseeritud geometry'ks, ühe atlase materjaliga ja vertex-värvidega. Atlas on ühine, iga maja LOD root on eraldi: valik/garnison/rubble/materjalikahjustus säilitab olemasoleva identiteit. FogOfWar ühendab shaderi ka uue ühe materjaliga.

Main valmistab kõik maastiku map/bump/normal tekstuurid renderer.initTexture kaudu ette ning ootab renderer.compileAsync kogu stseeni (ka peidetud LOD materjalide) jaoks enne briefingut. See tõstab töö setup'i, mitte liikuva kaamera esimesse uude piirkonda; GPU bufferite esmakordset upload'i ega FPS-i täielikult ei kõrvalda. NavGrid.syncBuildings taastab ainult dynamicCells loendis olevad olek-2 lahtrid, seejärel märgib praeguste hoonete footprintid. syncFeatures eemaldab vanad hoonelahtrid enne staatilise kõrguse/vee maski rebuildi, et hilisem syncBuildings ei avaks uut vett/seina vana hoone all. Sim RNG/command ajastus ei sõltu esitusest.

## V5 kompaktne reljeef ja nähtavuse järgi lõigatud maastik

createGroundTiles jagab maapinna maksimum 256 m tükkideks. Kogu kaardil on endiselt ligikaudu 192 segmendi tihedus, jagatuna tükkide vahel; 2048 m puhul 64 tükki, igaühel oma boundingSphere ja sama materjal. UV tuleneb maailma XZ-st ning servanormaalid samast kõrgusvälja keskgradiendist, mitte iga tüki eraldi triangulatsiooni servast. Kolmnurgaarv tervikuna ei suurene oluliselt, aga nähtava piirkonna piiramine saab nüüd suure kaardi ülejäänud maapinna välja jätta. Rohkem väikseid draw'sid on teadlik vahetus kogu maapinna vertex-töö vastu; GPU kasu pole veel mõõdetud.

TerrainCulling cache'ib maastiku maja/metsa LOD juurte maailma boundingSphere'id konservatiivse 32 m servaga. Renderer'i auto LOD update on nende jaoks välja lülitatud; iga kaadri frustum check määrab terve juure nähtavuse ja uuendab ainult nähtava LOD-i. Garrison rubble mahub esialgsesse bboxi; bridges ja troopide renderer jäävad olemasolevasse süsteemi. Kaamera maastiku-LOD uuendus toimub pärast cam.update ja enne renderit. F8 salvestuse SceneMetrics sisaldab nähtavate/kõigi maastikugruppide arvu. RtsCamera integreerib sumbuva kiiruse täpse ajaintegraali, vähendades erineva pikkusega kaadrite liikumisviga; simi kell ei muutu.

TerrainLandform toetab valikulist shape="ridge" ja rotation. Pööratud ellipsi sisemine kõrgus on height*(1-d)^2, väljaspool d>=1 on panus täpselt null. Ainult uued v5 highlands kaardid asendavad laiad Gaussi kõrgendikud kitsamate harjadega (siht kuni kuus, sobivad kohad valitakse baasidest/asulatest/ressurssidest eemale). V2/v3/v4 taastavad senise Gaussi geomeetria. Renderdi vertex-toon lisab nõlva suunast sõltuva heleda/tumeda ja kivisema külje; füüsika/LOS/nav kasutavad sama tegelikku reljeefi, dekoratiivset eraldi kõrgust ei teki.


## Piirkonnageneraator v6

`proceduralMap.ts` hoiab v2–v5 taastamisteed muutumatuna ning kasutab uutel 1536/1792/2048 m kaartidel `regionalLandscape.ts` moodulit. Moodul loob seeditud tänavaringid ja ühendusrajad, paigutab majad olemasolevate tänavate äärde ning loob kompaktse tugialaga kattuvatest mäetippudest seotud äärealade mäevööndid. Mäepaigutus kontrollib kogu jalami kattumist proovitud teekoridoride, hoonete, vee, asulate ja baasidega; ressursi laadimiskoht väldib lisareljeefi. Kõrgusvälja olemasolev ridge-kuju on ühine navile ja renderdusele.

Voronoi põllud lõigatakse konveksse pooltasandite lahutamisega maanteede ja vee maskide järgi. Nõgusatest järvedest kasutatakse konservatiivset konveksset ümbrist, et säilitada kaldapuhver. Tükieelarve ja pindala/ümbermõõdu filter piiravad kitsaid kilde. Põllu cropRotation muudab üksnes atlase künniridu: maailma-polügoon ja selle axis-aligned ruumiindeksi mõõdud ei pöördu. Mäestikuga lõikuvad maatükid on metsased; kõrgema nõlva kivitoon küpsetatakse olemasolevasse atlasesse ilma lisanduva draw call'ita.

V6 ID sisaldab tüüpi, suurust ja seemet. Kohalik ja online valik ning ranked kasutavad sama versiooni. Vanad salvestus-/ruumi-ID-d taastavad senise generaatori. V6 andmete parameetrid on `data/map-generation.json`-is; uut maailmasnapshot'i ega simulatsiooni RNG-allikat ei lisandu.


## V7 asulad ja kaadri diagnostika

`settlements.ts` loob v7-s seeditud oldtown/grid/ribbon/fork tänavavõrgud ning eri mõõtudega city/town/village/hamlet rollid. Majakataloog ja krundi täituvus/vahed on map-generation.json-is. SAT-kontroll kasutab tegelikke pööratud piirjooni, et lähedased naabrid ei vajaks põhjendamatult laia ringikujulist puhvertsooni. Iga maja avaneb päris tänavale. Eraldi tööstusala on kolme füüsilise hoone ja tee komplekt; see ei tekita uusi tootvaid ressursipunkte. V2–v6 ID-d jätkavad vana geomeetria taastamist.

Architecture kasutab ka lähivaate tsiviilmajadel sama jagatud atlase/vertex-color partiimist kui kaugmudel. Väikesed lähidetailid jäävad geomeetriasse; iga maja LOD/garnisoni/kahjustuse juur säilib. TerrainWarmup muudab ajutiselt staatilised LOD tasemed nähtavaks ja lülitab nende frustum-kontrolli välja, renderdab 1×1 render target'isse, seejärel taastab kõik lipud/target'i/varjuseade. See valmistab nähtamatute LOD-de geomeetriapuhvrid ette; lõplik scene compileAsync toimub taastatud seadistusega. Kulu liigub lahingu algusse, tegelik GPU/FPS kasu vajab brauseriraportit.

PerformanceRecording on bounded ring-buffer ning hoiab eraldi aeglasimaid kaadreid; PerformancePanel salvestab JSON schemaVersion=2. Kontekst ei sisalda lehe URL-i, tokenit ega kasutajakonto nime. CPU mõõtmine jääb GameLoop'i vaatlejaks, simulatsioon ei tarbi neid andmeid. GpuTimer proovib ainult WebGL2 EXT_disjoint_timer_query laiendust, jätab GPU tulemuse ootamise ära ja kontrollib QUERY_RESULT_AVAILABLE enne QUERY_RESULT-i. Kuni neli päringut võivad olla ootel; disjoint tulemused kustutatakse. F8 väljalülitamisel uusi päringuid ega kaadri-/Long Task ajalugu ei koguta.


## V8 linnaosad ja staatilise kaamera vahemälu

`buildVariedSettlement` refined-lipp on sisse lülitatud ainult v8 ID jaoks. Varasem v7 taastab vana RNG tarbimise ja geomeetria. V8 center/residential/rural metaandmed juhivad hoonekataloogi; uus civic hoone annab raekoja/külakeskuse silueti ning selle torn jääb deklareeritud kõrguse sisse. Park on piiratud tihedusega päris forest-katteala: sama footprint juhib puid ja simi varjet. Majakruntide kontroll arvestab parkidega ning puud väldivad olemasolevaid tänavaid/õuesid. FacadeColor küpsetatakse maja vertex-color geomeetriasse; kvartalipalett ei vaja uusi draw'sid. Kõik täpsustused on map-generation.json-is.

Refined grid ehitatakse ühiste jittered sõlmedega, mistõttu ristuvad tänavad saavad päris ühise ühenduspunkti. Crescent ja courtyard kasutavad ühendatud tänavaserva ja keskseid ühendusi; olemasoleva piirkonnamaantee spine/boundary ühendused säilivad. Majad paigutatakse pärast tänavate planeerimist. V2–v7 geomeetria taastamisteed jäävad alles.

TerrainCulling hoiab viimast kaamera identiteeti, maailmamaatriksit ja projektsioonimaatriksit. Täpselt sama vaate korral ei korrata frustum-/LOD tööd; kaamera muutus arvutab kogu nähtavuse uuesti. Kahjustuste maailmamaatriksi muudatused jäävad tavapärase Three scene-update'i sisse; esialgsed konservatiivsed LOD bounds'id ei vähene varemete tekkimisel. Muudatus on geomeetrilise töö vältimine, mitte kinnitatud FPS võit.


## Kaardivälise varustuse ja välibaaside uuendus (14.10.2026)

`externalSupply.ts` on simi automaatse kopteriimpordi ning lennuvälja/lao sidumise ühine moodul. Vastuvõtja gate kontrollib ainult hoone seisundit, command-link'i, elektrit ja veo peatamist; tarne taastab ka täiesti tühja lao ega tee tarbetut laovõrgu/stock'i kordusotsingut. `World.updateStrategicAirlift` valmistab lennukoorma ette tagalas ja saadab selle väljaspoolt mapSize'i. `units.updateExternalFlight` maandub, annab ainult vastuvõetava osa `receiveSupply` kaudu üle ning väljub kaardi tagalaservast. `logisticsRoute=strategic` lubab ainult neil lendudel kaardipiirist üle liikuda ja välistab käsitsi grupijuhtimise. Loomulikku lahkumist ei loeta battlegroup-kaotuseks. Passiivne tick-raha on eemaldatud; kaardirajatiste veokitarne säilib.

Koorma, lennufaaside, sihtkohtade, dispatch-taimerite ja lennupargi save/hash on olemasolevas fullEntities olekus. Ruleset on `2026-10-14.external-supply`; uus `.imports1.` brauserivõti säilitab vanad snapshotid eraldi. Tühja lennuväljalao taastumine ei nõua productionOperational'i stock gate'i. Numbrid on `data/logistics.json.external` all.

Renderduse `effects.json` eraldab raketiauru ja suitsupuhvri, `ProjectileTrail.ts` piirab teepikkuse järgi lisatavaid osakesi. `Terrain.sampleUnderstory` kasutab jagatud feature index'it ning kogu kaardi põõsaeelarvet, lähimetsale lisandub üks instanced kiht. `ResourceGround.ts` vahemällu salvestatud rajatisetekstuurid ja `Architecture.ts` kamuflaažpaviljonid jagavad materjale ning hooneosad liidetakse materjali järgi. Mudelite CPU eelvaade ja mängureeglid: [REAL-WAR-FIELD-BASES.md](REAL-WAR-FIELD-BASES.md). Tegelik GPU vaade/FPS vajab brauserikontrolli; V1 väravat pole lõpetatuks märgitud.


## Raportist leitud minikaardi sõjaudu kitsaskoht (14.10.2026)

Kasutaja 2048 m / 512×512 visibility-grid raporti 274 kaadrit katavad 10.383 s (~26.4 FPS). Mediaankaader on 16.7 ms, p95 216.6 ms, GPU mediaan 1.92 ms. 24 HUD-etapi callback'i võtsid 99.7–270.4 ms; kokku 4.537 s mõõdetud ajast. Kaadrivahe ja sama callback'i töö ei ole sama ajavahemik: suur HUD-kulu eelneb järgmise kirje pikale frameMs-ile.

`Minimap.draw` joonistas iga kolmanda 10 Hz värskenduse ajal ligi 262144 eraldi läbipaistvat fillRect'i 176×176 lõuendile. `MinimapFog` hoiab nüüd visibility-grid mõõtudega Canvasit, taaskasutatavat Uint8Arrayt ja RGBA ImageDatat; muutunud vision.revision/team kopeerib states'i, uuendab alfa ja teeb ühe putImageData. Minikaart komposiidib pildi ühe drawImage'iga. Rakukoordinaatide objektid, stateAt kordusotsingud ja raku kaupa Canvas-käsud on eemaldatud. Läbi uurimata/uuritud/nähtav ala kasutavad samu olekuid ja mõeldud läbipaistvusi (.86/.48/0), ilma vanade väikeste ristkülikute kattuva tumendamiseta. Vision.reset/restore suurendab revision'it; peatunud vaate pildipuhver ei uuene. Dünaamilised üksused, sillakahjustuse static-layer invalidatsioon ja kaamera piirikontuur säilivad.

PerformancePanel eristab `sildid`, `minikaart`, `HUD`. Raport on schemaVersion 3 ja hoiab eraldi kuni 30 kõige pikema CPU callback'i `worstWorkFrames` loendit. Sim/save/protokoll ja graafikakvaliteedi valik ei muutu; build-kontekst on `minimap-bulk-fog1/performance-v3`.

CPU Canvas-kontroll (@napi-rs/canvas, 512×512 grid, 176×176 minikaart, suurem osa alast uurimata, mõlemal meetodil tegelik raster readback, 20 mõõtmist pärast soojendust) andis vana meetodi mediaaniks 504.53 ms/p95 668.50 ms ning uue meetodi mediaaniks 1.05 ms/p95 1.47 ms. See kinnitab kõrvaldatud Canvas-töö ulatust, mitte kasutaja GPU/brauseri uut FPS-i. Uue versiooni samal marsruudil kogutud F8 JSON on vajalik tegeliku brauseritulemuse võrdlemiseks.

Kontroll: kõik 56 UI/render/input/core testi ning build/typecheck läbivad. Täissuite läbib 254 testi 259-st, sh pikk AI taastumine. Viis juba eelmise main-i tõrget korduvad: CoreLoopi ehitusajastus, Integrationi fraktsiooni accuracy eeldus, SystemsIntegrationi taxi-ajastus, NavGridi CPU eelarve ja tacticalSupply kütusereserv. Selle muudatuse testid ei lisa uut sim-tõrget. Päris brauseri järelmõõtmine on veel tegemata.


## Menüü ettevalmistus ja maastikulülitid · 15.10.2026

Üksikmäng loob kaardi otse tühistatavas `MapPreparation.worker.ts` workeris. Worker avaldab esimese geomeetria eelvaatena ja annab käivitatava missiooni alles pärast täielikku navigatsioonikontrolli. Sisestatud seeme lülitab sisse täpse kordamise; UUS KAART lubab deterministlikke korduskatseid. Serveri autoriteetne mitmikmängu genereerimine säilib.

`MapOptions` kasutab mere/mägede/metsa/jõe nelja bitti. Valikutega v13 tunnuse lõpp `-o0`…`-o15` taastab samad geomeetriaandmed ka sessionStorage puudumisel; ajalooliste tunnuste genereerimine ei muutu. Väljalülitatud jõgi muudab sillaületused tavalisteks teedeks. Järv säilib eraldi veekoguna. Reljeefi AABB-väljalõige jätab vahele ainult täpselt nulliga lõppevad ridge-kernelid; Gaussi sabasid ega liitmise järjekorda ei muudeta.

`platforms.json` sisaldab 19 toodetavat klassi. SAM/haubits kasutavad olemasolevat juhitava raketi ja ballistilise suurtüki sim-teed; manpad/mortar pole enam jalaväe alias. Uutel sõidukitel on protseduurmudelid, mitte lisanduvad GLB-allalaadimised. Kerge haubits on odavam ja lühema ulatusega kui liikursuurtükk; SAM kasutab piiratud raketivaru ja ainult õhusihtmärke.

`Language.ts` ja `english.json` rakendavad kasutaja keele esituskihis. `localStorage` eelistus kandub mängu, Arsenali ja efektivaatesse. Tõlgitakse teksti ning title/aria-label/placeholder atribuute; vormiväärtused, käsud ja simulatsiooniandmed ei muutu. Sõnastik kasutab pikimat fraasi ja Unicode-sõnapiire, kordustöö on piiratud vahemäluga. Tõlketa tekst säilitab eestikeelse lähtekuju.

`MetricRunway` ühendab aluspinna, katte ning märgistuse kolme materjaligruppi. Iga grupp saab tugevama negatiivse polygon offset'i, sest ainult maailmakõrguse sentimeetrine vahe ei püsi kaugvaate sügavuspuhvris. Maapinnakolmnurkade järgi lõikamine säilib.

Kontroll: 85 olemasolevat testifaili / 372 testi, uute valikute/üksuste/keele sihitud testid, neli serveritesti, väljalaskepaketi kontroll ja TypeScript/tootmisbuild. DOM-kontroll katab ingliskeelse menüü, seaded ja SAM-i HUD-i, seemne täpsuse, worker'i katkestamise, esialgse eelvaate ning valmis missiooni sessionStorage üleandmise. GPU suumipildi kontroll jäi brauseri allalaadimisvea taha; FPS-i võrdlust ei kinnitata.


## Õhusõidukite käsitlus ja varukütus · 15.10.2026

`aircraftHandling.ts` annab kopterile eelmise fikseeritud sammu suunast ühe ühise pööramispiiri; liikumise ja relva sihtimise tee ei saa sama tick'i jooksul kahekordset nurka kulutada. Kiirusega vähenev yaw-piir, raketiraki tolerants ja kahuri traverse on `mobility.json`-is. `MotionPresentation.usesFlightHeight` loeb helikopteri `taxi` juba vertikaalseks lennuks; lennuki ruleerimine jääb maapinnale. Rootori visuaalne inerts järgib sama mootorifaasi kui heli.

`AircraftAudio.ts` eristab maapealset tühikäiku, stardi spool'i, lennuki hoovõttu, hõljumist ning lähenemist. `Audio.ts` hoiab endiselt kuni kaheksat mootorihäält ja taaskasutab klassi järgi kahe sekundi mürasilmuseid. Filtreeritud turbulents, rootori laiapõhjaline labalöök, madal mootori põhitoon ja turbiinikiht asendavad õhusõiduki ühe saehambatooni. RPM, valjus, Doppler ja kaugusfilter muutuvad sujuvalt. Heli on protseduuriline, mitte salvestatud päris mootor.

`missileDynamics.ts` rakendab uutele põhiklasside juhitavatele rakettidele normaaljõu ja nurkkiiruse väiksemat piiri, lõplikku tõukeaega, kiirusruuduga takistust, pöörde energiakadu ja gravitatsiooni. Relvaprofiilid häälestatakse `physics.json.missiles` all. Otsing saab sihtmärgi liikumisest piiratud ennaku 10 Hz kaupa; stardil seemnega valitud hälve ei kao esimese juhitava sammuga. Otsingukoonusest väljuv sihtmärk katkestab luku. Lennuki/kopteri rakett väljub raki suunas ja pärib kandja horisontaalkiiruse. Tabamine jääb füüsilise trajektoori/keha kontaktiks, ilma hilisema tabamis-RNG-ta või sihtpunkti hüppamiseta. Juhitamatud raketid kasutavad ballistilist gravitatsiooni. Torpeedod säilitavad veesisese juhtimise.

`cargoDepartureRunway` pöörab väljalennuks raja ümber selle tegeliku keskpunkti: tagurpidi lähte-/lõpp-punktid on samad maailmapunktid. Saabumine jääb oma tagala pikendusele, väljalend läheb samasse tagumisse serva, mitte üle vastase baasi.

`emergencyLanding.ts` töötab enne tavalist kopteri/varustuslennu käitumist. 15% kütuse juures tekib ühekorraline HUD-/helihoiatus; 5% juures valitakse navigatsiooni ning tegelike üksuste järgi vaba lähedane maandumiskoht. Hädamaandumine tühistab ründe/teekonna, pidurdab ja laskub piiratud kiirusega. Tühja paagiga jätkub autorotatsioon; ohutule maale jõudnud kopter ei sure ega kuluta hõljumiskütust. Kui vaba maad ei leidu ja maandumine toimub takistusele/veele, ei garanteerita ellujäämist. Reisijad säilivad ning saab välja lasta. Töötav ladu või füüsiline kütusekonvoi saab maandunud üksust tankida; üle 30% juures lõpeb hädamaandumise lukustus. Uued kopteri lipud ja raketi parameetrid liiguvad olemasoleva täisoleku salvestusega ning on replay-räsi osa.

Regressioonid katavad stardi kõrgust, jagatud yaw-piiri, relvasektoreid, piiratud raketipööret/energiat/lukku, möödalennu puuduvat sihtpunkti hüpet, lastiga kaubalennuki tervet maandumise-stardi tsüklit mõlemas suunas, kütusehoiatust, hädamaandumist, reisijate väljumist, päris konvoikütuse kulu ja deterministlikku jätkamist. WebGL-pildi ja kõlaritest kuulamise kontroll jääb eraldi, sest kohalik brauser puudub.
