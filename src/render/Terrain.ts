import terrainConfig from "../data/terrain.json";
import {isGarrisonBuilding,GARRISON_RULES} from "../sim/garrison";
import * as THREE from "three";
import {createCivilianBuilding,createBuildingModel,batchStaticScene} from "./Architecture";
import { getBases, MAP_SIZE, heightAt,groundHeightAt } from "../sim/heightmap";
import { mulberry32 } from "../sim/rng";
import { pointInFeature, forestDensityAt, MapFeatureIndex, type MapFeatureDef } from "../sim/mapFeatures";
import type {World} from "../sim/World";
import type { Point } from "../sim/types";

const SEG = 192;

export function createTerrain(theme: "desert" | "mountains" | "city" | "temperate" = "desert", features: readonly MapFeatureDef[] = [], bases: readonly (Point & { r: number })[] = []): THREE.Group {
  const rnd = mulberry32(7);
  const group = new THREE.Group();

  const geo = new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, groundHeightAt(pos.getX(i), pos.getZ(i)));
  geo.computeVertexNormals();

  const nrm = geo.attributes.normal;
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  // Brighter Real War-style desert / mountain / city palettes
  const palette = theme === "temperate" ? [0x7e8960,0x929576,0x8a8975,0x9a988b,0x536c3e] : theme === "mountains"
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
    if (theme === "temperate") c.setScalar(1-Math.min(.18,sl*.12));
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));

  const grain = makeGrainTexture(theme);

  const terrain = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: theme==="temperate"?makeLandscapeTexture(features,bases):grain,
      bumpMap:grain,bumpScale:.10,
      roughness: 0.92,
      metalness: 0,
    }),
  );
  terrain.name = "terrain";
  terrain.receiveShadow = true;
  group.add(terrain);
  if (theme !== "temperate") group.add(createRocks(rnd, bases, features));
  else group.add(createForest(features));
  if(theme!=="temperate")group.add(createDecals(rnd));
  group.add(batchStaticScene(createMapFeatures(features,theme==="temperate")));
  freezeTerrainTransforms(group);
  return group;
}

/** Static terrain keeps its matrices; damage changes explicitly invalidate a house. */
export function freezeTerrainTransforms(group:THREE.Group):void {
  group.traverse(o=>{o.updateMatrix();o.matrixAutoUpdate=false;});
}

function riverTexture():THREE.CanvasTexture {
  const canvas=document.createElement("canvas");canvas.width=128;canvas.height=256;
  const ctx=canvas.getContext("2d")!,rnd=mulberry32(841);
  ctx.fillStyle="#c0cac7";ctx.fillRect(0,0,128,256);
  for(let i=0;i<420;i++){
    const x=rnd()*128,y=rnd()*256;ctx.strokeStyle=`rgba(239,244,235,${.04+rnd()*.12})`;ctx.lineWidth=.4+rnd()*.8;
    ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x+1,y+3,x-2,y+5,x,y+8+rnd()*6);ctx.stroke();
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=4;return texture;
}

export function animateRiverTerrain(group:THREE.Group,time:number):void {
  const mapFeatures=group.children.find(o=>o.name==="map-features");
  const flow=mapFeatures?.userData.riverFlow as THREE.CanvasTexture|undefined;
  if(flow)flow.offset.y=time*.012;
  const sea=mapFeatures?.userData.seaFlow as THREE.CanvasTexture|undefined;
  if(sea){sea.offset.x=time*.002;sea.offset.y=time*.0015;}
}

function makeGrainTexture(theme:string):THREE.CanvasTexture {
  const cv=document.createElement("canvas");cv.width=cv.height=512;
  const g=cv.getContext("2d")!,im=g.createImageData(512,512),rnd=mulberry32(6021);
  for(let z=0;z<512;z++)for(let x=0;x<512;x++){
    const macro=Math.sin(x*Math.PI*2/512)*Math.cos(z*Math.PI*4/512);
    const fine=rnd(),blade=theme==="temperate"&&fine>.84;
    const v=216+macro*13+fine*25-(blade?28:0),i=(z*512+x)*4;
    im.data[i]=v;im.data[i+1]=v+(blade?5:0);im.data[i+2]=v-(blade?6:0);im.data[i+3]=255;
  }
  g.putImageData(im,0,0);
  const t=new THREE.CanvasTexture(cv);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(80,80);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;
}

