# Faas 8 – Kvaliteet ja release

- Lisatud combat/production/save/replay sim-testid.
- Deterministlik replay: sama seeme + samad käsud = sama lõppseisu hash.
- World snapshot salvestab simulatsiooni oleku koos RNG olekuga ja taastab selle kohalikust salvestusest.
- Replay JSON salvestatakse missiooni lõpus brauseri localStorage'i.
- ESLint + Prettier konfiguratsioon ja npm käsud.
- GitHub Actions kontrollib typecheck/test/build/lint/format ning ehitab prod Docker image'i.
- Main-branch workflow avaldab tootmisimage GitHub Container Registry'sse.
- nginx `/healthz` endpoint + Docker Compose healthcheck.
