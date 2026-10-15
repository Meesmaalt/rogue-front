# Protseduurkaart v11 · 15.10.2026

Maapinna nähtamatus tuli `TerrainDetail` normaali-shaderi kokkupanekust: `#ifdef` asus avava loogelise sulu järel samal real ning `#endif` neelas sulgeva sulu. Direktiivid on nüüd eraldi ridadel. Shaderi vahemäluvõti muutus. Pinnadetail ei lisa meshe, joonistuskutseid ega iga kaadri geomeetriat.

Kaardid: 2048, 2560, 3072, 4096, 5120 ja 6144 m. v11 suurendab jõe lookeid mõõtkavaga ning valib metsamaad korreleeritud piirkonnamüra järgi. Metsad moodustavad külgnevate kruntide massiive; olemasolevad teede, vee ja lennuvälja puhvrid säilivad. Vanad generaatoriversioonid ei muutu.

Uue lahingu alguses küsib üksikmäng serverilt värske kaardi. Server genereerib geomeetria ja kontrollib tegelikul navivõrgul baaside ühendust ning üheksa ressursipunkti ligipääsu; lennuraja proovipunktid peavad olema kaardil, kuival maal ja hooneteta. Kuni 12 seemnekatset, kuni kaks workerit, 90 s tööpiir. Kahe workeriga piirang hoiab ka ebaõnnestunud päringute koormuse piiratud. Worker ei blokeeri lockstep-serverit. Lobby ja ranked saavad samuti serveri valitud uue seemne; lobby kaarti jagatakse kõigi mängijatega enne READY-t ja alustamisel säilitatakse sama kaart.

Kordamiseks saab üksikmängus märkida „Korda sisestatud seemet”. Kui server ei vasta, kasutatakse sama generaatori kohalikku kontrolli. Ka siis ei käivitata kontrolli mitteläbinud kaarti. Kontroll toimub mängu eel, mitte lahingu ajal. Väikestel uutel meetrikaartidel on sama 256×256 udupuhver ja piiratud vaatlejate arv nagu suurtel kaartidel.

## Käivitamine ja kontroll

Server koos jagatud generaatoriga: `npm ci`, `npm ci --prefix server`, `npm run server:start`. Docker Compose ehitab serveri nüüd juurkontekstist mitmes etapis. Serveri koodi muutmisel tuleb ka multiplayer-konteiner uuesti ehitada.

Kontrollid: `npm run typecheck`, `npm test`, `npm run build`, `npm run test:release`, `npm run test:server`. Uued testid katavad kõik 36 suuruse/piirkonna kombinatsiooni, taastamise, blokeeritud baasi tagasilükkamise, väikese kaardi nähtavuseelarve, serveri tegeliku HTTP genereerimistee ja sama kaardi jagamise kahe mängija vahel. Serveri test kontrollib ka `/healthz` vastust workeris genereerimise ajal.

Parandatud Three standard-shaderi tegelik laiendatud vertex/fragment-kood kompileerus ja linkis Mesa surfaceless EGL tarkvaralises OpenGL-is nii bump-kaardiga kui ilma ning koos sõjaudu muudatusega. Brauseri Chromium puudub selles keskkonnas; mängu ekraanipilti ja riistvara GPU/FPS-i ei ole siin uuesti mõõdetud.
