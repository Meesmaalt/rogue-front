# Phase 15 — Base Structure & Defense

- Generated perimeter walls around both skirmish bases.
- Forward gate and internal base road are part of the map feature layer.
- Gate is passable; perimeter walls participate in navigation/build placement.
- Base gate position is exposed through `World.baseGate(team)` for AI and future player helpers.
- AI building plan now uses interior production positions plus a forward bunker and rear AA placement.
- Terrain renders the gate posts and the same generated features used by simulation/nav.
