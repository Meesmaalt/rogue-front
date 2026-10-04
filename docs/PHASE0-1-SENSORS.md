# Faas 0–1: Schema v2 + Sensors / Spotted

## Schema v2 (UnitDef)
Iga üksus saab vaikimisi:
- category, size, optics, stealthLevel
- armorFront / armorSide / armorRear
- stabilizer, discipline, opticsRange

JSON võib üle kirjutada; parseUnits täidab puuduvad.

## Sensors
`src/sim/systems/sensors.ts`
- detectionScore(observer, target)
- canSpot / isSpottedBy
- updateSensors → spottedUntil[team] + intel contacts

## Käitumine
- Auto-acquire (nearestEnemy) ainult **spotted** sihtmärkidele
- Ründekäsk (attack) hoiab sihtmärki ka udus
- Fog reveal raadius = opticsRange
- Intel ghost silindrid kaardil (viimati nähtud positsioon)

## Järgmine: Faas 2
Facing damage, multi-weapon, suppression, morale FSM
