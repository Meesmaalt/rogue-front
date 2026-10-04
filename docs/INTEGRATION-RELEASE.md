# Rogue Front — integreeritud üksikmängu arendusversioon

Kuupäev: 2026-10-04. Alus: `rogue-front-phase86-90-frontline-warfare.zip`.

See muudatus lõpetab mitu olemasoleva simulatsiooni katkist ühendust. See ei ole lõplik kunstilise kvaliteedi ja kogu kampaania tasakaalu väljalase. Uut nummerdatud faasi ei lisatud.

## Käivitamine

```bash
npm ci
npm run dev
```

Ava `http://localhost:5173`. Üksikmäng ei vaja kontot ega serveri autentimist. Menüüst saab valida USA/Venemaa/Hiina, kaardi, mängurežiimi, AI raskuse ning vaba rosteri või salvestatud decki. `dist/` sisaldab valmis build'i; serveeri seda näiteks käsuga `python3 -m http.server 8080 --directory dist`.

Algusahel: F2 → BUILDS → generaator → ladu. Saada teine insener ressursipunkti, et see hõivata ja käivitada. Ehita maaväe juhtimiskeskus; vali see ning ehita tehas laole piisavalt lähedale. LAND-paneelist tooda tank. Punane ehituskoht ei tühista enam ehitusrežiimi; parem hiir või Esc tühistab. Hoia baasi värav ja varustustee vabana.

## Mängutsükliga ühendatud parandused

- Parandatud TypeScripti ja käitusvead; majanduse alguskrediit vastab tegelikule baasi ehituskulule.
- Kampaania algobjektid ja skirmishi algbaasid ei teki enam samaaegselt. Kaamera alustab oma baasi juurest.
- Ressursirajatiste hõive ja inseneriga käivitamine on seotud tegeliku kogumistranspordiga. `receiveSupply` annab tarne saabumisel raha ning piiratud ammo/fuel/repair varud. Korduv FOB-i varustamine ei loo uut raha.
- Kohaliku lao varud, energia ja juhtimisharu mõjutavad päris tootmisjärjekorda. Katkestus jätab tellimuse alles ja peatab progressi; taastatud varud lasevad jätkata.
- Varukonvoi võtab varud pealaost, liigub päris veokina ning annab need eesliinilaole. Mängija marsruudi vahepunkte kasutatakse ka liikumissüsteemis, tagasisõidul vastupidises järjekorras.
- Baasi värava visuaal ja navigeerimisava kattuvad. Väravat ei saa hoonega sulgeda. Müüride ehituskeeld kasutab tegelikku pööratud jalajälge. Puuduv teekond ei käivita enam täiskaardi otsingut igal tickil. Konvoid tekivad läbitavas väljumiskohas.
- Inimese üksusi ei käsuta operatiivne AI ja frondijoon ei tekita tasuta reinforcement'e. Decki kaart kulub tootmises valminud üksusele; järjekorda võetakse vaid saadaolevad kaardid.
- Relvastatud toodetavate üksuste roll, optika, ammo/fuel, armor ja penetration on kontrollitud. Laiendatud numbrid on `src/data/units.json` andmetes ja neid saab seal tasakaalustada.
- Otsesihtimine ja tulistamine nõuavad tegelikku kontakti ning LOS-i. Armor/facing, penetration, accuracy, cover, suppression, morale ja komponentide seisukord mõjutavad lasku või liikumist. Varustuseta olek ei muuda baasdefinitsiooni täpsust jäädavalt.
- Fog of war, valimine ja minimap ei näita enam automaatselt kõiki vastase entiteete. Laaditud jalavägi ei anna iseseisvat nägemist. Transpordi hävimine eemaldab ka reisijad.
- Suurtükiväe käsud töötavad artillery/mortar/MLRS-iga. Kaudtule salve ei katkesta sama üksuse paralleelne otsetuli. Laskemoon kulub; mürsk jõuab päris tabamuseni; signatuur annab vastasele ajutise counter-battery kontakti.
- Õhuoperatsioonile valitakse kaardil sihtpunkt. Lennuk tõuseb õhku, arvestab tuvastatud AA-d, naaseb olemasolevale baasile ja täidab ammo/fuel ning remondib end piiratud laoarvelt.
- Hoonete upgrade ei jää insenerita lõputult pooleli. Ehitus lõpetab hoone täie HP-ga. Level muudab tootmist/unlock'e, energiat, käsuraadiust, radarit, lao mahutavust, lennuvõime mahutavust või remondivõimet vastava hoone järgi; renderdus lisab taseme moodulid.
- AI ehitab ja toodab päris kuludega, käivitab ressursipunkti ning hoiab esimesed tankid luksushoonete ees. Liiga varane FOB-i ehitus ei kuluta enam algusmajanduse raha.
- HUD-i ehitusnupud ei teki igal värskendusel uuesti; klõps ei kao DOM-i asendusse. Peidetud kontrollid on päriselt peidetud. Jalaväe visuaalne suppression ei kahanda mudeli asetust kumulatiivselt igal kaadril.

