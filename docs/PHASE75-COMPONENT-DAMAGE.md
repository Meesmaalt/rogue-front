# Phase 75 — Component Damage

Vehicle combat now models persistent component damage: engine, tracks, turret, weapon, crew and ammunition.

- Penetrating hits choose a component based on hit face and weapon type.
- Rear hits are biased toward engine/ammunition; side hits toward tracks/crew; frontal hits toward turret/weapon.
- Damaged engine/tracks reduce movement and severe damage temporarily disables the platform.
- Damaged turret/crew reduce accuracy; damaged weapon reduces damage.
- Severe ammunition damage can cause a secondary internal explosion.
- Engineers can now repair damaged vehicles using depot repair stock, including component condition.
- HUD reports component condition for selected vehicles.
- Component state is persisted in save/load.

No compile/test pass was run by design.
