# Phase 10 — Map System 2.0

Kaardid on nüüd andmepõhised taktikalised mänguruumid, mitte ainult heightmap + värvipalett.

## Kaardi komponendid

- heightmap: maastiku kõrgus
- bases: baasikeskmed
- resources: ressursitsoonid
- objects: algüksused/ehitised
- features: teed, sillad, hooned, seinad, chokepoint'id ja cover-objektid

## Feature tüübid

- `road` — visuaalne liikumiskoridor, ei blokeeri navigeerimist
- `bridge` — visuaalne sild koos piiretega
- `building` — blokeerib navigeerimise
- `wall` — blokeerib navigeerimise
- `chokepoint` — füüsiline takistus, mis sunnib üksused valitud koridoridesse
- `cover` — väike taktikaline objekt; praegu visuaalne, kuid valmis hilisemaks cover-mehaanikaks

## Praegused kaardid

### Liivaväli
Kõrbekoridorid, kaks chokepoint'i ja hajutatud cover.

### Mustad mäed
Kitsas keskne tee, sild, kaks külgseina ja mäekuru.

### Must linn
Tänavavõrk, neli suurt hooneblokki, külgmüürid ja põhjapoolne/lõunapoolne chokepoint.

## Uue kaardi lisamine

1. Lisa heightmap `public/maps/<id>.png`.
2. Lisa missiooni JSON `src/data/missions/`.
3. Määra `bases`, `resources`, `objects` ja `features`.
4. Feature'id ei vaja `World.ts` muudatusi.
5. Uus visuaalne theme on vajalik ainult siis, kui olemasolevad `desert`, `mountains` ja `city` paletid ei sobi.
