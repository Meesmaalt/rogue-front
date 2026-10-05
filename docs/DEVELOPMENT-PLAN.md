# Rogue Front: viimistlusest tervikliku RTS-ini

Koostatud 05.10.2026. Aluseks praeguse projekti koodi ülevaatus pärast tulejuhtimise muudatust, mitte üksnes vanade TODO-de märkeruudud. See on järgmise arenduse põhiplaan. Käesolevas töös muudetakse dokumentatsiooni, mitte mängumehaanikat.

## Suund ja ulatus

Rogue Front peab mängima taktikalise RTS-ina: luure, relva kaugus, täpsus, maastik, soomusenurk, jalaväe positsioon ja piiratud varustus otsustavad lahingu. Baas, üksuste tootmine, hoonete uuendamine ning füüsilistest rajatistest lähtuvad õhuoperatsioonid ja ressursiveod jäävad selle majanduslikuks aluseks. Wargame ja Real War on disainieeskujud; eesmärk on nende tugevuste põhjal ühtne oma mäng, mitte mõlema iga funktsiooni korraga kopeerimine.

Jätkame olemasoleva brauseri/Three.js/TypeScript/Vite arhitektuuriga. Praegune puudujääk on süsteemide kvaliteet ja ühendamine, mitte tõendatud vajadus mootor välja vahetada. Üksuste ja fraktsioonide nimekirja, majandusressursside liike ning kaartide generaatorit alpha ajal ei laiendata. Põhjendatud uued ühendused on teeliikumise käsk, hoonetesse paigutamine ja olemasolevate transpordivahendite korrektne kasutamine. Need annavad juba olemasolevatele üksustele tegeliku taktikalise rolli.

Kõigepealt üks hea 1088 × 1088 m maakaart: Roheorg. Merevägi vajab hiljem päriselt veega kaarti; praeguses Roheorus pole veealasid. Beta jaoks lõpetame ühe rannikumissiooni, eelistatult olemasoleva Murdlaine andmete põhjal. Kaardi suurendamine üksi ei ole kvaliteediparandus ; kasutaja suunisel on layout 10 mõõdukalt suurem ning üksuste tempo/mõõtkava rahulikum.

## Kontrollitud lähteolukord

„Olemas” tähendab allpool ühendust koodis. See ei tähenda, et pikk matš, brauseripilt või multiplayer oleks selle ülevaatuse käigus läbi proovitud. Varasemad buildid ja sihitud testid on kasulik alus, kuid ei tõesta veel alpha valmidust.

