# 3D-materjalid ja renderduse jõudlus — 05.10.2026

See pass muudab mängus ja arsenalis kasutatavaid originaalvarasid ning olemasolevat renderdajat. Simulatsiooni lähtefailid jäid eelmise ZIP-iga võrreldes samaks; lockstep, liikumine, relvade numbrid ja salvestuse formaat ei muutunud.

## Visuaal

- Tankide ja soomukite kere/torn: teravamad soomuspindade normaalid, juurdepääsupaneelid, väljalasked, veotrossid ja fraktsioonivarustus. Kergete tankide torn on väiksem. Väikesed detailid ühendatakse olemasolevate materjalipartiidega.
- Kõigi 63 tehnikavariandi materjalid: fraktsioonikamo, peen normaalikaart, kareduskaart ning geomeetriasse küpsetatud aluspinna tumendus ja tolm. See on odav pinnaviimistlus, mitte ray-traced ambient occlusion.
- Roheoru mets: varasema polüeedrikrooni asemel ebakorrapärase lehestikuga ristuvad lõiketekstuuriga pinnad; ka ülalt nähtav võra. Puud arvestavad pööratud metsapiirkonda ning hoiduvad teedest ja rajatistest. Puud on visuaal; metsapiirkonna olemasolev sim-varje jäi samaks.
- Maastiku peen pinnavariatsioon ja bump; sillutatud õuede/teede tera ja praod. Hoonete tekstuurid kasutavad bump'i, fassaadidele lisanduvad külgaknad ja soklid.
- Valgustus: väiksem ühtlane ambient/fill, mõõdukam exposure, kõrgel kvaliteedil kuni 2048 px varjukaart. Madala mälu või kitsama ekraani puhul 1024 px; madal/keskmine kvaliteet jäävad varjukaardita.

Mudelid jäävad originaalseteks stiliseeritud mudeliteks. See pole Wargame'i tasemel lõplik realistlik art; väliseid professionaalseid varasid ei imporditud. HUD-i varasemad 63 pisipilti ei renderdatud selle passiga uuesti.

## Jõudlus

Igal tehnikavariandil on nüüd eraldi kaugusmudel: kokku 63 detailset ja 63 taktikalist GLB-d. Mõlemal säilivad tornid, relvad, rootorid ja telik. Kaamerakaugusest ja kvaliteedist sõltuv vahetus kasutab hüstereesi; väikese valiku üksused saavad madalast kõrgema kvaliteedi puhul detailse mudeli. Kauged üksused ei muutu kastideks.

| GLB mõõdik | Enne | Detailne | Kaugusmudel |
| --- | ---: | ---: | ---: |
| Keskmine kolmnurkade arv | 2613 | 2935 | 1741 |
| Maksimaalne kolmnurkade arv | 5824 | 6256 | 2824 |
| Keskmine materjalipartiide arv | 13 | 6,24 | 3,90 |
| Maksimaalne materjalipartiide arv | 20 | 8 | 6 |

Detailne mudel kasutab keskmiselt umbes 52% vähem materjalipartiisid, kuid umbes 12% rohkem kolmnurki kui eelmine mudel. Kaugusmudelil on detailsega võrreldes umbes 41% vähem kolmnurki. Need on GLB-de mõõdikud, mitte kogu stseeni draw-call'id ega mõõdetud FPS. Allikas ja ulatus: `checks/art-performance.json`.

- Staatilised kaardihooned, teepinnad ja märgistused ühendatakse materjalide ning piirkondade kaupa. Mets kasutab 64 m piirkondade instantsipartiisid, et kaamerast välja jäävad metsad saaks peita.
- Üksused salvestavad tornide, relvade, rootorite, jalgade, teliku, olekumärkide ja ehitusriba viited. Neid ei otsita igal kaadril mudelipuust uuesti.
- Vaateväljast väljas liikuvate üksuste animatsioonid jäetakse vahele. Peidetud vastasele ei looda mudelit enne nähtavaks muutumist. Valgustust mõjutavad hooned säilivad varjukaardi jaoks.
- Staatilist varjukaarti uuendatakse kaamera ankruala, hoone lisamise/eemaldamise, taseme või ehitus/upgrade-kuju muutumisel. Liikuvad üksused kasutavad jätkuvalt kontaktvarju.
- Kui järelprotsess on välja lülitatud, renderdatakse otse WebGL-kanvasse: EffectComposer'i render-target'e ei eraldata. MSAA töötab otsekanvases.
- Minikaart värskendub kuni 10 Hz; kontaktide renderdus kuni 5 Hz. See ei vähenda 30 Hz simulatsiooni sagedust.
- Kohalik mäng laadib kahe kasutatava fraktsiooni varad. Võrgumäng laadib kõik kolm, sest vastase fraktsioon selgub hiljem.

## Kontroll

TypeScripti ja Vite'i tootmisbuild läbis. Üks lühike varakontroll kontrollis kõigi 126 GLB struktuuri, värvi-/normaaliatribuute ja soomuse animeeritud tornisõlmi. Võrdlus eelmise ZIP-iga kinnitas, et `src/sim` failid ei muutunud.

Brauseri visuaalset läbivaatust ega GPU/FPS võrdlust selle passiga ei tehtud. Seetõttu pole kinnitatud renderduse tegelikku kiirusekasvu ega lõplikku mängupildi tunnetust. Pole tehtud pikka lahingut ega täielikku testikomplekti.
