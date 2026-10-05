# Taktikaline tempo ja Roheorg layout 10

## Mänguga ühendatud muudatused

- Üksuste põhikiirused units.json-is: jalavägi −50%, maatehnika −22%, veok −18%, õhk −13%, merevägi −16%. Näiteks tank 9,5 → 7,41 m/s; jalavägi 6,8 → 3,4 m/s. Need pole väited tegelike sõidukite maksimumkiirustest, vaid selle mängukaardi taktikalisest tempost. Fraktsiooni, tee, maastiku, moraali ja komponentide kordajad jäävad kasutusse.
- Mobility kiirendus/pidurdus langevad koos kiirusega; tehnika pöörlemine on 15% rahulikum. Tavaline liikumine ja maanteekiirliikumine säilitavad erinevuse.
- Modelleeritud liikuvad üksused: jalavägi/merevägi 0,92; maatehnika 0,86; õhk 0,90. modelScale rakendub nii detailmudelile kui LOD-ile. Radius/height andmed ja relva muzzle/crew/tiiva väljalaskekohad kasutavad sama mõõtkava. Baasihooneid ei vähendatud.
- Grupi lõppformatsioon säilitab vähemalt 6,5 m vahed, et väiksem footprint ei suruks jalaväge peatunud tankide vahele. Kinnijäämine arvestab marsruudil edenemist. Parkinud masinate ümber otsitav tee lubab väljuda lähtekohta juba ümbritsevast turvavarust, kuid ei luba takistusele lähenedes sellest läbi minna. See kõrvaldab liikumiskontrollis ilmnenud lõputu kõrvalepõikamise.
- Roheorg 960 → 1088 m (+13,3% küljepikkus; +28,4% pindala). Senine teede/ressursside/baasiväravate paigutus hajutati 8%; välised ringteed ja metsad annavad lisaruumile külgrünnaku/logistika rolli.
- Kaardil 85 hoonet ja 192 objekti. Kaks linna koosnevad 6–7 m laiustest väikemajadest ja mõnest kahekorruselisest elamust, mitte juhuslikult hajutatud suurtest kuubikutest. Kvartalitänavad on 8–10 m laiad. Uute elamute ja teede ristumised eemaldati ristkülikute täpse eraldustelgede kontrolliga.
- Väikesed linnamajad võtavad ühe jalaväeüksuse; olemasolevad garnisoni, LOS-i, tankitõrje, MANPAD-i ja varisemise reeglid kasutavad tegelikke uusi jalajälgi.
- Majamudeli kõrgus sisaldab katust; varem lisandus andmetes antud kõrgusele veel 1,5 m katus. Väikesed verandad ja kauplusefassaadid annavad variatsiooni. Kaugemalt kui 235 m kasutatakse ilma fassaadidetailideta LOD-i; kahjustus mõjutab mõlemat taset.
- Kaamera algkaugus 180 → 220 m. Nimed ja klassimärgid annavad kaugvaates üksuse identiteedi.
- Roheoru automaatsalvestuse võti on layout10, et eelmine salvestus ei kasutaks muutunud paigutust. Vanad failid ei kustutata. Kaardi ühekordne autoritöö skript: scripts/maps/refine-roheorg.py (vajab lähteks layout 9; korduskäivitamine layout 10-l keeldub muudatusest).

## Kontroll ja piirid

Build ning 8 sihitud kontrolli: TerrainState 3, Pathfinder 2, garrison 3. Muudetud päris kaardil läbib 12 eri tüüpi üksuse grupp baasivärava ja jõuab järgmise marsruudi lõppu. Garnisoni AT/MANPAD raketid, varisemine ja save jätkamine säilivad.

Brauseri visuaalset ülevaatust, FPS-i, pika matši majandus-/kütuse-/missioonitasakaalu ning kahe kliendi lockstep matši siin ei mõõdetud. Suurem nav/vision võrk ja rohkem maju lisavad koormust; kaugmudelid ning eelmine jõudlusetapp vähendavad renderduskulu, kuid ei tõesta FPS-i kasvu. Aeglasem tempo koos suurema kaardiga muudab ülekande- ja reageerimisaega ning vajab mängulist hinnangut.
