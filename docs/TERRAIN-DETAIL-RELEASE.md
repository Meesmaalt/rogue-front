# Maapinna detail ja piiratud renderduskoormus · 15.10.2026

## Nähtav muudatus

Aktiivsete protseduurkaartide parasvöötme maapind saab mitmes mõõtkavas rohu/pinnase albeedovariatsiooni ning peenema mikroreljeefi. Maapinna laiema värvivariatsiooni perioodilised siinusvööndid asendatakse maailmakoordinaatides deterministliku väärtusmüraga. Kivise pinnase nähtavus arvestab lisaks absoluutkõrgusele ka nõlva järskust: ka madalamal paiknev järsem nõlv võib paljanduda.

Peendetaili tekstuur kordub 24 maailma meetri järel, sõltumata 4/6 km kaardisuurusest. Värvidetail ja bump-gradient hajuvad kaamerakaugusel 180–650 m; mipmapid vähendavad kaugema pinna virvendamist. Põllud, teed, metsapõhi, alad ja baked varjud jäävad olemasolevale 2048² pinnakattekaardile. Pinnakatte geomeetria ja mängureeglid ei muutu.

## Koormuse piirid

- Maastiku geomeetriat, materjalide/renderduspartiide arvu, puude/põõsaste hulka, varjupasse ega postefekte ei lisata. `createGroundTiles` jääb samaks, sh vaatevälja järgi kärpimine ja servade ühised UV-d/normaalid.
- Olemasolev 512² RGBA mikropinna CanvasTexture asendatakse ühe 256² RGBA andmetekstuuriga: baastaseme puhver 1 048 576 → 262 144 baiti; mipmapidega jääb suhe samaks. Pinnakatte 2048² atlas ei suurene.
- Sama tekstuuri punane kanal kirjeldab mikroreljeefi, roheline peent albeedot ja sinine suuremaid mulla/rohu laike. Bump-map ja värvidetail jagavad seda tekstuuri; eraldi detaili tekstuuri/samplerit ei lisandu.
- Keskmisel/kõrgel kvaliteedil lisandub üks olemasoleva bump-sampleri tekstuurilugemine maapinna fragmendi kohta. Kauguses detail visuaalselt hajub; see ei tähenda, et tekstuurilugemine kauguses automaatselt kaoks.
- Madalal kvaliteedil on lisavärvidetaili haru ning bump-gradientide arvutus uniform-tingimusega välja lülitatud. Püsivad suured maastikuvärvid ja kiviste nõlvade värvus säilivad.
- Kvaliteeditaseme vahetamine muudab olemasolevaid uniforme, bumpScale'i ja anisotroopiat. Uut shaderivarianti ega stseeniobjekte selleks ei looda. Tekstuuri anisotroopia vahetamine võib põhjustada selle väikese tekstuuri ühekordse taasüleslaadimise.
- Detaili loomine ja värvialuse maalimine toimuvad kaardi avamisel; kaamera liigutamisel CPU-s uusi tekstuure ei genereerita ega maastikupuid ei läbita.

Need on koodi/ressursside piirid, mitte mõõdetud FPS-i või nullkulu lubadus. Keskmise/kõrge taseme lisalugemise tegelik GPU hind tuleb konkreetses brauseris kontrollida.

## Teostus

`render/TerrainDetail.ts` loob deterministliku perioodilise andmetekstuuri ning täiendab standardmaterjali shaderit. Three'i enda bump-normaali arvutus/face handling säilib, gradienti nõrgendatakse kauguses. Shaderi muutus aheldub `FogOfWar` shaderiga; nähtavuse tumendus jääb samasse etappi. `main.ts` rakendab kvaliteedi pärast maastiku loomist ja olemasoleva seadistuste paneeli kaudu.

Parameetrid asuvad `terrain.json.render.detail` all. Aktiivne parasvöötme maastik kasutab uut detaili; varasemad kõrbe-/linnateemad säilitavad oma materjaliprofiili. Simulatsioon, kaardi seeme/geomeetria, navigeerimine, kõrgusväli, üksuste avastamine ja salvestus ei muutu.

## Kontroll

13 sihitud kontrolli katavad müra perioodilisuse, andmetekstuuri determinismi ja eelarve, maailmamõõdu püsivuse, mipmapid, ühe sampleri korduskasutuse, kauguses hajumise shaderi, madala kvaliteedi väljalülituse, kvaliteedivahetuse objektide/shaderivariantide püsivuse, sõjaudu shaderi aheldamise, maa UV-/normaaliservad ning renderduse eelsoojenduse. Kõik 319 testi 74 failis läbisid täieliku kontrolli (423,83 s), sh 15 minuti AI taastumislahing. Kõik neli kompaktse väljalaske kontrolli läbisid eraldi.

TypeScript/build ja kompaktse väljalaske kontrollid läbisid. Playwrighti brauserikatse peatus puuduva Chromiumi käivitusfaili tõttu. Shaderi tegelik WebGL kompilatsioon/pilt, mängija mulje ja F8 GPU/FPS võrdlus jäävad eraldi lõpetamata kontrolliks; shaderi koostamise Node-testid ei kinnita GPU tulemust.
