# 4–6 km lahingukaart ja ühine mõõtkava

14.10.2026. Uus `procedural-v9` reeglistik kasutab 4096 × 4096 ja 6144 × 6144 meetri kaarte. Üks maailmakoordinaat vastab ühele meetrile; kiirused on m/s ja ajad sim-sekundites. Need on mänguks häälestatud klassiprofiilid, mitte iga päris masina tehasespetsifikatsioonid.

## Käivitamine

Menüü uued kaardid algavad 4 km suurusest; suurusevalikus on ka 6 km. Samad kuus maastikutüüpi ja seemnest taastamine säilivad. Online juhukaardid ja ranked kasutavad v9 4 km kaarti. Vanad v2–v8 identiteedid on salvestuste taastamiseks alles, kuid uusi väikese mõõtkava kaarte põhimenüü ei loo. Baasiehitus, komponentide vahetus, ressursipunktid ja kaardivälised varustuslennud jäävad kasutusse.

Uue mõõtkava proovimiseks alusta uut 4096 või 6144 m lahingut. `World.metricBattle`, üksuse `metricScale` ja tegelikud definitsioonid kuuluvad salvestusse. Komponendivahetus taastab sama meetrites põhiplatvormi. Replay/lockstep räsi arvestab ka uue sõjaudu ajastust. Vanad salvestatud definitsioonid ei saa kogemata kilomeetrites relvi.

## Relvad ja liikumine

| Relv | Maksimum | Miinimum | Lennukiirus |
|---|---:|---:|---:|
| Automaatrelv | 500 m | 0 | 800 m/s |
| Kuulipilduja | 800 m | 0 | 850 m/s |
| Automaatkahur | 1800 m | 0 | 1000 m/s |
| Tankikahur | 2400 m | 0 | 1500 m/s |
| ATGM | 3000 m | 150 m | 250 m/s |
| MANPADS | 2500 m | 100 m | 500 m/s |
| Miinipilduja | 2400 m | 150 m | 130 m/s |
| Haubits | 8000 m | 600 m | 300 m/s |
| MLRS | 10000 m | 1200 m | 450 m/s |

Maksimumkaugus ei anna nähtavust: luure, maastik ja ühised kontaktid on endiselt vajalikud. Jalaväe baaskiirus on 2,4 m/s, tankil 12 m/s, APC-l 16 m/s, kopteril 55 m/s ja hävitajal 180 m/s. Fraktsioon ja komponendid mõjutavad platvormi kiirust edasi. Olemasolev kiirendus, pidurdus, kurvikiiruse piirang, tagurdamine, kütusekulu ning maastiku mõju rakenduvad nendele kiirustele.

Otsetule hajuvus kasutab väiksemat nurka, et pikem kaugus ei muudaks sihitud kahurit juhuslikuks suure ala tuleks. Kaudtule hajuvus kasvab kaugusega ning täpsuskomponent vähendab seda. Ballistiline gravitatsioon jääb 9,81 m/s². Relvade lennuaeg ja piiratud moon jäävad tegelikuks sim-olekuks.

## Lennuring

Ruleerimine ei vii enam lennukit ühe sammuga rajasuunda: ta joondub enne hoovõttu. 340 m rada, hoovõtu kiirendus, 400 m lennukõrgus, tõusu/languse kiirus, külgkiirendusest tulenev pöörderaadius ja sobiva suurusega CAP-ring kasutavad sama profiili. Lennuvälja juures on sama 340 m raja ühe joonistuskäsuga geomeetria.

Naasmisel aeglustab lennuk enne lähenemist, läheb rajaga joondatud lõppkoridorile ja jälgib glissaadi. Kõrvaline või valesti suunatud läbimine teeb uue lähenemise. Maandumine vajab sobivat suunda ja raja külgpiiri; sellele järgneb päris pidurdus ning ruleerimine parkimiskohale. Teenindus kulutab olemasolevat laomoona/kütust. Õhuüksustel on kaardipiirist väljaspool 2 km manöövriruumi. Kopterite 65 m kõrgus, tõus/langus ja horisontaalne kiirendus/pidurdus kasutavad eraldi profiili.

## Koormus ja navigeerimise täpsus

Maa- ja veenavigatsiooni mõõt jääb kuni 1024 × 1024 rakku: 4 km kaardil on rakk 4 m, 6 km kaardil 6 m. Kõrguspuhver jääb samasse suurusjärku. Sõjaudu on 256 × 256; sihtmärgi tuvastus kasutab jätkuvalt entiteedi LOS-i ja luurereegleid. Kuni kaheksa vaatleja udu uuendatakse ühe passiga, nähtavuse aegumine ja järjekord salvestuvad. See on teadlik täpsuse/koormuse kompromiss; kaartide geomeetria ja üksuste kohalik kehakontroll säilivad, aga naviruudustik ei esita iga kitsast linnavahet eraldi.

Kilomeetrise päringu puhul läbitakse ainult hõivatud ruumirakke. Tiheda ja hõreda päringu järjestus on identne, et tabamuse/RNG järjestus ei muutuks. Raadioside ja logistikasõlmede ühenduskaugused on 12 korda suuremad; lao kohalik teenindusraadius säilib. Kütust ja moona ei kanta üksusele raadioühenduse kaudu.

## Kontroll

Kontrollitud on mõlema suuruse kõik kuus maastikutüüpi, ID/seemne taastamine, hoonete muutumatu suurus, sildade ja ressursikohtade teekonnad ning piiratud ruudustikud. Maaüksus jõuab 600 m kaugusele, kiirendab/pidurdab ja kulutab kütust. Lennuring läbib õhkutõusu, joondatud maandumise, pidurduse ja piiratud varust relvastumise kolme rajasuuna korral. Save/load jätkab sama räsi ja nähtavusolekuga. 200 üksuse liikumine ja meetrites optika peavad mahtuma 30 Hz CPU-sammu eelarvesse; hõre ruumipäring säilitab järjekorra ja varajase katkestamise.

Build/TypeScript, serveri map-policy test ja kogu testipakk läbivad: 283 testi, 67 testifaili, 234,88 s. Päris WebGL-pilt ja brauseri FPS ei ole siin mõõdetud; F8 JSON-raport on järgmise masina-/stseenipõhise jõudluskontrolli alus.
