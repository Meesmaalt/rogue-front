# Phase 13 — RTS Building System

## Eesmärk
Päris RTS-i baasiehitus: mängija valib inseneri, käivitab hoone ehitamise, näeb kaardil ghost-preview’d, paigutab hoone ja insener ehitab selle valmis.

## Ehitus
- Ghost-preview näitab lubatud/keelatud asukohta.
- `R` pöörab hoonet 90 kraadi.
- Paigutus kontrollib maastikku, staatilisi kaardiobjekte, olemasolevaid hooneid ja ressursinõuet.
- Ressurss ja krediit võetakse paigutamisel maha.
- Insener liigub ehitusplatsile automaatselt.
- Hoone algab 15% HP-ga ja on kuni valmimiseni `underConstruction`.
- Ehituskiirus sõltub aktiivsete inseneride arvust.
- Ehitusjärgus hoone ei blokeeri navigeerimist ega ava tootmist.

## Parandamine
Vali insener ja paremklõpsa kahjustatud sõbralikule hoonele. Insener liigub kohale ja parandab seda järk-järgult.

## AI
Skirmish AI kasutab sama `build` käsku ja sama ehitusprotsessi, mitte kohest hoone spawnimist.

## Järgmine loogiline samm
Ehitusplatside visuaalne animatsioon, hoonele spetsiaalsed ehitusmudelid, repair/build helid ning mitme inseneri täpsem tööjaotus.
