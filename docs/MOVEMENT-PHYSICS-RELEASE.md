# Liikumisfüüsika ja vedrustus · 15.10.2026

## Mängus muutub

Meetrites reeglistiku maasõidukid kasutavad kiirendusel ja pidurdusel nõlva suunalist gravitatsiooni, veeretakistust ning tee/pinnase/metsa haarduvust. Tippkiiruse vana nõlvakordaja asemel mõjutab tõus tegelikku veojõudu, langus pidurdusvõimet. Kui kahjustatud mootori jõust tõusul ei jätku, kiirus langeb kuni seismajäämiseni; tagasiveeremist hoiab parkimispidur. Mootori madala käigu veojõu piir väheneb kiiruse kasvades. Koormatud varustusveoki suhteline mass vähendab kiirendust. Võimsust, veojõudu ja massisuhet kasutatakse mängulise lähendusena, mitte konkreetsete päris sõidukite tehniliste andmetena.

Kurvi eelne kiirusepiir arvestab külgkiirendust ja pidurdamiseks jäänud teed. Pööramiskiirus väheneb sõiduki kiirusega ning sõltub samast pinnase haarduvusest. Stoppkäsu järel jääb pidurdusteekond; käigu suuna vahetamisel pidurdab sõiduk enne tagurdamisele üleminekut, säilitades kere suuna. Kiiruse ja teepikkuse integraator arvestab ka sammu keskel toimuvat täielikku peatumist.

Meetrites lennukite kere kalle tuleb seosest `tan(kalle) = kiirus × pöördekiirus / g`. Lubatud pöördekiirus arvestab lisaks külgkiirenduse piirile suurimat lubatud kallet. Rajale joondumise ja baasi naasmise käitumine läbis regressioonikontrolli kolmel rajakursil.

## Visuaalne tagasiside

Sõidukite vedrustus kasutab summutatud vedru analüütilist lahendit: kere reageerib kiirendusele/pidurdusele ja kurvi külgkiirendusele ning rahuneb pärast manöövrit. Vastus on ajasammust sõltumatu ja pausil peatub. Maastiku pitch/roll jääb piiratuks. Väike vertikaalne teevibratsioon lähtub läbitud vahemaast.

Liikumistolm kasutab tegelikku nihkumist, mitte soovitud kiirust. Takistuse taga seisev sõiduk ei tolma pelgalt aktiivse liikumiskäsu tõttu; tolm jääb tegeliku liikumise taha ka tagurdamisel. Teel on tolm väiksem ja hallikam. Kopteri veepinna lähedane rootoriefekt kasutab veepinna kõrgust ja heledat pihust.

## Arhitektuur ja piirid

`sim/groundDynamics.ts` sisaldab deterministlikke jõu-, integraatori-, kurvi- ja lennukikalde arvutusi. `units.ts` ühendab need nii maasõidukite kui maanteevarustuse liikumisega. Parameetrid asuvad `mobility.json.groundPhysics` ja `mobility.json.presentation` all; gravitatsioon tuleb `physics.json`-ist. Vedrustus on ainult renderduse olek ning ei mõjuta simi/replay räsi. Lisanduvat simi olekut pole: vajalik kiirus, käik, veoseis ja komponendikahjustus olid juba salvestatud ning räsitud.

See on RTS-i piiratud sõidudünaamika, mitte jäikade kehade täielik füüsikasimulatsioon. Maapinnakontaktid ja navigeerimine kasutavad endiselt jalajälge; rataste eraldi kontaktid, külglibisemine, ümberminek, omavahelised põrkeimpulsid ja lennuki aerodünaamiline varisemine ei kuulu sellesse paketti. Jalavägi, merevägi ja ajalooline meetrimõõtkavata reeglistik säilitavad oma varasema liikumisprofiili. Järsk nõlv võib olla navigeerimisruudustikus läbitav, kuid tugevalt kahjustatud või raske sõiduki veojõud ei pruugi selleks piisata.

## Kontroll

Sihitud testid katavad nõlva jõudude suuna, pinnase haarduvuse, koormatud veoki, mootorikahjustuse, pidurdusteekonna `v²/(2a)`, sammu sees peatumise, järsul tõusul seismajäämise, kurvi eel pidurdamise, lennuki kalde, tagurdamise käiguvahetuse ning salvestusest identselt jätkumise. Vedrustuse kontroll võrdleb 30 ja 120 FPS vastust; efektide kontroll tõendab liikumatu sõiduki tolmu puudumist. Kõik 314 testi 73 failis läbisid täieliku kontrolli (442,62 s), sh 15 minuti AI taastumislahing. Kõik 40 sihitud testi läbisid eraldi kontrolli. `npm run typecheck` ja `npm run build` õnnestusid. Playwrighti brauserikatse peatus puuduva Chromiumi käivitusfaili tõttu.

Brauseris visuaal, mängutunnetus ja F8 FPS-võrdlus jäävad eraldi kontrollida. Olekutestid ei kinnita päris WebGL pilti ega tegelikku FPS-i.
