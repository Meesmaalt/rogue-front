import * as THREE from "three";
import { getBases, MAP_SIZE, heightAt } from "../sim/heightmap";
import { mulberry32 } from "../sim/rng";
import type { MapFeatureDef } from "../sim/mapFeatures";
import type { Point } from "../sim/types";

const SEG = 160;

export function createTerrain(theme: "desert" | "mountains" | "city" = "desert", features: readonly MapFeatureDef[] = [], bases: readonly (Point & { r: number })[] = []): THREE.Group {
  const rnd = mulberry32(7);
  const group = new THREE.Group();

  const geo = new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
  geo.computeVertexNormals();

  const nrm = geo.attributes.normal;
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const palette = theme === "mountains"
    ? [0x8c877d, 0x716d68, 0x55524e, 0x77736a, 0x5d6559]
    : theme === "city"
      ? [0x666b69, 0x515756, 0x3f4544, 0x77756f, 0x53615a]
      : [0xb59c66, 0xa08a56, 0x7d725f, 0x8b8a7e, 0x8a8c52];
  const [sand, dust, rock, pad, scrub] = palette.map((v) => new THREE.Color(v));
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), n = nrm.getY(i);
    const nz = Math.sin(x * 0.31) * Math.cos(z * 0.27) * 0.5 + 0.5;
    c.copy(sand).lerp(dust, nz * 0.7 + rnd() * 0.15);
    const sl = Math.max(0, 0.9 - n) * 4.5;
    if (sl > 0) c.lerp(rock, Math.min(1, sl));
    if (y > 13) c.lerp(rock, Math.min(0.8, (y - 13) / 10));
    if (y < -3) c.lerp(scrub, Math.min(0.6, (-3 - y) / 6));
    for (const b of (bases.length ? bases : getBases())) {
      const d = Math.hypot(x - b.x, z - b.z);
      if (d < b.r * 0.8) c.lerp(pad, 0.6 * (1 - d / (b.r * 0.8)));
    }
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));

  const grain = makeGrainTexture();
  const splat = makeSplatMap(geo, nrm);
  const normal = makeNormalMap(geo);
  const terrain = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: grain,
      normalMap: normal,
      normalScale: new THREE.Vector2(0.35, 0.35),
      roughness: 0.92,
      metalness: 0,
      aoMap: splat,
      aoMapIntensity: 0.28,
    }),
  );
  terrain.name = "terrain";
  terrain.userData.splatMap = splat;
  terrain.receiveShadow = true;
  group.add(terrain);
  group.add(createRocks(rnd, bases, features));
  group.add(createDecals(rnd));
  group.add(createMapFeatures(features));
  return group;
}

function makeSplatMap(geo: THREE.BufferGeometry, normals: THREE.BufferAttribute): THREE.CanvasTexture {
  const cv = document.createElement("canvas"); cv.width = cv.height = 256;
  const g = cv.getContext("2d")!; const im = g.createImageData(256, 256);
  const pos = geo.attributes.position;
  for (let i = 0; i < im.data.length; i += 4) {
    const px = (i / 4) % 256, pz = Math.floor(i / 4 / 256);
    const k = ((pz / 255) * 160 + (px / 255) * 80) % pos.count;
    const y = pos.getY(Math.floor(k)), slope = 1 - normals.getY(Math.floor(k));
    im.data[i] = Math.min(255, 80 + slope * 230);
    im.data[i + 1] = Math.min(255, 110 + Math.max(0, -y) * 5);
    im.data[i + 2] = Math.min(255, 150 + Math.max(0, y) * 3);
    im.data[i + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3);
  return t;
}

function makeNormalMap(geo: THREE.BufferGeometry): THREE.CanvasTexture {
  const cv = document.createElement("canvas"); cv.width = cv.height = 256;
  const g = cv.getContext("2d")!; const im = g.createImageData(256, 256);
  const pos = geo.attributes.position;
  for (let i = 0; i < im.data.length; i += 4) {
    const p = i / 4, x = p % 256, z = Math.floor(p / 256);
    const a = Math.floor((z / 255) * (pos.count - 1));
    const h = pos.getY(a), h2 = pos.getY(Math.min(pos.count - 1, a + 1));
    const dx = Math.max(-1, Math.min(1, (h2 - h) * 8));
    im.data[i] = 128 - dx * 55; im.data[i + 1] = 128; im.data[i + 2] = 255; im.data[i + 3] = 255;
    void x;
  }
  g.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3);
  return t;
}

