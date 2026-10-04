import * as THREE from "three";
import { getBases, MAP_SIZE, heightAt } from "../sim/heightmap";
import { mulberry32 } from "../sim/rng";
import { pointInFeature, type MapFeatureDef } from "../sim/mapFeatures";
import type { Point } from "../sim/types";

const SEG = 96;

export function createTerrain(theme: "desert" | "mountains" | "city" | "temperate" = "desert", features: readonly MapFeatureDef[] = [], bases: readonly (Point & { r: number })[] = []): THREE.Group {
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
  // Brighter Real War-style desert / mountain / city palettes
  const palette = theme === "temperate" ? [0x71894e,0x7f925e,0x8a8975,0x9a988b,0x536c3e] : theme === "mountains"
    ? [0xa8a094, 0x8a857c, 0x6a6660, 0x9a9588, 0x7a8570]
    : theme === "city"
      ? [0x7a8078, 0x656c68, 0x505854, 0x8a8880, 0x6a7568]
      : [0xd4b878, 0xc4a868, 0xa09070, 0xc8c0a0, 0xb0b070];
  const [sand, dust, rock, pad, scrub] = palette.map((v) => new THREE.Color(v));
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), n = nrm.getY(i);
    const nz = Math.sin(x * 0.31) * Math.cos(z * 0.27) * 0.5 + 0.5;
    c.copy(sand).lerp(dust, nz * 0.55 + rnd() * 0.12);
    const sl = Math.max(0, 0.9 - n) * 4.5;
    if (sl > 0) c.lerp(rock, Math.min(0.85, sl));
    if (y > 13) c.lerp(rock, Math.min(0.7, (y - 13) / 10));
    if (y < -3) c.lerp(scrub, Math.min(0.5, (-3 - y) / 6));
    for (const b of (bases.length ? bases : getBases())) {
      const d = Math.hypot(x - b.x, z - b.z);
      // Clear paved base pad like Real War bases
      if (d < b.r * 0.85) c.lerp(pad, 0.72 * (1 - d / (b.r * 0.85)));
    }
    if (theme === "temperate") {
      for (const f of features) if (f.appearance === "field" && pointInFeature(x,z,f)) c.setHex(f.color ?? 0x879357).multiplyScalar(.95+rnd()*.1);
      for (const f of features) if (f.appearance === "forest" && pointInFeature(x,z,f,3)) c.lerp(new THREE.Color(0x3b5335), .7);
    }
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));

  const grain = makeGrainTexture();

  const terrain = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: grain,
      roughness: 0.92,
      metalness: 0,
    }),
  );
  terrain.name = "terrain";
  terrain.receiveShadow = true;
  group.add(terrain);
  if (theme !== "temperate") group.add(createRocks(rnd, bases, features));
  else group.add(createForest(features));
  group.add(createDecals(rnd));
  group.add(createMapFeatures(features));
  return group;
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
  const N = 120;
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
  rocks.castShadow = false;
  rocks.receiveShadow = false;
  return rocks;
}


