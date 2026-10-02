# Faas 9 – Mitmikmäng

Phase 9 lisab deterministliku 1v1 lockstep võrgu kihi.

## 9.1 Lockstep
- `src/net/LockstepClient.ts` kasutab fikseeritud tick'e (30 Hz).
- Mängijad saadavad käsud turvaliselt kaks ticki ette.
- Server annab ticki käivitamiseks mõlemale kliendile ühise käsupaki.
- Käsud märgistatakse serveris meeskonnaga ja simulatsioon kontrollib käsu üksuse omandiõigust.
- Katkestuse korral hoitakse mängija sloti 15 sekundit reconnect'i jaoks.
- Hash/desync protokolli koht on olemas ning server saab ticki hashid klientidele edasi anda.

## 9.2 WebSocket relay
- `server/server.js` on väike Node + `ws` relay.
- Kaks mängijat saavad samasse ruumi liituda.
- Lobby kontrollib, et mõlemad kasutaksid sama missiooni.
- `/healthz` endpoint sobib Docker healthcheck'iks.

## 9.3 Lobby / 1v1 / reconnect
- Kampaania ekraanil on `Mitmikmäng 1v1`.
- Sisesta sama lobby nimi mõlemas brauseris.
- Esimene mängija saab meeskonna 1, teine meeskonna 2.
- WebSocket reconnect kasutab tokenit ja taastab sama mängijakoha.

## Käivitamine

```bash
cd server
npm install
PORT=8787 npm start
```

Seejärel käivita Rogue Front tavapäraselt ja vali kampaaniaekraanilt `Mitmikmäng 1v1`.

> Märkus: Phase 9 relay ei ole mängu autoriteetne simulatsiooniserver. Simulatsioon jookseb mõlemal kliendil deterministlikult; server otsustab ainult tickide ja käsupakkide edastamise järjekorra. See hoiab Phase 8 replay/snapshot arhitektuuri taaskasutatavaks.
