# Rogue Front

Brauseripõhine RTS (Three.js + TypeScript + Vite), inspireeritud mängust *Real War: Rogue States*.

## Käivitamine Dockeris

```bash
docker compose up dev multiplayer                 # arendus: http://localhost:5173 (HMR)
docker compose run --rm dev npm test  # testid
docker compose run --rm dev npm run typecheck
docker compose --profile prod up --build prod multiplayer   # tootmisbuild nginxis: http://localhost:8080
```

## Käivitamine ilma Dockerita

```bash
npm ci && npm run dev
```

## Integreeritud mängu käivitamine

Ava `http://localhost:5173`, vali fraktsioon, kaart, režiim ja vaba roster või salvestatud deck. Kontot üksikmänguks ei vaja.

Algus: F2 valib insenerid. BUILDS → generaator → varustusladu. Saada teine insener ressursipunkti. Ehita maaväe juhtimiskeskus, vali see ning ehita soomustehas. LAND-paneelist tooda tank. Hoia ladu ja ressursitransport töös: tootmine ning eesliini laskemoon, kütus ja remont sõltuvad piiratud varudest.

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

Peamenüü **3D ARSENAL** avab pööratava mudelivaate. Sama GLB-tehnika on kasutusel lahingus: tankid, IFV/APC, luure, suurtükid, MLRS, SPAA, lennukid, kopterid ning varustusveokid. 21 rolli × USA/Venemaa/Hiina = 63 originaalset stiliseeritud varianti. Jalavägi, hooned ja merevägi kasutavad veel varasemaid mudeleid.

Ilma Dockerita käivita multiplayer’i jaoks teises terminalis `npm ci --prefix server && npm start --prefix server`. Ava mõlemad kliendid Vite kaudu aadressil `http://localhost:5173`. Nginx/Compose ja Vite kasutavad sama päritolu `/api` ning `/ws` proxy’t. Eraldi avaliku websocket-serveri puhul määra enne build’i `VITE_WS_URL=wss://sinu-server/ws`.

GLB-d ja tekstuurid on projektis olemas. Ainult art’i uuesti genereerimine vajab Pythonit/Pillow’d (`python3 -m pip install Pillow`) ja käsku `npm run art:build`. Allikas: `scripts/art/`; mõõdikud: `public/models/art/manifest.json`.

Selle uuenduse põhikontroll: 6 simulatsiooni/save-load testi, tootmisbuild, mudelite brauserivaatlus ja kahe brauserikliendi start/käsk/reconnect/desync. Ülevaade ning piirangud: [docs/ART-MULTIPLAYER-RELEASE.md](docs/ART-MULTIPLAYER-RELEASE.md).
