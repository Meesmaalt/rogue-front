# Aktiivne viimistlusjärjekord — 10.10.2026

## Kiirliikumine, ligipääsetav algkoosseis ja energiabilanss · 16.10.2026

- [x] Esimene kiirliikumise käsk kasutab õiget režiimi juba marsruudi arvutamisel. Rataste/roomikute päris tee-kiirus ja sama A* kulu, teekeskme eelistus ning maastiku revision'iga uuenev vahemälu. Tee lähijälgimine, haardumisest piiratud kurvikiirus ja möödutud vahepunktide jätkamine hoiavad marsi sujuvama; parkimis-/kogunemiskohtade manööver säilib.
- [x] Kasarmust eemaldatud lähedase varustuslao nõue ja tootmise peidetud moona/kütuse lisakulu. Rahvuslik hind, juhtimisühendus, elekter ning hoonetase kehtivad.
- [x] Kasarmu 1. taseme 12 kohaga ostetav relvastamata jalaväekaubik. Kopteribaasi 1. taseme kerge relvastamata luurekopter; tehase 1. taseme luuremasin ja eraldi lubatud ATGM-meeskond kasarmu 2. tasemel kõigil rahvustel (USA TOW-2).
- [x] Esimese taseme laiem algvalik, paremate üksuste selge 2./3. taseme tabel ja vastavad hoone uuenduse tekstid. Lennujaama 1. tase saab toota põhihävitajat oma baasvarudega; strateegiahoone pole enam iga täiustatud üksuse lisalukk.
- [x] Hoonete energiatarve +30%, uuendused lisavad 20% baasist taseme kohta. Alguses piisab ühest generaatorist; mitme väeliigi suurem baas vajab lisaenergiat. Uute üksuste mudelid, ikoonid, heli ja ET/EN kirjeldused.
- [x] 20 sihitud kontrolli: päris kiirmarsi teevalik/kiirus/saabumine mõlemas mõõtkavas, segakolonn, laota tootmine, kaubiku pealevõtt/salvestus/väljumine, luurekopteri tootmine/õhkutõus, USA ATGM, tasemed, energiabilanss ja mudelite partiid. Kliendi ja serveri build ning diff-kontroll.
- [ ] Tegeliku WebGL mänguvaate ja uute mudelite käsitsi ülevaatus: kohalik 3D-brauser puudub; loogika-/geomeetriakontroll ei kinnita GPU pilti ega subjektiivset mängutunnetust.

## Masinate tulejuhtimine ja hõivatud lao veoring · 16.10.2026

- [x] Eemaldatud teise oma varustuslao tõttu tekkiv automaatne MTVR ladudevaheline vedu. Üks hõivatud, töötav ressursirajatis korraldab ühe eraldi automaatse veoki HQ juurde, sõltumata ostetud veokitest. Ostetud sõidukile ei määrata omavolilist marsruuti.
- [x] HQ laadimiskoht ja päriselt kõndivad vabad ehitusmeeskonnad: piiratud kastipartii liigub veokilt töötajale ning HQ-sse, alles seal varu/sissetulek. Täis laos kauba säilimine, hõivamise kaotamisel tagasivedu, automaatse veoki käsukaitse, vana veoringi üleminek ja save/replay/hash. Töötajatel nähtavad kastid, ET/EN olekutekstid.
- [x] Üks automaatne ehitusmeeskond objekti kohta; HQ teine tase annab teise paralleelse töövõimaluse. Vana topeltmääramise puhastus, ehituse eelis veel tühjade kätega mahalaadijatele, kantava partii ohutu lõpetamine.
- [x] Maa- ja õhumasinate alternatiivse valmis relva valik, kere pööramise kompensatsioon torni sihtimisel, stabiilne automaatne ohtliku sihtmärgi eelistus. Lühikese saabumisajaga oma rakettide hinnang vähendab liigseid ühissalvosid; kadunud juhtimine ei jäta relva ootama ja tulevast tabamisjuhuarvu ei loeta.
- [x] 39 sihitud lahingu-, lennu-, logistika-, tööjaotuse ja füüsilise HQ mahalaadimise kontrolli. Varem muutunud lennujaamasisese hooldusega kooskõlla viidud kaks vana testiseadistust. Kliendi ja serveri build ning diff-kontroll.
- [ ] Tegeliku WebGL pildi ja mängutunnetuse ülevaatus (sh kastikandjate käed ja HQ laadimisala): kohalik brauser puudub, GPU pilti testid ei kinnita.

## Lahinguinfo ja reageerimine · 16.10.2026

- [x] Kompaktne, klõpsatav lahinguteadete paneel: kütusehäda, oma kaotused koos üksuse tüübiga, baasi ründamine / kriitiline HQ, valminud hooned, teenindus, ressursipunktide kontroll, raketistart ja nurjunud käsu põhjus. Klõps viib sündmuse asukohta üksustele käsku andmata.
- [x] Kuni 24 ajalookirjet ja neli aktiivset teadet, prioriteedid, lähedaste korduste koondamine ja loetuks märkimine. Tavapärased tarned ei täida loendit. Peamaja seisund ei kirjuta enam igal kaadril muid hoiatusi üle. Kahjustuse kontroll kuni 5 Hz, UI muutub versiooni/sekundi järgi ning säilitab nuppude identiteedi.
- [x] Teated ja uute sündmuste minikaardimärk töötavad ka välja lülitatud heliga. Paus külmutab aegumise; laadimine/poole vahetus nullib ajaloo ja võrdlusbaasi. Peidetud vaenlase raketi stardikohta ei avalda ka vana helist tulev suunanool/minikaardimärk.
- [x] ET/EN, klaviatuuriga kasutatavad nupud, ekraanilugeja teavitus ja piiratud suurusega avanev ajalugu. Kahjustuse, kriitilise HQ, nähtavuse, prioriteedi/koondamise, ajaloo piiri, laadimise/poolevahetuse, ressursikontrolli ning tõlgete sihitud kontrollid ja kliendi build.
- [ ] Tegeliku WebGL mängupildi paneeli paigutuse ja lahingutunnetuse ülevaatus: selles keskkonnas puudub kohalik brauser; varasem pilvebrauser ei pääsenud kohaliku serverini. Sim-/andmekontrollid ei asenda mängus ülevaatust.

## Ühendatud õhulahing ja taktikaline suitsukate · 16.10.2026

- [x] Võrreldud kasutaja zipi kõik viis faili GitHubi `6d1c5a8` versiooniga: identsed. Säilitatud tema raketi-/pommirelvade laskesektorid, G-koormuse/põiksuunalise liikumise/põiklemise täpsusmõjud, alternatiivse relva valik ja eemaldumine. Need on ühendatud 3D ettehoiu, ninateljel kahuri ja lühivalangutega; `flightClimb` kuulub samuti replay räsisse.
- [x] Uus C / Suitsukate käsk valitud jalaväele ja maaväetehnikale. Piiratud varu, kasutuspaus, aeglane laovarust täiendamine päris laskemoona eest; liikumine ja muud käsud jätkuvad. Automaatne ehituspersonal, pardal/garnisonis olevad üksused ei saa suitsu käsitsi paigaldada.
- [x] Kasvav/hajuv suits piirab mõlema poole optilist tuvastamist ja sihitud tulejoont, säilitades radarjuhitud relvade töö, maastikutakistused ja juba lennus laskemoona. Ühine tulejoone erand kehtib ka liikumise/sihtmärgivaliku puhul. Suits pole suurtükitule kaitsekilp.
- [x] AI kasutab sama tasulist/piiratud võimet surve all taandudes. Nähtav suitsupilv, rahulik heitelaengu/gaasi heli, loetav valmisoleku/varu näit HUD-is. Kuni 32 sim-pilve; üks renderduspartii kuni 384 pehme instantsiga ja madala kvaliteedi vähendatud detail.
- [x] Suits, varud, pausid ning laadimise edenemine säilivad save/replay/hash-is. Õhulahingu, suitsu, radarierandi, mürsu liikumise, AI, varude ja renderdusandmete sihitud kontrollid ning kliendi/serveri build läbisid. Tegelik GPU vaade ja subjektiivne mängutunnetus jäävad mängus ülevaatuseks.

## Lennukikahur ja lähiõhulahing · 16.10.2026

- [x] Parandatud hävitaja virtuaalse torni tõttu küljele/taha tulistamine. Kõik fikseeritud lennukikahurid kasutavad kere suunda, 3D ninakoonust ja tegelikku ettehoidu. Lennuki sihtimine ei kuluta pärast lennudünaamikat teist pööramiskiiruse eelarvet ega pööra kujuteldavat torni.
- [x] Ühine kahuri ettehoiulahend firing-gate'is, lähijälituses ja päris mürsu sihtpunktis. Hajuvuse piirang hoiab möödalasud samuti ettepoole; efektide suund tuleb tegelikust kiirusvektorist. Suurt kõrgusevahet ei ignoreerita.
- [x] Lühikesed kahurivalangud koos pausiga; uus käsk ei nulli relva pausi. Taimerid säilivad save/replay/hash olekus. Lennuk valib vajadusel kahuri asemel valmis ja sobiva laskesektoriga raketi.
- [x] Kahurilahingus kohandub jälitaja sihtmärgi kõrgusega, säilitades ohutu maapinnavahe. Vahetus 3D läheduses eemaldub ta oma lennusuunas uueks lähenemiseks, mitte ei lenda otse vastasest läbi. Kaugelt kasutatakse endiselt lõikepunkti ettehoidu.
- [x] Sihitud kahuri, päris tulistamisringi, lennu/kopteri, save/hash ja raketivaliku kontrollid ning kliendi/serveri build. Tegelik 3D pilt ja lahingu tasakaal vajavad mängus ülevaatust.

## Ehitusplatside etapid ja püsiv maastik · 16.10.2026

- [x] Uus hoone säilitab tegelikud mõõtmed. Platsi tähised, vundament, materjalivirn ja partiidesse koondatud tellingud; hoone osad avanevad kõrguse järgi ehituse edenedes, ilma kummise skaleerimiseta. Kaugemal jäävad tellingud/virnad ära. Lennuraja kate ilmub pärast vundamendifaasi.
- [x] HUD eristab päris töö etappe: platsi ettevalmistus, vundament, karkass/seinad ja viimistlus. Tolm tekib ainult tegelikult edenenud töö ajal ning kasutab olemasolevat piiratud osakesepuhvrit.
- [x] Simulatsioon ja puude esitus kasutavad sama püsivat, täpselt pööratud puhastatud ala. Kaovad metsa aeglustus, varjumine ja süttimisvõimalus; puud ei ilmu pärast hoone hävimist tagasi. Lao maa puhastub tegeliku taseme järgi, tulevane arendusala jääb eraldi reserveerituks.
- [x] Puhastatud alad säilivad save/replay olekus. Ruumiline indeks, muutumata hoone vahemälu, jagatud ajutised materjalid ning tellingute materjalide/geomeetria vabastamine. Sihitud simulatsiooni-, ehituslogistika- ja renderdusandmete testid ning kliendi/serveri build läbisid. Tegelik WebGL pilt vajab mängus ülevaatust; varasem brauserivärav jääb avatuks.

