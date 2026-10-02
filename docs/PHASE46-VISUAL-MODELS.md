# Phase 46 — Visual Unit & Building Models

The project now ships dedicated low-poly GLB models for the main units and buildings instead of falling back to generic box primitives.

## Unit models
- tank
- infantry
- special forces
- artillery
- anti-air
- helicopter
- transport helicopter
- attack helicopter / gunship
- fighter
- destroyer
- submarine
- landing craft

## Building models
- HQ
- barracks
- factory
- helipad
- airbase
- supply depot
- radar
- refinery
- generator
- bunker
- shipyard

Models are intentionally low-poly to keep GPU cost appropriate for a browser RTS. The renderer continues to use LOD and the performance profile from the previous phase.
