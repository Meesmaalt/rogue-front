# TODO – Rogue Front

Järjekord on oluline. Märgi tehtud ülesanded `[x]`. Prototüüp (`prototype/rogue-front.html`) on **viide**: ülesannete 1.x eesmärk on selle käitumine portida moodulitesse.

## Faas 0 – Alus (tehtud)
- [x] Vite + TypeScript + Three.js projekt, Docker (dev + prod), vitest
- [x] `GameLoop` fikseeritud sammuga, `heightmap`, `Terrain`, `RtsCamera`

## Faas 1 – Prototüübi portimine moodulitesse
- [x] 1.1 `src/data/units.json` + tüübid (`UnitDef`): tank, jalavägi, punker, komandopunkt (väärtused prototüübi `STATS`-ist). Laadimine tüübikontrolliga.
- [x] 1.2 `sim/World.ts`: entiteedid, `spawn()`, `tick(dt)`, sündmuste väljund. Test: spawn + tick ei viska viga, deterministlik sama seemnega.
- [x] 1.3 `sim/systems/Movement.ts`: sihtpunkti liikumine, pööramine, separation, nõlva kiirusmodifikaator, kaardi piirid
- [x] 1.4 `sim/systems/Combat.ts`: sihtmärgi valik (aggro/range), tulistamine, mürsud, kahju, surm
- [x] 1.5 `sim/Command.ts`: `Move`, `Attack`, `AttackMove`, `Stop`, `Produce`
- [x] 1.6 `render/models/`: tank, jalavägi, punker, komandopunkt (esialgu primitiividest nagu prototüübis); `UnitRenderer` sünkroniseerib sim → three.js, kallutab tankid maastikule
- [x] 1.7 `render/Fx.ts`: mürgid, plahvatused, suits, ping-markerid (sim-sündmuste põhjal)
- [x] 1.8 `input/SelectionController`: klõps, kast, shift, topeltklõps, grupid Ctrl+1…9
- [x] 1.9 `input/CommandController`: parem hiir (liigu/ründa), X = peata, formatsioonipaigutus
- [x] 1.10 `ui/HUD`, `ui/Minimap`, `ui/BuildPanel` (HTML/CSS, kujundus nagu prototüübis), elumõõdikud
- [x] 1.11 Majandus ja tootmine: krediit, tootmisjärjekord HQ-s, rally point
- [x] 1.12 `sim/ai/WaveAI.ts`: ründelained (vt prototüübi `updateAI`), vaenlase kaitseüksused
- [x] 1.13 Võit/kaotus, alustus- ja lõpuekraan
- [ ] 1.14 Prototüübiga samaväärne käitumine **kontrollitud päris brauseris** (sim on testitud, renderdus/UI/sisend on ainult build- ja tüübikontrollitud) → **prototüübi fail jääb alles viiteks**

**Valmis kriteerium:** mäng mängitav sama moodi nagu prototüüp, kuid moodulitena; kõik `sim/` testid rohelised.

## Faas 2 – Navigatsioon
- [x] 2.1 `sim/nav/NavGrid.ts` (2 m ruudustik, blokeeritud: hooned, nõlv > ~35°) + test
- [x] 2.2 A* pathfinder (binaarhunnik), tee silumine
- [x] 2.3 Rühmaliikumine: flowfield sihtpunkti jaoks, formatsioonid
- [x] 2.4 Hoonete ja kitsaskohtade ümberkõndimine, kinnijäämise tuvastus
- [x] 2.5 Jõudlustest: 200 üksust < 4 ms/tick

## Faas 3 – Nähtavus (fog of war)
- [x] 3.1 `sim/Vision.ts`: nägemisraadius, ruudustikupõhine nähtavus meeskonniti
- [x] 3.2 Vaenlane nähtav ainult nähtavuses; AI ei "näe" läbi udu
- [x] 3.3 Renderdus: udumask (ekraanimaske), minikaardi udu
- [x] 3.4 Uuritud/ei-uuritud/nähtav kolm olekut

