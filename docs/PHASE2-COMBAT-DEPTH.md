# Faas 2 — Combat depth (Wargame-style)

Real War baas/ressursid/airbridge **muutmata**.
Lahing: facing, armor F/S/R, suppression, moraal.

## Facing
- front / side / rear hit face from shooter angle vs target heading
- rear ×1.55 damage, side ×1.22
- armorFront/Side/Rear from schema v2

## Weapon vs armor
- cannon (KE), missile (HEAT-ish), bullet (HE/SA)
- penFactor softens against high armor

## Suppression
- Builds on hit (HE/bullets stronger)
- Decays over time (discipline helps)
- Reduces accuracy & speed (via morale state)

## Moraal FSM
steady → shaken → pinned → routing
- Routing: flees to HQ/supply, cannot fire
- Nearby deaths shock friendlies
- Recover near supply/HQ when not suppressed

## Stabilizer
- full: fire on move
- partial: accuracy penalty moving
- none: stop to shoot (arty)
