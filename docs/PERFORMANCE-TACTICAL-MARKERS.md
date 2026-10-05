# Jõudlus ja taktikalised üksusemärgid

Kasutaja suunis: vähendada lagi enne A6; lisada kaugvaates nimed ja klassiikoonid.

## Muudatused

- Vision kasutab staatiliste takistuste jaoks 32 m ruumilist indeksit. Pööratud ristkülikute/ellipside täpsed jalajäljetestid, kõrgus, varemed ning senine 2 m combat-LOS samm säilivad. Indeks on tuletatud olek, mitte uus save/hash komponent.
- Dünaamiliste hoonete LOS valib kiire konservatiivse kiirpiirangu abil ainult võimalikke takistusi.
- Renderduse varustusikoon küsib varustatust ainult siis, kui ammo/fuel/supply on madal. Garnisoni HUD ja maastik koguvad oma üksuste hõivatuse ühe läbimisega, mitte iga maja kohta uuesti.
- Metsade/majade kahjustuspilt ja ressursipaikade pilt uuenevad 5 Hz; mürsud, üksuste liikumine ja tuleefektid säilitavad kaadrisageduse. Simulatsioon töötab endiselt 30 Hz.
- Fog kasutab ühte taaskasutatavat rasterpintslit, mitte iga üksuse jaoks uut gradienti; ekraanivälised ringid, veetud ja ehitatavad üksused jäetakse välja. Pildi 10 Hz uuendus töötab ka pausi ajal kaamerat liigutades. Tegelik vastase nähtavus tuleb endiselt simist.
- Dubleerivad üldised range-ringid eemaldati HUD-overlayst; relvapõhine RangeOverlay ja HUD-i lüliti jäävad kasutusse. Valitud üksuse LOS-joon küsib tulejoont kuni 10 Hz.
- Kaugvaade (<2,5 ekraanipikslit maailmameetri kohta) näitab liikuvatele üksustele fraktsioonipõhist nime ja klassimärki. Valitud ja nähtavatel vaenlase üksustel on märk ka lähedalt. AT, MANPAD/AA, recon, jalavägi, soomus, suurtükivägi, logistika, kopter, lennuk ja merevägi on eristatavad. Märgile klõpsamine valib tegeliku üksuse; valik kontrollib uuesti nähtavust ja transporti.
- Nime laiused on vahemälus; kattuvad nimed taanduvad klassiikooniks. Valitud nimedel on prioriteet. See on 2D canvas-kiht, mitte uued 3D mesh'id.

## Elementaarne kontroll

`npm run build` õnnestus. 8 sihitud kontrolli läbisid: Vision (4), garrison (3), taktikaliste klasside eristus (1). Visioni uus kontroll võrdleb kogu fog-seisundit ja combat-LOS tulemusi vana kõiki takistusi läbiva variandiga 120 pööratud takistuse korral; valitud ruudus on kandidaatide arv alla kümnendiku kõigist takistustest.

FPS-i ega GPU aega brauseris ei mõõdetud. Need parandused eemaldavad konkreetsed koodis nähtavad kulud; need ei tõesta veel, et kõik lagi allikad on kõrvaldatud. Järgmine ülevaatus peab kasutama sama kaarti/üksuste arvu/kaamerat ning eristama CPU simulatsiooni ja GPU/renderduse koormust. Nimepaigutus ja ikoonide loetavus päris brauseris on samuti veel ülevaatamata. Multiplayeri kahe kliendi kontroll jäi selles etapis tegemata; sim ei kasuta renderduse aega ega juhuarve.
