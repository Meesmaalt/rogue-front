# Phase 74 — Infantry Squad Combat

- Infantry is now represented as a squad entity rather than a single soldier.
- Default squad sizes: rifle 8, AT 7, MG 7, recon 6, sniper 4, MANPADS 6, ATGM 5, engineers 6.
- Each squad has `squadMembers`, `squadMaxMembers`, `squadFirepower` and `squadRole`.
- Combat damage can remove individual squad members; surviving manpower reduces firepower.
- Suppression and morale also affect the squad after casualties.
- Renderer displays individual soldier models and hides casualties, while suppressed squads visually tighten formation.
- HUD shows manpower and current firepower.
- Save/load persists squad state.
- Existing transport/logistics/command systems continue to operate on the squad as one tactical entity.

No compile/test pass was run by design.