| Valdkond | Praegune alus | Puudujääk / järgmine otsus |
|---|---|---|
| Põhitsükkel | Setup, fraktsioon/deck, baas, tootmine, skirmish ja kampaaniakontrollerid on ühendatud. | Kõik nähtavad valikud ei ole võrdselt viimistletud. Alpha toetatud valikud tuleb selgelt määrata ja terviklikult läbida. |
| Roheorg | 1088 m, 192 kaardiobjekti, neist 85 hoonet; teed, asulad, mets ja põleng. | Viimane suure kaardi/kunsti/ringide brauseriülevaatus ning pika matši tasakaal on tegemata. |
| Maaüksuste liikumine | A*, pööramine, kiirendus/pidurdamine, kohalik vältimine ja formatsioonid. | Grupi ristmikud, kitsaskohad, peatumine ja ümberrivistumine vajavad viimistlust. A* arvestab sammupikkust, mitte teede/metsa läbimise aega. |
| Teed | Tavalise maaliikumise teeboost on ×1,22, logistilise veoki eraldi liikumises ×1,28. | Kiirema marsruudi eelistamine ja eraldi teeliikumise käsk puuduvad; kordajad pole klassipõhised. Teekonna silumine võib hiljem valitud teelt lõigata. |
| Jalavägi | Kolme fraktsiooni rollid, eri relvapesad, piiratud AT/MANPAD-moon, rühma kaotused ja mudelid. | Majadesse sisenemine puudub. Jalavägi seisab väljas; majade lähedal saadav kate ei ole garnison. |
| Vägede transport | Kopteri ja dessantaluse laadimise põhiloogika on olemas. | Load-käsk lubab ainult inf/engineer; UI valib ainult kopterit. APC/IFV ei ole ühendatud vägede veoga ning ATGM/MANPAD/luure ei saa praegust vedu üldiselt kasutada. |
| Lahing | Jagatud tabamisvõimalus, AP/soomus, relvapesad, mürsu lend, LOS, surve, moraal, komponentkahju. | Laskepositsiooni valik, peatudes sihtimine ning luurekontakti kaotamine vajavad ühiseid reegleid. Arvud ei asenda käitumise viimistlust. |
| Luure | Varjatus, liikumise/tule allkiri, mets/suits, kontaktide aegumine. | Operatiivse AI mõni sihtvalik loeb otse vastase elavaid hooneid; TacticalAI nähtavusfilter ei kõrvalda seda teistes harudes. |
| Logistika | Ressursirajatis → transport → ladu; piiratud ammo/fuel/repair; pealadu → eesliiniladu; käsitsi marsruudid. | Kahe lao tasakaal, mahupiirid, ummikud, katkenud liini taastumine ja täis lao puhul koorma käitlemine tuleb üle käia. |
| Õhuvägi | Oma baas, parkimine, rada/plats, õhkutõus, missioon, RTB ja piiratud laadimine. | Lõpetada baasi kadumise, tühja lao, stardijärjekorra ja eri AA-threat olukorrad. Uut missioonisüsteemi ei alustata. |
| Artillery | Kaudtuli, salvo, päris mürsk, vaatleja/intel ja counter-battery alus. | Kontrollida ühise min/max ulatuse kasutust igas AI/mission harus ja koordinaattule hajuvuse loetavust. |
| Uuendused | Hoonetasemed muudavad tootmist, unlock'e ja võimekust; weapon/range lippe kasutatakse lahingus. | Armor-uuendus lisab praegu HP-d, aga armorValue ei muuda soomusväärtusi selle lipu alusel. Hind, UI ja tegelik mõju tuleb ühtlustada. |
| Tootmisandmed | Faction definition jõuab spawn'i ja materjalikulusse. | Tootmise lõppkontroll kasutab endiselt UNITS[kind].buildTime; see peab kasutama sama lahendatud definitsiooni nagu muu tootmine. |
| Merevägi | Laevatehas, viis laevatüüpi, meredomeen ja relvapesad olemas. | moveSeaTo ei kontrolli veeteed/rannikut. Laev sünnib üldisel tootja väljumispunktil. Mõni laev kasutab ATGM-profiili; see ei ole lõpetatud kaugmaa mererakett. |
| Tuumarelvad | Vastavat töötavat tüüpi/ehitus- ja lasketsüklit ei leitud. | Uus strateegiline süsteem, mitte mõne olemasoleva faili aktiveerimine. Edasi lükatud kuni taktikaline alus ja merevägi töötavad. |
| Save/MP/kampaania | v19 täissalvestus, hash/replay, lockstep/reconnect ja viie sõlmega kampaania alus. | Uus garnison/teekäsu/mereseisund peab kohe jõudma save'i/hash'i. Multiplayeri ja kogu kampaaniatee valmidust ei kinnitata üksnes koodi olemasolu põhjal. |

Vanad TODO „tehtud” märkeruudud kirjeldavad sageli rakendatud alust. Need ei tõenda mängitavust. Arhitektuuridokumendis on ajaloolisi 640 m/layout-versiooni ning varade arvu kirjeldusi; uus ülevaade ja kood on hetkeseisu alus.

## Tööjärjekord ja lõpetamise tingimused

Iga tööpakett peab muutma mängus nähtavat käitumist, kasutama olemasolevat käskude/simulatsiooni/renderduse ahelat ning sisaldama vastavat UI-d. Järgmise paketi alustamise alus on eelmise konkreetne tulemus, mitte lisatud failide või funktsioonide arv. Kunsti, juhtimise ja jõudluse parandused tehakse sama paketi sees.