## Maaväe teeninduskäsk ja lahinguvalmidus · 16.10.2026

- [x] V2/V4 järgmine piiritletud parandus: valitud maaväetehnika „Teenindusse” / E-käsk valib sobiva varuga HQ või lao ning reserveerib igale masinale eraldi läbitava koha, eemal praegustest ja tulevastest lao kopteriplatsidest. Teeotsing on käsu/korduskatse põhine ja piiratud eelarvega.
- [x] Füüsiline sõit olemasoleva sõidukidünaamikaga; remont kulutab päris remondivaru, kõigi relvade moon ja kütus kasutavad senist laosüsteemi. Tule all teenindus peatub, tarne puudumisel ootab, baasi kaotamisel otsib uue koha. Tühja paagiga masin vajab päris varustusveokit; uut käsku ei blokeerita.
- [x] Teeninduse valmisolekuriba, selged oote-/ohuteated, rühma kokkuvõte ning värviline tähis kaardil. Valmisolekust teavitus; masin ootab mängija järgmist käsku. Eesti ja inglise tekstid.
- [x] Täissalvestus ja replay räsi sisaldavad koha broneeringut ja töö olekut. Sihitud teeninduse, varustuse, komponentide ja keele kontrollid ning kliendi build/typecheck läbisid. Tegelik WebGL pilt pole selles tööruumis kontrollitud; varasem brauserivärav jääb avatuks.

## Laugem maandumine, reserveeritud laoala ja selged ehitusharud · 16.10.2026

- [x] Kopteri maandumise laskumis-/lõppfaasi kiirused umbes 20% lühema kestuse jaoks; laugem kõrgusprofiil ja kõrgusega seotud edasiliikumine väldivad esmalt kohale lendamist ning pikka vertikaalset laskumist.
- [x] Lao kogu 3. taseme arendusala on juba ehituse eelvaates ja alates vundamendist reserveeritud, sh pööramisel ning teise lao lähedusse paigutamisel. Nähtav piir ja läbipaistev ala vastavad samale paigutusreeglile.
- [x] Lao uuendus näitab alati taseme järgi uut füüsilist kopteriplatsi; kasutatavust kontrollitakse eraldi. Parandatud vana lao uuendusmeetodi puuduva navigatsioonivärskenduse põhjus. Vana aed vajub paneelidena maha ja hajub, uus kerkib asemele koos sahinaga.
- [x] Tiheda metsa peale ehitada ei saa; vähesed puud ja istanduste taimed peidetakse vundamendi alalt instantsgeomeetrias, ümbritsev taimestik säilib.
- [x] Lao üks tavaline uuendusnupp näitab järgmist taset ja kopteriplatside arvu. FOB on eraldi selgelt nimetatud juhtimisposti rajamine, koos oma eesmärgi selgitusega.
- [x] Suurem alumine info-/tootmispaneel ja loetavamad näidikud. Ühine andmepõhine ehituspuu: HQ majandus, väeliikide juhtimiskeskused tootmine, insenerikeskus kaitserajatised; laost ja tootmishoonest ei pakuta suvalisi ehitisi.
- [x] Kasarmu ostetav rühm on „Lahinguinsenerid”; ressursipunktide ja õpetuse tekst selgitab ostmist, hõivamist/käivitamist ning vahet HQ automaatse ehituspersonaliga. Vanad ehitamiseks inseneri valimist nõudnud õpetuse juhised eemaldatud.


## Pardale sõitev tööauto, arenev laokompleks ja Vahemere v14 · 16.10.2026

- [x] Tööauto mudel 72% senisest, Chinook 124%; avatud tagumine kaubaruum ja püsiv ramp. Auto joondub, sõidab nähtavalt üle rambi pardale ja tagurdab pärast maandumist välja; pardal olev auto jääb kopteri mudelisse nähtava veosena.
- [x] Lao tasemetel 1/2/3 eraldi L-kujuliselt kasvav aiaga kompleks. Platsid jäävad aia sisse; olemasolev plats ei liigu uuendamisel. Lisanduvad büroo-/laomoodulid, suurem ja kõrgem piire; ühine paigutus navigatsioonis, broneerimises, mudelis ning ehituse eelvaates. HQ säilitab tasemepõhised meeskonna-/parkimismoodulid.
- [x] Laaduri väiksem maapinda järgiv kontaktvari, juhil ja sõidukil puudub ebastabiilne liikuv varjukaardi vastuvõtt.
- [x] Uus v14 kaardigeneraator: piirkondlikud viinamarja-, oliivi-, tsitruse- ja karjamaaparcellid, küpressidega taluteed ja talukohad/kabelid, kaldpõldudel kivised terrassiservad. Jagatud instantsgeomeetria, ruumiline kauguse järgi peitmine ja fikseeritud detailieelarve; v13 ja varasemad kaardid taastuvad endiselt sama versiooni järgi.
- [x] Algusmenüüs standard-, metsa-, liiva-, linna- ja talvecamo koos eelvaatega; valik säilib ja värvib oma tehnika/märgitud hoonepinnad ilma vastase või klaaside materjale muutmata.
- [x] Lennukikaardid ja valitud lennuki pilt suuremad; joonisel lisatud sobivate tüüpide välised relvakinnitused/raketid.


## Tööalade viimistlus, kaamera, heli ja lao piirid · 16.10.2026

- [x] HQ pingid 2 m majale lähemal, autod samuti lähemal; valged parkimisboksid ja kaitsepostid lisanduvad koos meeskonnakohtadega. Lao parkimismärgistus samuti valge.
- [x] Lao tööala madal metallpiire kasutab samu jalajälgi mudelis ja navigatsioonis. Laiad lääne-/idapoolsed laadimisavad ja ees sõidukivärav jätavad kopteriplatside ja lao vahelise veo avatuks.
- [x] Keskmise hiirenupu lohistamine pöörab ja kallutab kaamerat, säilitades rulliga suumimise. Piiratud kalle, pointer capture ning vabastamine nupu, katkestuse ja fookusekao korral; abi ka seadetes.
- [x] Üksuste heli ei vaja valimist ega kao järsult ekraaniserval. Nähtavate vastaste ja oma üksuste heli vaibub kauguse ning väljasuumimisega; helikanalite arv jääb piiratuks.
- [x] Lennukitel tüübi-/riigipõhised tiiva-, mootori- ja sabajoonised, eri pöörded ning tüübitähisega ostukaardid. Vanad sarnased mängumudelite pildid ei asenda enam neid kaarte.
- [x] Lao tasemed lubavad täpselt kuni 1/2/3 kopteriplatsi, ka broneerimisel. Saabuv kopter ei ava lisaplatsi enne uuendust; hõivatud plats põhjustab ootamise. Maksimaalselt kaks elusat/ehitatavat ladu meeskonna kohta.


## HQ tööala ja automaatsete Chinookide vaatamine · 16.10.2026

- [x] HQ fassaadiga ühendatud avatud töötajate terrass ja kõrval tähistatud tööautode parkla. Tasemed 1/2/3 lisavad ühe pingirea, parkimiskoha ja meeskonna; istujad, autod ja simulatsioon kasutavad sama paigutust.
- [x] Ehitus-Chinook saabub päriselt kaardi tagant, maandub metsa ja hoonete vahele sobivale vabale alale ning võtab meeskonna pardale. Mitte-meetrilisel kaardil ei suruta automaatset lendu enam kaardi serva sisse.
- [x] Ressursi- ja ehitus-Chinooke saab klõpsates vaadelda; liikumis-, lahingu-, EVAC-, arendus- ja reisijakäsud ei muuda automaatset tööd. Töölised jäävad automaatseteks ja mittevalitavateks.


## Laaduri suund, püsiluuk ja loetav ehitusprogress · 16.10.2026

- [x] Pargitud õhusõiduki kere osaleb maapealses kokkupõrke- ja teeotsingus. Laadur joondab kahvlid luugi suunda enne kauba võtmist ja tagurdab koormaga esmalt luugist eemale; veos ja raha liiguvad jätkuvalt päris üleandmisel.
- [x] Chinookil oma püsiv hingedega tagaramp, raam ja kaubaruumi ava. Suletud luuk kuulub kere siluetti ega peideta ära; sama detail- ja kaugmudelis. Ehitusauto pardaleminek/mahatulek toimub tagaluugil, mitte kopteri keskpunktis.
- [x] HQ meeskondade piir tasemetel 1/2/3 on 1/2/3. Igal meeskonnal on algusest nähtav pargitud tööauto, hoiduv suund ka meeste kõndimise ajal ning joondumine parkimisel. Vana salvestuse üleliigne personal vabastab töö ja eemaldub jõudeolekus.
- [x] Koduse vaiba, diivani, tugitoolide ja päikesevarju asemel välitööpingid, metallkapid ning veepunkt. Parkimisala hoonest kaugemal; eraldi lähenemine auto uksele, järkjärguline pardaleminek ja stabiilne individuaalne jalgsitee ilma liikuva vahesihtpunktita.
- [x] Sinine ekraaniriba ja valikupaneeli näidik kuvavad ehitamisel päris ehitusprotsenti. Varem püsis ekraaniriba ehituse ajal 15% elupunktide järgi paigal. Päris 4096 m kaardi HQ + baasimüüride + esimese generaatori käsk lõpetab ehituse.
- [x] Lennurada 280 → 250 m, kitsam perroon ja väiksemad angaarid; ühised andmed juhivad mudelit, parkimist, valikut ja lende.
- [x] 36 mudelipõhist WebP lennukipilti kolmele riigile, rollidel eraldi vaatenurgad. Reprodutseeritav GLB/protseduurmudeli CPU-renderdus; sama kaameravalik arsenalis. Uus vahemälutunnus väldib vanade ikoonide püsimist.
- [x] Viimane sihitud kontroll: 14 testi ja TypeScript/tootmisbuild. Lisaks kontrollitud inseneri- ja mudeliarenduse puudutatud testid ning mudelikaartide pildid. Kogu testipakki ei käivitatud; päris WebGL mängupildi sujuvust pole kinnitatud.


## HQ/FOB automaatne ehitus ja Chinooki töövedu · 16.10.2026