## Faas 4 – Mängu sügavus
- [x] 4.1 Soomustüübid × relvatüübid (kahjumaatriks `data/damage.json`)
- [x] 4.2 Õhuüksused (helikopter, hävitaja), õhutõrje
- [x] 4.3 Hoonete ehitamine (ehitaja üksus, ehitusrežiim, nõuded, tehnoloogiapuu)
- [x] 4.4 Ressursid (nt tankla/eraldi ressursipunkt) ja majanduse tasakaal
- [x] 4.5 Käsud: patrull, hoia positsiooni, kogu-ründamine (A+klõps)
- [x] 4.6 Veteranitase / uuendused
- [x] 4.7 Mitu vaenlase AI isiksust (agressiivne/kaitsev/majanduslik), raskusastmed

## Faas 5 – Visuaalne kvaliteet
- [x] 5.1 GLB-mudelid + `GLTFLoader` pipeline, seitse lokaalset low-poly GLB prototüüpmudelit, `InstancedMesh` suurte korduvate rühmade jaoks (kolmanda osapoole CC0-varasid ei väideta)
- [x] 5.2 Maastiku splatmap + normal/roughness tekstuurid, detailtekstuur
- [x] 5.3 Post-processing: SMAA/FXAA, bloom, SSAO, kerge vignette (`postprocessing` või `EffectComposer`)
- [x] 5.4 Kaskaadvarjud (CSM) või paremini sobitatud varjukaamera
- [x] 5.5 Osakeste süsteem (GPU/instanced), dekaalid (põlenud pinnas, rajad), tolm liikumisel
- [x] 5.6 Taevas (sky shader), päikese suund, õhuperspektiiv; vesi/oaasid
- [x] 5.7 LOD ja frustum culling kontroll, jõudluse eelarve (60 fps 200 üksusega keskmisel arvutil)

## Faas 6 – Kampaania ja missioonid
- [x] 6.1 Missiooni JSON formaat (`data/missions/*.json`): kaart, algüksused, eesmärgid, triggerid
- [x] 6.2 Eesmärkide süsteem (hävita, kaitse, jõua punkti, ellu jää X min)
- [x] 6.3 Triggerid/skriptitud sündmused, abivägi, briifingu ekraan
- [x] 6.4 Mitu kaarti (kõrb, mäed, linn), kaardiformaat (heightmap PNG + objektide nimekiri)
- [x] 6.5 Missioonide valik, edenemise salvestus (localStorage)

## Faas 7 – Heli ja UI viimistlus
- [x] 7.1 Heli: relvad, plahvatused, taustamuusika, üksuste vastused (Web Audio, välise helifaili sõltuvuseta)
- [x] 7.2 Menüü, seaded (graafika kvaliteet, helitugevus, klahvide sidumine), paus
- [x] 7.3 Tööriistavihjed, kursorid, valiku info, baasi hoiatus
- [x] 7.4 Mobiilipaigutus ja puutesõbralikumad HUD-kontrollid (valikuline)

## Faas 8 – Kvaliteet ja release
- [x] 8.1 Sim ühiktestid + replay determinismi test
- [x] 8.2 ESLint + Prettier konfiguratsioon ja npm käsud
- [x] 8.3 CI (GitHub Actions): docker build, typecheck, test, build, lint, format
- [x] 8.4 Salvestamine/laadimine, replay-salvestus
- [x] 8.5 GHCR container release + nginx healthcheck
- [ ] 8.6 Jõudlus: profiil, Web Worker simi jaoks (valikuline)

## Faas 9 – Mitmikmäng (valikuline)
- [x] 9.1 Deterministlik lockstep (käskude vahetus, sama seeme), desync-tuvastus
- [x] 9.2 WebSocket relay server (Node, eraldi Docker teenus compose'is)
- [x] 9.3 Lobby, 1v1, taasühendus
