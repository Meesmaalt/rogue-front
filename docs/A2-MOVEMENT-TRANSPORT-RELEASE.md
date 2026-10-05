# A2 — teeliikumine ja vägede transport

05.10.2026. Muudatused on otse mängu olemasolevas käsu-, navigatsiooni-, liikumis-, lennu- ja HUD-tsüklis. Projekti ZIP-i selles etapis ei uuendatud.

## Mängija käsud

- **Kiirliigu / G + paremklõps**: eeldatava läbimisaja järgi marsruut. Arvestab sõidukiklassi, teed, metsatihedust ja nõlva. Pikem tee võib olla kiirem. Kaardil ja minikaardil sama käsk. Omaalgatuslikult ei peatuta vastast jälitama; olemasolevad relvapõhised liikudes laskmise piirangud säilivad.
- **Liigu**: tavaline marsruut. **Ründeliiku**: otsib lahingupositsiooni olemasoleva combat/LOS loogikaga. Shift säilitab iga vahepunkti käsustiili.
- **Sisene**: vali jalavägi ja paremklõpsa oma APC/IFV/taktikakopterit; töötab ka kandja valimisel ja jalaväe paremklõpsamisel. Järjekorras olevad rühmad broneerivad istmed kohe.
- **Välju / U + paremklõps**: kandja liigub väljumiskohta; kopter maandub. Sobivad vabad kohad leitakse nav-ist. Kui väljapääs on kinni, reisija jääb pardale. Tavaline paremklõps liigutab ka täis transporti, ei sunni reisijaid kohe väljuma.

HUD näitab hõivatud/broneeritud kohti, ootel rühmi ja pardal olevaid üksusi. Valitud pardal olevalt rühmalt saab nupuga kandjale tagasi minna.

## Kohtade arv

Need on mängu tasakaaluandmed, mitte väide kõigi pärissõidukite konfiguratsioonide kohta.

| Fraktsioon | APC | IFV | Transpordikopter |
| --- | ---: | ---: | ---: |
| USA | 9 | 6 | 32 |
| Venemaa | 8 | 8 | 48 |
| Hiina | 10 | 7 | 24 |

Kohti loetakse elavate rühmaliikmete, mitte rühmade arvu järgi. Terve rühm peab mahtuma; automaatset rühma poolitamist ei lisatud. Näiteks mõni suur laskurirühm mahub APC-sse, kuid mitte väiksema IFV-sse. Luure-, ATGM-, MANPAD-, snaipri-, miinipilduja- ja insenerirühmad kasutavad sama sobivusreeglit. Ressursilao kogumiskopterid jätkavad ressursivedu.

## Liikumine ja jõudlus

Kitsas läbipääs tuvastatakse nav-jälje ümbrusest, järjekord tuleneb tegelikust edenemisest ja järgneja hoiab vahet. Lõppformatsiooni kohad jäävad alles. Seisvatest sõidukitest möödumiseks kasutab takerdumise marsruut ka ajutisi kehatakistusi. Parandatud on nav-raku algpunkti poole tagasipööramine, mis põhjustas väravas ummiku.

Maastikukulu lahendatakse ja puhverdatakse World/klassi järgi. Grupi liikmete otsing jagatakse ühe sammu sees; möödumisjärjekord kasutab jooksvaid positsioone. A* silumise otsingul on piiratud ettevaade. Ebaõnnestunud väljumist ei otsita uuesti igal kaadril. Need vähendavad korduvat tööd; FPS-i tõusu pole mõõdetud.

## Kontrollitud

`npm run build` sisaldab TypeScripti kontrolli. Valitud Vitesti kontrollid:

1. Pikem maanteemarsruut säilib ja APC jõuab varem kohale kui otse läbi metsa; Shift-käsud hoiavad eri stiile.
2. 12 tanki/APC/jalaväe segagrupp läbib päris 960 m Roheoru baasi värava, jõuab lõppkohtadele ja liigub seejärel läbi asula järgmisesse sihtkohta.
3. APC kogub ATGM/MANPAD-rühmad, ei broneeri liiga palju kohti ja jätab väljuvad rühmad navigeeritavatele eraldatud kohtadele.
4. Kopter kogub luurerühma, sõidab väljumiskohta ja maandub; poolelioleva veo save/load jätkub sama hash-iga.

Lisaks kolm A1 regressioonikontrolli: research/uuendus/remont/salvestus, fraktsiooni tootmise tegelik töömaht, jagatud ulatuse/maastiku/inteli reeglid. Kokku **7 sihitud kontrolli**, mitte kogu testihoidla ega pikk tehisintellekti matš.

## Veel ootel

Brauseri HUD/animatsiooni visuaalne ülevaatus, pikk täieliku World.tick tsükliga lahing, vastassuunaliste suurte kolonnide liiklus ja kahe multiplayer-kliendi kontroll. Uued käsud ja seisundiväljad on save/hash-tsüklis, kuid see ei asenda kahe kliendi läbiproovi. Vanade buildide replay või eri buildidega võrgumatš pole toetatud.

Järgmine etapp **A3**: hoonetesse sisenemine ja sealt väljumine, päris relva-/luurepunktid, garnisoni kate ja hoonekahjustuse mõju.