### A1 — ühised reeglid ja katkiste ühenduste parandus

Eesmärk: mängus kuvatud andmed, tootmine ning lahing ei räägi erinevat lugu.

- Ühtlustada lahendatud fraktsiooniandmed, tootmise hind/materjalikulu/kestus, efektiivne soomus, maksimum-HP ja relvaandmed.
- Parandada armor-uuendus päriselt soomust mõjutavaks andmepõhiseks uuenduseks. HP/soomuse erinevus peab jääma selgeks; remont ja HP-riba ei tohi kasutada vastuolulist maksimumi. Olemasolev research/strategy peab avama päris võimekuse ning ost olema UI-s nähtav koos hinna, eeltingimuse ja mõjuga; peidetud Command-lipp ei ole valmis tehnoloogiasüsteem.
- Käia läbi kõik range/minimumRange tarbijad, sh auto-acquire, AI, laskepositsioon, kaudtuli ja HUD. Säilitada teadlik erinevus luureulatuse ja laskeulatuse vahel.
- Defineerida ühine teeliikumise/maastiku profiil üksuse klassi järgi. Väärtused JSON-i, sama arvestus kiiruses ja marsruudi hinnas.
- Hoida katkendunud kontakti puhul viimane teadaolev asukoht eraldi elava üksuse koordinaatidest. Otsene lask vajab kontakti; kaudtuli saab kasutada piiratud vanusega intelit.

Lõpetatud, kui ühe olemasoleva fraktsiooniüksuse tootmis- ja uuendusandmed vastavad päris tulemusele ning UI selgitab vähemalt moona, ulatuse, LOS-i ja seisundi tõttu keelatud lasku ilma peidetud infot avaldamata.

Puudutatavad kohad: sim/units.ts, World.ts, systems/production.ts, combat.ts, units.ts, projectiles.ts, sensors.ts, Hud.ts, JSON-andmed. Ära loo teist paralleelset stats-arvutust.

### A2 — teed, grupiliikumine ja transport

05.10.2026: koodi ühendused ja sihitud Roheoru värava/asula kontroll on tehtud; vt [A2 ülevaade](A2-MOVEMENT-TRANSPORT-RELEASE.md). Brauseri visuaalne ülevaatus ja pika matši hindamine on veel ootel. Allolev kirjeldab etapi eesmärki ja lõpetamiskriteeriume.

Eesmärk: käsk liigub usutavalt läbi asula ja metsa, mitte lihtsalt sihtpunkti poole.

- Lisada „Kiirelt teed mööda” käsk: üksus valib väiksema eeldatava sõiduajaga tee, ka siis, kui see on pikem. Tavaliikumine, kiirliikumine ja ründeliikumine jäävad eri eesmärgiga käskudeks.
- A* hind arvestab klassi, teed, metsa ja nõlva. Teekonna silumine säilitab soovitud teekoridori; heuristika ei tohi üle hinnata parimat läbimisaega.
- Ristmikul ja kitsas tänavas moodustada kolonn, teiselt poolt taastada formatsioon. Vähem pidevat ümberotsimist, külgsuunalist tõmblemist ja sihtpunktis rühma hunnikusse surumist.
- Laskepositsiooni saabumisel pidurdada, pöörata ja tulistada relvapõhiste liikumispiirangute järgi. Kiirliikumine ei peatu omaalgatuslikult sihtmärgi ründamiseks.
- Ühendada olemasolevad APC/IFV ning taktikakopter jalaväe veoga. Sobivus põhineb rühma/istmete arvul, mitte ainult kahel kind-nimel; luure, ATGM ja MANPAD vajavad tegelikku transporti.
- Laadimine kogub rühma sobivasse kohta, mahalaadimine leiab navigeeritava vaba ala. Vältida reisijaid hoone sees/vees ja transpordi lõputut ootamist; laaditud üksus ei tulista ega valluta punkti.

