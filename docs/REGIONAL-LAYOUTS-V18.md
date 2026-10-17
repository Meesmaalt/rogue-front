# Piirkonnale omased kaardipaigutused · v18

Igal maastikupiirkonnal on nüüd kolm erineva struktuuriga paigutust. Üksikmängu ning lobby generaatorivalikus saab jätta paigutuse seemne otsustada või valida selle ise. Piirkonna vahetamine uuendab paigutuste loendi ja seab valiku tagasi automaatseks. Valmis kaardi nimi näitab kasutatud paigutust.

| Piirkond | Paigutused |
| --- | --- |
| Itaalia | Jõeorg; Turulinnade ring; Põllumajandusvöönd |
| Siberi talv | Taigakoridorid; Järvede vahel; Harjade läbipääsud |
| Ameerika kanjonid | Pikk kanjon; Lavamaade ring; Hargnev org |
| Kõrb | Kaubateede ring; Luitevööndid; Kivine nõgu |

## Tegelikud erinevused

`region-plans.json` määrab asulapaarid, graafi tüübi, jõe kontrollpunktid, teekõveruse, metsasuse nihke, reljeefi kuju/proportsioonid ja vajadusel eelistatud järvenõod. `regionPlans.ts` koostab nendest seotud teedevõrgu, asulakohad, veejooned, tootmisalade juhised ning kõrgendike teljed. See ei ole sama valmis kaardi pööramine ega ainult värvide vahetamine.

Ringpaigutused kasutavad ümber keskala kulgevaid teid; läbipääsupaigutustel on pikemad servamarsruudid; hargnevatel paigutustel on eraldi teeharud ja külgühendused. Jõeorg säilitab kolm eri lahingusuunda. Pikal kanjonil ja taigakoridoridel on vaikeseadetes kaks jõeületust, hargneval kanjoniorul kuus; kõrbe vaikeseaded jätavad vee välja. Siberi järvepiirkond eelistab enne reljeefi lisamist planeeritud järvenõgusid. Kõrbe kivine nõgu kasutab lavamaavormi, luitevöönd piklikke luiteid ja kaubateede ring laugemaid kiviseid harju.

Jõed silutakse kontrollpunktide vahel. `regionInfrastructure.ts` leiab silla asukoha tee ja jõe päris keskjoonte ristumisest, määrab selle suuna tee järgi ning arvestab teki pikkuses ristumisnurka. Asfalt lõigatakse silla alt välja; sama sild on päris navigeerimis- ja kõrgusvälja objekt. Teed ei lõpe lihtsalt veepiiril.

Ühe kõrgendikuvööndi osad moodustavad ühise maksimaalse kõrgusümbrise. Sellega välditakse järjestikuste künkakernelite kõrguste liitmisest tekkivat helmelaadset ahelikku. Planeerimine ja päris kõrgusväli kasutavad sama reeglit; kõrguspuhvri koostamisel kasutatakse ette valmistatud rühmaindekseid ja korduvkasutatavat arvupuhvrit.

Ühe põllu lõikamisest tekkinud tükid kannavad ühist `parcelId` väärtust. Põllukultuur, istanduse tüüp ja värv säilivad kõigil tükkidel, nii et tee või järve ümber ei teki eri värvi kolmnurkade lehvikut.

## Asulate ja looduse iseloom

V18 asulad järgivad olemasoleva kõvera maantee suunda. Itaalia külasüdant ja kõrbe hoove täiendab väike seotud ringtee; Siberi metsaküla ja kanjonite teeasula kasutavad lühikesi kõrvalharusid. Suur tühi tänavaruudustik on asendatud tegeliku hoonestusega seotud teedega. Kui maastik või reservatsioon katkestab kohaliku tee, ei saa selle eraldatud osa hooneid.

Asulate paletid, hoonestiilid ja mõõdud tulevad `region-character.json` andmetest. Itaalia külas on purskkaevu ja pinkidega väike väljak, Siberis palgivirnad ja töövarjualune, kanjonites teeäärne puhkekoht ning kõrbes kaevuhoov. Kõrbe elamud kasutavad mõlemas detailsusastmes parapetiga lamekatust. Keskpunkt valitakse takistusteta taskusse; vee, tee või tööala kohale seda ei suruta.

`regionalCharacter.ts` paigutab kallastele niiskemaid rohu-/pinnasetaskuid ja reljeefi jalamitele kivisemat maad; luite serval on kuivem nõgu. Need sulatatakse pehme üleminekuga maapinnaatlasesse. Hõredad päris metsasalud pehmendavad metsa ja lagendiku piiri. Kivid ja madal taimestik koonduvad pinnasetaskutesse; suuri rahne on hõredalt, Siberis lisandub lamapuit. Senine instantside ülempiir säilib. Pinnaselaigud ja väikedetailid ei tekita salajasi liikumistakistusi; päris mets kasutab tavalisi metsakatte reegleid.

## Meeldejäävad maamärgid ja ülejäänud mängu viimistlus

Kaardile otsitakse kuni kaks vastandlikku maamärgipaari: Itaalia maakabel, Siberi metsavahitorn, kanjonite veetorn või kõrbe karavanitee vahitorn. Paigutus kontrollib kuiva ligipääsu, piisavalt ühtlast aluspinda ning kaugust baaside, tööalade ja hoonetega. Objektidel on tegelik jalajälg ja kõrgus; teed lõpevad fassaadi ees ning maamärgid pole garnisoneeritavad.