- [x] Ehitustellimus ei vaja valitud/vaba lahinguinseneri. HQ/FOB peab piiratud püsivat töömeeskondade parki, saadab lähimast keskusest töörühmi järjekorras ja suuremale hoonele kuni kaks meeskonda. HQ arendus lisab töövõimsust; kaotatud meeskond taastub viivitusega.
- [x] Automaatseid töölisi, tööautosid ega ehituskopterit ei saa klõpsu, kasti, filtrite, gruppide või liikumiskäskudega juhtida. HQ/FOB kaardil on töömeeskondade ja hõivatuse ülevaade. Tavaline algus sisaldab ainult HQ-d ja automaatset personali.
- [x] Ostetav relvastatud lahinguinsener on eraldi valitav kasarmu 1. taseme pioneerirühm; remondib sõidukeid ja käivitab ressursirajatisi. Talle ei teki baasi automaatset tööautot ega puhkeala ülesannet. Ehituspersonal ei hõiva sektoreid ega ressursse.
- [x] Ehitusautol püsiv tööpunkt väljaspool tulevase hoone navigatsioonijalajälge, ühtne suurusest sõltuv tööulatus ning kiirendamine/pidurdamine. Pika tee sirguse kontroll ei kordu täies pikkuses igal sammul. Kinni jäämisel on uus lähenemine ja õhuveo varuvariant.
- [x] Kaugus üle 320 m, puuduv maatee või ülemäära pikk ümbersõit valib Chinooki: vajadusel tühi pealevõtulend, päris sõit kopterini, pardaleminek, käivitus/start, lend, aeglane maandumine ja mahalaadimine, ehitamine, tagasivedu ning parkimine. Töötaja kuulub lennu ajal päriselt veosesse ega ehita pardalt.
- [x] Kuni üks aktiivne ehitus-Chinook keskuse kohta. Tellimus maksab 60 krediiti ja 60 ressurssi; puuduv raha või hõivatud kopter jätab töö ootele. Teeotsing kuni kolm katset / 6000 sõlme katse kohta ja viivitusega kordus, mitte lõputu iga-sammu otsing.
- [x] Varustusautode väljasõit ei tekita enam kahte masinat samale punktile; kattuvast algasendist ei teki teeotsingu surnud lukku. AI kasutab sama automaatset ehitust ning ostab pioneerid eraldi.
- [x] 25 puudutatud käitumiskontrolli (sh tegelik Chinooki edasi-tagasi töö, veetõkke ületamine, töötaja tagasitulek, salvestus, liikumise taastumine ja AI kuue minuti majandusahel) ning TypeScript/tootmisbuild. Kogu testipakki ei käivitatud; WebGL mängupilti pole selles keskkonnas kinnitatud.


## Loomulikud tööpinnad, vaba puhkeala ja pehmem maandumine · 16.10.2026

- [x] Lao suur ühtlane hall alus asendatud väiksemate töö-/parkimis-/puhkeala pindadega. Maastik paistab läbi, servad hajuvad ja kruusa toon varieerub; kopteriplatsi kate ning H jäävad selgeks.
- [x] Lennuvälja tausta suur värvitud ristkülik eemaldatud maastikuatlasest ja varuesitusest. Raja asfalt ja märgistused säilivad, perroon/teepeenar sulanduvad ümbritsevasse pinnasesse; teiste hoonete õuepinnad saavad samuti hajuvad servad.
- [x] Lao laadurid pargivad diivanitest eraldi, puhkeistmed on kõrvuti diivanitel ning sim-töötaja naaseb sama nähtava istme juurde. HQ puhkeala nihutatud jämeda navigatsioonivõrgu seinamaskist välja, insenerirühmadele eri istmed ja lähisihtkohas kindel seismajäämine.
- [x] Jalgsikäijad ei blokeeri üksteist keharuumide, teeotsingu ajutiste takistuste ega eraldusjõuga; hoonete ja sõidukite vältimine säilib.
- [x] Kopteri lõplähenemine rahulikum, laskumine kuni 2,2 m/s ning maa lähedal järkjärguline pidurdus. Metric/compact lennud maanduvad ja tarnivad endiselt päris kauba.
- [x] 16 sihitud kontrolli ning TypeScript/tootmisbuild läbisid. GPU mängupilti ei kontrollitud; brauseri lõplik välimuse ja sujuvuse proov jääb kasutajale.


## Ehitusriba, lennujaama hooldus ja kasvavad hooned · 16.10.2026

- [x] Jämeda nav-ruudustiku tõttu tööulatusest välja jäänud tööauto läheneb nüüd varuga; ehitaja ja ehitussüsteem kasutavad sama töökaugust. Valikupaneel selgitab tööauto/ehitamise olekut.
- [x] Lennukitootmise eeldus on lennujaama enda 2. taseme hooldusangaar, kütus ja moon, mitte eraldi varustusladu või lennustrateegiakeskus. Algvaru tuleb arendusega, järgmine automaattellimus maksab 100 krediiti ja 100 ressurssi. 3. tase lisab lennurelvastuse keskuse.
- [x] Uuenduste uued ruumid, mahutid, antennid ja katuseosad kasvavad ehituse edenedes juurde; olemasolev hoone säilib. Suurem kolmetiivaline HQ saab operatsiooniruumi ja juhtimistorni. Rohkem aknaid, katuse- ja fassaadidetaile ka teistel hoonetel.
- [x] Riigi ja lennuki rolli järgi eristuvad SVG-siluetid tootmisnuppudel, nimekirjades ning valikukaardil; Chinooki tandemrootorid, kaubalennuki neli mootorit ja erinevad lahingulennukid.
- [x] 10 sihitud testi, viimaste mudelimuudatuste kaks korduskontrolli ning TypeScript/tootmisbuild läbisid. HQ geomeetria ja ikoonilehe staatiline eelvaade üle vaadatud; tegelikku WebGL mängupilti ei väideta kontrollituks.


## Päris laomeeskond, tööautod ja lähivaade · 16.10.2026

- [x] Sisse tõmmatud kasutaja a8dfce1 baasi-elu muudatused ja edasi arendatud nende peale.
- [x] Püsiv laotöötaja: puhkeala → jalgsi laadurini → pardaleminek → ohutu ooteala → päris mahalaadimine → parkimine → tagasi puhkama. Ettevalmistus algab saabuva lastiga kopteri lähenemisel. Kauba arvestus toimub ainult luugil ja lao dokis.
- [x] Madalam ladu, avatud puhkeala ja kitsas ukseääris suure varikatuse asemel; nähtav laadurijuht ja jalgsikäigu mudel. Hoone ühikutes suurendus ei rakendu enam kaks korda.
- [x] Lao ja peamaja füüsiliste seinte pööratud ruumkastid vastavad mudeli seintele; laaduri tegelik raadius, täpne viimase meetri lähenemine ning individuaalsete mehikeste kõrvaltee hoonenurgast mööda.
- [x] Inseneri päris töötsükkel: puhkeala, tööriistaauto juurde minek, pardaleminek, sõit objektile ja alles siis ehitamine/remont; tööauto jääb objektile ning naaseb pärast tööd baasi. Tööolek ja kauba teenindus säilivad salvestuses/räsis.
- [x] USA Chinookile eraldi CH-47 mudel: kõrgem tagumine torn, kaks vastassuunalist kolme labaga rootorit, lai kaubaruum, kokpit, mootoripaar ja neljapunktiline telik. Detailne ja kaugmudel kasutavad sama siluetti.
- [x] Kaamera lähisuurendus 58 → 18. Kontroll: 24 sihitud testi, TypeScript/tootmisbuild ning mudelite eraldi 3D geomeetriaeelvaade. Päris WebGL mängupildi/juhtimise kontroll jääb kasutaja brauserisse.


## Õhulahing, moodsad õhutõrjed ja heli · 15.10.2026

- [x] Baasi elu: insenerid (tööriistad, käru, diivan peamaja juures), laiem varustusladu, meeskond+laadur iga kopteriplatsi kohta. Vt BASE-LIFE.md. Brauseris vaatlus pooleli.
- [x] Kiirem piiratud kaldpööre lahingulennukitel; rasketele lennukitele aeglasem eriprofiil. CAP jälitamisala, kontaktide säilitamine ja tegeliku kiirusega ennak; vastase hävitaja ei sunni maapealse õhutõrje vältimisloogika kaudu koju pöörduma.
- [x] Hävitaja, püüdur, mitmeotstarbeline lennuk, ründelennuk, raske pommitaja ja SEAD/ECM on eraldi toodetavad klassid. Lahingulennukitel ees paiknev lähimaa õhukahur, eraldi piiratud moon ja suunapiir.
- [x] SEAD-i radarivastane rakett sihib radareid/radar-SAM-e, ei lukustu passiivsele IR-õhutõrjele; häiritud radar katkestab otsinguluku. ECM mõjutab radar-/käsujuhtimist, mitte IR-jälgimist.
- [x] Maaväel eraldi IR-SAM ja radar-SAM, jalaväel IR-MANPADS, kahurõhutõrjel lisaks lühema ulatusega IR-raketid; tehases toodetav IR-SAM saab optilise sihtimispea.
- [x] Mootori-/sammude-/tööheli ainult valitud ekraanil oleval üksusel; kohalikud lahinguefektid ja tulekahin ei kosta mujalt kaardilt. Üldised kütuse-/strateegilised hoiatused säilivad.
- [x] 25 sihitud testi, TypeScript ja tootmisbuild; täistestipakki ega GPU kontrolli ei korratud.


## Lennujaama kasutatavus ja lennulogistika tempo · 15.10.2026

- [x] 280 m rada varasema 340 m asemel, väiksemad angaarid/torn, selge AIR-terminal ning sama lennujaama valik kõigi lennujaamahoonete kaudu.
- [x] Ühine andmepõhine avaramate hävitajakohtade ja märgistuste paigutus; eraldi suurkauba parkimine. Lennukite lennukiirus +15%, ruleerimine +20% meetrikaardil.
- [x] Õhk-õhk raketi 7 s baasvahe, 1,2 s stabiilne lukustus ja varasema lasu jälgimine; stardihälve väheneb otsingu täpsustumisega, piiratud füüsiline pööre/lukukaotus säilib.
- [x] Ladu alustab ühe laohoone ja ühe H-platsiga ühisel pinnal, nähtav ka ehituse eelvaates. Teine/kolmas hoone ja püsiplats lisanduvad uuendustega; hõivatud ajutisi kohti ei kaotata.
- [x] Tarnekopteri kiirus −30%, väliste kopterite baasintervall 35 → 50 s ja kogumislendude vahe 18 → 26 s.
- [x] Kasutaja soovil ainult 18 sihitud testi ning TypeScript/tootmisbuild; kogu testipakki ei käivitata. Mängupildi ja tunnetuse proovib kasutaja oma brauseris.


## Kopterite päris lähenemine ja jalgsiliikumise taastamine · 15.10.2026

