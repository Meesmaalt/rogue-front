import * as THREE from "three";
import type { World } from "../sim/World";

/** World-space terrain fog, driven by the same visibility grid as the minimap.
 * Camera motion needs no canvas redraw/projection and no visibility texture upload.
 * Unit detection still uses the simulation's per-target recon/stealth rules. */
export class FogOfWar {
  private revision = -1;
  private team = -1;
  private changedAt = 0;
  private lastTime = -1;
  private readonly states: Uint8Array;
  private readonly previous: THREE.DataTexture;
  private readonly current: THREE.DataTexture;
  private readonly blend = { value: 1 };
  private readonly strength = { value: 1 };
  private readonly mapExtent: { value: number };

  constructor(terrain: THREE.Group, world: World) {
    const { width, height, cellSize } = world.vision;
    this.states = new Uint8Array(width * height);
    const texture = () => {
      const t = new THREE.DataTexture(new Uint8Array(width * height * 4), width, height, THREE.RGBAFormat);
      t.minFilter = t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; t.flipY = false;
      return t;
    };
    this.previous = texture(); this.current = texture(); this.mapExtent = { value: width * cellSize };
    const materials = new Set<THREE.MeshStandardMaterial>();
    terrain.traverse(o => {
      if (!(o instanceof THREE.Mesh)) return;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m instanceof THREE.MeshStandardMaterial) materials.add(m);
    });
    for (const material of materials) {
      const compile = material.onBeforeCompile.bind(material), key = material.customProgramCacheKey.bind(material);
      const originalKey = key();
      material.onBeforeCompile = (shader, renderer) => {
        compile(shader, renderer);
        shader.uniforms.rfFogPrevious = { value: this.previous };
        shader.uniforms.rfFogCurrent = { value: this.current };
        shader.uniforms.rfFogBlend = this.blend; shader.uniforms.rfFogStrength = this.strength;
        shader.uniforms.rfFogExtent = this.mapExtent;
        shader.vertexShader = "varying vec2 rfFogUV; uniform float rfFogExtent;\n" + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace("#include <worldpos_vertex>", `#include <worldpos_vertex>
          vec4 rfFogPosition = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            rfFogPosition = instanceMatrix * rfFogPosition;
          #endif
          rfFogUV = (modelMatrix * rfFogPosition).xz / rfFogExtent + 0.5;`);
        shader.fragmentShader = "varying vec2 rfFogUV; uniform sampler2D rfFogPrevious; uniform sampler2D rfFogCurrent; uniform float rfFogBlend; uniform float rfFogStrength;\n" + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace("#include <tonemapping_fragment>", `#include <tonemapping_fragment>
          if (rfFogStrength > 0.0) {
            float rfFog = mix(texture2D(rfFogPrevious, rfFogUV).r, texture2D(rfFogCurrent, rfFogUV).r, rfFogBlend);
            gl_FragColor.rgb *= 1.0 - rfFog * rfFogStrength;
          }`);
      };
      material.customProgramCacheKey = () => originalKey + "|world-visibility-fog-v1";
      material.needsUpdate = true;
    }
    this.sync(world, 1);
  }

  setMode(mode: "wargame" | "reduced" | "off"): void {
    this.strength.value = mode === "off" ? 0 : mode === "reduced" ? .55 : 1;
  }

  sync(world: World, alpha = 1): void {
    const time = world.time - (1 - alpha) / 30;
    const rewind = world.time < this.lastTime;
    if (this.revision !== world.vision.revision || this.team !== world.playerTeam || rewind) {
      const initial = this.revision < 0 || this.team !== world.playerTeam || rewind;
      world.vision.copyStates(world.playerTeam, this.states);
      const previous = this.previous.image.data as Uint8Array, current = this.current.image.data as Uint8Array;
      // Start the next transition from the currently displayed value, not the old target.
      for (let i = 0; i < this.states.length; i++) {
        const offset = i * 4, from = previous[offset] + (current[offset] - previous[offset]) * this.blend.value;
        const value = this.states[i] === 2 ? 0 : this.states[i] === 1 ? 48 : 87;
        previous[offset] = initial ? value : Math.round(from); current[offset] = value;
        previous[offset+3] = current[offset+3] = 255;
      }
      this.previous.needsUpdate = this.current.needsUpdate = true;
      this.changedAt = time; this.blend.value = initial ? 1 : 0;
      this.revision = world.vision.revision; this.team = world.playerTeam;
    } else this.blend.value = Math.min(1, Math.max(0, (time - this.changedAt) / .12));
    this.lastTime = world.time;
  }
}
