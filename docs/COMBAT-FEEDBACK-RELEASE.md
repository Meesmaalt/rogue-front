# Lahingu tagasiside ja trajektoorid · 14.10.2026

## Nähtav käitumine

- Liikuvatel maismaasõidukitel tekib rataste/roomikute taga tolm, ka tagurdamisel. Jalavägi ja veesõidukid seda ei tekita.
- Madalalt ja aeglaselt lendav kopter tõstab rootoritolmu; kõrgemal kui 14 m ja kiirustel üle 28 m/s efekt puudub.
- Alla 45% tervisega tehnika/hoone või üle 60% mootorikahjustusega sõiduk suitseb. Parandamine lõpetab uute osakeste tekke; olemasolev suits hajub.
- AP-/autokahuri ja kuulide läbistav tabamus kasutab lühikest sähvatust, metallisädemeid ning väikest suitsupilve. Maapinna tabamus tekitab tolmu. HE tabamuste suurem plahvatus jääb alles.
- APS tõrje annab eraldi `intercept` sündmuse: lühike hele sähvatus, killusädemed ja terav tõrjeheli. See ei tekita tavalise raketitabamuse plahvatust ega splash-kahjustust.

## Simulatsioon

Uues põhiklasside reeglistikus võrreldakse üksuste trajektoori esimese kontaktpinna aega maastiku/takistuse tabamuse ajaga. Kiire mürsk võib tabada tanki enne selle taga olevat seina ka siis, kui mõlemad asuvad sama 1/30 s sammu sees. Üksuse keha on horisontaalraadiuse ja kõrgusega ellipsoid; pelgalt keskpunkti lähedusest enam ei piisa.

APS kontrollib samuti tervet liikumissegmenti. Rakett ei saa kaitsepiirkonnast ühe sammuga läbi hüpata; varasem takistus ei kuluta kaitse laengut. Laengute täitmise ja HEAT-piirangu varasemad reeglid säilivad. Maastiku/takistuste kontroll kasutab jätkuvalt kuni 2 m proovivahet; see ei ole mudeli kolmnurkade täpne kokkupõrge. Varasem reeglistik säilitab oma tabamuskäitumise.

## Jõudluse piirid

`effects.json.ambient` juhib lisanduvaid efekte. Väljastus toimub 0,12 s järel, kuni 48 nähtavalt efekti vajava üksuse kohta korraga. Järgmine väljastus jätkab poolelijäänud nimekirja kohast. Üle 650 m kaamerakaugusel ja kaamera vaateväljast väljas ei teki uusi osakesi. Laaditud, hävinud, pooleli ehitatavad ja tuvastamata vaenlase üksused jäetakse vahele. Kõik efektid kasutavad olemasolevaid piiratud instantsipartiisid; uusi valgusallikaid ega varjude renderdusi ei lisandu. See piirab koormust, kuid ei ole brauseri FPS-mõõtmine.

## Kontroll

Sihitud testid kontrollivad tabamuste järjekorda mõlemal pool seina, ellipsoidi kontaktpinda/kõrgust, kiire raketi APS tõrjet ja laengu säilimist varasema takistuse puhul. Renderduse olekutestid kontrollivad terve seisva sõiduki efektide puudumist, liikumistolmu, mootorisuitsu, kopteri kõrguspiiri, udu/veetavate üksuste privaatsust ning osakeste eelarvet/resetti. Kõik 302 testi 72 failis läbisid täieliku kontrolli (243,60 s), sh 15 minuti AI taastumislahing. `npm run typecheck` ja `npm run build` õnnestusid. Playwrighti käivituskatse peatus puuduva Chromiumi käivitusfaili tõttu.

Brauseri visuaalne vaatlus, heli kuulamine ja F8 FPS-võrdlus on eraldi lõpetamata kontroll: selle keskkonna testid ei kinnita GPU pilti ega päris mängutunnetust.