- [x] Mõõtkavaga kopteri 8 m hõljumiskaugus ei blokeeri enam 0,8 m maandumiskoridori: piiratud kiirusega täpne lähenemine, paigal püsimine, fikseeritud suund viimases faasis ning alles seejärel vertikaalne laskumine.
- [x] Laoga ühised, hoonetest ja nõlvadest vabad kopteriplatsid: nähtav kate, ring ja H; esmalt kaks keskset platsi, lisaks reserveeritud ülevoolukohad. Uusi hooneid ei saa tähistatud/aktiivsele platsile ehitada.
- [x] Kastikandjatele eraldi jalgsiliikumine ilma veoauto pöörderaadiuse ja pidurduseta. Koormaga ummistunud teenindaja proovib teist lao sissepääsu; kaupa ei kao ega lisandu enne päris üleandmist.
- [x] Jalaväe vahepunkti ei jäeta vahele, kui uus suund lõikaks hoonenurka. Mitme rühma liikumist kontrollib päris käskudega regressioon.
- [x] Uued testid lendavad nii compact- kui metric-kopteriga päriselt lao kohale, maanduvad ja tarnivad terve koorma; kontrollitakse ka platsi märgistust, tegelikku pinnakõrgust ja kandjate hoone ümbert kulgevat teed.
- [ ] Uue WebGL pildi ülevaatus: avalik menüü avanes, kuid testbrauseri WebGL2 puudumine takistas 3D lahingu käivitamist.

## Lao kopterite parandus ja selgem mängupilt · 15.10.2026

- [x] Kopterite kaubamasina asemel kaks nähtavat kastikandjat: päris kaubakogus, kõndimisanimatsioon ning laotarne enne tasumist. Lennukitele jääb laadur.
- [x] Luugi külgmiste ligipääsude otsing, ummistunud teeninduse taastamine ning kopteri käsitsi ümberpaigutamine: luuk kinni, tiivikud käima, start väljaspool baasi. Kandja käes olev kaup ei kao; lao allikavalik taastab automaatveod.
- [x] Tegeliku hoonemudeli pööratav eelvaade õige skaala, servakontuuride ja rohelise/punase kehtivusvärviga; lennujaamal ka rada/perroon.
- [x] Kompaktsem valikupaneel, selgem staatuse/käskude kirjasuurus, lisarelvad ja lao üksikasjad avatavad; rohelised uuendusikoonid.
- [x] Eraldi vilja-, rapsi-, köögivilja- ja mullaalad: nähtavad taimed ridades, maapinna kõrgus, teede/vete vältimine ning piiratud instantside arv ja kaugus.
- [x] Käitumistestid katavad maast lahkumise, kauba säilimise, töölist/laadurit, eelvaate mõõtmeid ja jagatud materjale ning taimeridade piiranguid.
- [ ] Tegeliku WebGL pildi ja helikõla käsitsi ülevaatus; kohaliku serveri aadress ei ole eraldi pilvebrauserist ligipääsetav.

## Mahalaadimine ja jalaväe liikumine · 15.10.2026

- [x] Päris maapealne kaubamasin: sõidab luugi juurde, võtab piiratud veose peale, viib ühendatud lattu ning alles seal lisanduvad raha/laovarud. Täis ladu jätab kauba masinale; hävinud veoki koorem läheb kaotsi; kadunud lao korral otsitakse teine ladu. Tootmise ja logistika AI kogub esmase tehase jaoks raha enne valikulisi harusid.
- [x] Lao kopterid jagavad püsivaid, eraldatud maandumiskohti. Valik kontrollib rootoriruumi ja laadimismasina maapealset ligipääsu; mitu masinat kasutavad eri laadimiskohti. Maandunud kopteri tiivikud/heli seiskuvad, luuk avaneb ning enne lahkumist luuk sulgub ja rootorid käivituvad.
- [x] Jalaväerühma liikmete esituses eraldi maailmaruumis järgnemine, pööramine, sammu faas, väike loomulik hajuvus ja maapinnakõrgus; lähimudel ning kaugmudel kasutavad samu sõduriasendeid. Käsud, rühma liikmete arv ja lahingureeglid jäävad simulatsiooni omaks.
- [x] Simulatsiooni testid katavad koguse säilimise, mahalaadimise järjekorra, samaaegsed saabumised, varulao, hävingu ja salvestuse determinismi; renderduse testid katavad luugi geomeetria, seiskunud rootorid ja sõdurite sõltumatud sammud.
- [ ] Tegelik WebGL/heli ülevaatus jääb käsitsi: pilvebrauser ei saanud kohaliku Vite aadressiga ühendust (ERR_CONNECTION_REFUSED).


## Hoonete eristamine · 15.10.2026

- [x] Eraldi arhitektuuritöö: suured geomeetrilised funktsioonitähised, kopteriplatsil valge H/ring ja tuulesukk, tehase tõstetala/korstnad, lao laadimisvarikatus/riiulid, kasarmu harjutusala ning erinevad strateegiakeskuste siluetid. Detailid koondatakse olemasolevatesse jagatud materjalipartiidesse; geomeetriatest kontrollib tähiseid ja piiratavat joonistuskutsete arvu.
- [ ] WebGL pildi ülevaatus: eraldi pilvebrauser ei pääse selle tööruumi aadressile 127.0.0.1:5173 (ERR_CONNECTION_REFUSED). Kohalik Vite töötab; geomeetriakontroll ei asenda GPU pilti.


## Baasiehitus, dessant ja strateegilised relvad · 15.10.2026

- [x] Tavaline menüü- ja URL-vaikimisi algus: mõlemal poolel peamaja + kaks inseneri. Valmis baas ja lahingugrupp on eraldi „Näidis / test” valik.
- [x] Lennubaasis toodetav raske dessantlennuk, eraldi automaatsest varustuslennukist. Kaks sõidukikohta: üks tank VÕI kaks APC-d; lisaks kuni 50 päris sõdurit, arvestades ka APC reisijaid ja laadimisbroneeringuid.
- [x] Päris üksus sõidab pargitud lennukisse; U + paremklõps käsib langevarjudessanti. Vabad maandumiskohad, järkjärguline laskumine, relvade keeld õhus ning lennuki tagasipöördumine baasi. Olek ja last säilivad salvestuses.
- [x] Inseneriga ehitatavad kuulipilduja-, õhutõrjekahuri- ja tankitõrjetornid: eeltingimused, ehitusaeg, hind, energia, juhtimisühendus ning relvaliigi sihtmärgipiirangud.
- [x] Maastrateegia + radar → raketiarenduskeskus → ICBM raketišaht või toodetav mobiilne tiibraketiheitja. Iga rakett tuleb eraldi raha ja materjalide eest valmistada; piiratud ladu, minimaalne laskekaugus, stardivahe ja füüsiline lend.
- [x] Tuumalaeng vajab raketikeskuse 3. taset, õhustrateegiat, radarit ning eraldi 1800 + 1800 / 120 s uurimist; iga tuumarakett 2200 + 2200 / 120 s. Tuumalöök kahjustab ka omi üksusi.
- [x] Uute moodulite testid katavad laadimise, tegelikud tootmiskäsud/stardi/dessandi, ehitusfondi, raketivaru, tuumauuringu, füüsilised tabamused ja salvestuse determinismi. DOM-kontroll katab tavarežiimi vaikimisi valiku, tootmis-/ehituspaneeli, ingliskeelsed põhitekstid ja raketikäskude nupud.
- [ ] WebGL mängupildi ja subjektiivse helikõla ülevaatus brauseris; kohalik Chromium endiselt puudub. DOM- ja geomeetriakontroll ei kinnita GPU pilti.


## Õhusõidukid, raketid ja kütusereserv · 15.10.2026

- [x] Kopteri stardifaasis renderdatakse tegelikku interpoleeritud kõrgust; rootorid kiirenevad/aeglustuvad sujuvalt. Liikumine ja sihtimine jagavad üht aeglasemat pööramispiiri, raketirakid ning kahuri sektor piiravad tegelikku laskmist.
- [x] Lennufaasi järgi tühi käik, ruleerimine, hoovõtt, hõljumine ja lähenemine; kihiline turbiin/õhuvool/rootorilaba impulss ning õhusõidukite füüsilise helikiirusega Doppler. Kaubalennuk on reaktiivmootoriga.
- [x] Põhiklasside juhitavatel rakettidel piiratud normaal-/pöördekiirendus, lõplik mootoritöö, õhutakistus, gravitatsioon, energia kadu pöördes, diskreetne ennakuga otsing ja stardil määratud sihtimishälve; sektori kaotamisel lukk katkeb. Mööduvat raketti ei telepordita sihtpunkti.
- [x] Kaubalennuk maandub tagalast ja stardib samalt rajalt vastassuunas tagasi tagalasse; parkimine/hoovõtt ja päris last säilivad.
- [x] Kopteri kütusehoiatus 15%, 5% juures kohaliku vaba maa otsing, pidurdus/laskumine ning tühja paagiga autorotatsioon. Maandunud üksus/passengerid säilivad; väljumine ja tegeliku konvoikütusega päästmine töötavad. Olek ja rakettide lennu jätkamine salvestuvad deterministlikult.
- [ ] Tegeliku WebGL stardi/suumi ja kõlaritega helikõla ülevaatus: kohalikku Chromiumit ei ole; geomeetria-/heli-/simulatsioonitest ei asenda kuulamist.

## Seemnevalik, lennuväli, keel ja tuletoetus · 15.10.2026

- [x] Kohalik tühistatav worker, kiire eelvaade enne navikontrolli lõppu ning sisestatud seemne päris kasutamine; kompaktsete reljeefikernelite täpne väljalõige kiirendab kõrguspuhvrit.
- [x] Mere, mägede, metsade ja jõe lülitid; valikuid sisaldav kaarditunnus, taastamine ning serveri tunnusekontroll.
- [x] Peamenüü Eesti / English valik, püsiv eelistus ja eraldi esituskihi tõlkesõnastik menüüle, HUD-ile, varustusele, seadetele ning Arsenalile.
- [x] Kantav õhutõrje, mobiilne SAM, miinipilduja ja kerge haubits; tegelikud tootmishooned/tasemed, relvad, varud ja mudelid.
- [x] Lennuvälja kolme sügavuskihi eraldi polygon offset väldib pinnase/katte/märgistuse kauguse sügavuskonflikti. Geomeetria- ja materjalitestid.
- [ ] Tegeliku WebGL suumipildi ja FPS-i kontroll: kohalik Chromium puudub ning Playwrighti allalaadimine tagastas katkise ZIP-i. Menüü ja HUD-i käitumine kontrollitud DOM-keskkonnas; see ei kinnita GPU pilti.

## Teravad pinnad ja F-kiirliikumine · 15.10.2026

- [x] Maanteed eraldi maailmamõõdus asfalttekstuuriga ja geomeetriliste märgistustega; maapinna kolmnurkadega lõigatud, ruumiliselt kahte materjalipartiisse koondatud pind. Kaardi 2048 px atlas ei määra enam tee teravust.
- [x] 512 px korduv mikropind, tugevam keskmise/kõrge kvaliteedi detail ning säilimine tavalisel mängusuumil; sama shaderi proovide arv ja piiratud tekstuurimälu.
- [x] F → vasakklõps sihtpunktile, Shift-vahepunktid ja Esc; G säilib alternatiivina, suurtükituli T peal. Sim kasutab olemasolevat kiirusega kaalutud teede marsruuti.
- [ ] Tegelik brauseripildi/FPS kontroll: Chromiumi headless-shell allalaadimine tagastas katkise ZIP-i.


