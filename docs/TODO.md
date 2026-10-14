# Aktiivne viimistlusjärjekord — 10.10.2026

## Näidisalgus, loomulik maastik ja heli · 15.10.2026

- [x] Valmis alguses lennuväli ja kaks täisvarustuses lennukit mõlemale poolele; standard-/mitmeotstarbeline koorem ja ühendatud ladu.
- [x] Platvormipõhised relvakaugused, sh kopterikahuri 850 m piir.
- [x] V10 väiksemad parcelid, ebakorrapärased metsaservad, täiendavad kõrgendikud ja kõrgusdetail; lennuraja hooldusala.
- [x] Tihedam piiratud eelarvega canopy/põõsad, madalamad hekid ja odavam kaugvõra.
- [x] Kauguse/stereoga kihilised heliefektid ning eraldi muusikasiinil originaalne taustakompositsioon. Vt NATURAL-LANDSCAPE-AUDIO-RELEASE.md.
- [ ] V10 maastiku ja heli brauseris vaatlus/kuulamine ning F8 FPS-võrdlus.


## Viie testitõrke parandused · 14.10.2026

- [x] Ehituse/õhuoperatsioonide füüsilise kestuse, fraktsiooni täpsuse ja kütusereservi regressioonide parandamine.
- [x] Vaba sirge teekonna optimeering, pargitud kehade otsingupiiride eelarvutus ja navigeerimise/sim eelarvete eraldi mõõtmine. Vt SIMULATION-REGRESSION-FIXES.md.

## Protseduurkaart ja põhiklassid · 14.10.2026

- [x] Ainult protseduurkaardid mängumenüüs ja online ruumide serverivalideerimises; kampaania/fikseeritud kaartide valiku eemaldamine.
- [x] 15 põhiklassi, 16 komponenti ja teeninduskohas ajaga/kuluga vahetamine; baas ja kaardiväline varustus säilivad.
- [x] Tegelik trajektoori tabamus, saabumissuunast soomus, 9,81 m/s² gravitatsioon, HEAT-kaitse ja laost täidetav APS.
- [x] Varustuse UI/mudelilisad, salvestus/hash ja sihitud sim/render kontrollid. Vt MODULAR-PROCEDURAL-RELEASE.md.
- [ ] Uue reeglistiku brauseris lahing, varustuse kasutatavus, tasakaal ja F8 FPS-võrdlus.
- [x] 4–6 km kaardi navigatsiooni/LOS eelarve ning ulatuste, kiirenduse/pidurduse ja lennukoridoride häälestamine. V9 meetrites profiilid, kohalik pidurdus, rajaga joondatud lennuring ja hõredad ruumipäringud; vt METRIC-BATTLE-RELEASE.md.
- [ ] V9 lahingu brauseris tasakaal, kitsaste linnavahede kasutatavus ja F8 FPS/GPU võrdlus.


Põhiplaan: [DEVELOPMENT-PLAN.md](DEVELOPMENT-PLAN.md). Allolev järjekord on järgmise arenduse alus; hilisemad vanad etapid ja märkeruudud jäävad ajalooliseks loendiks. Pakett loetakse tehtuks põhiplaani lõpetamistingimuste järgi, mitte funktsiooni nime olemasolu järgi.

- [x] Kasutatava alpha ulatuse, viie viimistluspaketi ja alpha/beta lõpetamiskriteeriumide uuendamine (08.10.2026).
- [ ] V1 brauserivärav: PR #15 mõõdikutega sama Roheoru 60–90 s stseeni võrdlus ja suurima mõõdetud kitsaskoha parandus; päris FPS/visuaal endiselt kinnitamata. Avalik URL on olemas; 13.10 kontrollbrauseri GPU/WebGL on välja lülitatud.
- [ ] V2: grupijuhtimise, maa-/õhuliikumise ja lahingu tunnetuse lõpetamine.
- [x] V3: majanduse, füüsilise logistika ja AI taastumistsükli funktsionaalne lõpetamine — 15 min Roheoru simulatsioon läbis pealao/veokite kaotuse, tootmise hilise jätkumise ja eesmärkide vallutamise. Mängija vaates raskus/tasakaal ja lõpetatav tervikmatš jäävad V5 alpha väravasse.
- [ ] V4: selge HUD ja Roheoru ühtne visuaalne viimistlus.
- [ ] V5: õpetuse/save-load läbipääs ning DEVELOPMENT-PLAN.md alpha värav; seejärel A6 lõpetatuks.

## Teostatud alused ja seniste pakettide seis

- [x] Kasutaja 2048 m kaardi jõudlusraporti peamise kitsaskoha parandus (14.10): 24 korduvat 100–270 ms HUD-pausi tulenesid minikaardi 512×512 sõjaudu raku kaupa Canvas-joonistamisest. MinimapFog kasutab vision-revision/team vahemälu, korduvkasutatavaid puhvreid ning üht putImageData/drawImage paari; udu kolm olekut ja sillakahjustuste kaardikihi invalidatsioon säilivad. CPU Canvas-kontrolli mediaan 504.53 → 1.05 ms. Kõik 56 UI/render/input/core testi ja build/typecheck läbivad; täissuite läbib 254 testi ning viis varasemat main-i tõrget korduvad. F8 v3 eristab silte/minikaarti/HUD-i ja säilitab põhjustavate aeglaste CPU callback'ide worstWorkFrames loendi. Kasutaja mõõdetud algseis ~26.4 FPS; uuendatud brauseri FPS vajab sama marsruudi uut raportit, V1 lõplik värav jääb avatuks.

- [x] Näidispildist lähtuvad välibaasid, relvasuits ja kaardiväline varustus (14.10): madalad kamuflaažpaviljonid, avatud laod/töökojad, juhtimistornid, mahutid ja lisad; jagatud materjalidega liidetud geomeetria. Rakettide ajutine aur ning mürskude hajuv suits kasutavad eraldi piiratud osakesepuhvreid ja teepikkuse proovistamist. Tihedamad metsad ning kuni 6500 lähi-LOD põõsast; rajatisetüübi järgi ressursiala tekstuurid. Passiivraha eemaldatud: lao kopteriimport algab kaardivälisest tagalast, lennuvälja lähedane ladu avab suure kaubalennuki; uuendused suurendavad koormat/sagedust/lennuparki. Füüsiline osatarne, tühi/täis ladu, kaotus, vastuvõtja vahetamine, kaardiservast lahkumine ja save/hash on testitud. 25 sihitud testi ning build/typecheck läbivad. 15 min AI taastumine läbib ka hilise tankikaotuse järel; täissuite viis varasemat main-i tõrget jäävad alles. Uus majandus nõuab uut lahingut; vanad snapshotid säilivad eraldi. GPU vaade/FPS ja uue majanduse mängutunnetus vajavad päris brauserikontrolli. Juhis ja CPU mudelieelvaade: REAL-WAR-FIELD-BASES.md.

- [x] Asulate linnaosad ja detailivööndid v8 (14.10): keskuse kortermajad/poed, äärelinna eramud/ridaelamud ja maapiirkonna hooned; kvartaliga sobivad fassaadi-/katusepaletid, raekoja/külakeskuse torn ning linnapargid/külasalud. Lisatud crescent/courtyard kujud ning ühiste sõlmedega kergelt ebakorrapärane tänavaruudustik. Korterite rõdud/ridaelamu uksed jäävad olemasolevasse ühe draw'ga atlasegeomeetriasse. TerrainCulling jätab sama kaamera maailmamaatriksi ja projektsiooni juures kogu LOD/nähtavuse kordusotsingu ära; liikumine/zoom/kaameravahetus uuendab nähtavuse kohe. Seeditud geomeetria, keskuse ja äärealade hoonetüübid, krundikokkupõrked, väikse/suure kaardi nav ning paigalseisu cache'i invalideerimine on kontrollitud. 60 v3–v7 kaardi taastamist võrreldud täpselt eelmise main-iga; 36 v8 seemne/tüübi kombinatsiooni ja maapinnaatlas kontrollitud. Build/typecheck läbivad; täissuite 238 testi läbis ja viis varasemat main-i tõrget kordusid. 22 sihitud kaardi/renderduse kontrolli läbivad. GPU FPS ja tegeliku mängupildi kvaliteet jäävad kasutaja F8 raporti/3D vaate kontrolliks.


