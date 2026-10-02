# RTS Rework – Real War style Skirmish

The game now has a dedicated RTS skirmish flow instead of treating every game as a scripted mission.

## Skirmish flow

1. Main menu → **SKIRMISH vs AI**
2. Choose one of the available maps.
3. Choose AI difficulty: easy / normal / hard.
4. Start with an HQ, engineer, infantry security and two logistics helicopters.
5. Helicopters automatically shuttle between the base and a resource point.
6. Resources are the main economy used for buildings, units and upgrades.
7. Select the engineer → choose a building → click its placement location.
8. Buildings unlock production:
   - Barracks → infantry and engineers
   - Vehicle Factory → tanks
   - Helipad → helicopters
   - Air technology → fighters
9. The AI starts with the same basic economic concept and develops its own base.
10. Destroy the enemy HQ to win.

## Building chain

`HQ → Engineer → Barracks / Vehicle Factory / Helipad / Refinery → Units`

## Resource logistics

Resource points are map data. Logistics helicopters assigned to patrol between a resource point and a base generate resources when they reach the resource area. A refinery increases the yield.

## Map independence

Each map supplies its own:

- bases
- resource points
- heightmap
- roads / bridges / buildings / chokepoints / cover
- starting positions

The RTS simulation does not use one global resource layout or one hard-coded base layout.
