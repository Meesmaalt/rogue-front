# Phase 66 — Visual Model Pass

The next art pass focuses on tactical readability rather than adding more game systems.

## Ground vehicles
- Main battle tank: angular turret, long main gun, optics, antennas, track/wheel detail and rear equipment.
- IFV/APC: separate tracked/wheeled silhouettes, raised troop compartments and weapon stations.
- Recon/light tank: lighter chassis, sensor/optic equipment and antenna mast.
- Tank destroyer: long-barrel silhouette and low turret/casemate profile.
- SPAA: twin-gun/air-defense silhouette, radar/sensor block and antenna.
- MLRS/artillery/logistics truck: visibly different launcher, howitzer, and cargo-bed silhouettes.

## Aircraft
- Attack helicopter, transport helicopter, ECM and multirole aircraft now use distinct silhouettes and equipment hints.
- Rotor/aircraft animation remains procedural so the game does not depend on external model files.

## Buildings
- HQ, barracks, factory, helipad, airbase, refinery, supply depot and radar receive extra structural details: windows, doors, rooftop equipment, antennae, crates and industrial fixtures.

## Art direction
The target is a readable RTS silhouette at normal camera distance, with enough close-up detail to make units feel like military hardware. Exact real-world dimensions are intentionally stylized to preserve gameplay readability.

## External GLB path
The existing `/public/models/<kind>.glb` pipeline remains available. Bespoke GLB assets can replace procedural models later without changing simulation code.