- [x] Asulavariandid v7 ja kaamera jõnksude diagnostika (14.10): eri suurusega linnad/külad, oldtown/grid/ribbon/fork tänavakujud; eramud, ridaelamud, korterelamud, poed, laod ja kõrvalhooned. Täpne pööratud krundi SAT-kontroll võimaldab väiksemaid naabrivahesid. Neli eraldiseisvat halli/lao/kontoriga tööstuskobarat koos juurdepääsuga; suure keskuse kõrvalkülad nihutatud, et hilisem tänav ei lõikaks maju. V2–v6 taastamisteed säilivad. Majade mõlemad LOD-id kasutavad üht jagatud vertex-color atlase materjali/joonistuskäsku; kõik staatilised LOD geomeetriapuhvrid laaditakse 1×1 offscreen renderiga enne briefingut. F8 JSON v2 lisab kuni 3600 ajajärjestatud kaadrit, 30 halvimat kaadrit, kaamera-/üksuste-/maastiku-/efektietapid, riistvara/kaardikonteksti, Long Task andmed ning asünkroonse GPU timer-query (toetuse korral). Juhis: PERFORMANCE-CAPTURE.md. Nav-/krundigeomeetria, vormivariandid, üks-jõudlusdraw, GPU päringu valmisolek, rapordi ringpuhver ja warmup'i oleku taastamine on testitud. Build/typecheck läbivad; täissuite 233 testi läbis ja viis varasemat main-i tõrget kordusid. 48 v3–v6 taastamist on eelmise versiooniga täpselt võrdsed, 48 v7 seemne/tüübi kombinatsiooni läbivad. V1 FPS/GPU visuaal jääb kasutaja raporti taha.


- [x] Näidispildist lähtuv piirkonnageneraator v6 (14.10): erikujulised kahe tänavaringi ja ühendustänavatega asulad, tänavasuunalised krundid/õued ning suuremad põhikeskused; seotud kompaktsete tippudega mäevööndid ja madalad teekoridorid. Põllupolügoonid lõigatakse tegelike maanteede ja vee järgi, kitsad killud eemaldatakse, üks hekk algse põllu kohta väldib järveäärseid hekilehvikuid. Kõrgusväli juhib metsastumist ja kivisema nõlva pinnatooni; põlluread järgivad lähima tee suunda eraldi cropRotation-metaandmega. Kohalik menüü, online juhukaart ja ranked alustavad v6-ga; v2–v5 ID-d säilivad. Kontrollitud 30 seemne/tüübi kombinatsiooni, suuruseäärmuste ja ranniku baasi-/ressursinav, päris veokitarne ning 36 v3–v5 kaardi täpne võrdsus eelmise main-geomeetriaga. Build/typecheck ja 20 sihitud testi läbivad. Täissuite'i viis varasemat tõrget korduvad muutmata main-is. Päris maapinnaatlas on Canvas2D-ga visuaalselt kontrollitud; GPU/3D-brauserivaade ei ole kinnitatud (Chromium käivitustõrge, brauseripaketi allalaadimine katkine). V1/V4/alpha väravad jäävad avatuks.


- [x] Jätkuva suure kaardi jõnksumise ja laia reljeefi pakett (14.10): üks kogu kaardi maapinnavõrk asendatud 256 m frustum-cullitavate tükkidega (2048 m puhul 64); sama maailma-UV ja ühine gradientnormaal väldib pinnaservade teede/valguse õmblusi. TerrainCulling peidab väljaspool vaadet terved metsa/maja LOD rootid enne renderer'i detailide läbimist, taastades neid sama kaamera järgi. Kaamera kiiruse vastuskõver integreeritakse analüütiliselt, et pikk kaader ei põhjustaks lõppkiirusega üleliikumist. V5 kõrgustik kasutab kompaktse jalami ja pööratud harjaga mägesid; paigutus väldib baasid/asulaid/ressursikohti, nõlvatoonid tugevdavad reljeefi. V2/v3/v4 ID-de kõrgusväljad säilivad. F8 lisab nähtavate/kõigi maastikugruppide arvu. Build + 6 sihitud kontrolli, sh maapinna UV/normaalõmblused ja alla poole pinnatükkide nähtavus geomeetrilises näidisvaates, LOD grupi taastumine, v4 kaardi taastumine, päris tarne ning suurima kaardi nav. Brauseris FPS/jõnksude kadumine pole kinnitatud.


- [x] Suure kaardi kaadrikulu ja piirkonnatüüpide eristamine (14.10): kaugvaate tsiviilmaja üks ühine atlase/vertex-color materjal ja üks draw, oma garrison root/kahjustus säilib. Maastikutekstuuride GPU ettevalmistus ja compileAsync enne briefingut vähendab esmakordse kaamerapöörde shader/upload tööd. NavGrid jälgib dünaamiliste hoonete lahtriloendit ega skaneeri iga hooneuuendusega kogu miljonit lahtrit; staatilise geomeetria rebuild eemaldab vana footprinti enne alusmaski taastamist. V4 andmepõhised piirkonnaprofiilid muudavad kõrgendike arvu/kõrgust/laiust, keskuse kvartaleid, kruntide hõivet, majakõrgusi ja residential/rowhouse/industrial/rural mudeleid; v2/v3 taastatakse vanade ID-dega. Ressursiteed ei lõika v4-s läbi maju/vett; kontroll kasutab olemasolevat spatial indexit, mitte kõigi feature'ite korduvat skanni. Build ja 11 sihitud kontrolli läbisid (sh päris tarne, suurima kaardi nav, tüübi reljeef/siluett, v3 taastamine, maja LOD ja hoonemask). Tegelik kaameraliikumise GPU/FPS mõju pole kinnitatud.


- [x] Piirkonnageneraator v3 (14.10): vabalahingu ja online valikus ainult kaks autoritud näidiskaarti (Roheorg/Murdlaine), muud valikud seemnepõhised. Suurused 1536/1792/2048 m, kaheksa asulat, talukobarad ja metsajärved, üheksa päriselt hõivatavat/aktiveeritavat ressursirajatist, tagala/rinde tööstus ja piirkondade ühendusteed. Parandatud seni varjatud 1600 m kõrgus/nav clamp, muidu jäid 2048 m kaardi välised rajatised mängualast välja. V3 identiteet sisaldab suurust; v2 taastab vana 1280 m geomeetria. Puupaigutuskatsete ühine 60000 eelarve ning maakasutusparcelite arv püsib pindala kasvades ligikaudu sama. Kampaania stsenaariumid säilivad eraldi. Build + 15 sihitud kontrolli läbivad, sh v3 päris veokitarne ja 2048 m baaside/üheksa ressursi/algüksuste nav. GPU FPS/mänguvaate kvaliteet jääb kontrollimata.


- [x] Uus mänguga ühendatud kaardigeneraator (13.10): v2 1280 m seemnekaart, jõest/teevõrgust lähtuvad neli tihedat kvartaliasulat, kolm sillaületust, ebakorrapärane polügoonjärv ja Voronoi maakasutusalad. Seeme varieerib ka baase/asulate asukohti/tänavasuundi/sildu, mitte ainult dekoratsiooni. Näidiskaardil umbes 190 garnisonimaja; polügoonid juhivad päris cover/nav/kõrgusvälja/atlas/minikaarti. Menüü esimene valik on uus Järvemaa, olemas kaardiseeme/piirkond/Uus kaart ja tegelik andmeeelvaade; valmis start kasutab uue kaardi läbitavaid asukohti. Viis füüsilist ressursirajatist koos vabade õuede/juurdepääsuga; testis insener aktiveeris rajatise ja veok tõi päris koorma. Build + 13 sihitud kontrolli, sh deterministlik save-jätk. Vana Roheoru JSON-i ei uuendatud. GPU pilt/FPS ja referentsipiltide mudelite tase pole kinnitatud; alpha värav jääb avatuks.

