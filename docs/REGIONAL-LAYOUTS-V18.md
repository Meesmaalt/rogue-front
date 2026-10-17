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

## Lähenemised ja varustus

Baaside, asulate ja teede graaf on strateegiliselt paaritatud. Mõlemal baasil on kaks väljapääsu ja baasid jäävad teedevõrgus ühendatuks ka ühe ühenduse eemaldamisel. Tee pikkus arvutatakse päris kõverjoone järgi, mitte ainult ankrute linnulennukaugusest. Test kontrollib vastavate asulate lähenemiskauguste võrdsust.

Neli tootmisalapaari paigutatakse teede kõrvale koos kuiva laadimisala ja teest eemal paikneva tehasemaja jalajäljega. Ka vastaspoole peegeldatud koht peab sobima; kui üks pool ei sobi, otsitakse uus paar. Ühine neutraalne tootmisala valitakse vaidluskeskme lähedale. Kohalik maakasutus võib poolte vahel erineda; graafi võrdsus ei ole inimeste mängitud matšide võiduprotsendi mõõtmine.

## Valiku kandumine mängu

Uued kaardid kasutavad v18 ID-d. Maski bitid 7–8 tähendavad automaatset valikut või üht kolmest käsitsi valitud paigutusest. Sama väärtus jõuab menüüst ettevalmistuse workerisse, kaardi ID-sse, päris lahingusse ja lobby kaardi värskendamisse. Kasutaja jaoks ei ole vana kaardi taastamine selle etapi eesmärk; põhiline kontroll on uute paigutuste tulemus ja mängitavus.

## Kontroll ja kasutamine

- Kõik 12 paigutust genereeritakse kõigil kuuel toetatud suurusel. Päris nav- ja lennurajakontrollid tehakse iga paigutusega 2 ning 6 km kaartidel; lisaks kontrollitakse seemne 0 ja uint32 ülempiiri korral värsket ettevalmistust.
- Graafitestid kontrollivad ühendust ka ühe ühenduse eemaldamise järel ning paaritatud lähenemiste pikkusi. Teede/sildade test kontrollib kaldus ristumist ja katkematut füüsilist teepinda.
- Päris APC läbib kiirmarsikäsuga nii pika kui hargneva kanjoni kaardi ja sõidab üle füüsilise silla. Kontroll sisaldab tavalist sõidukontrollerit, teeotsingut ning rajatiste nav-jalajälgi.
- Ühise põllutöötluse ja kõrgendikuvööndi kõrguse kontrollid; TypeScript, kliendi/serveri build ja päris HTTP/lobby kontroll koos käsitsi valitud paigutuse säilimisega.
- Chromium/WebGL2 tarkvararenderduses kontrollitud 12 üldvaadet, piirkondade lähivaated, käsitsi paigutuse valimine ja kaardi valmimine. Riistvaraline GPU FPS ning pika matši tasakaal jäävad eraldi mängukatse teemaks.

Rakendamiseks ühenda muudatus, ehita uuesti nii mängu kui multiplayeri image ning alusta uut lahingut. Täpne valik on **Maastikupiirkond → Paigutus → Uus kaart**; kordamiseks märgi „Korda sisestatud seemet”.
