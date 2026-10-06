# Lahingu ja üksuste gameplay viimistlus

See etapp parandab olemasolevate üksuste tegelikku käitumist. Uut rosterit või eraldiseisvat lahingusüsteemi ei lisatud.

## Sihtmärgid ja relvad

Automaatne otsing kasutab kõigi laskemoonaga kahjustavate relvade maksimumulatust, mitte ainult põhirelva. SPAA saab nüüd automaatselt märgata ja rünnata kopterit lisaraketi ulatuses, kuigi kahur veel ei ulatu. Sihtmärgipõhine relvavalik säilitab armor/AP, miinimumkauguse, moonapiirangu ja liikumiselt laskmise reeglid.

Auto-valik eelistab sobiva relva ulatuses avatud tulejoont; takistuse taha lukustunud automaatne kontakt vaadatakse piiratud sagedusega uuesti üle. Mängija otsene ründekäsk säilitab valitud sihtmärgi ja olemasoleva laskepositsiooni otsingu. Sobiva relva või moona puudumine annab tagasilükkamise põhjuse ning säilitab senise ülesande. Fog-of-war kontaktita vastast ei hangita.

## Käsud ja liikumine

Uus liikumis-, ründe-, hoidmis-, patrulli-, remondi- või ehitusülesanne puhastab vana tulemissiooni, väljasõidu, transpordikogumise, liikumisjärjekorra ning laskepositsiooni vahemälu. Shiftiga järjekorda lisatav liikumine säilitab aktiivse sõidu. Juba lendavaid mürske ja relvade laadimistaimereid ei tühistata. Insener eemaldatakse varasema objekti ehitajate nimekirjast.

Peatatud üksus võib kohapeal tulistada, kuid ei jälita automaatselt kauget vastast. Tulekeeluga luureüksus järgib liikumiskäsku ilma automaatse sihtmärgijahita. HUD-i patrullinupp ootab nüüd klikitud sihtpunkti. Eriüksuste lähisabotaaž austab tulekeeldu ja luurekontakti ning ei katkesta tavaliikumist/hoidmist.

## Suurtükid ja taandumine

Patarei vähendab liikumiskiirust enne koordinaattuld; tulistamine eeldab peatumist. Tulemissioon ei lase paanikas üksusel edasi tulistada. Paanikas patarei katkestab missiooni ja liigub HQ/lao kõrval asuvasse läbitavasse kogunemispunkti, mitte hoone blokeeritud keskpunkti. Olemasolev laskemoon, vaatleja, salve laadimine, lend, tabamus ja counter-battery jäävad samasse tsüklisse.

## Remont ja HUD

Insener kasutab sama ohutut nav-liikumist ja kiirendus/pidurdusprofiili ning otsib teeninduspunkti ehitus-/remondikauguse sees; läbimatu tee korral ei kõnni ta otse läbi takistuse. Lähenemispunkti otsing teeb korraga kuni kolm marsruudikatset ja proovib tõrke korral järgmisel katsel teisi kandidaate; otsingu edenemine säilib save/hash olekus. Teenindusliikumine läbib kitsad pöördepunktid täpsemalt ja saab mööda takistuse serva libiseda läbitaval pinnal, vältides korduvat samasse nurka kinnijäämist. Lao remondivaru väheneb ainult tegeliku remondi korral. Parandatud nii sõiduki kui ka hoone remondi haru: varem võis liiga kauge ladu varust ilma jääda ka nullremondi korral.

HUD näitab tulemissiooni puhul peatumist, liiga pikka/lühikest kaugust, vaatleja puudumist ja laadimist. Remont näitab lähenemist või lähedase remondivaruga lao vajadust. Sobiv, kuid liikumiselt keelatud relv annab eraldi peatumise selgituse.

## Determinism ja kontroll

Muudetud käitumine kasutab fikseeritud sim-aega ja JSON-parameetreid. Save/load säilitab olemasoleva täieliku üksuse oleku. Replay/lockstep hash hõlmab nüüd ka tulekeeldu, hoidmist, prioriteeti, nav-teekonda, ehitajate seost ja patarei ajastust, et nende lahknemine oleks tuvastatav. Multiplayeri kliendid peavad kasutama sama buildi; vana buildi hash ei ühti uuega.

Kaheksa sihitud kontrolli katavad pikema lisaraketi auto-tuld, avatud tulejoont/otsest sihtmärki, tulekeeluga liikumist, käsuvahetust ja save/load determinismi, patarei peatumist/päris mürsku, inseneri takistust/remondivaru, taandumist ning peatumist/sobimatut rünnet. Kontrollitud ka olemasolevaid relvade, garnisoni, transpordi ja replay juhtumeid ning generaatorist tehase ja tankitootmiseni ulatuvat ehitusketti. Kaks vananenud relvatesti viidi vastavusse tegeliku kaardifiks­tuuri ja mudeli mõõtkavaga.

Brauseri visuaalne mänguproov, pikk matš ja selle etapi GPU FPS jäävad kontrollimata: keskkonnas puudub Chromium. A6 terviklik alpha läbipääs pole selle koodiparandusega lõpetatud.