- [x] Võrdluspiltide järgi maastiku renderduse ümbertöö (13.10): ühine puupaigutus 3D ja küpsetatud maastikuvarjude jaoks, tekstuuriga ebakorrapärased võrad ja 168/64/24 kolmnurgaga kolm LOD-i. Keskmise/madala kvaliteedi päikese algsuund parandatud; taimedele lisavarjupassi ei lisatud. Layout16 põllupinnad/toonid, 14 lisapõldu, põlluservade hekid/salud ja kaks lauget kõrgendikku; tsiviilhoonete kelpkatused mõlemas LOD-is. Kaamerat järgiv gradienttaevas ja üks staatiline udune kaugmaastikuring, rannikul jätkub meri. Natiivse Canvas2D-ga üle vaadatud päris 2048² ground-atlas (7875 puupaigutust/310 võrarühma), mitte mängu GPU-render. Build + 24 sihitud kontrolli läbivad; fotode taseme ja FPS-i kinnitamine jääb GPU-ga mänguvaate väravasse. Simulatsiooni/Three.js-i ei asendatud, V4/alpha pole märgitud valmis.

- [x] Roheoru kaardikvaliteedi tervik (13.10): kattuvate jõeristkülikute asemel ühine footprint-põhine veepind, kaldatooni gradient; maapinnaga ühised tee-/õue-/märgistuse kihid eemaldavad temperate-kaardilt kattuvad eraldi pinnaribad. Layout15 elamute mõõdud/kõrgused/frontid, neli juurdepääsutänavat ja 42 aeda; kuue talu ühendusrada taastatud. Viis silda on 52×10 m, talade ja jõepõhjale toetuvate sammastega. Metsaservade kõrvalharud ja neli kaldasalu; puude lähinaabrite piir hoiab kattuvates alades kuhjumise ära. Autoriskript korduskäivitatav samade andmetega. Build ning 19 sihitud geomeetria/maastiku/esituse/õpetuse kontrolli läbivad. GPU-ga tegelikku visuaali/FPS-i pole kinnitatud, V4/alpha värav jääb avatuks.

- [x] Liikumise, kopterilahingu, metsa ja ressursipaigutuse ühendatud viimistlus (13.10): sõidukite piiratud külgkiirendus/tagurdamise pidurdus, kopteri salvestatav vektorhoog ja nina/translatsiooni eraldamine, LOS-i külgmine positsiooniotsing, tiivarakkide sihtimine ja õiglasem kopterikahuri õhukahjustus. Paigalseisva tankikahuri täpsus ja tegeliku liikumise eelsihtimine; nähtavamad suunatud mürsud/raketimootor. Väiksemad tihedamad instantsitud puud; Roheoru layout14 ressursiladude kaugus ~174 m, ühendusteed ja õued viidud kaasa. Veokid otsivad hõivatud kogumiskoha kõrval vaba ligipääsu ja taastavad edasiliikumiseta ummikus marsruudi. Build + 47 sihitud kontrolli (sh tasuline õpetuse 16/18 eesmärgi läbipääs, füüsilised tarned ja save/replay). Brauseri FPS, visuaalne tunnetus ja tervikmatš endiselt kinnitamata; V2/V4/alpha pole märgitud valmis.

- [x] Avaliku brauseri alpha audit ja parandused (13.10): https://thormen.com/rts/ menüü/seaded/fraktsioon/deck avanesid; õpetus takerdus kontrollbrauseri GL_RENDERER=Disabled piirangusse. Brauseris tuvastati vigane 192/120 AP ja 22/14 Maa vaikimisi deck ning Venemaa menüüvaliku järel USA decki avamine. Nüüd kõigi fraktsioonide legaalne ühendrelvade algdeck, õige valitud fraktsioon, sulgemisel värske kokkuvõte, käivituse valideerimine ja vigaste salvestusandmete taastumine; kasutaja üle-eelarveline deck jääb muutmiseks alles. Tehase väljund väldib kohalikke suletud nav-taskuid, HUD kasutab sama väljumiskontrolli. Õpetuse lõpp valib soomuse+luure ning sihtmarker kasutab üksnes nähtavat rajatist või teadaolevat baasikohta. Menüü tegevusnupud/veateade loetavamad; puuduva WebGL-i puhul katkeb käivitus enne mudelite/simi laadimist selge eestikeelse teatega. Build + 18 sihitud kontrolli, sh 16/18 päris õpetuseesmärki ja nelja toodetud tanki tee baasiõuest, tootmine/õhubaas ning replay. Täisvõit/kaotus, brauseri lahingutunnetus ja FPS ei ole kinnitatud; uut koodi avalikku konteinerisse ei deployitud.

- [x] Valge lehe /src/main.ts ja /@vite/client 404 parandus: dev-server tuvastab alamtee automaatselt ning teenindab iga prefiksi mooduligraafi eraldi, säilitades samaaegselt juurtee. Säilitatud prefiks ja X-Forwarded-Prefix on toetatud; käsitsi BASE_PATH jääb valikuliseks. Kontrollitud HTTP mooduleid/assets/Arsenali/API-t ja WS handshake'i juurteel ning kahes alamtees; build läbis. Välist deploy'd ei käivitatud.

- [x] Reverse proxy hostitõrge: Vite dev/preview lubavad kõiki Host-päiseid; dev alamtee on `ROGUE_FRONT_BASE_PATH` kaudu seadistatav ning API/WS prefiks eemaldatakse backendisse saatmisel. Compose edastab muutuja, mudelid/ikoonid kasutavad olemasolevat BASE_URL-i. Kontroll: build ja tegelikud kohalikud HTTP päringud erinevate hostidega ning `/rts/` prefiksiga. Avalikku Hestia/Overseeri deploy'd ei muudetud.

- [x] Alpha kandidaadi ühendus: õpetuse kõigi AI planeerimiskihtide ettevalmistus, 16 päris eesmärgi läbipääs, pooleli ehituse jätkamine/limiit ja käsutõrke tagasiside; kaamera A/E konflikt eemaldatud; peamenüü seaded, keskmine esmakvaliteet ja käivitustõrke teade. Build + 46 sihitud kontrolli. Täielik õpetus, brauseri FPS/juhtimistunnetus ja tervikmatš jäävad alpha väravasse; vaja töötavat mängu URL-i.

- [x] V5 lõpuekraani ja taasalustuse ühendus: salvestusest tulnud kordusmäng eemaldab resume-võtme ega laadi sama checkpointi uuesti; säilitab lahingu tegeliku fraktsiooni, seadistuse ja Worldi decki. Kampaaniavõidu lõpuekraan võimaldab nii järgmist operatsiooni kui kordusmängu. Värske tulemus ja laaditud lõpetatud salvestus kasutavad sama edenemis-/järgmise missiooni loogikat; laadimine ei kirjuta tühja replayga varasemat üle. Preemia on ühekordne ning lukus operatsiooni otseaadress ei ava kampaaniajärjekorda. Vigane edenemisfail normaliseeritakse; salvestustõrge jätab tulemuse ja tegevused alles. Lõpetatud võrgumängu ei käivitata uuesti vana ruumiaadressiga. Jätkamisel algab ka muusika; Paus ei muuda lõpetatud matši olekut. Build + 11 sihitud save/navigation/campaign kontrolli; brauseri lõpuekraani ja kogu alpha läbipääsu värav jääb avatuks.


- [x] V5 peamenüüst salvestatud lahingu jätkamine: kaheksa viimase salvestuse väike indeks näitab kaarti/operatsiooni, fraktsiooni, režiimi, aega ja salvestuskuupäeva; suur simulatsioonisnapshot jääb ühte eksemplari. Jätkamine käivitab sobiva kaardi/režiimi ja taastab olemasoleva loadWorld kaudu tegeliku seisu pausil, koos salvestatud decki ja AI profiiliga. Varasema teise lahingu decki ei rakendata. Puuduv/vigane salvestus annab teate; indeksi kirjutamise tõrge ei kaota juba kirjutatud snapshoti. Vanad salvestused on jätkuvalt laetavad sobiva lahingu menüüst ja ilmuvad loendisse uuesti salvestamisel. Build + 6 sihitud indeksi/save-load kontrolli, sealhulgas laadimisjärgse sim-jätku hash-võrdlus. Brauseri jätkamistee, inimvaates õpetus ja alpha tervikvärav jäävad kinnitamata.


