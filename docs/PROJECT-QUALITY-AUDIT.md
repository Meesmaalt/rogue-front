# Rogue Front: kvaliteedihinnang ja parandused — 06.10.2026

Projektiga tasub jätkata olemasoleval brauseriplatvormil. Koodis on juba ühendatud taktikaline lahing, füüsiline tootmine/varustus, maastik, õhurajatised ja merevägi. Peamine puudus on töökindla, selge tervikkogemuse viimistlus ja tõendamine. Seda ei saa veel ausalt nimetada Wargame'i kvaliteediga alphaks või beetaks. Käesolev hinnang põhineb koodiülevaatusel ja lühikestel sihitud simulatsioonikontrollidel, mitte uuel käsitsi läbimängitud matšil.

## Selles paketis parandatud

| Puudujääk | Tegelik muudatus |
|---|---|
| Murdlaine puudus vaikimisi menüü kaardivalikust. | Kohalik menüü pakub Roheorgu ning Murdlaine mereväekaarti; kampaanialukk ei takista ranniku skirmishi. |
| Õpetus oli vana Harjutusvälja pikk tekst, põhiliselt ehitus ja üks tank. | Sama Roheoru layout 12, 18 järjestikust sammu ning HUD-is aktiivne juhis. Õpetab taseme uuendust, luure metsa viimist, APC-le laadimist ja majja sisenemist olemasolevate süsteemidega. Üksusevaliku ja sihtpunkti nupud on kaamera/valikuga ühendatud. Esimene suur AI-rünnak on edasi lükatud. |
| Vastase juurde toodetud ladu või laev võis hävitamisülesande progressi ära nullida. | Algsete hävitamis- ja sabotaažisihtmärkide ID-d säilivad missioonis ja salvestuses; uued sihtmärgid ei asenda neid. Vanadel siht-ID-deta snapshot'idel jääb pärandrežiim. |
| Salvestus ei tuvastanud kaardi/reeglite sobimatust ning laadimisviga võis olemasoleva matši poolikult üle kirjutada. | v20 sisaldab geomeetria signatuuri ja reeglistiku tunnust. Põhi-, üksuse- ja mürsuandmeid kontrollitakse; taastamise erindi korral taastatakse eelmine World. Kohalik ümbris kontrollib missiooni, kõrgusallikat, fraktsiooni ja režiimi. Uuel õpetusel on eraldi salvestusvõti. See on mänguseisundi tervikluse kontroll, mitte suvaliste pahatahtlike failide täielik turvaaudit. |
| Laadimine võis jätta vana sihtkäsu/kursori aktiivseks. | Käsukontroller, valik, efektid, ulatused ja renderdusvaated tühjendatakse; kaamera läheb oma peakorteri juurde. Lõppenud salvestus kuvab tulemuse. |
| Krediidist või ruumist sõltumatu lõpptulemus võis replay kirjutamise erindi tõttu ekraanile jõudmata jääda. | Mängu lõpp kuvatakse ka siis, kui brauserisse edenemise või replay kirjutamine ebaõnnestub; mängija saab selge teate. Käsitsi salvestamine ei sõltu enam replay kirjutamise õnnestumisest. |
| HUD kustutas käsu/tagasilükkamise teate järgmisel 5 Hz uuendusel. | Lühiteade säilib viis sekundit; seejärel naasevad energia/logistika hoiatused. Salvestusnuppudel on tegelik saadavus. Järgmine kampaaniamissioon säilitab valitud fraktsiooni ning dialoogidest eemaldatakse vanad lisanupud. |
| Mereväe missioonivärk andis lisalaevale maismaal oleva HQ sihtpunkti. | Mereüksuse skriptitud ründesuund valib HQ-lähedase läbitava veepunkti. |

## Alles jäänud olulisemad puudujäägid

| Prioriteet | Puudujääk ja lõpetamise kriteerium |
|---|---|
| 1 | Üks 15–30 minuti Roheoru matš ja õpetus tuleb päriselt läbida. AI toodab/kaitseb/luurab koodis, kuid pikema matši tempo, rahapuudus ja lõppfaasi ummikud pole selle auditiga kinnitatud. Kõik 18 õpetussammu pole siin mängukäskudega järjest läbi mängitud. |
| 2 | Kitsad sillad, vastassuunalised kolonnid ja suured rühmad vajavad visuaalset jälgimist. Kohalik vältimine ja A* on olemas, aga üksiku liikumiskontrolli läbimine ei tõesta sujuvat kogu armee juhtimist. Parandused tuleb suunata konkreetsetele ummikutele. |
| 3 | Visuaalne tase on ebaühtlane. Tehnika GLB-d, geomeetriast jalavägi, tsiviilhooned ja merevägi vajavad ühtset materjali-, mõõtkava-, valgustuse- ja kaugvaate ülevaatust. Rohkem detaile iga objekti kohta võib jõudlust halvendada; vaja on loetavat siluetti ning jagatud materjale/LOD-i. |
| 4 | Multiplayer vajab kahte sama versiooniga klienti: algseis, käsud, hash, reconnect ning lõpp. Versioonide kooskõla ja serveri taastumine jäävad beta tööks. Olemasolev lockstep ei võrdu kontrollitud veebimänguga. |
| 5 | Režiimide viigi/samaaegse HQ-kaotuse reeglid ning kampaania auhindade tegelik tähendus vajavad lõpuleviimist. XP/doktriini nime olemasolu ei tõesta lahingumõju. |
| 6 | Mereväe dessant on veel eraldi pärandharu, mitte sama istmepõhine transport nagu APC/IFV. Allveelaeval pole päris sukeldumise/ASW tsüklit ega CIWS-raketitõrjet. Need on B1 lõpetamata osad, mitte valmis võimed. |
| 7 | Jõudlust on koodis vähendatud kohalike indeksite, LOD-i ja piiratud efektidega. Uue HUD-i ja laevadega tegelikku FPS-i/GPU koormust tuleb hinnata brauseris; selle paketi build ei anna uut FPS-lubadust. |

Edasine mõjusam töö on nende konkreetsete läbipääsude järgi parandamine, mitte uus üksuseroster, suurem kaart või uus mängumootor. A6 ja B1 jäävad avatuks kuni päris läbimängu tingimused on täidetud.

## Kontrollid

Kuus sihitud kontrolli: v20 save/load, vale geomeetria ja vigase üksuse tagasilükkamine, runtime-taastamise rollback/RNG, algsete missioonisihtmärkide säilimine, õpetuse tegelike seisundite kontroll ja aktiivse sammu taastamine ning replay determinism. Lisaks üks olemasolev mereväe save/load-jätku kontroll. TypeScript ja tootmisbuild. Õpetuse seisundikontroll seab mõned seisundid otse: see kontrollib hindajat ja salvestamist, mitte ei asenda mängukäskudega läbimängu. Brauseri visuaal ning pika matši läbimängimine on ootel.

## Järgnenud parandusetapp: liikumine ja taastumine

Parandatud on üles ümardatud jalajälje tõttu kitsenenud läbipääs, ID-st sõltuv möödumiskülg, piiranguta korduv ümbersõiduotsing, AI ja inseneri erinev remondilao reegel ning hõivatud inseneri ümberjagamine. Komponendikahju mõjutab AI taandumist ja on remonditav ka täis elupunktidega lennukil/laeval. Üheksa sihitud kontrolli ning build läbisid. Täpne ulatus ja alles jäänud piirid: MOVEMENT-RECOVERY-POLISH.md. Ülaltoodud pikk matš, suure kolonni visuaalne kontroll ja multiplayer jäävad avatuks.
