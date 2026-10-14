import * as THREE from 'three';
import {mulberry32} from '../sim/rng';
import type {MapResourceDef} from '../sim/types';
const cache=new Map<string,THREE.CanvasTexture>();
/** Four shared ground textures make pickup sites legible without a separate asset per point. */
export function resourceGroundTexture(kind:MapResourceDef['facility']='mine'):THREE.CanvasTexture {
 const key=kind??'mine',cached=cache.get(key);if(cached)return cached;
 const cv=document.createElement('canvas');cv.width=cv.height=128;const c=cv.getContext('2d')!,random=mulberry32(key.length*719);
 const base={mine:'#7c7462',oilfield:'#62665e',factory:'#85877d',depot:'#8a8778'}[key];c.fillStyle=base;c.fillRect(0,0,128,128);
 for(let i=0;i<750;i++){c.fillStyle=`rgba(${random()<.5?'215,207,180':'30,35,28'},${.05+random()*.15})`;const r=1+random()*4;c.fillRect(random()*128,random()*128,r,r);}
 c.strokeStyle='rgba(40,44,38,.32)';c.lineWidth=3;
 for(const x of [24,95]){c.beginPath();c.moveTo(x,0);c.lineTo(x+5,128);c.stroke();}
 if(key==='oilfield'){c.fillStyle='rgba(30,34,30,.35)';c.beginPath();c.ellipse(64,60,28,19,.3,0,Math.PI*2);c.fill();}
 if(key==='factory'||key==='depot'){c.strokeStyle='#b7ae7b';c.lineWidth=2;c.strokeRect(42,38,44,52);}
 if(key==='mine'){c.fillStyle='#aca18a';for(let i=0;i<24;i++)c.fillRect(35+random()*55,30+random()*60,2+random()*6,2+random()*4);}
 const texture=new THREE.CanvasTexture(cv);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;cache.set(key,texture);return texture;
}