- [x] V5 õpetuse juhendamise ühendus: õige ehitusharu koos inseneriga, tegeliku tootja valik ning ühe klõpsuga ehituse/tootmise avamine ja vajaliku nupu märgistus. Juhend näitab päris tarne-/tootmise seisu, ootab pooleliolevat ehitust ning aitab puuduva inseneri/tootja/üksuse taastada. APC pardalt väljumine juhendab paremklõpsu; maja soovitus ei kasuta peidetud kahjustusi/vaenlase hõivet. Juhend paikneb avatud tootmispaneeli all. Menüü eristab Roheoru Conquesti ja õpetust katsetusjärgus valikutest. Build + 5 sihitud õpetuse/juhendi kontrolli; täielik inimvaates õpetus/matš ja alpha värav endiselt avatud.

- [x] V4 kaugvaate juhtimise ja märkide ühendus: Picker, klõpsu-/kastivalik ja Overlay kasutavad sama nähtava 3D-mudeli renderdatud positsiooni, mitte ticki toorkoordinaate. Nimesildid mäletavad suhtelist rida, korduvkasutavad hõiveruudustikku ning jätavad ruumi hoiatustele ja HUD-ile; kitsas klassiikoon on jätkuvalt klikitav. Viimati nähtud kontakt on katkendliku raamiga, kontaktivanusega ja ilma klõpsusihtmärgi või peidetud live-andmeteta. Laadimine/algoleku vahetus lähtestab markerite ja inteli esitusvahemälu. Build + 8 sihitud sisendi/paigutuse kontrolli läbisid; brauseri FPS ja juhtimise visuaalne tunnetus jäävad kinnitamata.

- [x] V4 HUD-i ja kaardi esimene tervik: valiku elud/moon/kütus ning relvad ja laskmise põhjused enne lisainfot; maastik/liikumine/varustus avatavad, soomus/optika lühikaardil. Mängumenüü koondab salvestuse/laadimise/seaded; ehituse vahekaart mahutab logistika päriskontrollid. Roheoru majade sama fassaad lähivaates/kaug-LOD-is, aknad atlasel; õuesillutis lõigatakse teedest/veest eemale. Sildade maailma-UV-d vastavad asfaltteele, avatud piirded ja piirkondlikult liidetud sillageomeetria. Build ja 5 sihitud geomeetria/ulatuse/fog kontrolli; brauseri loetavus/LOD-üleminek ja FPS on veel kinnitamata, seega V4 lõppvärav jääb avatuks.

- [x] V3 lõpetav tarne- ja taastumisühendus: AI taastab kohaliku tootmislao ka säilinud edasilao korral, käivitab armeega hõivatud tööstuse ega lähtesta inseneri sama marsruuti. Uued AI hooned jätavad läbipääsuruumi. Kogumispargi piir kehtib lao, mitte iga ressursipunkti kohta; varupuuduses pealadu eelistatakse ja tühjad automaatkogujad saab ümber siduda (koorem/käsitsi marsruut säilib). Laokonvoi toob ühendatud edasilao päris ülejääki tagasi pealattu; suund säilib olemasolevas save/replay faasis ning HUD näitab õiget allikat/sihtladu. Tavaline tankimine jätab 40 kütuseühikut tootmiseks; Kütuseprioriteet vabastab reservi ning AI valib tegelikult teenindava lao. Veokite/inseneride teeleid kasutab pargitud maaüksustest möödumise reeglit. 15 min Roheoru simulatsioon: pealadu ja kõik kogumisveokid kaotatud 4. minutil, seejärel 7039 ühikut tarnet, 25 uut lahinguüksust, 4 hõivatud ressursiala, tootmine jätkus ka 13.–15. minutil. Build ning sihitud logistika/AI/replay kontrollid; brauseri FPS ja mängija raskushinnang pole sellest tõendatud.

- [x] V3 AI eesmärgi- ja käsujätku viimistlus: Conquest jätab hõivatud ressursid ründesihtide hulgast välja; operatiivne ja doktriini-AI jagavad režiimi eesmärke, Breakthrough suundub tagalasektorisse. Hõivepositsioonid jäävad ressursiala sisse. Korduvad/pending käsud ei lähtesta marsi ega nähtava kontakti laskepositsiooni; baasi kaitse saab rünnaku katkestada. Ootel käsud väldivad samal tickil topeltjuhtimist, uued/taastunud üksused tugevdavad rinnet esimese nelja ID korduskäsutamise asemel. Reserv eelistab baasi lähedal valmis üksusi; operatiivne taastumispaus peatab ka ründelaine. Sektorite täisarvutus toimub otsustusintervallil, võrgumängus AI seda ei käivita. Build + 12 sihitud AI/replay kontrolli läbisid. Päris 15–30 min Roheoru matši tempo, raskus ja brauserivärav jäävad avatuks.

- [x] V3 konvoi lähetus ja AI FOB: ühe sageduspiiratud lähetusläbimise sees proovib katkise tee järel järgmisi marsruute; sobiva pealaovaru ja sihtlao puudujäägiga edasitarne eelistub kogumispargi laiendamisele. Hävitatud konvoi asendatakse lähetusintervalli järel ja koorem võetakse päriselt laost. AI arendab ühendatud edasilao tasuliselt FOB-iks, pikendades command-võrku; HUD/AI/sim jagavad FOB hinda. Build + 16 sihitud kontrolli, sh kuue simulatsiooniminuti baasi–majanduse–tootmise ahel ilma lisarahata. 15–30 min Roheoru matši tempo ja brauserivärav jäävad avatuks.

- [x] V3 tarne- ja taastumisalus: FOB-veoki koorem järgib lao tegelikke puudujääke/prioriteeti ja kasutab vaba kandevõimet; tootmise laovalik piirdub kohalike toimivate ladudega; AI jagab kõigi ootel ostude eelarvet, piirab tootmisjärjekorda ja taastab inseneride reservi igas faasis. Ressursirajatise käivitanud insener vabastatakse, vajadusel käivitab tööstuse ka viimane ehitaja. Edasilaod rajatakse olemasoleva tarne- ja juhtimisvõrgu ulatusse. Build + 12 sihitud logistika/AI/replay kontrolli. 15–30 min tervikmatši tasakaal ja brauserivärav jäävad avatuks.

- [x] V2 grupi saabumise ja läbipääsu parandus: tehnikale läbipääsu lubav lõppformatsioon (sama paremlohistuse eelvaade), kohapeal pidurdamine katkisel marsruudil ja automaatne uus katse, lõppsuund alles pärast saabumist/pidurdamist, kohene lähivahepunkti teeuuendus, nullpikkuse sihi kaitse, pööramise/jam-taimeri eristus; parkimiskokkupõrke ühine raadiustegur ning vaba täpse sihtkoha jaoks sobiv lõpurakk; kolonnis sortimiseta elav eelkäijaotsing, sama sõidurea ootevahe ning seisma jäänud liikujatest möödumine. Build + 24 sihitud kontrolli, sh 12 tanki sillaületus ja paigutumine. Päris brauseri juhtimistunnetus ja kogu V2 marsruudivärav jäävad avatuks.

- [x] V1 käitus- ja renderdusalus: F8 mõõtevaade/JSON-väljavõte, tegeliku kaadriajaga FPS, säiliv aktiivne sim-ajavõlg, eraldi taustapaus, staatilise maastiku maatriksite kordustöö eemaldamine, madal kvaliteet 0.75 renderdusresolutsiooniga; ekraaniringide asemel tegelikust Vision-ruudustikust maailma koordinaatides maastikuudu ja sujuv üleminek. Build + 15 sihitud kontrolli. Cloud-brauser ei pääsenud kohaliku arendusserveri juurde (connection refused); päris FPS/visuaali värav jääb avatuks.

