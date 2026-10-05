# A3 — jalavägi hoonetes ja linnalahingu ühendused

05.10.2026. Muudatus on ühendatud olemasoleva World.tick, navigatsiooni, lahingu, luure, salvestuse, renderduse ja käsuliidesega. ZIP-i ei uuendatud.

## Kuidas kasutada

Vali jalaväerühm ja paremklõpsa sobival tsiviilhoonel. Rühm liigub läbitava fassaadi ukse juurde; käsk ise ei teleporteeri rühma majja. Hoone mahutavus on pindala järgi 1–4 rühma, tellimus broneerib koha. Vaenlase hõivatud või juba teisele poolele broneeritud majja ei sisene. Ressursirajatised ja tootmishooned ei muutu garnisoniks.

Tühja valikuga majal klõpsates avaneb hoone paneel. Oma rühmad saab sealt valida. Valitud garnisonilt saab määrata **Vaatesuuna** ja paremklõpsata suunda või kasutada **Välju hoonest**. **U + paremklõps** väljub ning annab liikumissihtpunkti; tavaline liikumiskäsk väljub samuti. Vaba väljapääsu puudumisel rühm ootab. Patrull, remont ja ehitus ei tööta enam ekslikult akna- või katusekoordinaatidelt.

## Lahing ja luure

Rühmal on neli võimalikku fassaadisuunda ning ligikaudu 138° laskmis-/luuresektor. Ümberpaiknemine toimub piiratud sagedusega; automaatne suunamine kasutab nähtavat kontakti, mitte varjatud vastase koordinaate. MANPAD kasutab katusepositsiooni. ATGM ja teised otsesihtimise relvad kasutavad akna ees olevat laskepunkti; enda sein ei peata väljuvat lasku, naabermaja võib tulejoone blokeerida. Katuse- ja aknapositsioon võivad samal fassaadil koos töötada.

Säilivad üksuse tegelikud relvapesad, moon, minimaalne/maksimaalne ulatus, tabavus, moraal ja suppression. Majas olev miinipilduja ei saa kaudtuld anda. Garnison saab katet ja varjatust, kuid lasu jälg ning vastase optika töötavad edasi. Katuserühm on rohkem avatud. Hoone kahjustamisel vähenevad kaitse, tabavust mõjutav kate ja varjatus.

Kahur ja HE-mürsk kahjustavad hoone struktuuri ning edastavad seesolijatele kahju ja survet; ka oma tulega saab oma garnisoni ohustada. Kasutuskõlbmatu maja tekitab varisemiskahju ja sunnib ellujäänud väljuma. Kui väljapääs on kinni, jätkub kinnijäänute kahjustamine. Killupõhist lammutamist ei lisatud.

## Nähtavus ja visuaalid

Oma hõivemärk näitab rühmade arvu ja mahutavust. Vaenlase märk ilmub ainult tegeliku luurekontakti korral ega avalda kogu peidetud garnisoni arvu. Hoone terviklikkust ei näidata varjatud alal jooksva infona. Kahjustatud maja tumeneb; varisenud maja muutub madalaks varemejäljeks. Renderdus uuendab seda vaateväljas või oma garnisoni olemasolul.

Hoone geomeetria on endiselt materjalide järgi ühendatud, kuid iga garnisonihoone säilib eraldi renderdusjuurena. Materjal kopeeritakse alles konkreetse maja kahjustamisel, et ühe maja värv ei muudaks kõiki sama materjaliga maju. Akna/katuse juures kuvatakse rühma esindajaid, mitte täit siseruumides liikuvate sõdurite simulatsiooni. Uksele lähenemine on füüsiline; liikumine hoone sees ja laskepunktide vahetamine on abstraheeritud.

## Salvestus ja kontroll

Garnisoni hõive, sisenemisbroneering, laskesuund ja väljumisjärjekord on Entity seisundis. Need kuuluvad olemasolevasse v19 täisoleku salvestusse ja worldHash-i. Hoone kahjustus kasutab olemasolevat infrastructureDamage kaarti. UI kursori režiim ei kuulu simulatsiooni olekusse.

Sihitud kontrollid: uksele lähenemine/mahutavus/vaidlustatud hõive; salvestuse jätkamise sama hash; tegelik AT/MANPAD raketilask ja moona kulu; naabermaja LOS; kahjustuse vähenev kaitse; suurtükimürsu mõju ja varisemisest väljumine; siseruumide kaudtule keeld. Lisaks kontrolliti A2 marsruudi ja transpordi regressioone.

Brauseri visuaalne ülevaatus, FPS-i mõõtmine, pika matši tasakaal ja kahe kliendi multiplayeri kontroll on veel ootel. Sihitud simulatsioonikontroll ei asenda neid. Järgmine tööpakett on A4: füüsiliste tarnete mahud ja taastumine, logistika selgus ning õhurajatiste erandolukorrad.