function makeGrainTexture(): THREE.CanvasTexture {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 256;
  const g = cv.getContext("2d")!;
  const im = g.createImageData(256, 256);
  for (let i = 0; i < 256 * 256; i++) {
    const v = 205 + Math.random() * 50;
    im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v;
    im.data[i * 4 + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(90, 90);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function createRocks(rnd: () => number, bases: readonly (Point & { r: number })[], features: readonly MapFeatureDef[] = []): THREE.InstancedMesh {
  const N = 220;
  const rocks = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(1, 0),
    new THREE.MeshStandardMaterial({ color: 0x8b7e68, roughness: 0.95, flatShading: true }),
    N,
  );
  const d = new THREE.Object3D();
  let k = 0;
  while (k < N) {
    const x = (rnd() - 0.5) * 370, z = (rnd() - 0.5) * 370;
    if ((bases.length ? bases : getBases()).some((b) => Math.hypot(x - b.x, z - b.z) < b.r * 1.1)) continue;
    if (features.some((f) => ["building", "wall", "chokepoint", "road", "bridge"].includes(f.kind) && Math.hypot(x - f.x, z - f.z) < Math.max(f.width, f.depth) * 0.65)) continue;
    const s = 0.5 + rnd() * rnd() * 3.2;
    d.position.set(x, heightAt(x, z) + s * 0.25, z);
    d.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
    d.scale.set(s, s * (0.6 + rnd() * 0.4), s);
    d.updateMatrix();
    rocks.setMatrixAt(k++, d.matrix);
  }
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  return rocks;
}


function createDecals(rnd: () => number): THREE.InstancedMesh {
  const N = 140;
  const geo = new THREE.CircleGeometry(0.55, 12);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ color: 0x5e5039, transparent: true, opacity: 0.2, depthWrite: false });
  const decals = new THREE.InstancedMesh(geo, mat, N);
  const d = new THREE.Object3D();
  for (let i = 0; i < N; i++) {
    const x = (rnd() - 0.5) * 360, z = (rnd() - 0.5) * 360;
    d.position.set(x, heightAt(x, z) + 0.045, z);
    const s = 0.4 + rnd() * 1.7; d.scale.set(s, s, s); d.rotation.y = rnd() * Math.PI;
    d.updateMatrix(); decals.setMatrixAt(i, d.matrix);
  }
  decals.instanceMatrix.needsUpdate = true;
  decals.frustumCulled = true;
  return decals;
}


function createMapFeatures(features: readonly MapFeatureDef[]): THREE.Group {
  const group = new THREE.Group();
  group.name = "map-features";
  for (const f of features) {
    const y = heightAt(f.x, f.z);
    if (f.kind === "road" || f.kind === "bridge") {
      const geo = new THREE.BoxGeometry(f.width, f.kind === "bridge" ? 0.7 : 0.12, f.depth);
      const mat = new THREE.MeshStandardMaterial({
        color: f.kind === "bridge" ? 0x6b6254 : 0x4c4b47,
        roughness: 0.95,
        metalness: f.kind === "bridge" ? 0.12 : 0,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(f.x, y + (f.kind === "bridge" ? 0.28 : 0.04), f.z);
      mesh.rotation.y = f.rotation ?? 0;
      mesh.receiveShadow = true;
      group.add(mesh);
      if (f.kind === "bridge") addBridgeRails(group, f, y);
      continue;
    }
    if (f.kind === "building" || f.kind === "wall" || f.kind === "chokepoint") {
      const h = f.height ?? (f.kind === "wall" ? 5 : f.kind === "chokepoint" ? 3 : 8);
      const geo = new THREE.BoxGeometry(f.width, h, f.depth);
      const mat = new THREE.MeshStandardMaterial({
        color: f.kind === "wall" ? 0x57524a : f.kind === "chokepoint" ? 0x6e5e4c : 0x55595a,
        roughness: 0.88,
        metalness: 0.04,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(f.x, y + h / 2, f.z);
      mesh.rotation.y = f.rotation ?? 0;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      continue;
    }
    if (f.kind === "cover") {
      const geo = new THREE.BoxGeometry(f.width, f.height ?? 1.8, f.depth);
      const mat = new THREE.MeshStandardMaterial({ color: 0x756b58, roughness: 0.95 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(f.x, y + (f.height ?? 1.8) / 2, f.z);
      mesh.rotation.y = f.rotation ?? 0;
      mesh.castShadow = true;
      group.add(mesh);
    }
  }
  return group;
}

function addBridgeRails(group: THREE.Group, f: MapFeatureDef, y: number): void {
  const railH = 0.9;
  for (const side of [-1, 1]) {
    const geo = new THREE.BoxGeometry(f.width, railH, 0.28);
    const mat = new THREE.MeshStandardMaterial({ color: 0x3d3a35, roughness: 0.75, metalness: 0.25 });
    const rail = new THREE.Mesh(geo, mat);
    rail.position.set(f.x, y + 0.8, f.z + side * Math.max(0.8, f.depth / 2 - 0.2));
    rail.rotation.y = f.rotation ?? 0;
    group.add(rail);
  }
}
