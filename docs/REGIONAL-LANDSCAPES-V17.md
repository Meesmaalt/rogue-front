# Piirkonnapõhine kaardigeneraator · v17

Uue lahingu loomisel saab valida Itaalia, Siberi talve, Ameerika kanjonid või kõrbe. Piirkonna vahetamine rakendab selle veestiku vaikeseaded; mängija saab merd, kõrgendikke, metsa, jõge ja järvi eraldi muuta. Ala iseloom määrab asustuse ulatuse, metsasuse või kõrgendike tugevuse. Piirkonna ja suuruse valik on ka mitmikmängu lobby loomisel ning muutmisel.

## Meetod

`regionalMap.ts` koostab kõigepealt piirkonnaplaani: jõekoridori, kolm ühendust, sööteteed, baaside/lennuväljade ning tootmisalade reserveeringud ja asulaankrud. Järvede terviklikud kaldad reserveeritakse enne reljeefi. Seotud pinnavormid kasvavad plaani kõrgendikuvööndites ning jätavad kavandatud läbipääsud ja tööalad vabaks. Alles seejärel luuakse kohalikud tänavad, majakrundid, maakasutus ja dekoratsioonid. See on esimene ühine planeerimisskelett; kõigi nelja piirkonna jaoks ei ole veel mitut eri teedevõrgu topoloogiat.

- Itaalia: lauged harjad, madalama maa põllud, viinamarja-/oliivi-/tsitrusealad ja terrakotakatustega asulad.
- Siberi talv: lumepind, tihedamad taigamassiivid, lumised okaspuud, väiksemad asulad ja tumedad avatud veekogud. Põllukultuure ei kasvatata. Talv ei külmuta jõgesid liikumiseks läbitavaks.
- Ameerika kanjonid: eraldi pideva kõrgusfunktsiooniga lavamaad ja kaljused jalandid, kõrguse järgi värvitud liivakivikihid ning hõre madalama maa taimestik. Puud ei kata kõrgeid kaljuseinu.
- Kõrb: kitsamad piklikud luiteahelikud, kuivad nõod, krohvitud asulad ja hõre võsa/kivide kiht. Jõgi ja järved on vaikimisi väljas.

Metsa välispiir saadakse pideva seemnepõhise piirkonnavälja lõikamisest krundi servadel; naaberkrundid kasutavad sama välja. Kõrgematele nõlvadele põlde ei maalita. Tee-, vee-, hoone- ja tööala jalajäljed lõigatakse maakasutusest välja. Kohalik dekoratsioonide eelarve kasvab kaardi pindalaga kuni 24 000 instantsini; kaugusgrupid peidavad pisidetaili. Dekoratsioonid ei lisa nähtamatuid liikumistakistusi ega taktikalist katet. Ehitusplats eemaldab oma alalt ka selle detaili.

## Simulatsioon ja esitus

`regions.json` koondab piirkonna pinnavormid, taimestiku läved, asustusmõõdu, värvid ja vaikeseaded. `regions.ts` annab piirkonna tüübid, pideva piirkonnamüra ja reljeefikernelid. `region-*` kõrgusprofiile kasutab sama kõrguspuhver, millest sõltuvad navigeerimine, nähtavus ja 3D-maastik. Mesa- ja luitekuju ei ole eraldi dekoratiivne mäemudel.

Valik muudab maapinna atlast, paljandite värve, metsi, katuseid/fassaade, taevast/udu, vett, kaardi eelvaadet ja minikaarti. Parandatud on ka puude kaugmudelite puudunud vertex-colour atribuut, mis muutis jagatud materjaliga kaugmetsa mustaks. Üldist maastikuatlase mõõtu ega metsa instantsimise eelarvet ei suurendatud.

## Seemned ja võrgumäng

Uued kaardid on `procedural-v17-<iseloom>-<suurus>-<seeme>-o<mask>`. Maski bitid 0–4 säilitavad senised maastikulülitid, bitid 5–6 määravad piirkonna. V17 lubab 0–127; v16 ja varasemate maskipiirid jäävad endiseks. Kliendi worker, serveri worker, ID taastamine ja lobby kasutavad sama lepingut. Lobby kaardi uuesti genereerimine säilitab piirkonna ja maastikuvalikud. Vanad kaardid jäävad oma generaatoriversiooni kasutama.

Piirkonnakaardi valideerimine kasutab ette valmistatud kõrguspuhvrit nagu tegelik mängumaailm. Kontrollitakse baaside ja kõigi üheksa tootmisala maapealset ühendust ning lennuraja kuiva ja hooneteta ruumi. Uue piirkonna proovimiseks alusta uut lahingut. Rakendamiseks ehita uuesti nii mängu kui multiplayeri image.

## Kontroll

- TypeScript ja tootmisbuild läbivad.
- 24 sihitud kontrolli: neli piirkonda kõigil kuuel suurusel, täpne ID taastamine, tegelikud läbipääsud/lennurajad 2 ja 6 km kaartidel, mesa-/luitekõrgused, lülitid, v16 regressioon, minikaart ning puu-/dekoratsioonigeomeetria.
- Serveri päris HTTP/kahe mängija lobby kontroll: piirkonna valik jõuab workerisse ja säilib uue kaardi loomisel. Serveri maskide valideerimine ja ajaloolised ID-d.
- Chromium/WebGL2 tarkvararenderduses vaadatud kõigi nelja piirkonna üld- ja lähivaated ning menüü piirkonnavahetus. Päris riistvara GPU FPS ja pikema matši tasakaal ei ole selle kontrolliga mõõdetud.
- Projekti täielik testikomplekt ei ole roheline: 559 läbib, 21 ebaõnnestub. Ebaõnnestunud testid on eraldi kontrollitud muutmata lähteversiooniga; sama probleemide ring puudutab vanemat tootmist, logistikat, lennundust, AI-d ja õpetust. Ka väljalaskepaketi test eeldab 66 mudelit, kuigi lähteversiooni pakkija säilitab 102. Neid mängusüsteeme selles kaardimuudatuses ümber ei kirjutatud.

Järgmine sisuline etapp on mitme piirkonnale omase planeerimisskeleti lisamine ja mängitud matšide põhjal lähenemisaegade, katte ning varustusmarsruutide võrdlemine. Need ei ole v17 esimese versiooni valmisoleku väited.
