# Relvade ulatus ja tabamisvõimalus

Vali üks oma võitlev üksus. Iga relv saab eraldi värvi ning maapinda järgiva maksimaalse ulatusringi. Katkendjoon näitab minimaalset kaugust. HUD-i „Ulatusringid” lülitab kihi välja; relvakaardi nupp valib ainult selle relva, teine klõps taastab kõik. Mitmikvaliku ajal ringe ei kuvata.

Relvakaart näitab efektiivset ulatust, baas-AP-d/täpsust/laadimisaega, moonakulu, survet ja mürsukiirust. Luurega nähtava praeguse ründesihtmärgi korral kuvatakse kaugus, jagatud lasuarvutuse tabamisvõimalus, AP kauguse mõjuga võrreldes soomusküljega ning hinnanguline lennuaeg. Arvutuse saab avada tegurite kaupa: varustus, juhtimisvõrk, kaugus, suurus, optika, mõlema poole liikumine, surve, moraal, kahjustused, kogemus, ECM ja kate. Iga rida näitab tulemust pärast vastavat tegurit; avatud paneelid ja kerimisasend säilivad värskendamisel.

`shotAccuracy` kasutab sama järjestatud valemit nii HUD-is kui ka tegeliku mürsu loomisel. Eelvaade ei muuda simulatsiooni ega kasuta RNG-d. `weaponRange` ühendab relva ulatuse, kaugusuuenduse ja vähese varustuse mõju tavalise laskmise, suurtükiväe tulemissiooni ja HUD/ringide vahel. Liikumise üldine ulatusfunktsioon kasutab sama kordajat. Kineetilise relva sobivuse kontroll arvestab nüüd ka relvauuenduse AP-boonust. Haubitsa minimaalne kaugus on 12, miinipildujal 5 ja MLRS-il 15 mängumeetrit relvaprofiilides; piirang toimib nii sihtmärgitules kui ka koordinaatmissioonis.

Ring ei taga luuret, LOS-i, sihtimisnurka ega lasuluba. Maksimum on kaugus laskurist; sihtmärgi raadius lubab serveri/simi olemasoleva reegli järgi tabada ka äärest väljaspool. Tabamisvõimalus on käivitatud lasu arvutatud tõenäosus, mitte garanteeritud kahju: tegelik teekond, takistused ja sihtmärgi liikumine võivad tabamust muuta. AP ja soomuse võrdlus ei ole läbistamise protsent. Nominaalsed kahjustustabelid jäävad tähistatud lähikauguse referentsiks. Lennuaeg on kaugus/kiirus hinnang; juhitava raketi kiirendus ja ballistiline miinimumaeg võivad tegelikku aega muuta. Koordinaattule senine salvo/hajuvuse süsteem jääb eraldi ega esita seda sihtmärgitule tabamisprotsendina. Kaugusuuendus pikendab ulatust, kuid ei paranda kauguse täpsustegurit.

Kaotatud luurekontakt ei avalda vaenlase jooksvaid koordinaate/kaugust. Vahemäluga korduvkasutatavad joonpuhvrid ja tekstuurid on ainult ühe valitud üksuse jaoks; paigal seisva üksuse ringide geomeetriat ei arvutata igal kaadril uuesti. Vana AA/punkri/suurtüki mudeli külge kinnitatud ulatusrõngas eemaldati.

Kontroll: TypeScript ja Vite build õnnestusid. Seitse sihitud Combat.test.ts kontrolli läbisid: kolm uut tabamisvõimaluse/preview RNG-puhtuse, ulatuse/piiride ja kadunud kontakti kontrolli ning neli varasemat mitme relva/sõiduki kontrolli. Täiskomplekti, brauseripilti, FPS-i ja pika matši tasakaalu selles muudatuses ei kontrollitud.


## Kompaktne relvainfo ja maastiku loetavus — 09.10.2026

Iga relva esivaade näitab klassiikooni/rolli, miinimum- ja maksimumulatust, moona ning oma üksusel ühisest lasukontrollist saadud takistust. Ulatusnupp on kohe kasutatav ja näitab aktiivset olekut. AP, võrdlusbaaskahjustused, liikuv täpsus, juhtimine ning elava sihtmärgi tabamisarvutus on relvapõhiselt avatavates detailides; HUD säilitab avatud detailide oleku. Vastase kaart jääb põhiandmeteks, tema jooksvaid sihtimisandmeid ei lisata.

RangeOverlay joonistab garnisoni GARRISON_RULES.firingArc ja garrisonFacing järgi ning muul piiratud sektoriga relvaplatvormil firingArc/heading järgi. Minimaalse ulatuse katkendjoon jääb sektorisse ning ääred näitavad laskesuuna piire. Täisringiga relval ring ei sõltu kere pööramisest; geomeetria olemasolev vahemälu säilib. Ühist garrisonWeaponUsable kontrolli kasutavad tegelik tulistamine, HUD ja ringide nähtavus: kaudtuld hoonest ei lubata, õhutõrje eeldab vastavat katusekoosseisu.

Maastiku esivaade eristab maanteed, metsaserva, sügavat metsa, põlenud metsa, tuleala, garnisoni ja avatud ala. Liikumiskordaja tuleb groundTerrainFactor-ist; katte protsent on sama targetCoverValue, millega lasuarvutus vähendab laskuri tabamisvõimalust. See pole automaatne nähtamatuse ega kahju vähenemise protsent. Merel kuvatakse eraldi olek. Kaardi geomeetriat ega majanduse/füüsiliste tarnete reegleid selles paketis ei muudeta.

Kontroll: build/typecheck, git diff --check ja 13 lühikest juhtumit (11 varasemat CombatPolish + 2 sektori/minimumulatuse ja garnisoni relvakasutuse kontrolli). Geomeetria kontroll kontrollib tegelikku renderduses kasutatavat vertex-funktsiooni. Päris brauseri paigutus eri suumidel/resolutsioonidel, FPS ja kaartide taktikalise paigutuse edasine töö on ootel.
