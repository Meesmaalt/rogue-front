# Rogue Front

Brauseripõhine RTS (Three.js + TypeScript + Vite): Wargame’i taktikaline lahing ning Real Wari baas ja ressursihaldus.

Relvade ulatusringid ja tegeliku lasuarvutusega seotud lahinguandmed: [tulejuhtimise muudatus](docs/FIRE-CONTROL-RELEASE.md).

Viimane mängukoodi muudatus: [A5 — luurepõhine AI, reserv ja taastumine](docs/A5-AI-SKIRMISH-RELEASE.md). AI kasutab nähtavaid kontakte ja mälukoordinaate, hoiab reservi, arvestab kõigi relvade moona ning taastub päris laos/lennubaasis. Pika matši tasakaal ja alpha läbipääs on veel ootel. ZIP sisaldab ka [A4 logistikat](docs/A4-LOGISTICS-AIR-RELEASE.md), [A3 garnisoni](docs/A3-GARRISON-RELEASE.md) ja [A2 teeliikumist/transporti](docs/A2-MOVEMENT-TRANSPORT-RELEASE.md). Järgmine tööpakett on A6 (õpetus, salvestuse sobivus ja alpha viimistlus).

Järgmise arenduse põhiplaan: [viimistlus → alpha → beta](docs/DEVELOPMENT-PLAN.md). Aktiivne tööjärjekord on TODO alguses; vanad etapinimed ei määra uut arendust.

## Käivitamine Dockeris

```bash
docker compose up --build dev multiplayer         # http://localhost:5173; lähtekood Docker image’is
docker compose run --rm dev npm test  # testid
docker compose run --rm dev npm run typecheck
docker compose --profile prod up --build prod multiplayer   # tootmisbuild nginxis: http://localhost:8080
```

Portaineri Git-stack kasutab vaikimisi Docker image’isse kopeeritud lähtekoodi ja sõltuvusi. `/app` peale ei monteerita serveri suhtelist hostikausta: selline mount võib image’i failid tühja kaustaga varjata ning põhjustada `ENOENT /app/package.json`. Pärast Git-uuendust ehita image uuesti ja loo `dev` konteiner uuesti; üksnes vana konteineri restart ei rakenda Compose’i parandust. Kontoandmed säilivad `accounts` volume’is. Dev ootab multiplayer-serveri tervisekontrolli ja omab eraldi HTTP tervisekontrolli.

Kohalikuks HMR-arenduseks kasuta projekti juurkaustas teadlikult hosti lähtekoodi ja eraldi ajutist sõltuvuste volume’i:

```bash
docker compose up -d --build multiplayer
docker compose run --rm --build --service-ports -v "$PWD:/app" -v /app/node_modules dev
```

Selle käsu ajal ära käivita teist `dev` konteinerit samal pordil. Portaineri deploy’s neid kohalikke mount’e vaja ei ole.

## Kaasasolev brauseribuild

ZIP sisaldab `dist/` valmisbuildi, lähtekoodi, mudeleid ja serverit. Kiireks üksikmängu proovimiseks ava projekti kaustas terminal:

```bash
python3 -m http.server 8000 --directory dist
```

Seejärel ava `http://localhost:8000`. Konto/lobby/multiplayer vajavad eraldi serverit; nende jaoks kasuta alltoodud arendus- või Docker-käivitust. HTML-faili otse failihaldurist avamine ei asenda veebiserverit.

## Käivitamine ilma Dockerita

```bash
npm ci && npm run dev
```

## Integreeritud mängu käivitamine

Uus maastikuarendus: [960 m Roheorg, dünaamiline mets ja tulekahjud](docs/FOREST-MAP-RELEASE.md). Metsatihedus mõjutab varjatust, nähtavust, katet ja liikumist; HE-tabamustest põlev mets tekitab suitsu, kahju ning püsiva põlenud ala. Kaardil on uued asulad/kõnniteed ja metsa läbivad kõrvalteed.

Uus tehnika-arendus: [fraktsioonide soomus, relvad, liikuv tuli ja mudeli varustus](docs/VEHICLE-DEPTH-RELEASE.md). IFV ja tankitõrjesoomuk peatuvad raketilasuks, liikuv AA kasutab kahurit/rakette ning kopterite eraldi varud ja mudeli rack’id vastavad lahingu relvastusele.

Viimane uuendus: [fraktsioonide relvakoosseisud ja jalaväemudelid](docs/UNIT-LOADOUT-MODELS-RELEASE.md). 30 jalaväekoosseisu, tegelikud tankitõrje/õhutõrjerelvad ning nähtavad relvakaardid. Tootmisnupu parem klõps avab koosseisukaardi ostmata; 3D ARSENAL näitab samu jalaväemudeleid ja relvastust.

