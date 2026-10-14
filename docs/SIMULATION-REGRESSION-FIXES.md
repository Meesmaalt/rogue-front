# Viie simulatsioonitõrke parandused

14.10.2026. Kõik viis varasemat tõrget taastoodeti enne muudatust.

| Kontroll | Põhjus | Parandus |
|---|---|---|
| CoreLoop | Tehase 11 s ehitusaeg algab alles pärast inseneri teekonda. Testi jäik lisand 32 s lõppes 0,53 s enne valmimist. Füüsilise sissetuleku kontroll vaatas ainult veokeid. | Piiratud ootamine tegeliku ehitusoleku järgi; tootmise kontroll jääb alles. Sissetulek peab olema päriselt kohale toodud veoki või kaardivälise lennuga. |
| Integration | USA tanki fraktsioonipõhist täpsust 0,86 võrreldi üldise tankiprofiiliga 0,78. | Üksuse täpsust võrreldakse oma fraktsiooni definitsiooniga; nii üksuse kui jagatud baasandme muutumatus on eraldi kontrollitud. |
| SystemsIntegration | Ühesekundiline automaatne õhkutõus oli asendatud ruleerimise ja hoovõtuga. Pikk lennuring lubas laole ka uut tarnet, mistõttu lõppvaru ei olnud tingimata väiksem algvarust. | Kontrollib esmalt ruleerimist, seejärel piiratud aja sees tegelikku õhkutõusu, moona tõttu naasmist ja maandumist. Teeninduse üks samm peab võtma olemasolevast laovarust moona. |
| tacticalSupply | Lao 40 kütuseühikut on tootmisreserv; vaikimisi teenindus ei tohi seda ära võtta. | Kontrollib reservi säilimist ja HUD-i teadet; kütuseprioriteedi valimisel peab tegelik tankimine kulutama sama laovaru. |
| NavGrid | Kogu World.tick (liikumine, luure, lahing ja logistika) arvutati 4 ms navigeerimiseelarvesse. A* tegi ka vabal sirgel tarbetut otsingut, pargitud kehade kaugused arvutati iga ruudu juures uuesti. | Teekonnaotsing kasutab vabal kaalumata sirgel kontrollitud otseteed ning eelarvutatud ruutkaugusi. Otsingute eelarve jääb 4 ms; kogu sim peab mahtuma 30 Hz sammu 33,33 ms sisse. Test nõuab ka tegelikku liikumist. |

Kohalik 200 üksuse liikumissüsteemi proov: ligikaudu 7,3 → 3,9 ms/samm, otsingute osa 3,55 → 0,25 ms/samm. Kogu World.tick sihitud proov oli pärast muudatust ligikaudu 5,2 ms. Need on selle masina CPU mõõtmised, mitte brauseri FPS ega GPU mõõtmine.

Lisakontroll kaitseb sirge tee optimeeringut: staatilise seina või pargitud keha korral peab leidma ümbersõidu. Kaalutud kiire liikumine peab jätkuvalt eelistama pikemat teed metsast otse sõitmisele. 12 segaklassiga üksuse värava/kolonni kontroll ja remondile tagasipöördumise kontroll läbivad.

Build/TypeScript ja kogu testipakk läbivad: 271 testi, 63 testifaili, 204,14 s. Läbis ka 15 mänguminuti majanduse taastumise simulatsioon. Serveri map-policy test läbib eraldi. Brauseri visuaali/FPS-värav jääb avatuks.
