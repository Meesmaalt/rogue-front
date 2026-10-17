import * as THREE from 'three';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass.js';
import {FXAAShader} from 'three/examples/jsm/shaders/FXAAShader.js';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {SSAOPass} from 'three/examples/jsm/postprocessing/SSAOPass.js';
export interface PostOptions {antialiasing:boolean;ambientOcclusion:boolean;bloom:boolean}
/** Effects can change in a running game, without losing the WebGL context. */
export class PostFX {
 composer?:EffectComposer;
 private aa?:ShaderPass;private ssao?:SSAOPass;private bloom?:UnrealBloomPass;private output?:OutputPass;
 private options:PostOptions={antialiasing:false,ambientOcclusion:false,bloom:false};
 constructor(private renderer:THREE.WebGLRenderer,private scene:THREE.Scene,private camera:THREE.Camera,private width:number,private height:number,enablePost:boolean,enableSsao:boolean){if(enablePost)this.configure({antialiasing:true,ambientOcclusion:enableSsao,bloom:true});}
 configure(options:PostOptions):void {
  this.options=options;
  if(!options.antialiasing&&!options.ambientOcclusion&&!options.bloom)return;
  if(!this.composer){this.composer=new EffectComposer(this.renderer);this.composer.addPass(new RenderPass(this.scene,this.camera));this.output=new OutputPass();}
  // Expensive buffers are created only after the user enables their effect.
  if(options.ambientOcclusion&&!this.ssao){this.ssao=new SSAOPass(this.scene,this.camera,this.width,this.height);this.ssao.kernelRadius=7;this.ssao.minDistance=.001;this.ssao.maxDistance=.12;}
  if(options.bloom&&!this.bloom)this.bloom=new UnrealBloomPass(new THREE.Vector2(this.width,this.height),.1,.55,.88);
  if(options.antialiasing&&!this.aa)this.aa=new ShaderPass(FXAAShader);
  for(const p of this.composer.passes.slice(1))this.composer.removePass(p);
  if(this.ssao){this.ssao.enabled=options.ambientOcclusion;this.composer.addPass(this.ssao);}
  if(this.bloom){this.bloom.enabled=options.bloom;this.composer.addPass(this.bloom);}
  this.composer.addPass(this.output!);
  if(this.aa){this.aa.enabled=options.antialiasing;this.composer.addPass(this.aa);}
  this.resize(this.width,this.height);
 }
 resize(width:number,height:number):void {this.width=width;this.height=height;const ratio=this.renderer.getPixelRatio();this.composer?.setPixelRatio(ratio);this.composer?.setSize(width,height);if(this.aa)this.aa.uniforms.resolution.value.set(1/(width*ratio),1/(height*ratio));}
 render():void {if(this.composer&&(this.options.antialiasing||this.options.ambientOcclusion||this.options.bloom))this.composer.render();else this.renderer.render(this.scene,this.camera);}
}