Sama iseloomuviimistlus ulatub ka tootmisrajatistesse, baasihoonetesse ja GLB üksustesse. Piirkonnaga kooskõlas tööstusrajatistele lisandusid torustiku-/redeli-/ventilatsiooni- ja laadimisdetailid. Baaside sidekapid, teenindusvahendid, välivarustus ja pinnase-/ilmastikujäljed kasutavad olemasolevaid renderduspartiisid. Sõidukite ja lennukite soomus saab vahemällu laadimisel kerge kulumise; optika, markeeringud, relvad ja liikuvad sõlmed jäävad samaks.

Tootmise ajal ei muuda hoone enam pulseerides suurust. Väike kindlasse mudeliposti kinnitatud töötuli näitab tegelikku valmisolekut, tööd või tõrget. Ressursirajatise signaal lähtub selle käivitus-/tootmisolekust ja peidetakse väljaspool mängija teadmist. Laadimisala geomeetriat ei täideta uute takistustega.

## Lähenemised ja varustus

Baaside, asulate ja teede graaf on strateegiliselt paaritatud. Mõlemal baasil on kaks väljapääsu ja baasid jäävad teedevõrgus ühendatuks ka ühe ühenduse eemaldamisel. Tee pikkus arvutatakse päris kõverjoone järgi, mitte ainult ankrute linnulennukaugusest. Test kontrollib vastavate asulate lähenemiskauguste võrdsust.

Neli tootmisalapaari paigutatakse teede kõrvale koos kuiva laadimisala ja teest eemal paikneva tehasemaja jalajäljega. Asula hooned jätavad laadimiskoha ümber 40 × 40 m ja nihutatud tehase ümber 32 × 32 m vabaks, mitte põhjendamatult suure 100 × 100 m ruudu. Ka vastaspoole peegeldatud koht peab sobima; kui üks pool ei sobi, otsitakse uus paar. Ühine neutraalne tootmisala valitakse vaidluskeskme lähedale. Kohalik maakasutus võib poolte vahel erineda; graafi võrdsus ei ole inimeste mängitud matšide võiduprotsendi mõõtmine.

## Valiku kandumine mängu

Uued kaardid kasutavad v18 ID-d. Maski bitid 7–8 tähendavad automaatset valikut või üht kolmest käsitsi valitud paigutusest. Sama väärtus jõuab menüüst ettevalmistuse workerisse, kaardi ID-sse, päris lahingusse ja lobby kaardi värskendamisse. Kasutaja jaoks ei ole vana kaardi taastamine selle etapi eesmärk; põhiline kontroll on uute paigutuste tulemus ja mängitavus.

## Kontroll ja kasutamine

- Kõik 12 paigutust genereeritakse kõigil kuuel toetatud suurusel. Päris nav- ja lennurajakontrollid tehakse iga paigutusega 2 ning 6 km kaartidel; lisaks kontrollitakse seemne 0 ja uint32 ülempiiri korral värsket ettevalmistust.
- Graafitestid kontrollivad ühendust ka ühe ühenduse eemaldamise järel ning paaritatud lähenemiste pikkusi. Teede/sildade test kontrollib kaldus ristumist ja katkematut füüsilist teepinda.
- Päris APC läbib kiirmarsikäsuga nii pika kui hargneva kanjoni kaardi ja sõidab üle füüsilise silla. Kontroll sisaldab tavalist sõidukontrollerit, teeotsingut ning rajatiste nav-jalajälgi.
- Ühise põllutöötluse ja kõrgendikuvööndi kõrguse kontrollid; TypeScript, kliendi/serveri build ja päris HTTP/lobby kontroll koos käsitsi valitud paigutuse säilimisega.
- Chromium/WebGL2 tarkvararenderduses kontrollitud 12 üldvaadet, piirkondade lähivaated, käsitsi paigutuse valimine ja kaardi valmimine. Riistvaraline GPU FPS ning pika matši tasakaal jäävad eraldi mängukatse teemaks.

Iseloomuviimistluse lõppkontroll: 29 sihitud testi ja 10 serveritesti läbisid; viimase katusematerjali paranduse järel läbisid uuesti kõik 8 renderduse/ehitamisel puhastamise testi. Tootmisbuild õnnestus. Kogu komplektis läbis 593 testi ja ebaõnnestus 21; tõrgete nimed kattuvad täpselt eelnevalt baasversioonil kinnitatud nimekirjaga. Kõik 12 üldvaadet, piirkondade küla-/looduslähivaated ning päris hargneva kanjoni lahingu käivitumine kontrolliti Chromium/WebGL2-s ilma JavaScripti vigadeta.

Rakendamiseks ühenda muudatus, ehita uuesti nii mängu kui multiplayeri image ning alusta uut lahingut. Täpne valik on **Maastikupiirkond → Paigutus → Uus kaart**; kordamiseks märgi „Korda sisestatud seemet”.

Maamärkide ja ühise mudeliviimistluse lõppkontroll: 16 navigeerimis-/maamärgi-/sillaületuse testi ja 10 serveritesti läbisid, lisaks töötulede, nähtavuse ning mudeliosade kontrollid. Muutumatu lõppversiooni kogu Vitest-komplektis läbis 601 testi ja ebaõnnestusid samad 21 varem kinnitatud testi. TypeScript ja tootmisbuild õnnestusid. Nelja piirkonna maamärgid, tööstus-, baasi- ja üksusevaated, kolme tegeliku tööoleku proov ning päris lahingu käivitumine kontrolliti Chromium/WebGL2-s ilma JavaScripti vigadeta.
