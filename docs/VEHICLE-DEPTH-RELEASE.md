# Tehnika relvastus, taktikalised rollid ja mudeli varustus

2026-10-05. Jätk jalaväe koosseisu-arendusele; olemasolevad üksuseklassid ühendatud samade fraktsiooniandmete kaudu, uusi nimelisi klasse ei lisatud.

## Sisulised muutused

Kolme fraktsiooni tankid, kergtankid, IFV/APC-d, luuresoomukid, tankitõrjesoomukid, liikuv õhutõrje ning kolm lahingukopteri rolli on saanud täpsustatud relvastuse ja rollid. Tankide esisoomus, külje/tagakaitse, kahuri läbistus, ulatus, täpsus, laadimine, varud, optika ja kütusekulu erinevad. Kergtank ei läbi põhitanki esisoomust nagu raske tank, kuid saab tegutseda külje/tagarünnakul. APC jääb transpordiks ja lähitoetuseks. IFV ühendab stabiliseeritud automaatkahuri piiratud ATGM-iga: raketi laskmiseks tuleb peatuda.

Luuresoomukitel on kaugoptika ja olemasolevas sensorisüsteemis kasutatav varjatus; USA/Venemaa kuulipilduja ning Hiina automaatkahur annavad erineva lähikaitse. Tankitõrjesoomukid on peatudes laskvad kaugvaritsuse üksused: TOW-2, Khrizantema ja HJ-10, väiksemad raketivarud ja piiratud soomus.

Liikuv õhutõrje kasutab nüüd nii kahurit kui rakette. Kahur sobib lähedase õhuohu ja jalaväe vastu, raketid kaugema õhuohu vastu; USA varu on 4, Venemaal 8 ja Hiinal 4 raketti. Raketi laskmiseks peab masin peatuma. Kahel relval on iseseisev laskemoon ning laadimine ja olemasolev logistika taastab nende varusid.

AT-kopteritel on 8–12 tankitõrjeraketti varasema 38–40 asemel; lähedase tuletoetuse kahur ja 32–40 juhitamata raketti kasutavad eraldi varusid. Lähitoetuskopter jääb kahuri/raketipodide platvormiks, millel pole ATGM-i. Õhus oleva kopteri varusid maapealne ladu otse ei taasta: kehtib olemasolev parkimise/õhubaasi varustamise tsükkel.

Kõik arvud on kokkusurutud mängukaardi tasakaaluparameetrid, mitte tõendatud pärisrelvade näitajad. Kõigi ülejäänud lennukite ja laevade fraktsioonivarustuse täielik läbivaatamine jääb edasiseks tööks.

## Lahingu ja UI seos

WeaponSpec saab relvapõhise stabilisaatori, liikumiselt laskmise loa ja külgsuunalise väljalaskepunkti. Combat välistab peatamist vajava relva valmis relva valikust, kui üksus liigub üle 0,5 m/s. Teised relvad jäävad kasutatavaks. Liikuva lasu täpsuse tegur on sama funktsioon live-tabamisarvutuses, koosseisukaardil ja Arsenalis: täielik stabilisatsioon 1, osaline 0,72, puuduv 0,45; liikumiselt keelatud relv kuvab „peatub”. Need kuvatud protsendid on relva baastäpsus koos liikumisteguriga; kaugus, varustus, juhtimisside, sihtmärk, moraal, kate ja kahjustused muudavad lõpptabavust.

Relvavalik hindab nüüd sama läbistus-/sihtmärgiklassi arvutusega nominaalset tabamiskahju, baastäpsust ja laadimist. Nullkahjuga kineetiline relv ei kuluta raske soomuse vastu padruneid. Piiratud AT-raketi eelistus jääb soomuse vastu kehtima. HUD-i ostueelne kaart näitab ka kütusemahtu/kulu; Arsenal näitab soomuse suundi ja relva liikuvust. Jalaväekoosseisude nimed korrigeeriti tegeliku RPG/PF-98, 81/82 mm miinipilduja, Igla/QW-2 ning HJ-8 varustuse järgi.

## Mudelid

Uuesti eksporditi mängus kasutatavad 63 detail- ja 63 kaugmudelit. Luuresoomukil on päris kaitserelv ja optikamast. Bradley/Hiina IFV-l on torudega ATGM-rakettide statiiv; BMP-3 siluetil on eristatavad kahuritorud ja raketi väljalase kahurist. APC kahuritoru vastab fraktsiooni kuulipildujale/automaatkahurile. Õhutõrjemudelitel on kahur ning eristatavad raketitorud. Kopteritel on ümarad raketipodid ja AT-variandil eraldi tiibade all paiknevad raketiriiulid koos raketikehadega; CAS-variandilt puuduvad AT-raketid. Suudmepunktid vastavad nüüd paremini kahuri/tiivarack'i asukohale.

Olemasolev materjalide ühendamine, fraktsioonitekstuurid ja pööratavad tornid/rootorid säilivad. Need on originaalsed stiliseeritud mudelid, mitte fotorealistlikud ostuvarad. Kõigi GLB-de struktuurikontroll: maksimaalselt 6256 kolmnurka ja 10 materjalipartiid; raport `checks/vehicle-loadout-art.json`. Need mõõdikud ei ole FPS-mõõtmine.

## Kontroll ja piirangud

Tootmisbuild ja kolm uut sihitud kontrolli läbisid: IFV liikumiselt kasutatav kahur/paigal ATGM ning soomusenurgad; AA kahur/rakett, sõltumatud varud ja save/load hash; kopteri eraldi raketiriiulite väljalaskepunktid ning õhus varustamise keeld. Olemasoleva kombineeritud relvastuse integratsioonikontroll jooksutati relvavaliku muudatuse tõttu eraldi. 126 GLB-faili struktuur, raketirack'id ja kopterirootori nimed kontrolliti.

Brauseri visuaalset ülevaatust, GPU/FPS-i, multiplayer'i läbimängu ega pikka tasakaalumängu ei tehtud. Täissalvestus jääb versioonile 19; Roheoru uus autosave-võti on layout8. Muudatus ei kuuluta mängu tervikuna valmis.