## Tulemus, kampaania ja taastamine

Conquest annab territooriumilt punkte (1000 või 20 minuti ajapiir). Breakthrough nõuab 20 sekundi vaidlustamata maaväe kohalolu vastase tagalas. Attrition loeb tegelikult hävitatud üksuse väärtust (1500 või 20 minutit). Assault annab ründajale HQ hävitamiseks 15 minutit; kaitsja võidab ajapiiril. Skirmishi lõpetab HQ hävitamine. Tulemus arvutatakse simulatsioonis, sõltumata renderduse sündmuste tühjendamisest.

Viie missiooniga kampaaniamenüü avab järgmise missiooni võidu järel. Tasud ei kordu sama missiooni teise võiduga. Õpetus kontrollib valmis generaatorit, ladu, saabunud tarnet, tehast ning toodetud tanki enne vaenlase lao ja HQ eesmärke.

v19 save/load sisaldab ka komponentide seisukorda, squad'i, ammo/fuel, suppression/morale, lennu- ja kaudtuleolekut, mürske, ootel käske, järjekordi, varusid, RNG-d, AI ajastust, nägemisvõrku ning decki/missiooni/režiimi progressi. Laadimine tühjendab vanad renderdusvaated. Salvestus on kaardi, režiimi ja fraktsiooni kaupa; võrgumängu ei laadita kohaliku salvestusega üle. Vana salvestuse puudunud välju ei saa tagantjärele taastada.

Formation on nüüd meeskonna simulatsioonikäsk, mis säilib save/replay kaudu. Replay v2 sisaldab algolekut; replay käivitaja peab seadistama sama kaardi ja kõrgusvälja. Tick-hash hõlmab lahingu- ja logistikaolekut ning ei sõltu kohaliku mängija rahakoti aliasest. Kohaliku võrgumängu perspektiivi vahetamine säilitab meeskondade fraktsioonid.

## Kontrollitulemused

- `npm test`: **47/47 testi, 13/13 faili**, viimane täielik jooks umbes 14 sekundit.
- `npm run build`: TypeScripti kontroll ja Vite tootmisbuild läbivad. API dünaamilise/staatilise impordi kohta jääb mittetõkestav bundleri teade.
- `CoreLoop.test.ts`: algbaas → neli ehituskäsku → päris ressursihõive ja veokitarne → toodetud tank, ilma lisaraha süstimiseta.
- `AIIntegration.test.ts`: kuus simulatsiooniminutit; AI rajab töötava tootmisbaasi, hõivab/käivitab ressursi, saab tarneid ja toodab tanki ilma lisaraha süstimiseta.
- `Integration.test.ts`: tootmiskatkestus ja jätkamine; inimüksuste autonoomia; täieliku JSON save/load-i identne jätkamine koos mürsu ja ootel käskudega; režiimi tingimused.
- `SystemsIntegration.test.ts`: ehituslevel, suurtükiväe tabamus, lennuki sortie/RTB/taasvarustamine, füüsiline FOB-konvoi ja käsitsi marsruut ning rosteri numbrid. Kampaaniatest kontrollib viie missiooni eesmärgi- ja taastamisloogikat ettevalmistatud olukordades; see **ei ole** kogu kampaania lahinguline läbimäng.
- Nav-test: 200 liikuva jalaväe kontroll läbib olemasoleva keskmise 4 ms/tick piiri. See ei tõenda kogu renderduse 60 FPS-i pika segaarmee lahingus.
- Brauser: Chromium / tarkvaraline WebGL, 1440×1000; menüü → skirmish → briefing → hiirega generaatori paigutamine → valmis generaator → save/load. Tootmisbuild'i viimase kontrolli tulemus on `browser-check.json`.

## Lõpetamata töö enne lõplikku mängu

1. Kõigi kampaaniamissioonide inimese täielik läbimäng, tasakaal ja kaardispetsiifilised ummikud. Kontrollitud on eesmärkide juhtmestik, mitte kõigi lahingute raskus.
2. Jalaväe, hoonete ja mereväe kunstiline art-pass ning täpsemad platformivariandid. Tehnika esimene GLB-pass on nüüd mänguga ühendatud; vt `ART-MULTIPLAYER-RELEASE.md`.
3. Multiplayer’i pikk lahing ja WAN-tingimused. Kahe brauseri/serveri lühike start/käsk/reconnect/desync-kontroll läbib nüüd; see ei tõenda pika lahingu kõiki süsteeme.
4. Pikad performance/memory stressitestid segaarmee, kaudtule, õhuoperatsioonide ja suure baasiga; GPU renderduse 60 FPS mõõtmine.
5. Pika lahingu majandus- ja logistiline tasakaal, mereväe ning kõigi fraktsioonide terviklik praktiline läbimäng.

Need on reaalsed lõpetamata valdkonnad. Varasemad Phase-dokumendid ja funktsioonide olemasolu ei tähenda, et need kontrollid on tehtud.
