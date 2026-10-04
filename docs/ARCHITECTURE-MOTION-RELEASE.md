# Roheorg: hooned, suurem vaade ja liikumine

04.10.2026. See muudatus ühendab uue välimuse olemasoleva simulatsiooniga.

Roheorg on nüüd 640 × 640 m: teed, põllud ja metsad on laiendatud, hoonete ja üksuste füüsilised mõõtmed säilivad. Vaikimisi kaamerakaugus on 150, suumi ulatus 58–360. Valmis baasi alguses on mõlemal poolel Air Command, helipad ja üks maandunud kopter; eesliini alggrupid jäävad lahingu alustamiseks keskmele lähemale.

`render/Architecture.ts` annab elamutele ja tootmis-/juhtimishoonetele tekstuurid, viilkatused, aknad, vihmaveetorud, ventilatsiooni, antennid ning kasutusotstarbele vastavad detailid. Staatiline geomeetria liidetakse materjali järgi. Need on algupärased koodist loodud mudelid, mitte lõplik fotorealistlik keskkonnakunst.

`data/mobility.json` juhib olemasolevas `systems/units.ts` kiirendust, pidurdust, pöörde- ja maastikumõju. Formatsioon pööratakse sõidusuunda ning üksused jaotatakse külgasendi järgi, vähendades ristumist. Sõiduki kere järgib maastiku kallet.

Kopteri lennukõrgus on 30 m maapinnast; lennukil 80 m ja CAP-il 95 m. Tõus, laskumine, kiirus, pöördekalle ja maandumislähenemine arenevad simulatsioonis järk-järgult. Lennuk jätkab õhus liikumist ka sihtpunkti saavutamisel. Maandumine ja taastäitmine kasutavad endiselt tegelikku airbase/helipad'i ning piiratud depoovarusid. Õhutõrjemürsk arvestab nüüd sihtmärgi tegelikku kõrgust. See on deterministlik kinemaatiline liikumine, mitte jäiga keha või aerodünaamika füüsikamootor.

Liikumisolek salvestatakse entiteediga; kõrgus ja lennuolek kuuluvad ka lockstep-hash'i. Mõlemad multiplayer-kliendid peavad kasutama sama versiooni. Maailma ruudustiku ulatus on nüüd kõigil kaartidel 640 m; teiste kampaaniakaartide objektipaigutust ei skaleeritud. Vana mõõduga Roheoru automaatsalvestuse asemel kasutatakse uut `.layout2` salvestusvõtit. Erineva mõõduga vana fog-võrk arvutatakse laadimisel uuesti.

Kontroll: TypeScript/Vite build ning üks lühike brauseriproov (umbes 8,5 simulatsioonisekundit). Proovis avanes valmis baas ja kopter tõusis 12,6 meetrini; ühtlasi salvestati 160 × 160 nägemisvõrk. Täielikku lennu-/RTB-tsüklit, uut tasakaalu ega pikemat võrguvastasseisu selles muudatuses läbi ei mängitud. Eraldiseisva eelvaate konsoolis oli üks ressursipäringu `ERR_EMPTY_RESPONSE`; selle päringu URL ei salvestunud. Pildid ja olekuväljavõte on `docs/checks/architecture-*`.