Lõpetatud, kui 12–20 eri maaüksusega grupp läbib Roheoru baasi/asula tee ja saabub ilma püsiva ummikuta; pikem tee annab sobivale sõidukile tegeliku ajavõidu; ATGM/MANPAD-rühm saab APC või kopteriga sõita ning navigeeritaval alal väljuda. Numbrid on väike kontrollolukord, mitte väidetud praegune võimekus.

Puudutatavad kohad: nav/NavGrid.ts, Pathfinder.ts, systems/commands.ts, units.ts, types.ts, CommandController.ts, Hud.ts, mobility.json, SaveState.ts, Replay.ts, UnitRenderer.ts.

### A3 — jalavägi majades ja toimiv linnalahing

05.10.2026: mängutsükli ühendused ja kolm sihitud A3 kontrolli on tehtud koos nelja A2 regressioonikontrolliga; vt [A3 ülevaade](A3-GARRISON-RELEASE.md). Brauseri visuaalne ülevaatus, FPS ja multiplayer on ootel. Allpool on etapi eesmärk ja lõpetamiskriteeriumid.

Eesmärk: olemasolevad Roheoru majad muutuvad taktikalisteks positsioonideks.

- Määrata sobivatele tsiviilhoonetele sissepääs, rühmade mahutavus ja piiratud laske-/vaatepunktid. Kõik tehased ja ressursirajatised ei ole garnisonihooned.
- „Sisene” viib rühma ukse juurde, määrab hoonekoha ja kuvab hõive. „Välju” leiab vaba nav-punkti. Klikk ei teleporteeri mehi tänavalt majja.
- Hoonest toimivad samad relvapesad, moon, min/max kaugus, tabavus ja moraal. AT rakett vajab sobivat avatud laskesuunda; Stinger/MANPAD vajab õhusihtmärgile sobivat ava või katusepositsiooni ja kontakti.
- Lahendada laskepunkti enda hoone kokkupõrge ning vastase pihta minev LOS samas simis. Hoone sees olemine ei luba tulistada läbi kogu asula ega anna täielikku nähtamatust.
- Garnisoni märgatavus sõltub luurest ja tulistamisest; vaenlase täpset rühmaarvu ei avaldata ainult hõivemärgi tõttu. Luure ja optika loetakse tegelikust vaatepunktist.
- Anda garnisonile kate, aga säilitada HE/suppression oht. Hoone kahjustus, kasutuskõlbmatuks muutumine ja väljumine peavad mõjutama seesolijaid. Alpha jaoks piisab hoone seisunditest terve/kahjustatud/kasutuskõlbmatu; täielik killupõhine purunemine pole vajalik.
- Garnison on oma seisund, mitte cargo oleku väärkasutus: transporditud rühm ei tegutse, garnison aga näeb ja tulistab. Viited, hõive ja järjekord kuuluvad save/hash'i.

Lõpetatud, kui jalavägi siseneb ja väljub majast, AT laseb nähtavat soomust sobivast avast, MANPAD laseb nähtavat õhusihtmärki sobivast positsioonist ning HE või hoone kaotus mõjutab rühma. Salvestus taastab sama hõive ja moona. Läbi kõrvalmaja laskmist ega tasuta lisarelvi ei ole.

Puudutatavad kohad: World, Entity/Command tüübid, mapFeatures, commands/units/combat/projectiles/sensors/Vision, terrain/building render, picker/HUD, SaveState/Replay. Uus väike hooneseisundi moodul võib olla põhjendatud, kuid see peab kohe töötama World.tick'is.

### A4 — logistika, baas ja õhuoperatsioonid lõpuni

05.10.2026: koorma säilimise, mahupiiride, tankimise, tootmise taastumise ja lennurajatiste katkestuste ühendused on tehtud; vt [A4 ülevaade](A4-LOGISTICS-AIR-RELEASE.md). Sihitud simulatsioonikontrollid ei asenda veel ootel brauseri, pika matši ja multiplayeri ülevaatust.

Eesmärk: olemasolev füüsiline majandus on arusaadav ja katkestustele reageeriv.

