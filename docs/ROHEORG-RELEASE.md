# Roheorg: üks kaart ja ühendatud taktikaline kasutajaliides

Brauseriplatvorm säilib. Peamenüü üksiklahing keskendub Roheorule; vanad kaardid jäävad kampaania ja võrguühilduvuse jaoks alles. Vaikimisi Conquest, valitav valmis baas koos väikese lahingugrupiga või HQ ja inseneridega ehitusalgus. Valmis algus on mõlemal poolel sümmeetriline. Esialgne lahingugrupp on stsenaariumi koosseis; valitud deck piirab järgnevaid tugevdusi.

## Tegelikud muudatused
- Algne kaardiandmestik `src/data/maps/green-valley.json`: kolm teed, küla, avatud põllud, mets ja viis majandus-/territooriumipunkti. Maastiku kõrgusväli on sujuv; renderdus ja nav kasutavad sama välja.
- Teed on maastikule sobitatud võrgud koos peenarde ja märgistusega. Metsad on instantsitud puud. Põllud on visuaalselt eristatavad ega anna ekslikult varjet.
- Üksuste roster kasutab 63 päris mängumudelitelt renderdatud pilti. Jalaväel on helmet, vest, seljakott, relv, liigendatud jalad ja tegeliku liikumise järgi käivituv samm. Kasarmul, tehasel ja laol on kaldkatused.
- Alumine 220px juhtpaneel: minikaart, valik, olekuribad, käskude ikoonid ning keritavad tootmiskaardid. Lisastatistika ja formatsioon/prioriteet on avatavad. Üksik üksus valitav ka grupi kaartidest. Tootmishoone valik avab vastava tootmisvaate. Majandusinfo avaneb ülemisel infonupul.
- Ründeliikumine kasutab A* teekonda. Kõik tavalised maaväe liikumissammud kontrollivad nav-takistusi. Teekonna alguspunkti ei jäeta vahele. Veokid järgivad marsruuti. Hoia-käsk ei blokeeri hiljem antud liikumiskäsku. Staatilised üksused ei nihku pideva eraldusjõu tõttu.
- Pööratud nav-takistused vastavad Three.js-i nähtavale orientatsioonile. Protseduurilise kaardi topeltmüürid eemaldatud; Roheoru baasid on avatud. Vanade baasipiirete kõrgus vähendatud.
- Tulejoon kontrollib hooneid ja takistusi kõrgusega; vesi ei blokeeri õhus lendavat lasku. Blokeeritud tulejoonega ründaja otsib laskepositsiooni. Kontaktide kadudes ei jälitata peidetud üksuse uut koordinaati. Automaatne sihtimine eelistab lahinguohtu; selgesõnaline logistikaprioriteet säilib.
- Eluribad/nimed arvestavad mängija meeskonda ja tegelikku avastamist. HUD selgitab laskemoona puudust, laadimist, tule keeldu või blokeeritud tulejoont.

## Kasutamine
`npm install`, `npm run dev`; ava peamenüü, vali fraktsioon, Conquest ja valmis baas. F1 valib soomuse; Fookus liigutab kaamera valikule. Ründeliiku + parem klõps kaardil/minikaardil. Ehitamiseks vali insener või juhtimishoone ja Ehita. Tootmiseks vali Maa/Õhk või vastav tootmishoone. Tase ja füüsilise varustuse nõuded säilivad.

## Kontroll
`npm run build`; valitud regressioonid `npx vitest run src/sim/Roheorg.test.ts src/sim/CoreLoop.test.ts src/sim/SaveState.test.ts` (8 kontrolli). Need katavad takistusest möödumise, valmis baasi tootmisvõime, tegeliku lahingukahju ja moona tarbimise, salvestuse deterministliku jätkamise, majandus-/tootmisahela ja kahe meeskonna samasuse.

Brauseri tulemused ja pildid: `docs/checks/roheorg-browser.json`, `roheorg-start.png`, `roheorg-battle.png`. Need kirjeldavad konkreetset läbimängu, mitte kogu mängu valmimise tõendit. Tarkvaraline WebGL ei anna mängija GPU jõudluse mõõtmist.

Pildikaartide taastamine: installi Playwright koos Chromiumiga ja PIL; käivita projekti juures `node scripts/art/capture-thumbnails.cjs`. Soovi korral `PLAYWRIGHT_MODULE` ja `CHROMIUM_EXECUTABLE` keskkonnamuutujad.

## Piirid
See on esimene ühe kaardi terviklik viimistlus. Mudelid ja külamajad on jätkuvalt originaalne stiliseeritud geomeetria, mitte Wargame'i taseme detailne kunst. Suurte armeede ummikud, ühe kaardi pika mängu tasakaal ning õhu/suurtüki käsuvoog vajavad edasist mängijaga viimistlemist. Uusi võrgufunktsioone selles muudatuses ei lisatud; muutunud simulatsioon nõuab mõlemal mängijal sama versiooni.
