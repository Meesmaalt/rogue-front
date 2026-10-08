# Aktiivne viimistlusjärjekord — 08.10.2026

Põhiplaan: [DEVELOPMENT-PLAN.md](DEVELOPMENT-PLAN.md). Allolev järjekord on järgmise arenduse alus; hilisemad vanad etapid ja märkeruudud jäävad ajalooliseks loendiks. Pakett loetakse tehtuks põhiplaani lõpetamistingimuste järgi, mitte funktsiooni nime olemasolu järgi.

- [x] Kasutatava alpha ulatuse, viie viimistluspaketi ja alpha/beta lõpetamiskriteeriumide uuendamine (08.10.2026).
- [ ] V1: käivitus/deploy, brauseri jõudluse alusmõõtmine ja suurima kitsaskoha parandus.
- [ ] V2: grupijuhtimise, maa-/õhuliikumise ja lahingu tunnetuse lõpetamine.
- [ ] V3: majanduse, füüsilise logistika ja AI matšitempo lõpetamine.
- [ ] V4: selge HUD ja Roheoru ühtne visuaalne viimistlus.
- [ ] V5: õpetuse/save-load läbipääs ning DEVELOPMENT-PLAN.md alpha värav; seejärel A6 lõpetatuks.

## Teostatud alused ja seniste pakettide seis

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