## Vahemere maastik, hoonete tootmine ja heli · v13

- [x] v13 avatum Vahemere maastik: väiksem metsapind, terrakotakatused, soe kivifassaad, osal seemnetel keskne kustunud kraater ja möödaviiv tee; v2–v12 taastamine säilib.
- [x] Tellimine ainult valitud tootmishoone juures; ekraani alaserva keritav ruudustik, tegelik hoone ID, järjekord ja katkestamine. Ehitus jääb eraldi valikuks; komponendid on suletavas lao hoolduse vaates.
- [x] Raketi stardipauk/mootorikohin, kihiline kahuripauk ja madal aeglane ambient-muusika; samad heliseadistused ja piiratud häälte eelarve.
- [x] Kauba- ja pommilennuki kamuflaaž säilib ka kaugmudelis; suuremad laigud ja jagatud tekstuurivariandid riigi ja lennukiklassi kohta. GLB materjali/UV kontroll väljalasketestides.
- [ ] Brauseris heli kuulamine, tootmispaneeli paigutuse ja kaugmudeli tegelik WebGL pildikontroll (kohalik Chromium puudub).


## Kiirem algus ja kompaktne lahing · v12

- [x] Serveri/worker'i kaardi ettevalmistus peamenüüs, tegelik eelvaade ja ettevalmistatud geomeetria üleandmine käivitusele; nupuvajutus ei loo teist kaarti.
- [x] Bititäpset kõrgust säilitav vee/silla ruumiline indeks; kohalik kahe kaardi puhvri katse 3,53 → 1,77 s.
- [x] Uue lahingu kompaktne relva-/nähtavusmõõtkava, säilitatud meetrinäidud ja õiged tegelikud ulatusringid; varasemate versioonide taastamine.
- [x] Laiem kaameravaade, suuremad raketid/suitsujäljed sama osakeste eelarvega.
- [x] Keskjoonel kaubalennuki lähenemine, pidurdus, perroonilt päris varude mahalaadimine ja joondatud õhkutõus; C-17/Il-76/Y-20 originaalsed mudelivariandid.
- [x] Sisemaastiku mäeharjad ja ühendatud metsad ilma iga krundi ümber lõigatud koridorita.
- [x] Kiired arendus-/benchmark-/valikulise mudeliehituse käsud; vt DEV-WORKFLOW.md ja COMPACT-BATTLE-V12-RELEASE.md.

## Lennuväli, mõõt ja stabiilne nähtavus · 15.10.2026

- [x] Katkise lennuraja asemel maapinna tegelike kolmnurkadega lõigatud kate ja märgistus; perroon, ruleerimistee, parkimiskohad, kaks angaari, torn ja hooldushoone.
- [x] Baasihoonete 22% visuaalne suurendus, elamute tagasihoidlik kõrguse/laiuse suurendus ning lennuvälja perroonilt taimestiku ja selle küpsetatud varju eemaldamine.
- [x] Väikese meetrikaardi nähtavuse säilimine vaatlejate ajastatud uuenduste vahel; minimapi/maastiku udu korduvate lainete regressioonitest ja salvestuse jätkamine.
- [x] Püsiv päikesevarju projektsioon, valgusruumi pikslivõrgu joondus ja katteala säilitamine sundvärskenduste ajal; geomeetria- ja stabiilsustestid. Vt AIRFIELD-VISIBILITY-RELEASE.md.

## Pinna parandus ja värske serverikaart · 15.10.2026

- [x] Maapinna kadumist põhjustanud shaderi preprotsessori reavahetuste parandus; regressioonitest ja tegeliku shaderi kompileerimine/linkimine Mesa EGL-is koos sõjauduga.
- [x] v11 kaardid 2048, 2560, 3072, 4096, 5120 ja 6144 m; suurused nii üksik- kui mitmikmängus, varasemate versioonide taastamine säilib.
- [x] Mõõtkavaga looklev jõgi, ruumiliselt seotud metsamassiivid ning väikese meetrikaardi piiratud nähtavusarvutus.
- [x] Serveri eraldi worker kasutab sama generaatorit ja tegelikku navivõrku; juhuseeme, kontrollitud ühendused/ressursid/lennurada, piiratud korduskatsed ning kõigile sama kaardi ID.
- [x] Uus lahing küsib vaikimisi uut kaarti; võrguühenduseta kohalik kontrollitud varutee ja sisestatud seemne kordamine säilivad. Vt PROCEDURAL-V11-RELEASE.md.

## Maapinna detail ja koormuse piirid · 15.10.2026

- [x] Maailmamõõdus pakitud mikropinna tekstuur, lähedalt albeedo/reljeef ning kauguses hajumine; tekstuuri baaspuhver 4× väiksem.
- [x] Loomulikum lai värvivariatsioon ja kõrguse/nõlva järgi paljanduv kivine pinnas; geomeetria ja renderduspartiide arv ei suurene.
- [x] Olemasoleva kvaliteedivalikuga juhitav detail, madala taseme väljalülitus, sõjaudu ühilduvus ja sihitud kontrollid. Vt TERRAIN-DETAIL-RELEASE.md.
- [ ] Tegelik WebGL shaderi/pildi brauserikontroll ning F8 GPU/FPS võrdlus.


## Failide ja väljalaske korrastus · 15.10.2026

- [x] 18 kontrollpildi kadudeta WebP, pikslivõrdlus ja dokumentatsiooniviited; generaatori uuendus.
- [x] Kontrollitud kompaktne dist: 83 kasutamata GLB eemaldamine ainult väljalaskest, ühine mudelinimekiri, originaalide säilitamine ja neli paketikontrolli.
- [x] Production-GLB MIME/gzip/proksipakkimine ja vahemälu korduvkontroll; Dockeri kontekstide korrastus. Vt CLEANUP-RELEASE.md.
- [ ] Pärast production-redeploy'd Nginxi HTTP gzip-vastuse kontroll.


## Liikumisfüüsika ja vedrustus · 15.10.2026

- [x] Meetrites maasõidukite nõlvajõud, haarduvus, koormatud veoki kiirendus ning kurvi eel pidurdamine; peatumise teepikkuse integraator.
- [x] Tagurdamise eel pidurdamine kere suunda säilitades; veojõu puudumisel tõusul seismajäämine.
- [x] Lennuki kiiruse/pöördega seotud kalle, summutatud vedrustus ning tegelikust nihkest/pinnasest sõltuv tolm. Vt MOVEMENT-PHYSICS-RELEASE.md.
- [ ] Liikumise ja uute visuaalide brauserivaatlus, mängutunnetuse ning F8 FPS-võrdlus.


## Lahingu visuaalne tagasiside ja kontaktid · 14.10.2026

- [x] Liikumistolm, madala kopteri rootoritolm ja seisundist sõltuv kahjustussuits; nähtavus-, kaugus- ja osakeste piirid.
- [x] Eraldi läbistava tabamuse sädemed ning APS tõrje visuaal/heli.
- [x] Kiire mürsu esimese kontaktpinna ja takistuse ühine järjekord; APS kogu sammu trajektooril. Vt COMBAT-FEEDBACK-RELEASE.md.
- [ ] Uute efektide brauserivaatlus, kuulamine ja F8 FPS-võrdlus.


## Näidisalgus, loomulik maastik ja heli · 15.10.2026

- [x] Valmis alguses lennuväli ja kaks täisvarustuses lennukit mõlemale poolele; standard-/mitmeotstarbeline koorem ja ühendatud ladu.
- [x] Platvormipõhised relvakaugused, sh kopterikahuri 850 m piir.
- [x] V10 väiksemad parcelid, ebakorrapärased metsaservad, täiendavad kõrgendikud ja kõrgusdetail; lennuraja hooldusala.
- [x] Tihedam piiratud eelarvega canopy/põõsad, madalamad hekid ja odavam kaugvõra.
- [x] Kauguse/stereoga kihilised heliefektid ning eraldi muusikasiinil originaalne taustakompositsioon. Vt NATURAL-LANDSCAPE-AUDIO-RELEASE.md.
- [x] Laiendatud helindus: kaja, mootorid, UI/raadiohääled, ambient, dünaamiline muusika, tulekahju/sammud/ehitus, alarmid ja heli-visuaalsed vihjed (värin, serva vilgatus, minikaardi rõngas). Vt AUDIO-RELEASE.md.
- [ ] V10 maastiku ja heli brauseris vaatlus/kuulamine ning F8 FPS-võrdlus.


## Viie testitõrke parandused · 14.10.2026

- [x] Ehituse/õhuoperatsioonide füüsilise kestuse, fraktsiooni täpsuse ja kütusereservi regressioonide parandamine.
- [x] Vaba sirge teekonna optimeering, pargitud kehade otsingupiiride eelarvutus ja navigeerimise/sim eelarvete eraldi mõõtmine. Vt SIMULATION-REGRESSION-FIXES.md.

## Protseduurkaart ja põhiklassid · 14.10.2026

- [x] Ainult protseduurkaardid mängumenüüs ja online ruumide serverivalideerimises; kampaania/fikseeritud kaartide valiku eemaldamine.
- [x] 15 põhiklassi, 16 komponenti ja teeninduskohas ajaga/kuluga vahetamine; baas ja kaardiväline varustus säilivad.
- [x] Tegelik trajektoori tabamus, saabumissuunast soomus, 9,81 m/s² gravitatsioon, HEAT-kaitse ja laost täidetav APS.
- [x] Varustuse UI/mudelilisad, salvestus/hash ja sihitud sim/render kontrollid. Vt MODULAR-PROCEDURAL-RELEASE.md.
- [ ] Uue reeglistiku brauseris lahing, varustuse kasutatavus, tasakaal ja F8 FPS-võrdlus.
- [x] 4–6 km kaardi navigatsiooni/LOS eelarve ning ulatuste, kiirenduse/pidurduse ja lennukoridoride häälestamine. V9 meetrites profiilid, kohalik pidurdus, rajaga joondatud lennuring ja hõredad ruumipäringud; vt METRIC-BATTLE-RELEASE.md.
- [ ] V9 lahingu brauseris tasakaal, kitsaste linnavahede kasutatavus ja F8 FPS/GPU võrdlus.


Põhiplaan: [DEVELOPMENT-PLAN.md](DEVELOPMENT-PLAN.md). Allolev järjekord on järgmise arenduse alus; hilisemad vanad etapid ja märkeruudud jäävad ajalooliseks loendiks. Pakett loetakse tehtuks põhiplaani lõpetamistingimuste järgi, mitte funktsiooni nime olemasolu järgi.