- [x] Koodipõhine uus kvaliteediülevaatus pärast PR #13 ja DEVELOPMENT-PLAN.md uuendamine: tehtud aluste eristus, kuus lõpetatavat tervikut, mõõdetav sujuvuse siht ning Real Wari majanduse säilitamine. See PR muudab plaani, mitte mängu käitumist.

- [x] Panningu ja metsakoormuse parandus: sujuv kaamera kiirendus/pidurdus/pööre, eksponentsiaalne zoom ja maastikukõrgus; valgus ja varjukaart liiguvad koos alles katvuse piiril või geomeetriamuutusel. Läbipaistvad ristvõrad asendatud ühe instantsitud ümara ruumilise võraga, kaug-LOD 20 kolmnurka; metsavarjude alpha-passid eemaldatud, põlengu/burnt ühendus säilitatud. Build + 12 lühikest render/input kontrolli; päris brauseri FPS/visuaal endiselt mõõtmata.

- [x] Kaameraga sünkroonne nähtavuskiht: 100 ms ekraaniudu oote eemaldamine, poole resolutsiooniga otsejoonistus ja üksuste interpolatsioon, pausi ajal kaamera muutuse tuvastus. Overlay pikslitiheduse piir 1.25 ja arvulised taaskasutatavad sildilahtrid; käsuringid asendatud lühikeste fikseeritud noolte/sihikuga, dubleeriv 3D-käsuping eemaldatud, kuni 3 tähist. Build + 11 lühikest render/input/replay kontrolli; päris brauseri FPS ja visuaal ootel.

- [x] Hiirejuhtimise/käsupildi parandus: vasakklõps valib ja tühistab vana sihtrežiimi (ehitus jääb eraldi), paremklõps annab käsu, paremlohistus näitab rühma asetust/suunda ja annab käsu vabastamisel. Päris suunatud sihtkohad, nav-kohandus, saabumise pööramine ja queued/save/hash; värvilised ajutised käsuringid, tavaliste marsruudi-/ründe-/kohaliku varustusjoonte eemaldamine. Build + 20 lühikest kontrolli; brauseri hiiretunnetus ja pilt ootel.

- [x] Visuaalse loetavuse ja teatatud lahinguvigade pakett: ründekäsk peatub tegelikus relvaulatuses, sobiv ulatuv relv eelistatud lühikese DPS-relva jälitamisele; kopteri automaatkahur saab lasta koptereid koos CAP/moona/HUD-iga. Madala moona/kütuse kaugmärgid, HUD-i elementide säilitamine, salvestuse olemasolu vahemälu, 8 Hz kaameravarju ja 5 Hz garnisoniloendi värskendus. Build + 21 sihitud lahingu/õhu/replay kontrolli; brauseri FPS, visuaal ja alpha tervikläbipääs ootel.

- [x] Füüsilise logistika loetavus: simi/HUD-i ühine varudest sõltuv kohalik laovalik, valitud lao varustusala ja piiratud üksuseseosed, ressursi-/FOB-vedude eristus ning katkenud ühenduse/pealao reservi põhjused. Build + 10 lühikest kontrolli; brauseri kaardipildi/FPS ja pika logistikalise matši ülevaatus ootel.

- [x] Õhuoperatsioonide ühendusviimistlus: andmepõhine ülesandeala/rolliga sihtotsing, kadunud kontakti järel ülesande taastamine, puhas missioonivahetus, lisarelvade õhutõrjeulatus ja transpordikopteri ajutine vältimismanööver, eraldi ohust tingitud RTB/save olek. Build + 15 lühikest kontrolli; brauseri lennutunnetus/FPS ja pikk õhu-maaväe matš ootel.

- [x] Lahinguinfo ja maastiku loetavus: kompaktsed relvarollid/ulatus/moon/lasu põhjus, avatavad AP/tabamuse detailid, tegelik garnisoni/relva laskesektor, hoones kasutamatute relvade ringi peitmine ning simi katte-/liikumiskordajate HUD. Build + 13 lühikest kontrolli; brauseri visuaal/FPS ja kaardi taktikalise kompositsiooni edasine viimistlus ootel.

- [x] Portaineri ENOENT-parandus: vaikimisi dev käivitub image’i failidest, suhteline `/app` bind-mount ja sõltuvuste püsiv overlay eemaldatud; multiplayeri valmidussõltuvus ja dev HTTP healthcheck. Compose’i struktuurikontroll läbis; päris serveri rebuild/redeploy ootel.

- [x] Taktikaliste laskepositsioonide ja relvatagasiside viimistlus: püsiv peatumisulatus, eraldatud rühma laskekohad, marssimise/lahingu kolonnireegli eristus, üks ühine lasu/HUD-i valmisolekukontroll ja garnisoni/õhurelvade põhjused. Build + 17 lühikest kontrolli; brauseri visuaal, FPS ja V2 terviklik läbipääs ootel.

- [x] Tootmise/tarnete taastumise viimistlus: läbitav hõivamata maaväljumine, valmis järjekorra säilimine, veokite automaatne allikavahetus ja käsitsi valiku austamine, HUD-i tootmisaja/peatuse põhjused. Build + 12 lühikest kontrolli kolmes olemasolevas failis; brauseri pilt/FPS ja pikk matš ootel.

- [x] Üldise mängutunnetuse viimistlus: sujuvam kurvi/vahepunkti läbimine, piiratud kere kalle, kopteri ühendatud pitch, rühma- ja liikumisoleku HUD, liigiti raketijäljed/boost ning udu/mürsuotsingute koormuse vähendamine. Build + 4 sihitud kontrolli; brauseri pilt/FPS ootel. Vt COAST-MAP-PERFORMANCE.md.