/** A single world-space landcover atlas avoids floating, overlapping field slabs.
 * Geometry, tree placement, navigation and cover still use the same map features. */
function makeLandscapeTexture(features:readonly MapFeatureDef[],bases:readonly (Point&{r:number})[]):THREE.CanvasTexture {
  const canvas=document.createElement("canvas");canvas.width=canvas.height=2048;
  const ctx=canvas.getContext("2d")!,scale=canvas.width/MAP_SIZE,half=MAP_SIZE/2,rnd=mulberry32(917);
  const noise=document.createElement("canvas");noise.width=noise.height=512;const nc=noise.getContext("2d")!,data=nc.createImageData(512,512);
  for(let z=0;z<512;z++)for(let x=0;x<512;x++){
    const macro=Math.sin(x/62)*Math.cos(z/79)*5+Math.sin((x+z)/41)*3,grain=rnd()*9-4,i=(z*512+x)*4;
    data.data[i]=143+macro+grain;data.data[i+1]=151+macro+grain;data.data[i+2]=121+macro+grain;data.data[i+3]=255;
  }
  nc.putImageData(data,0,0);ctx.drawImage(noise,0,0,2048,2048);
  ctx.setTransform(scale,0,0,scale,half*scale,half*scale);
  const local=(f:MapFeatureDef,paint:()=>void)=>{ctx.save();ctx.translate(f.x,f.z);ctx.rotate(-(f.rotation??0));paint();ctx.restore();};
  for(const f of features.filter(f=>f.appearance==="field"))local(f,()=>{
    ctx.beginPath();ctx.rect(-f.width/2,-f.depth/2,f.width,f.depth);ctx.clip();
    ctx.fillStyle=`#${(f.color??0x969572).toString(16).padStart(6,"0")}`;ctx.fillRect(-f.width/2,-f.depth/2,f.width,f.depth);
    ctx.strokeStyle="rgba(63,67,42,.11)";ctx.lineWidth=.28;
    for(let x=-f.width/2+1;x<f.width/2;x+=1.8){ctx.beginPath();ctx.moveTo(x,-f.depth/2);ctx.lineTo(x,f.depth/2);ctx.stroke();}
    ctx.strokeStyle="rgba(60,65,44,.18)";ctx.lineWidth=1.2;ctx.strokeRect(-f.width/2+1.5,-f.depth/2+1.5,f.width-3,f.depth-3);
    for(let i=0;i<22;i++){ctx.fillStyle=`rgba(208,205,165,${.02+rnd()*.025})`;ctx.fillRect(-f.width/2+rnd()*f.width,-f.depth/2,1+rnd()*3,f.depth);}
  });
  // Forest floor follows irregular shared ellipses, with soft soil transition.
  for(const f of features.filter(f=>f.appearance==="forest"))local(f,()=>{
    ctx.scale(f.width/2,f.depth/2);const gradient=ctx.createRadialGradient(0,0,.15,0,0,1);
    gradient.addColorStop(0,"rgba(49,68,43,.78)");gradient.addColorStop(.65,"rgba(57,74,46,.68)");gradient.addColorStop(1,"rgba(67,81,51,0)");
    ctx.fillStyle=gradient;ctx.beginPath();if(f.shape==="ellipse")ctx.arc(0,0,1,0,Math.PI*2);else ctx.rect(-1,-1,2,2);ctx.fill();
  });
  // Mud and meadow banks follow the continuous watercourse, underneath bridges.
  ctx.lineCap="round";
  for(const width of [48,37,29]){
    ctx.strokeStyle=width===48?"rgba(147,149,118,.65)":width===37?"#969581":"#858778";ctx.lineWidth=width;
    for(const f of features.filter(f=>f.kind==="water"&&f.width<128))local(f,()=>{ctx.beginPath();ctx.moveTo(0,-f.depth/2);ctx.lineTo(0,f.depth/2);ctx.stroke();});
  }
  // Ocean shore is the actual water footprint boundary, never a river stripe.
  for(const f of features.filter(f=>f.kind==="water"&&f.width>=128))local(f,()=>{
    const beach=ctx.createLinearGradient(f.width/2-4,0,f.width/2+18,0);
    beach.addColorStop(0,"#777f76");beach.addColorStop(.35,"#b3ac8d");beach.addColorStop(1,"rgba(155,157,126,0)");
    ctx.fillStyle=beach;ctx.fillRect(f.width/2-4,-f.depth/2,22,f.depth);
  });
  for(const b of bases){const g=ctx.createRadialGradient(b.x,b.z,b.r*.4,b.x,b.z,b.r);g.addColorStop(0,"rgba(157,157,139,.72)");g.addColorStop(1,"rgba(157,157,139,0)");ctx.fillStyle=g;ctx.beginPath();ctx.arc(b.x,b.z,b.r,0,Math.PI*2);ctx.fill();}
  // Narrow mown shoulders keep rural routes legible without bright paint stripes.
  for(const f of features.filter(f=>f.kind==="road"))local(f,()=>{ctx.fillStyle=f.roadClass==="track"?"#aaa58b":"#8c907c";ctx.fillRect(-f.width/2-.8,-f.depth/2,f.width+1.6,f.depth);});
  ctx.resetTransform();
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;return texture;
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


function createMapFeatures(features: readonly MapFeatureDef[],landscapeAtlas=false): THREE.Group {
  const group = new THREE.Group();
  group.name = "map-features";
  const flow=riverTexture();group.userData.riverFlow=flow;
  const riverMaterial=new THREE.MeshStandardMaterial({color:0x526d70,map:flow,bumpMap:flow,bumpScale:.055,roughness:.36,metalness:.14});
  const seaFlow=riverTexture();group.userData.seaFlow=seaFlow;
  const seaMaterial=new THREE.MeshStandardMaterial({color:0xffffff,map:seaFlow,bumpMap:seaFlow,bumpScale:.12,roughness:.48,metalness:.12,vertexColors:true});
  const ocean=features.filter(f=>f.kind==="water"&&f.width>=128);
  const asphalt=asphaltTexture();
  const roadMat=new THREE.MeshStandardMaterial({color:0x626862,map:asphalt,bumpMap:asphalt,bumpScale:.015,roughness:.96,polygonOffset:true,polygonOffsetFactor:-1});
  const vergeMat=new THREE.MeshStandardMaterial({color:0x8c907c,roughness:1,polygonOffset:true,polygonOffsetFactor:-1});
  // All shoulders sit below the complete carriageway network, including junctions.
  for(const f of features)if(f.kind==="road"&&f.roadClass!=="track")group.add(drapedStrip(f,f.width+1.2,0x8c907c,.028,vergeMat));
  for (const f of features) {
    const y = heightAt(f.x, f.z);
    if(f.appearance==="yard"){group.add(drapedStrip(f,f.width,f.color??0x858578,f.width>12&&f.depth>12?.025:.07));continue;}
    if (f.appearance === "forest") continue;
    if (f.appearance === "field") {
      if(landscapeAtlas)continue;
      const field=drapedStrip(f,f.width,f.color??0x879357,.025);
      (field.material as THREE.MeshStandardMaterial).map=fieldTexture();group.add(field);continue;
    }
    if (f.kind === "water") {
      const sea=f.width>=128;
      const geo=new THREE.PlaneGeometry(f.width,f.depth,sea?Math.ceil(f.width/16):1,1).rotateX(-Math.PI/2);
      const uv=geo.attributes.uv,pos=geo.attributes.position,c=Math.cos(f.rotation??0),s=Math.sin(f.rotation??0);
      for(let i=0;i<uv.count;i++){const x=f.x+pos.getX(i)*c+pos.getZ(i)*s,z=f.z-pos.getX(i)*s+pos.getZ(i)*c;uv.setXY(i,x/6,z/12);}
      if(sea){
        const colors=new Float32Array(pos.count*3),deep=new THREE.Color(0x314e60),shallow=new THREE.Color(0x738e88),tint=new THREE.Color();
        for(let i=0;i<pos.count;i++){
          const x=f.x+pos.getX(i),z=f.z+pos.getZ(i);
          const shores=ocean.filter(w=>Math.abs(z-w.z)<=w.depth/2+.01);
          const shore=Math.max(...shores.map(w=>w.x+w.width/2));
          tint.copy(deep).lerp(shallow,Math.max(0,1-(shore-x)/48));tint.toArray(colors,i*3);
        }
        geo.setAttribute("color",new THREE.BufferAttribute(colors,3));
      }
      const mesh=new THREE.Mesh(geo,sea?seaMaterial:riverMaterial);
      mesh.position.set(f.x,f.surfaceHeight??y-.55,f.z);mesh.rotation.y=f.rotation??0;mesh.receiveShadow=true;
      group.add(mesh);
      continue;
    }
    if (f.kind === "road" || f.kind === "bridge") {
      if(f.kind === "road") {
        const track=f.roadClass==="track",urban=f.roadClass==="street";
        group.add(drapedStrip(f,f.width,track?0x8e8b73:0x626862,.065,track?undefined:roadMat));
        if(!track&&!urban)for(let z=-f.depth/2+3;z<f.depth/2-2;z+=10){
          const x=f.x+Math.sin(f.rotation??0)*z,zz=f.z+Math.cos(f.rotation??0)*z;
          // Markings stop at real intersections and at bridge decks.
          if(features.some(o=>o!==f&&(o.kind==="road"||o.kind==="bridge")&&pointInFeature(x,zz,o,1)))continue;
          group.add(drapedStrip({...f,x,z:zz,depth:3},.13,0xc9c7b4,.075));
        }
      } else {
        const mesh=new THREE.Mesh(new THREE.BoxGeometry(f.width,.7,f.depth),new THREE.MeshStandardMaterial({color:0x8a8980,roughness:.9}));
        mesh.position.set(f.x,(f.surfaceHeight??y)-.29,f.z);mesh.rotation.y=f.rotation??0;mesh.receiveShadow=true;
        const bridge=new THREE.Group();bridge.userData.bridgeId=f.id;bridge.add(mesh);
        const surface=new THREE.Mesh(new THREE.PlaneGeometry(f.width-.8,f.depth).rotateX(-Math.PI/2),roadMat);surface.position.set(f.x,(f.surfaceHeight??y)+.075,f.z);surface.rotation.y=f.rotation??0;
        // Continuous world-space asphalt scale, including rotated bridge decks.
        const deckPos=surface.geometry.attributes.position,deckUv=surface.geometry.attributes.uv,a=f.rotation??0;
        for(let i=0;i<deckPos.count;i++)deckUv.setXY(i,(f.x+deckPos.getX(i)*Math.cos(a)+deckPos.getZ(i)*Math.sin(a))*.18,(f.z-deckPos.getX(i)*Math.sin(a)+deckPos.getZ(i)*Math.cos(a))*.18);
        surface.receiveShadow=true;bridge.add(surface);
        for(const side of [-1,1]){const a=f.rotation??0,offset=f.depth/2*side;const support=new THREE.Mesh(new THREE.BoxGeometry(f.width+1,1.8,2.2),mesh.material);support.position.set(f.x+Math.sin(a)*offset,(f.surfaceHeight??y)-1.3,f.z+Math.cos(a)*offset);support.rotation.y=a;bridge.add(support);}
        addBridgeRails(bridge,f,f.surfaceHeight??y);group.add(batchStaticScene(bridge));
      }
      continue;
    }
    if(f.appearance==="resource-industrial"||f.appearance==="resource-oil"){
      const model=createBuildingModel(f.appearance==="resource-oil"?"refinery":"factory",0,"russia")!;
      model.group.position.set(f.x,y,f.z);group.add(model.group);continue;
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
        // Small paving/apron grounds the facade without covering neighbouring roads.
        group.add(drapedStrip({...f,kind:"cover",appearance:"yard",depth:f.depth+3},f.width+3,0x8f9181,.025,undefined,features));
        const variant=Number(f.id.split("-").at(-1))||0,house=new THREE.LOD();
        house.addLevel(createCivilianBuilding(f.width,f.depth,h,variant),0);
        house.addLevel(createCivilianBuilding(f.width,f.depth,h,variant,true),235, .15);
        house.userData.structureId=f.id;house.userData.structureHeight=h;
        house.position.set(f.x,y,f.z);house.rotation.y=f.rotation??0;group.add(house);
        mesh.geometry.dispose();(mesh.material as THREE.Material).dispose();
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

function addBridgeRails(group:THREE.Group,f:MapFeatureDef,y:number):void {
  const c=Math.cos(f.rotation??0),s=Math.sin(f.rotation??0);
  const mat=new THREE.MeshStandardMaterial({color:0x62665e,roughness:.8});
  for(const side of [-1,1]){
    const offset=side*(f.width/2-.3);
    for(const level of [.48,.92]){
      const rail=new THREE.Mesh(new THREE.BoxGeometry(.13,.13,f.depth),mat);
      rail.position.set(f.x+offset*c,y+level,f.z-offset*s);rail.rotation.y=f.rotation??0;group.add(rail);
    }
    const curb=new THREE.Mesh(new THREE.BoxGeometry(.42,.18,f.depth),mat);
    curb.position.set(f.x+offset*c,y+.12,f.z-offset*s);curb.rotation.y=f.rotation??0;group.add(curb);
    for(let z=-f.depth/2+2;z<f.depth/2;z+=8){
      const post=new THREE.Mesh(new THREE.BoxGeometry(.35,1,.35),mat);
      post.position.set(f.x+offset*c+z*s,y+.5,f.z-offset*s+z*c);post.rotation.y=f.rotation??0;group.add(post);
    }
  }
}

/** Road geometry samples the same height field as navigation; no floating slabs. */
function drapedStrip(f:MapFeatureDef,width:number,color:number,lift:number,sharedMaterial?:THREE.MeshStandardMaterial,exclude:readonly MapFeatureDef[]=[]):THREE.Mesh {
  const geo=new THREE.PlaneGeometry(width,f.depth,exclude.length?Math.ceil(width/1.5):2,Math.max(1,Math.ceil(f.depth/(exclude.length?1.5:3))));geo.rotateX(-Math.PI/2);const p=geo.attributes.position,c=Math.cos(f.rotation??0),s=Math.sin(f.rotation??0);
  for(let i=0;i<p.count;i++){const lx=p.getX(i),lz=p.getZ(i),x=f.x+lx*c+lz*s,z=f.z-lx*s+lz*c;p.setXYZ(i,x,heightAt(x,z)+lift,z);}geo.computeVertexNormals();
  if(exclude.length){
    const blockers=exclude.filter(o=>(o.kind==="road"||o.kind==="bridge"||o.kind==="water")&&Math.hypot(o.x-f.x,o.z-f.z)<Math.hypot(o.width,o.depth)/2+Math.hypot(width,f.depth)/2+2);
    const index=geo.index!,kept:number[]=[];
    for(let i=0;i<index.count;i+=3){
      const ids=[index.getX(i),index.getX(i+1),index.getX(i+2)];
      if(ids.some(id=>blockers.some(o=>pointInFeature(p.getX(id),p.getZ(id),o,.5))))continue;
      kept.push(...ids);
    }
    geo.setIndex(kept);
  }
  const paved=f.kind==="road"||f.appearance==="yard";
  if(paved){const uv=geo.attributes.uv;for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)*.18,p.getZ(i)*.18);}
  const map=paved?asphaltTexture():null;
  const mesh=new THREE.Mesh(geo,sharedMaterial??new THREE.MeshStandardMaterial({color,map,bumpMap:map,bumpScale:.025,roughness:.96,polygonOffset:true,polygonOffsetFactor:-1}));mesh.receiveShadow=true;return mesh;
}
/** Opaque rounded crowns avoid alpha overdraw and leaf shadow-map passes. Separate cell batches keep distant forests culled. */
export function createForest(features:readonly MapFeatureDef[]):THREE.Group {
  const rnd=mulberry32(104),cells=new Map<string,{x:number;z:number;s:number;angle:number;pine:boolean}[]>();
  const index=new MapFeatureIndex(features);
  for(const f of features.filter(f=>f.appearance==="forest")){
    const c=Math.cos(f.rotation??0),s=Math.sin(f.rotation??0);
    for(let i=0;i<Math.ceil(f.width*f.depth/38);i++){
      const lx=(rnd()-.5)*f.width,lz=(rnd()-.5)*f.depth,x=f.x+lx*c+lz*s,z=f.z-lx*s+lz*c;
      const nearby=index.at(x,z);
      if(nearby.some(block=>(["building","road","bridge","water","wall"].includes(block.kind)||block.appearance==="yard")&&pointInFeature(x,z,block,2))||rnd()>forestDensityAt(x,z,nearby))continue;
      const pine=rnd()<.4,key=`${Math.floor(x/64)}/${Math.floor(z/64)}/${pine}`,list=cells.get(key)??[];
      list.push({x,z,s:.85+rnd()*.65,angle:rnd()*Math.PI,pine});cells.set(key,list);
    }
  }
  const group=new THREE.Group(),trunkGeometry=new THREE.CylinderGeometry(.13,.3,5,5),crownGeometry=new THREE.SphereGeometry(1,8,5),farGeometry=new THREE.IcosahedronGeometry(1,0);
  const trunkMaterial=new THREE.MeshStandardMaterial({color:0x625a49,roughness:1});
  const crownMaterial=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,metalness:0});
  const d=new THREE.Object3D(),tint=new THREE.Color();
  for(const points of cells.values()){
    const trunks=new THREE.InstancedMesh(trunkGeometry,trunkMaterial,points.length),crowns=new THREE.InstancedMesh(crownGeometry,crownMaterial,points.length);
    points.forEach((p,i)=>{
      const y=heightAt(p.x,p.z);d.rotation.set(0,p.angle,0);d.position.set(p.x,y+2.5*p.s,p.z);d.scale.set(p.s,p.s,p.s);d.updateMatrix();trunks.setMatrixAt(i,d.matrix);trunks.setColorAt(i,new THREE.Color(1,1,1));
      tint.setHSL(.26+rnd()*.035,.25+rnd()*.12,.30+rnd()*.08);
      d.position.set(p.x,y+5.2*p.s,p.z);d.rotation.set(0,p.angle,0);
      d.scale.set((p.pine?3.1:4.4)*p.s,(p.pine?4:3.5)*p.s,(p.pine?3.1:4)*p.s);
      d.updateMatrix();crowns.setMatrixAt(i,d.matrix);crowns.setColorAt(i,tint);
    });
    trunks.computeBoundingSphere();crowns.computeBoundingSphere();trunks.castShadow=false;crowns.castShadow=false;crowns.receiveShadow=true;trunks.matrixAutoUpdate=crowns.matrixAutoUpdate=false;
    crowns.userData.forestCrownCount=1;crowns.userData.forestPoints=points;crowns.userData.forestColors=crowns.instanceColor!.array.slice();crowns.userData.forestMatrices=crowns.instanceMatrix.array.slice();
    trunks.userData.forestPoints=points;trunks.userData.forestTrunks=true;trunks.userData.forestColors=trunks.instanceColor!.array.slice();trunks.userData.forestMatrices=trunks.instanceMatrix.array.slice();
    // Distant opaque canopy retains volume with only 20 triangles and no trunks.
    const far=new THREE.InstancedMesh(farGeometry,crowns.material,points.length);
    points.forEach((_,i)=>{crowns.getMatrixAt(i,d.matrix);far.setMatrixAt(i,d.matrix);crowns.getColorAt(i,tint);far.setColorAt(i,tint);});
    far.computeBoundingSphere();far.receiveShadow=true;far.matrixAutoUpdate=false;
    far.userData.forestPoints=points;far.userData.forestCrownCount=1;
    far.userData.forestColors=far.instanceColor!.array.slice();far.userData.forestMatrices=far.instanceMatrix.array.slice();
    const near=new THREE.Group();near.add(trunks,crowns);
    const lod=new THREE.LOD(),origin=new THREE.Vector3(points.reduce((n,p)=>n+p.x,0)/points.length,0,points.reduce((n,p)=>n+p.z,0)/points.length);origin.y=heightAt(origin.x,origin.z);
    lod.position.copy(origin);near.position.copy(origin).negate();far.position.copy(origin).negate();far.updateMatrix();
    lod.addLevel(near,0);lod.addLevel(far,terrainConfig.forest.lodDistance,.15);group.add(lod);
  }
  return group;
}