- [x] Kasutatava alpha ulatuse, viie viimistluspaketi ja alpha/beta lõpetamiskriteeriumide uuendamine (08.10.2026).
- [ ] V1 brauserivärav: PR #15 mõõdikutega sama Roheoru 60–90 s stseeni võrdlus ja suurima mõõdetud kitsaskoha parandus; päris FPS/visuaal endiselt kinnitamata. Avalik URL on olemas; 13.10 kontrollbrauseri GPU/WebGL on välja lülitatud.
- [ ] V2: grupijuhtimise, maa-/õhuliikumise ja lahingu tunnetuse lõpetamine.
- [x] V3: majanduse, füüsilise logistika ja AI taastumistsükli funktsionaalne lõpetamine — 15 min Roheoru simulatsioon läbis pealao/veokite kaotuse, tootmise hilise jätkumise ja eesmärkide vallutamise. Mängija vaates raskus/tasakaal ja lõpetatav tervikmatš jäävad V5 alpha väravasse.
- [ ] V4: selge HUD ja Roheoru ühtne visuaalne viimistlus.
- [ ] V5: õpetuse/save-load läbipääs ning DEVELOPMENT-PLAN.md alpha värav; seejärel A6 lõpetatuks.

## Teostatud alused ja seniste pakettide seis

- [x] Kasutaja 2048 m kaardi jõudlusraporti peamise kitsaskoha parandus (14.10): 24 korduvat 100–270 ms HUD-pausi tulenesid minikaardi 512×512 sõjaudu raku kaupa Canvas-joonistamisest. MinimapFog kasutab vision-revision/team vahemälu, korduvkasutatavaid puhvreid ning üht putImageData/drawImage paari; udu kolm olekut ja sillakahjustuste kaardikihi invalidatsioon säilivad. CPU Canvas-kontrolli mediaan 504.53 → 1.05 ms. Kõik 56 UI/render/input/core testi ja build/typecheck läbivad; täissuite läbib 254 testi ning viis varasemat main-i tõrget korduvad. F8 v3 eristab silte/minikaarti/HUD-i ja säilitab põhjustavate aeglaste CPU callback'ide worstWorkFrames loendi. Kasutaja mõõdetud algseis ~26.4 FPS; uuendatud brauseri FPS vajab sama marsruudi uut raportit, V1 lõplik värav jääb avatuks.

- [x] Näidispildist lähtuvad välibaasid, relvasuits ja kaardiväline varustus (14.10): madalad kamuflaažpaviljonid, avatud laod/töökojad, juhtimistornid, mahutid ja lisad; jagatud materjalidega liidetud geomeetria. Rakettide ajutine aur ning mürskude hajuv suits kasutavad eraldi piiratud osakesepuhvreid ja teepikkuse proovistamist. Tihedamad metsad ning kuni 6500 lähi-LOD põõsast; rajatisetüübi järgi ressursiala tekstuurid. Passiivraha eemaldatud: lao kopteriimport algab kaardivälisest tagalast, lennuvälja lähedane ladu avab suure kaubalennuki; uuendused suurendavad koormat/sagedust/lennuparki. Füüsiline osatarne, tühi/täis ladu, kaotus, vastuvõtja vahetamine, kaardiservast lahkumine ja save/hash on testitud. 25 sihitud testi ning build/typecheck läbivad. 15 min AI taastumine läbib ka hilise tankikaotuse järel; täissuite viis varasemat main-i tõrget jäävad alles. Uus majandus nõuab uut lahingut; vanad snapshotid säilivad eraldi. GPU vaade/FPS ja uue majanduse mängutunnetus vajavad päris brauserikontrolli. Juhis ja CPU mudelieelvaade: REAL-WAR-FIELD-BASES.md.

- [x] Asulate linnaosad ja detailivööndid v8 (14.10): keskuse kortermajad/poed, äärelinna eramud/ridaelamud ja maapiirkonna hooned; kvartaliga sobivad fassaadi-/katusepaletid, raekoja/külakeskuse torn ning linnapargid/külasalud. Lisatud crescent/courtyard kujud ning ühiste sõlmedega kergelt ebakorrapärane tänavaruudustik. Korterite rõdud/ridaelamu uksed jäävad olemasolevasse ühe draw'ga atlasegeomeetriasse. TerrainCulling jätab sama kaamera maailmamaatriksi ja projektsiooni juures kogu LOD/nähtavuse kordusotsingu ära; liikumine/zoom/kaameravahetus uuendab nähtavuse kohe. Seeditud geomeetria, keskuse ja äärealade hoonetüübid, krundikokkupõrked, väikse/suure kaardi nav ning paigalseisu cache'i invalideerimine on kontrollitud. 60 v3–v7 kaardi taastamist võrreldud täpselt eelmise main-iga; 36 v8 seemne/tüübi kombinatsiooni ja maapinnaatlas kontrollitud. Build/typecheck läbivad; täissuite 238 testi läbis ja viis varasemat main-i tõrget kordusid. 22 sihitud kaardi/renderduse kontrolli läbivad. GPU FPS ja tegeliku mängupildi kvaliteet jäävad kasutaja F8 raporti/3D vaate kontrolliks.


- [x] Asulavariandid v7 ja kaamera jõnksude diagnostika (14.10): eri suurusega linnad/külad, oldtown/grid/ribbon/fork tänavakujud; eramud, ridaelamud, korterelamud, poed, laod ja kõrvalhooned. Täpne pööratud krundi SAT-kontroll võimaldab väiksemaid naabrivahesid. Neli eraldiseisvat halli/lao/kontoriga tööstuskobarat koos juurdepääsuga; suure keskuse kõrvalkülad nihutatud, et hilisem tänav ei lõikaks maju. V2–v6 taastamisteed säilivad. Majade mõlemad LOD-id kasutavad üht jagatud vertex-color atlase materjali/joonistuskäsku; kõik staatilised LOD geomeetriapuhvrid laaditakse 1×1 offscreen renderiga enne briefingut. F8 JSON v2 lisab kuni 3600 ajajärjestatud kaadrit, 30 halvimat kaadrit, kaamera-/üksuste-/maastiku-/efektietapid, riistvara/kaardikonteksti, Long Task andmed ning asünkroonse GPU timer-query (toetuse korral). Juhis: PERFORMANCE-CAPTURE.md. Nav-/krundigeomeetria, vormivariandid, üks-jõudlusdraw, GPU päringu valmisolek, rapordi ringpuhver ja warmup'i oleku taastamine on testitud. Build/typecheck läbivad; täissuite 233 testi läbis ja viis varasemat main-i tõrget kordusid. 48 v3–v6 taastamist on eelmise versiooniga täpselt võrdsed, 48 v7 seemne/tüübi kombinatsiooni läbivad. V1 FPS/GPU visuaal jääb kasutaja raporti taha.


- [x] Näidispildist lähtuv piirkonnageneraator v6 (14.10): erikujulised kahe tänavaringi ja ühendustänavatega asulad, tänavasuunalised krundid/õued ning suuremad põhikeskused; seotud kompaktsete tippudega mäevööndid ja madalad teekoridorid. Põllupolügoonid lõigatakse tegelike maanteede ja vee järgi, kitsad killud eemaldatakse, üks hekk algse põllu kohta väldib järveäärseid hekilehvikuid. Kõrgusväli juhib metsastumist ja kivisema nõlva pinnatooni; põlluread järgivad lähima tee suunda eraldi cropRotation-metaandmega. Kohalik menüü, online juhukaart ja ranked alustavad v6-ga; v2–v5 ID-d säilivad. Kontrollitud 30 seemne/tüübi kombinatsiooni, suuruseäärmuste ja ranniku baasi-/ressursinav, päris veokitarne ning 36 v3–v5 kaardi täpne võrdsus eelmise main-geomeetriaga. Build/typecheck ja 20 sihitud testi läbivad. Täissuite'i viis varasemat tõrget korduvad muutmata main-is. Päris maapinnaatlas on Canvas2D-ga visuaalselt kontrollitud; GPU/3D-brauserivaade ei ole kinnitatud (Chromium käivitustõrge, brauseripaketi allalaadimine katkine). V1/V4/alpha väravad jäävad avatuks.


- [x] Jätkuva suure kaardi jõnksumise ja laia reljeefi pakett (14.10): üks kogu kaardi maapinnavõrk asendatud 256 m frustum-cullitavate tükkidega (2048 m puhul 64); sama maailma-UV ja ühine gradientnormaal väldib pinnaservade teede/valguse õmblusi. TerrainCulling peidab väljaspool vaadet terved metsa/maja LOD rootid enne renderer'i detailide läbimist, taastades neid sama kaamera järgi. Kaamera kiiruse vastuskõver integreeritakse analüütiliselt, et pikk kaader ei põhjustaks lõppkiirusega üleliikumist. V5 kõrgustik kasutab kompaktse jalami ja pööratud harjaga mägesid; paigutus väldib baasid/asulaid/ressursikohti, nõlvatoonid tugevdavad reljeefi. V2/v3/v4 ID-de kõrgusväljad säilivad. F8 lisab nähtavate/kõigi maastikugruppide arvu. Build + 6 sihitud kontrolli, sh maapinna UV/normaalõmblused ja alla poole pinnatükkide nähtavus geomeetrilises näidisvaates, LOD grupi taastumine, v4 kaardi taastumine, päris tarne ning suurima kaardi nav. Brauseris FPS/jõnksude kadumine pole kinnitatud.


- [x] Suure kaardi kaadrikulu ja piirkonnatüüpide eristamine (14.10): kaugvaate tsiviilmaja üks ühine atlase/vertex-color materjal ja üks draw, oma garrison root/kahjustus säilib. Maastikutekstuuride GPU ettevalmistus ja compileAsync enne briefingut vähendab esmakordse kaamerapöörde shader/upload tööd. NavGrid jälgib dünaamiliste hoonete lahtriloendit ega skaneeri iga hooneuuendusega kogu miljonit lahtrit; staatilise geomeetria rebuild eemaldab vana footprinti enne alusmaski taastamist. V4 andmepõhised piirkonnaprofiilid muudavad kõrgendike arvu/kõrgust/laiust, keskuse kvartaleid, kruntide hõivet, majakõrgusi ja residential/rowhouse/industrial/rural mudeleid; v2/v3 taastatakse vanade ID-dega. Ressursiteed ei lõika v4-s läbi maju/vett; kontroll kasutab olemasolevat spatial indexit, mitte kõigi feature'ite korduvat skanni. Build ja 11 sihitud kontrolli läbisid (sh päris tarne, suurima kaardi nav, tüübi reljeef/siluett, v3 taastamine, maja LOD ja hoonemask). Tegelik kaameraliikumise GPU/FPS mõju pole kinnitatud.


- [x] Piirkonnageneraator v3 (14.10): vabalahingu ja online valikus ainult kaks autoritud näidiskaarti (Roheorg/Murdlaine), muud valikud seemnepõhised. Suurused 1536/1792/2048 m, kaheksa asulat, talukobarad ja metsajärved, üheksa päriselt hõivatavat/aktiveeritavat ressursirajatist, tagala/rinde tööstus ja piirkondade ühendusteed. Parandatud seni varjatud 1600 m kõrgus/nav clamp, muidu jäid 2048 m kaardi välised rajatised mängualast välja. V3 identiteet sisaldab suurust; v2 taastab vana 1280 m geomeetria. Puupaigutuskatsete ühine 60000 eelarve ning maakasutusparcelite arv püsib pindala kasvades ligikaudu sama. Kampaania stsenaariumid säilivad eraldi. Build + 15 sihitud kontrolli läbivad, sh v3 päris veokitarne ja 2048 m baaside/üheksa ressursi/algüksuste nav. GPU FPS/mänguvaate kvaliteet jääb kontrollimata.


