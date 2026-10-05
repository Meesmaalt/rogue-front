# Suurem Roheorg ja dünaamiline mets

2026-10-05. Maastik on ühendatud olemasoleva liikumise, füüsiliste mürskude, luure, katte, renderduse ja salvestusega.

## Kaart ja liikumine

Roheorg on 960 × 960 m varasema 640 × 640 m asemel: pindala 2,25 korda suurem. Kaardi suurus tuleb nüüd MissionMapDef.size kaudu; teiste kaartide vaikimisi suurus on endiselt 640 m. Kõrgusvälja vahemälu, navigeerimine, nähtavusvõrk, ruumiindeks, ehituspiirid, liikumispiirid, kaamera ja minikaart kasutavad aktiivset kaardisuurust. Nav on 2 m ning nähtavus 4 m ruudustikul. Vaikekaamera kaugus on 180 m ja 960 m kaardil maksimaalne kaugus umbes 595 m.

Baase ja ressursirajatisi paigutati kaugemale ning teede/maastikulappide pikkusi laiendati. Majade ja üksuste mõõtmed jäid endiseks. Roheorul on 128 kaardiobjekti: 45 tsiviil-/tööstushoonet ja 22 metsasagarat, kaks uut tänavate/väljakutega asulat, kõnniteed ja ühendusteed. Uued majad paigutati teekoridoridest eemale. Metsa lisati ühendatud sügavaid alasid ja läbitavaid metsateid. Suurenenud kaugused mõjutavad päris ressursivedusid, rindele jõudmist ning eesliini ladude väärtust.

## Mets kui lahingumaastik

Metsaserv on hõredam kui tuum, metsapiir võib olla elliptiline ning metsateed ja õued eemaldavad lehestiku katte. Sama tiheduse arvutus juhib puude paigutust, metsaliikumist, kaitsekatet ja luure vaatekiire takistust. Mets ei muutu üksikute puude kaupa nav-takistuseks: jalavägi ja tankid saavad sisse sõita. Jalavägi liigub tihedas metsas umbes 88%, roomikmasin 64% ja ratassõiduk 48% avamaa kiirusest; põlenud mets aeglustab vähem. Metsateel rakendub olemasolev teekiiruse eelis. Eraldi individuaalsete puude collision'i või tankiga puude ümberlükkamist ei lisatud.

Vaatekiir hindab lehestiku/suitsu läbimise pikkust. Sügav mets katkestab vaate; metsas olevat vastast näeb ainult piisava optika ja sobiva vaatejoonega üksus. Paigal olemine aitab, liikumine ja hiljutine lask suurendavad märkamisohtu. Tavaline kinnitatud kontakt kestab 3 sekundit ja radarikontakt baastasemel 6 sekundit; pärast kontakti kadumist jääb olemasolev viimane teadaolev luurekontakt. HUD näitab oma üksuse metsa/avatud/põlenud ala ja märkamisohtu, mitte varjatud infot selle kohta, kas mõni vaenlane teda tegelikult jälgib.

## Tulekahju

Maapinna lähedal vähemalt 24 baaskahjuga HE-tabamus, mille plahvatusraadius on vähemalt 2 m, võib süüdata tiheda metsaraku. See käivitub päris mürsu Impact-etapis, sealhulgas sobivast suurtüki-/pommi-/raketitabamusest; kuul või kineetiline AP-mürsk metsa ei süüta. Spetsiaalset leegiheitjat või napalmirelva ei lisatud. Mängija saab kasutada olemasolevaid kaudtule maapunkti käske.

Tulekahju levib deterministlikult naaberrakkudesse, sõltub metsatihedusest ja katkeb läbipääsude/lünkade juures. Simulatsioon kasutab 16 m rakke, sekundilist keskkonnasammu ja kuni 64 samaaegset aktiivset tuld. Rakk põleb 28 sekundit; suits püsib veel 18 sekundit. Põlenud ala säilib ülejäänud lahingu jooksul ja jätab 18% senisest lehestikukattest. Suits takistab madalaid vaatekiiri, kuid kõrgel lendav vaatleja võib sellest üle näha.

Tuli ohustab mõlema poole maapealseid üksusi: jalaväele 2 ja sõidukile 0,25 baaskahju keskkonnasammu kohta, lisaks suppression ja moraalikadu. Õhus olevat lennukit ei kahjusta maapealne metsapõleng. Mängija peab ohtlikust alast lahkuma; automaatset iga üksuse tule eest evakueerimist selles muudatuses ei lisatud.

## Pilt, jõudlus ja salvestus

Mets koosneb eri kõrguse/tooniga leht- ja okaspuudest ning tiheduse järgi paigutatud servadest. Puud kasutavad piirkondlikke instantsipartiisid ja jagatud materjale. Põlenud raku võrad kahanevad, tüved tumenevad ja maapinnale jääb piiratud ühe partiiga kõrbemisjälg; olemasolevad osakesepuhvrid kuvavad piiratud leeke, sädemeid ja suitsu. Uusi punktvalgusteid ega iga puu eraldi mesh'e ei looda. Nähtavas alas olevad tulekahjud kuvatakse minikaardil. Tumedamaks muutunud instantsid uuendavad varjukaarti muutuse korral. Lehestiku/suitsu simulatsioon ja tulekahju seisund ei sõltu renderduse kaadrisagedusest.

Metsaseisund, keskkonna sammuloendur ja kaardisuurus on täielikus salvestuses ning lockstep-hash'is. Salvestuse skeem jääb versioonile 19, olemasoleva runtime'i lisaväljadega; Roheoru uus autosave-võti on layout9. Varasemate teiste kaartide suuremad muudatused ei ole selle töö eesmärk. Mitme eri kaardiga World'i samaaegne jooksutamine ühes protsessis jääb olemasoleva globaalse kõrgusvälja tõttu piiratud arhitektuuriks.

## Kontroll ja piirangud

Tootmisbuild ja kolm sihitud kontrolli läbisid: jalaväe/tanki metsa läbitavus, tee läbipääs ja liikumise/lasu märkamisoht; päris HE-projektiili tekitatud tuli, suits, kahju, põlenud kate ning salvestatud jätku hash; 960 m kaardi nav/vision suurus ja ühendatud teekond baaside vahel. Viimase asulapaigutuse järel kontrolliti kaardi ühendust uuesti.

Täistestikomplekti, pika lahingu tasakaalu, multiplayer'i läbimängu, FPS-mõõtmist ja brauseri visuaalset ülevaatust ei tehtud. Kaardipildi kvaliteet, suitsu läbipaistvus ja suurenenud vahemaade tasakaal vajavad päris mängupildi/tagasiside põhjal viimistlust. See pole kogu mängu valmisoleku kinnitus.
