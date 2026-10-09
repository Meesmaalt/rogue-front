import * as THREE from "three";
import { PostFX } from "./post/PostFX";
import { configureColorManagement, chooseVisualProfile } from "./VisualQuality";
import type { GameSettings } from "../ui/Settings";
import { createSky, createWater } from "./Atmosphere";

export interface RenderContext {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  sun: THREE.DirectionalLight;
  post: PostFX;
  water: THREE.Mesh;
  resize(): void;
  updateShadows(force:boolean):void;
  setQuality(quality: GameSettings["quality"]): void;
}

export function createRenderContext(canvas: HTMLCanvasElement, temperate = false): RenderContext {
  let profile = chooseVisualProfile();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(profile.pixelRatio);
  renderer.shadowMap.enabled = profile.shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate=false;
  configureColorManagement(renderer);

  const scene = new THREE.Scene();
  // Real War desert haze – warm sand, not muddy grey
  const haze = new THREE.Color(temperate ? 0xb7c6cc : 0xd4c49a);
  scene.background = haze;
  scene.fog = new THREE.Fog(haze, temperate?680:260, temperate?1450:780);
  if (!temperate) scene.add(createSky());

  const camera = new THREE.PerspectiveCamera(42, 1, 1, 1400);
  // Brighter ambient so buildings read clearly
  const hemi = new THREE.HemisphereLight(temperate ? 0xc5d7df : 0xfff0d0, temperate ? 0x414a37 : 0x8a7350, temperate?.85:1.1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(temperate ? 0xfff5e4 : 0xffe8c0, temperate ? 2.7 : 3.0);
  sun.castShadow = profile.shadows;
  sun.shadow.mapSize.set(profile.shadowSize||512,profile.shadowSize||512);
  const sc = sun.shadow.camera;
  sc.left = -125; sc.right = 125; sc.top = 125; sc.bottom = -125; sc.near = 1; sc.far = 430;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.10;
  scene.add(sun, sun.target);
  // Soft fill from the opposite side so silhouettes stay readable
  const fill = new THREE.DirectionalLight(0xb8c8e0, 0.22);
  fill.position.set(-40, 50, -30);
  scene.add(fill);

  const water = createWater();
  scene.add(water);
  const post = new PostFX(renderer, scene, camera, window.innerWidth, window.innerHeight, profile.post, profile.ssao);

  const setQuality = (quality: GameSettings["quality"]) => {
    profile = chooseVisualProfile(quality);
    renderer.setPixelRatio(profile.pixelRatio);
    renderer.shadowMap.enabled = profile.shadows;
    sun.castShadow = profile.shadows;
    if(sun.shadow.mapSize.x!==(profile.shadowSize||512)){sun.shadow.map?.dispose();sun.shadow.map=null;}
    sun.shadow.mapSize.set(profile.shadowSize||512,profile.shadowSize||512);
    renderer.shadowMap.needsUpdate=true;
    resize();
  };

  const resize = () => {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    post.resize(w, h);
  };
  window.addEventListener("resize", resize);
  resize();

  const lastShadow=new THREE.Vector3(Infinity,Infinity,Infinity);
  const updateShadows=(force:boolean)=>{
    if(!profile.shadows)return;
    const focus=(sun.userData.shadowFocus as THREE.Vector3|undefined)??sun.target.position;
    const extent=Math.max(90,Math.min(230,Math.ceil(camera.position.distanceTo(focus)*.58/16)*16));
    if(sc.right!==extent){sc.left=-extent;sc.right=extent;sc.top=extent;sc.bottom=-extent;sc.updateProjectionMatrix();force=true;}
    // Keep the light and its texture together. Refresh only when coverage is exhausted.
    if(force||focus.distanceToSquared(lastShadow)>(extent*.3)**2){
      lastShadow.set(Math.round(focus.x/8)*8,focus.y,Math.round(focus.z/8)*8);
      sun.position.set(lastShadow.x+70,lastShadow.y+95,lastShadow.z+45);sun.target.position.copy(lastShadow);sun.target.updateMatrixWorld();
      renderer.shadowMap.needsUpdate=true;
    }
  };
  return { renderer, scene, camera, sun, post, water, resize, setQuality, updateShadows };
}