function createDecals(rnd: () => number): THREE.InstancedMesh {
  const N = 70;
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
    if (f.appearance === "forest") continue;
    if (f.appearance === "field") {
      const field=drapedStrip(f,f.width,f.color??0x879357,.025);
      (field.material as THREE.MeshStandardMaterial).map=fieldTexture();group.add(field);continue;
    }
    if (f.kind === "water") {
      const geo = new THREE.BoxGeometry(f.width, 0.18, f.depth);
      const mat = new THREE.MeshStandardMaterial({ color: 0x405b68, roughness: 0.25, metalness: 0.18, transparent: true, opacity: 0.9 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(f.x, y - 0.55, f.z); mesh.rotation.y = f.rotation ?? 0; mesh.receiveShadow = true;
      group.add(mesh);
      continue;
    }
    if (f.kind === "road" || f.kind === "bridge") {
      if(f.kind === "road") {
        group.add(drapedStrip(f, f.width+2, 0xb1a68c, .035));
        group.add(drapedStrip(f, f.width, 0x5e6360, .06));
        for(let z=-f.depth/2+3;z<f.depth/2-2;z+=9) group.add(drapedStrip({...f,x:f.x+Math.sin(f.rotation??0)*z,z:f.z+Math.cos(f.rotation??0)*z,depth:3},.16,0xd6d1b8,.075));
      } else {
        const mesh=new THREE.Mesh(new THREE.BoxGeometry(f.width,.7,f.depth),new THREE.MeshStandardMaterial({color:0x8a8980,roughness:.9}));
        mesh.position.set(f.x,y+.28,f.z);mesh.rotation.y=f.rotation??0;mesh.receiveShadow=true;group.add(mesh);addBridgeRails(group,f,y);
      }
      continue;
    }
    if (f.kind === "building" || f.kind === "wall" || f.kind === "chokepoint") {
      const h = f.height ?? (f.kind === "wall" ? 3.2 : f.kind === "chokepoint" ? 2.8 : 8);
      if (f.kind === "wall") {
        // Sandbag / Hesco-style barrier – readable military look instead of dark slabs
        const bagMat = new THREE.MeshStandardMaterial({ color: 0xc4b48a, roughness: 0.95, metalness: 0.02, flatShading: true });
        const topMat = new THREE.MeshStandardMaterial({ color: 0xa89870, roughness: 0.92, metalness: 0.04, flatShading: true });
        const layers = 3;
        const layerH = h / layers;
        for (let layer = 0; layer < layers; layer++) {
          const shrink = layer * 0.15;
          const bag = new THREE.Mesh(
            new THREE.BoxGeometry(Math.max(1, f.width - shrink), layerH * 0.92, Math.max(0.8, f.depth - shrink * 0.3)),
            layer === layers - 1 ? topMat : bagMat,
          );
          bag.position.set(f.x, y + layerH * (layer + 0.5), f.z);
          bag.rotation.y = f.rotation ?? 0;
          bag.castShadow = true;
          bag.receiveShadow = true;
          group.add(bag);
        }
        continue;
      }
      const geo = new THREE.BoxGeometry(f.width, h, f.depth);
      const mat = new THREE.MeshStandardMaterial({
        color: f.kind === "chokepoint" ? 0x8a7a60 : 0x6a7068,
        roughness: 0.88,
        metalness: 0.04,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(f.x, y + h / 2, f.z);
      mesh.rotation.y = f.rotation ?? 0;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      if(f.appearance === "farmhouse") {
        const house=new THREE.Group();house.position.set(f.x,y,f.z);house.rotation.y=f.rotation??0;
        mesh.position.set(0,h/2,0);mesh.rotation.y=0;mesh.material=new THREE.MeshStandardMaterial({color:0xc6bfa7,roughness:.95});house.add(mesh);
        const roof=new THREE.Mesh(new THREE.CylinderGeometry(1,1,f.depth+1,3),new THREE.MeshStandardMaterial({color:0x796153,map:roofTexture(),roughness:.95}));
        roof.rotation.x=Math.PI/2;roof.rotation.z=Math.PI;roof.scale.set(f.width*.65,1,2);roof.position.y=h+.7;roof.castShadow=true;house.add(roof);
        const windowMat=new THREE.MeshStandardMaterial({color:0x344749,roughness:.5});
        for(const side of [-1,1])for(const dx of [-.28,.28]){const win=new THREE.Mesh(new THREE.BoxGeometry(1.1,1,.12),windowMat);win.position.set(dx*f.width,h*.6,side*(f.depth/2+.04));house.add(win);}
        const door=new THREE.Mesh(new THREE.BoxGeometry(1.2,2,.13),new THREE.MeshStandardMaterial({color:0x6a5c43}));door.position.set(0,1,f.depth/2+.05);house.add(door);
        const chimney=new THREE.Mesh(new THREE.BoxGeometry(.65,1.8,.7),new THREE.MeshStandardMaterial({color:0x918577,roughness:1}));chimney.position.set(f.width*.28,h+1.5,-f.depth*.2);chimney.castShadow=true;house.add(chimney);
        const trimMat=new THREE.MeshStandardMaterial({color:0xb0ae99,roughness:.95});
        for(const side of [-1,1])for(const dx of [-.28,.28]){const sash=new THREE.Mesh(new THREE.BoxGeometry(.07,1.1,.14),trimMat);sash.position.set(dx*f.width,h*.6,side*(f.depth/2+.08));house.add(sash);}
        group.add(house);
      } else group.add(mesh);
      continue;
    }
    if (f.kind === "gate") {
      const postGeo = new THREE.BoxGeometry(0.5, 3.5, 0.5);
      const mat = new THREE.MeshStandardMaterial({ color: 0x8b6a3f, roughness: 0.8, metalness: 0.15 });
      for (const side of [-1, 1]) {
        const post = new THREE.Mesh(postGeo, mat);
        const c = Math.cos(f.rotation ?? 0), s = Math.sin(f.rotation ?? 0);
        post.position.set(f.x + c * side * (f.width * 0.42), y + 1.75, f.z + s * side * (f.width * 0.42));
        post.rotation.y = f.rotation ?? 0;
        post.castShadow = false; group.add(post);
      }
      continue;
    }
    if (f.kind === "cover") {
      const h = f.height ?? 1.8;
      const rot = f.rotation ?? 0;
      if (h >= 2.0) {
        // Tent: peaked roof + body
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(f.width * 0.95, h * 0.55, f.depth * 0.95),
          new THREE.MeshStandardMaterial({ color: 0x8a7e60, roughness: 0.92, flatShading: true }),
        );
        body.position.set(f.x, y + h * 0.28, f.z);
        body.rotation.y = rot;
        body.castShadow = true;
        group.add(body);
        const roof = new THREE.Mesh(
          new THREE.ConeGeometry(Math.max(f.width, f.depth) * 0.62, h * 0.55, 4),
          new THREE.MeshStandardMaterial({ color: 0x9a8a68, roughness: 0.9, flatShading: true }),
        );
        roof.position.set(f.x, y + h * 0.72, f.z);
        roof.rotation.y = rot + Math.PI / 4;
        roof.castShadow = true;
        group.add(roof);
      } else {
        // Crate stack
        const crateMat = new THREE.MeshStandardMaterial({ color: 0x8a7a50, roughness: 0.88, flatShading: true });
        const crate = new THREE.Mesh(new THREE.BoxGeometry(f.width, h, f.depth), crateMat);
        crate.position.set(f.x, y + h / 2, f.z);
        crate.rotation.y = rot;
        crate.castShadow = true;
        group.add(crate);
      }
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

/** Road geometry samples the same height field as navigation; no floating slabs. */
function drapedStrip(f:MapFeatureDef,width:number,color:number,lift:number):THREE.Mesh {
  const geo=new THREE.PlaneGeometry(width,f.depth,2,Math.max(1,Math.ceil(f.depth/3)));geo.rotateX(-Math.PI/2);const p=geo.attributes.position,c=Math.cos(f.rotation??0),s=Math.sin(f.rotation??0);
  for(let i=0;i<p.count;i++){const lx=p.getX(i),lz=p.getZ(i),x=f.x+lx*c+lz*s,z=f.z-lx*s+lz*c;p.setXYZ(i,x,heightAt(x,z)+lift,z);}geo.computeVertexNormals();
  const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color,roughness:.96,polygonOffset:true,polygonOffsetFactor:-1}));mesh.receiveShadow=true;return mesh;
}
function createForest(features:readonly MapFeatureDef[]):THREE.Group {
  const rnd=mulberry32(104),points:{x:number;z:number;s:number}[]=[];
  for(const f of features.filter(f=>f.appearance==="forest"))for(let i=0;i<Math.ceil(f.width*f.depth/30);i++)points.push({x:f.x+(rnd()-.5)*f.width,z:f.z+(rnd()-.5)*f.depth,s:.8+rnd()*.55});
  const group=new THREE.Group(),trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.16,.25,3,5),new THREE.MeshStandardMaterial({color:0x645942,roughness:1}),points.length);
  const crowns=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(2.4,1),new THREE.MeshStandardMaterial({color:0xffffff,roughness:1}),points.length*2),d=new THREE.Object3D();
  points.forEach((p,i)=>{const y=heightAt(p.x,p.z);d.position.set(p.x,y+1.5*p.s,p.z);d.scale.set(p.s,p.s,p.s);d.updateMatrix();trunks.setMatrixAt(i,d.matrix);
    for(let j=0;j<2;j++){d.position.set(p.x+j*.55,y+(3.8+j*1.6)*p.s,p.z);d.scale.set(p.s*(1-j*.25),p.s,p.s*(1-j*.25));d.updateMatrix();crowns.setMatrixAt(i*2+j,d.matrix);crowns.setColorAt(i*2+j,new THREE.Color().setHSL(.27+rnd()*.035,.26+rnd()*.15,.19+rnd()*.08));}});
  trunks.castShadow=true;crowns.castShadow=true;crowns.receiveShadow=true;group.add(trunks,crowns);return group;
}

