import {createResourceIndustry} from './ResourceIndustry';
import {createItalianScenery} from './ItalianScenery';
import {createCropFields,fieldCrop,cropColors} from "./CropFields";
import {createRoadSurfaces,roadTexture as asphaltTexture} from "./RoadSurface";
import {groundLayout,withAirfieldAprons,groundRectangle} from "./GroundSurface";
import {applyTerrainDetail,createTerrainDetailTexture,terrainNoise} from "./TerrainDetail";
import terrainConfig from "../data/terrain.json";
import {isGarrisonBuilding,GARRISON_RULES} from "../sim/garrison";
import * as THREE from "three";
import {createCivilianBuilding,batchStaticScene} from "./Architecture";
import { getBases, MAP_SIZE, heightAt,groundHeightAt } from "../sim/heightmap";
import { mulberry32 } from "../sim/rng";
import { pointInFeature, isSeaFeature, featureCorners, forestDensityAt, MapFeatureIndex, type MapFeatureDef } from "../sim/mapFeatures";
import type {World} from "../sim/World";
import type { Point } from "../sim/types";

const SEG = 192;

export function createTerrain(theme: "desert" | "mountains" | "city" | "temperate" = "desert", features: readonly MapFeatureDef[] = [], bases: readonly (Point & { r: number })[] = []): THREE.Group {
  features=withAirfieldAprons(features);
  const rnd = mulberry32(7);
  const group = new THREE.Group();
  const forestLayout=theme==="temperate"?sampleForest(features):undefined;

  const grain = theme==="temperate"?createTerrainDetailTexture(MAP_SIZE):makeGrainTexture(theme);

  const material=new THREE.MeshStandardMaterial({
    vertexColors:true,map:theme==="temperate"?makeLandscapeTexture(features,bases,forestLayout!):grain,
    bumpMap:grain,bumpScale:theme==="temperate"?.045:.10,roughness:.92,metalness:0,
  });
  if(theme==="temperate")applyTerrainDetail(material,grain);
  const ground=new THREE.Group();ground.name="terrain";
  for(const geometry of createGroundTiles(theme,bases)){
    const tile=new THREE.Mesh(geometry,material);tile.receiveShadow=true;ground.add(tile);
  }
  group.add(ground);
  if(theme==="temperate")group.add(createRoadSurfaces(features));
  if (theme !== "temperate") group.add(createRocks(rnd, bases, features));
  else {group.add(createLandscapeBackdrop(features));group.add(createForest(features,forestLayout));}
  if(theme!=="temperate")group.add(createDecals(rnd));
  group.add(batchStaticScene(createMapFeatures(features,theme==="temperate")));
  group.add(createCropFields(features));group.add(createItalianScenery(features));
  freezeTerrainTransforms(group);
  return group;
}

/** World UVs and shared edge heights let the renderer cull distant ground tiles. */
export function createGroundTiles(theme:"desert"|"mountains"|"city"|"temperate"="temperate",bases:readonly (Point&{r:number})[]=[]):THREE.BufferGeometry[]{
  const tiles:THREE.BufferGeometry[]=[],{columns,span,segments}=groundLayout();
  for(let iz=0;iz<columns;iz++)for(let ix=0;ix<columns;ix++){
  const geo = new THREE.PlaneGeometry(span,span,segments,segments);
  geo.rotateX(-Math.PI / 2);
  geo.translate(-MAP_SIZE/2+(ix+.5)*span,0,-MAP_SIZE/2+(iz+.5)*span);
  const pos = geo.attributes.position,uv=geo.attributes.uv;
  for (let i = 0; i < pos.count; i++){pos.setY(i,groundHeightAt(pos.getX(i),pos.getZ(i)));uv.setXY(i,(pos.getX(i)+MAP_SIZE/2)/MAP_SIZE,(MAP_SIZE/2-pos.getZ(i))/MAP_SIZE);}
  geo.computeVertexNormals();
  const normal=geo.attributes.normal,gradient=new THREE.Vector3();
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),z=pos.getZ(i);
    gradient.set(-(groundHeightAt(x+2,z)-groundHeightAt(x-2,z))/4,1,-(groundHeightAt(x,z+2)-groundHeightAt(x,z-2))/4).normalize();
    normal.setXYZ(i,gradient.x,gradient.y,gradient.z);
  }

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
    c.copy(sand).lerp(dust,nz*.55+(Math.sin(x*.071+z*.113)*.5+.5)*.12);
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
      const light=Math.max(0,nrm.getX(i)*.54+nrm.getY(i)*.73+nrm.getZ(i)*.43),shade=.78+.22*light;
      const stone=Math.min(.26,Math.max(0,.92-n)*1.3);
      c.setRGB(shade*(1-stone*.12),shade*(1-stone*.06),shade*(1+stone*.16));
    }
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));

  geo.computeBoundingSphere();tiles.push(geo);
  }
  return tiles;
}

/** Non-playable distant land closes the rectangular board edge with one static,
 * fogged ring. Its inner vertices match the actual terrain boundary exactly. */
