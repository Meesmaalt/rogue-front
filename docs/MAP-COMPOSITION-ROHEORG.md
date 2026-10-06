# Roheorg: kaardi kompositsiooni viimistlus

## Tulemus
1088 m kaart kasutab nüüd kaht kompaktset jõeküla, selgeid ühendusteid, põllu- ja metsavööndeid ning viit olemasolevat sillaületust. Kaardi autorandmetes on 48 tsiviilhoonet, 45 teed, 22 põllulappi, 20 metsaala ja 48 kattuvat jõesegmenti. World lisab täpselt viis ressursirajatist: kokku 53 staatilist hoonet.

Külamajad paiknevad tänavate järgi, väiksemad talukompleksid põldude kõrval. Teede klassid eristavad maanteed, ühendusteed, külatänavad ja kruusarajad; tänavad ja rajad ei kasuta maantee teljemärgistust. Baaside asukohad, ressursipunktid ja sillad säilitavad senise mängulise ülesande.

Varasem autorandmete tööstushoonete kiht dubleeris Worldi automaatseid ressursirajatisi. See eemaldati. Kaardi facilityOffset määrab nüüd päris ressursihoone asukoha, vältides tee ja hoone kattumist; vanade kaartide vaikimisi nihe säilib.

## Renderduse ja simulatsiooni ühendus
- Üks 2048² maastikuatlas ühendab põllutekstuurid, metsapõhjad, kaldad ja teeservad. See luuakse kaardi laadimisel samadest feature-andmetest, mida kasutavad simulatsiooni maastikutarbijad; põllud ei ole enam eraldi hõljuvad plaadid.
- Jõesegmendid jagavad veematerjali ja maailma koordinaatidel põhinevaid UV-sid. Kuival kaldal järgib maapind silla lähenemisrampi; vee all säilib päris jõepõhi, mitte muldkeha.
- Tsiviilmajade kaugmudel kasutab jagatud akende ja ustega fassaaditekstuuri. Varem jäi kaugvaates alles tühi seinakast. Lähimudelite geomeetria säilib.
- Minikaardi joonistusjärjekord jätab teed põldude ja metsade peale. Temperate-kaardi udu algab kaugemalt; ressursisilt kuvatakse lähedalt, et kaugvaadet mitte täita suurte tekstidega.

Simulatsioon jääb fikseeritud sammuga ja deterministlikuks. UI ei loo eraldi teede ega hoonete olekut. Roheoru salvestusvõti on layout12, mistõttu vana paigutusega salvestust ei laadita uuele kaardile automaatselt.

## Kontroll
Tootmisbuild (sh strict TypeScript) ja TerrainState'i viis sihitud kontrolli läbisid. Uus kontroll kasutab päris Worldi: tsiviil- ja ressursihooned ei kattu tee ega veega, kogumispunktid on läbitavad ning kuiv silla lähenemine järgib nav-kõrgust. Sama arenduse varasemad kaks Pathfinderi kontrolli läbisid; tervet testikomplekti ei käivitatud.

`checks/roheorg-layout-comparison.png` on JSON-andmetest loodud paigutusskeem, mitte brauseri render. Kohalik Chromium puudub, seega tegelik 3D-pilt ja GPU jõudlus pole selles etapis kinnitatud. Wargame'i visuaalse taseme saavutamist ei saa üksnes skeemi põhjal väita.

Paigutuse taasloomine: `python3 scripts/maps/polish-roheorg.py`. Skeem: `python3 scripts/maps/overview.py /path/to/before-map.json`.