Uus põhisuund: **Wargame’i taktikaline lahing + Real Wari baas, majandus ja füüsilised õhurajatised**. [Õhuväe baasitsükkel ja maaväe laskepositsioonid](docs/TACTICAL-AIRBASE-RELEASE.md): vali lennubaas/kopteriplats, määra õhuoperatsioon ning paremklõpsa sihtpunktile; „Baasi” kutsub lennugrupi tagasi.

Viimane lahinguarendus: [relvakoosseisud, mürsufüüsika, efektid ja metsluure](docs/WEAPON-EFFECTS-RECON-RELEASE.md). IFV-de, kopterite ja mitmeotstarbeliste lennukite lisarelvad kasutavad eraldi laskemoonavarusid ja laadimisaegu.

Uus 3D-pass: [tehnika materjalid, taimestik ja renderduse jõudlus](docs/ART-PERFORMANCE-RELEASE.md). 63 tehnikavariandil on detailne ja kaugusmudel; mäng valib sobiva detaili kaamerakauguse ning graafikaseade järgi.

Viimane uuendus: [Roheoru liikumine, lahingu tagasiside, kaardikujundus ja tarnejuhtimine](docs/TACTICAL-MAP-LOGISTICS-RELEASE.md). Lao paneelis saab valida ressursiallika, lisada marsruudipunkte ning vedusid peatada. Shift lisab ühekordse liikumiskäsu järjekorda.

Ava `http://localhost:5173`, vali fraktsioon, kaart, režiim ja vaba roster või salvestatud deck. Kontot üksikmänguks ei vaja.

Roheorg on praegu viimistluse fookuskaart. Vaikimisi alustad Conquest-režiimis valmis baasi ja väikese lahingugrupiga. F1 valib soomuse; Fookus toob kaamera valikule; Ründeliiku + parem klõps annab lahingukäsu. Saad valida ka HQ ja inseneridega alguse. Roheorg on nüüd 960 × 960 m, kaugema kaamera, detailsemate hoonete ning kiirenduse ja lennukõrgusega liikumisega; [uus muudatusülevaade](docs/ARCHITECTURE-MOTION-RELEASE.md). Relvade ja füüsiliste ressursivedude viimane muudatus: [docs/WEAPONS-LOGISTICS-RELEASE.md](docs/WEAPONS-LOGISTICS-RELEASE.md). Ühe kaardi varasemad muudatused ja piirid: [docs/ROHEORG-RELEASE.md](docs/ROHEORG-RELEASE.md).

Ehitusalgus: F2 valib insenerid. BUILDS → generaator → varustusladu. Saada teine insener ressursipunkti. Ehita maaväe juhtimiskeskus, vali see ning ehita soomustehas. LAND-paneelist tooda tank. Hoia ladu ja ressursitransport töös: tootmine ning eesliini laskemoon, kütus ja remont sõltuvad piiratud varudest.

Uus salvestus kasutab v19 täisolekut. Brauseri Salvesta/Lae nupud töötavad kohaliku mängu jaoks, salvestus on kaardi, režiimi ja fraktsiooni kaupa. Kampaania menüü avab järgmise missiooni pärast võitu.

`dist/` sisaldab valmis veebibuild'i. Seda saab serveerida HTTP kaudu: `python3 -m http.server 8080 --directory dist`. Mängu ei avata otse `file://` URL-iga.

Kontrollid: `npm test` ja `npm run build`. Täpne muudatuste, testide ja lõpetamata tööde aruanne: [docs/INTEGRATION-RELEASE.md](docs/INTEGRATION-RELEASE.md). Varasemad Phase-failid on arendusajalugu ega tõenda praeguse versiooni valmidust.

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

## Phase 54 — Persistent accounts, social lobby and ready-gated 1v1

The multiplayer front-end now has a server-backed account system and a proper Wargame-style match lobby. Accounts are persisted in `server/data/accounts.json` (override with `ROGUE_FRONT_DB`). Passwords use Node's `scrypt`; raw passwords are never stored.

The lobby supports registration/login, player search, mutual friends, public 1v1 rooms, host-only room settings, faction/deck selection, READY/UNREADY, lobby chat, and a host-controlled START BATTLE gate. The game WebSocket accepts only authenticated members of a started room and assigns teams from the authoritative room membership.

Development: run the server from `server/` with `npm install && npm start`, then run the Vite app with `npm install && npm run dev`. Vite proxies `/api` and `/ws` to port 8787.


## Phase 55 — Online Warfare

This release adds persistent server-side decks, ranked matchmaking, Elo-style rating/XP progression, friend invitations, reconnect-safe multiplayer identity, spectator tokens and a Live Games view. Match results are tied to actual started rooms and cannot simply be submitted against an arbitrary room.

