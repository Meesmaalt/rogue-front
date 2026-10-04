# Phase 86-90 — Frontline / Deployment / Reinforcement / Operational Warfare

## 86 Dynamic Frontline
- 5 dynamic frontline sectors between the main bases.
- Sector strength, pressure, supply reach and control are recalculated from live entities.
- Units receive a `frontlineSector` assignment.

## 87 Deployment
- Deployment points are derived from each team's base-to-front direction.
- Idle combat units can be assigned to the strongest active frontline sector.
- Advance / hold / fallback posture is derived from relative combat strength and supply.

## 88 Reinforcement
- Player battlegroup reserve cards can be deployed to the frontline periodically.
- Reinforcements require an available deck card, command link and resources.
- Reinforcements receive an immediate frontline order.

## 89 Frontline logistics
- Supply reach affects frontline posture.
- Low supply can force fallback.
- Command-link coverage gates reinforcement deployment.

## 90 Operational warfare integration
- Operational commander selects sectors.
- Frontline controller converts operational intent into local deployment.
- Tactical AI remains responsible for individual combat behavior.
- Battlegroup losses and remaining cards constrain reinforcements.