/** Persistent charred canopy uses existing forest batches; no per-tree mesh creation. */
export function syncForestTerrain(group:THREE.Group,world:World):boolean {
  if(group.userData.forestRevision===world.terrain.revision)return false;
  group.userData.forestRevision=world.terrain.revision;let changed=false;
  const matrix=new THREE.Matrix4(),color=new THREE.Color(),position=new THREE.Vector3(),scale=new THREE.Vector3(),rotation=new THREE.Quaternion();
  group.traverse(o=>{
    if(!(o instanceof THREE.InstancedMesh)||!o.userData.forestPoints)return;
    const points=o.userData.forestPoints as {x:number;z:number}[],colors=o.userData.forestColors as Float32Array,matrices=o.userData.forestMatrices as Float32Array;
    const count=o.userData.forestTrunks?1:(o.userData.forestCrownCount??3);
    points.forEach((p,i)=>{const burnt=world.terrain.burntAt(p.x,p.z);
      for(let j=0;j<count;j++){const index=i*count+j;matrix.fromArray(matrices,index*16);color.fromArray(colors,index*3);
        if(burnt){if(!o.userData.forestTrunks){matrix.decompose(position,rotation,scale);scale.multiplyScalar(.18);matrix.compose(position,rotation,scale);}color.setHex(0x34342d);}
        o.setMatrixAt(index,matrix);o.setColorAt(index,color);
      }
    });o.instanceMatrix.needsUpdate=true;o.instanceColor!.needsUpdate=true;changed=true;
  });
  let scorch=group.getObjectByName("forest-scorch") as THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>|undefined;
  const cells=world.terrain.burntCells().slice(0,4096);
  if(!scorch&&!cells.length)return changed;
  if(!scorch){
    const cv=document.createElement("canvas");cv.width=cv.height=128;const c=cv.getContext("2d")!,g=c.createRadialGradient(64,64,16,64,64,63);
    g.addColorStop(0,"rgba(255,255,255,.8)");g.addColorStop(.7,"rgba(255,255,255,.55)");g.addColorStop(1,"rgba(255,255,255,0)");c.fillStyle=g;c.fillRect(0,0,128,128);
    const geometry=new THREE.BufferGeometry();geometry.setAttribute("position",new THREE.BufferAttribute(new Float32Array(4096*18),3));geometry.setAttribute("uv",new THREE.BufferAttribute(new Float32Array(4096*12),2));geometry.setDrawRange(0,0);const normals=new Float32Array(4096*18);for(let i=1;i<normals.length;i+=3)normals[i]=1;geometry.setAttribute("normal",new THREE.BufferAttribute(normals,3));
    scorch=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0x39352b,map:new THREE.CanvasTexture(cv),transparent:true,depthWrite:false,roughness:1}));scorch.name="forest-scorch";scorch.frustumCulled=false;scorch.receiveShadow=true;group.add(scorch);
  }
  const positionAttribute=scorch.geometry.getAttribute("position"),uvAttribute=scorch.geometry.getAttribute("uv");
  cells.forEach((cell,i)=>{const corners=[[-9,-9],[9,-9],[-9,9],[-9,9],[9,-9],[9,9]];
    corners.forEach(([dx,dz],j)=>{const x=cell.x+dx,z=cell.z+dz;positionAttribute.setXYZ(i*6+j,x,heightAt(x,z)+.1,z);uvAttribute.setXY(i*6+j,(dx+9)/18,(dz+9)/18);});
  });positionAttribute.needsUpdate=true;uvAttribute.needsUpdate=true;scorch.geometry.setDrawRange(0,cells.length*6);
  return changed;
}
let cachedFieldTexture:THREE.CanvasTexture|undefined;
function fieldTexture():THREE.CanvasTexture {
  if(cachedFieldTexture)return cachedFieldTexture;
  const canvas=document.createElement("canvas");canvas.width=canvas.height=128;
  const c=canvas.getContext("2d")!,rnd=mulberry32(4104),data=c.createImageData(128,128);
  for(let z=0;z<128;z++)for(let x=0;x<128;x++){const i=(z*128+x)*4,furrow=(x%8)<2,v=furrow?170+rnd()*15:220+rnd()*30;data.data[i]=v;data.data[i+1]=v;data.data[i+2]=v;data.data[i+3]=255;}
  c.putImageData(data,0,0);const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,3);t.anisotropy=8;cachedFieldTexture=t;return t;
}


