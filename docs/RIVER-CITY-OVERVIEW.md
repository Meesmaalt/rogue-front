# Roheorg: jõgi, linnad, metsad ja taktikaline üldvaade

Kasutaja võrdluspilt: reference/wargame-overview.png. Eesmärk on loetav taktikaline kaart: jõgi määrab ületuskohad, linnad ja metsad annavad erinevaid lahingupositsioone ning kaugelt tuntakse üksusi märkide järgi.

## Tegelik ühendus

- Senine 1088 m kaart ja 85 väikemaja säilivad. Jõgi koosneb kuuest kattuvast pööratud lõigust, ulatudes ühest kaardiservast teiseni. Viis olemasolevate teede ja jõe keskjoonte ristumiskohta said joondatud sillad. Autoritöö skript scripts/maps/add-roheorg-river.py keeldub korduvast lisamisest.
- MapFeature.surfaceHeight määrab vee absoluutse pinna (-0,8 m) või silla teekatte (+1,2 m). heightmap.ts küpsetab jõesängi ja kaldad deterministlikku 2 m kõrgusvahemällu. Sillale tehakse tasane sõidupind ja lähenemiskalded, mida kasutavad üksused, nav, LOS ja renderdus.
- Maaüksused ei ületa vett väljaspool sillajalajälgi. Nav rakendab sillad pärast vett sõltumata andmete järjekorrast. Maastiku taastamine taastab ka varem sillaga vabastatud slope-cells.
- GroundHeightAt eristab nähtavat jõesängi üksuste silla kõrgusest: maastik ei moodusta silla alla veevoolu sulgevat tammi. Veepind on tasane, mitte maastikku kopeeriv kuubik. Sillapiirded asuvad tee külgedel ja järgivad silla pöördenurka.
- Silla olemasoleva infrastructureDamage oleku jõudmine 1-ni eemaldab teekatte kõrguse ja avatud nav-koridori, tühjendab liikuvate maaüksuste vana marsruudi ning peidab sillamudeli. Kõrgus ja nav taastatakse ka save/load kaudu. Minimap näitab hävinud ületuskohta. Olemasoleva artillery tulemissiooni ja projectile-impacti struktuurikahju kahjustab nüüd ka sildu; uut eraldi silla sihtimise käsku ei lisatud. Kasutatakse ühist andmepõhist struktuuri HP reeglit.
- Endine keskne ressursipunkt oleks jões; see asub nüüd läänekaldal koos oma reaalse kogumisrajatisega. Veele ja sillale ei saa paigutada baasihoonet.
- Metsapuud on vee ja teede pealt välja lõigatud; ka sim-i metsatihedus ei anna jõele nähtamatut metsa varjet.
- Maastiku mesh on 192 × 192, et 26 m laiuse jõe kaldad ei oleks vana 11 m sammuga lõhutud. Toonid on vaoshoitumad ja kallastel mudasemad. Senine forest instancing ja majade LOD säilivad; jõepinnad ja muu staatika kasutavad olemasolevat material/cell batchingut, kahjustatavad sillad jäävad eraldi.
- Kaamera algkaugus 280 m; liikuvate üksuste nimi ja klassimärk ilmuvad alla 4,2 ekraanipiksli maailmameetri kohta. Lähedalt jäävad märgid valitud ja nähtava vaenlase üksusele. Tegelik vastase nähtavus tuleb fog/recon süsteemist.
- Automaatse salvestuse võti on layout11. Varasema paigutuse salvestusi ei kustutata ega automaatselt üle laadita.

## Kontrolli piirid

Build/typecheck ning sihitud TerrainState (4), garrison (3), heightmap (3) ja Pathfinder (2) kontrollid läbisid. Uus river-kontroll kasutab tegelikku Roheorgu: vesi blokeerib, keskne sillatekk on läbitav, marsruut kasutab silda, kõigi sildade hävimine eemaldab ületuse ja save/load säilitab katkemise. Vana heightmap-kontroll nimetas 199 m koordinaati kaardiservaks; see parandati tegeliku MAP_SIZE järgi.

Võrdluspilt vaadati üle. Kohalik Playwright on olemas, Chromiumi käivitatav fail puudub; seetõttu selle etapi brauseri renderpilti, visuaalset vastavust ega GPU/FPS-i ei kinnitatud. Suurem terrain mesh ja lisanduv nav/vee geomeetria vajavad päris GPU-ga hinnangut. Jõekalda tõusud, veepinna servad ning linnade üldpilt vajavad järgmises visuaalülevaatuses vaatamist. Mereväe täisnavigeerimine ja jõel laevade kasutamine ei ole selles etapis lõpetatud; see kuulub B1-sse.
