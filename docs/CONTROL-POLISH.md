# Juhtimise ja Roheoru viimistlus

Sihtpunktiga HUD-käsk või A/G/U/F/P käivitab kaardil vasaku või parema klõpsuga tegevuse. Tavaline vasak klõps valib üksusi; parem klõps annab kontekstikäsu. Shift lisab liikumise järjekorda ja hoiab liikumise sihtrežiimi avatuna; minikaardi parem klõps toetab sama järjekorda ja aktiivset koordinaatkäsku. Esc tühistab sihtrežiimi enne mängu pausile panemist. Patrull ei kasuta enam kaamera keskpunkti.

Shift-klõps eemaldab üksuse valikust, topeltklõps samale üksusele valib ekraanil sama tüübi, kiire klõps eri üksustele seda ei tee. Ctrl+number salvestab grupi; grupi numbri kaks vajutust keskendavad kaamera. Laetud ja surnud üksused eemaldatakse valikust. Tekstiväljal kirjutamine ei käivita mängukäske.

Kursori juures kuvatakse aktiivne käsk või kontekstivihje. Läbimatu siht/teekond annab sim-sündmusega põhjuse ja jätab senise käsu alles. Segavalikus saavad majja sisenemise ainult jalaväeüksused; peatumine katkestab poolelioleva uksele lähenemise. Vaenlase ründekäsk eelistatakse sõbralikule kontekstitegevusele.

Kaugvaate nimed püüavad leida vaba ekraanikoha ja kasutavad vajadusel kompaktset klassiikooni. Nihutatud silt ühendatakse üksusega joonega. Jõgi kasutab jagatud voolutekstuuri ja majade ümber on maapinnaga sobituv tagasihoidlik õuepind. Need visuaalid ei muuda simulatsiooni.

## Jõudlus

A* taaskasutab NavGrid-põhist töömälu ja põlvkonnatempleid, vältides iga üksuse käsul suurte massiivide loomist/täitmist. Kaheksa suuna octile heuristika annab täpsema alumise piiri kui senine Eukleidiline heuristika. Otsingud jäävad järjestikuseks ja deterministlikuks; marsruudivalik võib varasemast erineda.

Üks CPU-profiil Roheorus: 96 liikuvat üksust, kaks HQ-d, 48 üksuse ründeliikumiskäsk; kuus soojendustikki ja 60 järgnevat tikki. Käsutikki aeg 119,6 → 39,8 ms. Järgnev keskmine 2,60 → 2,40 ms; p95 5,08 → 6,07 ms. See ei tõenda püsiva FPS-i paranemist ega välista suure armee käsuhetke jõnksu. Mõõtmised: `docs/checks/control-profile-before.json`, `control-profile-after.json`; skript `node scripts/profile-simulation.mjs <väljund.json>`.

## Kontroll

Tootmisbuild ning sihitud sisendi, maja/stop/tõrke ja nav kontrollid. Brauseripildi, GPU FPS-i ja tegeliku hiirega mängitavuse ülevaatus jääb ootele: selles töökeskkonnas puudub Chromium. A6 õpetus/save-load/alpha läbipääsu tervik pole selle etapiga lõpetatud.
