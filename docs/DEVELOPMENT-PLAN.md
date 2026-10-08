# Rogue Front: viimistlusplaan kasutatava alpha ja beta jaoks

Uuendatud 08.10.2026, alus `main` pärast PR #1. See dokument asendab varasema A1–A5 teostusplaani aktiivse tööjärjekorrana. Vanade pakettide ajalugu jääb TODO ja nende release-dokumentidesse. Tänane töö muudab plaani, mitte mängu käitumist.

## Eesmärk ja hetkeseis

Esimene kasutatav väljalase on brauseris mängitav ühe mängija taktikaline RTS: Roheorg, Conquest ja lühike õpetus. Wargame'i taktika ning Real Wari baas, tootmine, füüsiline varustus ja rajatistest lähtuv õhuvägi moodustavad ühe läbimängitava süsteemi. Alpha põhivalikusse võtta kaks olemasolevat fraktsiooni ja nende toimivad valmisdeckid; kõik ülejäänud valikud säilivad, kuid jäävad esialgu eksperimentaalseks. See on kavandatud ulatus, mitte juba tehtud menüümuudatus.

Koodis on juba grupiliikumine/teekäsk, garnison, APC-transport, recon/LOS, mitmerelvaline lahing, piiratud varud, tootmine/uuendused, artillery, õhuoperatsioonid, AI, save/load ja võidukontrollerid. Roheorg on layout 13 ja Murdlaine layout 3. PR #1 parandas kopteri pidurdamisliikumist/saabumist, tõstis kopterikiirust ning lisas metsa kaugvaate LOD-i. Neid süsteeme ei ehitata uuesti ainult uue etapinime pärast.

Veel tõendamata: päris brauseri FPS ja visuaal, suure rühma usaldusväärne juhtimine, pika lahingu majanduse/AI tempo, õpetuse täielik läbimine, kasutaja vaates salvestusest jätkamine ja kahe kliendi matš. Varasemad buildid ning sihitud kontrollid ei tõesta neid automaatselt. Viimati teatatud deploy 500 faili piir tuleb samuti lahendada või kinnitada kõrvaldatuks; see oli välise sünkroonija piir, mitte puuduv Compose-fail.

## Tööjärjekord

| Pakett | Konkreetne töö | Lõpetamise tingimus |
|---|---|---|
| V1 — jõudlus ja käivitus | Kinnitada õige versiooni deploy; mõõta ühe brauseri stseenis CPU/GPU/UI koormus; parandada suurim tuvastatud kitsaskoht. Võrrelda lähi- ja kaugvaadet, metsa/linnu, mürskude/varjude koormust. Kontrollida viimase kopteri- ja metsa-LOD paranduse nähtavat tulemust. | Menüü → Roheorg avaneb; kvaliteedivalikud töötavad. Dokumenteeritud võrdlus enne/pärast samal masinal, resolutsioonil ja stseenis. Pole korduvat hangumist ega eelarve ületamise tõttu aeglustuvat simulatsiooniaega. |
| V2 — juhtimine ja lahingu tunnetus | Viimistleda 12–24 üksuse grupikäsk, teed/sillad, peatamine, vahepunktid ja vastassuunalised kolonnid. Ühtlustada jalaväe sisenemine/väljumine ja APC laadimine. Lahendada avastatud juhtumid, kus üksus jookseb vaenlase sisse, jääb enne sihti seisma või ei selgita laskmata jätmist. Õhuväel kontrollida manöövrit, rünnakut ja EVAC/RTB-d. | Üks ette määratud marsruut läbi küla, silla ja metsa ning sellele järgnev lahing läbitakse tavaliste käskudega. Üksused ei vaja korduvat päästvat klõpsimist; nähtav ulatus, LOS ja laskmisolek vastavad tegelikule käitumisele. |
| V3 — majandus, logistika ja AI tempo | Läbida olemasolev ressursirajatis → vedu → ladu → tootmine → FOB → eesliin. Kontrollida lao täitumist, veoki kaotust, ümbermarsruutimist, varude lõppemist ja taastumist. Häälestada olemasolevaid hindu, tootmisaegu, algvarusid ja AI reserve/rünnakuintervalle; mitte lisada uusi ressursse. | Baas kasvatab armee, rindele jõuavad tegelikud varud, katkestus mõjutab võitlusvõimet ja tarne taastamine taastab tegevuse. AI survestab ja kaitseb eesmärke ning ei jää matši kestel majanduslikult seisma. |
| V4 — selge UI ja ühtne kaart | Roheoru teede/sildade/majade/metsa viimane kompositsiooniparandus. Käsud, ehitus/tootmine, valikuinfo ja teated loogiliselt eraldatud; kitsas HUD, klassiikoonid ja kaugvaate nimed. Üksuse lühikaardil roll, relvad, ulatus, AP/armor, ammo/fuel; detailid avatavad. Sama valgus/mõõtkava/materialitase, arusaadavad relvaefektid ja helid. | Tavategevus ei nõua peidetud käsu otsimist; vaenlast, enda üksust ja kontaktimälestust saab eristada. Kaugvaates on juhtimine loetav; lähivaates pole segavaid hõljumisi, tugevaid LOD-hüppeid ega teede läbivaid hooneid. |
| V5 — õpetus, salvestus ja alpha väljalase | Viimistleda olemasoleva õpetuse tegelikult blokeerivad sammud ja selgitused. Salvestada/jätkata tootmise, konvoi ja õhumissiooni ajal. Lõpuekraan, taasalustus ja menüüsse naasmine. Menüü põhi- ja eksperimentaalsete valikute eristus. Lõpetada A6 alloleva alpha värava alusel. | Uus mängija jõuab ilma arendaja abita esimese lahinguni. Esinduslik 15–30 min Roheoru matš lõpeb võidu või kaotusega; salvestusest saab jätkata; pole mängu peatavat viga. |