- Sulgeda ahel ressursirajatis → veok/kogumiskopter → pealadu → konvoi → FOB → üksuse moon/kütus/remont. Veoladu ei tekita edasisaatmisel uut tulu.
- Ühtlustada ammo/fuel/repair mahud, koorma üleandmine ning täis lao korral ootus/tagasivedu. Saabumine ei tohi teha varu nähtamatult olematuks ega anda sama tarnet kaks korda.
- Näidata allikas, siht, koorem, marsruut, oote/katkestuse põhjus, laovarud ja tootmise täpne peatuse põhjus. Ohuteade kasutab nähtavat/teadaolevat ohtu.
- Kütuseta veok vajab mõistlikku pääste/varustuslahendust; liini taastamisel jätkub töö. Tee katkestusel uus marsruut või selge ootamine, mitte kaardist läbi sõitmine.
- Eesliiniladu ei anna piiramatut remonti. Hoone tasemed muudavad tegelikke mahte ja teenindust; UI näitab enne ostmist, mis muutub.
- Lõpetada lennubaasi stardijärjekord, baasi kaotuse alternatiiv, katkine rada/keelatud õhkutõus, ammo/fuel puudus ja RTB. Õhus ümberlaadimist ega tasuta kaugremonti ei lisata.

Lõpetatud, kui ühe nähtava tarneahela lõhkumine põhjustab varude ammendumise, tootmise aeglustumise/peatuse ja rindel väiksema suutlikkuse ning parandatud ahel taastab töö. Üks sortie algab oma rajatisest ja lõpeb seal reaalse varukulu ning laadimisajaga.

Puudutatavad kohad: World logistika, units.ts, tacticalSupply.ts, production.ts, construction.ts, airDoctrine.ts, logistics.json, Hud/Minimap/Overlay/ResourceSites, SaveState/Replay.

### A5 — aus AI ja üks tasakaalus skirmish

05.10.2026: luure-, reservi-, taastumise ja ostureeglite koodiühendused ning sihitud kontrollid on tehtud; vt [A5 ülevaade](A5-AI-SKIRMISH-RELEASE.md). Pika matši tasakaal ja brauseri läbipääs on veel ootel, mistõttu alpha valmisolekut ei kuulutata.

Eesmärk: vastane mängib sama mängu ja kasutab eelnevaid parandusi.

- Ühtlustada WaveAI/TacticalAI käsu- ja intel-allikas. Kõrvaldada peidetud elavate hoonete järgi logistika ründamine; teadaolev algbaasi asukoht ja vana kontakt ei ole piiramatu elav luure.
- AI luurab, hoiab olulisi maju/teekoridore, kaitseb oma varustust, toob reservi, kasutab kaudtuld ja väljub halvast lahingust. Ei ehita uut AI-mootorit olemasoleva kõrvale.
- Parandada tühja põhirelva, kuid täis lisarelva tõttu ekslik taandumine; taganemisladu peab päriselt varustama.
- Arvestada hoonet, maastikku, relvade sobivust, lennubaasi ja tuntud AA-d. Taandumine ei tähenda õhusõiduki suunamist lihtsalt HQ koordinaadile.
- Tasakaalustada olemasolevad rollid ja hinnad: infantry/AT/recon/MANPAD, APC/IFV/tank, artillery, logistics, air. Igal rollil on ülesanne ja vastumeede; uut rosterit pole vaja.
- Alpha põhimatš: Roheorg + Conquest, lisaks HQ hävitamise skirmish. Ülejäänud režiimide olemasolevaid lõputingimusi ei loeta selle põhjal kõiki viimistletuks.

Lõpetatud, kui vastane saab sama majandusega armee kokku, luure mõjutab valikut, varustuse lõhkumine muudab otsuseid ning matš jõuab selgelt võidu või kaotuseni. Ühe skriptitud armee edasirünnak ei ole piisav.

### A6 — mängitav maalahingu alpha

Eesmärk: korraga üks terviklik kogemus.

