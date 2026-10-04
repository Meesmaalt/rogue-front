# Rogue Front — Phase 70: Base Upgrade Tree

This phase expands the Phase 69 building-level system to the whole base.

## 1-3 building levels
All strategic buildables now share a visible 1→3 upgrade progression:
HQ, command buildings, barracks, factory, helipad, airbase, shipyard, supply, radar,
refinery, bunker, AA, generator, engineer center and strategy buildings.

## Visual progression
Level 2 and Level 3 add physical equipment to the building:
masts, service modules, crates, fuel tanks, towers, dishes and defensive details.
The renderer refreshes the detail kit when a building level changes.

## Gameplay progression
- Production buildings retain level-gated unit availability.
- Level 2/3 production speeds remain 1.35x/1.65x.
- Generators gain 1.30x / 1.65x power output at levels 2/3.
- Radar detection range and contact duration improve with level.
- The HUD shows building level, tier name and the building's current role effect.
- The same upgrade command now works on every strategic building.

## Upgrade economy
- Level 1 → 2: 260 resources/credits, 10 seconds.
- Level 2 → 3: 420 resources/credits, 14 seconds.
- Upgrade temporarily places the building into construction state, making the decision tactically meaningful.

No compile/test pass was intentionally performed for this phase.
