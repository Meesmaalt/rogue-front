# Helindus ja heli-visuaalsed efektid

15.10.2026. Kogu heli on protseduuriline Web Audio (`src/render/Audio.ts`); välised helifailid ja võrgust laadimine puuduvad. Numbrid on andmepõhised failis `src/data/audio.json`. Heli ja nähtavad vihjed ei muuda kunagi simulatsiooni.

## Siinid ja ruum

- Eraldi siinid: üldine, efektid, muusika. Efektide vaigistamine ei vaigista muusikat.
- Kompressor efektidel, lühike genereeritud välikaja (konvolutsioon), kuni 28 efektihäält ja 16 muusikahäält.
- Kauguse nõrgenemine ja stereosuund kaamera asukoha ning suuna järgi. Kaamera kaugenedes (zoom) efektid summutuvad (`muffle`).
- Kõik uued kihid vaikivad, kui efektide või üldhelitugevus on 0, ja peatuvad pausi ajal.

## Lahing

- Relvapõhised lasud, raketimootor, suurtükisaba, rikošett, kaitsekilbi tabamus.
- Plahvatused kihtidena: terav löök, madal pomm, pikem saba raskematel relvadel.
- Haubitsa/miinipilduja/MLRS/pommi lähedane langemine: vilin ja pauk 0,3 s hiljem (`whistle`).
- Mootorid: tankid, soomukid, veokid, kopterid (rootori tümakas), hävitajad, lennukid, laevad ning generaatori/rafineerimistehase/tehase mühin. Kuni 8 valjemat korraga, Doppleri efekt, hävitaja ülelennu sähin ja löök (`flyby`), laevade lainepladin.
- Jalaväe sammud, ehitusmüra, metsapõlengu praksumine ja mühin (nähtavad põlengud, ~4 Hz skaneerimine).

## Liides ja tagasiside

- Nupu hõljutus ja klõps (vaiksemad kui sisuhelid), üksuse valik ja käsk (HUD-nupud ning parem hiireklõps) raadiohäälega: fraktsiooni järgi erinev kõrgus ja vokaalid (`voices`).
- Tootmisest tulnud uus üksus, tootmisjärjekord, uuring, ehituse valmimine, keelatud käsk, tarne kohale jõudmine, madal varustus (`lowSupply`).
- Baasi hoone saab kahju: sireen (kuni kord 12 s). Oma üksuse kaotus: hoiatus. Ressursipunkti vallutamine/kaotus: tõusev/langev helin.
- Võidu ja kaotuse ~8 s akordiprogressioon.

## Muusika ja ümbrus

- Aeglased drone-kordid, madal löök, vaikne kellaliiv rahulikul ajal; lahingu tugevnedes lisanduvad rütm, dissonants ja pingelisem akord.
- Taustatuul ja harvad linnuhüüded (ainult rahus).

## Heli-visuaalsed vihjed (`src/render/AudioVisual.ts`)

Heli annab renderdusele märguandeid (`audio.onCue`), nii et pilt ja heli on sünkroonis:

- Kaamera värin lähedaste raskete plahvatuste ajal (`RtsCamera.shake`).
- Ekraani serva vilgatus (punane: baasi rünnak, kollane: kaotus/hoiatus, roheline: vallutus) ja serva nool kaugel asuva sündmuse suunas.
- Minikaardi hoiatusrõngas sündmuse kohal (`Minimap.ping`).
- Raskete mürskude maapinnaringi tolmulaine (`Fx`).
- Kui süsteem küsib vähendatud liikumist (`prefers-reduced-motion`), värin ja vilgatus jäetakse ära; nooled ja minikaardi rõngas jäävad.

## Kontroll ja piirid

`npm test` katab stereosuuna, kauguse, häälepiiri, pausi, kihtide ülempiiri, mootorite eraldamise, kaja/UI/rääkimise piirangud, vallutuse ja sireeni ning heli-visuaalse suuna arvutuse. Kuulamismulje, helitugevuste tasakaal, kaamera värina sobivus ja FPS vajavad päris brauseris proovimist; neid ei märgita automaatkontrollidega mõõdetuks. Kõik helid ja nägemisvihjed on sünteesitud: tegelik kõneheli ja salvestatud efektid puuduvad.
