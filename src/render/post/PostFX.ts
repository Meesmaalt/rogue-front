import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { SSAOPass } from "three/examples/jsm/postprocessing/SSAOPass.js";

const VignetteShader = {
  uniforms: { tDiffuse: { value: null }, darkness: { value: 0.18 }, offset: { value: 1.08 } },
  vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float darkness; uniform float offset; varying vec2 vUv; void main(){vec4 c=texture2D(tDiffuse,vUv);vec2 p=(vUv-0.5)*offset;float d=dot(p,p);float v=smoothstep(0.18,0.62,d);c.rgb*=1.0-v*darkness;gl_FragColor=c;}`,
};

export class PostFX {
  readonly composer: EffectComposer;
  private readonly vignette: ShaderPass;
  private readonly bloom: UnrealBloomPass;
  private readonly ssao?: SSAOPass;
  private readonly smaa: SMAAPass;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, width: number, height: number, enableSsao: boolean) {
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));
    if (enableSsao) {
      const ssao = new SSAOPass(scene, camera, width, height);
      ssao.kernelRadius = 7;
      ssao.minDistance = 0.001;
      ssao.maxDistance = 0.12;
      this.ssao = ssao;
      this.composer.addPass(ssao);
    }
    this.bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.10, 0.55, 0.88);
    this.composer.addPass(this.bloom);
    this.vignette = new ShaderPass(VignetteShader);
    this.composer.addPass(this.vignette);
    this.smaa = new SMAAPass(width, height);
    this.composer.addPass(this.smaa);
  }

  resize(width: number, height: number): void {
    this.composer.setSize(width, height);
    this.ssao?.setSize(width, height);
    this.smaa.setSize(width, height);
  }

  render(): void { this.composer.render(); }
}
