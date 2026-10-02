# Kaartide süsteem

Rogue Front kasutab missioonipõhist kaardikirjeldust. Uue kaardi lisamisel ei ole vaja `World.ts` või simulatsiooni ümber kirjutada.

## Kaart koosneb

- `map.id` – unikaalne kaardi ID
- `map.name` – mängus kuvatav nimi
- `map.theme` – renderduse visuaalne teema (`desert`, `mountains`, `city`)
- `map.heightmap` – PNG halltoonides kõrguskaart
- `map.maxHeight` – PNG maksimaalse halltooni kõrgus
- `map.bases` – kahe poole baasikeskmed ja raadius
- `map.resources` – kaardipõhised ressursiallikad
- `map.objects` – alguses olevad üksused ja ehitised
- `map.features` – teed, sillad, hooned, seinad, chokepoint'id ja cover-objektid

## Heightmap

PNG peab olema ruudukujuline ja katma sama 400 × 400 mänguala. Must = madal, valge = kõrge. Simulatsioon, navigeerimine ja renderdus kasutavad sama `heightAt()` väärtust.

## Taktikalised feature'id

`building`, `wall` ja `chokepoint` blokeerivad navigeerimisruudud. `road` ja `bridge` on liikumiskoridorid; `bridge` renderdab lisaks piirded. `cover` on praegu visuaalne taktikaline objekt, millele saab hiljem lisada varjumis- või kõrguse-eelise mehhanismi.

## Uue kaardi lisamine

1. Lisa `public/maps/<id>.png`.
2. Lisa `src/data/missions/<mission>.json`.
3. Määra kaardile kaks baasi, ressursid, algobjektid ja feature'id.
4. Vali olemasolev `theme` või lisa uus renderduse teema `Terrain.ts`-i.
5. `src/data/missions/index.ts` leiab JSON-i automaatselt `import.meta.glob` abil.

## Praegused kaardid

| ID | Kaart | Keskkond | Taktikaline ülesehitus |
|---|---|---|---|
| `desert` | Liivaväli | kõrb | koridorid, chokepoint'id, cover |
| `mountains` | Mustad mäed | mäestik | kuru, sild, külgseinad |
| `city` | Must linn | linn | tänavavõrk, hooneblokid, müürid |

Kaartide erinevus tuleb nüüd heightmapist, baasipaigutusest, ressurssidest, algobjektidest, missiooni eesmärkidest ja staatilistest map feature'idest.
