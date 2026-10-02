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
  setQuality(quality: GameSettings["quality"]): void;
}

export function createRenderContext(canvas: HTMLCanvasElement): RenderContext {
  let profile = chooseVisualProfile();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(profile.pixelRatio);
  renderer.shadowMap.enabled = profile.shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  configureColorManagement(renderer);

  const scene = new THREE.Scene();
  const haze = new THREE.Color(0xb8ab88);
  scene.background = haze;
  scene.fog = new THREE.Fog(haze, 150, 520);
  scene.add(createSky());

  const camera = new THREE.PerspectiveCamera(45, 1, 1, 900);
  const hemi = new THREE.HemisphereLight(0xbcd0e0, 0x70634f, 1.35);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe4bb, 2.8);
  sun.castShadow = profile.shadows;
  sun.shadow.mapSize.set(profile.shadows ? 1024 : 512, profile.shadows ? 1024 : 512);
  const sc = sun.shadow.camera;
  sc.left = -125; sc.right = 125; sc.top = 125; sc.bottom = -125; sc.near = 1; sc.far = 430;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.32;
  scene.add(sun, sun.target);

  const water = createWater();
  scene.add(water);
  const post = new PostFX(renderer, scene, camera, window.innerWidth, window.innerHeight, profile.post, profile.ssao);

  const setQuality = (quality: GameSettings["quality"]) => {
    profile = chooseVisualProfile(quality);
    renderer.setPixelRatio(profile.pixelRatio);
    renderer.shadowMap.enabled = profile.shadows;
    sun.castShadow = profile.shadows;
    sun.shadow.mapSize.set(profile.shadows ? 1024 : 512, profile.shadows ? 1024 : 512);
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

  return { renderer, scene, camera, sun, post, water, resize, setQuality };
}