let cachedFieldTexture:THREE.CanvasTexture|undefined;
function fieldTexture():THREE.CanvasTexture {
  if(cachedFieldTexture)return cachedFieldTexture;
  const canvas=document.createElement("canvas");canvas.width=canvas.height=128;
  const c=canvas.getContext("2d")!,rnd=mulberry32(4104),data=c.createImageData(128,128);
  for(let z=0;z<128;z++)for(let x=0;x<128;x++){const i=(z*128+x)*4,furrow=(x%8)<2,v=furrow?170+rnd()*15:220+rnd()*30;data.data[i]=v;data.data[i+1]=v;data.data[i+2]=v;data.data[i+3]=255;}
  c.putImageData(data,0,0);const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,3);t.anisotropy=8;cachedFieldTexture=t;return t;
}

let cachedRoofTexture:THREE.CanvasTexture|undefined;
function roofTexture():THREE.CanvasTexture {
  if(cachedRoofTexture)return cachedRoofTexture;
  const canvas=document.createElement("canvas");canvas.width=canvas.height=128;const c=canvas.getContext("2d")!,rnd=mulberry32(521);
  c.fillStyle="#dfd9d1";c.fillRect(0,0,128,128);
  for(let y=0;y<128;y+=8)for(let x=-8;x<128;x+=16){const offset=(y/8%2)*8,v=Math.floor(180+rnd()*65);c.fillStyle=`rgb(${v},${v},${v})`;c.fillRect(x+offset,y,15,7);}
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(3,3);texture.anisotropy=8;cachedRoofTexture=texture;return texture;
}