- Menüü näitab toetatud fraktsioone/decke, algbaasi valikut, kaarti ja reegleid. Töötamata valikut ei esitata valmis mängurežiimina.
- Lühike õpetus samal Roheoru kaardil: tootmine/uuendus → tee ja transport → maja/mets/luure → varustus → lahing → võit/kaotus. Vajadusel kohandada olemasoleva tutorial-logistics missiooni ülesandeid, mitte alustada uut kampaaniamootorit.
- Sama mängu saab salvestada, laadida ja jätkata. Näidata kaardi/buildi sobivust; uus seisund vajab ühilduvust või selget keeldumist, mitte vaikset kaardisegu.
- Viimistleda olemasolevaid maju, jalaväe liikumisanimatsiooni, rattaid/roomikuid ja relvade efekte. Ukse-/laskeavad vastavad kasutatavatele sim-punktidele; fraktsioon ja roll on kaugelt loetavad.
- Näidata olulised arvud lühidalt, detailid avatavas kaardis. Ikoonid ja käskude tagasiside aitavad otsustada, mitte ei peida juhendeid kümnesse paneeli.
- Hoida LOD, materjalide jagamine, piiratud efektid ja ulatusringide cache. Profileerida ainult tuvastatud kitsaskohti: suure kaardi A* puhvrite korduseraldus, korduvad üksuste/kaardi läbimised, vari/lehestik/UI.

Alpha läbipääs: fraktsioon/deck → baas → hõive ja ressursivedu → tootmine/transport → metsa- ja majalahing → artillery/air → kaotused/remont → victory/defeat. Puudub mängu peatav viga ja iga paketi valmimistingimus on täidetud. 15–30 min esinduslik matš ning save/load ei vaja arendaja käsitsi sekkumist. Seda kontrolli tehakse milestone'il, mitte iga väikese muudatuse järel.

Alpha ei tähenda veel valmis mereväge, tuumarelvi, kogu kampaaniat ega tõestatud kõigi arvutite jõudlust. Alpha siht on usaldusväärne maalahing, mitte ainult arenduspaketile pandud nimi.

### B1 — olemasolev merevägi ja rannikumissioon

Alustada pärast alpha läbipääsu, mitte maaüksuste arvelt. Kasutada olemasolevaid laevu, merehooneid ja Murdlaine missiooni alusandmeid.

- Teha päris vee- ja kaldapiirid, veedomeeni navigeerimine ning vees olevad sadama sünni-/varustuspunktid. Laev ei liigu maismaale; maavägi ei sõida vette. Dessant kasutab määratud ligipääsetavat kaldapunkti.
- Ühendada dessantalus samade rühma-/mahureeglite ja turvalise väljumisega; laevade pidurdus/pöörderaadius/separation olemasolevasse liikumisse.
- Asendada laeva ATGM-silt tegeliku sobiva mererelva profiiliga. Eristada suurtükituletoetus, laevavastane rakett ja maismaasihtmärgi kaugmaa rakett. Kõik kasutavad lõplikku moona, kontakti/missioonipunkti, lendavat mürsku ja varustust.
- Kaugmaa raketi vastu peab olema mõistlik vastumeede: radar/luure, sobiv olemasolev õhutõrje, allika ründamine või liikumine. Püüdmissüsteem tuleb päriselt siduda mürsu ja laskemoonaga; tavalist aircraft-only AA-d ei saa lihtsalt valmis raketitõrjeks nimetada.
- Üks rannikumissioon ühendab maaväe, dessandi, baasi/logistika ja laeva tuletoetuse. Mereväe AI ning lõputingimused töötavad samal kaardil.

Lõpetatud, kui toodetud laev sünnib ja liigub vees, veab/laeb varustust oma sadama kaudu ning kaugmaa rakett saab pärast reaalset lendu sihtmärki mõjutada. Rakettide mõju ja võimalik tõrje on nähtavad ning finite-ammo põhimõte säilib.

### B2 — beta: valitud režiimid, kampaania ja multiplayer

