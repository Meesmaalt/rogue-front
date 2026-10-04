# Phase 58 — Unit & Building Depth

Eesmärk: ühendada **Real War** logistiline baasiloop **Wargame/Red Dragon** üksuste taktikalise detailsusega.

## Tehtud selles faasis

### Üksused
- Igal üksuse klassil on nüüd platformipõhine laskemoona- ja kütusemaht.
- Kütusekulu sõltub üksuse tüübist, mitte ainult `air/ground` lipust.
- Varustusekulu on rollipõhine: tank, arty, MLRS, õhk ja merevägi tarbivad erineva tempoga.
- Relvastuse, optika, soomuse, stabilisaatori, stealthi, moraali ja rolli andmed jäävad Wargame'i-laadseks eraldi kihiks.
- HUD näitab üksuse taktikalist rolli, võimekust, laskemoona, kütust ja supply staatust.
- Kõik olemasolevad maa-, õhu- ja mereväe üksused on nüüd seotud õige tootmishoonetüübiga.
- Tootmise koguselimiidid on üksusepõhised, mitte ainult mõne üksiku mudeli jaoks.
- Producer level 2 annab päriselt tootmiskiiruse eelise.

### Hooned
- Hoonetel on nüüd eksplitsiitne sõjaline roll:
  - command
  - production
  - logistics
  - power
  - sensor
  - defense
  - upgrade
- Varustuslaol on eraldi supply/ammo/fuel mahud; refinery'l fuel storage.
- Ehituse HUD näitab hoone funktsiooni.
- Hoone tootmiskiirus on simuleerimises eraldi parameeter.
- Power mõjutab jätkuvalt tootmist; tootjauuendus suurendab tegelikku tootmiskiirust.

### Logistika
- Üksuse supply, ammo ja fuel on nüüd ühtsema platformi-spetsiifilise mudeli peal.
- Varustusladu jääb forward-logistika sõlmpunktiks, mitte lihtsalt “buildable” objektiks.

## Järgmised faasid

### Phase 59 — Wargame combat model
1. Relvasüsteemid eraldi: main gun / coax / ATGM / SAM / AA gun / rockets.
2. Iga relva oma range, accuracy, penetration, reload ja ammo pool.
3. True target classes: infantry / soft / armor / air / naval.
4. Stabilizer, moving accuracy, turret traverse ja firing arc.
5. Suppression → panic/retreat/combat effectiveness.
6. Recon/optics + last-known-position gameplay.
7. ATGM, SAM ja radar warning/SEAD päriselt süsteemide vahel seotud.

### Phase 60 — Real War operational logistics
1. Eraldi ammo, fuel ja spare-parts stockpiles.
2. Supply convoy/transport truck süsteem lisaks supply-helicopterile.
3. Teed parandavad logistika kiirust; sillad ja chokepointid mõjutavad route'i.
4. Forward depot peab päriselt saama HQ-st varustust.
5. Depot võib tühjaks saada; vaenlane saab logistikaahelat katkestada.
6. Repair/rearm/refuel time sõltub hoonest ja kahjustustest.

### Phase 61 — Industrial economy
1. Raha/credits = strateegiline eelarve.
2. Resources = füüsiline tööstuslik materjal.
3. Oil/fuel kui eraldi strateegiline ressurss.
4. Factory capacity ja workforce.
5. Tootmine ei ole enam “üks nupp = ühik”; tootmisahelal on piirangud.
6. Tehaste hävitamine vähendab reaalselt sõjalist võimekust.

### Phase 62 — Wargame-style formations & battlegroups
1. Company/battalion/task-force koosseisud.
2. Deck määrab saadaolevad üksused ja kogused.
3. Activation points + deployment cost.
4. Reinforcement pool ja reserv.
5. FOB / forward deployment.
6. Deployment zones ja tactical objectives.

### Phase 63 — Battlefield presentation
1. Iga põhiklassile eraldi kvaliteetne 3D mudel.
2. Varustus ja relvastus nähtavalt mudelil.
3. Infantry squad kui mitu visuaalset sõdurit, mitte üks marker.
4. Tanks/APC/IFV/AA/arty erinevad silhouette'id.
5. Hit effects, smoke, fire, disabled vehicle, wreck.
6. Parem heli ja relvade signatuurid.

## Disainipõhimõte

**Real War määrab, kuidas armee elus püsib.  
Wargame määrab, kuidas üksused võitlevad.**

Seega ei tohiks üksust tasakaalustada ainult `cost/hp/damage` järgi. Üksuse tegelik väärtus tuleb:

`firepower + survivability + mobility + sensors + logistics burden + availability`

Sama kehtib hoonete kohta:

`construction cost + power + production capacity + logistics value + tactical vulnerability`.