- [x] Praeguse koodi ülevaatus ja viimistlusele keskenduva alpha/beta arenguplaani koostamine.
- [x] A1: ühised efektiivsed andmed, päris research/uuenduse käsud ja HUD, armor/AP/HP/remont, fraktsiooni tootmistöö ning range/maastikureeglite tarbijad. Kood + 9 sihitud kontrolli; brauseripilt/pikk matš ootel, vt A1-SHARED-RULES-RELEASE.md.
- [x] A2: kiirliikumise käsk/HUD, aja järgi tee-metsa-nõlva marsruut, kolonn ja peatuvatest üksustest möödumine, APC/IFV/kopteri istmepõhine transport ning nav-ohutu väljumine. Build ja 4 sihitud A2 kontrolli + 3 A1 regressioonikontrolli; brauseri visuaalne ülevaatus ja kahe kliendi matš ootel. Vt A2-MOVEMENT-TRANSPORT-RELEASE.md.
- [x] A3: uksele lähenemine ja ohutu väljumine, relva-/luuresektorid, AT/MANPAD positsioonid, kahjustusega vähenev kate, struktuurikahju ja varisemine, hoone HUD/renderdus ning save/hash. Kood ja 3 sihitud A3 kontrolli + 4 A2 regressioonikontrolli; brauseri visuaalne ülevaatus, FPS ja multiplayer ootel. Vt A3-GARRISON-RELEASE.md.
- [x] A4: mahupiiridega osatarne/koorma säilimine, finite FOB-i üleandmine, lao/FOB-i uuenduste mahu ühtlustamine, tankimisabi ja marsruudi saabumise parandused, logistika-HUD, tootmise taastumine ning lennuraja/teeninduse/alternatiivbaasi ühendused. 5 uut sihitud kontrolli + 3 varasemat logistika/uuenduse kontrolli; brauseripilt, FPS, pikk matš ja multiplayer ootel. Vt A4-LOGISTICS-AIR-RELEASE.md.
- [x] A5: ühine mälukoordinaatidega intel-allikas, peidetud vastase live-päringute eemaldamine, Conquesti sektorivalik/reserv, taastumise kaitse, lisarelva moona arvestus, päris lao/remondi/RTB käsud ja majanduse esmane tasakaal. 4 sihitud kontrolli + 5 A4 regressioonikontrolli; pika Roheoru matši raskus/tasakaal ning brauseri/FPS/multiplayeri läbipääs ootel. Vt A5-AI-SKIRMISH-RELEASE.md.
- [x] Jõudluse esmane parandusetapp enne A6: LOS-i ruumiline takistuste indeks, HUD-i/garnisoni korduspäringute vähendamine, staatiliste visuaalide 5 Hz uuendus, taaskasutatav fog-pintsel ning valitavad kaugvaate nimed/klassiikoonid. Build + 8 sihitud kontrolli läbisid; brauseri FPS/visuaalne ülevaatus ootel. Vt PERFORMANCE-TACTICAL-MARKERS.md.
- [x] Taktikaline tempo ja Roheoru layout 10: rahulikumad kiirused/kiirendus, väiksemad mudelid koos footprinti ja muzzle ühendusega, 1088 m kaart, 85 hoonet ja kvartalite tänavad, majade kaugvaate LOD ning peatunud tehnika kõrval kinnijäämise parandus. Build ja 8 sihitud kontrolli; brauseri visuaal/FPS/tasakaal ootel. Vt TACTICAL-SCALE-ROHEORG.md.
- [x] Võrdluspildist lähtuv Roheoru layout 11: looklev jõgi ja kaldad, viis teedega joondatud silda, päris deck/riverbed kõrgused, silla purunemise nav/render/save ühendus, jõekalda ladu ja kaugvaate märgid. Build + sihitud kaardi/garnisoni/nav kontrollid; GPU/browser ülevaatus ootel (kohalik Chromium puudub). Vt RIVER-CITY-OVERVIEW.md.
- [x] Üksuste juhtimise viimistlus: vasaku klõpsuga sihtkäsud, Shift-vahepunktid/minikaart, patrulli sihtpunkt, valiku toggle/grupid, kursori vihjed ja nav-tõrgete põhjused; A* töömälu ning octile heuristika. Jõepinna ja majade ümbruse viimistlus, vähem kattuvad nimed. Vt CONTROL-POLISH.md.
- [x] Lahingu ja üksuste käitumise viimistlus: kasutatava lisarelva auto-ulatus, avatud tulejoone eelistus, peatumine/tulekeeld, vanade ülesannete lõpetamine, patarei peatumine ja päris taandumine, nav-ohutu insener/remondivaru säilimine, HUD-i põhjused ning laiendatud replay-hash. Vt COMBAT-GAMEPLAY-POLISH.md.
- [x] Roheoru kaardi kompositsioon: kaks kompaktset küla, selgem teedevõrk, väiksemad põllud ja metsavööndid, sujuv jõgi, ühine maastikuatlas, kaugmaja fassaadid ning üks ressursihoone punkti kohta. Build + 5 maastikukontrolli läbisid; päris brauseri/GPU ülevaatus ootel. Vt MAP-COMPOSITION-ROHEORG.md.
- [x] Jõudluse ja intuitiivse HUD-i viimistlus: minikaardi staatiline taust/silla invalidatsioon, ühine varustussõlmede vaade, tootjate üks läbimine; eristatavad käsu- ja klassiikoonid, loogilised tööalad, tegelik aktiivne olek, järjekorra ja hoone arendusnuppude kättesaadavus. Build + 6 sihitud kontrolli; brauseri UI/FPS ülevaatus ootel. Vt UI-PERFORMANCE-POLISH.md.
- [x] Järgmine jõudluse viimistlus: kohalik katteindeks luures/lahingus, hõivatud ruumiliste lahtrite tühjendamine, kütusekonvoide alamhulk, renderduse ühine varustuspäring ja sortimiseta üksusesildid. Build + 5 sihitud kontrolli; 96 üksuse lühike CPU-võrdlus sama hashiga. Brauseri/GPU FPS ootel. Vt PERFORMANCE-LOCAL-QUERIES.md.
- [x] Üldauditi ühendusparandused: ranniku kaardivalik, Roheoru sammupõhine õpetus, missiooni algsed siht-ID-d, v20 save/load sobivus ja rollback, laadimise juhtimisseisund, püsiv HUD-i tagasiside ning ruumipuudusest sõltumatu lõpuaken. Sihitud kontrollid/build; päris alpha läbipääs jätkub. Vt PROJECT-QUALITY-AUDIT.md.
- [x] Ranniku layout 3 ja kaardikoormuse viimistlus: päris lahesopid, sadama-/külateed ja hooned, mere madalikud, ühine pööratud jälgede indeks ja kitsam veenavigatsiooni rasterdus. Build + 5 sihitud kontrolli; brauseri pilt/FPS ootel. Vt COAST-MAP-PERFORMANCE.md.
- [x] Kopterite sujuv peatumine ja metsa kaugvaate koormus: tegelik pidurdusliikumine, sihtpunkti saabumise parandus, 20% suurem kopterikiirus ning hüstereesiga instantsitud metsa LOD. Build + 3 sihitud lennukontrolli; brauseri visuaal/FPS ootel.
- [ ] A6: õpetus, save/load, visuaalne viimistlus ja maalahingu alpha läbipääs.
- [x] Mereväe ühendused: Murdlaine rannikumapp, veenavigatsioon, vabad tootmiskaid, moodne mitmerelvaline arsenal, raketilend ja torpeedod, füüsiline sadamateenindus, mere-AI, mudelid ja efektid. Build + sihitud sim-kontrollid; brauseri läbimängimine ootel. Vt NAVAL-WARFARE-RELEASE.md.
- [ ] B1: olemasolev merevägi, päris veenavigatsioon/sadam ja üks lõpetatud rannikumissioon.
- [ ] B2: režiimide/kampaania/multiplayeri lõpetamine ning beta läbipääs.
- [ ] C: hilisem valitav strateegiline tuumarežiim pärast kaugmaa relvade ja vastumeetmete lõpetamist.

---

## Varasem tööloend (ajalooline)

# Rogue Front — To-do (Real War: Rogue States sihtmärk)

Mäng peab tunduma nagu *Real War: Rogue States*, aga sujuvam ja loetavam.
Põhisammas: **logistika + käsupuu + tänapäeva tehnika**, mitte klassikaline “kaevanda mineraale”.

## Real War põhiloop (referents)
1. Alusta **HQ + inseneridega**
2. Ehita **generaator** (energia) → **varustusladu** (logistikahelikopterid toovad varustust)
3. Ehita **Land / Air / Sea Command** → avab tootjad (kasarmu, tehas, helipad, airbase, shipyard)
4. **Strategy Center** → avab täiustatud üksused / producer upgrade
5. **Combat Engineer** → punkrid, AA, kaitse
6. Üksustel: stance (hold / defend / attack), pre-deploy order, formatsioonid
7. Võit = vaenlase HQ hävitamine; logistika ründamine on taktika

---

## Praegune prioriteet — üks brauserikaart (Roheorg)
- [x] Üksiklahingu fookuskaart: põllud, mets, küla, kolm teed; sama kõrgusväli renderduses ja nav-is
- [x] Valmis baasi / ehitusalguse valik; tegelik tootmine ja piiratud füüsiline varustus
- [x] Kompaktne ikoonidega HUD ja 63 mängumudelite pisipilti; üksuse seisundi selgitus
- [x] Jalaväe siluett ja liikumispõhine kõnnianimatsioon; tootmishoonete katuseviimistlus
- [x] Ründeliikumise A*, pööratud takistused, nurkade läbimine, veokite teekond ja LOS-positsioon
- [x] Brauseris kontrollitud käsust liikumine, vastase tulekahju ja laskemoona vähenemine; salvestamine
- [x] Rollipõhised laskeulatused, rakettide lennu/visuaali ühendamine, nähtavad ressursirajatised ja lao tasemest sõltuvad füüsilised kopteriveod
- [ ] Pika mängu tasakaal ja suurema armee kitsaskohtade viimistlemine mängija tagasiside järgi
- [x] 640 m Roheorg ja kaugem kaamera; tekstuuritud hooned, kinemaatiline lennukõrgus ja maaüksuste kiirendus/pidurdus
- [ ] Detailsemad keskkonna- ja jalaväetekstuurid ning realistlikumad tsiviil-/baasikompleksid

