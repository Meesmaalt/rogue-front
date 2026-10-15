# Kiirem arendusring

Arenduseks kasuta Vite'i, mitte iga muudatuse järel Portaineri image'i rebuildi. Projekti juures `npm ci` ja `npm ci --prefix server`; ühes terminalis `npm run server:start`, teises `npm run dev`. Portaineri pull/rebuild jääb kontrollitud muudatuse avaldamiseks.

- `npm run test:tactical`: lühike sihitud ring uue mõõtkava, kaubalennuki, maastiku, ettevalmistatud kaardi ja trajektooride jaoks.
- `npm run bench:map`: sama seemne ja kolme kaardisuuruse generaatori/valideerimise ajad eraldi. Väljund on JSON-ridadena; kõrvuta sama masina ja sama versiooniga.
- `npm run art:cargo`: ehitab ainult kuus kaubalennuki GLB-d. Täielik `art:build` jääb kogu mudelipaki muutmiseks.
- Enne `main` avaldamist: `npm run typecheck`, `npm test`, `npm run build`, `npm run test:release`; serveri muudatusel lisaks `npm run test:server`.

Jõudlust võrdle sama seemne, kaamerakoha, aknasuuruse ja kvaliteediga. Liigu/lahingi vähemalt 30 sekundit ja salvesta F8 raport. Erista kaardi ettevalmistus, üks kaadri jõnks ja püsiv FPS; vaata CPU/GPU jaotust ning kaadriaegade jaotust. Üks aeglane maksimaalne kaader üksi ei näita põhikoormust.

Häälestus on andmefailides: `battle-scale.json.compact` (lahingumõõtkava), `effects.json` (raketi nähtavus ja osakeste piirid), `map-generation.json.interiorLandscape` (sisemaastik). Muuda korraga üht mõõdetavat asja. Uue geomeetria generaatoriversioon peab olema eraldi, et salvestatud seemned ei muudaks tagantjärele kaarti.

Peamenüü kasutab nüüd serveri või eraldi browser-worker'i ettevalmistatud kaarti; samale kaardile ei käivitata nupuvajutusel teist generaatorit. Kõrguspuhvri ruumiline vee/sillaindeks jätab samad arvutustulemused alles. See on eelistatud optimeerimisviis: kõrvalda korduv töö ja kitsenda päringud, seejärel vähenda geomeetria või efektide kvaliteeti alles mõõtmise alusel.
