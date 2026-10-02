# Juhised AI-agendile

Loe enne alustamist: `docs/ARCHITECTURE.md` ja `docs/TODO.md`. Võta TODO-st **ülalt esimene lõpetamata ülesanne**, tee see valmis ja märgi `[x]`.

## Reeglid
1. **sim ei sõltu renderdusest.** `src/sim/**` ei tohi importida `three`, `document`, `window` ega `performance.now()`. Juhuarvud ainult `sim/rng.ts` kaudu (seemnega). Siis on sim testitav ja hiljem deterministlik.
2. **Andmepõhine.** Üksuste/hoonete/relvade numbrid on `src/data/*.json` failides, mitte koodis.
3. **Käsud, mitte otsene muutmine.** UI ja AI annavad simile käske (`Command`), sim muudab olekut ainult `tick()` sees.
4. **Fikseeritud samm.** Sim töötab sammuga 1/30 s (`core/GameLoop.ts`). Ära kasuta `dt`-d muust kohast.
5. Iga uus sim-moodul saab vitest-testi (`*.test.ts` moodulite kõrvale).
6. TypeScript `strict`; ära kasuta `any`.
7. Eesti keel kasutajale nähtavates tekstides, inglise keel koodis ja kommentaarides on lubatud.

## Definition of done (iga ülesande kohta)
- `docker compose run --rm dev npm run typecheck` ja `npm test` on rohelised
- `docker compose run --rm dev npm run build` õnnestub
- Käitumine on kontrollitud brauseris (`docker compose up dev`)
- TODO.md-s on ülesanne märgitud ja vajadusel ARCHITECTURE.md uuendatud

## Käsud
`npm run dev | build | typecheck | test` (Dockeris: `docker compose run --rm dev <käsk>`)