- Lõpetada olemasolevad Conquest, Breakthrough, Attrition ja Assault: selge ründaja/kaitsja, ajapiir, skoor, HQ-kaotus ja viigireegel. Praegused reeglid on koodis, aga iga režiim vajab mängijale arusaadavat tervikut.
- Vähemalt kolm järjest mängitavat kampaaniamissiooni: õpetus/logistika → maalahing → rannik/ühisoperatsioon. Olemasolevad viis sõlme jäävad alusmaterjaliks; auhinnal/doctrine'l peab olema nähtav mõju või aus infomärge.
- 1v1 samade toetatud kaardi/reeglite ja versioonidega: faction/deck, commands, hash, victory/defeat, piiratud reconnect. Kasutaja tuleb valida tagasi mängu või näidata selget lõppu; serveri taaskäivituse järel jätkamist ei lubata enne serverisnapshot'i olemasolu.
- Save/replay/hash hõlmab garnisoni, transpordimahtu, teerežiimi, mereüksust ja strateegiliste mürskude olekut. Renderduse efektid ja UI lülitid jäävad deterministlikust simist välja.
- Tasakaal ja veaparandused tõelise mängija tagasiside järgi; vajadusel üks sihitud mõõtmine representatiivsel riistvaral.

Beta läbipääs: alpha tingimused + üks lõpetatud rannikumissioon, töötavad valitud režiimid ja kampaaniatee, vähemalt üks terviklik kahe kliendi 1v1 ning taastatavad salvestused. „Kõik olemasolevad failid kompileeruvad” ei ole beta.

### C — strateegiline relvastus ja tuumarežiim

See soov jääb plaani, kuid ei ole alpha/beta blokeerija. Teha pärast kaugmaa mererelvade ja vastumeetmete lõpetamist eraldi valitava strateegilise reeglistikuna, vaikimisi väljas.

Väikseim terviklik teostus: selge research-eeltingimus → päris tootmishoone või sobiv launcher → pikk ja kallis lõhkepea tootmine → piiratud hoidmine → luure/missioon ja käivitusaeg → nähtav raketi lend/hoiatus → võimalik vastumeede → plahvatus/kahju → olemasolev victory/defeat. Kulud, aeg ja oht peavad jätma vastasele võimaluse reageerida; mitte ühe nupu tasuta kogu kaardi hävitamine. Salvestus ja multiplayer saavad sama seisundi kohe. Esialgu ei lisata kiirguse majandust, kümneid uusi hooneid ega uut strateegilist kampaaniat.

Lõpetatud, kui mõlemad mängijad saavad reeglist aru, tootmis-/luure-/varustusnõuded mõjutavad relva kasutamist ning konventsionaalne armee jääb vajalikuks. Kui see rikub põhimängu, jääb see erirežiimi ega asenda põhivõidu tingimusi.

## Arenduse ja kontrolli tööviis

Üks tööpakett korraga. Alusta World/Entity/Command → olemasolev sim → andmed → render/UI → save/hash tarbijatest. Uut moodulit võib luua ainult koos tegeliku ühendusega. Simulatsioon jääb 30 Hz, RNG külvatuks; sim ei kasuta Three.js/DOM-i ega kaadriaega. Ära lisa kogu mängu rigidbody-füüsikat: navigeerimine ja kinemaatika on RTS-i jaoks õige alus, kuni konkreetne vajadus tõestab muud.

Iga paketi raport: mis käitumine muutus, mida sai nüüd mängus teha, mida kontrolliti ja mis jäi lahtiseks. TODO-s „tehtud” tähendab valmimistingimust, mitte ainult kirjutatud koodi. Planeeritud või osaliselt ühendatud võimekust ei raporteerita valmis funktsioonina.