V1 alustab lühikese tegeliku vaatluse ja mõõtmisega, mitte uue optimeerimiskihi kirjutamisega. Kui nähtav juhtimisviga takistab mõõtestseeni või mängimist, parandatakse see kohe. V4 väiksemad UI/visuaaliparandused tehakse ka V1–V3 sees, kui need aitavad sama probleemi lahendada. Uut suurt teemat enne käimasoleva paketi lõpetamist ei alustata.

## Alpha väljalaske värav

Kõik allolevad tingimused peavad olema täidetud, enne kui A6 märgitakse tehtuks:

- [ ] Tavakasutaja saab valida toetatud fraktsiooni/decki, käivitada õpetuse või Roheoru Conquesti ning hiljem menüüsse naasta.
- [ ] Üks esinduslik 15–30 minuti matš hõlmab baasi/uuendust, ressursivedu, tootmist, recon'i, maja-/metsalahingut, transporti, artillery't või air support'i, remonti ja võitu/kaotust.
- [ ] Grupi juhtimine ja õhuväe tagasikutsumine ei vaja arendaja sekkumist; mittetoimiva käsu või lasku takistava seisundi põhjus on nähtav.
- [ ] Salvestus → lehe uuesti avamine → jätkamine säilitab matši; sobimatu vana salvestus annab selge teate ega riku käimasolevat mängu.
- [ ] Võit ja kaotus kuvavad tulemuse ning uut mängu saab alustada ilma lehe käsitsi parandamiseta.
- [ ] Jõudlus on mõõdetud dokumenteeritud võrdlusmasinal: esialgne siht vähemalt 30 FPS 1080p keskmisel kvaliteedil, umbes 100–150 aktiivse üksusega tavalahingus. Märkida ka 95. protsentiili kaadriaeg; eesmärk kuni 33 ms, ilma korduvate üle 100 ms jõnksudeta. Need on sihid, mitte juba saavutatud tulemus ega kõigi arvutite garantii.
- [ ] Simulatsiooni aeg ei jää tavalahingus seinaajast püsivalt maha. Efektide/objektide arv ja mälu ei kasva lõpetatud lahingute või uuesti laadimiste järel piiramatult.
- [ ] Pole teadaolevat mängu peatavat viga: käivituse tõrge, püsiv käsuummik, lõputu õpetussamm, riknev salvestus või kättesaamatu võidutingimus.

Riistvara, brauser ja resolutsioon lisatakse mõõtmise juurde. Kui sihtmasin ei suuda soovitud kvaliteeti, parandatakse kallist kohta või valitakse madalam vaikimisi kvaliteet; sim-sammu ja lahingureegleid ei muudeta FPS-i varjamiseks.

## Pärast alpha väravat: beta

1. **Murdlaine lõpetamine (B1):** olemasolev rannikumapp, selged sadama-/maismaa-/merekoridorid, laevade tootmine/varustus, luure ja ranniku õhutõrje. Üks rannikumissioon päriselt võidetav ja kaotatav; laevad ei lõika läbi maa ning sadamate kaotus mõjutab tegevust. Merevägi on juba koodis, töö on viimistlus ja läbipääs.
2. **Multiplayer ja režiimid (osa B2):** kaks klienti, lobby/deck/algseis, üks terve matš, ühenduskatkestus ja lubatud taastumine, desünkrooni selge käsitlus. Seejärel Conquest, Breakthrough, Attrition ja Assault: eraldi üks võidu- ja üks kaotusejuhtum režiimi kohta.
3. **Kampaaniatee (ülejäänud B2):** üks algusest järgmiste missioonideni ulatuv lõpetatav tee, edenemise salvestamine ja lõpetusekraan. Beta eeldab seda teed ning eespool kirjeldatud mere-/võrgumängu läbipääsu, mitte kõigi võimalike kaartide/fraktsioonide ühtlast tasakaalu.

Enne alpha't ei laiendata rosterit, kaardigeneraatorit, tuumarelvi ega keerukat uut füüsikamootorit. Uue mudeli või efekti lisamine on põhjendatud, kui see parandab olemasoleva üksuse äratuntavust või parandab samas paketis nähtavat viga. Kaardi suurendamine ei ole eraldi prioriteet.

## Tööviis ja edenemise arvestus

Iga pakett annab mängus nähtava muudatuse, väikese PR-i ja lühikese ülevaate: parandatud probleem, kontroll ning alles jäänud piirang. PR mergitakse pärast asjakohaseid kontrolle; eraldi kasutaja kinnitust pole vaja. Suurt täistestide ringi ei tehta iga kosmeetilise muudatuse järel. Simulatsiooni muutusel kontrollitakse mõjutatud käitumist ja vajadusel save/replay determinismi, muu puhul piisab build/typecheckist ja konkreetsest vaatlusest.

Üks lõpetav päris matš tehakse alpha väraval, mitte iga paranduse järel. Koodi lugemisega ei saa kinnitada juhtimise tunnetust ega brauseri FPS-i; seetõttu on see väike tegelik kontroll kasutatavuse osa. Kuupäevalist lubadust ei anta enne esimest jõudlus- ja mänguvoo vaatlust: kitsaskohad ja välise deploy valmisolek määravad töömahu.

Oleku märgendid: **teostatud** = ühendatud kood; **kontrollitud** = vastav konkreetne juhtum läbitud; **väljalaskekõlblik** = kogu värav täidetud. Varasemaid funktsioone ei pakuta uuesti puuduvana ilma uue vea tõendita.