- [x] Uus mänguga ühendatud kaardigeneraator (13.10): v2 1280 m seemnekaart, jõest/teevõrgust lähtuvad neli tihedat kvartaliasulat, kolm sillaületust, ebakorrapärane polügoonjärv ja Voronoi maakasutusalad. Seeme varieerib ka baase/asulate asukohti/tänavasuundi/sildu, mitte ainult dekoratsiooni. Näidiskaardil umbes 190 garnisonimaja; polügoonid juhivad päris cover/nav/kõrgusvälja/atlas/minikaarti. Menüü esimene valik on uus Järvemaa, olemas kaardiseeme/piirkond/Uus kaart ja tegelik andmeeelvaade; valmis start kasutab uue kaardi läbitavaid asukohti. Viis füüsilist ressursirajatist koos vabade õuede/juurdepääsuga; testis insener aktiveeris rajatise ja veok tõi päris koorma. Build + 13 sihitud kontrolli, sh deterministlik save-jätk. Vana Roheoru JSON-i ei uuendatud. GPU pilt/FPS ja referentsipiltide mudelite tase pole kinnitatud; alpha värav jääb avatuks.

- [x] Võrdluspiltide järgi maastiku renderduse ümbertöö (13.10): ühine puupaigutus 3D ja küpsetatud maastikuvarjude jaoks, tekstuuriga ebakorrapärased võrad ja 168/64/24 kolmnurgaga kolm LOD-i. Keskmise/madala kvaliteedi päikese algsuund parandatud; taimedele lisavarjupassi ei lisatud. Layout16 põllupinnad/toonid, 14 lisapõldu, põlluservade hekid/salud ja kaks lauget kõrgendikku; tsiviilhoonete kelpkatused mõlemas LOD-is. Kaamerat järgiv gradienttaevas ja üks staatiline udune kaugmaastikuring, rannikul jätkub meri. Natiivse Canvas2D-ga üle vaadatud päris 2048² ground-atlas (7875 puupaigutust/310 võrarühma), mitte mängu GPU-render. Build + 24 sihitud kontrolli läbivad; fotode taseme ja FPS-i kinnitamine jääb GPU-ga mänguvaate väravasse. Simulatsiooni/Three.js-i ei asendatud, V4/alpha pole märgitud valmis.

- [x] Roheoru kaardikvaliteedi tervik (13.10): kattuvate jõeristkülikute asemel ühine footprint-põhine veepind, kaldatooni gradient; maapinnaga ühised tee-/õue-/märgistuse kihid eemaldavad temperate-kaardilt kattuvad eraldi pinnaribad. Layout15 elamute mõõdud/kõrgused/frontid, neli juurdepääsutänavat ja 42 aeda; kuue talu ühendusrada taastatud. Viis silda on 52×10 m, talade ja jõepõhjale toetuvate sammastega. Metsaservade kõrvalharud ja neli kaldasalu; puude lähinaabrite piir hoiab kattuvates alades kuhjumise ära. Autoriskript korduskäivitatav samade andmetega. Build ning 19 sihitud geomeetria/maastiku/esituse/õpetuse kontrolli läbivad. GPU-ga tegelikku visuaali/FPS-i pole kinnitatud, V4/alpha värav jääb avatuks.

- [x] Liikumise, kopterilahingu, metsa ja ressursipaigutuse ühendatud viimistlus (13.10): sõidukite piiratud külgkiirendus/tagurdamise pidurdus, kopteri salvestatav vektorhoog ja nina/translatsiooni eraldamine, LOS-i külgmine positsiooniotsing, tiivarakkide sihtimine ja õiglasem kopterikahuri õhukahjustus. Paigalseisva tankikahuri täpsus ja tegeliku liikumise eelsihtimine; nähtavamad suunatud mürsud/raketimootor. Väiksemad tihedamad instantsitud puud; Roheoru layout14 ressursiladude kaugus ~174 m, ühendusteed ja õued viidud kaasa. Veokid otsivad hõivatud kogumiskoha kõrval vaba ligipääsu ja taastavad edasiliikumiseta ummikus marsruudi. Build + 47 sihitud kontrolli (sh tasuline õpetuse 16/18 eesmärgi läbipääs, füüsilised tarned ja save/replay). Brauseri FPS, visuaalne tunnetus ja tervikmatš endiselt kinnitamata; V2/V4/alpha pole märgitud valmis.

- [x] Avaliku brauseri alpha audit ja parandused (13.10): https://thormen.com/rts/ menüü/seaded/fraktsioon/deck avanesid; õpetus takerdus kontrollbrauseri GL_RENDERER=Disabled piirangusse. Brauseris tuvastati vigane 192/120 AP ja 22/14 Maa vaikimisi deck ning Venemaa menüüvaliku järel USA decki avamine. Nüüd kõigi fraktsioonide legaalne ühendrelvade algdeck, õige valitud fraktsioon, sulgemisel värske kokkuvõte, käivituse valideerimine ja vigaste salvestusandmete taastumine; kasutaja üle-eelarveline deck jääb muutmiseks alles. Tehase väljund väldib kohalikke suletud nav-taskuid, HUD kasutab sama väljumiskontrolli. Õpetuse lõpp valib soomuse+luure ning sihtmarker kasutab üksnes nähtavat rajatist või teadaolevat baasikohta. Menüü tegevusnupud/veateade loetavamad; puuduva WebGL-i puhul katkeb käivitus enne mudelite/simi laadimist selge eestikeelse teatega. Build + 18 sihitud kontrolli, sh 16/18 päris õpetuseesmärki ja nelja toodetud tanki tee baasiõuest, tootmine/õhubaas ning replay. Täisvõit/kaotus, brauseri lahingutunnetus ja FPS ei ole kinnitatud; uut koodi avalikku konteinerisse ei deployitud.

- [x] Valge lehe /src/main.ts ja /@vite/client 404 parandus: dev-server tuvastab alamtee automaatselt ning teenindab iga prefiksi mooduligraafi eraldi, säilitades samaaegselt juurtee. Säilitatud prefiks ja X-Forwarded-Prefix on toetatud; käsitsi BASE_PATH jääb valikuliseks. Kontrollitud HTTP mooduleid/assets/Arsenali/API-t ja WS handshake'i juurteel ning kahes alamtees; build läbis. Välist deploy'd ei käivitatud.

- [x] Reverse proxy hostitõrge: Vite dev/preview lubavad kõiki Host-päiseid; dev alamtee on `ROGUE_FRONT_BASE_PATH` kaudu seadistatav ning API/WS prefiks eemaldatakse backendisse saatmisel. Compose edastab muutuja, mudelid/ikoonid kasutavad olemasolevat BASE_URL-i. Kontroll: build ja tegelikud kohalikud HTTP päringud erinevate hostidega ning `/rts/` prefiksiga. Avalikku Hestia/Overseeri deploy'd ei muudetud.

- [x] Alpha kandidaadi ühendus: õpetuse kõigi AI planeerimiskihtide ettevalmistus, 16 päris eesmärgi läbipääs, pooleli ehituse jätkamine/limiit ja käsutõrke tagasiside; kaamera A/E konflikt eemaldatud; peamenüü seaded, keskmine esmakvaliteet ja käivitustõrke teade. Build + 46 sihitud kontrolli. Täielik õpetus, brauseri FPS/juhtimistunnetus ja tervikmatš jäävad alpha väravasse; vaja töötavat mängu URL-i.

- [x] V5 lõpuekraani ja taasalustuse ühendus: salvestusest tulnud kordusmäng eemaldab resume-võtme ega laadi sama checkpointi uuesti; säilitab lahingu tegeliku fraktsiooni, seadistuse ja Worldi decki. Kampaaniavõidu lõpuekraan võimaldab nii järgmist operatsiooni kui kordusmängu. Värske tulemus ja laaditud lõpetatud salvestus kasutavad sama edenemis-/järgmise missiooni loogikat; laadimine ei kirjuta tühja replayga varasemat üle. Preemia on ühekordne ning lukus operatsiooni otseaadress ei ava kampaaniajärjekorda. Vigane edenemisfail normaliseeritakse; salvestustõrge jätab tulemuse ja tegevused alles. Lõpetatud võrgumängu ei käivitata uuesti vana ruumiaadressiga. Jätkamisel algab ka muusika; Paus ei muuda lõpetatud matši olekut. Build + 11 sihitud save/navigation/campaign kontrolli; brauseri lõpuekraani ja kogu alpha läbipääsu värav jääb avatuks.


- [x] V5 peamenüüst salvestatud lahingu jätkamine: kaheksa viimase salvestuse väike indeks näitab kaarti/operatsiooni, fraktsiooni, režiimi, aega ja salvestuskuupäeva; suur simulatsioonisnapshot jääb ühte eksemplari. Jätkamine käivitab sobiva kaardi/režiimi ja taastab olemasoleva loadWorld kaudu tegeliku seisu pausil, koos salvestatud decki ja AI profiiliga. Varasema teise lahingu decki ei rakendata. Puuduv/vigane salvestus annab teate; indeksi kirjutamise tõrge ei kaota juba kirjutatud snapshoti. Vanad salvestused on jätkuvalt laetavad sobiva lahingu menüüst ja ilmuvad loendisse uuesti salvestamisel. Build + 6 sihitud indeksi/save-load kontrolli, sealhulgas laadimisjärgse sim-jätku hash-võrdlus. Brauseri jätkamistee, inimvaates õpetus ja alpha tervikvärav jäävad kinnitamata.


- [x] V5 õpetuse juhendamise ühendus: õige ehitusharu koos inseneriga, tegeliku tootja valik ning ühe klõpsuga ehituse/tootmise avamine ja vajaliku nupu märgistus. Juhend näitab päris tarne-/tootmise seisu, ootab pooleliolevat ehitust ning aitab puuduva inseneri/tootja/üksuse taastada. APC pardalt väljumine juhendab paremklõpsu; maja soovitus ei kasuta peidetud kahjustusi/vaenlase hõivet. Juhend paikneb avatud tootmispaneeli all. Menüü eristab Roheoru Conquesti ja õpetust katsetusjärgus valikutest. Build + 5 sihitud õpetuse/juhendi kontrolli; täielik inimvaates õpetus/matš ja alpha värav endiselt avatud.

