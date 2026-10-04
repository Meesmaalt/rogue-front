# Phase 72 — Real Vehicle Roster

The project now has a platform identity layer between simulation unit kinds and rendering.

Examples:
- USA tank → M1A2 SEP v3 Abrams
- Russia tank → T-90M Proryv
- China tank → Type 99A
- USA IFV → M2A4 Bradley
- Russia IFV → BMP-3M
- China IFV → ZBD-04A
- USA artillery → M109A7 Paladin
- Russia artillery → 2S19M2 Msta-S
- China artillery → PLZ-05

The same approach is prepared for reconnaissance, MLRS, mobile AA, helicopters, fighters and naval platforms.

## Why this matters

`UnitKind` remains a gameplay abstraction (`tank`, `ifv`, `artillery`), while `VehiclePlatform` gives the unit a stable real platform identity. This lets later phases add:

1. bespoke GLB models per platform;
2. component hitboxes per platform;
3. platform-specific weapons and ammunition;
4. faction-specific sensors and optics;
5. authentic visual silhouettes without rewriting the combat simulation.
