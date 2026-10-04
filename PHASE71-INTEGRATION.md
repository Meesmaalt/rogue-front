# Phase 71 — Integration Pass

Phase 71 ühendab olemasolevad Real War logistika-, majandus- ja Wargame käsuliini süsteemid üheks operatiivseks tootmisahelaks.

## Põhiahel

**resource facility → road/air logistics → supply depot → command network → producer → unit → frontline → combat → damage/repair**

## Realiseeritud

- Tootmisrajatisel on nüüd reaalne operatiivolek.
- Command-link puudumisel tootmine peatub.
- Energiavõrgu kriitilise puudujäägi korral tootmine peatub.
- Logistikavõrgu puudumisel tootmine peatub.
- Level 2/3 üksused vajavad vastava haru strateegiakeskust.
- Juba järjekorras olev üksus ei kao katkestuse tõttu; tootmine jätkub pärast ühenduse taastumist.
- Lisatud ühine `operationalStatus()` snapshot HUD/AI jaoks.
- Taastatud HUD, mis oli eelmises artefaktis ekslikult sensori-koodiga üle kirjutatud.

## Disainieesmärk

Nüüd ei piisa enam ainult raha ja õigest hoonest. Vastase command-node'i, generaatori või logistilise selgroo ründamine võib reaalselt tootmise peatada. Samal ajal ei muutu mäng liiga karistavaks: katkestatud järjekord säilib ja jätkub, kui infrastruktuur taastub.

Järgmine etapp on Phase 72: päris sõidukiroster ja mudelipõhine üksuste diferentseerimine.
