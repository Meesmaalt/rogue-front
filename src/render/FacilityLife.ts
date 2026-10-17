import * as THREE from 'three';
import {CharacterGeometry} from './CharacterGeometry';
import {buildingScale} from './lounge';
import config from '../data/world-character.json';
import type {Entity} from '../sim/types';
import type {World} from '../sim/World';
const geometry=new THREE.SphereGeometry(.18,7,5);geometry.userData.sharedArt=true;
const shells=new Map<string,THREE.BufferGeometry>();
const housingMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.8});housingMaterial.userData.sharedArt=true;
export interface FacilityLife {root:THREE.Group;lamp:THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>;nextUpdate:number;state:string}
/** A small roof-mounted work signal replaces whole-building breathing. No timer invents production. */
export function createFacilityLife(e:Entity):FacilityLife {
 const root=new THREE.Group();root.name='FacilityWorkSignal';const scale=buildingScale(e.kind),anchor=config.operations.anchors[e.kind as keyof typeof config.operations.anchors]??[3,4,-3],x=anchor[0]*scale,y=anchor[1]*scale,z=anchor[2]*scale;
 let housing=shells.get('standard');if(!housing){const b=new CharacterGeometry();b.box(.55,.3,.55,0x414a43,0,.15,0);b.box(.12,.55,.12,0x858c7e,0,-.1,0);housing=b.finish();housing.userData.sharedArt=true;shells.set('standard',housing);}
 const shell=new THREE.Mesh(housing,housingMaterial);shell.position.set(x,y,z);root.add(shell);
 const lamp=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:config.operations.idle}));lamp.position.set(x,y+.3,z);root.add(lamp);
 return {root,lamp,nextUpdate:0,state:'idle'};
}
export function updateFacilityLife(v:FacilityLife,e:Entity,w:World,distance:number):void {
 v.root.visible=!e.underConstruction&&distance<250;if(!v.root.visible||w.time<v.nextUpdate&&w.time>v.nextUpdate-.5)return;v.nextUpdate=w.time+config.operations.updateSeconds;
 const queued=e.productionQueue[0],powered=e.kind==='generator'||w.powerStatus(e.team).ratio>=.25,blocked=(e.disabledUntil??0)>w.time||!powered||queued!=null&&!w.productionOperational(e,queued).operational;
 const completed=queued!=null&&e.productionProgress>=w.unitDefinition(queued,e.team).buildTime;
 v.state=blocked||completed?'blocked':queued!=null?'working':powered?'ready':'idle';
 v.lamp.material.color.setHex(config.operations[v.state as 'blocked'|'working'|'ready'|'idle']);v.root.userData.operationState=v.state;
}