let cachedAsphalt:THREE.CanvasTexture|undefined;
function asphaltTexture():THREE.CanvasTexture {
  if(cachedAsphalt)return cachedAsphalt;
  const cv=document.createElement("canvas");cv.width=cv.height=256;const c=cv.getContext("2d")!,rnd=mulberry32(144);
  const data=c.createImageData(256,256);
  for(let i=0;i<256*256;i++){const v=210+rnd()*40;data.data[i*4]=data.data[i*4+1]=data.data[i*4+2]=v;data.data[i*4+3]=255;}
  c.putImageData(data,0,0);c.strokeStyle="rgba(75,75,71,.3)";c.lineWidth=1;
  for(let i=0;i<7;i++){c.beginPath();let x=rnd()*256,y=rnd()*256;c.moveTo(x,y);for(let j=0;j<4;j++){x+=rnd()*24-12;y+=rnd()*24-12;c.lineTo(x,y);}c.stroke();}
  const t=new THREE.CanvasTexture(cv);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;cachedAsphalt=t;return t;
}


/** Bridge collapse visuals follow the same infrastructure state as navigation. */
export function syncBridgeTerrain(group:THREE.Group,world:World):boolean {
  let bridges=group.userData.bridgeRoots as THREE.Object3D[]|undefined;
  if(!bridges){bridges=[];group.traverse(o=>{if(o.userData.bridgeId)bridges!.push(o);});group.userData.bridgeRoots=bridges;}
  let changed=false;
  for(const bridge of bridges){
    const intact=(world.infrastructureDamage.get(bridge.userData.bridgeId as string)??0)<1;
    if(bridge.visible!==intact){bridge.visible=intact;changed=true;}
  }
  return changed;
}