## Etapp 1 — Käsupuu + ehitusloop (PRAEGU)
Eesmärk: mängija saab alati aru, *mida* saab ehitada ja *miks* midagi lukus on.

- [x] BUILDS-panel näitab ainult valitud HQ/Command haru `availableBuilds()` järgi
- [x] Lukustatud nuppudel selge põhjus (puudub generaator / command / energia / limiit)
- [x] Tree-label uueneb: „EHITUSPUU: HQ“ / „Land Command“ jne
- [x] Generaator → supply → landCommand → barracks/factory töötab usaldusväärselt (CoreLoop test + brauseri ehituskontroll)
- [x] Ehitusprogress: mudel ei muutu „roheliseks ribaks“; progress selge (tehtud)

## Etapp 2 — Majandus & logistika (RW core)
- [x] Varustusladu + automaatne supply-heli/õhusild loetav UI-s (ühendatud / katkestatud)
- [x] Energia riba + puudujäägi mõju tootmisele selgelt näha
- [x] Forward depot (edasi lükatud ladu) + kaitse vajadus (füüsiline varukonvoi, käsitsi marsruut, piiratud ammo/fuel/repair)
- [ ] Vaenlase ladude ründamine vähendab tulu (AI ka kasutab)

## Etapp 3 — Tootmine & pre-deploy
- [ ] Tootmine kaardilt (pole vaja baasi juurde kerida) — juba osaliselt
- [x] Pre-deploy order järjekorras olevatele üksustele (move/attack/patrol/hold)
- [x] Producer upgrade (Strategy Center nõue) avab täiustatud üksused
- [x] Queue cancel + 75% tagastus stabiilne

## Etapp 4 — Lahingukäsud (RW advanced orders)
- [x] Stance: Aggressive / Hold / Patrol (üksus + grupp)
- [x] „Ründa kõiki varustusladusid / generaatoreid / AA“ prioriteetkäsud
- [x] Formatsioonid (line / wedge / column) rühmale
- [x] Waypoint-rada (shift-klõps)

## Etapp 5 — Roster & rahvused
- [x] USA / Russia / China nimed
- [x] APC, IFV, MLRS, interceptor, bomber
- [x] Iga rahvuse unikaalsed bonusid (väikesed, mitte pay-to-win)
- [ ] Rohkem mere-/õhuüksusi per domain (carrier late-game jms)
- [ ] Mudelite siluettide eristamine rahvuste vahel (värv + detail)

## Etapp 6 — AI vastane (skirmish)
- [x] AI järgib sama käsupuud (gen → supply → command → army)
- [x] AI kaitseb ladusid ja generaatoreid
- [x] Raskus: easy / normal / hard käitumisprofiilid
- [x] Scout + flank + kombineeritud rünnakud (maa+õhk)

## Etapp 7 — UX / visuaal / jõudlus
- [x] LOD kastid eemaldatud
- [x] Ehituse lamedaks surumine eemaldatud
- [ ] Minimap: ladud, generaatorid, vaenlase kontaktid
- [ ] Selection tab: Land / Air / Sea filtreerimine (RW style)
- [ ] 60 FPS siht 100+ üksusega (spatial + vision throttle juba olemas)

## Etapp 8 — Kampaan / sisu
- [ ] 3+ skirmish kaarti selge logistikateega
- [ ] Õpetusmissioon: „ehita gen → supply → command → esimesed tankid“
- [x] Salvestus / laadimine stabiilne (v19 täisolek; deterministliku jätkamise test ja brauseri kontroll)

## Hiljem
- [ ] Multiplayer authoritative / lockstep (olemas skeleton)
- [ ] GLB art-pass (procedural jääb fallbackiks)

---

**Definition of done (iga märkeruut):**
- Käitumine kontrollitud mängus
- TypeScript ei murdu (kriitilised failid)
- TODO märgitakse `[x]`

## Integreerimise kontroll — 2026-10-04

Uue faasinumbri asemel parandati olemasolevat mängutsüklit. Vaata `docs/INTEGRATION-RELEASE.md` kontrollitud käitumise ja piirangute kohta.

- [x] Ilma kontota menüü → fraktsioon/deck/kaart/režiim → skirmish
- [x] Ressursipunkt → ladu → raha ja piiratud varud → tootmine → füüsiline FOB-i konvoi
- [x] Inimese üksusi ei juhi automaatselt operatiivne AI; battlegroup ei tekita tasuta üksusi
- [x] Victory-tingimused on simulatsioonis, sõltumatult renderduse sündmuste lugemisest
- [x] Üksuste baasandmed ei halvene varustuseta oleku tõttu jäädavalt
- [x] Hoonete level-up lõpetab töö, suurendab tegelikke võimeid ja lisab visuaalseid mooduleid
- [x] Õpetuse ehitamise, tarne ja esimese tanki eesmärgid kontrollivad tegelikku olekut
- [ ] Kõigi kampaaniamissioonide täielik inimese läbimäng ja tasakaalustus
- [x] Esimene 3D tehnikapass: 63 GLB-varianti / 21 rolli, fraktsioonikamo, tornid ja rootorid päris mängu renderdajas
- [ ] Järgmine visuaalne pass: jalavägi, hooned, merevägi ja täpsemad lennukivariandid
- [x] Kahe brauseri/serveri põhikontroll: start, eri fraktsioonid, käsk, reconnect ja desync-paus
- [ ] Multiplayer’i pikk lahing, tootmine/upgrade/õhuoperatsioonid päris võrgus, WAN-latentsus ja serveri taaskäivitus
- [ ] Mõõdetud 60 FPS esinduslikul GPU-l, segaarmeega ja pika lahinguga

## Roheoru neli ühendatud parandust — 2026-10-05

Rakendatud koodis; kaks sihitud simulatsioonikontrolli ja tootmisbuild. Visuaalne brauseriülevaatus ning pika lahingu tasakaal jäävad eraldi tööks. Piirangud: `TACTICAL-MAP-LOGISTICS-RELEASE.md`.

- [x] Sujuvam teekonna järgimine, legaalsed grupi sihtkohad ja ühekordne Shift-käsujärjekord
- [x] Tegelik laskeulatus, nähtava sihtmärgi LOS, suppression/kahjustused ning eristatavad relvaefektid ja sünteesitud helid
- [x] Roheoru elamud, tööstusõued, kõrvalteed, metsaservad ja ühise kõrgusvälja lauged kõrgendikud
- [x] Lao allikavalik, marsruudipunktid ja vedude peatamine päris transpordis; nähtavad koormad ja varud
- [ ] Suure grupi liiklus, kaardi tasakaal ja visuaalne tunnetus mängija tagasiside põhjal

## 3D-kvaliteet ja jõudlus — 2026-10-05

Rakendatud renderduses ning eksporditud mänguvarades. Build ja lühike GLB struktuurikontroll; piirangud `ART-PERFORMANCE-RELEASE.md`.

- [x] Tanki/soomuki pinnad ja fraktsioonivarustus; kamo, karedus, normaalikaart ja aluspinna toon
- [x] Tegelikud animeeritavad kaugusmudelid kõigile 63 tehnikavariandile
- [x] Vähem materjalipartiisid, staatilise kaardi ühendamine ja piirkondlik metsainstantsimine
- [x] Animatsiooniviited, vaateväljast väljas animatsioonide kärpimine ja staatilise varjukaardi taaskasutus
- [x] Otserenderdus ilma väljalülitatud järelprotsessi puhvriteta; renderduse/UI sageduste piiramine
- [ ] Brauseri visuaalne hinnang ja mõõdetud GPU/FPS võrdlus sama stseeni/kaameraga

## Relvad, efektid ja metsluure