- [x] V4 kaugvaate juhtimise ja märkide ühendus: Picker, klõpsu-/kastivalik ja Overlay kasutavad sama nähtava 3D-mudeli renderdatud positsiooni, mitte ticki toorkoordinaate. Nimesildid mäletavad suhtelist rida, korduvkasutavad hõiveruudustikku ning jätavad ruumi hoiatustele ja HUD-ile; kitsas klassiikoon on jätkuvalt klikitav. Viimati nähtud kontakt on katkendliku raamiga, kontaktivanusega ja ilma klõpsusihtmärgi või peidetud live-andmeteta. Laadimine/algoleku vahetus lähtestab markerite ja inteli esitusvahemälu. Build + 8 sihitud sisendi/paigutuse kontrolli läbisid; brauseri FPS ja juhtimise visuaalne tunnetus jäävad kinnitamata.

- [x] V4 HUD-i ja kaardi esimene tervik: valiku elud/moon/kütus ning relvad ja laskmise põhjused enne lisainfot; maastik/liikumine/varustus avatavad, soomus/optika lühikaardil. Mängumenüü koondab salvestuse/laadimise/seaded; ehituse vahekaart mahutab logistika päriskontrollid. Roheoru majade sama fassaad lähivaates/kaug-LOD-is, aknad atlasel; õuesillutis lõigatakse teedest/veest eemale. Sildade maailma-UV-d vastavad asfaltteele, avatud piirded ja piirkondlikult liidetud sillageomeetria. Build ja 5 sihitud geomeetria/ulatuse/fog kontrolli; brauseri loetavus/LOD-üleminek ja FPS on veel kinnitamata, seega V4 lõppvärav jääb avatuks.

- [x] V3 lõpetav tarne- ja taastumisühendus: AI taastab kohaliku tootmislao ka säilinud edasilao korral, käivitab armeega hõivatud tööstuse ega lähtesta inseneri sama marsruuti. Uued AI hooned jätavad läbipääsuruumi. Kogumispargi piir kehtib lao, mitte iga ressursipunkti kohta; varupuuduses pealadu eelistatakse ja tühjad automaatkogujad saab ümber siduda (koorem/käsitsi marsruut säilib). Laokonvoi toob ühendatud edasilao päris ülejääki tagasi pealattu; suund säilib olemasolevas save/replay faasis ning HUD näitab õiget allikat/sihtladu. Tavaline tankimine jätab 40 kütuseühikut tootmiseks; Kütuseprioriteet vabastab reservi ning AI valib tegelikult teenindava lao. Veokite/inseneride teeleid kasutab pargitud maaüksustest möödumise reeglit. 15 min Roheoru simulatsioon: pealadu ja kõik kogumisveokid kaotatud 4. minutil, seejärel 7039 ühikut tarnet, 25 uut lahinguüksust, 4 hõivatud ressursiala, tootmine jätkus ka 13.–15. minutil. Build ning sihitud logistika/AI/replay kontrollid; brauseri FPS ja mängija raskushinnang pole sellest tõendatud.

- [x] V3 AI eesmärgi- ja käsujätku viimistlus: Conquest jätab hõivatud ressursid ründesihtide hulgast välja; operatiivne ja doktriini-AI jagavad režiimi eesmärke, Breakthrough suundub tagalasektorisse. Hõivepositsioonid jäävad ressursiala sisse. Korduvad/pending käsud ei lähtesta marsi ega nähtava kontakti laskepositsiooni; baasi kaitse saab rünnaku katkestada. Ootel käsud väldivad samal tickil topeltjuhtimist, uued/taastunud üksused tugevdavad rinnet esimese nelja ID korduskäsutamise asemel. Reserv eelistab baasi lähedal valmis üksusi; operatiivne taastumispaus peatab ka ründelaine. Sektorite täisarvutus toimub otsustusintervallil, võrgumängus AI seda ei käivita. Build + 12 sihitud AI/replay kontrolli läbisid. Päris 15–30 min Roheoru matši tempo, raskus ja brauserivärav jäävad avatuks.

- [x] V3 konvoi lähetus ja AI FOB: ühe sageduspiiratud lähetusläbimise sees proovib katkise tee järel järgmisi marsruute; sobiva pealaovaru ja sihtlao puudujäägiga edasitarne eelistub kogumispargi laiendamisele. Hävitatud konvoi asendatakse lähetusintervalli järel ja koorem võetakse päriselt laost. AI arendab ühendatud edasilao tasuliselt FOB-iks, pikendades command-võrku; HUD/AI/sim jagavad FOB hinda. Build + 16 sihitud kontrolli, sh kuue simulatsiooniminuti baasi–majanduse–tootmise ahel ilma lisarahata. 15–30 min Roheoru matši tempo ja brauserivärav jäävad avatuks.

- [x] V3 tarne- ja taastumisalus: FOB-veoki koorem järgib lao tegelikke puudujääke/prioriteeti ja kasutab vaba kandevõimet; tootmise laovalik piirdub kohalike toimivate ladudega; AI jagab kõigi ootel ostude eelarvet, piirab tootmisjärjekorda ja taastab inseneride reservi igas faasis. Ressursirajatise käivitanud insener vabastatakse, vajadusel käivitab tööstuse ka viimane ehitaja. Edasilaod rajatakse olemasoleva tarne- ja juhtimisvõrgu ulatusse. Build + 12 sihitud logistika/AI/replay kontrolli. 15–30 min tervikmatši tasakaal ja brauserivärav jäävad avatuks.

- [x] V2 grupi saabumise ja läbipääsu parandus: tehnikale läbipääsu lubav lõppformatsioon (sama paremlohistuse eelvaade), kohapeal pidurdamine katkisel marsruudil ja automaatne uus katse, lõppsuund alles pärast saabumist/pidurdamist, kohene lähivahepunkti teeuuendus, nullpikkuse sihi kaitse, pööramise/jam-taimeri eristus; parkimiskokkupõrke ühine raadiustegur ning vaba täpse sihtkoha jaoks sobiv lõpurakk; kolonnis sortimiseta elav eelkäijaotsing, sama sõidurea ootevahe ning seisma jäänud liikujatest möödumine. Build + 24 sihitud kontrolli, sh 12 tanki sillaületus ja paigutumine. Päris brauseri juhtimistunnetus ja kogu V2 marsruudivärav jäävad avatuks.

- [x] V1 käitus- ja renderdusalus: F8 mõõtevaade/JSON-väljavõte, tegeliku kaadriajaga FPS, säiliv aktiivne sim-ajavõlg, eraldi taustapaus, staatilise maastiku maatriksite kordustöö eemaldamine, madal kvaliteet 0.75 renderdusresolutsiooniga; ekraaniringide asemel tegelikust Vision-ruudustikust maailma koordinaatides maastikuudu ja sujuv üleminek. Build + 15 sihitud kontrolli. Cloud-brauser ei pääsenud kohaliku arendusserveri juurde (connection refused); päris FPS/visuaali värav jääb avatuks.

- [x] Koodipõhine uus kvaliteediülevaatus pärast PR #13 ja DEVELOPMENT-PLAN.md uuendamine: tehtud aluste eristus, kuus lõpetatavat tervikut, mõõdetav sujuvuse siht ning Real Wari majanduse säilitamine. See PR muudab plaani, mitte mängu käitumist.

- [x] Panningu ja metsakoormuse parandus: sujuv kaamera kiirendus/pidurdus/pööre, eksponentsiaalne zoom ja maastikukõrgus; valgus ja varjukaart liiguvad koos alles katvuse piiril või geomeetriamuutusel. Läbipaistvad ristvõrad asendatud ühe instantsitud ümara ruumilise võraga, kaug-LOD 20 kolmnurka; metsavarjude alpha-passid eemaldatud, põlengu/burnt ühendus säilitatud. Build + 12 lühikest render/input kontrolli; päris brauseri FPS/visuaal endiselt mõõtmata.

- [x] Kaameraga sünkroonne nähtavuskiht: 100 ms ekraaniudu oote eemaldamine, poole resolutsiooniga otsejoonistus ja üksuste interpolatsioon, pausi ajal kaamera muutuse tuvastus. Overlay pikslitiheduse piir 1.25 ja arvulised taaskasutatavad sildilahtrid; käsuringid asendatud lühikeste fikseeritud noolte/sihikuga, dubleeriv 3D-käsuping eemaldatud, kuni 3 tähist. Build + 11 lühikest render/input/replay kontrolli; päris brauseri FPS ja visuaal ootel.

- [x] Hiirejuhtimise/käsupildi parandus: vasakklõps valib ja tühistab vana sihtrežiimi (ehitus jääb eraldi), paremklõps annab käsu, paremlohistus näitab rühma asetust/suunda ja annab käsu vabastamisel. Päris suunatud sihtkohad, nav-kohandus, saabumise pööramine ja queued/save/hash; värvilised ajutised käsuringid, tavaliste marsruudi-/ründe-/kohaliku varustusjoonte eemaldamine. Build + 20 lühikest kontrolli; brauseri hiiretunnetus ja pilt ootel.

- [x] Visuaalse loetavuse ja teatatud lahinguvigade pakett: ründekäsk peatub tegelikus relvaulatuses, sobiv ulatuv relv eelistatud lühikese DPS-relva jälitamisele; kopteri automaatkahur saab lasta koptereid koos CAP/moona/HUD-iga. Madala moona/kütuse kaugmärgid, HUD-i elementide säilitamine, salvestuse olemasolu vahemälu, 8 Hz kaameravarju ja 5 Hz garnisoniloendi värskendus. Build + 21 sihitud lahingu/õhu/replay kontrolli; brauseri FPS, visuaal ja alpha tervikläbipääs ootel.

- [x] Füüsilise logistika loetavus: simi/HUD-i ühine varudest sõltuv kohalik laovalik, valitud lao varustusala ja piiratud üksuseseosed, ressursi-/FOB-vedude eristus ning katkenud ühenduse/pealao reservi põhjused. Build + 10 lühikest kontrolli; brauseri kaardipildi/FPS ja pika logistikalise matši ülevaatus ootel.

- [x] Õhuoperatsioonide ühendusviimistlus: andmepõhine ülesandeala/rolliga sihtotsing, kadunud kontakti järel ülesande taastamine, puhas missioonivahetus, lisarelvade õhutõrjeulatus ja transpordikopteri ajutine vältimismanööver, eraldi ohust tingitud RTB/save olek. Build + 15 lühikest kontrolli; brauseri lennutunnetus/FPS ja pikk õhu-maaväe matš ootel.

- [x] Lahinguinfo ja maastiku loetavus: kompaktsed relvarollid/ulatus/moon/lasu põhjus, avatavad AP/tabamuse detailid, tegelik garnisoni/relva laskesektor, hoones kasutamatute relvade ringi peitmine ning simi katte-/liikumiskordajate HUD. Build + 13 lühikest kontrolli; brauseri visuaal/FPS ja kaardi taktikalise kompositsiooni edasine viimistlus ootel.

- [x] Portaineri ENOENT-parandus: vaikimisi dev käivitub image’i failidest, suhteline `/app` bind-mount ja sõltuvuste püsiv overlay eemaldatud; multiplayeri valmidussõltuvus ja dev HTTP healthcheck. Compose’i struktuurikontroll läbis; päris serveri rebuild/redeploy ootel.

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