export function syncGarrisonTerrain(group:THREE.Group,world:World):boolean {
  let houses=group.userData.garrisonHouses as THREE.Object3D[]|undefined;
  if(!houses){houses=[];group.traverse(o=>{if(o.userData.structureId)houses!.push(o);});group.userData.garrisonHouses=houses;}
  const ownGarrisons=new Set<string>();
  for(const u of world.entities)if(!u.dead&&u.team===world.playerTeam&&u.garrisonId)ownGarrisons.add(u.garrisonId);
  let featureCache=group.userData.garrisonFeatures as {source:World["mapFeatures"];lookup:Map<string,MapFeatureDef>}|undefined;
  if(!featureCache||featureCache.source!==world.mapFeatures){featureCache={source:world.mapFeatures,lookup:new Map(world.mapFeatures.map(f=>[f.id,f]))};group.userData.garrisonFeatures=featureCache;}
  const features=featureCache.lookup;
  const rewind=world.time<(group.userData.garrisonTime as number??0);group.userData.garrisonTime=world.time;let changed=false;
  for(const house of houses){
    const id=house.userData.structureId as string,f=features.get(id);if(!f||!isGarrisonBuilding(f))continue;
    const known=world.vision.isVisible(world.playerTeam,f.x,f.z)||ownGarrisons.has(id);
    const damage=known?world.infrastructureDamage.get(id)??0:rewind?0:house.userData.structureDamage as number??0;
    const stage=damage>=1?2:damage>.35?1:0;if(stage===house.userData.structureStage&&!rewind)continue;
    house.userData.structureStage=stage;house.userData.structureDamage=damage;
    house.scale.y=stage===2?GARRISON_RULES.rubbleHeight/(f.height??3):1;house.updateMatrix();
    house.traverse(o=>{if(!(o instanceof THREE.Mesh)||!(o.material instanceof THREE.MeshStandardMaterial))return;
      if(!o.userData.garrisonMaterial&&stage){const original=o.material;o.material=original.clone();o.material.onBeforeCompile=original.onBeforeCompile;o.material.customProgramCacheKey=original.customProgramCacheKey;o.material.userData.sharedArt=false;o.userData.garrisonMaterial=true;o.userData.originalColor=original.color.clone();}
      if(o.userData.garrisonMaterial){o.material.color.copy(o.userData.originalColor as THREE.Color);if(stage)o.material.color.multiplyScalar(stage===2?.42:.7);}
    });changed=true;
  }
  return changed;
}
