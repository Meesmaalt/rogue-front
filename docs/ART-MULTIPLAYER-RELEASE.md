# 3D-tehnika ja multiplayer’i põhikorrastus

## Mängus kasutatav art

- 63 originaalset GLB-varianti: 21 tehnikarolli kõigis kolmes fraktsioonis. Kaldsoomus, fraktsioonide erinevad tornid, ratastega/roomikutega veermikud, optika, mootorivõred, hoiukastid ja relvasüsteemid.
- USA liivakarva, Venemaa roheline ning Hiina digitaalse mustriga kamuflaaž. Meeskonnavärv on eraldi märgistus, mis ei asenda fraktsiooni välimust.
- M270 jälgitav kahekordne raketikonteiner; Smerch/PHL veoauto-tüüpi toruraketiheitja; SPAA radar ja relvad. Need mudelid asendavad vastavate olemasolevate üksuste vaateid.
- Lennukite tiivad, sabad, õhuvõtuavad, düüsid, raketid ja telik; kopterite vastassuunalised või tandemrootorid. ECM kasutab nüüd lennukimudelit. Lennurežiim peidab teliku; renderdus tõstab lendava üksuse maapinnast kõrgemale.
- Tanki vedrustuse kalle arvestab kohalikku sõidusuunda ja on maastiku järskudel liitekohtadel piiratud ±20°-ni.
- Torn jälgib olemasolevat turretYaw'd; põhikahur liigub tule sündmuse tagasilöögiga; rootorid animeeruvad. Pehmed kontaktvarjud lisavad sügavust ka ilma liikuva üksuse shadow-map kirjutamiseta.
- Peamenüü 3D ARSENAL näitab samu varasid, mida lahingu UnitRenderer kasutab. Vaatlus toetab fraktsiooni/rolli valikut, hiirega pööramist, suumi ning automaatpööramise peatamist.
- GLB-geomeetria ja põhjamaterjalid on instantside vahel jagatud. Staatilised detailid on materjali kaupa liidetud; piir 5824 kolmnurka ja 20 materjaligruppi platvormi kohta. Kõigi varade maht umbes 8,6 MB.

Need on stiliseeritud originaalmudelid. Sama perekonna rollivariandid jagavad geomeetriat; need ei ole iga päris masina täpsed mõõtkavamudelid. Jalavägi, hooned ja merevägi ootavad järgmist art-passi.

## Multiplayer’i parandused

1. Autentimine otsib konto UUID järgi õige kasutaja; kontoandmed olid salvestatud kasutajanime võtme alla, mistõttu varasem lobby autentimine nurjus.
2. Esimene ready-kinnitus käivitab simulatsiooni. Server määrab mõlema meeskonna fraktsiooni ja decki; mõlemad kliendid loovad sama HQ+inseneride algseisu.
3. Decki limiidid ja battlegroup on mõlema meeskonna jaoks simulatsioonis. Hash ei sõltu kohaliku HUD-i tootmisjärjekorra alias'est. Võrgukäsud lähevad ka replay-salvestisse.
4. Ühenduse katkemisel ootab lahing. Taasühendus mängib vahele jäänud käsusammud läbi, mitte ei hüppa simulatsiooniga tulevikku. Server säilitab 1800 ticki taastamisakna (60 simulatsioonisekundit).
5. Server võrdleb ready-hash'e; desync peatab tegelikult mõlemad kliendid. Vigane või aegunud sessioon lõpetab ühenduse korduva tühja taasühenduse asemel.
6. Websocket kasutab sama päritolu `/ws` rada. Vite ja Compose/Nginx sisaldavad API/WS proxy-seadistust; kontoandmetel on Compose’is püsiv volume.

## Elementaarsed kontrollid

- `npm run build`: TypeScript ja Vite tootmisbuild läbisid. Mittetõkestav API impordi bundleri teade jääb.
- `npx vitest run src/sim/CoreLoop.test.ts src/sim/SaveState.test.ts`: 6/6 testi. Sealhulgas kahe perspektiivi decki piirang, päris tootmine, sama hash ja snapshot'i taastamine.
- Kaks eraldi autentitud brauserikonteksti + päris Node/WS server: USA vs Hiina, esimene tick, hiirega liikumiskäsk mõlemale kliendile, socketi katkestus ja sama lehe reconnect, 20 ühist ticki ning sunnitud desync'i peatamine mõlemal poolel. Pageerror'e ei olnud. `art-multiplayer-check.json`.
- Seitsme mudeli brauserivaatlus ja kampaanialahingu avamine: `art-browser-check.json`; pildid `docs/checks/arsenal-*.png` ja `art-in-battle.png`.

Täielikku testikomplekti selles art-uuenduses ei korratud. Docker/Nginx konfiguratsiooni konteinerkäivitust, WAN-võrku, serveri taaskäivitust ega pikka võrgulahingut ei kontrollitud. Serveri ruumid ja käsuajalugu on mälus; taaskäivituse järel aktiivset lahingut ei taastata. GPU 60 FPS-i ei väideta: brauserikontroll kasutas tarkvaralist WebGL-i.