- [x] Ühendatud relvakoosseisud, eraldi lisarelvade laskemoon ja laadimine; piiratud maapealne/õhubaasi varustus.
- [x] Ballistiline kaudtuli, juhitava raketi piiratud pööramine ja juhtimise katkemine; füüsiline sein/maastik ja soomusetabamus.
- [x] Relvapõhised mürsud, suitsujäljed, suudmeleegid, rikošetid ning maa-/õhuplahvatused; piiratud osakestepartiid.
- [x] Metsakate ja läbi metsa nägemispiir; jalaväeluure eraldi sensorid ja üksuse detailpaneeli relvaridad.
- [ ] Uute efektide brauseri visuaalne ülevaatus, GPU/FPS mõõtmine ja lahingute tasakaalustus päris tagasiside põhjal.

## Wargame’i põhisuund, füüsiline õhuväebaas

- [x] Rajatisest juhitav lennugrupp ja sobivad missioonid; käsitsi Baasi käsk.
- [x] Piiratud parkimiskohad, tasemest sõltuv lennugrupi maht ja täis rajatise tootmispaus.
- [x] Päris ruleerimine, ühe raja stardijärjekord, kopteri vertikaalne start, maandumine ja piiratud varustamine.
- [x] Missiooniks sobiva laskemoona lõppemine käivitab RTB; CAP eristab õhu- ja maasihtmärke.
- [x] Maaväe vahemällu salvestatud laskepositsioonid: ulatus, LOS, tee, jalaväekate ja lähenemisnurgad.
- [ ] Uue baasi/rajapildi ja lahingupositsioonide viimistlemine päris brauseripildi ning mängija tagasiside põhjal.


## Fraktsioonide relvastus ja jalaväemudelid

- [x] 30 sisulist jalaväekoosseisu: relvad, meeskonna suurus, HP, piiratud laskemoon ja tegelikud tankitõrje/õhutõrje erinevused.
- [x] Ühine fraktsioonimääratlus spawn'is, tootmishinnas, materjalikulus ja tagasimakses.
- [x] Nähtavad relvakaardid, sama soomusearvutusega tanki esi/külg/tagakahju ning ostueelne koosseisukaart.
- [x] Koosseisule vastav jalaväevarustus, fraktsioonikamo, jagatud geomeetria ja kaugvaate partiide ühendamine.
- [x] Tegelike jalaväemudelite ja relvastuse vaatamine 3D Arsenalis.
- [ ] Kamo shaderi ja uute meeskonnamudelite brauseripildi ülevaatus ning vajaduse järgi visuaalne viimistlus.
- [ ] Uute koosseisude pika lahingu tasakaal ja mõõdetud FPS samas stseenis.


## Tehnika põhjalikkus ja vastav varustus

- [x] Fraktsioonide tanki/kergtanki/IFV/APC/luure/AT/AA/kopteri rollide, soomuse ja relvavarude erinevused.
- [x] Relvapõhine liikumiselt laskmise luba ja stabiliseerimine; sama tegur lahingus, HUD-is ja Arsenalis.
- [x] Kahuri/raketi valik ühise kahjustusarvutuse ning tegeliku ulatuse/varude järgi.
- [x] Uuendatud tehnikamudelite kaitserelvad, IFV/AA torud ja eraldi kopteri raketipodid/AT-raketid.
- [ ] Uuendatud tehnikamudelite brauserivaate ülevaatus ja pika lahingu tasakaal.
- [ ] Ülejäänud lennukite/laevade fraktsioonivarustuse läbivaatamine samade gameplay-kriteeriumide järgi.


## Suurem kaart ja dünaamiline mets

- [x] Roheorg 960 m; kaardisuurus ühendatud kõrgusvälja, nav'i, nähtavuse, ruumiindeksi ja UI-ga.
- [x] Kaks lisasulat, tänavad/kõnniteed, uued metsasagarad ja metsateed, senises hoonemõõtkavas.
- [x] Sama metsatihedus puude paigutuses, liikumises, lahingukattes ja vaatekiire takistuses.
- [x] HE-tabamusest algav piiratud/deterministlik tulekahju, suits, mõlema poole kahju ja püsiv põlenud kate.
- [x] Põlengu HUD/minikaart/olemasolevad osakesed, võrade tumenemine/kahanemine ja metsa save/hash.
- [ ] Uue metsa/suitsu ja 960 m kaardi brauseripildi ülevaatus ning teede/asulate pildipõhine viimistlus.
- [ ] Pikemate ressursivedude/lahingute tasakaal ja mõõdetud kaardijõudlus.

## Relvade numbrid ja tulejuhtimine

- [x] Jagatud tegelik tabamisvõimalus ja HUD-i tegurite kaupa arvutus ilma sim/RNG mutatsioonita.
- [x] Värvilised iga relva maksimum- ja miinimumulatusringid, eraldi relva valik ning HUD-i lüliti.
- [x] Luurekontaktiga seotud kaugus/AP/soomuskülg/moon/laadimine/LOS info; kaotatud kontakt ei avalda elavat kaugust.
- [x] Koordinaattule ja sihtmärgitule ühine ulatuskordaja, suurtükirelvade andmepõhised minimaalsed kaugused.
- [x] HUD-i avatud detailide/kerimise säilitamine ja paigal oleva ulatusgeomeetria vahemälu.
- [ ] Ulatusringide/tekstisuuruse brauseripildi kontroll eri suumidel ning uute miinimumkauguste matšitasakaal.

## Liikumine ja taastumine

- [x] Tegeliku jalajälje navikontroll, stabiilne möödumiskülg ja piiratud kohalik ümbersõiduotsing.
- [x] AI komponentkahjust sõltuv taastumine, läbitava teeninduskoha valik ja inseneri remonditöö reserveerimine.
- [x] Sama füüsiline remondivaru AI ja inseneri loogikas; lennuki/laeva komponendikahju teenindus. Vt MOVEMENT-RECOVERY-POLISH.md.
- [ ] Suurte kolonnide ja päris sildade brauseris jälgimine ning peatunud üksuste tee loovutamise hindamine.

## Laskmiseks manööverdamine ja EVAC

- [x] Tehnika kaugema laskepositsiooni valik, hüstereesiga laskekauguse taastamine ja torniga sõiduki tagurdamine.
- [x] Paigalolekut nõudva relva stabiliseerumise aeg koos tegeliku lasu ja HUD-i ühendusega.
- [x] Ründelennuki laskmisjärgne eemaldumine ning EVAC-nupp/klahv E, ülesannete tühistamine ja reisijate säilitamine.
- [x] Baasi kaugusega kütusereserv ning komponentkahjust sõltuv automaatne tagasipöördumine. Vt FIRING-MANEUVER-EVAC.md.
- [ ] Grupi tagurdamise, lennuki pöörderaadiuse ja uue EVAC-nupu brauseris jälgimine.

## Visuaalne liikumine

- [x] Kõrguse/lennukalde interpolatsioon, tegelikust liikumisest lähtuv sujuv jalaväe samm ja vedrustus ning pausi interpolatsiooni parandus.
- [x] Kaamera vaatesse naasmise ja järsu ümberpaigutuse lähtestamine; 3 renderdusloogika kontrolli, replay ja build. Vt VISUAL-MOTION-POLISH.md.
- [ ] Renderdatud brauserivaate, suurte gruppide ning eri LOD-ide visuaalne jälgimine ja FPS-mõõtmine.

## Pildi põhjal kaardi ja HUD-i parandus

- [x] Roheoru layout13: sidus ja sillaotstega joondatud teedevõrk, ümardatud suunamuutused ja ohutud ressursihoone kohad.
- [x] Kitsamad servad enne kogu sõiduteevõrku, jagatud asfalt ning silla sõidupind/toestused.
- [x] Ülemine avatav tootmisriba, eraldi alumised minikaardi/valiku paneelid, täisekraan ja Kaardid-nupp.
- [x] Nähtavad kahe kaardi eelvaated ning Murdlaine coast2 sadamalinnad ja ühendusteed.
- [x] Staatilise geomeetria järjekorrast sõltumatu save-signatuur; 5 sihitud kontrolli ja build. Vt MAP-HUD-FULLSCREEN.md.
- [ ] HUD-i eri ekraanisuuruste, täisekraani ja teepindade renderdatud brauseripildi ülevaatus.
