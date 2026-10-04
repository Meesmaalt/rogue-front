# Phase 76 — Terrain, LOS & Cover

- Ridge/height terrain now participates in sensor detection, not only combat rendering.
- Walls, buildings and chokepoints can occlude vision-grid reveal.
- Infantry inside cover receives detection concealment, lower hit probability and reduced damage.
- Cover is tactical rather than cosmetic: moving into a sandbag/crate/tent position can make a squad harder to detect and kill.
- HUD reports the current infantry cover value.
- Existing Vision combat LOS remains authoritative for direct fire; this phase strengthens sensor-side and cover integration.

No compile/test pass was run by design.
