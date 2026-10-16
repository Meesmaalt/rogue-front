import {afterEach,expect,it,vi} from "vitest";
import {PerspectiveCamera} from "three";
import {Picker} from "./Picker";
import {World} from "../sim/World";
import {resetHeightmap} from "../sim/heightmap";
afterEach(()=>{resetHeightmap();vi.unstubAllGlobals();});
it("picks the rendered pose while preserving fog, loaded-unit and stale-marker gates",()=>{
 vi.stubGlobal("innerWidth",1000);vi.stubGlobal("innerHeight",700);
 const world=new World(71,false,[],[],[],false),unit=world.spawn("tank",0,-100,0),enemy=world.spawn("tank",1,100,0);
 const camera=new PerspectiveCamera(50,1000/700,.1,2000);camera.position.set(0,120,180);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 const picker=new Picker(camera,world),pose={x:0,y:0,z:0};picker.setPresentation(id=>id===unit.id?pose:null);
 const screen=picker.entityScreen(unit,unit.def.height*.5);
 expect(picker.pickEntity(screen.x,screen.y,0)?.id).toBe(unit.id);
 expect(unit.x).toBe(-100);expect(picker.entityPosition(unit)).toBe(pose);
 picker.setUnitMarkers([{id:enemy.id,x:0,y:0,width:40,height:20}]);
 expect(picker.pickEntity(20,10,1)).toBeNull();
 picker.setUnitMarkers([{id:unit.id,x:0,y:0,width:40,height:20}]);unit.loadedIntoId=99;
 expect(picker.pickEntity(20,10,0)).toBeNull();
 unit.loadedIntoId=null;picker.setPresentation(()=>null);expect(picker.entityPosition(unit)).toBe(unit);
});
it('every rotated airport hangar, tower and terminal selects the same airport',()=>{
 vi.stubGlobal('innerWidth',1000);vi.stubGlobal('innerHeight',700);
 const world=new World(72,false,[],[],[],false,true),pad=world.spawn('airbase',0,0,0);pad.heading=.7;
 const camera=new PerspectiveCamera(50,1000/700,.1,2000);camera.position.set(100,240,280);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 const picker=new Picker(camera,world);
 for(const s of BATTLE_SCALE.airfieldLayout.structures){
  const x=pad.x+Math.cos(pad.heading)*s.x+Math.sin(pad.heading)*s.z,z=pad.z-Math.sin(pad.heading)*s.x+Math.cos(pad.heading)*s.z;
  const point=picker.toScreen(x,pad.y+s.height*.5,z);expect(picker.pickEntity(point.x,point.y,0)?.id).toBe(pad.id);
 }
});
import {BATTLE_SCALE} from '../sim/battleScale';
it('automatic Chinooks can be inspected while construction workers stay unselectable',()=>{
 vi.stubGlobal('innerWidth',1000);vi.stubGlobal('innerHeight',700);
 const world=new World(73,false,[],[],[],false),resource=world.spawn('transport',0,0,0),worker=world.spawn('transport',0,50,0),crew=world.spawn('engineer',0,100,0);
 resource.supplyDepotId=99;worker.constructionFlight={homeId:1,crewId:crew.id,phase:'arriving',home:{x:0,z:0},site:{x:10,z:0},readyAt:0};crew.constructionCrew={homeId:1,slot:0};
 const picker=new Picker(new PerspectiveCamera(),world);
 for(const e of [resource,worker,crew]){picker.setUnitMarkers([{id:e.id,x:0,y:0,width:40,height:20}]);expect(picker.pickEntity(20,10,0)?.id).toBe(e===crew?undefined:e.id);}
});
