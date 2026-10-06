# Kohalikud päringud ja renderduse kordustöö — 06.10.2026

## Muudatused
- TerrainState loob kaardi laadimisel 32 m ruumilise katteindeksi. Luure coverValueAt ja combat'i targetCoverValue küsivad nüüd kohaliku lahtri kandidaate kogu mapFeatures läbimise asemel. Täpne pointInFeature koos senise 0.25/0.2 m paddingu ning metsa, garnisoni ja tulekahju reeglitega säilib. Pööratud piirdekast sisaldab ka paisutatud nurki. Kandidaadid säilitavad algse feature-järjekorra; indeksit ei salvestata ega lisata hash'i.
- SpatialHash tühjendab rebuild'is ainult eelmisel sammul hõivatud bucket'id. Suure kaardi tuhandete tühjade massiivide igal tickil muutmine jääb ära. Lahtrite külastusjärjekord, sinna lisamise järjekord ja queryRadius/nearest valik ei muutu.
- updateTacticalSupply kogub kütusekonvoid meeskonniti ühe läbimisega. Kütust vajav maasõiduk kontrollib seda alamhulka kõigi entiteetide asemel. Varusid loetakse jätkuvalt elavatest entiteetidest iga üleandmise ajal. Esimene sobiv konvoi säilib; lähima konvoi valimiseks see muudatus reeglit ei muuda. Vastu võetud varu, koorem ja tarnekiirus jäävad samaks.
- UnitRenderer kogub aktiivsed varustussõlmed laisalt ühe sync-kutse sees ning kasutab ühist isTacticallySupplied kontrolli. Madala varuga üksused ei filtreeri enam iga kaader ükshaaval kogu entities massiivi. Vaadet ei säilitata tickide ega kaadrite vahel.
- Overlay kasutab taaskasutatavaid massiive ja stabiilset jaotust: valitud üksused enne teisi, mõlemas rühmas vana entiteedijärjekord. Iga kaadri filter+sort kaob. Ekraanilt väljas olevad märgid jäetakse enne pxPerUnit arvutust välja; nähtaval märgil kasutatakse sama mõõtkava kaugklassi ja eluriba jaoks. Peidetud vastased ei sisene joonistamise nimekirja.

Kaamera, renderduse kvaliteet, fog/luure reeglid, üksuste numbrid ega 30 Hz simulatsioonisamm ei muutu.

## Mõõtmine
Üks järjestikku käivitatud CPU-võrdlus: Roheorg, 96 mobiilset üksust, kaks HQ-d, 48 üksuse ründeliikumine, 60 mõõdetud simulatsioonisammu.

| Mõõdik | Võrdlus: kaardi täisotsing + kõigi bucket'ite tühjendamine | Kohalik katteindeks + hõivatud bucket'id |
| --- | ---: | ---: |
| Keskmine samm | 2.132 ms | 1.972 ms |
| Mediaan | 1.791 ms | 1.533 ms |
| 95. protsentiil | 4.150 ms | 3.875 ms |
| Käsuga samm | 37.675 ms | 36.374 ms |
| Lõppseisu hash | 4ffdf4ed | 4ffdf4ed |

Keskmine oli selles lühivõrdluses umbes 7.5% väiksem. See ei ole korduv statistiline mõõtmine ega GPU/FPS väide. Mõlemad profiilid sisaldavad konvoide uut alamhulka; see võrdlus eraldab katteindeksi ja bucket'ite muudatused. Overlay/UnitRenderer võit pole selles CPU-simulatsiooni mõõtmises sees. Toorandmed: checks/performance-reference-scans.json ja checks/performance-local-index.json.

Käivitamine: `node scripts/profile-simulation.mjs docs/checks/performance-reference-scans.json --reference-scan` ja `node scripts/profile-simulation.mjs docs/checks/performance-local-index.json`. Võrdluse ülekirjutused asuvad ainult Node-profiiliskriptis; mängus neid pole.

## Kontroll
Tootmisbuild ja strict TypeScript läbisid. Viis sihitud kontrolli läbisid: pööratud/paisutatud katte kandidaadid ning täisotsingu võrdlus paljudes punktides, ruumilise indeksi tühjendamine/liikumine/surnud ja laaditud üksused, piiratud konvoivarude järjekord, senine varustuse semantika ja deterministlik replay. Terve testikomplekti ega brauserit ei käivitatud; kohalik Chromium puudub.