export function createLandscapeBackdrop(features:readonly MapFeatureDef[]=[]):THREE.Mesh {
  const positions:number[]=[],colors:number[]=[],indices:number[]=[],half=MAP_SIZE/2,rows=[0,50,140,260,420],tint=new THREE.Color();
  const seas=features.filter(f=>isSeaFeature(f));
  for(let side=0;side<4;side++){
    const start=positions.length/3;
    for(const distance of rows)for(let i=0;i<=SEG;i++){
      const edge=half+distance,t=(i/SEG*2-1)*edge;
      const x=side===0?t:side===1?edge:side===2?-t:-edge;
      const z=side===0?edge:side===1?-t:side===2?-edge:t;
      const blend=Math.min(1,distance/260),hill=16+Math.sin(x*.009)*Math.cos(z*.007)*23+Math.sin((x+z)*.014)*9;
      const sea=seas.find(f=>pointInFeature(Math.max(-half,Math.min(half,x)),Math.max(-half,Math.min(half,z)),f));
      const y=sea?(sea.surfaceHeight??0):groundHeightAt(x,z)+Math.max(0,hill)*blend;
      positions.push(x,y,z);tint.setHex(sea?0x526d78:y>25?0x7f8978:0x879170).multiplyScalar(sea?1:.9+.08*Math.sin(x*.035)*Math.cos(z*.027));colors.push(tint.r,tint.g,tint.b);
    }
    for(let row=1;row<rows.length;row++)for(let i=0;i<SEG;i++){
      const a=start+(row-1)*(SEG+1)+i,b=a+1,c=a+SEG+1,d=c+1;indices.push(a,c,b,b,c,d);
    }
  }
  const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));g.setAttribute("color",new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();
  const mesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}));mesh.name="distant-landscape";return mesh;
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

/** Union horizontal slices of the authored water footprints. Every band is drawn
 * once, so adjacent rotated river pieces cannot fight for the depth buffer. */
