# Phase 5 – Visual quality

Implemented render-side quality layer without coupling it to simulation:

- GLTFLoader pipeline with seven local low-poly GLB assets under `/public/models/`, plus deterministic procedural fallback. The local GLBs are generated for this prototype; they are not claimed as third-party CC0 assets.
- Terrain grain + generated splat/normal/roughness treatment, slope-aware vertex colouring and instanced rocks/ground decals.
- EffectComposer with SMAA, restrained bloom, vignette and optional SSAO.
- Dynamic sun with large tuned shadow camera and PCF soft shadows.
- Sky shader, atmospheric fog and animated oasis water shader.
- LOD groups for units; far units collapse to low-poly proxies. Three.js frustum culling remains enabled.
- Instanced terrain dressing for large repeated geometry.
- Render profile caps DPR and disables expensive SSAO on smaller/low-memory devices.

The GLB loader is intentionally optional: the project still runs offline using the existing procedural models until CC0 GLBs are placed under `public/models/`. This avoids a runtime network dependency.
