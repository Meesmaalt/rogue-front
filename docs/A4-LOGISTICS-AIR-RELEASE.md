# A4 — säiliv koorem, taastuv logistika ja õhurajatised

05.10.2026. Etapp parandab olemasolevat tarne-, tootmis-, varustamis- ja lennutsüklit. Muudatused on töökaustas; ZIP-i ei uuendatud.

## Tarne ja laomahud

Kõigil ressurssi vastu võtvatel vedudel on nüüd ühine mahupiiridega vastuvõtt. Ressurss jaguneb andmetes määratud tuluks ja füüsiliseks varuks. Laos oleva ruumi järgi võetakse vastu ainult sobiv osa; ülejäänu jääb veokisse, kogumiskopterisse või kaubalennukisse. Täis ladu ei kustuta enam saabunud koormat ega anna vastuvõtmata osa eest raha. Ühe varuliigi täitumisel saab toorressursi füüsilise osa jaotada teistesse vabadesse varudesse.

Pealaost FOB-i veetav moon/kütus/remondivaru säilitab oma liigi. Üleandmine ei tekita tulu ega ületa sihtlao mahupiire. Osaliselt vastu võetud koorem ootab pardal ja jätkab mahalaadimist pärast ruumi tekkimist. Lao uuendus, ehituse lõpp ja HUD kasutavad samu mahte. FOB-i uuendus suurendab juhtimisvõimekust, kuid ei loo enam tasuta moona, kütust ega remondivaru. FOBManager näitab tegelike varude summat, mitte vana logistikaStorage väärtust.

Hävitatud sihtlaoga veok saab uue olemasoleva pealao ja säilitab koorma. Kogumiskopteri varasem ümbermääramine säilitab samuti koorma. Kadunud või suletud vastuvõtubaasiga kaubalennuk otsib sobiva alternatiivse arendatud lennubaasi; kui seda pole, väljub koormaga. Alles väljumisel tagastatakse koorem strateegilise välisvarustuse reservi, mitte mängija rahaks.

## Marsruut ja kütus

Veok läbib määratud vahepunktid enne tarne lõpetamist. Vahepunktile lähenemine kasutab navigatsiooni saabumiskaugust, mitte lao 16 m teeninduskaugust, mis varem võis panna veoki liiga vara pidurdama ja peatuma. Blokeeritud hoonekeskme asemel otsib laadimiseks läbitavat peatuskohta lao ümber. Esimest korda juba lao juures olev veok saab enne marsruudile minekut laadida.

Kütust kulub maaüksusel tegeliku liikumise järgi, mitte pelgalt liikumiskäsu olemasolust. Seisev kütuseta veok saab varustuse lähedal olevast laost või kuni 12 m kaugusel oleva kütusekoormaga konvoi tegelikust varust. Doonori koorem väheneb sama koguse võrra. Konvoi marsruudi vahepunkte saab kasutada abi suunamiseks kinni jäänud üksuse juurde. Eraldi tasuta päästesõidukit ei lisatud.

Varustamisel eelistatakse teenindusraadiuses ladu, milles vajalikku varu on; lähim tühi ladu ei blokeeri teist kättesaadavat ladu. Õhus olev üksus ei taasta oma supply näitu pelgalt lao kohal lendamisest. Maapinnal seisvat tühja kogumiskopterit ei loeta kohe õhus kütuse lõppemise tõttu hukkunuks.

## Tootmine ja lennutsükkel

Tootmisjärjekord säilib varude puudumisel ning töö jätkub tegeliku tarnimise järel. Tootmine kasutab sama sobiva varuga lao valikut nii operatiivsuse kontrollis kui varukulu arvutuses. HUD eristab puuduvat ühendust, laskemoonapuudust ja kütusepuudust.

Lennubaasi tankimine, ümberlaadimine ja remont ei sõltu enam tootmise mõlema varuliigi olemasolust. Näiteks moonata baasis saab veel tankida olemasoleva kütusega. Teenindus nõuab maas parkimiskohta, töötavat rajatist, energiat/juhtimist ja iga teenuse jaoks selle tegelikku laovaru. Õhus tankimist, ümberlaadimist ega tasuta kaugremonti ei lisatud.

Ruleerimise ajal suletud rada või muu operatiivne katkestus peatab stardi. Õhus kaotatud või suletud kodubaas paneb lennuki päriselt alternatiivbaasi naasma ja reserveerima seal vaba koha. Maas olevaid lennukeid ei teleporteerita teise baasi. Sobiva baasi puudumisel jääb õhusõiduk otsima/ootama ning tema kütusekulu jätkub; automaatset pääsemist ei garanteerita. RTB põhjus „baas kadunud või rada suletud” on eraldi nähtav ja salvestatav.

## UI ja säilimine

Oma lao paneel näitab moona/kütuse/remondivaru koos mahupiiridega ja järgmise taseme mahu kasvu. Veo paneel näitab allikat, sihtladu, koorma koostist, marsruudi vahepunktide arvu ning täis lao, puuduva allika, pausi või kütusepuuduse selgitust. Garnisoni ja transpordi varasemad valikud jäävad alles.

Osakoormad kasutavad olemasolevaid cargo ja logisticsPayload välju. Uut paralleelset majandust ei lisatud. Lao seos, tasemed, koorma maht, prioriteet ja marsruudi vahepunktid lisati ka sünkroonimis-hash'i, milles need varem puudusid. SaveState toetab uut baasi tõttu naasmise põhjust. Vana replay/hash ei ole uue build'iga samaväärne; multiplayeri kliendid peavad kasutama sama build'i.

## Kontrolli piirid

Viis sihitud uut kontrolli katavad täis lao ja osalise mahalaadimise, save/hash jätkamise, FOB-i koorma säilimise/tulu puudumise, tootmise taastumise ja piiratud kütuseabi, katkestatud stardi/alternatiivbaasi ning täieliku World.tick lennutsükli stardist maas ümberlaadimiseni. Kolm varasemat sihitud kontrolli katavad hooneuuenduse, füüsilise FOB-i tarne ja mängija vahepunktid.

Tootmisbuild ja TypeScripti tüübikontroll läbisid; kõik 8 valitud kontrolli läbisid. Täielikku testikomplekti ei käivitatud. Brauseri visuaalne ülevaatus, FPS, pikk tasakaalumatš ja kahe kliendi multiplayer on veel ootel. Ühe lennutsükli kontroll ei kinnita kogu lennuväe ega kõigi kaardikoridoride tasakaalu. Järgmine etapp on A5: intel-põhine AI ja Roheoru skirmishi tasakaal.