export function createRiverSurface(features:readonly MapFeatureDef[]):THREE.BufferGeometry {
  const groups=new Map<number,Point[][]>();
  for(const f of features)if(f.kind==="water"&&!isSeaFeature(f)){
    const y=f.surfaceHeight??heightAt(f.x,f.z)-.55,list=groups.get(y)??[];
    list.push(featureCorners(f));groups.set(y,list);
  }
  const positions:number[]=[],colors:number[]=[],uvs:number[]=[],indices:number[]=[];
  const deep=new THREE.Color(0x49676c),bank=new THREE.Color(0x7d9286),tint=new THREE.Color();
  for(const [y,polygons] of groups){
    const vertices=polygons.flat(),half=MAP_SIZE/2;
    const lo=Math.max(-half,Math.min(...vertices.map(p=>p.z))),hi=Math.min(half,Math.max(...vertices.map(p=>p.z)));
    if(hi<=lo)continue;
    const rows=new Set<number>([lo,hi]);
    for(const p of vertices)if(p.z>lo&&p.z<hi)rows.add(p.z);
    for(let z=lo+1.5;z<hi;z+=1.5)rows.add(z);
    const levels=[...rows].sort((a,b)=>a-b);
    const spans=(z:number):Array<[number,number]>=>{
      const intervals:Array<[number,number]>=[];
      for(const polygon of polygons){
        const xs:number[]=[];
        for(let i=0;i<polygon.length;i++){
          const a=polygon[i],b=polygon[(i+1)%polygon.length];
          if(Math.abs(a.z-b.z)<1e-8)continue;
          if(z<Math.min(a.z,b.z)||z>Math.max(a.z,b.z))continue;
          xs.push(a.x+(b.x-a.x)*(z-a.z)/(b.z-a.z));
        }
        xs.sort((a,b)=>a-b);for(let i=1;i<xs.length;i+=2)intervals.push([Math.max(-half,xs[i-1]),Math.min(half,xs[i])]);
      }
      intervals.sort((a,b)=>a[0]-b[0]);const merged:Array<[number,number]>=[];
      for(const span of intervals){if(span[1]<=span[0])continue;const last=merged.at(-1);if(last&&span[0]<=last[1]+1e-6)last[1]=Math.max(last[1],span[1]);else merged.push([...span]);}
      return merged;
    };
    for(let row=1;row<levels.length;row++){
      const za=levels[row-1],zb=levels[row];if(zb-za<1e-6)continue;
      const middle=spans((za+zb)/2),bottom=spans(za+1e-7),top=spans(zb-1e-7);
      for(const mid of middle){
        const match=(list:Array<[number,number]>)=>list.find(s=>s[0]<=mid[1]&&s[1]>=mid[0]);
        const a=match(bottom),b=match(top);if(!a||!b)continue;
        const start=positions.length/3,lanes=6;
        for(const [z,span] of [[za,a],[zb,b]] as const)for(let lane=0;lane<=lanes;lane++){
          const t=lane/lanes,x=span[0]+(span[1]-span[0])*t;
          positions.push(x,y,z);uvs.push(x/6,z/12);
          tint.copy(deep).lerp(bank,Math.pow(Math.abs(t*2-1),3)*.75);colors.push(tint.r,tint.g,tint.b);
        }
        for(let lane=0;lane<lanes;lane++){const left=start+lane,right=left+1,upper=left+lanes+1;indices.push(left,upper,right,right,upper,upper+1);}
      }
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute("color",new THREE.Float32BufferAttribute(colors,3));
  geometry.setAttribute("uv",new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  return geometry;
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
function makeLandscapeTexture(features:readonly MapFeatureDef[],bases:readonly (Point&{r:number})[],forestLayout:Map<string,ForestPoint[]>):THREE.CanvasTexture {
  const canvas=document.createElement("canvas");canvas.width=canvas.height=2048;
  const ctx=canvas.getContext("2d")!,scale=canvas.width/MAP_SIZE,half=MAP_SIZE/2,rnd=mulberry32(917);
  const noise=document.createElement("canvas");noise.width=noise.height=512;const nc=noise.getContext("2d")!,data=nc.createImageData(512,512);
  for(let z=0;z<512;z++)for(let x=0;x<512;x++){
    const wx=(x+.5)/512*MAP_SIZE-half,wz=(z+.5)/512*MAP_SIZE-half;
    const macro=(terrainNoise(wx/170,wz/170)-.5)*17+(terrainNoise(wx/43,wz/43)-.5)*7,grain=rnd()*7-3.5,i=(z*512+x)*4;
    data.data[i]=143+macro+grain;data.data[i+1]=151+macro+grain;data.data[i+2]=121+macro+grain;data.data[i+3]=255;
  }
  nc.putImageData(data,0,0);ctx.drawImage(noise,0,0,2048,2048);
  ctx.setTransform(scale,0,0,scale,half*scale,half*scale);
  const local=(f:MapFeatureDef,paint:()=>void)=>{ctx.save();ctx.translate(f.x,f.z);ctx.rotate(-(f.rotation??0));paint();ctx.restore();};
  const trace=(f:MapFeatureDef)=>{
    ctx.beginPath();
    if(f.polygon){const a=f.rotation??0,c=Math.cos(a),s=Math.sin(a);f.polygon.forEach((p,i)=>{const x=(p.x-f.x)*c-(p.z-f.z)*s,z=(p.x-f.x)*s+(p.z-f.z)*c;if(i)ctx.lineTo(x,z);else ctx.moveTo(x,z);});ctx.closePath();}
    else if(f.shape==="ellipse")ctx.ellipse(0,0,f.width/2,f.depth/2,0,0,Math.PI*2);
    else ctx.roundRect(-f.width/2,-f.depth/2,f.width,f.depth,Math.min(3,f.width*.05));
  };
  const cropNoise=document.createElement("canvas");cropNoise.width=cropNoise.height=64;
  const cc=cropNoise.getContext("2d")!,cropData=cc.createImageData(64,64);
  for(let i=0;i<64*64;i++){const v=230+Math.round(rnd()*24);cropData.data.set([v,v,v,255],i*4);}cc.putImageData(cropData,0,0);
  const cropPattern=ctx.createPattern(cropNoise,"repeat")!;
  for(const f of features.filter(f=>f.appearance==="field"))local(f,()=>{
    trace(f);ctx.clip();
    ctx.fillStyle=`#${(f.landUse?f.color??cropColors[fieldCrop(f)]:cropColors[fieldCrop(f)]).toString(16).padStart(6,"0")}`;ctx.fillRect(-f.width/2,-f.depth/2,f.width,f.depth);
    ctx.globalCompositeOperation="multiply";ctx.fillStyle=cropPattern;ctx.fillRect(-f.width/2,-f.depth/2,f.width,f.depth);ctx.globalCompositeOperation="source-over";
    if(f.cropPattern==="bare"||f.landUse==='olive'||f.landUse==='citrus')return;
    ctx.strokeStyle=f.color===0x927b70?"rgba(49,35,29,.23)":"rgba(51,55,32,.35)";ctx.lineWidth=.35;
    ctx.save();ctx.rotate(-(f.cropRotation??0));
    const cropSpan=f.cropRotation!=null?Math.hypot(f.width,f.depth):Math.max(f.width,f.depth);
    for(let x=-cropSpan/2+1;x<cropSpan/2;x+=f.width>30?1.4:2.4){ctx.beginPath();ctx.moveTo(x,-cropSpan/2);ctx.lineTo(x,cropSpan/2);ctx.stroke();}
    ctx.restore();
    ctx.strokeStyle="rgba(60,65,44,.18)";ctx.lineWidth=1.2;ctx.strokeRect(-f.width/2+1.5,-f.depth/2+1.5,f.width-3,f.depth-3);
    for(let i=0;i<22;i++){ctx.fillStyle=`rgba(208,205,165,${.02+rnd()*.025})`;ctx.fillRect(-f.width/2+rnd()*f.width,-f.depth/2,1+rnd()*3,f.depth);}
  });
  // Forest floor follows irregular shared ellipses, with soft soil transition.
  for(const f of features.filter(f=>f.appearance==="forest"))local(f,()=>{
    trace(f);ctx.clip();ctx.scale(f.width/2,f.depth/2);const gradient=ctx.createRadialGradient(0,0,.15,0,0,1);
    gradient.addColorStop(0,"rgba(49,68,43,.78)");gradient.addColorStop(.65,"rgba(57,74,46,.68)");gradient.addColorStop(1,"rgba(67,81,51,0)");
    ctx.fillStyle=gradient;ctx.beginPath();if(f.shape==="ellipse")ctx.arc(0,0,1,0,Math.PI*2);else ctx.rect(-1,-1,2,2);ctx.fill();
  });
  // Rock/scree belongs to the shared height field, so relief reads at strategic zoom.
  const rockCanvas=document.createElement("canvas");rockCanvas.width=rockCanvas.height=512;
  const rc=rockCanvas.getContext("2d")!,rockData=rc.createImageData(512,512);
  for(let iz=0;iz<512;iz++)for(let ix=0;ix<512;ix++){
    const x=(ix+.5)/512*MAP_SIZE-half,z=(iz+.5)/512*MAP_SIZE-half,h=heightAt(x,z);
    const slope=Math.hypot(heightAt(x+3,z)-heightAt(x-3,z),heightAt(x,z+3)-heightAt(x,z-3))/6;
    const cfg=terrainConfig.render.detail;
    const heightExposure=Math.max(0,(h-cfg.rockHeight)/cfg.rockHeightRange);
    const slopeExposure=Math.max(0,(slope-cfg.rockSlope)/cfg.rockSlopeRange);
    const exposed=Math.min(.7,heightExposure*Math.min(1,slope*2+.2)+slopeExposure*.55);
    if(exposed<=0)continue;
    const i=(iz*512+ix)*4,grain=rnd()*15;rockData.data.set([137+grain,137+grain,128+grain,Math.round(exposed*255)],i);
  }
  rc.putImageData(rockData,0,0);ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(rockCanvas,0,0,2048,2048);ctx.restore();
  // Mud and meadow banks follow the continuous watercourse, underneath bridges.
  ctx.lineCap="round";
  for(const width of [48,37,29]){
    ctx.strokeStyle=width===48?"rgba(147,149,118,.65)":width===37?"#969581":"#858778";ctx.lineWidth=width;
    for(const f of features.filter(f=>f.kind==="water"&&!isSeaFeature(f)))local(f,()=>{
      ctx.beginPath();if(f.waterBody==="lake") {if(f.polygon)trace(f);else ctx.ellipse(0,0,f.width/2,f.depth/2,0,0,Math.PI*2);ctx.lineWidth=(width-26)*.65+2;}else {ctx.lineWidth=width;ctx.moveTo(0,-f.depth/2);ctx.lineTo(0,f.depth/2);}ctx.stroke();
    });
  }
  // Ocean shore is the actual water footprint boundary, never a river stripe.
  for(const f of features.filter(f=>isSeaFeature(f)))local(f,()=>{
    const beach=ctx.createLinearGradient(f.width/2-4,0,f.width/2+18,0);
    beach.addColorStop(0,"#777f76");beach.addColorStop(.35,"#b3ac8d");beach.addColorStop(1,"rgba(155,157,126,0)");
    ctx.fillStyle=beach;ctx.fillRect(f.width/2-4,-f.depth/2,22,f.depth);
  });
  for(const b of bases){const g=ctx.createRadialGradient(b.x,b.z,b.r*.4,b.x,b.z,b.r);g.addColorStop(0,"rgba(157,157,139,.72)");g.addColorStop(1,"rgba(157,157,139,0)");ctx.fillStyle=g;ctx.beginPath();ctx.arc(b.x,b.z,b.r,0,Math.PI*2);ctx.fill();}
  // Ground-bound paving: paint the whole network in layers, rather than overlapping elevated strips.
  const roads=features.filter(f=>f.kind==="road"),index=new MapFeatureIndex(features);
  for(const f of features.filter(f=>f.appearance==="yard"))local(f,()=>{
    // Airport clearing is meadow, not an enormous painted rectangle; pavement is rendered separately.
    if(f.id.startsWith('base-airfield-yard-'))return;
    ctx.fillStyle=`#${(f.color??0x99998b).toString(16).padStart(6,"0")}`;
    const fringe=Math.min(4,f.width*.2,f.depth*.2);
    for(let n=0;n<6;n++){const inset=fringe*n/6;ctx.globalAlpha=.08;ctx.fillRect(-f.width/2+inset,-f.depth/2+inset,f.width-inset*2,f.depth-inset*2);}
    ctx.globalAlpha=1;
  });
  const strokeRoad=(f:MapFeatureDef,width:number,color:string)=>local(f,()=>{
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(0,-f.depth/2);ctx.lineTo(0,f.depth/2);ctx.stroke();
  });
  for(const f of roads)strokeRoad(f,f.width+1.7,f.roadClass==="track"?"#a4a087":"#929580");
  for(const f of roads)strokeRoad(f,f.width,f.roadClass==="track"?"#9c947b":f.roadClass==="street"?"#777b73":"#686f69");
  for(const f of roads)local(f,()=>{
    if(f.roadClass==="track"){
      ctx.strokeStyle="rgba(91,84,66,.28)";ctx.lineWidth=.55;
      for(const x of [-f.width*.23,f.width*.23]){ctx.beginPath();ctx.moveTo(x,-f.depth/2);ctx.lineTo(x,f.depth/2);ctx.stroke();}
    }else if(f.roadClass!=="street"){
      // A world-distance dash phase survives short curved author segments.
      const a=f.rotation??0,phase=f.x*Math.sin(a)+f.z*Math.cos(a);
      ctx.strokeStyle="rgba(212,209,183,.65)";ctx.lineWidth=.22;ctx.lineCap="butt";
      for(let z=-f.depth/2;z<f.depth/2;z+=.8){
        if(((z+phase)%10+10)%10>3)continue;
        const x=f.x+Math.sin(a)*z,zz=f.z+Math.cos(a)*z;
        if(index.at(x,zz).some(o=>o!==f&&(o.kind==="bridge"||o.kind==="road"&&Math.abs(Math.sin((o.rotation??0)-a))>.25)&&pointInFeature(x,zz,o,1)))continue;
        ctx.beginPath();ctx.moveTo(0,z);ctx.lineTo(0,Math.min(f.depth/2,z+.8));ctx.stroke();
      }
    }
  });
  // Shared tree positions produce static shade even when realtime shadows are off.
  const stamp=document.createElement("canvas");stamp.width=stamp.height=64;const sc=stamp.getContext("2d")!;
  const shade=sc.createRadialGradient(32,32,2,32,32,32);shade.addColorStop(0,"rgba(24,35,23,.42)");shade.addColorStop(.5,"rgba(24,35,23,.26)");shade.addColorStop(1,"rgba(24,35,23,0)");
  sc.fillStyle=shade;sc.fillRect(0,0,64,64);
  for(const points of forestLayout.values())for(const p of points){
    const radius=terrainConfig.forest.crownRadius*p.s;
    ctx.save();ctx.translate(p.x-radius*.85,p.z-radius*.55);ctx.rotate(.55);ctx.drawImage(stamp,-radius*1.3,-radius,radius*2.6,radius*2);ctx.restore();
    ctx.drawImage(stamp,p.x-radius*.65,p.z-radius*.65,radius*1.3,radius*1.3);
  }
  // Civilian roof silhouettes ground the village on low/medium quality too.
  for(const f of features.filter(f=>f.appearance==="farmhouse"))local(f,()=>{
    const height=f.height??4;ctx.fillStyle="rgba(31,38,31,.18)";ctx.beginPath();ctx.roundRect(-f.width/2-height*.7,-f.depth/2-height*.45,f.width+height*.5,f.depth+height*.25,1);ctx.fill();
  });
  ctx.lineCap="round";
  // Paths and small aprons connect the actual house door to its nearest street.
  for(const f of features.filter(f=>f.appearance==="farmhouse")){
    const a=f.rotation??0,door={x:f.x+Math.sin(a)*(f.depth/2+.3),z:f.z+Math.cos(a)*(f.depth/2+.3)};
    let nearest:Point|undefined,best=18;
    for(const r of roads){const t=Math.max(-r.depth/2,Math.min(r.depth/2,(door.x-r.x)*Math.sin(r.rotation??0)+(door.z-r.z)*Math.cos(r.rotation??0)));
      const q={x:r.x+Math.sin(r.rotation??0)*t,z:r.z+Math.cos(r.rotation??0)*t},d=Math.hypot(q.x-door.x,q.z-door.z);
      if(d<best){best=d;nearest=q;}
    }
    if(nearest){ctx.strokeStyle="#a7a494";ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(door.x,door.z);ctx.lineTo(nearest.x,nearest.z);ctx.stroke();}
  }
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
  const riverMaterial=new THREE.MeshStandardMaterial({color:0xffffff,map:flow,bumpMap:flow,bumpScale:.035,roughness:.48,metalness:.08,vertexColors:true});
  const seaFlow=riverTexture();group.userData.seaFlow=seaFlow;
  const seaMaterial=new THREE.MeshStandardMaterial({color:0xffffff,map:seaFlow,bumpMap:seaFlow,bumpScale:.12,roughness:.48,metalness:.12,vertexColors:true});
  const ocean=features.filter(f=>isSeaFeature(f));
  const river=createRiverSurface(features);
  if(river.getAttribute("position").count){const mesh=new THREE.Mesh(river,riverMaterial);mesh.name="continuous-river";mesh.receiveShadow=true;group.add(mesh);}else river.dispose();
  const asphalt=asphaltTexture();
  const roadMat=new THREE.MeshStandardMaterial({color:0x626862,map:asphalt,bumpMap:asphalt,bumpScale:.015,roughness:.96,polygonOffset:true,polygonOffsetFactor:-1});
  const vergeMat=new THREE.MeshStandardMaterial({color:0x8c907c,roughness:1,polygonOffset:true,polygonOffsetFactor:-1});
  // All shoulders sit below the complete carriageway network, including junctions.
  if(!landscapeAtlas)for(const f of features)if(f.kind==="road"&&f.roadClass!=="track")group.add(drapedStrip(f,f.width+1.2,0x8c907c,.028,vergeMat));
  for (const f of features) {
    const y = heightAt(f.x, f.z);
    if(f.appearance==="yard"){if(landscapeAtlas||f.id.startsWith('base-airfield-yard-'))continue;group.add(weatheredYard(f));continue;}
    if (f.appearance === "forest") continue;
    if (f.appearance === "field") {
      if(landscapeAtlas)continue;
      const field=drapedStrip(f,f.width,f.color??0x879357,.025);
      if(f.cropPattern!=="bare")(field.material as THREE.MeshStandardMaterial).map=fieldTexture();group.add(field);continue;
    }
    if (f.kind === "water") {
      if(!isSeaFeature(f))continue; // River footprints are united into one continuous surface below.
      const sea=isSeaFeature(f);
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
        if(landscapeAtlas)continue;
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
        // Open span with girders and piers rooted in the same visible riverbed.
        const deckY=f.surfaceHeight??y;
        for(const side of [-1,1]){
          const offset=side*(f.width*.3),girder=new THREE.Mesh(new THREE.BoxGeometry(.4,.5,f.depth-2),mesh.material);
          girder.position.set(f.x+Math.cos(a)*offset,deckY-.65,f.z-Math.sin(a)*offset);girder.rotation.y=a;bridge.add(girder);
        }
        for(const along of [-f.depth*.22,f.depth*.22]){
          const px=f.x+Math.sin(a)*along,pz=f.z+Math.cos(a)*along,bottom=groundHeightAt(px,pz),height=deckY-.5-bottom;
          if(height<.8)continue;
          for(const side of [-1,1]){const pier=new THREE.Mesh(new THREE.BoxGeometry(.9,height,1.2),mesh.material);
            pier.position.set(px+Math.cos(a)*side*f.width*.27,bottom+height/2,pz-Math.sin(a)*side*f.width*.27);pier.rotation.y=a;bridge.add(pier);}
        }
        addBridgeRails(bridge,f,deckY);group.add(batchStaticScene(bridge));
      }
      continue;
    }
    if(f.appearance==="resource-industrial"||f.appearance==="resource-oil"){
      const model=createResourceIndustry(f.facilityKind??(f.appearance==="resource-oil"?"oilfield":"factory"));
      model.position.set(f.x,y,f.z);group.add(model);continue;
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
        if(!landscapeAtlas)group.add(weatheredYard({...f,width:f.width+3,depth:f.depth+3,color:0x8f9181}));
        const variant=Number(f.id.split("-").at(-1))||0,house=new THREE.LOD();
        house.addLevel(createCivilianBuilding(f.width,f.depth,h,variant,false,f.color,f.buildingStyle,f.facadeColor),0);
        house.addLevel(createCivilianBuilding(f.width,f.depth,h,variant,true,f.color,f.buildingStyle,f.facadeColor),235, .15);
        house.scale.set(terrainConfig.render.buildings.civilianFootprintScale,terrainConfig.render.buildings.civilianHeightScale,terrainConfig.render.buildings.civilianFootprintScale);
        house.userData.structureId=f.id;house.userData.structureHeight=h*terrainConfig.render.buildings.civilianHeightScale;
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
/** Lobed silhouette and baked self-occlusion; detail is shared by every tree. */
export function createCanopyGeometry(widthSegments:number,heightSegments:number):THREE.BufferGeometry {
  const g=new THREE.SphereGeometry(1,widthSegments,heightSegments),p=g.getAttribute("position"),colors=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),a=Math.atan2(z,x);
    const lobe=1+.085*Math.sin(a*5+y*6)+.045*Math.cos(a*9-y*4);
    p.setXYZ(i,x*lobe,y*(1+.045*Math.sin(a*3)),z*lobe);
    const shade=.57+.35*(y+1)/2+.055*Math.sin(a*7+y*9);
    colors.set([shade*.96,shade,shade*.92],i*3);
  }
  g.setAttribute("color",new THREE.BufferAttribute(colors,3));g.computeVertexNormals();return g;
}
let leafTexture:THREE.DataTexture|undefined;
function canopyTexture():THREE.DataTexture {
  if(leafTexture)return leafTexture;
  const size=128,data=new Uint8Array(size*size*4),rnd=mulberry32(701);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=x/size*Math.PI*2,v=y/size*Math.PI*2;
    const clusters=Math.sin(u*9+Math.sin(v*5))*Math.cos(v*11)+Math.sin(u*19+v*13)*.35;
    const value=Math.round(215+clusters*20+(rnd()-.5)*18),i=(y*size+x)*4;
    data[i]=value;data[i+1]=value;data[i+2]=value-5;data[i+3]=255;
  }
  leafTexture=new THREE.DataTexture(data,size,size);leafTexture.colorSpace=THREE.SRGBColorSpace;
  leafTexture.wrapS=leafTexture.wrapT=THREE.RepeatWrapping;leafTexture.repeat.set(3,2);
  leafTexture.magFilter=THREE.LinearFilter;leafTexture.minFilter=THREE.LinearMipmapLinearFilter;leafTexture.generateMipmaps=true;leafTexture.needsUpdate=true;
  return leafTexture;
}

interface ForestPoint {x:number;z:number;s:number;angle:number;pine:boolean}
/** One deterministic placement source for canopy batches and baked ground shade. */
export function sampleForest(features:readonly MapFeatureDef[],budget=terrainConfig.forest.placementBudget):Map<string,ForestPoint[]> {
  const rnd=mulberry32(104),cells=new Map<string,ForestPoint[]>();
  const index=new MapFeatureIndex(features),spacing=new Map<string,Array<{x:number;z:number;s:number}>>();
  const forests=features.filter(f=>f.appearance==="forest");
  const requested=forests.reduce((n,f)=>n+Math.ceil(f.width*f.depth/terrainConfig.forest.treeArea),0);
  const ratio=Math.min(1,budget/Math.max(1,requested));
  for(const f of forests){
    const c=Math.cos(f.rotation??0),s=Math.sin(f.rotation??0);
    for(let i=0;i<Math.floor(Math.ceil(f.width*f.depth/terrainConfig.forest.treeArea)*ratio);i++){
      const lx=(rnd()-.5)*f.width,lz=(rnd()-.5)*f.depth,x=f.x+lx*c+lz*s,z=f.z-lx*s+lz*c;
      const nearby=index.at(x,z);
      if(nearby.some(block=>(["building","road","bridge","water","wall"].includes(block.kind)||block.appearance==="yard")&&pointInFeature(x,z,block,2))||rnd()>forestDensityAt(x,z,nearby))continue;
      const pine=rnd()<(.25+Math.min(.4,Math.max(0,heightAt(x,z)-12)/80)),scale=(terrainConfig.forest.treeScaleMinimum+rnd()*terrainConfig.forest.treeScaleVariation)*((f.height??8)<5?terrainConfig.forest.hedgeScale:1);
      const bx=Math.floor(x/3),bz=Math.floor(z/3);let crowded=false;
      for(let dx=-1;dx<=1&&!crowded;dx++)for(let dz=-1;dz<=1&&!crowded;dz++)crowded=(spacing.get(`${bx+dx}/${bz+dz}`)??[]).some(p=>Math.hypot(p.x-x,p.z-z)<(p.s+scale)*1.15);
      if(crowded)continue;
      const bucket=spacing.get(`${bx}/${bz}`)??[];bucket.push({x,z,s:scale});spacing.set(`${bx}/${bz}`,bucket);
      const key=`${Math.floor(x/64)}/${Math.floor(z/64)}/${pine}`,list=cells.get(key)??[];
      list.push({x,z,s:scale,angle:rnd()*Math.PI,pine});cells.set(key,list);
    }
  }
  return cells;
}

/** Understory is visual, uses existing forest cover, and never occupies a road, yard or water. */
export function sampleUnderstory(points:readonly ForestPoint[],features:readonly MapFeatureDef[],budget:number,index=new MapFeatureIndex(features)):ForestPoint[]{
 const random=mulberry32(914+points.length),shrubs:ForestPoint[]=[];
 const count=Math.min(budget,Math.floor(points.length*terrainConfig.forest.understoryPerTree));
 for(let i=0;i<count;i++){
  const tree=points[Math.floor(random()*points.length)],angle=random()*Math.PI*2,r=2+random()*2.5,x=tree.x+Math.cos(angle)*r,z=tree.z+Math.sin(angle)*r,nearby=index.at(x,z);
  if(forestDensityAt(x,z,nearby)<.3||nearby.some(f=>["building","road","bridge","water"].includes(f.kind)||f.appearance==="yard"?pointInFeature(x,z,f,2):false))continue;
  shrubs.push({x,z,s:.65+random()*.5,angle,pine:false});
 }
 return shrubs;
}

/** Opaque leaf texture and three cell LODs keep detail local, without alpha leaf overdraw. */
export function createForest(features:readonly MapFeatureDef[],cells=sampleForest(features)):THREE.Group {
  const rnd=mulberry32(818),group=new THREE.Group(),trunkGeometry=new THREE.CylinderGeometry(.1,.22,terrainConfig.forest.trunkHeight,5);
  const closeGeometry=createCanopyGeometry(12,8),crownGeometry=createCanopyGeometry(8,5),farGeometry=new THREE.IcosahedronGeometry(1,0);
  const trunkMaterial=new THREE.MeshStandardMaterial({color:0x625a49,roughness:1});
  const crownMaterial=new THREE.MeshStandardMaterial({color:0xffffff,map:canopyTexture(),vertexColors:true,roughness:1,metalness:0});
  const d=new THREE.Object3D(),tint=new THREE.Color();
  let shrubBudget=terrainConfig.forest.understoryBudget;const shrubIndex=new MapFeatureIndex(features);
  for(const points of cells.values()){
    const trunks=new THREE.InstancedMesh(trunkGeometry,trunkMaterial,points.length),crowns=new THREE.InstancedMesh(crownGeometry,crownMaterial,points.length);
    points.forEach((p,i)=>{
      const y=heightAt(p.x,p.z);d.rotation.set(0,p.angle,0);d.position.set(p.x,y+terrainConfig.forest.trunkHeight*.5*p.s,p.z);d.scale.set(p.s,p.s,p.s);d.updateMatrix();trunks.setMatrixAt(i,d.matrix);trunks.setColorAt(i,new THREE.Color(1,1,1));
      tint.setHSL(.245+rnd()*.07,.24+rnd()*.15,.27+rnd()*.10);
      d.position.set(p.x,y+terrainConfig.forest.crownBaseHeight*p.s,p.z);d.rotation.set(0,p.angle,0);
      d.scale.set(terrainConfig.forest.crownRadius*(p.pine?.78:1)*p.s,terrainConfig.forest.crownHeight*(p.pine?1.15:1)*p.s,terrainConfig.forest.crownRadius*(p.pine?.78:.92)*p.s);
      d.updateMatrix();crowns.setMatrixAt(i,d.matrix);crowns.setColorAt(i,tint);
    });
    trunks.computeBoundingSphere();crowns.computeBoundingSphere();trunks.castShadow=false;crowns.castShadow=false;crowns.receiveShadow=true;trunks.matrixAutoUpdate=crowns.matrixAutoUpdate=false;
    crowns.userData.forestCrownCount=1;crowns.userData.forestPoints=points;crowns.userData.forestColors=crowns.instanceColor!.array.slice();crowns.userData.forestMatrices=crowns.instanceMatrix.array.slice();
    trunks.userData.forestPoints=points;trunks.userData.forestTrunks=true;trunks.userData.forestColors=trunks.instanceColor!.array.slice();trunks.userData.forestMatrices=trunks.instanceMatrix.array.slice();
    // Distant opaque canopy drops fine lobes and trunks; no extra shadow or alpha pass.
    const far=new THREE.InstancedMesh(farGeometry,crowns.material,points.length);
    points.forEach((_,i)=>{crowns.getMatrixAt(i,d.matrix);far.setMatrixAt(i,d.matrix);crowns.getColorAt(i,tint);far.setColorAt(i,tint);});
    far.computeBoundingSphere();far.receiveShadow=true;far.matrixAutoUpdate=false;
    far.userData.forestPoints=points;far.userData.forestCrownCount=1;
    far.userData.forestColors=far.instanceColor!.array.slice();far.userData.forestMatrices=far.instanceMatrix.array.slice();
    const close=new THREE.InstancedMesh(closeGeometry,crowns.material,points.length);
    close.instanceMatrix=crowns.instanceMatrix;close.instanceColor=crowns.instanceColor;
    close.computeBoundingSphere();close.receiveShadow=true;close.matrixAutoUpdate=false;
    close.userData={...crowns.userData};
    const near=new THREE.Group();near.add(trunks,close);
    const shrubs=sampleUnderstory(points,features,shrubBudget,shrubIndex);shrubBudget-=shrubs.length;
    if(shrubs.length){
      const bushes=new THREE.InstancedMesh(farGeometry,crownMaterial,shrubs.length);
      shrubs.forEach((p,i)=>{d.position.set(p.x,heightAt(p.x,p.z)+terrainConfig.forest.understoryHeight*.6,p.z);d.rotation.set(0,p.angle,0);d.scale.set(terrainConfig.forest.understoryRadius*p.s,terrainConfig.forest.understoryHeight*p.s,terrainConfig.forest.understoryRadius*p.s*.8);d.updateMatrix();bushes.setMatrixAt(i,d.matrix);bushes.setColorAt(i,tint.setHex(0x586847));});
      bushes.computeBoundingSphere();bushes.receiveShadow=true;bushes.userData.forestPoints=shrubs;bushes.userData.forestCrownCount=1;bushes.userData.forestColors=bushes.instanceColor!.array.slice();bushes.userData.forestMatrices=bushes.instanceMatrix.array.slice();near.add(bushes);
    }
    const middle=new THREE.Group();middle.add(crowns);
    const lod=new THREE.LOD(),origin=new THREE.Vector3(points.reduce((n,p)=>n+p.x,0)/points.length,0,points.reduce((n,p)=>n+p.z,0)/points.length);origin.y=heightAt(origin.x,origin.z);
    lod.position.copy(origin);near.position.copy(origin).negate();middle.position.copy(origin).negate();far.position.copy(origin).negate();far.updateMatrix();
    lod.addLevel(near,0);lod.addLevel(middle,105,.15);lod.addLevel(far,terrainConfig.forest.lodDistance,.15);group.add(lod);
  }
  return group;
}

/** Persistent charred canopy uses existing forest batches; no per-tree mesh creation. */
export function syncForestTerrain(group:THREE.Group,world:World):boolean {
  if(group.userData.forestRevision===world.terrain.revision)return false;
  group.userData.forestRevision=world.terrain.revision;let changed=false;
  const cleared=(x:number,z:number)=>world.terrain.clearedAt(x,z);
  const matrix=new THREE.Matrix4(),color=new THREE.Color(),position=new THREE.Vector3(),scale=new THREE.Vector3(),rotation=new THREE.Quaternion();
  group.traverse(o=>{
    if(!(o instanceof THREE.InstancedMesh))return;
    if(o.userData.vegetationPoints){const points=o.userData.vegetationPoints as {x:number;z:number}[],matrices=o.userData.vegetationMatrices as Float32Array;points.forEach((p,i)=>{matrix.fromArray(matrices,i*16);if(cleared(p.x,p.z)){matrix.decompose(position,rotation,scale);scale.set(0,0,0);matrix.compose(position,rotation,scale);}o.setMatrixAt(i,matrix);});o.instanceMatrix.needsUpdate=true;changed=true;return;}
    if(!o.userData.forestPoints)return;
    const points=o.userData.forestPoints as {x:number;z:number}[],colors=o.userData.forestColors as Float32Array,matrices=o.userData.forestMatrices as Float32Array;
    const count=o.userData.forestTrunks?1:(o.userData.forestCrownCount??3);
    points.forEach((p,i)=>{const burnt=world.terrain.burntAt(p.x,p.z);
      for(let j=0;j<count;j++){const index=i*count+j;matrix.fromArray(matrices,index*16);color.fromArray(colors,index*3);
        if(cleared(p.x,p.z)){matrix.decompose(position,rotation,scale);scale.set(0,0,0);matrix.compose(position,rotation,scale);}
        else if(burnt){if(!o.userData.forestTrunks){matrix.decompose(position,rotation,scale);scale.multiplyScalar(.18);matrix.compose(position,rotation,scale);}color.setHex(0x34342d);}
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

const yardMaterial=new THREE.MeshStandardMaterial({vertexColors:true,transparent:true,depthWrite:false,roughness:1,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2});
function weatheredYard(f:MapFeatureDef):THREE.Mesh {
 const origin={x:f.x,z:f.z,y:0,heading:f.rotation??0},geometry=groundRectangle(origin,-f.width/2,f.width/2,-f.depth/2,f.depth/2,f.color??0x8b8776,.03,Math.min(3,f.width*.2,f.depth*.2));
 const mesh=new THREE.Mesh(geometry,yardMaterial);mesh.position.set(f.x,0,f.z);mesh.rotation.y=origin.heading;mesh.receiveShadow=true;return mesh;
}