Testimine on väike ja riski järgi. Muudetud koodi build/typecheck; simulatsioonimuudatusele tavaliselt 1–3 sihitud kontrolli (kulu/mahupiir, lasu piir, ühe käsu käitumine, lühike save/hash jätk). Kunstimuudatusele build ja visuaalne ülevaatus. UI, liikumise ja visuaalide puhul on lühike brauserikontroll vajalik, sest koodist ei selgu tõmblemine, tekstisuurus ega mudeli loetavus. Pikk matš ja kaks multiplayer-klienti kuuluvad alpha/beta läbipääsu juurde, mitte iga paranduse juurde. Kui brauserit pole võimalik kasutada, märgi see kontrollimata; ära kinnita valmidust oletuse põhjal.

Jõudluse eesmärgid kinnitatakse pärast üht väikest võrdlusmõõtmist: sama kaart, üksuste hulk, graafikaseade ja seade enne/pärast. Soovituslik siht on sujuv 60 fps tavavaates ja stabiilne 30 Hz sim; see pole praegu mõõdetud lubadus. Arendus ei tohi lisada iga üksuse kohta alalisi efekte/ulatusvõrke ega käivitada A* otsingut iga tick'i jooksul. Varasema hea jõudluse kohta antud kasutaja tagasiside säilib lähtekohana, kuid ei asenda regressiooni korral mõõtmist.

Uut fraktsiooni, üksuste nimekirja, ressursiliiki, kaarti või eraldi süsteemi lisame ainult siis, kui see eemaldab käimasoleva paketi põhilünga. Tuumarežiim, uus campaign branch, suurem world ja mahukas graafikamootori vahetus ei tule enne lõpetatud alusmängu.

## Järgmine konkreetne samm

Alustada A1-st: ühised efektiivsed üksuseandmed, armor-uuenduse päris mõju, fraktsioonipõhine tootmise lõpptingimus ning ulatuse/maastikukiiruse tarbijate korrastus. Seejärel A2: kiire teeliikumine, gruppide läbipääs ja olemasolevate APC/IFV/kopterite transport. A3 annab hoonetesse sisenemise ja sealt võitlemise. Neid ei kuulutata juba tehtuks varasemate liikumise/relvaandmete paranduste põhjal.

Praktiline sõltuvusjärjekord: A1 → A2 → A3 → A4 → A5 → A6/alpha → B1 → B2/beta → C. Kõigepealt parandame vastuolulise alusreegli; siis lisame puuduvad taktikalised ühendused; seejärel viime terve matši mängitavaks.

## Koodiülevaatuse tugipunktid

- `src/main.ts`, `src/sim/World.ts`: ühendus ja tick, logistika, hoonetasemed, runtime.
- `src/sim/units.ts`, `src/data/faction-loadouts.json`, `weapon-profiles.json`: lahendatud roster ja relvapesad.
- `src/sim/nav/Pathfinder.ts`: ühtlane sammukulu ja silumine; `systems/units.ts`: eri tee-boonused, liikumine, transport, moveSeaTo.
- `src/sim/systems/commands.ts`, `src/input/CommandController.ts`: load-kind piirang, UI transpordivalik, upgrade-lipud.
- `src/sim/systems/combat.ts`, `projectiles.ts`, `artillery.ts`, `sensors.ts`, `Vision.ts`: range/AP/accuracy, LOS, trajektoor ja intel.
- `src/sim/systems/production.ts`, `tacticalSupply.ts`, `airDoctrine.ts`, `construction.ts`: piiratud tootmine/varustus/remont ja baasitsükkel.
- `src/sim/ai/WaveAI.ts`, `TacticalAI.ts`: operatiivne sihtvalik ja nähtavusfiltrid.
- `src/data/maps/green-valley.json`: 1088 m maakaart, 85 kaardihoonet, puuduvad veeobjektid.
- `src/sim/gameModes.ts`, `campaign.ts`, `Mission.ts`, `src/data/missions`: olemasolevad reeglid ja missioonialused.
- `src/sim/SaveState.ts`, `Replay.ts`, `src/net`, `server/server.js`: jätkamine ja determinismi tarbijad.
- `src/render/UnitRenderer.ts`, `RangeOverlay.ts`, `Architecture.ts`, `Terrain.ts`, `Fx.ts`, `src/ui/Hud.ts`: mängijale nähtav teostus ja piiratud renderduskoormus.
