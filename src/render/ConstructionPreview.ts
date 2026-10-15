import {depotPad} from '../sim/depotPads';
import {createDepotBase,createDepotPad} from './DepotPads';
import {createMetricRunway} from "./MetricRunway";
import * as THREE from 'three';
import {createModel} from './models';
import {createArtModel,disposeUnitMesh} from './ArtModels';
import {createMetricAirfieldStructures} from './Architecture';
import {heightAt} from '../sim/heightmap';
import {BUILDINGS,type BuildableKind} from '../sim/buildings';
import type {World} from '../sim/World';
import type {Point} from '../sim/types';
/** Reuses the final building silhouette, scale and heading; ghost materials never touch the model cache. */
export class ConstructionPreview {
 readonly group=new THREE.Group();
 private key='';
 private readonly material=new THREE.MeshBasicMaterial({color:0x78e7ae,transparent:true,opacity:.38,depthWrite:false,side:THREE.DoubleSide});
 private readonly outline=new THREE.LineBasicMaterial({color:0x78e7ae,transparent:true,opacity:.8,depthWrite:false});
 constructor(scene:THREE.Scene){this.group.name='ConstructionPreview';scene.add(this.group);}
 update(world:World,kind:BuildableKind|null,point:Point|null,heading:number,valid:boolean):void {
  this.group.visible=!!kind&&!!point;if(!kind||!point){if(this.key)this.clear();return;}
  const def=world.unitDefinition(kind,world.playerTeam),key=`${kind}/${world.playerFaction}/${!!def.metricScale}`;
  // Metric airport foundations depend on local terrain, so regenerate only when the pointer moves.
  const poseKey=(kind==='airbase'&&def.metricScale)||kind==='supply'?`${key}/${point.x.toFixed(1)}/${point.z.toFixed(1)}/${heading}`:key;
  if(this.key!==poseKey){
   this.clear();this.key=poseKey;
   const metric=kind==='airbase'&&def.metricScale;
   const model=metric?createMetricAirfieldStructures({...point,y:heightAt(point.x,point.z),heading,team:world.playerTeam}):(createArtModel(kind,world.playerTeam,world.playerFaction)??createModel(kind,world.playerTeam,world.playerFaction)).group;
   if(metric)model.add(createMetricRunway({...point,y:heightAt(point.x,point.z),heading}));
   model.scale.multiplyScalar(def.modelScale??1);
   if(kind==='supply'){
    const depot={...point,y:heightAt(point.x,point.z),heading,def},pad=depotPad(depot,0),base=createDepotBase(depot,[pad]);
    // Convert world-space pad markings into the same local frame as the warehouse.
    const markings=createDepotPad(pad),transform=new THREE.Matrix4().compose(new THREE.Vector3(depot.x,depot.y,depot.z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),heading),new THREE.Vector3(1,1,1));
    markings.applyMatrix4(transform.invert());
    const compound=new THREE.Group();compound.add(base,markings);
    // Architecture carries its own model scale; the foundation uses metres.
    compound.scale.set(1/model.scale.x,1/model.scale.y,1/model.scale.z);model.add(compound);
   }
   model.traverse(o=>{if(o instanceof THREE.Mesh){o.material=this.material;o.castShadow=o.receiveShadow=false;const edges=new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry,32),this.outline);o.add(edges);}});
   this.group.add(model);
   const r=BUILDINGS[kind].footprint;
   const boundary=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-r,.15,-r),new THREE.Vector3(r,.15,-r),new THREE.Vector3(r,.15,r),new THREE.Vector3(-r,.15,r),new THREE.Vector3(-r,.15,-r)]);
   this.group.add(new THREE.Line(boundary,this.outline));
  }
  this.material.color.set(valid?0x78e7ae:0xf17465);this.outline.color.copy(this.material.color);
  this.group.position.set(point.x,heightAt(point.x,point.z)+.08,point.z);this.group.rotation.y=heading;
 }
 clear():void {
  this.group.traverse(o=>{if(o instanceof THREE.Mesh)disposeUnitMesh(o,this.material);else if(o instanceof THREE.Line)o.geometry.dispose();});
  this.group.clear();this.key='';
 }
}