## Phase 56 — Procedural Tactical Maps

The game now includes a deterministic procedural map generator and six curated seeds:
- Frontier Balance — open combined-arms map with three approach lanes and forest cover.
- Three Bridges — diagonal river obstacle with three bridge crossings and contested center.
- Iron Highlands — ridge/chokepoint-heavy terrain intended for artillery and defensive play.
- Grey District — dense urban fighting with avenues and building blocks.
- Coastal Spearhead — coastal water obstacle and narrow land approaches.
- Black Forest — heavier concealment and close-range fighting.

A lobby can also select `PROCEDURAL — random balanced map`; the seed is encoded in the map ID, so both clients deterministically generate the same map. Procedural terrain, features, bases and resource points are generated from the same mission seed.

## Phase 57 — Expanded combined-arms roster

The roster is expanded with distinct infantry, recon, anti-tank, artillery, mobile-AA, armor, air-support and naval roles. New units are not cosmetic variants: their target restrictions, detection, suppression, indirect fire, ECM and mobility make them tactically different.

New unit families include AT infantry, MG infantry, recon infantry, snipers, mortar teams, MANPADS, ATGM teams, recon vehicles, light tanks, tank destroyers, SPAAG, CAS helicopters, ECM aircraft, multirole fighters, strike aircraft, frigates and missile boats.

### Tactical roster

Infantry now has line infantry, AT infantry, MG teams, recon, snipers, mortar teams, MANPADS and ATGM teams. Ground vehicles include recon vehicles, light tanks, tank destroyers and SPAAG. Aviation adds CAS helicopters, ECM support, multirole fighters and strike aircraft. Naval forces add frigates and missile boats.

The new roles have gameplay differences: recon improves detection, AT units are class-restricted and powerful against armored targets, MANPADS/SPAAG prioritize aircraft, mortar uses indirect fire and spotters, ECM reduces nearby missile/radar-guided accuracy, and fast naval units trade survivability for mobility.


## Phase 58 — Unit & Building Depth

Phase 58 ühendab üksuste platformipõhise kütuse/laskemoona/varustuse mudeli, täieliku tootmishoone seose ja hoonete sõjalised rollid. Üksikasjalik järgmise arenduse roadmap on `docs/PHASE58-UNIT-BUILDING-DEPTH.md`.

## Phase 59 — Wargame Combat

Combat now separates accuracy, penetration, armor face, suppression, morale, ECM and reload skill. Platform profiles are defined in `src/sim/units.ts`; projectile resolution is deterministic through the World RNG. A penetrating hit can temporarily disable a vehicle, while under-penetrating hits mainly suppress and cause reduced damage. The HUD exposes the key combat stats.

## Phase 62 logistics
Ground logistics now operates as a physical convoy network. Captured resource sites build stock, road trucks collect it, forward depots buffer it, and vulnerable transfer trucks move forward stock toward the trunk depot/HQ. Helicopter airbridge and strategic cargo-plane airlift remain separate logistics channels.

## 3D-tehnika ja multiplayer’i uuendus

Peamenüü **3D ARSENAL** avab pööratava mudelivaate. Sama GLB-tehnika on kasutusel lahingus: tankid, IFV/APC, luure, suurtükid, MLRS, SPAA, lennukid, kopterid ning varustusveokid. 21 rolli × USA/Venemaa/Hiina = 63 originaalset stiliseeritud varianti. Jalavägi on hilisema koosseisu- ja mudeliuuendusega asendatud; hooned ja merevägi kasutavad oma olemasolevaid mudeleid.

Ilma Dockerita käivita multiplayer’i jaoks teises terminalis `npm ci --prefix server && npm start --prefix server`. Ava mõlemad kliendid Vite kaudu aadressil `http://localhost:5173`. Nginx/Compose ja Vite kasutavad sama päritolu `/api` ning `/ws` proxy’t. Eraldi avaliku websocket-serveri puhul määra enne build’i `VITE_WS_URL=wss://sinu-server/ws`.

GLB-d ja tekstuurid on projektis olemas. Ainult art’i uuesti genereerimine vajab Pythonit/Pillow’d (`python3 -m pip install Pillow`) ja käsku `npm run art:build`. Allikas: `scripts/art/`; mõõdikud: `public/models/art/manifest.json`.

Selle uuenduse põhikontroll: 6 simulatsiooni/save-load testi, tootmisbuild, mudelite brauserivaatlus ja kahe brauserikliendi start/käsk/reconnect/desync. Ülevaade ning piirangud: [docs/ART-MULTIPLAYER-RELEASE.md](docs/ART-MULTIPLAYER-RELEASE.md).
